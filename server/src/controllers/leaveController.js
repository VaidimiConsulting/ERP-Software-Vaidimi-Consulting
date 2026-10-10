const { Op } = require('sequelize');
const { LeaveRequest, LeaveBalance, LeaveType, Employee, Attendance, User } = require('../models');
const { LEAVE_STATUS, LEAVE_TYPES, ATTENDANCE_STATUS, ROLES } = require('../config/constants');
const { notifyAdmins, notifyEmployee } = require('../utils/notify');

/**
 * Default annual allowances
 */
const DEFAULT_QUOTAS = {
  [LEAVE_TYPES.PAID_LEAVE]: 14, // 14 Paid Leaves per annum for all staff
  [LEAVE_TYPES.SICK_LEAVE]: 24, // 2 days per month (24 days / year limit)
  [LEAVE_TYPES.CASUAL_LEAVE]: 7,
  [LEAVE_TYPES.FESTIVAL_LEAVE]: 5, // As per festival holidays
  [LEAVE_TYPES.MENSTRUAL_LEAVE]: 12, // 12 leaves per annum for female staff
  [LEAVE_TYPES.UNPAID_LEAVE]: 999,
};

/**
 * Calculate days between two dates inclusive
 */
function calculateDays(startDateStr, endDateStr, isHalfDay = false) {
  const isHalf = isHalfDay === true || isHalfDay === 'true' || isHalfDay === 1 || isHalfDay === '1';
  if (isHalf) return 0.5;
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
}

/**
 * Ensure leave balance records exist for employee for current year
 */
async function ensureLeaveBalances(employeeId, year = new Date().getFullYear()) {
  const emp = await Employee.findByPk(employeeId);
  const isFemale = emp && emp.gender && emp.gender.toUpperCase() === 'FEMALE';

  for (const [type, days] of Object.entries(DEFAULT_QUOTAS)) {
    // Menstrual leave is strictly for female employees
    if (type === LEAVE_TYPES.MENSTRUAL_LEAVE && !isFemale) {
      continue;
    }

    const existing = await LeaveBalance.findOne({
      where: { employee_id: employeeId, leave_type: type, year },
    });
    if (!existing) {
      await LeaveBalance.create({
        employee_id: employeeId,
        leave_type: type,
        year,
        total_days: days,
        used_days: 0,
        pending_days: 0,
        remaining_days: days,
      });
    }
  }
}

/**
 * Apply privacy filter to a leave request object
 */
function maskLeavePrivacy(leave, viewingUser, viewingEmployeeId) {
  const plain = leave.toJSON ? leave.toJSON() : { ...leave };
  const isAdminOrManager = viewingUser.role === ROLES.ADMIN || viewingUser.role === ROLES.HR || viewingUser.role === ROLES.MANAGER;
  const isOwner = viewingEmployeeId && String(plain.employee_id) === String(viewingEmployeeId);

  // If viewing user is neither admin/manager nor the applicant
  if (!isAdminOrManager && !isOwner) {
    if (plain.leave_type === LEAVE_TYPES.MENSTRUAL_LEAVE) {
      plain.leave_type = 'PERSONAL_LEAVE';
      plain.reason = '[Confidential - Private Leave]';
      plain.admin_remarks = null;
      plain.is_masked = true;
    }
  }
  return plain;
}

/**
 * @route   GET /api/leaves/balances
 * @desc    Get leave balance quotas for an employee
 * @access  Protected
 */
