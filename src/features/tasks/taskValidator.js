const mongoose = require('mongoose');

const { TASK_STATUSES, TASK_PRIORITIES } = require('./taskModel');

const OBJECT_ID_PATTERN = /^[a-fA-F0-9]{24}$/;

function validationError(message) {
  return { valid: false, message, data: null };
}

function validationSuccess(data) {
  return { valid: true, message: '', data };
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isValidObjectIdString(value) {
  return (
    typeof value === 'string' &&
    OBJECT_ID_PATTERN.test(value) &&
    mongoose.Types.ObjectId.isValid(value)
  );
}

function parseAssignedTo(value) {
  if (value === null || value === undefined || value === '') {
    return { valid: true, assignedToId: null };
  }

  if (typeof value !== 'string') {
    return validationError('assignedTo must be a string user id');
  }

  const assignedToId = value.trim();
  if (!isValidObjectIdString(assignedToId)) {
    return validationError('assignedTo must be a valid user id');
  }

  return validationSuccess({ assignedToId });
}

function validateCreateTask(body) {
  if (!isPlainObject(body)) {
    return validationError('Request body is required');
  }

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const status = typeof body.status === 'string' ? body.status.trim() : 'todo';
  const priority = typeof body.priority === 'string' ? body.priority.trim() : 'medium';
  const workspaceId = typeof body.workspaceId === 'string' ? body.workspaceId.trim() : '';

  if (!title) {
    return validationError('Task title is required');
  }
  if (title.length > 200) {
    return validationError('Task title cannot exceed 200 characters');
  }
  if (description.length > 2000) {
    return validationError('Task description cannot exceed 2000 characters');
  }
  if (!TASK_STATUSES.includes(status)) {
    return validationError('Status must be todo, in_progress, or done');
  }
  if (!TASK_PRIORITIES.includes(priority)) {
    return validationError('Priority must be low, medium, or high');
  }
  if (!isValidObjectIdString(workspaceId)) {
    return validationError('A valid workspaceId is required');
  }

  const assignedToResult = parseAssignedTo(body.assignedTo);
  if (!assignedToResult.valid) {
    return assignedToResult;
  }

  return validationSuccess({
    title,
    description,
    status,
    priority,
    workspaceId,
    assignedToId: assignedToResult.data.assignedToId,
  });
}

function validateUpdateTask(body) {
  if (!isPlainObject(body)) {
    return validationError('Request body is required');
  }

  const updates = {};

  if (body.title !== undefined) {
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title) {
      return validationError('Task title cannot be empty');
    }
    if (title.length > 200) {
      return validationError('Task title cannot exceed 200 characters');
    }
    updates.title = title;
  }

  if (body.description !== undefined) {
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    if (description.length > 2000) {
      return validationError('Task description cannot exceed 2000 characters');
    }
    updates.description = description;
  }

  if (body.status !== undefined) {
    const status = typeof body.status === 'string' ? body.status.trim() : '';
    if (!TASK_STATUSES.includes(status)) {
      return validationError('Status must be todo, in_progress, or done');
    }
    updates.status = status;
  }

  if (body.priority !== undefined) {
    const priority = typeof body.priority === 'string' ? body.priority.trim() : '';
    if (!TASK_PRIORITIES.includes(priority)) {
      return validationError('Priority must be low, medium, or high');
    }
    updates.priority = priority;
  }

  if (body.assignedTo !== undefined) {
    const assignedToResult = parseAssignedTo(body.assignedTo);
    if (!assignedToResult.valid) {
      return assignedToResult;
    }
    updates.assignedTo = assignedToResult.data.assignedToId;
  }

  if (Object.keys(updates).length === 0) {
    return validationError('At least one field is required to update');
  }

  return validationSuccess(updates);
}

function validateListTasksQuery(query) {
  if (!isPlainObject(query)) {
    return validationError('Query parameters must be an object');
  }

  if (Object.keys(query).length !== 1 || query.workspaceId === undefined) {
    return validationError('Only workspaceId is allowed as a list query parameter');
  }

  const workspaceId = typeof query.workspaceId === 'string' ? query.workspaceId.trim() : '';
  if (!isValidObjectIdString(workspaceId)) {
    return validationError('A valid workspaceId query parameter is required');
  }

  return validationSuccess({ workspaceId });
}

function validateTaskIdParam(taskId) {
  if (!isValidObjectIdString(taskId)) {
    return validationError('Invalid task id');
  }

  return validationSuccess({ taskId });
}

module.exports = {
  validateCreateTask,
  validateUpdateTask,
  validateListTasksQuery,
  validateTaskIdParam,
  isValidObjectIdString,
};
