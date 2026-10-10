const express = require('express');
const router = express.Router();
const {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  addProjectMember,
  removeProjectMember,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  createProjectTask,
} = require('../controllers/projectController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { ROLES } = require('../config/constants');

// Project listing (Admin gets all, Employee gets only assigned)
router.get('/', authenticate, getProjects);

// Project details (Admin gets any, Employee only if assigned)
router.get('/:id', authenticate, getProjectById);

// Project CRUD (Admin / HR / Manager)
router.post('/', authenticate, authorizeRoles(ROLES.ADMIN, ROLES.HR, ROLES.MANAGER), createProject);
router.put('/:id', authenticate, authorizeRoles(ROLES.ADMIN, ROLES.HR, ROLES.MANAGER), updateProject);
router.delete('/:id', authenticate, authorizeRoles(ROLES.ADMIN, ROLES.HR), deleteProject);

// Project Members (Admin / HR / Manager)
router.post('/:id/members', authenticate, authorizeRoles(ROLES.ADMIN, ROLES.HR, ROLES.MANAGER), addProjectMember);
router.delete('/:id/members/:employeeId', authenticate, authorizeRoles(ROLES.ADMIN, ROLES.HR, ROLES.MANAGER), removeProjectMember);

// Project Milestones (Admin / HR / Manager)
router.post('/:id/milestones', authenticate, authorizeRoles(ROLES.ADMIN, ROLES.HR, ROLES.MANAGER), createMilestone);
router.put('/:id/milestones/:milestoneId', authenticate, authorizeRoles(ROLES.ADMIN, ROLES.HR, ROLES.MANAGER), updateMilestone);
router.delete('/:id/milestones/:milestoneId', authenticate, authorizeRoles(ROLES.ADMIN, ROLES.HR, ROLES.MANAGER), deleteMilestone);

// Project Tasks (all assigned members or admin can create project tasks)
router.post('/:id/tasks', authenticate, createProjectTask);

module.exports = router;
