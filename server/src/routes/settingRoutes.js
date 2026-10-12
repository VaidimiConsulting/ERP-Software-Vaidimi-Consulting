const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { ROLES } = require('../config/constants');
const {
  getSettings,
  updateSettings,
  updateUserProfile,
  getEmployeeUpdateLogs,
} = require('../controllers/settingController');

// All authenticated users can read office timings
router.get('/', authenticate, getSettings);

// Only ADMIN and HR can update office timings
router.put('/', authenticate, authorizeRoles(ROLES.ADMIN, ROLES.HR), updateSettings);

// All authenticated users (Admin, HR, Employee) can edit their own profile settings
router.put('/profile', authenticate, updateUserProfile);

// Admin only: view employee profile update submissions & audit history
router.get('/employee-updates', authenticate, authorizeRoles(ROLES.ADMIN), getEmployeeUpdateLogs);

module.exports = router;