async function getLeaveBalances(req, res) {
  try {
    const isAdminOrManager = req.user.role === ROLES.ADMIN || req.user.role === ROLES.HR || req.user.role === ROLES.MANAGER;
    let targetEmployeeId = req.params.employee_id || req.query.employee_id;

    if (!isAdminOrManager || !targetEmployeeId) {
      targetEmployeeId = req.employee?.id;
    }

    if (!targetEmployeeId) {
      return res.status(400).json({ success: false, message: 'Employee profile required.' });
    }

    const year = parseInt(req.query.year) || new Date().getFullYear();
    await ensureLeaveBalances(targetEmployeeId, year);

    let balances = await LeaveBalance.findAll({
      where: { employee_id: targetEmployeeId, year },
    });

    const targetEmp = await Employee.findByPk(targetEmployeeId);
    const isFemale = targetEmp && targetEmp.gender && targetEmp.gender.toUpperCase() === 'FEMALE';

    // Non-female employees do not receive menstrual leave
    if (!isFemale) {
      balances = balances.filter((b) => b.leave_type !== LEAVE_TYPES.MENSTRUAL_LEAVE);
    }

    // If viewing employee is checking another employee's balance
    const isOwner = req.employee && String(req.employee.id) === String(targetEmployeeId);
    if (!isAdminOrManager && !isOwner) {
      // Scrub menstrual leave from balance view
      balances = balances.filter((b) => b.leave_type !== LEAVE_TYPES.MENSTRUAL_LEAVE);
    }

    return res.status(200).json({
      success: true,
      year,
      employee_id: targetEmployeeId,
      is_female: isFemale,
      data: balances,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve leave balances: ' + error.message,
    });
  }
}

/**
 * @route   POST /api/leaves
 * @desc    Employee applies for leave
 * @access  Protected
 */
async function applyLeave(req, res) {
  try {
    const employeeId = req.employee?.id;
    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'No employee profile linked to current user account.',
      });
    }

    const { leave_type, start_date, end_date, is_half_day = false, reason } = req.body;

    if (!leave_type || !start_date || !end_date || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Leave type, start date, end date, and reason are required.',
      });
    }

    // 1. Date logic validation
    if (new Date(start_date) > new Date(end_date)) {
      return res.status(400).json({
        success: false,
        message: 'Start date cannot be after end date.',
      });
    }

    // 1b. Menstrual Leave Eligibility (Exclusively for female employees)
    if (leave_type === LEAVE_TYPES.MENSTRUAL_LEAVE) {
      const applicantEmp = await Employee.findByPk(employeeId);
      const isFemale = applicantEmp && applicantEmp.gender && applicantEmp.gender.toUpperCase() === 'FEMALE';
      if (!isFemale) {
        return res.status(403).json({
          success: false,
          message: 'Menstrual leave is a welfare policy exclusively available for female employees.',
        });
      }
    }

    // 1c. Sick Leave monthly cap check (Max 2 days per calendar month)
    if (leave_type === LEAVE_TYPES.SICK_LEAVE) {
      const reqMonth = start_date.slice(0, 7); // 'YYYY-MM'
      const monthlySick = await LeaveRequest.findAll({
        where: {
          employee_id: employeeId,
          leave_type: LEAVE_TYPES.SICK_LEAVE,
          status: { [Op.in]: [LEAVE_STATUS.PENDING, LEAVE_STATUS.APPROVED] },
          start_date: { [Op.like]: `${reqMonth}%` },
        },
      });
      const daysUsedThisMonth = monthlySick.reduce((acc, l) => acc + Number(l.total_days || 0), 0);
      const reqDays = calculateDays(start_date, end_date, is_half_day);
      if (daysUsedThisMonth + reqDays > 2) {
        return res.status(400).json({
          success: false,
          message: `Sick leave policy allows a maximum of 2 days per month. You have already applied for ${daysUsedThisMonth} day(s) this month (${reqMonth}).`,
        });
      }
    }

    // 2. Overlapping leave validation
    const overlapping = await LeaveRequest.findOne({
      where: {
        employee_id: employeeId,
        status: { [Op.in]: [LEAVE_STATUS.PENDING, LEAVE_STATUS.APPROVED] },
        [Op.and]: [
          { start_date: { [Op.lte]: end_date } },
          { end_date: { [Op.gte]: start_date } },
        ],
      },
    });

    if (overlapping) {
      return res.status(400).json({
        success: false,
        message: `You already have an active leave request (${overlapping.status}) covering this period (${overlapping.start_date} to ${overlapping.end_date}).`,
      });
    }

    // 3. Days calculation
    const total_days = calculateDays(start_date, end_date, is_half_day);

    // 4. Balance check (for quota-based leaves)
    const year = new Date(start_date).getFullYear();
    await ensureLeaveBalances(employeeId, year);

    if (leave_type !== LEAVE_TYPES.UNPAID_LEAVE) {
      const balance = await LeaveBalance.findOne({
        where: { employee_id: employeeId, leave_type, year },
      });

      if (!balance || balance.remaining_days < total_days) {
        return res.status(400).json({
          success: false,
          message: `Insufficient leave balance for ${leave_type}. Available: ${balance?.remaining_days || 0} days, Requested: ${total_days} days.`,
        });
      }
    }

    // 5. Create leave request
    const newRequest = await LeaveRequest.create({
      employee_id: employeeId,
      leave_type,
      start_date,
      end_date,
      total_days,
      is_half_day: Boolean(is_half_day === true || is_half_day === 'true'),
      reason: reason.trim(),
      status: LEAVE_STATUS.PENDING,
    });

    // 6. Notify Admins
    const applicant = await Employee.findByPk(employeeId);
    const applicantName = applicant ? `${applicant.first_name} ${applicant.last_name}` : 'An employee';
    await notifyAdmins({
      title: 'New Leave Request',
      message: `${applicantName} has applied for ${total_days} day(s) of ${leave_type}.`,
      type: 'LEAVE_REQUEST',
      link: '/admin/leaves',
    });

    return res.status(201).json({
      success: true,
      message: 'Leave request submitted successfully.',
      data: newRequest,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to apply for leave: ' + error.message,
    });
  }
}

