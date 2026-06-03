const express = require('express');

const {
  createWorkspace,
  getMyWorkspaces,
  getWorkspaceById,
  updateWorkspace,
  deleteWorkspace,
  addMember,
  removeMember,
} = require('./workspaceController');
const { protect } = require('../../middlewares/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/', createWorkspace);
router.get('/', getMyWorkspaces);
router.get('/:id', getWorkspaceById);
router.put('/:id', updateWorkspace);
router.delete('/:id', deleteWorkspace);
router.post('/:id/members', addMember);
router.delete('/:id/members/:memberId', removeMember);

module.exports = router;
