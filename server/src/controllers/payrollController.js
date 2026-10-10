const { Op } = require('sequelize');
const {
  Payroll,
  Employee,
  User,
  Department,
  Attendance,
  LeaveRequest,
  Holiday,
} = require('../models');
const { ROLES, ATTENDANCE_STATUS, LEAVE_STATUS } = require('../config/constants');
const { notifyEmployee } = require('../utils/notify');

function parseDateOrNull(val) {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  if (s === '' || s === 'null' || s === 'undefined' || s === 'Invalid date') return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return s.split('T')[0];
}

/**
 * Calculate month details: total days, Sundays, and 2nd/4th Saturdays
 */
function getMonthCalendarRules(year, month) {
  const totalDays = new Date(year, month, 0).getDate();
  let sundaysCount = 0;
  let saturdayCount = 0;
  let secondAndFourthSaturdays = 0;
  const sundayDates = [];
  const halfSaturdayDates = [];

  for (let day = 1; day <= totalDays; day++) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay(); // 0 is Sunday, 6 is Saturday

    if (dayOfWeek === 0) {
      sundaysCount++;
      sundayDates.push(day);
    } else if (dayOfWeek === 6) {
      saturdayCount++;
      if (saturdayCount === 2 || saturdayCount === 4) {
        secondAndFourthSaturdays++;
        halfSaturdayDates.push(day);
      }
    }
  }

  return {
    totalDays,
    sundaysCount,
    secondAndFourthSaturdays,
    sundayDates,
    halfSaturdayDates,
  };
}

/**
 * @route   POST /api/payroll/generate
 * @desc    Generate or recalculate payroll for a given month
 * @access  Protected (ADMIN, HR)
 */
