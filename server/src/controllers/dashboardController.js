const { Op } = require('sequelize');
const {
  Employee,
  Project,
  Task,
  LeaveRequest,
  Attendance,
  Holiday,
  LeaveBalance,
  Department,
} = require('../models');
const {
  EMPLOYMENT_TYPES,
  PROJECT_STATUS,
  TASK_STATUS,
  LEAVE_STATUS,
  ATTENDANCE_STATUS,
  ROLES,
} = require('../config/constants');
const { maskLeavePrivacy } = require('./leaveController');

/**
 * @route   GET /api/dashboard/admin
 * @desc    Comprehensive dashboard metrics for Admin & Manager
 * @access  Protected (ADMIN, MANAGER)
 */
async function getAdminDashboard(req, res) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const next14Days = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const [
      totalEmployees,
      totalInterns,
      activeEmployees,
      activeProjects,
      completedProjects,
      inProgressProjects,
      notStartedProjects,
      pendingLeaves,
      overdueTasks,
      leavesToday,
      upcomingDeadlines,
      presentTodayCount,
      onBreakTodayCount,
      checkedOutTodayCount,
    ] = await Promise.all([
      Employee.count({ where: { employment_type: EMPLOYMENT_TYPES.EMPLOYEE } }),
      Employee.count({ where: { employment_type: EMPLOYMENT_TYPES.INTERN } }),
      Employee.count({ where: { status: 'ACTIVE' } }),
      Project.count({
        where: {
          status: { [Op.in]: [PROJECT_STATUS.PLANNING, PROJECT_STATUS.IN_PROGRESS] },
        },
      }),
      Project.count({ where: { status: PROJECT_STATUS.COMPLETED } }),
      Project.count({ where: { status: PROJECT_STATUS.IN_PROGRESS } }),
      Project.count({ where: { status: PROJECT_STATUS.NOT_STARTED } }),
      LeaveRequest.count({ where: { status: LEAVE_STATUS.PENDING } }),
      Task.count({
        where: {
          due_date: { [Op.lt]: today },
          status: { [Op.ne]: TASK_STATUS.COMPLETED },
        },
      }),
      // Employees on leave today
      LeaveRequest.findAll({
        where: {
          status: LEAVE_STATUS.APPROVED,
          start_date: { [Op.lte]: today },
          end_date: { [Op.gte]: today },
        },
        include: [
          {
            model: Employee,
            as: 'employee',
            attributes: ['id', 'employee_code', 'first_name', 'last_name', 'email', 'designation'],
          },
        ],
      }),
      // Upcoming project deadlines (next 14 days)
      Project.findAll({
        where: {
          expected_end_date: { [Op.between]: [today, next14Days] },
          status: { [Op.ne]: PROJECT_STATUS.COMPLETED },
        },
        attributes: ['id', 'project_code', 'project_name', 'expected_end_date', 'status', 'completion_percentage'],
        order: [['expected_end_date', 'ASC']],
        limit: 5,
      }),
      // Attendance stats today
      Attendance.count({
        where: {
          date: today,
          check_in: { [Op.ne]: null },
        },
      }),
      Attendance.count({
        where: {
          date: today,
          is_on_break: true,
        },
      }),
      Attendance.count({
        where: {
          date: today,
          check_out: { [Op.ne]: null },
        },
      }),
    ]);

    // Format employees on leave today
    const staffOnLeave = leavesToday.map((l) => ({
      id: l.id,
      employee_id: l.employee_id,
      name: l.employee ? `${l.employee.first_name} ${l.employee.last_name}` : 'Team Member',
      leave_type: l.leave_type,
      start_date: l.start_date,
      end_date: l.end_date,
    }));

    return res.status(200).json({
      success: true,
      data: {
        totalEmployees,
        totalInterns,
        activeEmployees,
        activeProjects,
        completedProjects,
        inProgressProjects,
        notStartedProjects,
        employeesOnLeaveToday: staffOnLeave.length,
        staffOnLeave,
        pendingLeaves,
        overdueTasks,
        upcomingDeadlines,
        presentTodayCount,
        onBreakTodayCount,
        checkedOutTodayCount,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve admin dashboard metrics: ' + error.message,
    });
  }
}

/**
 * @route   GET /api/dashboard/employee
 * @desc    Comprehensive workspace metrics for Employee
 * @access  Protected
 */
async function getEmployeeDashboard(req, res) {
  try {
    const employeeId = req.employee?.id;
    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'Employee profile required.' });
    }

    const today = new Date().toISOString().split('T')[0];
    const next30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const year = new Date().getFullYear();

    const [
      todayAttendance,
      assignedProjects,
      currentTasks,
      leaveBalances,
      recentLeaves,
      upcomingHolidays,
      upcomingDeadlines,
    ] = await Promise.all([
      Attendance.findOne({ where: { employee_id: employeeId, date: today } }),
      Project.findAll({
        include: [
          {
            model: Employee,
            as: 'members',
            where: { id: employeeId },
            attributes: [],
            through: { attributes: [] },
          },
        ],
        where: {
          status: { [Op.ne]: PROJECT_STATUS.COMPLETED },
        },
        limit: 5,
      }),
      Task.findAll({
        where: {
          assigned_to: employeeId,
          status: { [Op.ne]: TASK_STATUS.COMPLETED },
        },
        include: [{ model: Project, as: 'project', attributes: ['id', 'project_name', 'project_code'] }],
        order: [
          ['created_at', 'DESC'],
          ['due_date', 'ASC'],
        ],
        limit: 10,
      }),
      LeaveBalance.findAll({ where: { employee_id: employeeId, year } }),
      LeaveRequest.findAll({
        where: { employee_id: employeeId },
        order: [['created_at', 'DESC']],
        limit: 5,
      }),
      Holiday.findAll({
        where: { date: { [Op.gte]: today } },
        order: [['date', 'ASC']],
        limit: 4,
      }),
      Task.findAll({
        where: {
          assigned_to: employeeId,
          due_date: { [Op.between]: [today, next30Days] },
          status: { [Op.ne]: TASK_STATUS.COMPLETED },
        },
        order: [['due_date', 'ASC']],
        limit: 5,
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        todayAttendance: todayAttendance || {
          date: today,
          status: 'NOT_CHECKED_IN',
          current_work_status: 'NOT_CHECKED_IN',
          is_on_break: false,
          total_break_minutes: 0,
          check_in: null,
          check_out: null,
          working_hours: 0,
        },
        currentProjects: assignedProjects,
        currentTasks,
        leaveBalances,
        recentLeaves,
        upcomingHolidays,
        upcomingDeadlines,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve employee dashboard metrics: ' + error.message,
    });
  }
}

module.exports = {
  getAdminDashboard,
  getEmployeeDashboard,
};
