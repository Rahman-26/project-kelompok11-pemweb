const express = require('express');

const {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
} = require('./taskController');
const { protect } = require('../../middlewares/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/', createTask);
router.get('/', getTasks);
router.get('/:id', getTaskById);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);

module.exports = router;
