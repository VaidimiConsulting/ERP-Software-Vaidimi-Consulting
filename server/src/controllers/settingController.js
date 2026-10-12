const { CompanySetting, User, Employee, Department, Branch, Notification } = require('../models');
const { notifyAdminsOnly } = require('../utils/notify');
const { ROLES } = require('../config/constants');

// Default timings - 10:00 AM to 5:30 PM Shift, 1:00 PM to 2:00 PM Lunch Break (6.0 hrs net work)
const DEFAULT_SETTINGS = {
  office_start_time: '10:00',
  office_grace_end_time: '11:00',
  break_start_time: '13:00',
  break_end_time: '14:00',
  office_end_time: '17:30',
  work_hours_standard: '6.0',
};

function sanitizePhone(input) {
  if (!input) return null;
  const str = String(input).trim();
  const digits = str.replace(/\D/g, '');
  if (digits.length === 10 && /^[6-9]/.test(digits)) return digits;
  if (digits.length === 12 && digits.startsWith('91') && /^[6-9]/.test(digits.slice(2))) return digits.slice(2);
  if (digits.length >= 7 && digits.length <= 15) return str;
  return null;
}

/**
 * Helper to fetch effective office timing settings
 */
async function getOfficeTimingConfig() {
  try {
    const settings = await CompanySetting.findAll();
    const map = { ...DEFAULT_SETTINGS };
    settings.forEach((s) => {
      map[s.key] = s.value;
    });
    return map;
  } catch (err) {
    return DEFAULT_SETTINGS;
  }
}

/**
 * @route   GET /api/settings
 * @desc    Get all company settings
 * @access  Protected
 */
async function getSettings(req, res) {
  try {
    const config = await getOfficeTimingConfig();
    return res.status(200).json({
      success: true,
      data: config,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve settings: ' + error.message,
    });
  }
}

/**
 * @route   PUT /api/settings
 * @desc    Update company settings (office timings)
 * @access  Protected (ADMIN, HR)
 */
async function updateSettings(req, res) {
  try {
    const updates = req.body; // e.g. { office_start_time: '10:00', office_grace_end_time: '11:00' }

    for (const [key, value] of Object.entries(updates)) {
      await CompanySetting.upsert({
        key,
        value: String(value),
        description: `Company configuration for ${key}`,
      });
    }

    const updated = await getOfficeTimingConfig();
    return res.status(200).json({
      success: true,
      message: 'Company settings updated successfully.',
      data: updated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update settings: ' + error.message,
    });
  }
}

/**
 * @route   PUT /api/settings/profile
 * @desc    Self-service profile update for any logged in user (Admin, HR, Employee)
 *          If employee updates profile, details are dispatched to Admin in real-time.
 * @access  Protected
 */
