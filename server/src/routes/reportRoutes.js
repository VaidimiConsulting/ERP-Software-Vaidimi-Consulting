const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { ROLES } = require('../config/constants');

router.use(authenticate);
router.use(authorizeRoles(ROLES.ADMIN, ROLES.HR, ROLES.MANAGER));

router.get('/employee', reportController.getEmployeeReport);
router.get('/intern', reportController.getInternReport);
router.get('/attendance', reportController.getAttendanceReport);
router.get('/leave', reportController.getLeaveReport);
router.get('/project', reportController.getProjectReport);
router.get('/task', reportController.getTaskReport);

module.exports = router;
