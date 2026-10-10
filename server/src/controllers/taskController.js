const { Op } = require('sequelize');
const { Task, Project, Employee, ProjectMember } = require('../models');
const { ROLES, TASK_STATUS, TASK_PRIORITY } = require('../config/constants');
const { notifyAdmins, notifyEmployee } = require('../utils/notify');

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

/**
 * Generate next unique task code
 */
async function generateGlobalTaskCode() {
  const count = await Task.count();
  const codeNumber = String(count + 1).padStart(3, '0');
  const candidate = `TSK-${codeNumber}`;
  const exists = await Task.findOne({ where: { task_code: candidate } });
  if (exists) {
    return `TSK-${Date.now().toString().slice(-4)}`;
  }
  return candidate;
}

/**
 * @route   GET /api/tasks
 * @desc    Get all tasks with filtering (search, project, status, priority, overdue)
 * @access  Protected
 */
async function getTasks(req, res) {
  try {
    const { project_id, status, priority, assigned_to, overdue, search } = req.query;
    const isAdminOrManager = req.user.role === ROLES.ADMIN || req.user.role === ROLES.HR || req.user.role === ROLES.MANAGER;
    const currentEmployeeId = req.employee?.id;

    const where = {};
    const today = new Date().toISOString().split('T')[0];

    // Filter by project
    if (project_id) {
      where.project_id = project_id;
    }

    // Filter by status
    if (status) {
      where.status = status;
    }

    // Filter by priority
    if (priority) {
      where.priority = priority;
    }

    // Overdue filter: due_date < today AND status != COMPLETED
    if (overdue === 'true' || overdue === true) {
      where.due_date = { [Op.lt]: today };
      where.status = { [Op.ne]: TASK_STATUS.COMPLETED };
    }

    // Search filter
    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      where[Op.or] = [
        { title: { [Op.like]: term } },
        { task_code: { [Op.like]: term } },
        { description: { [Op.like]: term } },
      ];
    }

    // Role-based visibility:
    if (!isAdminOrManager) {
      // Normal employee only sees tasks assigned to them
      if (!currentEmployeeId) {
        return res.status(200).json({ success: true, count: 0, data: [] });
      }
      where.assigned_to = currentEmployeeId;
    } else {
      // Admin can filter by specific employee
      if (assigned_to) {
        where.assigned_to = assigned_to;
      }
    }

    const tasks = await Task.findAll({
      where,
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'project_code', 'project_name', 'status'],
        },
        {
          model: Employee,
          as: 'assignee',
          attributes: ['id', 'employee_code', 'first_name', 'last_name', 'email', 'designation'],
        },
      ],
      order: [
        ['due_date', 'ASC'],
        ['created_at', 'DESC'],
      ],
    });

    return res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch tasks: ' + error.message,
    });
  }
}

/**
 * @route   GET /api/tasks/stats
 * @desc    Get counts for dashboard widgets (Pending, Completed, Overdue, Blocked)
 * @access  Protected
 */
async function getTaskStats(req, res) {
  try {
    const isAdminOrManager = req.user.role === ROLES.ADMIN || req.user.role === ROLES.HR || req.user.role === ROLES.MANAGER;
    const currentEmployeeId = req.employee?.id;
    const today = new Date().toISOString().split('T')[0];

    const baseWhere = {};
    if (!isAdminOrManager && currentEmployeeId) {
      baseWhere.assigned_to = currentEmployeeId;
    }

    const [totalTasks, pendingTasks, completedTasks, overdueTasks, blockedTasks] = await Promise.all([
      Task.count({ where: baseWhere }),
      Task.count({
        where: {
          ...baseWhere,
          status: { [Op.in]: [TASK_STATUS.TODO, TASK_STATUS.IN_PROGRESS] },
        },
      }),
      Task.count({
        where: {
          ...baseWhere,
          status: TASK_STATUS.COMPLETED,
        },
      }),
      Task.count({
        where: {
          ...baseWhere,
          due_date: { [Op.lt]: today },
          status: { [Op.ne]: TASK_STATUS.COMPLETED },
        },
      }),
      Task.count({
        where: {
          ...baseWhere,
          status: TASK_STATUS.BLOCKED,
        },
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalTasks,
        pendingTasks,
        completedTasks,
        overdueTasks,
        blockedTasks,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch task statistics: ' + error.message,
    });
  }
}

/**
 * @route   GET /api/tasks/:id
 * @desc    Get single task details
 * @access  Protected
 */
async function getTaskById(req, res) {
  try {
    const { id } = req.params;
    const task = await Task.findByPk(id, {
      include: [
        { model: Project, as: 'project' },
        {
          model: Employee,
          as: 'assignee',
          attributes: ['id', 'employee_code', 'first_name', 'last_name', 'email', 'designation'],
        },
      ],
    });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    const isAdminOrManager = req.user.role === ROLES.ADMIN || req.user.role === ROLES.HR || req.user.role === ROLES.MANAGER;
    const isAssignee = req.employee && req.employee.id === task.assigned_to;

    if (!isAdminOrManager && !isAssignee) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to view this task.',
      });
    }

    return res.status(200).json({ success: true, data: task });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve task: ' + error.message,
    });
  }
}