/**
 * @route   GET /api/leaves/my
 * @desc    Get current employee's personal leave requests
 * @access  Protected
 */
async function getMyLeaves(req, res) {
  try {
    const employeeId = req.employee?.id;
    if (!employeeId) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }

    const leaves = await LeaveRequest.findAll({
      where: { employee_id: employeeId },
      include: [
        { model: Employee, as: 'reviewer', attributes: ['first_name', 'last_name', 'email'] },
      ],
      order: [['created_at', 'DESC']],
    });

    return res.status(200).json({
      success: true,
      count: leaves.length,
      data: leaves,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch personal leave history: ' + error.message,
    });
  }
}

/**
 * @route   GET /api/leaves
 * @desc    Admin view of all leave requests (or team calendar list with privacy masking)
 * @access  Protected
 */
async function getAllLeaves(req, res) {
  try {
    const { status, leave_type, employee_id, year } = req.query;
    const isAdminOrManager = req.user.role === ROLES.ADMIN || req.user.role === ROLES.HR || req.user.role === ROLES.MANAGER;
    const viewingEmployeeId = req.employee?.id;

    const where = {};
    if (status) where.status = status;
    if (leave_type) where.leave_type = leave_type;
    if (employee_id) where.employee_id = employee_id;

    if (year) {
      where.start_date = {
        [Op.between]: [`${year}-01-01`, `${year}-12-31`],
      };
    }

    // Normal employees can only view their own requests if using this general endpoint
    if (!isAdminOrManager) {
      where.employee_id = viewingEmployeeId;
    }

    const leaves = await LeaveRequest.findAll({
      where,
      include: [
        {
          model: Employee,
          as: 'employee',
          attributes: ['id', 'employee_code', 'first_name', 'last_name', 'email', 'designation'],
        },
        {
          model: Employee,
          as: 'reviewer',
          attributes: ['id', 'first_name', 'last_name', 'email'],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    // Enforce Menstrual Leave Privacy Filter
    const sanitized = leaves.map((l) => maskLeavePrivacy(l, req.user, viewingEmployeeId));

    return res.status(200).json({
      success: true,
      count: sanitized.length,
      data: sanitized,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve leaves: ' + error.message,
    });
  }
}

/**
 * @route   PUT /api/leaves/:id/status
 * @desc    Admin approves or rejects leave
 * @access  Protected (ADMIN, MANAGER)
 */
async function updateLeaveStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, admin_remarks } = req.body;

    if (![LEAVE_STATUS.APPROVED, LEAVE_STATUS.REJECTED, 'CANCELLED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be 'APPROVED', 'REJECTED', or 'CANCELLED'.",
      });
    }

    const leave = await LeaveRequest.findByPk(id, {
      include: [{ model: Employee, as: 'employee' }],
    });

    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave request not found.' });
    }

    const previousStatus = leave.status;
    const reviewerId = req.employee?.id || null;
    leave.status = status;
    leave.reviewed_by = reviewerId;
    leave.reviewed_at = new Date();
    if (admin_remarks) leave.admin_remarks = admin_remarks;
    await leave.save();

    // If APPROVED: deduct balance & auto-generate attendance records
    if (status === LEAVE_STATUS.APPROVED && previousStatus !== LEAVE_STATUS.APPROVED) {
      const year = new Date(leave.start_date).getFullYear();
      await ensureLeaveBalances(leave.employee_id, year);

      if (leave.leave_type !== LEAVE_TYPES.UNPAID_LEAVE) {
        const balance = await LeaveBalance.findOne({
          where: { employee_id: leave.employee_id, leave_type: leave.leave_type, year },
        });
        if (balance) {
          const used = parseFloat(balance.used_days) + parseFloat(leave.total_days);
          const remaining = Math.max(0, parseFloat(balance.total_days) - used);
          balance.used_days = used;
          balance.remaining_days = remaining;
          await balance.save();
        }
      }

      // Populate Attendance records for the leave dates
      const start = new Date(leave.start_date);
      const end = new Date(leave.end_date);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const [attRecord, created] = await Attendance.findOrCreate({
          where: { employee_id: leave.employee_id, date: dateStr },
          defaults: {
            status: ATTENDANCE_STATUS.ON_LEAVE,
            notes: `Approved Leave (${leave.leave_type})`,
            is_manual_override: true,
          },
        });
        if (!created && attRecord.status !== ATTENDANCE_STATUS.PRESENT) {
          attRecord.status = ATTENDANCE_STATUS.ON_LEAVE;
          attRecord.notes = `Approved Leave (${leave.leave_type})`;
          await attRecord.save();
        }
      }
    } else if (status === 'CANCELLED' && previousStatus === LEAVE_STATUS.APPROVED) {
      // Restore balance if previously approved
      const year = new Date(leave.start_date).getFullYear();
      if (leave.leave_type !== LEAVE_TYPES.UNPAID_LEAVE) {
        const balance = await LeaveBalance.findOne({
          where: { employee_id: leave.employee_id, leave_type: leave.leave_type, year },
        });
        if (balance) {
          const used = Math.max(0, parseFloat(balance.used_days) - parseFloat(leave.total_days));
          const remaining = Math.min(parseFloat(balance.total_days), parseFloat(balance.remaining_days) + parseFloat(leave.total_days));
          balance.used_days = used;
          balance.remaining_days = remaining;
          await balance.save();
        }
      }
    }

    // Notify applicant
    await notifyEmployee({
      employeeId: leave.employee_id,
      title: `Leave Request ${status}`,
      message: `Your leave request for ${leave.total_days} day(s) (${leave.leave_type}) has been ${status.toLowerCase()}.${
        admin_remarks ? ` Remarks: ${admin_remarks}` : ''
      }`,
      type: 'LEAVE_STATUS',
      link: '/employee/leaves',
    });

    return res.status(200).json({
      success: true,
      message: `Leave request has been ${status.toLowerCase()}.`,
      data: leave,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update leave status: ' + error.message,
    });
  }
}

