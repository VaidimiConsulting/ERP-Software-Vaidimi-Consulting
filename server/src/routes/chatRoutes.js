const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const {
  heartbeat,
  getPresenceRoster,
  getConversations,
  createConversation,
  getMessages,
  sendMessage,
  addMembers,
  removeMember,
} = require('../controllers/chatController');

// All chat routes are protected by JWT authentication
router.use(authenticate);

// Presence & Heartbeat
router.post('/heartbeat', heartbeat);
router.get('/presence', getPresenceRoster);

// Conversations
router.get('/conversations', getConversations);
router.post('/conversations', createConversation);

// Messages
router.get('/conversations/:id/messages', getMessages);
router.post('/conversations/:id/messages', sendMessage);

// Member Management
router.post('/conversations/:id/members', addMembers);
router.delete('/conversations/:id/members/:userId', removeMember);

module.exports = router;