async function generateMonthlyPayroll(req, res) {
  try {
    const { month, employee_id } = req.body;

    // Validate month format (YYYY-MM)
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    const [yearStr, monthStr] = targetMonth.split('-');
    const year = parseInt(yearStr, 10);
    const monthNum = parseInt(monthStr, 10);

    if (isNaN(year) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({
        success: false,
        message: 'Invalid month format. Please use YYYY-MM (e.g. 2026-09).',
      });
    }

    const { totalDays, sundaysCount, secondAndFourthSaturdays } = getMonthCalendarRules(year, monthNum);

    // Date bounds for database queries
    const startDate = `${targetMonth}-01`;
    const endDate = `${targetMonth}-${String(totalDays).padStart(2, '0')}`;

    // Query active employees (or single employee if employee_id provided)
    const empWhere = { status: 'ACTIVE' };
    if (employee_id) {
      empWhere.id = employee_id;
    }

    const employees = await Employee.findAll({
      where: empWhere,
      include: [
        { model: Department, as: 'department' },
        { model: User, as: 'user', attributes: ['id', 'email', 'role'] },
      ],
    });

    if (!employees || employees.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No active employees found to generate payroll.',
      });
    }

    // Fetch official holidays in this month that are not on Sundays
    const holidays = await Holiday.findAll({
      where: {
        date: {
          [Op.between]: [startDate, endDate],
        },
      },
    });

    // Count weekdays holidays (do not double count if holiday is already Sunday)
    let weekdayHolidaysCount = 0;
    for (const h of holidays) {
      const hDate = new Date(h.date);
      if (hDate.getDay() !== 0) {
        weekdayHolidaysCount++;
      }
    }

    const generatedRecords = [];

    for (const emp of employees) {
      // 1. Fetch attendance records in this month
      const attendances = await Attendance.findAll({
        where: {
          employee_id: emp.id,
          date: {
            [Op.between]: [startDate, endDate],
          },
        },
      });

      let presentDays = 0;
      let halfDays = 0;

      for (const att of attendances) {
        if (att.status === ATTENDANCE_STATUS.PRESENT) {
          presentDays += 1;
        } else if (att.status === ATTENDANCE_STATUS.HALF_DAY) {
          halfDays += 1;
        }
      }

      // 2. Fetch approved leave requests in this month
      const leaves = await LeaveRequest.findAll({
        where: {
          employee_id: emp.id,
          status: LEAVE_STATUS.APPROVED,
          [Op.or]: [
            {
              start_date: { [Op.between]: [startDate, endDate] },
            },
            {
              end_date: { [Op.between]: [startDate, endDate] },
            },
          ],
        },
      });

      let paidLeaves = 0;
      let unpaidLeaves = 0;
      let sickLeaves = 0;
      let casualLeaves = 0;
      let festivalLeaves = 0;
      let menstrualLeaves = 0;

      for (const leave of leaves) {
        const leaveDays = Number(leave.total_days) || 1;
        const type = String(leave.leave_type).toUpperCase();

        // Unpaid leaves don't receive salary credit
        if (type.includes('UNPAID')) {
          unpaidLeaves += leaveDays;
        } else {
          paidLeaves += leaveDays;
          if (type.includes('SICK')) {
            sickLeaves += leaveDays;
          } else if (type.includes('CASUAL')) {
            casualLeaves += leaveDays;
          } else if (type.includes('FESTIVAL')) {
            festivalLeaves += leaveDays;
          } else if (type.includes('MENSTRUAL')) {
            menstrualLeaves += leaveDays;
          }
        }
      }

      // 3. Weekly Sunday off + 2nd & 4th Saturday half-day rule
      // Every Sunday: Guaranteed 1.0 day paid holiday
      // 2nd & 4th Saturday: Official Half-Day (0.5 day credit for each)
      const sundayCredits = sundaysCount * 1.0;
      const saturdayCredits = secondAndFourthSaturdays * 0.5;
      const holidayCredits = weekdayHolidaysCount * 1.0;

      // Payable Days = Present + (Half Days * 0.5) + Approved Paid Leaves + Sundays + 2nd/4th Saturday Half-Day Credits + Official Holidays
      const totalCredited = presentDays + (halfDays * 0.5) + paidLeaves + sundayCredits + saturdayCredits + holidayCredits;
      const payableDays = Math.min(totalDays, Math.max(0, parseFloat(totalCredited.toFixed(1))));
      const absentDays = Math.max(0, parseFloat((totalDays - payableDays).toFixed(1)));

      // 4. Financial Calculations
      const baseSalary = Number(emp.base_salary) || 30000.0;
      const dailyRate = baseSalary / totalDays;
      const deductions = Math.max(0, parseFloat((absentDays * dailyRate).toFixed(2)));
      const grossSalary = baseSalary;
      const netSalary = Math.max(0, parseFloat((grossSalary - deductions).toFixed(2)));

      // 5. Upsert Payroll Record
      let payroll = await Payroll.findOne({
        where: {
          employee_id: emp.id,
          month: targetMonth,
        },
      });

      const payrollData = {
        employee_id: emp.id,
        month: targetMonth,
        base_salary: baseSalary,
        total_days: totalDays,
        payable_days: payableDays,
        present_days: presentDays,
        half_days: halfDays,
        absent_days: absentDays,
        paid_leaves: paidLeaves,
        unpaid_leaves: unpaidLeaves,
        sick_leaves: sickLeaves,
        casual_leaves: casualLeaves,
        festival_leaves: festivalLeaves,
        menstrual_leaves: menstrualLeaves,
        sundays_count: sundaysCount,
        holidays_count: weekdayHolidaysCount,
        gross_salary: grossSalary,
        deductions: deductions,
        net_salary: netSalary,
        notes: `Sundays: ${sundaysCount} paid off, 2nd/4th Sat: ${secondAndFourthSaturdays} half-days, Paid Leaves: ${paidLeaves} (Sick: ${sickLeaves}, Casual: ${casualLeaves}, Menstrual: ${menstrualLeaves}), Unpaid: ${unpaidLeaves}.`,
      };

      if (payroll) {
        // Keep existing payment status if already PAID
        if (payroll.payment_status === 'PAID') {
          payrollData.payment_status = 'PAID';
          payrollData.payment_date = payroll.payment_date;
        }
        await payroll.update(payrollData);
      } else {
        payrollData.payment_status = 'GENERATED';
        payroll = await Payroll.create(payrollData);
      }

      generatedRecords.push(payroll);
    }

    return res.status(200).json({
      success: true,
      message: `Payroll successfully generated for month ${targetMonth} (${generatedRecords.length} employees processed).`,
      meta: {
        month: targetMonth,
        totalDays,
        sundaysCount,
        secondAndFourthSaturdays,
        weekdayHolidaysCount,
      },
      data: generatedRecords,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to generate payroll: ' + error.message,
    });
  }
}

