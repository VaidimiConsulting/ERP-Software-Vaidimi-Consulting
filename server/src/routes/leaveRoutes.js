const express = require('express');
const router = express.Router();
const leaveController = require('../controllers/leaveController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { ROLES } = require('../config/constants');

router.use(authenticate);

router.get('/balances', leaveController.getLeaveBalances);
router.get('/balances/:employee_id', leaveController.getLeaveBalances);
router.post('/balances/adjust', authorizeRoles(ROLES.ADMIN, ROLES.HR, ROLES.MANAGER), leaveController.adjustEmployeeLeaveBalance);
router.post('/', leaveController.applyLeave);
router.post('/schedule', authorizeRoles(ROLES.ADMIN, ROLES.HR, ROLES.MANAGER), leaveController.scheduleEmployeeLeave);
router.get('/my', leaveController.getMyLeaves);
router.get('/policies', leaveController.getLeavePolicies);
router.post('/policies', authorizeRoles(ROLES.ADMIN), leaveController.createLeavePolicy);
router.put('/policies/:id', authorizeRoles(ROLES.ADMIN), leaveController.updateLeavePolicy);
router.delete('/policies/:id', authorizeRoles(ROLES.ADMIN), leaveController.deleteLeavePolicy);
router.get('/summary-report', authorizeRoles(ROLES.ADMIN, ROLES.HR, ROLES.MANAGER), leaveController.getLeaveSummaryReport);
router.get('/', leaveController.getAllLeaves);
router.put('/:id/status', authorizeRoles(ROLES.ADMIN, ROLES.HR, ROLES.MANAGER), leaveController.updateLeaveStatus);

module.exports = router;
