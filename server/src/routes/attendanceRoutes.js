const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { ROLES } = require('../config/constants');

router.use(authenticate);

router.post('/check-in', attendanceController.checkIn);
router.post('/check-out', attendanceController.checkOut);
router.post('/break-start', attendanceController.startBreak);
router.post('/break-end', attendanceController.endBreak);
router.get('/today', attendanceController.getTodayAttendance);
router.get('/monthly', attendanceController.getMonthlyAttendance);
router.get('/', authorizeRoles(ROLES.ADMIN, ROLES.HR, ROLES.MANAGER), attendanceController.getAllAttendance);
router.post('/override', authorizeRoles(ROLES.ADMIN, ROLES.HR, ROLES.MANAGER), attendanceController.overrideAttendance);

module.exports = router;
