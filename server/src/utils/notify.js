const { Notification, User, Employee } = require('../models');
const { ROLES } = require('../config/constants');
const { emitToUser } = require('../config/socket');
const { sendEmail, getBrandedEmailHtml } = require('../services/emailService');

/**
 * Send notification to a specific user (Database + Real-Time Socket + Email)
 */
async function notifyUser({ userId, title, message, type = 'SYSTEM', link = null, sendEmailNotification = true }) {
  try {
    if (!userId) return null;
    const notification = await Notification.create({
      user_id: userId,
      title,
      message,
      type,
      link,
      is_read: false,
    });

    // 1. Real-time Socket.IO push
    try {
      emitToUser(userId, 'new_notification', {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        link: notification.link,
        created_at: notification.created_at,
      });
    } catch (sockErr) {
      console.warn('[Socket Notification Warn]', sockErr.message);
    }

    // 2. Asynchronous email dispatch (non-blocking)
    if (sendEmailNotification) {
      User.findByPk(userId, { attributes: ['email'] }).then((u) => {
        if (u && u.email) {
          const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
          const html = getBrandedEmailHtml({
            title,
            preheader: message,
            bodyHtml: `<p>${message}</p>`,
            actionUrl: link ? `${clientUrl}${link}` : `${clientUrl}/employee/dashboard`,
            actionText: 'Open in Workspace',
          });
          sendEmail({
            to: u.email,
            subject: `[Vaidimi Workspace] ${title}`,
            html,
          }).catch((e) => console.warn('[Email Notify Warn]', e.message));
        }
      }).catch((e) => console.warn('[Email User Lookup Warn]', e.message));
    }

    return notification;
  } catch (error) {
    console.error('Failed to create notification:', error.message);
    return null;
  }
}

/**
 * Notify all admins and managers
 */
async function notifyAdmins({ title, message, type = 'SYSTEM', link = null }) {
  try {
    const adminUsers = await User.findAll({
      where: {
        role: [ROLES.ADMIN, ROLES.HR, ROLES.MANAGER],
        is_active: true,
      },
    });

    const notifications = adminUsers.map((user) => ({
      user_id: user.id,
      title,
      message,
      type,
      link,
      is_read: false,
    }));

    if (notifications.length > 0) {
      await Notification.bulkCreate(notifications);
      // Real-time socket broadcast to each admin
      adminUsers.forEach((admin) => {
        emitToUser(admin.id, 'new_notification', {
          title,
          message,
          type,
          link,
          created_at: new Date(),
        });
      });
    }
  } catch (error) {
    console.error('Failed to notify admins:', error.message);
  }
}

/**
 * Notify ADMIN users exclusively (excludes HR & Manager)
 * Used when employees update profile/settings or sensitive actions occur
 */
async function notifyAdminsOnly({ title, message, type = 'PROFILE_UPDATE', link = null, details = null }) {
  try {
    const adminUsers = await User.findAll({
      where: {
        role: ROLES.ADMIN,
        is_active: true,
      },
    });

    const notifications = adminUsers.map((user) => ({
      user_id: user.id,
      title,
      message,
      type,
      link,
      is_read: false,
    }));

    if (notifications.length > 0) {
      const created = await Notification.bulkCreate(notifications);
      // Real-time socket broadcast to each admin
      adminUsers.forEach((admin, idx) => {
        emitToUser(admin.id, 'new_notification', {
          id: created[idx]?.id,
          title,
          message,
          type,
          link,
          details,
          created_at: new Date(),
        });
      });
    }
  } catch (error) {
    console.error('Failed to notify admins only:', error.message);
  }
}

/**
 * Notify employee by employee ID (resolves user_id with email fallback)
 */
async function notifyEmployee({ employeeId, title, message, type = 'SYSTEM', link = null }) {
  try {
    const employee = await Employee.findByPk(employeeId);
    if (!employee) return null;

    let userId = employee.user_id;
    if (!userId && employee.email) {
      const user = await User.findOne({ where: { email: employee.email } });
      userId = user?.id;
    }

    if (userId) {
      return await notifyUser({
        userId,
        title,
        message,
        type,
        link,
      });
    } else {
      console.warn(`[Notify Warning] Could not find user account for employee ID ${employeeId} (${employee.email})`);
    }
  } catch (error) {
    console.error('Failed to notify employee:', error.message);
  }
}

module.exports = {
  notifyUser,
  notifyAdmins,
  notifyAdminsOnly,
  notifyEmployee,
};

