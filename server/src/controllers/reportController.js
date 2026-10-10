const { Op } = require('sequelize');
const {
  Employee,
  Department,
  Attendance,
  LeaveRequest,
  Project,
  Task,
  User,
} = require('../models');
const { EMPLOYMENT_TYPES, ROLES, LEAVE_TYPES } = require('../config/constants');
const { maskLeavePrivacy } = require('./leaveController');

/**
 * @route   GET /api/reports/employee
 * @desc    Employee workforce report
 * @access  Protected (ADMIN, MANAGER)
 */
async function getEmployeeReport(req, res) {
  try {
    const { department_id, status, employment_type, start_date, end_date } = req.query;
    const where = {};

    if (department_id) where.department_id = department_id;
    if (status) where.status = status;
    if (employment_type) where.employment_type = employment_type;
    if (start_date && end_date) {
      where.joining_date = { [Op.between]: [start_date, end_date] };
    }

    const employees = await Employee.findAll({
      where,
      include: [
        { model: Department, as: 'department', attributes: ['department_name'] },
        { model: Employee, as: 'reportingManager', attributes: ['first_name', 'last_name'] },
      ],
      order: [['created_at', 'DESC']],
    });

    const reportData = employees.map((e) => ({
      id: e.id,
      code: e.employee_code,
      name: `${e.first_name} ${e.last_name}`,
      email: e.email,
      phone: e.phone,
      department: e.department?.department_name || 'N/A',
      designation: e.designation,
      employment_type: e.employment_type,
      joining_date: e.joining_date,
      status: e.status,
      manager: e.reportingManager ? `${e.reportingManager.first_name} ${e.reportingManager.last_name}` : 'None',
    }));

    return res.status(200).json({
      success: true,
      count: reportData.length,
      data: reportData,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to generate employee report: ' + error.message,
    });
  }
}

/**
 * @route   GET /api/reports/intern
 * @desc    Intern report with mentor and duration
 * @access  Protected (ADMIN, MANAGER)
 */
async function getInternReport(req, res) {
  try {
    const { department_id, status } = req.query;
    const where = { employment_type: EMPLOYMENT_TYPES.INTERN };

    if (department_id) where.department_id = department_id;
    if (status) where.status = status;

    const interns = await Employee.findAll({
      where,
      include: [
        { model: Department, as: 'department', attributes: ['department_name'] },
        { model: Employee, as: 'mentor', attributes: ['first_name', 'last_name', 'email'] },
      ],
      order: [['created_at', 'DESC']],
    });

    const reportData = interns.map((i) => ({
      id: i.id,
      code: i.employee_code,
      name: `${i.first_name} ${i.last_name}`,
      email: i.email,
      department: i.department?.department_name || 'N/A',
      designation: i.designation,
      internship_start: i.internship_start_date,
      internship_end: i.internship_end_date,
      mentor: i.mentor ? `${i.mentor.first_name} ${i.mentor.last_name}` : 'Unassigned',
      status: i.status,
    }));

    return res.status(200).json({
      success: true,
      count: reportData.length,
      data: reportData,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to generate intern report: ' + error.message,
    });
  }
}

/**
 * @route   GET /api/reports/attendance
 * @desc    Attendance report
 * @access  Protected (ADMIN, MANAGER)
 */
async function getAttendanceReport(req, res) {
  try {
    const { start_date, end_date, employee_id, status, department_id } = req.query;
    const where = {};

    if (start_date && end_date) {
      where.date = { [Op.between]: [start_date, end_date] };
    } else if (start_date) {
      where.date = { [Op.gte]: start_date };
    }
    if (employee_id) where.employee_id = employee_id;
    if (status) where.status = status;

    const empInclude = {
      model: Employee,
      as: 'employee',
      attributes: ['employee_code', 'first_name', 'last_name', 'department_id'],
      include: [{ model: Department, as: 'department', attributes: ['department_name'] }],
    };

    if (department_id) {
      empInclude.where = { department_id };
    }

    const records = await Attendance.findAll({
      where,
      include: [empInclude],
      order: [['date', 'DESC']],
    });

    const reportData = records.map((a) => ({
      id: a.id,
      date: a.date,
      employee_code: a.employee?.employee_code,
      employee_name: a.employee ? `${a.employee.first_name} ${a.employee.last_name}` : 'Unknown',
      department: a.employee?.department?.department_name || 'N/A',
      check_in: a.check_in ? new Date(a.check_in).toLocaleTimeString() : 'N/A',
      check_out: a.check_out ? new Date(a.check_out).toLocaleTimeString() : 'N/A',
      working_hours: a.working_hours,
      status: a.status,
      notes: a.notes,
    }));

    return res.status(200).json({
      success: true,
      count: reportData.length,
      data: reportData,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to generate attendance report: ' + error.message,
    });
  }
}

/**
 * @route   GET /api/reports/leave
 * @desc    Leave request report (with Menstrual Leave privacy masking)
 * @access  Protected (ADMIN, MANAGER)
 */