/**
 * @route   POST /api/leaves/schedule
 * @desc    Manager/Admin directly schedules and approves leave for an employee
 * @access  Protected (ADMIN, MANAGER)
 */
async function scheduleEmployeeLeave(req, res) {
  try {
    const { employee_id, leave_type, start_date, end_date, is_half_day = false, reason } = req.body;

    if (!employee_id || !leave_type || !start_date || !end_date || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID, leave type, start date, end date, and reason/remarks are required.',
      });
    }

    const employee = await Employee.findByPk(employee_id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Selected employee not found.' });
    }

    // 1. Date logic validation
    if (new Date(start_date) > new Date(end_date)) {
      return res.status(400).json({
        success: false,
        message: 'Start date cannot be after end date.',
      });
    }

    // 2. Overlapping leave validation
    const overlapping = await LeaveRequest.findOne({
      where: {
        employee_id,
        status: { [Op.in]: [LEAVE_STATUS.PENDING, LEAVE_STATUS.APPROVED] },
        [Op.and]: [
          { start_date: { [Op.lte]: end_date } },
          { end_date: { [Op.gte]: start_date } },
        ],
      },
    });

    if (overlapping) {
      return res.status(400).json({
        success: false,
        message: `Employee already has an active leave (${overlapping.status}) covering this period (${overlapping.start_date} to ${overlapping.end_date}).`,
      });
    }

    // 3. Days calculation
    const total_days = calculateDays(start_date, end_date, is_half_day);

    // 4. Ensure & update balances
    const year = new Date(start_date).getFullYear();
    await ensureLeaveBalances(employee_id, year);

    if (leave_type !== LEAVE_TYPES.UNPAID_LEAVE) {
      const balance = await LeaveBalance.findOne({
        where: { employee_id, leave_type, year },
      });
      if (balance) {
        const used = parseFloat(balance.used_days) + parseFloat(total_days);
        const remaining = Math.max(0, parseFloat(balance.total_days) - used);
        balance.used_days = used;
        balance.remaining_days = remaining;
        await balance.save();
      }
    }

    const reviewerId = req.employee?.id || null;

    // 5. Create Approved leave request
    const newLeave = await LeaveRequest.create({
      employee_id,
      leave_type,
      start_date,
      end_date,
      total_days,
      is_half_day,
      reason: reason.trim(),
      status: LEAVE_STATUS.APPROVED,
      reviewed_by: reviewerId,
      reviewed_at: new Date(),
      admin_remarks: 'Directly scheduled and approved by Manager / Admin',
    });

    // 6. Populate Attendance records as ON_LEAVE
    const start = new Date(start_date);
    const end = new Date(end_date);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const [attRecord, created] = await Attendance.findOrCreate({
        where: { employee_id, date: dateStr },
        defaults: {
          status: ATTENDANCE_STATUS.ON_LEAVE,
          notes: `Scheduled Leave (${leave_type})`,
          is_manual_override: true,
        },
      });
      if (!created && attRecord.status !== ATTENDANCE_STATUS.PRESENT) {
        attRecord.status = ATTENDANCE_STATUS.ON_LEAVE;
        attRecord.notes = `Scheduled Leave (${leave_type})`;
        await attRecord.save();
      }
    }

    // 7. Notify employee
    await notifyEmployee({
      employeeId: employee_id,
      title: 'Leave Scheduled by Manager',
      message: `A leave has been scheduled for you from ${start_date} to ${end_date} (${total_days} day(s) - ${leave_type}).`,
      type: 'LEAVE_STATUS',
      link: '/employee/leaves',
    });

    const fullLeave = await LeaveRequest.findByPk(newLeave.id, {
      include: [
        { model: Employee, as: 'employee', attributes: ['id', 'employee_code', 'first_name', 'last_name', 'email'] },
        { model: Employee, as: 'reviewer', attributes: ['id', 'first_name', 'last_name'] },
      ],
    });

    return res.status(201).json({
      success: true,
      message: `Leave successfully scheduled and approved for ${employee.first_name} ${employee.last_name}.`,
      data: fullLeave,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to schedule leave: ' + error.message,
    });
  }
}