async function updateUserProfile(req, res) {
  try {
    const userId = req.user.id;
    let employee = req.employee;

    if (!employee) {
      employee = await Employee.findOne({
        where: { user_id: userId },
      });
      if (!employee && req.user.email) {
        employee = await Employee.findOne({
          where: { email: req.user.email },
        });
      }
    }

    const isAdmin = req.user.role === ROLES.ADMIN;
    const isHR = req.user.role === ROLES.HR;
    const isStandardEmployee = !isAdmin;

    const {
      first_name,
      last_name,
      phone,
      address,
      emergency_contact,
      skills,
      profile_photo,
      allergies,
      medical_conditions,
      highest_qualification,
      education_field,
      college,
      course,
      passing_year,
      percentage_cgpa,
      education_details,
    } = req.body;

    let cleanPhone = undefined;
    if (phone !== undefined) {
      if (phone) {
        cleanPhone = sanitizePhone(phone);
        if (!cleanPhone) {
          return res.status(400).json({
            success: false,
            message: 'Phone number must be a valid 10-digit mobile number.',
          });
        }
      } else {
        cleanPhone = null;
      }
    }

    let cleanEC = undefined;
    if (emergency_contact !== undefined) {
      if (emergency_contact) {
        cleanEC = sanitizePhone(emergency_contact);
        if (!cleanEC) {
          return res.status(400).json({
            success: false,
            message: 'Emergency contact must be a valid 10-digit mobile number.',
          });
        }
      } else {
        cleanEC = null;
      }
    }

    let updatedEmployee = null;

    if (employee) {
      // Track which fields changed
      const updatedFields = [];
      const fieldLabels = {
        phone: 'Phone Number',
        address: 'Residential Address',
        emergency_contact: 'Emergency Contact',
        skills: 'Skills',
        profile_photo: 'Profile Photo',
        allergies: 'Allergies',
        medical_conditions: 'Medical Notes',
        highest_qualification: 'Highest Qualification',
        education_field: 'Education Stream',
        college: 'College / University',
        course: 'Degree / Course',
        passing_year: 'Passing Year',
        percentage_cgpa: 'Percentage / CGPA',
        education_details: 'Education Details',
      };

      if (isAdmin) {
        fieldLabels.first_name = 'First Name';
        fieldLabels.last_name = 'Last Name';
      }

      for (const [key, label] of Object.entries(fieldLabels)) {
        let incomingVal = req.body[key];
        if (key === 'phone' && cleanPhone !== undefined) incomingVal = cleanPhone;
        if (key === 'emergency_contact' && cleanEC !== undefined) incomingVal = cleanEC;

        if (incomingVal !== undefined) {
          const oldStr = String(employee[key] || '').trim();
          const newStr = String(incomingVal || '').trim();
          if (oldStr !== newStr) {
            updatedFields.push({
              field: key,
              label,
              oldValue: oldStr || '(empty)',
              newValue: newStr || '(cleared)',
            });
          }
        }
      }

      const updateData = {};
      if (cleanPhone !== undefined) updateData.phone = cleanPhone;
      if (address !== undefined) updateData.address = address;
      if (cleanEC !== undefined) updateData.emergency_contact = cleanEC;
      if (skills !== undefined) updateData.skills = skills;
      if (profile_photo !== undefined) updateData.profile_photo = profile_photo;
      if (allergies !== undefined) updateData.allergies = allergies;
      if (medical_conditions !== undefined) updateData.medical_conditions = medical_conditions;
      if (highest_qualification !== undefined) updateData.highest_qualification = highest_qualification;
      if (education_field !== undefined) updateData.education_field = education_field;
      if (college !== undefined) updateData.college = college;
      if (course !== undefined) updateData.course = course;
      if (passing_year !== undefined) updateData.passing_year = passing_year;
      if (percentage_cgpa !== undefined) updateData.percentage_cgpa = percentage_cgpa;
      if (education_details !== undefined) updateData.education_details = education_details;

      if (isAdmin) {
        if (first_name) updateData.first_name = first_name.trim();
        if (last_name) updateData.last_name = last_name.trim();
      }

      await employee.update(updateData);
      updatedEmployee = await Employee.findByPk(employee.id, {
        include: [
          { model: Department, as: 'department', attributes: ['id', 'department_name'] },
          { model: Branch, as: 'branch', attributes: ['id', 'branch_code', 'branch_name', 'city'] },
        ],
      });

      // If a non-admin employee updated their profile settings, notify Admin immediately with details
      if (updatedFields.length > 0 && isStandardEmployee) {
        const changesSummary = updatedFields.map((f) => `${f.label}: "${f.newValue}"`).join('; ');
        const notifyMsg = `Employee ${employee.first_name} ${employee.last_name} (${employee.employee_code}) updated their profile settings: ${changesSummary}`;

        await notifyAdminsOnly({
          title: `Profile Update Alert: ${employee.first_name} ${employee.last_name} (${employee.employee_code})`,
          message: notifyMsg,
          type: 'PROFILE_UPDATE',
          link: '/admin/settings?tab=audit',
          details: {
            employeeId: employee.id,
            employeeName: `${employee.first_name} ${employee.last_name}`,
            employeeCode: employee.employee_code,
            changes: updatedFields,
            updatedAt: new Date(),
          },
        });
      }
    }

    // Refetch full user state
    const userFresh = await User.findByPk(userId, {
      include: [
        {
          model: Employee,
          as: 'employeeProfile',
          include: [
            { model: Department, as: 'department', attributes: ['id', 'department_name'] },
            { model: Branch, as: 'branch', attributes: ['id', 'branch_code', 'branch_name', 'city'] },
          ],
        },
      ],
    });

    return res.status(200).json({
      success: true,
      message: 'Profile settings updated successfully.',
      data: {
        user: userFresh,
        employee: updatedEmployee || userFresh?.employeeProfile,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update profile: ' + error.message,
    });
  }
}

/**
 * @route   GET /api/settings/employee-updates
 * @desc    Get employee profile update audit logs (for Admin)
 * @access  Protected (ADMIN)
 */
async function getEmployeeUpdateLogs(req, res) {
  try {
    const logs = await Notification.findAll({
      where: {
        type: 'PROFILE_UPDATE',
      },
      order: [['created_at', 'DESC']],
      limit: 50,
    });

    return res.status(200).json({
      success: true,
      data: logs,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve update logs: ' + error.message,
    });
  }
}

module.exports = {
  getOfficeTimingConfig,
  getSettings,
  updateSettings,
  updateUserProfile,
  getEmployeeUpdateLogs,
};

