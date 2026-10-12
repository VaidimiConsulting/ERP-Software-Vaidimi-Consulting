const { Op } = require('sequelize');
const { Attendance, Employee, Department, Branch } = require('../models');
const { ATTENDANCE_STATUS, ROLES } = require('../config/constants');

/**
 * Helper to get current YYYY-MM-DD
 */
function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Real-time dynamic working hours calculator (persists across closed windows/browser sessions)
 */
function getLiveWorkingHours(att, now = new Date()) {
  if (!att || !att.check_in) return 0;
  if (att.check_out) return parseFloat(att.working_hours || 0);

  const totalDiffMs = now.getTime() - new Date(att.check_in).getTime();
  const totalHours = Math.max(0, totalDiffMs / (1000 * 60 * 60));
  let breakMins = att.total_break_minutes || 0;
  if (att.is_on_break && att.break_start) {
    const currentBreakMs = now.getTime() - new Date(att.break_start).getTime();
    breakMins += Math.max(0, Math.round(currentBreakMs / (1000 * 60)));
  }
  const breakHours = breakMins / 60;
  return parseFloat(Math.max(0, totalHours - breakHours).toFixed(2));
}

/**
 * @route   POST /api/attendance/check-in
 * @desc    Employee checks in for today
 * @access  Protected
 */
async function checkIn(req, res) {
  try {
    const employeeId = req.employee?.id;
    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'No employee profile linked to current user account.',
      });
    }

    const today = getTodayString();

    // Check if record already exists for today
    let attendance = await Attendance.findOne({
      where: { employee_id: employeeId, date: today },
    });

    if (attendance) {
      if (attendance.check_in) {
        return res.status(400).json({
          success: false,
          message: `Already checked in today at ${new Date(attendance.check_in).toLocaleTimeString()}.`,
          data: attendance,
        });
      }
      // If was pre-marked (e.g. absent/on leave), update check-in
      attendance.check_in = new Date();
      attendance.status = ATTENDANCE_STATUS.PRESENT;
      attendance.current_work_status = 'CHECKED_IN';
      attendance.is_on_break = false;
      attendance.ip_address = req.ip || req.connection.remoteAddress;
      await attendance.save();
    } else {
      attendance = await Attendance.create({
        employee_id: employeeId,
        date: today,
        check_in: new Date(),
        status: ATTENDANCE_STATUS.PRESENT,
        current_work_status: 'CHECKED_IN',
        is_on_break: false,
        total_break_minutes: 0,
        ip_address: req.ip || req.connection.remoteAddress,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Check-in recorded successfully. Welcome to your shift!',
      data: attendance,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Check-in failed: ' + error.message,
    });
  }
}

/**
 * @route   POST /api/attendance/break-start
 * @desc    Employee pauses work to take lunch/coffee break (1:00 PM - 2:00 PM default)
 * @access  Protected
 */
async function startBreak(req, res) {
  try {
    const employeeId = req.employee?.id;
    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'No employee profile linked to current user account.',
      });
    }

    const today = getTodayString();
    const attendance = await Attendance.findOne({
      where: { employee_id: employeeId, date: today },
    });

    if (!attendance || !attendance.check_in) {
      return res.status(400).json({
        success: false,
        message: 'You have not checked in yet today.',
      });
    }

    if (attendance.check_out) {
      return res.status(400).json({
        success: false,
        message: 'You have already checked out for the day.',
      });
    }

    if (attendance.is_on_break) {
      return res.status(400).json({
        success: false,
        message: 'You are already on break.',
        data: attendance,
      });
    }

    const now = new Date();
    attendance.is_on_break = true;
    attendance.break_start = now;
    attendance.current_work_status = 'ON_BREAK';
    await attendance.save();

    return res.status(200).json({
      success: true,
      message: `Break started at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Work session paused. Enjoy your break!`,
      data: attendance,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to start break: ' + error.message,
    });
  }
}