async function getLeaveReport(req, res) {
  try {
    const { start_date, end_date, employee_id, status, leave_type } = req.query;
    const where = {};

    if (start_date && end_date) {
      where.start_date = { [Op.between]: [start_date, end_date] };
    }
    if (employee_id) where.employee_id = employee_id;
    if (status) where.status = status;
    if (leave_type) where.leave_type = leave_type;

    const leaves = await LeaveRequest.findAll({
      where,
      include: [
        {
          model: Employee,
          as: 'employee',
          attributes: ['employee_code', 'first_name', 'last_name'],
          include: [{ model: Department, as: 'department', attributes: ['department_name'] }],
        },
        {
          model: Employee,
          as: 'reviewer',
          attributes: ['first_name', 'last_name'],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    const viewingEmployeeId = req.employee?.id;
    const reportData = leaves.map((l) => {
      const masked = maskLeavePrivacy(l, req.user, viewingEmployeeId);
      return {
        id: masked.id,
        employee_code: masked.employee?.employee_code,
        employee_name: masked.employee ? `${masked.employee.first_name} ${masked.employee.last_name}` : 'Unknown',
        department: masked.employee?.department?.department_name || 'N/A',
        leave_type: masked.leave_type,
        start_date: masked.start_date,
        end_date: masked.end_date,
        total_days: masked.total_days,
        status: masked.status,
        reason: masked.reason,
        reviewed_by: masked.reviewer ? `${masked.reviewer.first_name} ${masked.reviewer.last_name}` : 'Pending',
        created_at: masked.created_at,
      };
    });

    return res.status(200).json({
      success: true,
      count: reportData.length,
      data: reportData,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to generate leave report: ' + error.message,
    });
  }
}

/**
 * @route   GET /api/reports/project
 * @desc    Project performance & delivery report
 * @access  Protected (ADMIN, MANAGER)
 */
async function getProjectReport(req, res) {
  try {
    const { status, priority, start_date, end_date } = req.query;
    const where = {};

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (start_date && end_date) {
      where.start_date = { [Op.between]: [start_date, end_date] };
    }

    const projects = await Project.findAll({
      where,
      include: [
        { model: Employee, as: 'manager', attributes: ['first_name', 'last_name'] },
        { model: Task, as: 'tasks', attributes: ['id', 'status'] },
      ],
      order: [['created_at', 'DESC']],
    });

    const reportData = projects.map((p) => {
      const totalTasks = p.tasks?.length || 0;
      const completedTasks = p.tasks?.filter((t) => t.status === 'COMPLETED').length || 0;
      return {
        id: p.id,
        code: p.project_code,
        name: p.project_name,
        client: p.client_name || 'Internal',
        status: p.status,
        priority: p.priority,
        completion_percentage: p.completion_percentage,
        start_date: p.start_date,
        expected_end_date: p.expected_end_date,
        actual_end_date: p.actual_end_date || 'N/A',
        manager: p.manager ? `${p.manager.first_name} ${p.manager.last_name}` : 'Unassigned',
        tasks_count: totalTasks,
        completed_tasks_count: completedTasks,
      };
    });

    return res.status(200).json({
      success: true,
      count: reportData.length,
      data: reportData,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to generate project report: ' + error.message,
    });
  }
}

/**
 * @route   GET /api/reports/task
 * @desc    Task completion and workload report
 * @access  Protected (ADMIN, MANAGER)
 */
async function getTaskReport(req, res) {
  try {
    const { project_id, status, priority, assigned_to } = req.query;
    const where = {};

    if (project_id) where.project_id = project_id;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assigned_to) where.assigned_to = assigned_to;

    const tasks = await Task.findAll({
      where,
      include: [
        { model: Project, as: 'project', attributes: ['project_name', 'project_code'] },
        { model: Employee, as: 'assignee', attributes: ['employee_code', 'first_name', 'last_name'] },
      ],
      order: [['created_at', 'DESC']],
    });

    const today = new Date().toISOString().split('T')[0];
    const reportData = tasks.map((t) => {
      const isOverdue = t.due_date && t.due_date < today && t.status !== 'COMPLETED';
      return {
        id: t.id,
        task_code: t.task_code,
        title: t.title,
        project: t.project?.project_name || 'N/A',
        assignee: t.assignee ? `${t.assignee.first_name} ${t.assignee.last_name}` : 'Unassigned',
        priority: t.priority,
        status: t.status,
        progress_percentage: t.progress_percentage,
        start_date: t.start_date || 'N/A',
        due_date: t.due_date || 'N/A',
        is_overdue: isOverdue ? 'YES' : 'NO',
        completed_at: t.completed_at || 'N/A',
      };
    });

    return res.status(200).json({
      success: true,
      count: reportData.length,
      data: reportData,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to generate task report: ' + error.message,
    });
  }
}

module.exports = {
  getEmployeeReport,
  getInternReport,
  getAttendanceReport,
  getLeaveReport,
  getProjectReport,
  getTaskReport,
};
