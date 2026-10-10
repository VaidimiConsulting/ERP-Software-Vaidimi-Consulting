const { Op } = require('sequelize');
const { Holiday, LeaveRequest, Project, ProjectMilestone, CompanyEvent, Employee } = require('../models');
const { ROLES, LEAVE_TYPES, LEAVE_STATUS } = require('../config/constants');
const { maskLeavePrivacy } = require('./leaveController');

/**
 * @route   GET /api/calendar/events
 * @desc    Unified calendar event aggregator (Holidays, Leaves, Deadlines, Milestones, Events)
 * @access  Protected
 */
async function getCalendarEvents(req, res) {
  try {
    const { start, end, filter = 'ALL' } = req.query;
    const isAdminOrManager = req.user.role === ROLES.ADMIN || req.user.role === ROLES.MANAGER;
    const viewingEmployeeId = req.employee?.id;

    const events = [];

    // Date range boundaries (unlimited enterprise search window from 1900 to 2199+)
    const startDate = start ? String(start).substring(0, 10) : '1900-01-01';
    const endDate = end ? String(end).substring(0, 10) : '2199-12-31';

    // 1. Company Holidays (Emerald #10b981)
    if (filter === 'ALL' || filter === 'HOLIDAYS') {
      const holidays = await Holiday.findAll({
        where: {
          date: { [Op.between]: [startDate, endDate] },
        },
      });
      holidays.forEach((h) => {
        events.push({
          id: `holiday-${h.id}`,
          title: `🎉 ${h.name} (${h.is_paid ? 'Paid' : 'Unpaid'})`,
          start: h.date,
          allDay: true,
          backgroundColor: '#10b981',
          borderColor: '#059669',
          textColor: '#ffffff',
          extendedProps: {
            category: 'HOLIDAY',
            description: h.description,
            is_paid: h.is_paid,
            applicable_to: h.applicable_to,
          },
        });
      });
    }

    // 2. Approved Employee Leaves (Amber #f59e0b)
    if (filter === 'ALL' || filter === 'LEAVES') {
      const leaves = await LeaveRequest.findAll({
        where: {
          status: LEAVE_STATUS.APPROVED,
          [Op.or]: [
            { start_date: { [Op.between]: [startDate, endDate] } },
            { end_date: { [Op.between]: [startDate, endDate] } },
            {
              [Op.and]: [
                { start_date: { [Op.lte]: startDate } },
                { end_date: { [Op.gte]: endDate } },
              ],
            },
          ],
        },
        include: [
          {
            model: Employee,
            as: 'employee',
            attributes: ['id', 'employee_code', 'first_name', 'last_name', 'email'],
          },
        ],
      });

      leaves.forEach((l) => {
        const masked = maskLeavePrivacy(l, req.user, viewingEmployeeId);
        const empName = masked.employee ? `${masked.employee.first_name} ${masked.employee.last_name}` : 'Team Member';
        const leaveLabel = masked.leave_type === 'PERSONAL_LEAVE' ? 'Personal Leave' : masked.leave_type.replace(/_/g, ' ');

        events.push({
          id: `leave-${masked.id}`,
          title: `🏖️ ${empName}: ${leaveLabel}`,
          start: masked.start_date,
          // FullCalendar end date is exclusive for all-day events, so add 1 day to end_date
          end: new Date(new Date(masked.end_date).getTime() + 86400000).toISOString().split('T')[0],
          allDay: true,
          backgroundColor: '#f59e0b',
          borderColor: '#d97706',
          textColor: '#ffffff',
          extendedProps: {
            category: 'LEAVE',
            leave_id: masked.id,
            employee_name: empName,
            employee_code: masked.employee?.employee_code || '',
            leave_type: masked.leave_type,
            start_date: masked.start_date,
            end_date: masked.end_date,
            reason: masked.reason,
            total_days: masked.total_days,
            is_masked: masked.is_masked || false,
          },
        });
      });
    }

    // 3. Project Deadlines (Rose #e11d48)
    if (filter === 'ALL' || filter === 'PROJECTS') {
      const projectWhere = {
        expected_end_date: { [Op.between]: [startDate, endDate] },
      };

      // If employee, only projects they are member of
      const includeOptions = [];
      if (!isAdminOrManager) {
        projectWhere['$members.id$'] = viewingEmployeeId;
        includeOptions.push({
          model: Employee,
          as: 'members',
          attributes: ['id'],
          through: { attributes: [] },
        });
      }

      const projects = await Project.findAll({
        where: projectWhere,
        include: includeOptions,
      });

      projects.forEach((p) => {
        events.push({
          id: `project-${p.id}`,
          title: `🎯 Deadline: ${p.project_name} (${p.completion_percentage}%)`,
          start: p.expected_end_date,
          allDay: true,
          backgroundColor: '#e11d48',
          borderColor: '#be123c',
          textColor: '#ffffff',
          extendedProps: {
            category: 'PROJECT_DEADLINE',
            project_id: p.id,
            project_code: p.project_code,
            status: p.status,
            priority: p.priority,
            completion_percentage: p.completion_percentage,
          },
        });
      });
    }

    // 4. Project Milestones (Indigo #6366f1)
    if (filter === 'ALL' || filter === 'MILESTONES' || filter === 'PROJECTS') {
      const milestones = await ProjectMilestone.findAll({
        where: {
          due_date: { [Op.between]: [startDate, endDate] },
        },
        include: [
          {
            model: Project,
            as: 'project',
            attributes: ['id', 'project_code', 'project_name'],
          },
        ],
      });

      milestones.forEach((m) => {
        events.push({
          id: `milestone-${m.id}`,
          title: `🚩 Milestone: ${m.title} [${m.project?.project_code || 'PRJ'}]`,
          start: m.due_date,
          allDay: true,
          backgroundColor: '#6366f1',
          borderColor: '#4f46e5',
          textColor: '#ffffff',
          extendedProps: {
            category: 'MILESTONE',
            milestone_id: m.id,
            status: m.status,
            completion_percentage: m.completion_percentage,
            project_name: m.project?.project_name,
          },
        });
      });
    }

    // 5. Company Events & Meetings (Purple #8b5cf6)
    if (filter === 'ALL' || filter === 'EVENTS') {
      const companyEvents = await CompanyEvent.findAll({
        where: {
          start_date: {
            [Op.between]: [new Date(startDate), new Date(`${endDate}T23:59:59`)],
          },
        },
      });

      companyEvents.forEach((e) => {
        events.push({
          id: `event-${e.id}`,
          title: `📌 ${e.title}`,
          start: e.start_date,
          end: e.end_date || undefined,
          allDay: e.is_all_day,
          backgroundColor: '#8b5cf6',
          borderColor: '#7c3aed',
          textColor: '#ffffff',
          extendedProps: {
            category: 'EVENT',
            event_type: e.event_type,
            location: e.location,
            description: e.description,
          },
        });
      });
    }

    return res.status(200).json({
      success: true,
      count: events.length,
      data: events,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to aggregate calendar events: ' + error.message,
    });
  }
}

