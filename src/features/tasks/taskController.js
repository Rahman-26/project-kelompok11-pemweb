const User = require('../auth/authModel');
const Workspace = require('../workspaces/workspaceModel');
const Task = require('./taskModel');
const {
  validateCreateTask,
  validateUpdateTask,
  validateListTasksQuery,
  validateTaskIdParam,
} = require('./taskValidator');

const POPULATE_ASSIGNED_TO = { path: 'assignedTo', select: 'name email role' };
const POPULATE_CREATOR = { path: 'createdBy', select: 'name email role' };
const POPULATE_WORKSPACE = { path: 'workspaceId', select: 'name description' };

function isWorkspaceMember(workspace, userId) {
  const userIdString = userId.toString();

  if (workspace.owner.toString() === userIdString) {
    return true;
  }

  return workspace.members.some(
    (member) => member.user && member.user.toString() === userIdString,
  );
}

function formatTask(task) {
  return {
    id: task._id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    workspaceId: task.workspaceId
      ? {
          id: task.workspaceId._id || task.workspaceId,
          name: task.workspaceId.name,
          description: task.workspaceId.description,
        }
      : task.workspaceId,
    assignedTo: task.assignedTo
      ? {
          id: task.assignedTo._id,
          name: task.assignedTo.name,
          email: task.assignedTo.email,
          role: task.assignedTo.role,
        }
      : null,
    createdBy: task.createdBy
      ? {
          id: task.createdBy._id,
          name: task.createdBy.name,
          email: task.createdBy.email,
          role: task.createdBy.role,
        }
      : task.createdBy,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

async function ensureWorkspaceMember(workspaceId, userId) {
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    return { ok: false, status: 404, message: 'Workspace not found' };
  }

  if (!isWorkspaceMember(workspace, userId)) {
    return {
      ok: false,
      status: 403,
      message: 'You do not have access to this workspace',
    };
  }

  return { ok: true, workspace };
}

async function ensureValidAssignee(assignedToId, workspace) {
  if (!assignedToId) {
    return { ok: true };
  }

  const assignee = await User.findById(assignedToId);
  if (!assignee) {
    return { ok: false, status: 404, message: 'Assigned user was not found' };
  }

  if (!isWorkspaceMember(workspace, assignedToId)) {
    return {
      ok: false,
      status: 400,
      message: 'assignedTo must be a member of the workspace',
    };
  }

  return { ok: true };
}

function buildTaskFilterQuery(validatedFilters) {
  const mongoQuery = {
    workspaceId: validatedFilters.workspaceId,
  };

  if (validatedFilters.status) {
    mongoQuery.status = validatedFilters.status;
  }

  if (validatedFilters.priority) {
    mongoQuery.priority = validatedFilters.priority;
  }

  if (validatedFilters.assignee) {
    mongoQuery.assignedTo = validatedFilters.assignee;
  }

  if (validatedFilters.searchRegex) {
    mongoQuery.$or = [
      { title: { $regex: validatedFilters.searchRegex } },
      { description: { $regex: validatedFilters.searchRegex } },
    ];
  }

  return mongoQuery;
}

async function createTask(req, res, next) {
  try {
    const validation = validateCreateTask(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        data: null,
        message: validation.message,
      });
    }

    const access = await ensureWorkspaceMember(validation.data.workspaceId, req.user._id);
    if (!access.ok) {
      return res.status(access.status).json({
        success: false,
        data: null,
        message: access.message,
      });
    }

    const assigneeCheck = await ensureValidAssignee(
      validation.data.assignedToId,
      access.workspace,
    );
    if (!assigneeCheck.ok) {
      return res.status(assigneeCheck.status).json({
        success: false,
        data: null,
        message: assigneeCheck.message,
      });
    }

    const task = await Task.create({
      title: validation.data.title,
      description: validation.data.description,
      status: validation.data.status,
      priority: validation.data.priority,
      workspaceId: validation.data.workspaceId,
      assignedTo: validation.data.assignedToId,
      createdBy: req.user._id,
    });

    const populatedTask = await Task.findById(task._id)
      .populate(POPULATE_ASSIGNED_TO)
      .populate(POPULATE_CREATOR)
      .populate(POPULATE_WORKSPACE);

    return res.status(201).json({
      success: true,
      data: { task: formatTask(populatedTask) },
      message: 'Task created successfully',
    });
  } catch (err) {
    return next(err);
  }
}

