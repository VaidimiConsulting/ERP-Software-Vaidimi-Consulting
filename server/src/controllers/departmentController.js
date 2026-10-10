const { Department, Employee } = require('../models');

/**
 * @route   GET /api/departments
 * @desc    Get all departments with employee counts
 * @access  Protected
 */
async function getDepartments(req, res) {
  try {
    const departments = await Department.findAll({
      include: [
        {
          model: Employee,
          as: 'employees',
          attributes: ['id', 'first_name', 'last_name', 'employment_type'],
        },
      ],
      order: [['department_name', 'ASC']],
    });

    const formatted = departments.map((d) => ({
      id: d.id,
      department_name: d.department_name,
      description: d.description,
      total_employees: d.employees ? d.employees.length : 0,
    }));

    return res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch departments: ' + error.message,
    });
  }
}

/**
 * @route   POST /api/departments
 * @desc    Create a new department
 * @access  Protected (ADMIN)
 */
async function createDepartment(req, res) {
  try {
    const { department_name, description } = req.body;
    if (!department_name) {
      return res.status(400).json({
        success: false,
        message: 'Department name is required.',
      });
    }

    const existing = await Department.findOne({
      where: { department_name: department_name.trim() },
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A department with this name already exists.',
      });
    }

    const department = await Department.create({
      department_name: department_name.trim(),
      description: description ? description.trim() : null,
    });

    return res.status(201).json({
      success: true,
      message: 'Department created successfully.',
      data: department,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create department: ' + error.message,
    });
  }
}

module.exports = {
  getDepartments,
  createDepartment,
};
