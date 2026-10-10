const express = require('express');
const router = express.Router();
const {
  getTasks,
  getTaskStats,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
} = require('../controllers/taskController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { ROLES } = require('../config/constants');

// Task statistics for widgets (Pending, Completed, Overdue, Blocked)
router.get('/stats', authenticate, getTaskStats);

// List tasks (Admin sees all/filtered; Employee sees assigned)
router.get('/', authenticate, getTasks);

// Get single task
router.get('/:id', authenticate, getTaskById);

// Create task (Admin, HR & Manager)
router.post('/', authenticate, authorizeRoles(ROLES.ADMIN, ROLES.HR, ROLES.MANAGER), createTask);

// Update task (Admin/HR full edit, Employee updates status & progress only)
router.put('/:id', authenticate, updateTask);

// Delete task (Admin, HR & Manager)
router.delete('/:id', authenticate, authorizeRoles(ROLES.ADMIN, ROLES.HR, ROLES.MANAGER), deleteTask);

module.exports = router;
