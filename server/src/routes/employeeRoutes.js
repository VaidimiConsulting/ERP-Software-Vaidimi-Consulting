const express = require('express');
const router = express.Router();
const {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  toggleStatus,
  deleteEmployee,
  resetEmployeePassword,
} = require('../controllers/employeeController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { ROLES } = require('../config/constants');

// List employees/interns (accessible to all authenticated users)
router.get('/', authenticate, getEmployees);

// Single employee details
router.get('/:id', authenticate, getEmployeeById);

// Create employee or intern (Admin, HR & Manager)
router.post('/', authenticate, authorizeRoles(ROLES.ADMIN, ROLES.HR, ROLES.MANAGER), createEmployee);

// Update employee (Admin full edit, Employee self-service for contact info)
router.put('/:id', authenticate, updateEmployee);

// Admin and HR explicitly set or reset password for employee or intern
router.put('/:id/reset-password', authenticate, authorizeRoles(ROLES.ADMIN, ROLES.HR), resetEmployeePassword);

// Toggle active/inactive status (Admin and HR)
router.put('/:id/toggle-status', authenticate, authorizeRoles(ROLES.ADMIN, ROLES.HR), toggleStatus);

// Delete employee or intern (Admin & HR)
router.delete('/:id', authenticate, authorizeRoles(ROLES.ADMIN, ROLES.HR), deleteEmployee);

module.exports = router;
