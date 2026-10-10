const express = require('express');
const router = express.Router();
const { getDepartments, createDepartment } = require('../controllers/departmentController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { ROLES } = require('../config/constants');

// All authenticated users can view departments (needed for dropdowns and profiles)
router.get('/', authenticate, getDepartments);

// Only Admin can create departments
router.post('/', authenticate, authorizeRoles(ROLES.ADMIN), createDepartment);

module.exports = router;
