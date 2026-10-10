const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;

/**
 * Initialize Socket.IO server attached to the HTTP server
 */
function initSocket(httpServer) {
  const envOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const allowedOrigins = [
    ...envOrigins,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
  ];

  io = new Server(httpServer, {
    cors: {
      origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (
          allowedOrigins.includes(origin) ||
          process.env.NODE_ENV === 'development' ||
          process.env.ALLOW_ALL_ORIGINS === 'true'
        ) {
          return callback(null, true);
        }
        return callback(new Error('CORS policy blocked socket origin: ' + origin));
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Authentication Middleware for incoming socket connections
  io.use((socket, next) => {
    try {
      const authHeader = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
      if (!authHeader) {
        return next(new Error('Authentication token missing from socket handshake'));
      }

      const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_company_management_jwt_key_2026');

      socket.user = decoded;
      return next();
    } catch (err) {
      console.warn('[Socket.IO Auth Warning]', err.message);
      return next(new Error('Invalid or expired authentication token'));
    }
  });

  // Socket Connection Handlers
  io.on('connection', (socket) => {
    const userId = socket.user?.id;
    const userRole = socket.user?.role;

    // Join personal user room for targeted notifications & alerts
    if (userId) {
      socket.join(`user_${userId}`);
      console.log(`[Socket.IO] User ${userId} (${userRole}) connected and joined room: user_${userId}`);
    }

    // Join a conversation room (channels, group chats, direct messages)
    socket.on('join_conversation', ({ conversationId }) => {
      if (conversationId) {
        socket.join(`conv_${conversationId}`);
      }
    });

    // Leave a conversation room
    socket.on('leave_conversation', ({ conversationId }) => {
      if (conversationId) {
        socket.leave(`conv_${conversationId}`);
      }
    });

    // Typing indicators
    socket.on('typing', ({ conversationId, userName }) => {
      if (conversationId) {
        socket.to(`conv_${conversationId}`).emit('user_typing', {
          conversationId,
          userId,
          userName: userName || socket.user?.email?.split('@')[0] || 'A colleague',
        });
      }
    });

    socket.on('stop_typing', ({ conversationId }) => {
      if (conversationId) {
        socket.to(`conv_${conversationId}`).emit('user_stop_typing', {
          conversationId,
          userId,
        });
      }
    });

    // Disconnect event
    socket.on('disconnect', () => {
      // User disconnected
    });
  });

  console.log('[Socket.IO] Real-time engine initialized successfully.');
  return io;
}

/**
 * Get current Socket.IO instance
 */
function getIO() {
  return io;
}

/**
 * Emit event to a specific user
 */
function emitToUser(userId, event, data) {
  if (io && userId) {
    io.to(`user_${userId}`).emit(event, data);
  }
}

/**
 * Emit event to all participants in a conversation room
 */
function emitToConversation(conversationId, event, data) {
  if (io && conversationId) {
    io.to(`conv_${conversationId}`).emit(event, data);
  }
}

module.exports = {
  initSocket,
  getIO,
  emitToUser,
  emitToConversation,
};