/**
 * @route   GET /api/leaves/policies
 * @desc    Get leave policies and default allowances
 * @access  Protected
 */
async function getLeavePolicies(req, res) {
  try {
    let policies = await LeaveType.findAll({ order: [['id', 'ASC']] });
    if (policies.length === 0) {
      // Seed default types
      const initialTypes = [
        { code: LEAVE_TYPES.PAID_LEAVE, name: 'Paid Leave', default_days: 12, is_paid: true, is_sensitive: false },
        { code: LEAVE_TYPES.SICK_LEAVE, name: 'Sick Leave', default_days: 6, is_paid: true, is_sensitive: false },
        { code: LEAVE_TYPES.CASUAL_LEAVE, name: 'Casual Leave', default_days: 6, is_paid: true, is_sensitive: false },
        { code: LEAVE_TYPES.FESTIVAL_LEAVE, name: 'Festival Leave', default_days: 3, is_paid: true, is_sensitive: false },
        { code: LEAVE_TYPES.MENSTRUAL_LEAVE, name: 'Menstrual Leave', default_days: 12, is_paid: true, is_sensitive: true, description: 'Confidential privacy protected leave' },
        { code: LEAVE_TYPES.UNPAID_LEAVE, name: 'Unpaid Leave', default_days: 0, is_paid: false, is_sensitive: false },
      ];
      policies = await LeaveType.bulkCreate(initialTypes);
    }

    return res.status(200).json({
      success: true,
      data: policies,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve leave policies: ' + error.message,
    });
  }
}

