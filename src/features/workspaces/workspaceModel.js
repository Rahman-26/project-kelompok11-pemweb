const mongoose = require('mongoose');

const MEMBER_ROLES = Object.freeze(['owner', 'member']);

const workspaceMemberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: {
        values: MEMBER_ROLES,
        message: 'Member role must be either owner or member',
      },
      default: 'member',
    },
  },
  { _id: true },
);

const workspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Workspace name is required'],
      trim: true,
      maxlength: [100, 'Workspace name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: {
      type: [workspaceMemberSchema],
      default: [],
    },
  },
  { timestamps: true },
);

workspaceSchema.index({ owner: 1 });
workspaceSchema.index({ 'members.user': 1 });

const Workspace = mongoose.model('Workspace', workspaceSchema);

module.exports = Workspace;
module.exports.MEMBER_ROLES = MEMBER_ROLES;
