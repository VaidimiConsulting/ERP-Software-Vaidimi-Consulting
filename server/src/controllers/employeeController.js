const { Op } = require('sequelize');
const {
  Employee,
  User,
  Department,
  Branch,
  Attendance,
  LeaveRequest,
  LeaveBalance,
  ProjectMember,
  Task,
  Project,
  Payroll,
  Notification,
} = require('../models');
const { ROLES, EMPLOYMENT_TYPES, EMPLOYEE_STATUS } = require('../config/constants');
const { notifyAdminsOnly } = require('../utils/notify');

/**
 * Generate next unique employee or intern code
 */
async function generateEmployeeCode(employmentType) {
  const prefix = employmentType === EMPLOYMENT_TYPES.INTERN ? 'INT' : 'EMP';
  const count = await Employee.count({ where: { employment_type: employmentType } });
  const codeNumber = String(count + 1).padStart(3, '0');
  const candidate = `${prefix}-${codeNumber}`;

  // Check if exists, if so append timestamp suffix to guarantee uniqueness
  const exists = await Employee.findOne({ where: { employee_code: candidate } });
  if (exists) {
    return `${prefix}-${Date.now().toString().slice(-4)}`;
  }
  return candidate;
}

/**
 * Robust Phone & Date Sanitization Helpers
 */
function sanitizePhone(input) {
  if (!input) return null;
  const str = String(input).trim();
  const digits = str.replace(/\D/g, '');
  if (digits.length === 10 && /^[6-9]/.test(digits)) return digits;
  if (digits.length === 12 && digits.startsWith('91') && /^[6-9]/.test(digits.slice(2))) return digits.slice(2);
  if (digits.length >= 7 && digits.length <= 15) return str;
  return null;
}

function parseDateOrNull(val) {
  if (!val || typeof val !== 'string' || val.trim() === '' || val.trim() === 'Invalid date') return null;
  return val.trim();
}

/**
 * @route   GET /api/employees
 * @desc    Get all employees/interns with filtering and search
 * @access  Protected (Admin / Manager can see all; Employee can query coworker directory)
 */
async function getEmployees(req, res) {
  try {
    const { search, department_id, branch_id, status, employment_type } = req.query;

    const where = {};

    if (branch_id) {
      where.branch_id = Number(branch_id);
    }

    // Filter by employment type (EMPLOYEE, INTERN)
    if (employment_type && ['EMPLOYEE', 'INTERN'].includes(employment_type.toUpperCase())) {
      where.employment_type = employment_type.toUpperCase();
    }

    // Filter by status
    if (status) {
      where.status = status;
    }

    // Filter by department
    if (department_id) {
      where.department_id = department_id;
    }

    // Search by name, email, employee_code, designation
    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      where[Op.or] = [
        { first_name: { [Op.like]: term } },
        { last_name: { [Op.like]: term } },
        { email: { [Op.like]: term } },
        { employee_code: { [Op.like]: term } },
        { designation: { [Op.like]: term } },
        { skills: { [Op.like]: term } },
        { college: { [Op.like]: term } },
      ];
    }

    const employees = await Employee.findAll({
      where,
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'department_name'],
        },
        {
          model: Branch,
          as: 'branch',
          attributes: ['id', 'branch_code', 'branch_name', 'city'],
        },
        {
          model: Employee,
          as: 'reportingManager',
          attributes: ['id', 'first_name', 'last_name', 'employee_code', 'designation'],
        },
        {
          model: Employee,
          as: 'mentor',
          attributes: ['id', 'first_name', 'last_name', 'employee_code', 'designation'],
        },
        {
          model: User,
          as: 'user',
          attributes: (req.user?.role === ROLES.ADMIN || req.user?.role === ROLES.HR)
            ? ['id', 'email', 'role', 'is_active', 'saved_password']
            : ['id', 'email', 'role', 'is_active'],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    // Confidentiality rule: ONLY Admin can view other employees' base salaries.
    // For HR and Employees, they can ONLY see their own base salary, never anyone else's!
    if (req.user?.role !== ROLES.ADMIN) {
      employees.forEach((emp) => {
        const isSelf = (req.employee && req.employee.id === emp.id) || (emp.user_id && emp.user_id === req.user.id);
        if (!isSelf) {
          if (emp.dataValues) {
            delete emp.dataValues.base_salary;
          }
          emp.base_salary = undefined;
        }
      });
    }

    return res.status(200).json({
      success: true,
      count: employees.length,
      data: employees,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch employees: ' + error.message,
    });
  }
}