/**
 * @route   POST /api/leaves/balances/adjust
 * @desc    Admin adjusts an employee's leave balance (increase/decrease total/remaining days)
 * @access  Protected (ADMIN, MANAGER)
 */
async function adjustEmployeeLeaveBalance(req, res) {
  try {
    const { employee_id, leave_type, days_delta, reason, year = new Date().getFullYear() } = req.body;

    if (!employee_id || !leave_type || days_delta === undefined || days_delta === null) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID, leave type, and days delta (number of days to add/subtract) are required.',
      });
    }

    const delta = parseFloat(days_delta);
    if (isNaN(delta) || delta === 0) {
      return res.status(400).json({
        success: false,
        message: 'Days delta must be a non-zero number (e.g. +3 to add 3 days or -2 to deduct 2 days).',
      });
    }

    await ensureLeaveBalances(employee_id, year);

    let balance = await LeaveBalance.findOne({
      where: { employee_id, leave_type, year },
    });

    if (!balance) {
      return res.status(404).json({ success: false, message: 'Leave balance record not found.' });
    }

    const prevTotal = parseFloat(balance.total_days);
    const prevRemaining = parseFloat(balance.remaining_days);

    const newTotal = Math.max(0, prevTotal + delta);
    const newRemaining = Math.max(0, prevRemaining + delta);

    balance.total_days = newTotal;
    balance.remaining_days = newRemaining;
    await balance.save();

    // Notify employee of quota adjustment
    const changeText = delta > 0 ? `+${delta}` : `${delta}`;
    await notifyEmployee({
      employeeId: employee_id,
      title: 'Leave Quota Adjusted',
      message: `Your annual ${leave_type} quota has been adjusted by ${changeText} day(s). New balance: ${newRemaining} days remaining.${
        reason ? ` Reason: ${reason}` : ''
      }`,
      type: 'LEAVE_STATUS',
      link: '/employee/leaves',
    });

    return res.status(200).json({
      success: true,
      message: `Leave balance updated successfully (${changeText} days).`,
      data: balance,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to adjust leave balance: ' + error.message,
    });
  }
}

