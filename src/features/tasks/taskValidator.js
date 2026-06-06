const mongoose = require('mongoose');

const { TASK_STATUSES, TASK_PRIORITIES } = require('./taskModel');

const OBJECT_ID_PATTERN = /^[a-fA-F0-9]{24}$/;
const MAX_SEARCH_LENGTH = 100;

const ALLOWED_LIST_QUERY_KEYS = Object.freeze([
  'workspaceId',
  'search',
  'status',
  'priority',
  'assignee',
]);

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

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasOnlyAllowedQueryKeys(query, allowedKeys) {
  return Object.keys(query).every((key) => allowedKeys.includes(key));
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

  if (!hasOnlyAllowedQueryKeys(query, ALLOWED_LIST_QUERY_KEYS)) {
    return validationError('Unsupported query parameter supplied');
  }

  const workspaceId = typeof query.workspaceId === 'string' ? query.workspaceId.trim() : '';
  if (!isValidObjectIdString(workspaceId)) {
    return validationError('A valid workspaceId query parameter is required');
  }

  const filters = {
    workspaceId: new mongoose.Types.ObjectId(workspaceId),
  };

  if (query.search !== undefined) {
    if (typeof query.search !== 'string') {
      return validationError('Search must be a string');
    }

    const search = query.search.trim();
    if (search.length === 0) {
      return validationError('Search cannot be empty when provided');
    }
    if (search.length > MAX_SEARCH_LENGTH) {
      return validationError(`Search cannot exceed ${MAX_SEARCH_LENGTH} characters`);
    }

    filters.searchRegex = new RegExp(escapeRegex(search), 'i');
  }

  if (query.status !== undefined) {
    if (typeof query.status !== 'string') {
      return validationError('Status must be a string');
    }

    const status = query.status.trim();
    if (!TASK_STATUSES.includes(status)) {
      return validationError('Status must be todo, in_progress, or done');
    }

    filters.status = status;
  }

  if (query.priority !== undefined) {
    if (typeof query.priority !== 'string') {
      return validationError('Priority must be a string');
    }

    const priority = query.priority.trim();
    if (!TASK_PRIORITIES.includes(priority)) {
      return validationError('Priority must be low, medium, or high');
    }

    filters.priority = priority;
  }

  if (query.assignee !== undefined) {
    if (typeof query.assignee !== 'string') {
      return validationError('Assignee must be a string');
    }

    const assigneeId = query.assignee.trim();
    if (!isValidObjectIdString(assigneeId)) {
      return validationError('Assignee must be a valid user id');
    }

    filters.assignee = new mongoose.Types.ObjectId(assigneeId);
  }

  return validationSuccess(filters);
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