/**
 * @route   GET /api/employees/:id
 * @desc    Get single employee by ID
 * @access  Protected (Admin, Manager, or Self)
 */
async function getEmployeeById(req, res) {
  try {
    const { id } = req.params;

    const employee = await Employee.findByPk(id, {
      include: [
        {
          model: Department,
          as: 'department',
        },
        {
          model: Branch,
          as: 'branch',
          attributes: ['id', 'branch_code', 'branch_name', 'city', 'address', 'phone'],
        },
        {
          model: Employee,
          as: 'reportingManager',
          attributes: ['id', 'first_name', 'last_name', 'employee_code', 'email', 'designation'],
        },
        {
          model: Employee,
          as: 'mentor',
          attributes: ['id', 'first_name', 'last_name', 'employee_code', 'email', 'designation'],
        },
        {
          model: User,
          as: 'user',
          attributes: (req.user?.role === ROLES.ADMIN || req.user?.role === ROLES.HR)
            ? ['id', 'email', 'role', 'is_active', 'saved_password']
            : ['id', 'email', 'role', 'is_active'],
        },
      ],
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found.',
      });
    }

    // Role check: Normal employee can only view their own full profile or colleagues' public directory
    const isAdminOrManager = req.user.role === ROLES.ADMIN || req.user.role === ROLES.HR || req.user.role === ROLES.MANAGER;
    const isSelf = req.employee && req.employee.id === employee.id;

    if (!isAdminOrManager && !isSelf) {
      // Return redacted public version for coworker view
      return res.status(200).json({
        success: true,
        data: {
          id: employee.id,
          employee_code: employee.employee_code,
          first_name: employee.first_name,
          last_name: employee.last_name,
          email: employee.email,
          designation: employee.designation,
          department: employee.department,
          employment_type: employee.employment_type,
          skills: employee.skills,
          status: employee.status,
        },
      });
    }

    // Confidentiality rule: ONLY Admin can view other employees' base salaries.
    // Non-admin users (HR and Employees) can ONLY view their own base salary, never anyone else's!
    if (req.user?.role !== ROLES.ADMIN && !isSelf) {
      if (employee.dataValues) {
        delete employee.dataValues.base_salary;
      }
      employee.base_salary = undefined;
    }

    return res.status(200).json({
      success: true,
      data: employee,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error retrieving employee: ' + error.message,
    });
  }
}

/**
 * @route   POST /api/employees
 * @desc    Create new employee or intern and generate user login
 * @access  Protected (ADMIN, MANAGER)
 */