/**
 * @route   POST /api/leaves/policies
 * @desc    Create a new company leave policy
 * @access  Protected (ADMIN)
 */
async function createLeavePolicy(req, res) {
  try {
    const { code, name, default_days = 0, is_paid = true, is_sensitive = false, description } = req.body;

    if (!code || !name) {
      return res.status(400).json({ success: false, message: 'Policy code and name are required.' });
    }

    const cleanCode = code.trim().toUpperCase().replace(/[\s\-]/g, '_');
    const existing = await LeaveType.findOne({ where: { code: cleanCode } });
    if (existing) {
      return res.status(400).json({ success: false, message: `A leave policy with code '${cleanCode}' already exists.` });
    }

    const policy = await LeaveType.create({
      code: cleanCode,
      name: name.trim(),
      default_days: parseInt(default_days) || 0,
      is_paid: Boolean(is_paid),
      is_sensitive: Boolean(is_sensitive),
      description: description ? description.trim() : null,
    });

    return res.status(201).json({
      success: true,
      message: 'Leave policy created successfully.',
      data: policy,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create leave policy: ' + error.message,
    });
  }
}

/**
 * @route   PUT /api/leaves/policies/:id
 * @desc    Update an existing leave policy
 * @access  Protected (ADMIN)
 */
async function updateLeavePolicy(req, res) {
  try {
    const { id } = req.params;
    const { name, default_days, is_paid, is_sensitive, description } = req.body;

    const policy = await LeaveType.findByPk(id);
    if (!policy) {
      return res.status(404).json({ success: false, message: 'Leave policy not found.' });
    }

    await policy.update({
      name: name !== undefined ? name.trim() : policy.name,
      default_days: default_days !== undefined ? parseInt(default_days) : policy.default_days,
      is_paid: is_paid !== undefined ? Boolean(is_paid) : policy.is_paid,
      is_sensitive: is_sensitive !== undefined ? Boolean(is_sensitive) : policy.is_sensitive,
      description: description !== undefined ? description : policy.description,
    });

    return res.status(200).json({
      success: true,
      message: 'Leave policy updated successfully.',
      data: policy,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update leave policy: ' + error.message,
    });
  }
}

/**
 * @route   DELETE /api/leaves/policies/:id
 * @desc    Delete a custom leave policy
 * @access  Protected (ADMIN)
 */
async function deleteLeavePolicy(req, res) {
  try {
    const { id } = req.params;
    const policy = await LeaveType.findByPk(id);
    if (!policy) {
      return res.status(404).json({ success: false, message: 'Leave policy not found.' });
    }

    await policy.destroy();
    return res.status(200).json({
      success: true,
      message: 'Leave policy deleted successfully.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete leave policy: ' + error.message,
    });
  }
}

/**
 * @route   POST /api/leaves/schedule
 * @desc    Admin/HR schedules leave directly for an employee
 * @access  Protected (ADMIN, HR, MANAGER)
 */
async function scheduleEmployeeLeave(req, res) {
  try {
    const { employee_id, leave_type, start_date, end_date, is_half_day = false, reason } = req.body;

    if (!employee_id || !leave_type || !start_date || !end_date || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID, leave type, start date, end date, and reason are required.',
      });
    }

    if (new Date(start_date) > new Date(end_date)) {
      return res.status(400).json({
        success: false,
        message: 'Start date cannot be after end date.',
      });
    }

    const emp = await Employee.findByPk(employee_id);
    if (!emp) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    // Female validation for Menstrual Leave
    if (leave_type === LEAVE_TYPES.MENSTRUAL_LEAVE) {
      const isFemale = emp.gender && emp.gender.toUpperCase() === 'FEMALE';
      if (!isFemale) {
        return res.status(400).json({
          success: false,
          message: 'Menstrual leave can only be scheduled for female employees.',
        });
      }
    }

    const total_days = calculateDays(start_date, end_date, is_half_day);

    const newRequest = await LeaveRequest.create({
      employee_id,
      leave_type,
      start_date,
      end_date,
      total_days,
      is_half_day,
      reason: reason.trim(),
      status: LEAVE_STATUS.APPROVED,
      reviewed_by: req.employee?.id || null,
      admin_remarks: `Scheduled directly by Management (${req.user?.role || 'Admin'})`,
    });

    return res.status(201).json({
      success: true,
      message: `Leave successfully scheduled for ${emp.first_name} ${emp.last_name}.`,
      data: newRequest,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to schedule leave: ' + error.message,
    });
  }
}

