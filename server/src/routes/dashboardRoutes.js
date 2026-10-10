const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { ROLES } = require('../config/constants');

router.use(authenticate);

router.get('/admin', authorizeRoles(ROLES.ADMIN, ROLES.HR, ROLES.MANAGER), dashboardController.getAdminDashboard);
router.get('/hr', authorizeRoles(ROLES.ADMIN, ROLES.HR), dashboardController.getAdminDashboard);
router.get('/employee', dashboardController.getEmployeeDashboard);

module.exports = router;
