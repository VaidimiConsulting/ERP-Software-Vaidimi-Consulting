const express = require('express');
const router = express.Router();
const {
  generateMonthlyPayroll,
  getPayrollRecords,
  updatePaymentStatus,
  getMyPayroll,
  createCustomPayrollRecord,
  updatePayrollRecord,
  deletePayrollRecord,
  sendPayrollToEmployee,
  sendBulkPayrollToEmployees,
} = require('../controllers/payrollController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { ROLES } = require('../config/constants');

// Employee: View self salary history & payslips
router.get('/my', authenticate, getMyPayroll);

// Admin ONLY: Generate monthly payroll
router.post('/generate', authenticate, authorizeRoles(ROLES.ADMIN), generateMonthlyPayroll);

// Admin ONLY: List payroll records for month with breakdown
router.get('/', authenticate, authorizeRoles(ROLES.ADMIN), getPayrollRecords);

// Admin ONLY: Update payment status (e.g. mark as PAID)
router.put('/:id/status', authenticate, authorizeRoles(ROLES.ADMIN), updatePaymentStatus);

// Admin ONLY: Send single payroll record directly to employee portal
router.post('/:id/send', authenticate, authorizeRoles(ROLES.ADMIN), sendPayrollToEmployee);

// Admin ONLY: Send all month payroll records directly to employee portals
router.post('/send-bulk', authenticate, authorizeRoles(ROLES.ADMIN), sendBulkPayrollToEmployees);

// Admin ONLY: CRUD write operations (Add custom salary entry, Edit/Increase salary, Delete)
router.post('/', authenticate, authorizeRoles(ROLES.ADMIN), createCustomPayrollRecord);
router.put('/:id', authenticate, authorizeRoles(ROLES.ADMIN), updatePayrollRecord);
router.delete('/:id', authenticate, authorizeRoles(ROLES.ADMIN), deletePayrollRecord);

module.exports = router;

