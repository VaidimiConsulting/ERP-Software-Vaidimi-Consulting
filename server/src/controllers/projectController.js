const { Op } = require('sequelize');
const { Project, ProjectMember, ProjectMilestone, Task, Employee, Department, Branch } = require('../models');
const { ROLES, PROJECT_STATUS, PROJECT_PRIORITY } = require('../config/constants');
const { notifyEmployee } = require('../utils/notify');

/**
 * Generate next unique project code
 */
async function generateProjectCode() {
  const count = await Project.count();
  const codeNumber = String(count + 1).padStart(3, '0');
  const candidate = `PRJ-${codeNumber}`;
  const exists = await Project.findOne({ where: { project_code: candidate } });
  if (exists) {
    return `PRJ-${Date.now().toString().slice(-4)}`;
  }
  return candidate;
}

/**
 * Generate next unique task code
 */
function parseDateOrNull(val) {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  if (s === '' || s === 'null' || s === 'undefined' || s === 'Invalid date') return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return s.split('T')[0];
}

function parseIdOrNull(val) {
  if (val === null || val === undefined || val === '') return null;
  const num = Number(val);
  return isNaN(num) || num <= 0 ? null : num;
}

async function generateTaskCode(projectId) {
  const count = await Task.count({ where: { project_id: projectId } });
  const codeNumber = String(count + 1).padStart(3, '0');
  return `TSK-${codeNumber}`;
}

/**
 * @route   GET /api/projects
 * @desc    Get all projects (Admin/Manager gets all, Employee gets only assigned)
 * @access  Protected
 */
async function getProjects(req, res) {
  try {
    const { status, priority, search, branch_id } = req.query;
    const isAdminOrManager = req.user.role === ROLES.ADMIN || req.user.role === ROLES.HR || req.user.role === ROLES.MANAGER;
    const currentEmployeeId = req.employee?.id;

    const where = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (branch_id) where.branch_id = Number(branch_id);

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      where[Op.or] = [
        { project_name: { [Op.like]: term } },
        { project_code: { [Op.like]: term } },
        { client_name: { [Op.like]: term } },
        { technology_stack: { [Op.like]: term } },
        { description: { [Op.like]: term } },
      ];
    }

    // Role-based visibility rule
    if (!isAdminOrManager) {
      if (!currentEmployeeId) {
        return res.status(200).json({ success: true, count: 0, data: [] });
      }

      // Find project IDs where employee is either a member or the project manager
      const memberProjects = await ProjectMember.findAll({
        where: { employee_id: currentEmployeeId },
        attributes: ['project_id'],
      });
      const assignedIds = memberProjects.map((m) => m.project_id);

      where[Op.or] = [
        { id: { [Op.in]: assignedIds } },
        { project_manager_id: currentEmployeeId },
      ];
    }

    const projects = await Project.findAll({
      where,
      include: [
        {
          model: Branch,
          as: 'branch',
          attributes: ['id', 'branch_code', 'branch_name', 'city'],
        },
        {
          model: Employee,
          as: 'manager',
          attributes: ['id', 'first_name', 'last_name', 'email', 'designation'],
        },
        {
          model: Employee,
          as: 'members',
          attributes: ['id', 'first_name', 'last_name', 'email', 'designation', 'employment_type'],
          through: { attributes: ['role_in_project', 'assigned_date'] },
        },
        {
          model: ProjectMilestone,
          as: 'milestones',
          attributes: ['id', 'title', 'due_date', 'status', 'completion_percentage'],
        },
        {
          model: Task,
          as: 'tasks',
          attributes: ['id', 'title', 'status', 'priority', 'progress_percentage'],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    return res.status(200).json({
      success: true,
      count: projects.length,
      data: projects,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch projects: ' + error.message,
    });
  }
}

/**
 * @route   GET /api/projects/:id
 * @desc    Get single project details (Overview, Team, Timeline, Milestones, Tasks)
 * @access  Protected (Admin, Manager, or Assigned Employee)
 */
async function getProjectById(req, res) {
  try {
    const { id } = req.params;
    const isAdminOrManager = req.user.role === ROLES.ADMIN || req.user.role === ROLES.HR || req.user.role === ROLES.MANAGER;
    const currentEmployeeId = req.employee?.id;

    const project = await Project.findByPk(id, {
      include: [
        {
          model: Branch,
          as: 'branch',
          attributes: ['id', 'branch_code', 'branch_name', 'city', 'address'],
        },
        {
          model: Employee,
          as: 'manager',
          attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'designation'],
        },
        {
          model: ProjectMember,
          as: 'projectMembers',
          include: [
            {
              model: Employee,
              as: 'employee',
              attributes: ['id', 'employee_code', 'first_name', 'last_name', 'email', 'phone', 'designation', 'employment_type'],
              include: [{ model: Department, as: 'department', attributes: ['id', 'department_name'] }],
            },
          ],
        },
        {
          model: ProjectMilestone,
          as: 'milestones',
          order: [['due_date', 'ASC']],
        },
        {
          model: Task,
          as: 'tasks',
          include: [
            {
              model: Employee,
              as: 'assignee',
              attributes: ['id', 'first_name', 'last_name', 'email', 'designation'],
            },
          ],
          order: [['due_date', 'ASC']],
        },
      ],
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.',
      });
    }

    // Role-based authorization rule for single project
    if (!isAdminOrManager) {
      const isManager = project.project_manager_id === currentEmployeeId;
      const isMember = project.projectMembers.some((pm) => pm.employee_id === currentEmployeeId);

      if (!isManager && !isMember) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You are not assigned to this project.',
        });
      }
    }

    return res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch project details: ' + error.message,
    });
  }
}

