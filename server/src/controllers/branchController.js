const { Op } = require('sequelize');
const { Branch, Employee, Department, Project, User } = require('../models');
const { ROLES } = require('../config/constants');

/**
 * @route   GET /api/branches
 * @desc    Get all branches with employee & intern counts
 * @access  Protected (All authenticated staff can view branches)
 */
async function getBranches(req, res) {
  try {
    const branches = await Branch.findAll({
      order: [['id', 'ASC']],
      include: [
        {
          model: Employee,
          as: 'branchHead',
          attributes: ['id', 'first_name', 'last_name', 'email', 'designation', 'profile_photo'],
        },
      ],
    });

    // Compute stats for each branch
    const branchesWithStats = await Promise.all(
      branches.map(async (b) => {
        const totalStaff = await Employee.count({
          where: { branch_id: b.id, status: 'ACTIVE' },
        });
        const totalEmployees = await Employee.count({
          where: { branch_id: b.id, employment_type: 'EMPLOYEE', status: 'ACTIVE' },
        });
        const totalInterns = await Employee.count({
          where: { branch_id: b.id, employment_type: 'INTERN', status: 'ACTIVE' },
        });
        const totalProjects = await Project.count({
          where: { branch_id: b.id },
        });

        const json = b.toJSON();
        return {
          ...json,
          totalStaff,
          totalEmployees,
          totalInterns,
          totalProjects,
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: branchesWithStats,
      totalCount: branchesWithStats.length,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * @route   GET /api/branches/:id
 * @desc    Get single branch details with staff roster
 * @access  Protected
 */
async function getBranchById(req, res) {
  try {
    const branch = await Branch.findByPk(req.params.id, {
      include: [
        {
          model: Employee,
          as: 'branchHead',
          attributes: ['id', 'first_name', 'last_name', 'email', 'designation', 'profile_photo', 'phone'],
        },
        {
          model: Employee,
          as: 'employees',
          attributes: [
            'id',
            'first_name',
            'last_name',
            'email',
            'designation',
            'employment_type',
            'status',
            'profile_photo',
            'department_id',
          ],
          include: [
            {
              model: Department,
              as: 'department',
              attributes: ['id', 'department_name'],
            },
          ],
        },
        {
          model: Project,
          as: 'projects',
          attributes: ['id', 'project_code', 'project_name', 'status', 'priority'],
        },
      ],
    });

    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found.' });
    }

    return res.status(200).json({ success: true, data: branch });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * @route   POST /api/branches
 * @desc    Create a new company branch
 * @access  Protected (Admin only)
 */
async function createBranch(req, res) {
  try {
    const {
      branch_code,
      branch_name,
      city,
      state,
      address,
      phone,
      email,
      branch_head_id,
    } = req.body;

    if (!branch_name || !branch_name.trim()) {
      return res.status(400).json({ success: false, message: 'Branch name is required.' });
    }
    if (!city || !city.trim()) {
      return res.status(400).json({ success: false, message: 'City is required.' });
    }

    // Auto-generate code if missing
    let code = branch_code?.trim()?.toUpperCase();
    if (!code) {
      const count = await Branch.count();
      code = `BR-${city.slice(0, 3).toUpperCase()}-${String(count + 1).padStart(2, '0')}`;
    }

    const exists = await Branch.findOne({ where: { branch_code: code } });
    if (exists) {
      return res.status(400).json({ success: false, message: `Branch code ${code} is already in use.` });
    }

    const branch = await Branch.create({
      branch_code: code,
      branch_name: branch_name.trim(),
      city: city.trim(),
      state: state?.trim() || null,
      address: address?.trim() || null,
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      branch_head_id: branch_head_id ? Number(branch_head_id) : null,
      is_active: true,
    });

    return res.status(201).json({
      success: true,
      message: `Branch "${branch.branch_name}" created successfully.`,
      data: branch,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * @route   PUT /api/branches/:id
 * @desc    Update branch details
 * @access  Protected (Admin only)
 */
async function updateBranch(req, res) {
  try {
    const branch = await Branch.findByPk(req.params.id);
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found.' });
    }

    const {
      branch_code,
      branch_name,
      city,
      state,
      address,
      phone,
      email,
      branch_head_id,
      is_active,
    } = req.body;

    if (branch_code && branch_code !== branch.branch_code) {
      const exists = await Branch.findOne({
        where: { branch_code: branch_code.trim().toUpperCase(), id: { [Op.ne]: branch.id } },
      });
      if (exists) {
        return res.status(400).json({ success: false, message: `Branch code is already in use.` });
      }
      branch.branch_code = branch_code.trim().toUpperCase();
    }

    if (branch_name) branch.branch_name = branch_name.trim();
    if (city) branch.city = city.trim();
    if (state !== undefined) branch.state = state ? state.trim() : null;
    if (address !== undefined) branch.address = address ? address.trim() : null;
    if (phone !== undefined) branch.phone = phone ? phone.trim() : null;
    if (email !== undefined) branch.email = email ? email.trim() : null;
    if (branch_head_id !== undefined) {
      branch.branch_head_id = branch_head_id ? Number(branch_head_id) : null;
    }
    if (is_active !== undefined) branch.is_active = Boolean(is_active);

    await branch.save();

    return res.status(200).json({
      success: true,
      message: `Branch updated successfully.`,
      data: branch,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * @route   DELETE /api/branches/:id
 * @desc    Deactivate or remove branch
 * @access  Protected (Admin only)
 */
async function deleteBranch(req, res) {
  try {
    const branch = await Branch.findByPk(req.params.id);
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found.' });
    }

    // Check if staff assigned
    const staffCount = await Employee.count({ where: { branch_id: branch.id } });
    if (staffCount > 0) {
      // Soft-deactivate rather than delete to preserve integrity
      branch.is_active = false;
      await branch.save();
      return res.status(200).json({
        success: true,
        message: `Branch has ${staffCount} staff members assigned. It has been marked inactive.`,
        data: branch,
      });
    }

    await branch.destroy();
    return res.status(200).json({
      success: true,
      message: 'Branch removed successfully.',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  getBranches,
  getBranchById,
  createBranch,
  updateBranch,
  deleteBranch,
};