/**
 * @route   GET /api/payroll
 * @desc    Get all payroll records for month with filtering
 * @access  Protected (ADMIN, HR)
 */
async function getPayrollRecords(req, res) {
  try {
    const { month, employee_id, payment_status } = req.query;

    const targetMonth = month || new Date().toISOString().slice(0, 7);
    const where = { month: targetMonth };

    if (employee_id) {
      where.employee_id = employee_id;
    }
    if (payment_status) {
      where.payment_status = payment_status;
    }

    const records = await Payroll.findAll({
      where,
      include: [
        {
          model: Employee,
          as: 'employee',
          include: [
            { model: Department, as: 'department' },
            { model: User, as: 'user', attributes: ['id', 'email', 'role'] },
          ],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    // Summary aggregates
    let totalGross = 0;
    let totalNet = 0;
    let totalDeductions = 0;
    let paidCount = 0;
    let pendingCount = 0;

    for (const r of records) {
      totalGross += Number(r.gross_salary) || 0;
      totalNet += Number(r.net_salary) || 0;
      totalDeductions += Number(r.deductions) || 0;
      if (r.payment_status === 'PAID') paidCount++;
      else pendingCount++;
    }

    const [y, m] = targetMonth.split('-');
    const calendarRules = getMonthCalendarRules(parseInt(y, 10), parseInt(m, 10));

    return res.status(200).json({
      success: true,
      month: targetMonth,
      calendarRules,
      summary: {
        totalRecords: records.length,
        totalGross: totalGross.toFixed(2),
        totalNet: totalNet.toFixed(2),
        totalDeductions: totalDeductions.toFixed(2),
        paidCount,
        pendingCount,
      },
      data: records,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve payroll records: ' + error.message,
    });
  }
}

/**
 * @route   PUT /api/payroll/:id/status
 * @desc    Update payment status (PAID / PENDING)
 * @access  Protected (ADMIN, HR)
 */
async function updatePaymentStatus(req, res) {
  try {
    const { id } = req.params;
    const { payment_status, payment_date, notes } = req.body;

    const payroll = await Payroll.findByPk(id);
    if (!payroll) {
      return res.status(404).json({ success: false, message: 'Payroll record not found.' });
    }

    const updates = {};
    if (payment_status) {
      updates.payment_status = payment_status;
      if (payment_status === 'PAID') {
        updates.payment_date = parseDateOrNull(payment_date) || payroll.payment_date || new Date().toISOString().split('T')[0];
      } else {
        updates.payment_date = null;
      }
    }
    if (notes !== undefined) {
      updates.notes = notes;
    }

    await payroll.update(updates);

    return res.status(200).json({
      success: true,
      message: `Payroll status updated to '${payroll.payment_status}'.`,
      data: payroll,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update payroll status: ' + error.message,
    });
  }
}

/**
 * @route   GET /api/payroll/my
 * @desc    Get logged-in employee's salary and payslip history
 * @access  Protected (Employee, Intern)
 */
async function getMyPayroll(req, res) {
  try {
    if (!req.employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee profile not associated with this account.',
      });
    }

    const records = await Payroll.findAll({
      where: {
        employee_id: req.employee.id,
      },
      include: [
        {
          model: Employee,
          as: 'employee',
          include: [{ model: Department, as: 'department' }],
        },
      ],
      order: [['month', 'DESC']],
    });

    return res.status(200).json({
      success: true,
      data: records,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve salary history: ' + error.message,
    });
  }
}

/**
 * @route   POST /api/payroll
 * @desc    Admin manually creates/adds a custom salary/payroll record
 * @access  Protected (ADMIN)
 */
async function createCustomPayrollRecord(req, res) {
  try {
    const {
      employee_id,
      month,
      base_salary,
      bonus = 0,
      allowances = 0,
      total_days,
      present_days,
      half_days = 0,
      payable_days,
      absent_days = 0,
      paid_leaves = 0,
      unpaid_leaves = 0,
      sick_leaves = 0,
      casual_leaves = 0,
      festival_leaves = 0,
      menstrual_leaves = 0,
      sundays_count,
      holidays_count = 0,
      gross_salary,
      deductions = 0,
      net_salary,
      payment_status = 'GENERATED',
      payment_date = null,
      is_sent_to_employee = false,
      update_master_salary = false,
      notes = null,
    } = req.body;

    if (!employee_id || !month || base_salary === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Employee, target month (YYYY-MM), and base salary are required.',
      });
    }

    const employee = await Employee.findByPk(employee_id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    // Check if payroll record already exists for this employee and month
    const existing = await Payroll.findOne({ where: { employee_id, month } });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Payroll record already exists for ${employee.first_name} ${employee.last_name} in month ${month}. Please edit the existing record instead.`,
      });
    }

    const [yearStr, monthStr] = month.split('-');
    const calendar = getMonthCalendarRules(parseInt(yearStr, 10), parseInt(monthStr, 10));
    const computedTotalDays = total_days || calendar.totalDays;
    const computedSundays = sundays_count !== undefined ? Number(sundays_count) : calendar.sundaysCount;

    const numBaseSalary = Number(base_salary);
    const numBonus = Number(bonus) || 0;
    const numAllowances = Number(allowances) || 0;
    const numGross = gross_salary !== undefined ? Number(gross_salary) : numBaseSalary + numBonus + numAllowances;
    const numDeductions = Number(deductions) || 0;
    const numNet = net_salary !== undefined ? Number(net_salary) : Math.max(0, numGross - numDeductions);

    const sent = Boolean(is_sent_to_employee);
    const sentAt = sent ? new Date() : null;

    const payroll = await Payroll.create({
      employee_id,
      month,
      base_salary: numBaseSalary,
      bonus: numBonus,
      allowances: numAllowances,
      total_days: computedTotalDays,
      present_days: present_days !== undefined ? Number(present_days) : computedTotalDays,
      half_days: Number(half_days) || 0,
      payable_days: payable_days !== undefined ? Number(payable_days) : computedTotalDays,
      absent_days: Number(absent_days) || 0,
      paid_leaves: Number(paid_leaves) || 0,
      unpaid_leaves: Number(unpaid_leaves) || 0,
      sick_leaves: Number(sick_leaves) || 0,
      casual_leaves: Number(casual_leaves) || 0,
      festival_leaves: Number(festival_leaves) || 0,
      menstrual_leaves: Number(menstrual_leaves) || 0,
      sundays_count: computedSundays,
      holidays_count: Number(holidays_count) || 0,
      gross_salary: numGross,
      deductions: numDeductions,
      net_salary: numNet,
      payment_status,
      payment_date: payment_status === 'PAID' ? (parseDateOrNull(payment_date) || new Date().toISOString().split('T')[0]) : null,
      is_sent_to_employee: sent,
      sent_at: sentAt,
      notes: notes || 'Manually entered by Administrator.',
    });

    // If Admin opted to update master employee CTC
    if (update_master_salary) {
      await employee.update({ base_salary: numBaseSalary });
    }

    // If sent to employee, dispatch instant notification
    if (sent) {
      try {
        await notifyEmployee({
          employeeId: employee.id,
          title: `Salary Statement Released: ${month}`,
          message: `Your official compensation statement for ${month} has been released by Administration. Net Pay: ₹${numNet.toLocaleString('en-IN')}.`,
          type: 'PAYROLL_PUBLISHED',
          link: '/employee/salary',
        });
      } catch (notifErr) {
        console.error('Notification error on custom payroll creation:', notifErr.message);
      }
    }

    const created = await Payroll.findByPk(payroll.id, {
      include: [
        {
          model: Employee,
          as: 'employee',
          include: [
            { model: Department, as: 'department' },
            { model: User, as: 'user', attributes: ['id', 'email', 'role'] },
          ],
        },
      ],
    });

    return res.status(201).json({
      success: true,
      message: `Payroll record created successfully for ${employee.first_name} ${employee.last_name}.`,
      data: created,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create custom payroll record: ' + error.message,
    });
  }
}

/**
 * @route   PUT /api/payroll/:id
 * @desc    Admin updates payroll details, increases salary, or adjusts deductions
 * @access  Protected (ADMIN)
 */
async function updatePayrollRecord(req, res) {
  try {
    const { id } = req.params;
    const payroll = await Payroll.findByPk(id, {
      include: [{ model: Employee, as: 'employee' }],
    });

    if (!payroll) {
      return res.status(404).json({ success: false, message: 'Payroll record not found.' });
    }

    const {
      base_salary,
      bonus,
      allowances,
      present_days,
      half_days,
      payable_days,
      absent_days,
      paid_leaves,
      unpaid_leaves,
      sick_leaves,
      casual_leaves,
      festival_leaves,
      menstrual_leaves,
      sundays_count,
      holidays_count,
      gross_salary,
      deductions,
      net_salary,
      payment_status,
      payment_date,
      is_sent_to_employee,
      update_master_salary,
      notes,
    } = req.body;

    const updates = {};
    if (base_salary !== undefined) updates.base_salary = Number(base_salary);
    if (bonus !== undefined) updates.bonus = Number(bonus);
    if (allowances !== undefined) updates.allowances = Number(allowances);
    if (present_days !== undefined) updates.present_days = Number(present_days);
    if (half_days !== undefined) updates.half_days = Number(half_days);
    if (payable_days !== undefined) updates.payable_days = Number(payable_days);
    if (absent_days !== undefined) updates.absent_days = Number(absent_days);
    if (paid_leaves !== undefined) updates.paid_leaves = Number(paid_leaves);
    if (unpaid_leaves !== undefined) updates.unpaid_leaves = Number(unpaid_leaves);
    if (sick_leaves !== undefined) updates.sick_leaves = Number(sick_leaves);
    if (casual_leaves !== undefined) updates.casual_leaves = Number(casual_leaves);
    if (festival_leaves !== undefined) updates.festival_leaves = Number(festival_leaves);
    if (menstrual_leaves !== undefined) updates.menstrual_leaves = Number(menstrual_leaves);
    if (sundays_count !== undefined) updates.sundays_count = Number(sundays_count);
    if (holidays_count !== undefined) updates.holidays_count = Number(holidays_count);
    if (deductions !== undefined) updates.deductions = Number(deductions);

    // Calculate or accept gross/net
    const currentBase = updates.base_salary !== undefined ? updates.base_salary : Number(payroll.base_salary);
    const currentBonus = updates.bonus !== undefined ? updates.bonus : Number(payroll.bonus || 0);
    const currentAllowances = updates.allowances !== undefined ? updates.allowances : Number(payroll.allowances || 0);
    const currentDeductions = updates.deductions !== undefined ? updates.deductions : Number(payroll.deductions);

    if (gross_salary !== undefined) {
      updates.gross_salary = Number(gross_salary);
    } else if (updates.base_salary !== undefined || updates.bonus !== undefined || updates.allowances !== undefined) {
      updates.gross_salary = currentBase + currentBonus + currentAllowances;
    }

    const currentGross = updates.gross_salary !== undefined ? updates.gross_salary : Number(payroll.gross_salary);

    if (net_salary !== undefined) {
      updates.net_salary = Number(net_salary);
    } else {
      updates.net_salary = Math.max(0, currentGross - currentDeductions);
    }

    if (payment_status !== undefined) {
      updates.payment_status = payment_status;
      if (payment_status === 'PAID') {
        updates.payment_date = parseDateOrNull(payment_date) || payroll.payment_date || new Date().toISOString().split('T')[0];
      } else {
        updates.payment_date = null;
      }
    } else if (payment_date !== undefined) {
      updates.payment_date = parseDateOrNull(payment_date);
    }
    if (notes !== undefined) updates.notes = notes;

    let newlySent = false;
    if (is_sent_to_employee !== undefined) {
      updates.is_sent_to_employee = Boolean(is_sent_to_employee);
      if (updates.is_sent_to_employee && !payroll.is_sent_to_employee) {
        updates.sent_at = new Date();
        newlySent = true;
      }
    }

    await payroll.update(updates);

    // Update master employee salary if requested
    if (update_master_salary && payroll.employee && updates.base_salary !== undefined) {
      await payroll.employee.update({ base_salary: updates.base_salary });
    }

    // Send notification if newly sent to employee
    if (newlySent && payroll.employee) {
      try {
        await notifyEmployee({
          employeeId: payroll.employee.id,
          title: `Salary Statement Released: ${payroll.month}`,
          message: `Your official compensation statement for ${payroll.month} has been released by Administration. Net Pay: ₹${Number(updates.net_salary || payroll.net_salary).toLocaleString('en-IN')}.`,
          type: 'PAYROLL_PUBLISHED',
          link: '/employee/salary',
        });
      } catch (notifErr) {
        console.error('Notification error on payroll update:', notifErr.message);
      }
    }

    const updated = await Payroll.findByPk(id, {
      include: [
        {
          model: Employee,
          as: 'employee',
          include: [
            { model: Department, as: 'department' },
            { model: User, as: 'user', attributes: ['id', 'email', 'role'] },
          ],
        },
      ],
    });

    return res.status(200).json({
      success: true,
      message: 'Payroll record updated successfully.',
      data: updated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update payroll record: ' + error.message,
    });
  }
}

/**
 * @route   DELETE /api/payroll/:id
 * @desc    Admin permanently deletes a payroll entry
 * @access  Protected (ADMIN)
 */
async function deletePayrollRecord(req, res) {
  try {
    const { id } = req.params;
    const payroll = await Payroll.findByPk(id);

    if (!payroll) {
      return res.status(404).json({ success: false, message: 'Payroll record not found.' });
    }

    await payroll.destroy();

    return res.status(200).json({
      success: true,
      message: 'Payroll record deleted successfully.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete payroll record: ' + error.message,
    });
  }
}

/**
 * @route   POST /api/payroll/:id/send
 * @desc    Admin directly sends/releases payroll to employee portal
 * @access  Protected (ADMIN)
 */
async function sendPayrollToEmployee(req, res) {
  try {
    const { id } = req.params;
    const payroll = await Payroll.findByPk(id, {
      include: [{ model: Employee, as: 'employee' }],
    });

    if (!payroll) {
      return res.status(404).json({ success: false, message: 'Payroll record not found.' });
    }

    await payroll.update({
      is_sent_to_employee: true,
      sent_at: new Date(),
    });

    if (payroll.employee) {
      try {
        await notifyEmployee({
          employeeId: payroll.employee.id,
          title: `Salary Statement Released: ${payroll.month}`,
          message: `Your official compensation statement for ${payroll.month} has been released by Administration. Net Pay: ₹${Number(payroll.net_salary).toLocaleString('en-IN')}.`,
          type: 'PAYROLL_PUBLISHED',
          link: '/employee/salary',
        });
      } catch (notifErr) {
        console.error('Notification error on sending payroll:', notifErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Payroll statement for ${payroll.month} sent to ${payroll.employee?.first_name || 'employee'}'s portal.`,
      data: payroll,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to send payroll to employee: ' + error.message,
    });
  }
}

