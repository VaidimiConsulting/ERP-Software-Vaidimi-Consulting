const { Notification } = require('../models');

/**
 * @route   GET /api/notifications
 * @desc    Get current user's notifications and unread count
 * @access  Protected
 */
async function getNotifications(req, res) {
  try {
    const userId = req.user.id;

    const [notifications, unreadCount] = await Promise.all([
      Notification.findAll({
        where: { user_id: userId },
        order: [['created_at', 'DESC']],
        limit: 50,
      }),
      Notification.count({
        where: { user_id: userId, is_read: false },
      }),
    ]);

    return res.status(200).json({
      success: true,
      unreadCount,
      count: notifications.length,
      data: notifications,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve notifications: ' + error.message,
    });
  }
}

/**
 * @route   PUT /api/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Protected
 */
async function markAsRead(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOne({
      where: { id, user_id: userId },
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    notification.is_read = true;
    await notification.save();

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read.',
      data: notification,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update notification: ' + error.message,
    });
  }
}

/**
 * @route   PUT /api/notifications/mark-all-read
 * @desc    Mark all user notifications as read
 * @access  Protected
 */
async function markAllAsRead(req, res) {
  try {
    const userId = req.user.id;

    await Notification.update(
      { is_read: true },
      { where: { user_id: userId, is_read: false } }
    );

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to mark notifications as read: ' + error.message,
    });
  }
}

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
};