/**
 * @route   POST /api/attendance/break-end
 * @desc    Employee ends break and resumes active work session
 * @access  Protected
 */
async function endBreak(req, res) {
  try {
    const employeeId = req.employee?.id;
    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'No employee profile linked to current user account.',
      });
    }

    const today = getTodayString();
    const attendance = await Attendance.findOne({
      where: { employee_id: employeeId, date: today },
    });

    if (!attendance || !attendance.check_in) {
      return res.status(400).json({
        success: false,
        message: 'You have not checked in yet today.',
      });
    }

    if (!attendance.is_on_break) {
      return res.status(400).json({
        success: false,
        message: 'You are not currently on break.',
        data: attendance,
      });
    }

    const now = new Date();
    let elapsedMinutes = 0;
    if (attendance.break_start) {
      const diffMs = now - new Date(attendance.break_start);
      elapsedMinutes = Math.max(1, Math.round(diffMs / (1000 * 60)));
    }

    attendance.total_break_minutes = (attendance.total_break_minutes || 0) + elapsedMinutes;
    attendance.is_on_break = false;
    attendance.break_end = now;
    attendance.current_work_status = 'CHECKED_IN';
    await attendance.save();

    return res.status(200).json({
      success: true,
      message: `Break ended. Welcome back to work! Break logged: ${elapsedMinutes} mins (Total: ${attendance.total_break_minutes} mins).`,
      data: attendance,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to end break: ' + error.message,
    });
  }
}

/**
 * @route   POST /api/attendance/check-out
 * @desc    Employee checks out for today (at 5:30 PM or shift end)
 * @access  Protected
 */
async function checkOut(req, res) {
  try {
    const employeeId = req.employee?.id;
    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'No employee profile linked to current user account.',
      });
    }

    const today = getTodayString();
    const attendance = await Attendance.findOne({
      where: { employee_id: employeeId, date: today },
    });

    if (!attendance || !attendance.check_in) {
      return res.status(400).json({
        success: false,
        message: 'You have not checked in yet today.',
      });
    }

    if (attendance.check_out) {
      return res.status(400).json({
        success: false,
        message: `Already checked out today at ${new Date(attendance.check_out).toLocaleTimeString()}.`,
        data: attendance,
      });
    }

    const now = new Date();

    // If currently on break, auto-end break first so break minutes are counted
    if (attendance.is_on_break && attendance.break_start) {
      const diffBreakMs = now - new Date(attendance.break_start);
      const addMins = Math.max(1, Math.round(diffBreakMs / (1000 * 60)));
      attendance.total_break_minutes = (attendance.total_break_minutes || 0) + addMins;
      attendance.is_on_break = false;
      attendance.break_end = now;
    }

    attendance.check_out = now;
    attendance.current_work_status = 'CHECKED_OUT';

    // Calculate net working hours: total elapsed hours - break hours
    const totalDiffMs = now - new Date(attendance.check_in);
    const totalHours = Math.max(0, totalDiffMs / (1000 * 60 * 60));
    const breakHours = (attendance.total_break_minutes || 0) / 60;
    const netHours = Math.max(0, totalHours - breakHours);
    attendance.working_hours = parseFloat(netHours.toFixed(2));

    // For a 6.0-hour standard workday, if net working hours < 3.0, flag as HALF_DAY unless manually overridden
    if (netHours < 3.0 && !attendance.is_manual_override) {
      attendance.status = ATTENDANCE_STATUS.HALF_DAY;
    } else {
      attendance.status = ATTENDANCE_STATUS.PRESENT;
    }

    await attendance.save();

    return res.status(200).json({
      success: true,
      message: `Check-out recorded at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Net logged work time: ${attendance.working_hours} hrs (Break: ${attendance.total_break_minutes} mins, Shift Requirement: 6.0 hrs). Great work today!`,
      data: attendance,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Check-out failed: ' + error.message,
    });
  }
}

/**
 * @route   GET /api/attendance/today
 * @desc    Get logged in user's today attendance status
 * @access  Protected
 */
