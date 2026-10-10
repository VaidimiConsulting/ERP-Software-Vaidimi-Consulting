const express = require('express');
const router = express.Router();
const healthRoutes = require('./healthRoutes');
const authRoutes = require('./authRoutes');
const employeeRoutes = require('./employeeRoutes');
const departmentRoutes = require('./departmentRoutes');
const projectRoutes = require('./projectRoutes');
const taskRoutes = require('./taskRoutes');
const attendanceRoutes = require('./attendanceRoutes');
const leaveRoutes = require('./leaveRoutes');
const holidayRoutes = require('./holidayRoutes');
const calendarRoutes = require('./calendarRoutes');
const notificationRoutes = require('./notificationRoutes');
const reportRoutes = require('./reportRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const settingRoutes = require('./settingRoutes');
const payrollRoutes = require('./payrollRoutes');
const chatRoutes = require('./chatRoutes');
const branchRoutes = require('./branchRoutes');

// Health Check API
router.use('/health', healthRoutes);

// Phase 2: Authentication & User Management
router.use('/auth', authRoutes);

// Phase 3: Employee & Intern Management
router.use('/employees', employeeRoutes);

// Phase 4: Department Management
router.use('/departments', departmentRoutes);

// Phase 4: Project Management & Milestones
router.use('/projects', projectRoutes);

// Phase 5: Task Management
router.use('/tasks', taskRoutes);

// Phase 6: Attendance & Leave Management
router.use('/attendance', attendanceRoutes);
router.use('/leaves', leaveRoutes);

// Phase 7: Calendar & Holiday Management
router.use('/holidays', holidayRoutes);
router.use('/calendar', calendarRoutes);

// Phase 8: Dashboards, Reports, Settings & Payroll
router.use('/notifications', notificationRoutes);
router.use('/reports', reportRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/settings', settingRoutes);
router.use('/payroll', payrollRoutes);

// Phase 9: Enterprise Workplace Chat & Presence
router.use('/chat', chatRoutes);

// Phase 10: Multi-Branch Infrastructure & Branch-Scoped Operations
router.use('/branches', branchRoutes);

module.exports = router;