/**
 * @route   POST /api/tasks
 * @desc    Create a new task
 * @access  Protected (ADMIN, MANAGER)
 */
async function createTask(req, res) {
  try {
    const {
      project_id,
      title,
      description,
      assigned_to,
      priority = TASK_PRIORITY.MEDIUM,
      status = TASK_STATUS.TODO,
      start_date,
      due_date,
      progress_percentage = 0,
    } = req.body;

    if (!title || !project_id) {
      return res.status(400).json({
        success: false,
        message: 'Task title and project assignment are required.',
      });
    }

    const project = await Project.findByPk(project_id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const task_code = await generateGlobalTaskCode();

    const task = await Task.create({
      task_code,
      project_id,
      title: title.trim(),
      description: description ? description.trim() : null,
      assigned_to: parseIdOrNull(assigned_to),
      priority,
      status,
      start_date: parseDateOrNull(start_date),
      due_date: parseDateOrNull(due_date),
      progress_percentage: Number(progress_percentage) || 0,
      completed_at: status === TASK_STATUS.COMPLETED ? new Date() : null,
      completion_notes: req.body.completion_notes || null,
    });

    const fullTask = await Task.findByPk(task.id, {
      include: [
        { model: Project, as: 'project', attributes: ['id', 'project_code', 'project_name'] },
        { model: Employee, as: 'assignee', attributes: ['id', 'first_name', 'last_name', 'email'] },
      ],
    });

    // Notify assigned employee if specified
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

/**
 * @route   PUT /api/tasks/:id
 * @desc    Update task details (Admin has full control; Employee can update status & progress)
 * @access  Protected
 */
async function updateTask(req, res) {
  try {
    const { id } = req.params;
    const task = await Task.findByPk(id);

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    const isAdminOrManager = req.user.role === ROLES.ADMIN || req.user.role === ROLES.HR || req.user.role === ROLES.MANAGER;
    const isAssignee = req.employee && req.employee.id === task.assigned_to;

    if (!isAdminOrManager && !isAssignee) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not assigned to this task.',
      });
    }

    // Role-based field restrictions for standard employee
    if (!isAdminOrManager) {
      const allowedEmployeeFields = ['status', 'progress_percentage', 'completion_notes'];
      const sensitiveAttempted = Object.keys(req.body).filter(
        (key) => !allowedEmployeeFields.includes(key) && req.body[key] !== undefined && req.body[key] !== task[key]
      );

      if (sensitiveAttempted.length > 0) {
        return res.status(403).json({
          success: false,
          message: `Forbidden: Employees can only update task status, progress, and completion notes. Disallowed field(s): [${sensitiveAttempted.join(
            ', '
          )}].`,
        });
      }

      const updates = {};
      if (req.body.status !== undefined) {
        updates.status = req.body.status;
        if (req.body.status === TASK_STATUS.COMPLETED) {
          updates.completed_at = new Date();
          updates.progress_percentage = 100;
        } else if (task.status === TASK_STATUS.COMPLETED && req.body.status !== TASK_STATUS.COMPLETED) {
          updates.completed_at = null;
        }
      }

      if (req.body.progress_percentage !== undefined && req.body.status !== TASK_STATUS.COMPLETED) {
        updates.progress_percentage = Number(req.body.progress_percentage);
      }

      if (req.body.completion_notes !== undefined) {
        updates.completion_notes = req.body.completion_notes ? String(req.body.completion_notes).trim() : null;
      }

      await task.update(updates);

      const updated = await Task.findByPk(id, {
        include: [
          { model: Project, as: 'project', attributes: ['id', 'project_code', 'project_name'] },
          { model: Employee, as: 'assignee', attributes: ['id', 'first_name', 'last_name', 'email'] },
        ],
      });

      // Dispatch real-time notification to Admin & HR
      if (req.employee) {
        try {
          const statusText = updates.status || task.status;
          const noteSnippet = updates.completion_notes ? ` | Remarks: "${updates.completion_notes}"` : '';
          await notifyAdmins({
            title: `Task Status Update: ${task.title}`,
            message: `${req.employee.first_name} ${req.employee.last_name} updated task "${task.title}" on project "${updated.project?.project_name || 'Project'}" to ${statusText} (${updates.progress_percentage ?? task.progress_percentage}% completed)${noteSnippet}.`,
            type: 'TASK_STATUS_UPDATE',
            link: '/admin/tasks',
          });
        } catch (err) {
          console.error('Admin notification error on task update:', err.message);
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Task status updated and leadership notified.',
        data: updated,
      });
    }

    // Admin / Manager full update
    const {
      title,
      description,
      assigned_to,
      priority,
      status,
      start_date,
      due_date,
      progress_percentage,
      completion_notes,
    } = req.body;

    const updates = {
      title: title !== undefined ? title.trim() : task.title,
      description: description !== undefined ? description : task.description,
      assigned_to: assigned_to !== undefined ? parseIdOrNull(assigned_to) : task.assigned_to,
      priority: priority !== undefined ? priority : task.priority,
      status: status !== undefined ? status : task.status,
      start_date: start_date !== undefined ? parseDateOrNull(start_date) : task.start_date,
      due_date: due_date !== undefined ? parseDateOrNull(due_date) : task.due_date,
      progress_percentage: progress_percentage !== undefined ? Number(progress_percentage) : task.progress_percentage,
      completion_notes: completion_notes !== undefined ? (completion_notes ? String(completion_notes).trim() : null) : task.completion_notes,
    };

    if (status === TASK_STATUS.COMPLETED && !task.completed_at) {
      updates.completed_at = new Date();
      updates.progress_percentage = 100;
    } else if (status && status !== TASK_STATUS.COMPLETED) {
      updates.completed_at = null;
    }

    await task.update(updates);

    const updated = await Task.findByPk(id, {
      include: [
        { model: Project, as: 'project', attributes: ['id', 'project_code', 'project_name'] },
        { model: Employee, as: 'assignee', attributes: ['id', 'first_name', 'last_name', 'email'] },
      ],
    });

    // Notify newly assigned or reassigned employee
    if (updates.assigned_to && (updates.assigned_to !== task.assigned_to || !task.assigned_to)) {
      try {
        await notifyEmployee({
          employeeId: updates.assigned_to,
          title: `New Task Assigned: ${updated.title}`,
          message: `You have been assigned to task "${updated.title}" on project "${updated.project?.project_name || 'Project'}" (Target Due Date: ${updated.due_date || 'No deadline'}).`,
          type: 'TASK_ASSIGNED',
          link: '/employee/tasks',
        });
      } catch (err) {
        console.error('Task assignment notification error on update:', err.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Task updated successfully.',
      data: updated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update task: ' + error.message,
    });
  }
}

/**
 * @route   DELETE /api/tasks/:id
 * @desc    Delete task
 * @access  Protected (ADMIN, MANAGER)
 */
async function deleteTask(req, res) {
  try {
    const { id } = req.params;
    const task = await Task.findByPk(id);

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    await task.destroy();

    return res.status(200).json({
      success: true,
      message: `Task '${task.title}' has been deleted.`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete task: ' + error.message,
    });
  }
}

module.exports = {
  getTasks,
  getTaskStats,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
};