/**
 * @route   POST /api/projects
 * @desc    Create a new project with optional team members
 * @access  Protected (ADMIN, MANAGER)
 */
async function createProject(req, res) {
  try {
    const {
      project_name,
      client_name,
      description,
      technology_stack,
      priority = PROJECT_PRIORITY.MEDIUM,
      project_manager_id,
      start_date,
      expected_end_date,
      actual_end_date,
      branch_id,
      status = PROJECT_STATUS.NOT_STARTED,
      completion_percentage = 0,
      members = [],
    } = req.body;

    const cleanStartDate = parseDateOrNull(start_date);
    const cleanExpectedEndDate = parseDateOrNull(expected_end_date);
    const cleanActualEndDate = parseDateOrNull(actual_end_date);

    if (!project_name || !cleanStartDate || !cleanExpectedEndDate) {
      return res.status(400).json({
        success: false,
        message: 'Project name, start date, and expected end date are required.',
      });
    }

    const project_code = await generateProjectCode();

    const project = await Project.create({
      project_code,
      project_name: project_name.trim(),
      client_name: client_name ? client_name.trim() : null,
      description: description ? description.trim() : null,
      technology_stack: technology_stack ? technology_stack.trim() : null,
      priority,
      project_manager_id: parseIdOrNull(project_manager_id),
      start_date: cleanStartDate,
      expected_end_date: cleanExpectedEndDate,
      actual_end_date: cleanActualEndDate,
      branch_id: branch_id ? Number(branch_id) : null,
      status,
      completion_percentage: Number(completion_percentage) || 0,
    });

    // Assign team members if supplied
    if (Array.isArray(members) && members.length > 0) {
      for (const m of members) {
        const empId = typeof m === 'object' ? m.employee_id : m;
        const roleInProj = typeof m === 'object' ? m.role_in_project : 'Project Member';
        if (empId) {
          await ProjectMember.create({
            project_id: project.id,
            employee_id: empId,
            role_in_project: roleInProj || 'Project Member',
            assigned_date: start_date || new Date(),
          });

          try {
            await notifyEmployee({
              employeeId: empId,
              title: `Assigned to Project: ${project.project_name}`,
              message: `You have been allocated to the project "${project.project_name}" as "${roleInProj || 'Project Member'}".`,
              type: 'PROJECT_ASSIGNED',
              link: '/employee/projects',
            });
          } catch (notifErr) {
            console.error('Project member notification error:', notifErr.message);
          }
        }
      }
    }

    const created = await Project.findByPk(project.id, {
      include: [
        { model: Employee, as: 'manager' },
        { model: Employee, as: 'members' },
      ],
    });

    return res.status(201).json({
      success: true,
      message: 'Project created successfully.',
      data: created,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create project: ' + error.message,
    });
  }
}

/**
 * @route   PUT /api/projects/:id
 * @desc    Update project details, status, or progress
 * @access  Protected (ADMIN, MANAGER)
 */