async function createEmployee(req, res) {
  try {
    const {
      first_name,
      last_name,
      email,
      phone,
      gender,
      date_of_birth,
      designation,
      department_id,
      branch_id,
      employment_type = EMPLOYMENT_TYPES.EMPLOYEE,
      joining_date,
      internship_start_date,
      internship_end_date,
      reporting_manager_id,
      skills,
      status = EMPLOYEE_STATUS.ACTIVE,
      address,
      emergency_contact,
      college,
      course,
      mentor_id,
      password,
      role = ROLES.EMPLOYEE,
      base_salary = 30000.00,
      father_name,
      mother_name,
      blood_group,
      aadhar_number,
      permanent_address,
      religion,
      marital_status,
      // Health & Medical Details
      medical_conditions,
      allergies,
      insurance_policy_number,
      insurance_provider,
      emergency_doctor_name,
      emergency_doctor_phone,
      health_status,
      // Educational Qualifications
      highest_qualification,
      education_field,
      passing_year,
      percentage_cgpa,
      education_details,
    } = req.body;

    // Validate essential fields
    if (!first_name || !last_name || !email || !designation) {
      return res.status(400).json({
        success: false,
        message: 'First name, last name, email, and designation are required.',
      });
    }

    // 1. Strict Name Validation (Only alphabetic characters & spaces, 2-50 chars)
    const nameRegex = /^[A-Za-z\s]{2,50}$/;
    if (!nameRegex.test(first_name.trim())) {
      return res.status(400).json({
        success: false,
        message: 'First name must contain only alphabetic characters (no numbers or special characters) and be at least 2 characters long.',
      });
    }
    if (!nameRegex.test(last_name.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Last name must contain only alphabetic characters (no numbers or special characters) and be at least 2 characters long.',
      });
    }

    // 2. Strict Email Validation (RFC standard format)
    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address (e.g. employee@vaidimi.com).',
      });
    }

    // 3. Strict Phone / Mobile Validation (Valid 10-digit mobile number)
    let cleanPhone = null;
    if (phone) {
      cleanPhone = sanitizePhone(phone);
      if (!cleanPhone) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid 10-digit mobile number (e.g. 9876543210 or +91 9876543210).',
        });
      }
    }

    // 4. Strict Emergency Contact Validation (if provided)
    let cleanEC = null;
    if (emergency_contact) {
      cleanEC = sanitizePhone(emergency_contact);
      if (!cleanEC) {
        return res.status(400).json({
          success: false,
          message: 'Emergency contact must be a valid 10-digit mobile number.',
        });
      }
    }

    // Check if email is already registered in User or Employee
    const userExists = await User.findOne({ where: { email: cleanEmail } });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: `An account with email '${cleanEmail}' already exists.`,
      });
    }

    const empExists = await Employee.findOne({ where: { email: cleanEmail } });
    if (empExists) {
      return res.status(400).json({
        success: false,
        message: `An employee with email '${cleanEmail}' already exists.`,
      });
    }

    // Auto-generate unique employee code
    const generatedCode = await generateEmployeeCode(employment_type);

    // Create user login account
    const initialPassword = password || 'Welcome@2026';
    const newUser = await User.create({
      email: cleanEmail,
      password_hash: initialPassword,
      saved_password: initialPassword,
      role: role || ROLES.EMPLOYEE,
      is_active: status === EMPLOYEE_STATUS.ACTIVE,
    });

    // Create employee record across any branch
    const assignedBranchId = branch_id ? Number(branch_id) : null;

    const newEmployee = await Employee.create({
      user_id: newUser.id,
      employee_code: generatedCode,
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      gender: gender || null,
      date_of_birth: parseDateOrNull(date_of_birth),
      designation: designation.trim(),
      department_id: department_id ? Number(department_id) : null,
      branch_id: assignedBranchId,
      employment_type: employment_type || EMPLOYMENT_TYPES.EMPLOYEE,
      joining_date: parseDateOrNull(joining_date) || new Date().toISOString().split('T')[0],
      internship_start_date: parseDateOrNull(internship_start_date),
      internship_end_date: parseDateOrNull(internship_end_date),
      reporting_manager_id: reporting_manager_id ? Number(reporting_manager_id) : null,
      skills: skills || null,
      status: status || EMPLOYEE_STATUS.ACTIVE,
      address: address || null,
      emergency_contact: cleanEC,
      college: college || null,
      course: course || null,
      mentor_id: mentor_id ? Number(mentor_id) : null,
      base_salary: (req.user.role === ROLES.ADMIN && base_salary !== undefined && !isNaN(Number(base_salary))) ? Number(base_salary) : 30000.00,
      father_name: father_name || null,
      mother_name: mother_name || null,
      blood_group: blood_group || null,
      aadhar_number: aadhar_number || null,
      permanent_address: permanent_address || null,
      religion: religion || null,
      marital_status: marital_status || null,
      medical_conditions: medical_conditions || null,
      allergies: allergies || null,
      insurance_policy_number: insurance_policy_number || null,
      insurance_provider: insurance_provider || null,
      emergency_doctor_name: emergency_doctor_name || null,
      emergency_doctor_phone: emergency_doctor_phone || null,
      health_status: health_status || 'FIT_FOR_DUTY',
      highest_qualification: highest_qualification || null,
      education_field: education_field || null,
      passing_year: passing_year || null,
      percentage_cgpa: percentage_cgpa || null,
      education_details: education_details || null,
    });

    const fullEmployee = await Employee.findByPk(newEmployee.id, {
      include: [
        { model: Department, as: 'department' },
        { model: Branch, as: 'branch' },
        { model: User, as: 'user', attributes: ['id', 'email', 'role', 'is_active'] },
      ],
    });

    if (req.user.role !== ROLES.ADMIN) {
      if (fullEmployee && fullEmployee.dataValues) {
        delete fullEmployee.dataValues.base_salary;
      }
      if (fullEmployee) {
        fullEmployee.base_salary = undefined;
      }
    }

    return res.status(201).json({
      success: true,
      message: `${employment_type === EMPLOYMENT_TYPES.INTERN ? 'Intern' : 'Employee'} created successfully.`,
      data: fullEmployee,
      generatedCredentials: {
        email: cleanEmail,
        temporaryPassword: initialPassword,
        employeeCode: generatedCode,
        fullName: `${first_name.trim()} ${last_name.trim()}`,
        designation: designation.trim(),
        role: role || ROLES.EMPLOYEE,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create employee: ' + error.message,
    });
  }
}

