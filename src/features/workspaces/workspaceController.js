const mongoose = require('mongoose');

const User = require('../auth/authModel');
const Workspace = require('./workspaceModel');

const POPULATE_OWNER = { path: 'owner', select: 'name email role' };
const POPULATE_MEMBERS = { path: 'members.user', select: 'name email role' };

function validationError(message) {
  return { valid: false, message, data: null };
}

function validationSuccess(data) {
  return { valid: true, message: '', data };
}

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

function formatMember(member) {
  const user = member.user;
  return {
    id: member._id,
    role: member.role,
    user: user
      ? {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        }
      : null,
  };
}

function formatWorkspace(workspace) {
  return {
    id: workspace._id,
    name: workspace.name,
    description: workspace.description,
    owner: workspace.owner
      ? {
          id: workspace.owner._id,
          name: workspace.owner.name,
          email: workspace.owner.email,
          role: workspace.owner.role,
        }
      : workspace.owner,
    members: Array.isArray(workspace.members)
      ? workspace.members.map(formatMember)
      : [],
    createdAt: workspace.createdAt,
    updatedAt: workspace.updatedAt,
  };
}

function getMemberEntry(workspace, userId) {
  const userIdString = userId.toString();
  return workspace.members.find(
    (member) => member.user && member.user.toString() === userIdString,
  );
}

function isWorkspaceMember(workspace, userId) {
  if (workspace.owner.toString() === userId.toString()) {
    return true;
  }
  return Boolean(getMemberEntry(workspace, userId));
}

function isWorkspaceOwner(workspace, userId) {
  return workspace.owner.toString() === userId.toString();
}

function validateCreateWorkspace(body) {
  if (!body || typeof body !== 'object') {
    return validationError('Request body is required');
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const description =
    typeof body.description === 'string' ? body.description.trim() : '';

  if (!name) {
    return validationError('Workspace name is required');
  }
  if (name.length > 100) {
    return validationError('Workspace name cannot exceed 100 characters');
  }
  if (description.length > 500) {
    return validationError('Description cannot exceed 500 characters');
  }

  return validationSuccess({ name, description });
}

function validateUpdateWorkspace(body) {
  if (!body || typeof body !== 'object') {
    return validationError('Request body is required');
  }

  const updates = {};

  if (body.name !== undefined) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) {
      return validationError('Workspace name cannot be empty');
    }
    if (name.length > 100) {
      return validationError('Workspace name cannot exceed 100 characters');
    }
    updates.name = name;
  }

  if (body.description !== undefined) {
    const description =
      typeof body.description === 'string' ? body.description.trim() : '';
    if (description.length > 500) {
      return validationError('Description cannot exceed 500 characters');
    }
    updates.description = description;
  }

  if (Object.keys(updates).length === 0) {
    return validationError('At least one field is required to update');
  }

  return validationSuccess(updates);
}

function validateAddMember(body) {
  if (!body || typeof body !== 'object') {
    return validationError('Request body is required');
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email) {
    return validationError('Member email is required');
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return validationError('Please provide a valid email address');
  }

  return validationSuccess({ email });
}

async function loadWorkspaceById(workspaceId) {
  if (!isValidObjectId(workspaceId)) {
    return null;
  }

  return Workspace.findById(workspaceId)
    .populate(POPULATE_OWNER)
    .populate(POPULATE_MEMBERS);
}

async function createWorkspace(req, res, next) {
  try {
    const validation = validateCreateWorkspace(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        data: null,
        message: validation.message,
      });
    }

    const { name, description } = validation.data;

    const workspace = await Workspace.create({
      name,
      description,
      owner: req.user._id,
      members: [{ user: req.user._id, role: 'owner' }],
    });

    const populatedWorkspace = await Workspace.findById(workspace._id)
      .populate(POPULATE_OWNER)
      .populate(POPULATE_MEMBERS);

    return res.status(201).json({
      success: true,
      data: { workspace: formatWorkspace(populatedWorkspace) },
      message: 'Workspace created successfully',
    });
  } catch (err) {
    return next(err);
  }
}