/**
 * @route   GET /api/leaves/summary-report
 * @desc    Comprehensive breakdown of all employee leaves (Paid, Unpaid, Sick, Casual, Festival, Menstrual) & Holidays
 * @access  Protected (ADMIN, HR, MANAGER)
 */
async function getLeaveSummaryReport(req, res) {
  try {
    const { year = new Date().getFullYear(), department_id } = req.query;

    const empWhere = { status: 'ACTIVE' };
    if (department_id) empWhere.department_id = department_id;

    const employees = await Employee.findAll({
      where: empWhere,
      include: [
        {
          model: LeaveRequest,
          as: 'leaveRequests',
          where: {
            start_date: {
              [Op.between]: [`${year}-01-01`, `${year}-12-31`],
            },
          },
          required: false,
        },
      ],
      order: [['first_name', 'ASC']],
    });

    const summaryData = employees.map((emp) => {
      const allRequests = emp.leaveRequests || [];
      const approved = allRequests.filter((l) => l.status === LEAVE_STATUS.APPROVED);

      let paidLeaves = 0;
      let unpaidLeaves = 0;
      let sickLeaves = 0;
      let casualLeaves = 0;
      let festivalLeaves = 0;
      let menstrualLeaves = 0;

      for (const l of approved) {
        const days = Number(l.total_days) || 1;
        const type = String(l.leave_type).toUpperCase();
        if (type.includes('UNPAID')) {
          unpaidLeaves += days;
        } else {
          paidLeaves += days;
          if (type.includes('SICK')) sickLeaves += days;
          else if (type.includes('CASUAL')) casualLeaves += days;
          else if (type.includes('FESTIVAL')) festivalLeaves += days;
          else if (type.includes('MENSTRUAL')) menstrualLeaves += days;
        }
      }

      return {
        id: emp.id,
        employee_code: emp.employee_code,
        name: `${emp.first_name} ${emp.last_name}`,
        email: emp.email,
        phone: emp.phone,
        designation: emp.designation,
        gender: emp.gender,
        year: parseInt(year),
        total_leaves_taken: paidLeaves + unpaidLeaves,
        paid_leaves: paidLeaves,
        unpaid_leaves: unpaidLeaves,
        sick_leaves: sickLeaves,
        casual_leaves: casualLeaves,
        festival_leaves: festivalLeaves,
        menstrual_leaves: menstrualLeaves,
        total_requests: allRequests.length,
        approved_count: approved.length,
        pending_count: allRequests.filter((l) => l.status === LEAVE_STATUS.PENDING).length,
        rejected_count: allRequests.filter((l) => l.status === LEAVE_STATUS.REJECTED).length,
      };
    });

    return res.status(200).json({
      success: true,
      year: parseInt(year),
      count: summaryData.length,
      data: summaryData,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to generate leave summary report: ' + error.message,
    });
  }
}

module.exports = {
  getLeaveBalances,
  applyLeave,
  getMyLeaves,
  getAllLeaves,
  updateLeaveStatus,
  scheduleEmployeeLeave,
  adjustEmployeeLeaveBalance,
  getLeavePolicies,
  createLeavePolicy,
  updateLeavePolicy,
  deleteLeavePolicy,
  maskLeavePrivacy,
  getLeaveSummaryReport,
};