/**
 * @route   POST /api/calendar/events
 * @desc    Create company event
 * @access  Protected (ADMIN, MANAGER)
 */
async function createCompanyEvent(req, res) {
  try {
    const { title, description, event_type = 'EVENT', start_date, end_date, is_all_day = true, location } = req.body;

    if (!title || !start_date) {
      return res.status(400).json({
        success: false,
        message: 'Event title and start date are required.',
      });
    }

    const event = await CompanyEvent.create({
      title: title.trim(),
      description: description ? description.trim() : null,
      event_type,
      start_date,
      end_date: end_date || null,
      is_all_day,
      location: location ? location.trim() : null,
      created_by: req.employee?.id || null,
    });

    return res.status(201).json({
      success: true,
      message: 'Company event created successfully.',
      data: event,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create company event: ' + error.message,
    });
  }
}

/**
 * @route   DELETE /api/calendar/events/:id
 * @desc    Delete company event
 * @access  Protected (ADMIN, MANAGER)
 */
async function deleteCompanyEvent(req, res) {
  try {
    const { id } = req.params;
    const event = await CompanyEvent.findByPk(id);

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    await event.destroy();

    return res.status(200).json({
      success: true,
      message: 'Company event deleted successfully.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete company event: ' + error.message,
    });
  }
}

module.exports = {
  getCalendarEvents,
  createCompanyEvent,
  deleteCompanyEvent,
};
