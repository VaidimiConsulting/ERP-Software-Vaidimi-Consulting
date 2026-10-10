const { Op } = require('sequelize');
const {
  User,
  Employee,
  Department,
  Project,
  ChatConversation,
  ChatParticipant,
  ChatMessage,
} = require('../models');
const { ROLES } = require('../config/constants');
const { emitToConversation } = require('../config/socket');

// Online threshold: 90 seconds since last heartbeat
const ONLINE_THRESHOLD_MS = 90 * 1000;

/**
 * Helper to check if a user is currently considered online
 */
function isUserActive(user) {
  if (!user || !user.is_online || !user.last_active_at) return false;
  const diff = Date.now() - new Date(user.last_active_at).getTime();
  return diff < ONLINE_THRESHOLD_MS;
}

/**
 * @route   POST /api/chat/heartbeat
 * @desc    Keep user presence active and update last_active_at
 * @access  Protected
 */
async function heartbeat(req, res) {
  try {
    const userId = req.user.id;
    const now = new Date();
    await User.update(
      { is_online: true, last_active_at: now },
      { where: { id: userId } }
    );
    return res.status(200).json({
      success: true,
      is_online: true,
      last_active_at: now,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * @route   GET /api/chat/presence
 * @desc    Get live active workforce roster (Admin, HR, all employees)
 * @access  Protected
 */
async function getPresenceRoster(req, res) {
  try {
    const users = await User.findAll({
      where: { is_active: true },
      attributes: ['id', 'email', 'role', 'is_online', 'last_active_at'],
      include: [
        {
          model: Employee,
          as: 'employeeProfile',
          attributes: [
            'id',
            'employee_code',
            'first_name',
            'last_name',
            'designation',
            'employment_type',
            'profile_photo',
          ],
          include: [
            {
              model: Department,
              as: 'department',
              attributes: ['id', 'department_name'],
            },
          ],
        },
      ],
      order: [
        ['is_online', 'DESC'],
        ['last_active_at', 'DESC'],
      ],
    });

    const now = Date.now();
    const formatted = users.map((u) => {
      const active = isUserActive(u);
      const profile = u.employeeProfile;
      const displayName = profile
        ? `${profile.first_name} ${profile.last_name}`
        : u.role === ROLES.ADMIN
        ? 'Gargi Singh (Admin)'
        : u.role === ROLES.HR
        ? 'Vinit Kumar (HR)'
        : u.email.split('@')[0];

      return {
        id: u.id,
        email: u.email,
        role: u.role,
        is_online: active,
        last_active_at: u.last_active_at,
        displayName,
        designation: profile?.designation || (u.role === ROLES.ADMIN ? 'Managing Director & Admin' : u.role === ROLES.HR ? 'Head of People Operations & HR' : 'Associate'),
        employment_type: profile?.employment_type || 'EMPLOYEE',
        department: profile?.department?.department_name || 'Management',
        profile_photo: profile?.profile_photo || null,
        employee_id: profile?.id || null,
        employee_code: profile?.employee_code || null,
      };
    });

    const onlineCount = formatted.filter((u) => u.is_online).length;

    return res.status(200).json({
      success: true,
      data: formatted,
      onlineCount,
      totalCount: formatted.length,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * @route   GET /api/chat/conversations
 * @desc    Get all conversations current user is part of
 * @access  Protected
 */
async function getConversations(req, res) {
  try {
    const userId = req.user.id;

    // Find all conversation IDs where current user is participant
    const participations = await ChatParticipant.findAll({
      where: { user_id: userId },
      attributes: ['conversation_id', 'role', 'last_read_at'],
    });

    const conversationIds = participations.map((p) => p.conversation_id);
    if (conversationIds.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    const conversations = await ChatConversation.findAll({
      where: { id: { [Op.in]: conversationIds } },
      include: [
        {
          model: ChatParticipant,
          as: 'participants',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'email', 'role', 'is_online', 'last_active_at'],
              include: [
                {
                  model: Employee,
                  as: 'employeeProfile',
                  attributes: [
                    'id',
                    'first_name',
                    'last_name',
                    'designation',
                    'employment_type',
                    'profile_photo',
                  ],
                },
              ],
            },
          ],
        },
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'project_name', 'status'],
        },
      ],
      order: [
        ['last_message_at', 'DESC'],
        ['updated_at', 'DESC'],
      ],
    });

    // Map and decorate conversations
    const decorated = await Promise.all(
      conversations.map(async (conv) => {
        const myPart = participations.find((p) => p.conversation_id === conv.id);
        const lastRead = myPart?.last_read_at ? new Date(myPart.last_read_at) : new Date(0);

        // Count unread messages
        const unreadCount = await ChatMessage.count({
          where: {
            conversation_id: conv.id,
            created_at: { [Op.gt]: lastRead },
            sender_id: { [Op.ne]: userId },
          },
        });

        // Determine title and avatar for DIRECT chats
        let computedTitle = conv.title;
        let computedAvatar = conv.avatar;
        let otherUser = null;

        if (conv.type === 'DIRECT') {
          const otherParticipant = conv.participants.find((p) => p.user_id !== userId);
          if (otherParticipant?.user) {
            const u = otherParticipant.user;
            otherUser = {
              id: u.id,
              email: u.email,
              role: u.role,
              is_online: isUserActive(u),
              last_active_at: u.last_active_at,
              displayName: u.employeeProfile
                ? `${u.employeeProfile.first_name} ${u.employeeProfile.last_name}`
                : u.role === ROLES.ADMIN
                ? 'Gargi Singh (Admin)'
                : u.role === ROLES.HR
                ? 'Vinit Kumar (HR)'
                : u.email.split('@')[0],
              designation: u.employeeProfile?.designation || u.role,
              profile_photo: u.employeeProfile?.profile_photo || null,
            };
            computedTitle = otherUser.displayName;
            computedAvatar = otherUser.profile_photo;
          } else {
            computedTitle = 'Direct Discussion';
          }
        }

        return {
          id: conv.id,
          type: conv.type,
          title: computedTitle,
          description: conv.description,
          category: conv.category,
          project_id: conv.project_id,
          project: conv.project,
          created_by: conv.created_by,
          avatar: computedAvatar,
          last_message_text: conv.last_message_text,
          last_message_at: conv.last_message_at,
          unreadCount,
          otherUser,
          memberCount: conv.participants?.length || 0,
          participants: (conv.participants || []).map((p) => ({
            id: p.id,
            user_id: p.user_id,
            role: p.role,
            is_online: isUserActive(p.user),
            displayName: p.user?.employeeProfile
              ? `${p.user.employeeProfile.first_name} ${p.user.employeeProfile.last_name}`
              : p.user?.role === ROLES.ADMIN
              ? 'Gargi Singh (Admin)'
              : p.user?.role === ROLES.HR
              ? 'Vinit Kumar (HR)'
              : p.user?.email.split('@')[0],
            designation: p.user?.employeeProfile?.designation || p.user?.role,
            profile_photo: p.user?.employeeProfile?.profile_photo || null,
          })),
        };
      })
    );

    return res.status(200).json({ success: true, data: decorated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * @route   POST /api/chat/conversations
 * @desc    Create a new conversation (Group or Direct 1-on-1)
 * @access  Protected
 */
async function createConversation(req, res) {
  try {
    const currentUserId = req.user.id;
    const {
      type = 'DIRECT',
      title,
      description,
      category = 'GENERAL',
      project_id = null,
      member_ids = [],
      recipient_id = null,
    } = req.body;

    // Handle Direct Chat (1-on-1)
    if (type === 'DIRECT') {
      if (!recipient_id) {
        return res.status(400).json({
          success: false,
          message: 'Recipient ID is required for direct chat.',
        });
      }

      if (Number(recipient_id) === Number(currentUserId)) {
        return res.status(400).json({
          success: false,
          message: 'Cannot create a direct conversation with yourself.',
        });
      }

      // Check if direct conversation already exists between current user and recipient
      const myDirects = await ChatParticipant.findAll({
        where: { user_id: currentUserId },
        attributes: ['conversation_id'],
      });
      const myConvIds = myDirects.map((d) => d.conversation_id);

      if (myConvIds.length > 0) {
        const existingDirect = await ChatParticipant.findOne({
          where: {
            conversation_id: { [Op.in]: myConvIds },
            user_id: recipient_id,
          },
          include: [
            {
              model: ChatConversation,
              as: 'conversation',
              where: { type: 'DIRECT' },
            },
          ],
        });

        if (existingDirect && existingDirect.conversation) {
          return res.status(200).json({
            success: true,
            message: 'Existing direct conversation found.',
            data: existingDirect.conversation,
          });
        }
      }

      // Create new Direct Conversation
      const conversation = await ChatConversation.create({
        type: 'DIRECT',
        title: null,
        description: null,
        category: 'DIRECT',
        created_by: currentUserId,
        last_message_text: 'Started conversation',
        last_message_at: new Date(),
      });

      await ChatParticipant.bulkCreate([
        {
          conversation_id: conversation.id,
          user_id: currentUserId,
          role: 'MEMBER',
          last_read_at: new Date(),
        },
        {
          conversation_id: conversation.id,
          user_id: Number(recipient_id),
          role: 'MEMBER',
          last_read_at: null,
        },
      ]);

      return res.status(201).json({
        success: true,
        message: 'Direct conversation initialized.',
        data: conversation,
      });
    }

    // Handle Group Conversation
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Group title is required.',
      });
    }

    const conversation = await ChatConversation.create({
      type: 'GROUP',
      title: title.trim(),
      description: description?.trim() || null,
      category: category || 'GENERAL',
      project_id: project_id ? Number(project_id) : null,
      created_by: currentUserId,
      last_message_text: `Group created by ${req.user.email.split('@')[0]}`,
      last_message_at: new Date(),
    });

    // Build unique participants list including creator
    const uniqueUserIds = Array.from(
      new Set([currentUserId, ...member_ids.map(Number).filter(Boolean)])
    );

    const participantRows = uniqueUserIds.map((uid) => ({
      conversation_id: conversation.id,
      user_id: uid,
      role: uid === currentUserId ? 'ADMIN' : 'MEMBER',
      last_read_at: uid === currentUserId ? new Date() : null,
    }));

    await ChatParticipant.bulkCreate(participantRows);

    // Create initial system welcome message
    await ChatMessage.create({
      conversation_id: conversation.id,
      sender_id: currentUserId,
      message: `🎉 Channel created: "${title.trim()}" (${category || 'GENERAL'}). Welcome everyone!`,
      message_type: 'SYSTEM',
    });

    return res.status(201).json({
      success: true,
      message: 'Group channel created successfully.',
      data: conversation,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * @route   GET /api/chat/conversations/:id/messages
 * @desc    Get message history for a conversation
 * @access  Protected
 */
async function getMessages(req, res) {
  try {
    const conversationId = Number(req.params.id);
    const userId = req.user.id;

    // Verify membership
    const membership = await ChatParticipant.findOne({
      where: { conversation_id: conversationId, user_id: userId },
    });

    if (!membership && req.user.role !== ROLES.ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'You are not a participant in this conversation.',
      });
    }

    // Mark as read
    if (membership) {
      membership.last_read_at = new Date();
      await membership.save();
    }

    const messages = await ChatMessage.findAll({
      where: { conversation_id: conversationId },
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'email', 'role', 'is_online', 'last_active_at'],
          include: [
            {
              model: Employee,
              as: 'employeeProfile',
              attributes: [
                'id',
                'first_name',
                'last_name',
                'designation',
                'employment_type',
                'profile_photo',
              ],
            },
          ],
        },
      ],
      order: [['created_at', 'ASC']],
      limit: 200,
    });

    const formatted = messages.map((m) => {
      const s = m.sender;
      const displayName = s?.employeeProfile
        ? `${s.employeeProfile.first_name} ${s.employeeProfile.last_name}`
        : s?.role === ROLES.ADMIN
        ? 'Gargi Singh (Admin)'
        : s?.role === ROLES.HR
        ? 'Vinit Kumar (HR)'
        : s?.email.split('@')[0] || 'Unknown';

      return {
        id: m.id,
        conversation_id: m.conversation_id,
        sender_id: m.sender_id,
        message: m.message,
        message_type: m.message_type,
        attachment_url: m.attachment_url,
        attachment_name: m.attachment_name,
        created_at: m.created_at,
        isMine: m.sender_id === userId,
        senderName: displayName,
        senderRole: s?.role,
        senderDesignation: s?.employeeProfile?.designation || s?.role,
        senderPhoto: s?.employeeProfile?.profile_photo || null,
        senderOnline: isUserActive(s),
      };
    });

    return res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * @route   POST /api/chat/conversations/:id/messages
 * @desc    Send a message into a conversation
 * @access  Protected
 */
async function sendMessage(req, res) {
  try {
    const conversationId = Number(req.params.id);
    const userId = req.user.id;
    const { message, message_text, message_type = 'TEXT', attachment_url = null, attachment_name = null } = req.body;
    const content = (message || message_text || '').trim();

    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Message content cannot be empty.',
      });
    }

    // Verify membership
    let membership = await ChatParticipant.findOne({
      where: { conversation_id: conversationId, user_id: userId },
    });

    // Auto-join if Admin
    if (!membership && req.user.role === ROLES.ADMIN) {
      membership = await ChatParticipant.create({
        conversation_id: conversationId,
        user_id: userId,
        role: 'ADMIN',
        last_read_at: new Date(),
      });
    } else if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'You are not a participant in this conversation.',
      });
    }

    const created = await ChatMessage.create({
      conversation_id: conversationId,
      sender_id: userId,
      message: content,
      message_type,
      attachment_url,
      attachment_name,
    });

    // Update conversation last message and timestamp
    await ChatConversation.update(
      {
        last_message_text: content,
        last_message_at: created.created_at,
      },
      { where: { id: conversationId } }
    );

    // Update current user's last_read_at
    await membership.update({ last_read_at: created.created_at });

    // Update sender's online presence
    await User.update(
      { is_online: true, last_active_at: new Date() },
      { where: { id: userId } }
    );

    const userProfile = await User.findByPk(userId, {
      attributes: ['id', 'email', 'role', 'is_online'],
      include: [
        {
          model: Employee,
          as: 'employeeProfile',
          attributes: ['first_name', 'last_name', 'designation', 'profile_photo'],
        },
      ],
    });

    const displayName = userProfile?.employeeProfile
      ? `${userProfile.employeeProfile.first_name} ${userProfile.employeeProfile.last_name}`
      : req.user.role === ROLES.ADMIN
      ? 'Gargi Singh (Admin)'
      : req.user.role === ROLES.HR
      ? 'Vinit Kumar (HR)'
      : req.user.email.split('@')[0];

    const messagePayload = {
      id: created.id,
      conversation_id: created.conversation_id,
      sender_id: created.sender_id,
      message: created.message,
      message_type: created.message_type,
      attachment_url: created.attachment_url,
      attachment_name: created.attachment_name,
      created_at: created.created_at,
      senderName: displayName,
      senderRole: req.user.role,
      senderPhoto: userProfile?.employeeProfile?.profile_photo || null,
      senderOnline: true,
    };

    // Broadcast live to all connected participants in the conversation
    emitToConversation(conversationId, 'new_message', messagePayload);

    return res.status(201).json({
      success: true,
      data: {
        ...messagePayload,
        isMine: true,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * @route   POST /api/chat/conversations/:id/members
 * @desc    Add member to group conversation
 * @access  Protected (Admin, HR, or Group Admin)
 */
async function addMembers(req, res) {
  try {
    const conversationId = Number(req.params.id);
    const { user_ids = [] } = req.body;

    const conversation = await ChatConversation.findByPk(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    if (conversation.type !== 'GROUP') {
      return res.status(400).json({ success: false, message: 'Cannot add members to a direct chat.' });
    }

    for (const uid of user_ids) {
      await ChatParticipant.findOrCreate({
        where: { conversation_id: conversationId, user_id: Number(uid) },
        defaults: {
          conversation_id: conversationId,
          user_id: Number(uid),
          role: 'MEMBER',
          last_read_at: null,
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Members added successfully.',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * @route   DELETE /api/chat/conversations/:id/members/:userId
 * @desc    Remove member from group conversation
 * @access  Protected (Admin, HR, or Group Admin)
 */
async function removeMember(req, res) {
  try {
    const conversationId = Number(req.params.id);
    const targetUserId = Number(req.params.userId);

    await ChatParticipant.destroy({
      where: { conversation_id: conversationId, user_id: targetUserId },
    });

    return res.status(200).json({
      success: true,
      message: 'Member removed from group.',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  heartbeat,
  getPresenceRoster,
  getConversations,
  createConversation,
  getMessages,
  sendMessage,
  addMembers,
  removeMember,
};