async function updateProject(req, res) {
  try {
    const { id } = req.params;
    const project = await Project.findByPk(id);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const {
      project_name,
      client_name,
      description,
      technology_stack,
      priority,
      project_manager_id,
      start_date,
      expected_end_date,
      actual_end_date,
      branch_id,
      status,
      completion_percentage,
    } = req.body;

    await project.update({
      project_name: project_name !== undefined ? (project_name ? project_name.trim() : project.project_name) : project.project_name,
      client_name: client_name !== undefined ? (client_name ? client_name.trim() : null) : project.client_name,
      description: description !== undefined ? (description ? description.trim() : null) : project.description,
      technology_stack: technology_stack !== undefined ? (technology_stack ? technology_stack.trim() : null) : project.technology_stack,
      priority: priority !== undefined ? priority : project.priority,
      project_manager_id: project_manager_id !== undefined ? parseIdOrNull(project_manager_id) : project.project_manager_id,
      start_date: start_date !== undefined ? (parseDateOrNull(start_date) || project.start_date) : project.start_date,
      expected_end_date: expected_end_date !== undefined ? (parseDateOrNull(expected_end_date) || project.expected_end_date) : project.expected_end_date,
      actual_end_date: actual_end_date !== undefined ? parseDateOrNull(actual_end_date) : project.actual_end_date,
      branch_id: branch_id !== undefined ? (branch_id ? Number(branch_id) : null) : project.branch_id,
      status: status !== undefined ? status : project.status,
      completion_percentage: completion_percentage !== undefined ? Number(completion_percentage) : project.completion_percentage,
    });

    const updated = await Project.findByPk(id, {
      include: [
        { model: Employee, as: 'manager' },
        { model: Employee, as: 'members' },
      ],
    });

    return res.status(200).json({
      success: true,
      message: 'Project updated successfully.',
      data: updated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update project: ' + error.message,
    });
  }
}

/**
 * @route   DELETE /api/projects/:id
 * @desc    Delete project (Cascade deletes members, milestones, tasks)
 * @access  Protected (ADMIN)
 */
async function deleteProject(req, res) {
  try {
    const { id } = req.params;
    const project = await Project.findByPk(id);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    await project.destroy();

    return res.status(200).json({
      success: true,
      message: `Project '${project.project_name}' has been deleted.`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete project: ' + error.message,
    });
  }
}

/**
 * @route   POST /api/projects/:id/members
 * @desc    Assign an employee or intern to project
 * @access  Protected (ADMIN, MANAGER)
 */
async function addProjectMember(req, res) {
  try {
    const { id } = req.params;
    const { employee_id, role_in_project = 'Project Member', assigned_date } = req.body;

    if (!employee_id) {
      return res.status(400).json({ success: false, message: 'Employee ID is required.' });
    }

    const project = await Project.findByPk(id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const employee = await Employee.findByPk(employee_id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    const existing = await ProjectMember.findOne({
      where: { project_id: id, employee_id },
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `${employee.first_name} ${employee.last_name} is already a member of this project.`,
      });
    }

    const member = await ProjectMember.create({
      project_id: id,
      employee_id,
      role_in_project: role_in_project.trim(),
      assigned_date: assigned_date || new Date(),
    });

    try {
      await notifyEmployee({
        employeeId: employee_id,
        title: `Assigned to Project: ${project.project_name}`,
        message: `You have been allocated to the project "${project.project_name}" as "${role_in_project.trim()}".`,
        type: 'PROJECT_ASSIGNED',
        link: '/employee/projects',
      });
    } catch (notifErr) {
      console.error('Project member notification error:', notifErr.message);
    }

    return res.status(201).json({
      success: true,
      message: `${employee.first_name} ${employee.last_name} assigned to project.`,
      data: member,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to add project member: ' + error.message,
    });
  }
}

/**
 * @route   DELETE /api/projects/:id/members/:employeeId
 * @desc    Remove an employee/intern from project
 * @access  Protected (ADMIN, MANAGER)
 */
async function removeProjectMember(req, res) {
  try {
    const { id, employeeId } = req.params;

    const member = await ProjectMember.findOne({
      where: { project_id: id, employee_id: employeeId },
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member assignment not found on this project.',
      });
    }

    await member.destroy();

    return res.status(200).json({
      success: true,
      message: 'Member removed from project.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to remove project member: ' + error.message,
    });
  }
}

/**
 * @route   POST /api/projects/:id/milestones
 * @desc    Add milestone to project
 * @access  Protected (ADMIN, MANAGER)
 */