/**
 * @route   PUT /api/employees/:id
 * @desc    Update employee details (Admin has full control; Employee has self-service contact fields)
 * @access  Protected
 */
async function updateEmployee(req, res) {
  try {
    const { id } = req.params;

    const employee = await Employee.findByPk(id, {
      include: [{ model: User, as: 'user' }],
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found.',
      });
    }

    const isAdminOrManager = req.user.role === ROLES.ADMIN || req.user.role === ROLES.HR || req.user.role === ROLES.MANAGER;
    const isSelf = req.employee && req.employee.id === employee.id;

    if (!isAdminOrManager && !isSelf) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only edit your own profile.',
      });
    }

    // Sensitive field lockdown for standard employees
    if (!isAdminOrManager) {
      // Normal employee can ONLY update phone, address, emergency_contact, skills, profile_photo
      const allowedFields = [
        'phone', 'address', 'emergency_contact', 'skills', 'profile_photo',
        'allergies', 'medical_conditions', 'highest_qualification', 'education_field',
        'college', 'course', 'passing_year', 'percentage_cgpa', 'education_details'
      ];
      const sensitiveAttempted = Object.keys(req.body).filter(
        (key) => !allowedFields.includes(key) && req.body[key] !== undefined && req.body[key] !== employee[key]
      );

      if (sensitiveAttempted.length > 0) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to update sensitive fields: ' + sensitiveAttempted.join(', '),
        });
      }

      let cleanSelfPhone = undefined;
      if (req.body.phone !== undefined) {
        if (req.body.phone) {
          cleanSelfPhone = sanitizePhone(req.body.phone);
          if (!cleanSelfPhone) {
            return res.status(400).json({
              success: false,
              message: 'Phone number must be a valid 10-digit mobile number (e.g. 9876543210 or +91 9876543210).',
            });
          }
        } else {
          cleanSelfPhone = null;
        }
      }

      let cleanSelfEC = undefined;
      if (req.body.emergency_contact !== undefined) {
        if (req.body.emergency_contact) {
          cleanSelfEC = sanitizePhone(req.body.emergency_contact);
          if (!cleanSelfEC) {
            return res.status(400).json({
              success: false,
              message: 'Emergency contact must be a valid 10-digit mobile number.',
            });
          }
        } else {
          cleanSelfEC = null;
        }
      }

      // Track updated fields to notify Admin
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

      for (const [key, label] of Object.entries(fieldLabels)) {
        let incomingVal = req.body[key];
        if (key === 'phone' && cleanSelfPhone !== undefined) incomingVal = cleanSelfPhone;
        if (key === 'emergency_contact' && cleanSelfEC !== undefined) incomingVal = cleanSelfEC;

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

      await employee.update({
        phone: cleanSelfPhone !== undefined ? cleanSelfPhone : employee.phone,
        address: req.body.address !== undefined ? req.body.address : employee.address,
        emergency_contact: cleanSelfEC !== undefined ? cleanSelfEC : employee.emergency_contact,
        skills: req.body.skills !== undefined ? req.body.skills : employee.skills,
        profile_photo: req.body.profile_photo !== undefined ? req.body.profile_photo : employee.profile_photo,
        allergies: req.body.allergies !== undefined ? req.body.allergies : employee.allergies,
        medical_conditions: req.body.medical_conditions !== undefined ? req.body.medical_conditions : employee.medical_conditions,
        highest_qualification: req.body.highest_qualification !== undefined ? req.body.highest_qualification : employee.highest_qualification,
        education_field: req.body.education_field !== undefined ? req.body.education_field : employee.education_field,
        college: req.body.college !== undefined ? req.body.college : employee.college,
        course: req.body.course !== undefined ? req.body.course : employee.course,
        passing_year: req.body.passing_year !== undefined ? req.body.passing_year : employee.passing_year,
        percentage_cgpa: req.body.percentage_cgpa !== undefined ? req.body.percentage_cgpa : employee.percentage_cgpa,
        education_details: req.body.education_details !== undefined ? req.body.education_details : employee.education_details,
      });

      // Dispatch detailed notification to Admin if employee changed any profile settings
      if (updatedFields.length > 0) {
        const changesSummary = updatedFields.map((f) => `${f.label}: "${f.newValue}"`).join('; ');
        const notifyMsg = `Employee ${employee.first_name} ${employee.last_name} (${employee.employee_code}) updated their profile details: ${changesSummary}`;

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

      return res.status(200).json({
        success: true,
        message: 'Your profile has been updated successfully.',
        data: employee,
      });
    }

    // Admin / Manager full edit
    const {
      first_name,
      last_name,
      phone,
      gender,
      date_of_birth,
      designation,
      department_id,
      branch_id,
      employment_type,
      joining_date,
      internship_start_date,
      internship_end_date,
      reporting_manager_id,
      skills,
      status,
      address,
      emergency_contact,
      college,
      course,
      mentor_id,
      profile_photo,
      role,
      password,
      base_salary,
      father_name,
      mother_name,
      blood_group,
      aadhar_number,
      permanent_address,
      religion,
      marital_status,
      medical_conditions,
      allergies,
      insurance_policy_number,
      insurance_provider,
      emergency_doctor_name,
      emergency_doctor_phone,
      health_status,
      // Educational Qualifications
      highest_qualification,
      education_field,
      passing_year,
      percentage_cgpa,
      education_details,
    } = req.body;

    const nameRegex = /^[A-Za-z\s]{2,50}$/;
    if (first_name !== undefined && !nameRegex.test(first_name.trim())) {
      return res.status(400).json({
        success: false,
        message: 'First name must contain only alphabetic characters and be at least 2 characters long.',
      });
    }
    if (last_name !== undefined && !nameRegex.test(last_name.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Last name must contain only alphabetic characters and be at least 2 characters long.',
      });
    }

    let cleanAdminPhone = undefined;
    if (phone !== undefined) {
      if (phone) {
        cleanAdminPhone = sanitizePhone(phone);
        if (!cleanAdminPhone) {
          return res.status(400).json({
            success: false,
            message: 'Phone number must be a valid 10-digit mobile number (e.g. 9876543210 or +91 9876543210).',
          });
        }
      } else {
        cleanAdminPhone = null;
      }
    }

    let cleanAdminEC = undefined;
    if (emergency_contact !== undefined) {
      if (emergency_contact) {
        cleanAdminEC = sanitizePhone(emergency_contact);
        if (!cleanAdminEC) {
          return res.status(400).json({
            success: false,
            message: 'Emergency contact must be a valid 10-digit mobile number.',
          });
        }
      } else {
        cleanAdminEC = null;
      }
    }

    await employee.update({
      first_name: first_name !== undefined ? first_name.trim() : employee.first_name,
      last_name: last_name !== undefined ? last_name.trim() : employee.last_name,
      phone: cleanAdminPhone !== undefined ? cleanAdminPhone : employee.phone,
      gender: gender !== undefined ? gender : employee.gender,
      date_of_birth: date_of_birth !== undefined ? parseDateOrNull(date_of_birth) : employee.date_of_birth,
      designation: designation !== undefined ? designation.trim() : employee.designation,
      department_id: department_id !== undefined ? (department_id ? Number(department_id) : null) : employee.department_id,
      branch_id: branch_id !== undefined ? (branch_id ? Number(branch_id) : null) : employee.branch_id,
      employment_type: employment_type !== undefined ? employment_type : employee.employment_type,
      joining_date: joining_date !== undefined ? (parseDateOrNull(joining_date) || employee.joining_date) : employee.joining_date,
      internship_start_date: internship_start_date !== undefined ? parseDateOrNull(internship_start_date) : employee.internship_start_date,
      internship_end_date: internship_end_date !== undefined ? parseDateOrNull(internship_end_date) : employee.internship_end_date,
      reporting_manager_id: reporting_manager_id !== undefined ? (reporting_manager_id ? Number(reporting_manager_id) : null) : employee.reporting_manager_id,
      skills: skills !== undefined ? skills : employee.skills,
      status: status !== undefined ? status : employee.status,
      address: address !== undefined ? address : employee.address,
      emergency_contact: cleanAdminEC !== undefined ? cleanAdminEC : employee.emergency_contact,
      college: college !== undefined ? college : employee.college,
      course: course !== undefined ? course : employee.course,
      mentor_id: mentor_id !== undefined ? (mentor_id ? Number(mentor_id) : null) : employee.mentor_id,
      profile_photo: profile_photo !== undefined ? profile_photo : employee.profile_photo,
      base_salary: (req.user.role === ROLES.ADMIN && base_salary !== undefined && !isNaN(Number(base_salary))) ? Number(base_salary) : employee.base_salary,
      father_name: father_name !== undefined ? father_name : employee.father_name,
      mother_name: mother_name !== undefined ? mother_name : employee.mother_name,
      blood_group: blood_group !== undefined ? blood_group : employee.blood_group,
      aadhar_number: aadhar_number !== undefined ? aadhar_number : employee.aadhar_number,
      permanent_address: permanent_address !== undefined ? permanent_address : employee.permanent_address,
      religion: religion !== undefined ? religion : employee.religion,
      marital_status: marital_status !== undefined ? marital_status : employee.marital_status,
      medical_conditions: medical_conditions !== undefined ? medical_conditions : employee.medical_conditions,
      allergies: allergies !== undefined ? allergies : employee.allergies,
      insurance_policy_number: insurance_policy_number !== undefined ? insurance_policy_number : employee.insurance_policy_number,
      insurance_provider: insurance_provider !== undefined ? insurance_provider : employee.insurance_provider,
      emergency_doctor_name: emergency_doctor_name !== undefined ? emergency_doctor_name : employee.emergency_doctor_name,
      emergency_doctor_phone: emergency_doctor_phone !== undefined ? emergency_doctor_phone : employee.emergency_doctor_phone,
      health_status: health_status !== undefined ? health_status : employee.health_status,
      highest_qualification: highest_qualification !== undefined ? highest_qualification : employee.highest_qualification,
      education_field: education_field !== undefined ? education_field : employee.education_field,
      passing_year: passing_year !== undefined ? passing_year : employee.passing_year,
      percentage_cgpa: percentage_cgpa !== undefined ? percentage_cgpa : employee.percentage_cgpa,
      education_details: education_details !== undefined ? education_details : employee.education_details,
    });

    // Also update linked user account if status or role or password changed
    if (employee.user) {
      const userUpdates = {};
      if (status !== undefined) {
        userUpdates.is_active = status === EMPLOYEE_STATUS.ACTIVE;
      }
      if (role !== undefined) {
        userUpdates.role = role;
      }
      if (password && password.trim()) {
        userUpdates.password_hash = password.trim();
        userUpdates.saved_password = password.trim();
      }
      if (Object.keys(userUpdates).length > 0) {
        await employee.user.update(userUpdates);
      }
    }

    const updated = await Employee.findByPk(id, {
      include: [
        { model: Department, as: 'department' },
        { model: Branch, as: 'branch' },
        { model: Employee, as: 'reportingManager' },
        { model: Employee, as: 'mentor' },
        {
          model: User,
          as: 'user',
          attributes: (req.user?.role === ROLES.ADMIN || req.user?.role === ROLES.HR)
            ? ['id', 'email', 'role', 'is_active', 'saved_password']
            : ['id', 'email', 'role', 'is_active'],
        },
      ],
    });

    if (req.user?.role === ROLES.HR && updated) {
      if (updated.dataValues) {
        delete updated.dataValues.base_salary;
      }
      updated.base_salary = undefined;
    }

    return res.status(200).json({
      success: true,
      message: 'Employee updated successfully.',
      data: updated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update employee: ' + error.message,
    });
  }
}