async function getTodayAttendance(req, res) {
  try {
    const employeeId = req.query.employee_id || req.employee?.id;
    if (!employeeId) {
      return res.status(200).json({ success: true, data: null });
    }

    const today = getTodayString();
    const attendance = await Attendance.findOne({
      where: { employee_id: employeeId, date: today },
    });

    let data = attendance ? (attendance.toJSON ? attendance.toJSON() : { ...attendance }) : null;
    if (data) {
      if (!data.current_work_status || data.current_work_status === 'NOT_CHECKED_IN') {
        if (data.check_out) {
          data.current_work_status = 'CHECKED_OUT';
        } else if (data.check_in) {
          data.current_work_status = data.is_on_break ? 'ON_BREAK' : 'CHECKED_IN';
        }
      }
      data.working_hours = getLiveWorkingHours(data);
      data.live_working_hours = data.working_hours;
      data.target_hours = 6.0;
    } else {
      data = {
        date: today,
        check_in: null,
        check_out: null,
        working_hours: 0,
        live_working_hours: 0,
        target_hours: 6.0,
        status: 'NOT_CHECKED_IN',
        current_work_status: 'NOT_CHECKED_IN',
        is_on_break: false,
      };
    }

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve today attendance: ' + error.message,
    });
  }
}

/**
 * @route   GET /api/attendance/monthly
 * @desc    Get monthly attendance records for an employee
 * @access  Protected
 */
async function getMonthlyAttendance(req, res) {
  try {
    const isAdminOrManager = req.user.role === ROLES.ADMIN || req.user.role === ROLES.MANAGER;
    let targetEmployeeId = req.query.employee_id;

    if (!isAdminOrManager || !targetEmployeeId) {
      targetEmployeeId = req.employee?.id;
    }

    if (!targetEmployeeId) {
      return res.status(400).json({ success: false, message: 'Employee ID required.' });
    }

    const monthStr = req.query.month || getTodayString().slice(0, 7); // 'YYYY-MM'
    const [year, month] = monthStr.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();

    const startDate = `${monthStr}-01`;
    const endDate = `${monthStr}-${String(daysInMonth).padStart(2, '0')}`;

    const records = await Attendance.findAll({
      where: {
        employee_id: targetEmployeeId,
        date: {
          [Op.between]: [startDate, endDate],
        },
      },
      order: [['date', 'ASC']],
    });

    // Summary calculations
    let presentCount = 0;
    let absentCount = 0;
    let halfDayCount = 0;
    let leaveCount = 0;
    let holidayCount = 0;
    let totalHours = 0;

    records.forEach((r) => {
      if (r.status === ATTENDANCE_STATUS.PRESENT) presentCount++;
      else if (r.status === ATTENDANCE_STATUS.ABSENT) absentCount++;
      else if (r.status === ATTENDANCE_STATUS.HALF_DAY) halfDayCount++;
      else if (r.status === ATTENDANCE_STATUS.ON_LEAVE) leaveCount++;
      else if (r.status === ATTENDANCE_STATUS.HOLIDAY) holidayCount++;
      totalHours += parseFloat(r.working_hours || 0);
    });

    return res.status(200).json({
      success: true,
      month: monthStr,
      summary: {
        totalDays: daysInMonth,
        recordedDays: records.length,
        present: presentCount,
        absent: absentCount,
        halfDay: halfDayCount,
        onLeave: leaveCount,
        holiday: holidayCount,
        totalHours: parseFloat(totalHours.toFixed(2)),
      },
      data: records,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve monthly attendance: ' + error.message,
    });
  }
}

/**
 * @route   GET /api/attendance
 * @desc    Admin view of company attendance for a specific date
 * @access  Protected (ADMIN, MANAGER)
 */
