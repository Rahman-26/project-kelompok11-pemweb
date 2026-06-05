const mongoose = require('mongoose');

const TASK_STATUSES = Object.freeze(['todo', 'in_progress', 'done']);
const TASK_PRIORITIES = Object.freeze(['low', 'medium', 'high']);

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      maxlength: [200, 'Task title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Task description cannot exceed 2000 characters'],
      default: '',
    },
    status: {
      type: String,
      enum: {
        values: TASK_STATUSES,
        message: 'Status must be todo, in_progress, or done',
      },
      default: 'todo',
    },
    priority: {
      type: String,
      enum: {
        values: TASK_PRIORITIES,
        message: 'Priority must be low, medium, or high',
      },
      default: 'medium',
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: [true, 'Workspace is required'],
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
);

taskSchema.index({ workspaceId: 1, status: 1 });
taskSchema.index({ workspaceId: 1, priority: 1 });
taskSchema.index({ workspaceId: 1, assignedTo: 1 });

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;
module.exports.TASK_STATUSES = TASK_STATUSES;
module.exports.TASK_PRIORITIES = TASK_PRIORITIES;