async function getTasks(req, res, next) {
  try {
    const validation = validateListTasksQuery(req.query);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        data: null,
        message: validation.message,
      });
    }

    const access = await ensureWorkspaceMember(
      validation.data.workspaceId.toString(),
      req.user._id,
    );
    if (!access.ok) {
      return res.status(access.status).json({
        success: false,
        data: null,
        message: access.message,
      });
    }

    const mongoQuery = buildTaskFilterQuery(validation.data);

    const tasks = await Task.find(mongoQuery)
      .populate(POPULATE_ASSIGNED_TO)
      .populate(POPULATE_CREATOR)
      .populate(POPULATE_WORKSPACE)
      .sort({ updatedAt: -1 });

    return res.status(200).json({
      success: true,
      data: {
        tasks: tasks.map(formatTask),
        filters: {
          workspaceId: validation.data.workspaceId.toString(),
          search: typeof req.query.search === 'string' ? req.query.search.trim() : undefined,
          status: validation.data.status,
          priority: validation.data.priority,
          assignee: validation.data.assignee
            ? validation.data.assignee.toString()
            : undefined,
        },
      },
      message: 'Tasks retrieved successfully',
    });
  } catch (err) {
    return next(err);
  }
}

async function getTaskById(req, res, next) {
  try {
    const idValidation = validateTaskIdParam(req.params.id);
    if (!idValidation.valid) {
      return res.status(400).json({
        success: false,
        data: null,
        message: idValidation.message,
      });
    }

    const task = await Task.findById(idValidation.data.taskId)
      .populate(POPULATE_ASSIGNED_TO)
      .populate(POPULATE_CREATOR)
      .populate(POPULATE_WORKSPACE);

    if (!task) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Task not found',
      });
    }

    const access = await ensureWorkspaceMember(task.workspaceId.toString(), req.user._id);
    if (!access.ok) {
      return res.status(access.status).json({
        success: false,
        data: null,
        message: access.message,
      });
    }

    return res.status(200).json({
      success: true,
      data: { task: formatTask(task) },
      message: 'Task retrieved successfully',
    });
  } catch (err) {
    return next(err);
  }
}

async function updateTask(req, res, next) {
  try {
    const idValidation = validateTaskIdParam(req.params.id);
    if (!idValidation.valid) {
      return res.status(400).json({
        success: false,
        data: null,
        message: idValidation.message,
      });
    }

    const task = await Task.findById(idValidation.data.taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Task not found',
      });
    }

    const access = await ensureWorkspaceMember(task.workspaceId.toString(), req.user._id);
    if (!access.ok) {
      return res.status(access.status).json({
        success: false,
        data: null,
        message: access.message,
      });
    }

    const validation = validateUpdateTask(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        data: null,
        message: validation.message,
      });
    }

    if (validation.data.assignedTo !== undefined) {
      const assigneeCheck = await ensureValidAssignee(
        validation.data.assignedTo,
        access.workspace,
      );
      if (!assigneeCheck.ok) {
        return res.status(assigneeCheck.status).json({
          success: false,
          data: null,
          message: assigneeCheck.message,
        });
      }
    }

    Object.assign(task, validation.data);
    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate(POPULATE_ASSIGNED_TO)
      .populate(POPULATE_CREATOR)
      .populate(POPULATE_WORKSPACE);

    return res.status(200).json({
      success: true,
      data: { task: formatTask(populatedTask) },
      message: 'Task updated successfully',
    });
  } catch (err) {
    return next(err);
  }
}

async function deleteTask(req, res, next) {
  try {
    const idValidation = validateTaskIdParam(req.params.id);
    if (!idValidation.valid) {
      return res.status(400).json({
        success: false,
        data: null,
        message: idValidation.message,
      });
    }

    const task = await Task.findById(idValidation.data.taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Task not found',
      });
    }

    const access = await ensureWorkspaceMember(task.workspaceId.toString(), req.user._id);
    if (!access.ok) {
      return res.status(access.status).json({
        success: false,
        data: null,
        message: access.message,
      });
    }

    await task.deleteOne();

    return res.status(200).json({
      success: true,
      data: null,
      message: 'Task deleted successfully',
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
};