async function getMyWorkspaces(req, res, next) {
  try {
    const workspaces = await Workspace.find({
      $or: [{ owner: req.user._id }, { 'members.user': req.user._id }],
    })
      .populate(POPULATE_OWNER)
      .populate(POPULATE_MEMBERS)
      .sort({ updatedAt: -1 });

    return res.status(200).json({
      success: true,
      data: { workspaces: workspaces.map(formatWorkspace) },
      message: 'Workspaces retrieved successfully',
    });
  } catch (err) {
    return next(err);
  }
}

async function getWorkspaceById(req, res, next) {
  try {
    const workspace = await loadWorkspaceById(req.params.id);
    if (!workspace) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Workspace not found',
      });
    }

    if (!isWorkspaceMember(workspace, req.user._id)) {
      return res.status(403).json({
        success: false,
        data: null,
        message: 'You do not have access to this workspace',
      });
    }

    return res.status(200).json({
      success: true,
      data: { workspace: formatWorkspace(workspace) },
      message: 'Workspace retrieved successfully',
    });
  } catch (err) {
    return next(err);
  }
}

async function updateWorkspace(req, res, next) {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Workspace not found',
      });
    }

    if (!isWorkspaceOwner(workspace, req.user._id)) {
      return res.status(403).json({
        success: false,
        data: null,
        message: 'Only the workspace owner can update this workspace',
      });
    }

    const validation = validateUpdateWorkspace(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        data: null,
        message: validation.message,
      });
    }

    Object.assign(workspace, validation.data);
    await workspace.save();

    const populatedWorkspace = await Workspace.findById(workspace._id)
      .populate(POPULATE_OWNER)
      .populate(POPULATE_MEMBERS);

    return res.status(200).json({
      success: true,
      data: { workspace: formatWorkspace(populatedWorkspace) },
      message: 'Workspace updated successfully',
    });
  } catch (err) {
    return next(err);
  }
}

async function deleteWorkspace(req, res, next) {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Workspace not found',
      });
    }

    if (!isWorkspaceOwner(workspace, req.user._id)) {
      return res.status(403).json({
        success: false,
        data: null,
        message: 'Only the workspace owner can delete this workspace',
      });
    }

    await workspace.deleteOne();

    return res.status(200).json({
      success: true,
      data: null,
      message: 'Workspace deleted successfully',
    });
  } catch (err) {
    return next(err);
  }
}

async function addMember(req, res, next) {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Workspace not found',
      });
    }

    if (!isWorkspaceOwner(workspace, req.user._id)) {
      return res.status(403).json({
        success: false,
        data: null,
        message: 'Only the workspace owner can add members',
      });
    }

    const validation = validateAddMember(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        data: null,
        message: validation.message,
      });
    }

    const { email } = validation.data;
    const userToAdd = await User.findOne({ email });
    if (!userToAdd) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'User with that email was not found',
      });
    }

    if (isWorkspaceMember(workspace, userToAdd._id)) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'User is already a member of this workspace',
      });
    }

    workspace.members.push({ user: userToAdd._id, role: 'member' });
    await workspace.save();

    const populatedWorkspace = await Workspace.findById(workspace._id)
      .populate(POPULATE_OWNER)
      .populate(POPULATE_MEMBERS);

    return res.status(200).json({
      success: true,
      data: { workspace: formatWorkspace(populatedWorkspace) },
      message: 'Member added successfully',
    });
  } catch (err) {
    return next(err);
  }
}

async function removeMember(req, res, next) {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Workspace not found',
      });
    }

    if (!isWorkspaceOwner(workspace, req.user._id)) {
      return res.status(403).json({
        success: false,
        data: null,
        message: 'Only the workspace owner can remove members',
      });
    }

    const { memberId } = req.params;
    if (!isValidObjectId(memberId)) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Invalid member id',
      });
    }

    const memberEntry = workspace.members.id(memberId);
    if (!memberEntry) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Member not found in this workspace',
      });
    }

    if (memberEntry.role === 'owner') {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'The workspace owner cannot be removed',
      });
    }

    memberEntry.deleteOne();
    await workspace.save();

    const populatedWorkspace = await Workspace.findById(workspace._id)
      .populate(POPULATE_OWNER)
      .populate(POPULATE_MEMBERS);

    return res.status(200).json({
      success: true,
      data: { workspace: formatWorkspace(populatedWorkspace) },
      message: 'Member removed successfully',
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  createWorkspace,
  getMyWorkspaces,
  getWorkspaceById,
  updateWorkspace,
  deleteWorkspace,
  addMember,
  removeMember,
};