async function getAllAttendance(req, res) {
  try {
    const targetDate = req.query.date || getTodayString();
    const { department_id, branch_id, status } = req.query;

    const employeeWhere = { status: 'ACTIVE' };
    if (department_id) {
      employeeWhere.department_id = department_id;
    }

    if (branch_id) {
      employeeWhere.branch_id = Number(branch_id);
    }


    const employees = await Employee.findAll({
      where: employeeWhere,
      include: [
        { model: Department, as: 'department', attributes: ['id', 'department_name'] },
        { model: Branch, as: 'branch', attributes: ['id', 'branch_code', 'branch_name', 'city'] },
        {
          model: Attendance,
          as: 'attendances',
          where: { date: targetDate },
          required: false,
        },
      ],
      order: [['first_name', 'ASC']],
    });

    // Format list
    let formatted = employees.map((emp) => {
      const att = emp.attendances && emp.attendances[0];
      const liveHours = getLiveWorkingHours(att);
      return {
        id: att?.id || null,
        attendance_id: att?.id || null,
        employee_id: emp.id,
        employee_code: emp.employee_code,
        name: `${emp.first_name} ${emp.last_name}`,
        email: emp.email,
        designation: emp.designation,
        department: emp.department?.department_name || 'Unassigned',
        branch: emp.branch?.branch_name || 'Headquarters',
        branch_id: emp.branch_id,
        branch_code: emp.branch?.branch_code || 'HQ',
        date: targetDate,
        check_in: att?.check_in || null,
        check_out: att?.check_out || null,
        working_hours: liveHours,
        live_working_hours: liveHours,
        target_hours: 6.0,
        status: att?.status || ATTENDANCE_STATUS.ABSENT,
        current_work_status: att ? (att.current_work_status || (att.check_out ? 'CHECKED_OUT' : att.check_in ? (att.is_on_break ? 'ON_BREAK' : 'CHECKED_IN') : 'NOT_CHECKED_IN')) : 'NOT_CHECKED_IN',
        is_on_break: att?.is_on_break || false,
        break_start: att?.break_start || null,
        break_end: att?.break_end || null,
        total_break_minutes: att?.total_break_minutes || 0,
        notes: att?.notes || null,
        is_manual_override: att?.is_manual_override || false,
        is_late: att?.is_late || false,
      };
    });

    if (status) {
      formatted = formatted.filter((item) => item.status === status);
    }

    return res.status(200).json({
      success: true,
      date: targetDate,
      count: formatted.length,
      data: formatted,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve attendance roster: ' + error.message,
    });
  }
}

/**
 * @route   POST /api/attendance/override
 * @desc    Admin / HR manually marks or overrides attendance
 * @access  Protected (ADMIN, HR, MANAGER)
 */
async function overrideAttendance(req, res) {
  try {
    const { employee_id, date, status, check_in, check_out, working_hours, notes, is_late } = req.body;

    if (!employee_id || !date || !status) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID, date, and status are required.',
      });
    }

    let attendance = await Attendance.findOne({
      where: { employee_id, date },
    });

    const updaterRole = req.user?.role || 'Admin';
    const defaultNote = `Manually updated by ${updaterRole}`;

    const payload = {
      employee_id,
      date,
      status,
      check_in: check_in ? new Date(check_in) : attendance?.check_in || null,
      check_out: check_out ? new Date(check_out) : attendance?.check_out || null,
      working_hours: working_hours !== undefined ? Number(working_hours) : attendance?.working_hours || 0,
      notes: notes || attendance?.notes || defaultNote,
      is_manual_override: true,
      is_late: is_late !== undefined ? Boolean(is_late) : attendance?.is_late || false,
    };

    if (attendance) {
      await attendance.update(payload);
    } else {
      attendance = await Attendance.create(payload);
    }

    return res.status(200).json({
      success: true,
      message: 'Attendance successfully overridden.',
      data: attendance,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to override attendance: ' + error.message,
    });
  }
}

module.exports = {
  checkIn,
  checkOut,
  startBreak,
  endBreak,
  getTodayAttendance,
  getMonthlyAttendance,
  getAllAttendance,
  overrideAttendance,
};