/**
 * @route   PUT /api/employees/:id/toggle-status
 * @desc    Toggle employee status between ACTIVE and INACTIVE
 * @access  Protected (ADMIN, HR)
 */
async function toggleStatus(req, res) {
  try {
    const { id } = req.params;
    const employee = await Employee.findByPk(id, {
      include: [{ model: User, as: 'user' }],
    });

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    const newStatus = employee.status === EMPLOYEE_STATUS.ACTIVE ? EMPLOYEE_STATUS.INACTIVE : EMPLOYEE_STATUS.ACTIVE;
    await employee.update({ status: newStatus });

    if (employee.user) {
      await employee.user.update({ is_active: newStatus === EMPLOYEE_STATUS.ACTIVE });
    }

    return res.status(200).json({
      success: true,
      message: `Employee status changed to ${newStatus}.`,
      status: newStatus,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to toggle status: ' + error.message,
    });
  }
}

/**
 * @route   DELETE /api/employees/:id
 * @desc    Permanently delete employee/intern with cascading cleanup or soft deactivate (Admin & HR)
 * @access  Protected (ADMIN, HR)
 */
async function deleteEmployee(req, res) {
  try {
    const { id } = req.params;
    const { soft } = req.query;

    const employee = await Employee.findByPk(id, {
      include: [{ model: User, as: 'user' }],
    });

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    // Safety check: Cannot delete own active logged-in account
    if (req.user && employee.user_id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own active account.',
      });
    }

    // Safety check: HR cannot delete an ADMIN
    if (req.user.role === ROLES.HR && employee.user && employee.user.role === ROLES.ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: HR cannot delete an Administrator account.',
      });
    }

    // Optional soft deactivation if specifically requested
    if (soft === 'true') {
      await employee.update({ status: EMPLOYEE_STATUS.INACTIVE });
      if (employee.user) {
        await employee.user.update({ is_active: false });
      }
      return res.status(200).json({
        success: true,
        message: `Employee '${employee.first_name} ${employee.last_name}' has been deactivated.`,
      });
    }

    // Permanent Cascading Delete
    const employeeName = `${employee.first_name} ${employee.last_name}`;
    const employeeType = employee.employment_type === EMPLOYMENT_TYPES.INTERN ? 'Intern' : 'Employee';
    const userId = employee.user_id;

    // 1. Delete Attendances
    await Attendance.destroy({ where: { employee_id: id } });

    // 2. Delete Leaves and Leave Balances
    await LeaveRequest.destroy({ where: { employee_id: id } });
    await LeaveBalance.destroy({ where: { employee_id: id } });

    // 3. Delete Project Memberships & unassign managed projects
    await ProjectMember.destroy({ where: { employee_id: id } });
    await Project.update({ project_manager_id: null }, { where: { project_manager_id: id } });

    // 4. Delete Payroll records
    await Payroll.destroy({ where: { employee_id: id } });

    // 5. Unassign Tasks
    await Task.update({ assigned_to: null }, { where: { assigned_to: id } });

    // 6. Unset references in other employees (manager or mentor)
    await Employee.update({ reporting_manager_id: null }, { where: { reporting_manager_id: id } });
    await Employee.update({ mentor_id: null }, { where: { mentor_id: id } });

    // 7. Unset leave reviewer
    await LeaveRequest.update({ reviewed_by: null }, { where: { reviewed_by: id } });

    // 8. Destroy Employee
    await employee.destroy();

    // 9. Destroy User account & notifications
    if (userId) {
      await Notification.destroy({ where: { user_id: userId } });
      await User.destroy({ where: { id: userId } });
    }

    return res.status(200).json({
      success: true,
      message: `${employeeType} '${employeeName}' (${employee.employee_code}) has been permanently deleted.`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete employee: ' + error.message,
    });
  }
}

/**
 * @route   PUT /api/employees/:id/reset-password
 * @desc    Admin explicitly resets/sets an employee or intern's password
 * @access  Protected (ADMIN ONLY)
 */
async function resetEmployeePassword(req, res) {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.trim().length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    const employee = await Employee.findByPk(id, {
      include: [{ model: User, as: 'user' }],
    });

    if (!employee || !employee.user) {
      return res.status(404).json({
        success: false,
        message: 'Employee or linked user account not found.',
      });
    }

    const trimmed = newPassword.trim();
    employee.user.password_hash = trimmed;
    employee.user.saved_password = trimmed;
    await employee.user.save();

    return res.status(200).json({
      success: true,
      message: `Password updated successfully for ${employee.first_name} ${employee.last_name}.`,
      credentials: {
        employeeName: `${employee.first_name} ${employee.last_name}`,
        employeeCode: employee.employee_code,
        email: employee.email,
        saved_password: trimmed,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to reset password: ' + error.message,
    });
  }
}

module.exports = {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  toggleStatus,
  deleteEmployee,
  resetEmployeePassword,
};