async function createMilestone(req, res) {
  try {
    const { id } = req.params;
    const { title, description, start_date, due_date, completion_percentage = 0, status = 'NOT_STARTED' } = req.body;

    if (!title || !due_date) {
      return res.status(400).json({ success: false, message: 'Milestone title and due date are required.' });
    }

    const project = await Project.findByPk(id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const milestone = await ProjectMilestone.create({
      project_id: id,
      title: title.trim(),
      description: description ? description.trim() : null,
      start_date: parseDateOrNull(start_date),
      due_date: parseDateOrNull(due_date) || due_date,
      completion_percentage: Number(completion_percentage) || 0,
      status,
    });

    return res.status(201).json({
      success: true,
      message: 'Milestone created successfully.',
      data: milestone,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create milestone: ' + error.message,
    });
  }
}

/**
 * @route   PUT /api/projects/:id/milestones/:milestoneId
 * @desc    Update milestone
 * @access  Protected (ADMIN, MANAGER)
 */
async function updateMilestone(req, res) {
  try {
    const { milestoneId } = req.params;
    const milestone = await ProjectMilestone.findByPk(milestoneId);

    if (!milestone) {
      return res.status(404).json({ success: false, message: 'Milestone not found.' });
    }

    const { title, description, start_date, due_date, completion_percentage, status } = req.body;

    await milestone.update({
      title: title !== undefined ? title.trim() : milestone.title,
      description: description !== undefined ? description : milestone.description,
      start_date: start_date !== undefined ? parseDateOrNull(start_date) : milestone.start_date,
      due_date: due_date !== undefined ? (parseDateOrNull(due_date) || milestone.due_date) : milestone.due_date,
      completion_percentage: completion_percentage !== undefined ? Number(completion_percentage) : milestone.completion_percentage,
      status: status !== undefined ? status : milestone.status,
    });

    return res.status(200).json({
      success: true,
      message: 'Milestone updated successfully.',
      data: milestone,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update milestone: ' + error.message,
    });
  }
}

/**
 * @route   DELETE /api/projects/:id/milestones/:milestoneId
 * @desc    Delete milestone
 * @access  Protected (ADMIN, MANAGER)
 */
async function deleteMilestone(req, res) {
  try {
    const { milestoneId } = req.params;
    const milestone = await ProjectMilestone.findByPk(milestoneId);

    if (!milestone) {
      return res.status(404).json({ success: false, message: 'Milestone not found.' });
    }

    await milestone.destroy();

    return res.status(200).json({
      success: true,
      message: 'Milestone deleted.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete milestone: ' + error.message,
    });
  }
}

/**
 * @route   POST /api/projects/:id/tasks
 * @desc    Create a task inside a project
 * @access  Protected
 */
async function createProjectTask(req, res) {
  try {
    const { id } = req.params;
    const { title, description, assigned_to, priority, status, start_date, due_date, progress_percentage } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Task title is required.' });
    }

    const project = await Project.findByPk(id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const task_code = await generateTaskCode(id);

    const task = await Task.create({
      task_code,
      project_id: id,
      title: title.trim(),
      description: description ? description.trim() : null,
      assigned_to: parseIdOrNull(assigned_to),
      priority: priority || 'MEDIUM',
      status: status || 'TODO',
      start_date: parseDateOrNull(start_date),
      due_date: parseDateOrNull(due_date),
      progress_percentage: Number(progress_percentage) || 0,
      completion_notes: req.body.completion_notes || null,
    });

    if (task.assigned_to) {
      try {
        await notifyEmployee({
          employeeId: task.assigned_to,
          title: `New Task Assigned: ${task.title}`,
          message: `You have been assigned to task "${task.title}" on project "${project.project_name}" (Target Due Date: ${task.due_date || 'No deadline'}).`,
          type: 'TASK_ASSIGNED',
          link: '/employee/tasks',
        });
      } catch (err) {
        console.error('Task assignment notification error:', err.message);
      }
    }

    const fullTask = await Task.findByPk(task.id, {
      include: [{ model: Employee, as: 'assignee', attributes: ['id', 'first_name', 'last_name', 'email'] }],
    });

    return res.status(201).json({
      success: true,
      message: 'Task created successfully.',
      data: fullTask,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create task: ' + error.message,
    });
  }
}

module.exports = {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  addProjectMember,
  removeProjectMember,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  createProjectTask,
};