/**
 * @route   POST /api/payroll/send-bulk
 * @desc    Admin directly sends all payroll records for month to employee portals
 * @access  Protected (ADMIN)
 */
async function sendBulkPayrollToEmployees(req, res) {
  try {
    const { month } = req.body;
    const targetMonth = month || new Date().toISOString().slice(0, 7);

    const records = await Payroll.findAll({
      where: { month: targetMonth },
      include: [{ model: Employee, as: 'employee' }],
    });

    if (records.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No payroll records found for month ${targetMonth}. Please generate payroll first.`,
      });
    }

    let sentCount = 0;
    for (const r of records) {
      await r.update({
        is_sent_to_employee: true,
        sent_at: new Date(),
      });
      sentCount++;

      if (r.employee) {
        try {
          await notifyEmployee({
            employeeId: r.employee.id,
            title: `Salary Statement Released: ${targetMonth}`,
            message: `Your official compensation statement for ${targetMonth} has been released by Administration. Net Pay: ₹${Number(r.net_salary).toLocaleString('en-IN')}.`,
            type: 'PAYROLL_PUBLISHED',
            link: '/employee/salary',
          });
        } catch (err) {
          console.error('Bulk payroll notification error:', err.message);
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: `Successfully released ${sentCount} payroll statement(s) for ${targetMonth} directly to employee portals.`,
      sentCount,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to send bulk payroll: ' + error.message,
    });
  }
}

module.exports = {
  getMonthCalendarRules,
  generateMonthlyPayroll,
  getPayrollRecords,
  updatePaymentStatus,
  getMyPayroll,
  createCustomPayrollRecord,
  updatePayrollRecord,
  deletePayrollRecord,
  sendPayrollToEmployee,
  sendBulkPayrollToEmployees,
};

