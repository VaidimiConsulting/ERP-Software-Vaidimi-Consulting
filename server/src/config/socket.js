const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;

/**
 * Initialize Socket.IO server attached to the HTTP server
 */
function initSocket(httpServer) {
  try {
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
            process.env.ALLOW_ALL_ORIGINS === 'true' ||
            origin.includes('localhost') ||
            origin.includes('127.0.0.1')
          ) {
            return callback(null, true);
          }
          return callback(null, true); // Permissive in dev to avoid client drops
        },
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    // Handle engine connection errors safely
    io.engine.on('connection_error', (err) => {
      console.warn('[Socket.IO Engine Warning]:', err.message || err);
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

      // Listen for socket errors so unhandled errors don't crash Node
      socket.on('error', (err) => {
        console.warn(`[Socket Error] User ${userId || 'guest'}:`, err?.message || err);
      });

      // Join personal user room for targeted notifications & alerts
      if (userId) {
        try {
          socket.join(`user_${userId}`);
          console.log(`[Socket.IO] User ${userId} (${userRole}) connected and joined room: user_${userId}`);
        } catch (joinErr) {
          console.warn('[Socket Room Error]:', joinErr.message);
        }
      }

      // Join a conversation room (channels, group chats, direct messages)
      socket.on('join_conversation', (payload) => {
        try {
          const conversationId = payload?.conversationId;
          if (conversationId) {
            socket.join(`conv_${conversationId}`);
          }
        } catch (err) {
          console.warn('[Socket join_conversation error]:', err.message);
        }
      });

      // Leave a conversation room
      socket.on('leave_conversation', (payload) => {
        try {
          const conversationId = payload?.conversationId;
          if (conversationId) {
            socket.leave(`conv_${conversationId}`);
          }
        } catch (err) {
          console.warn('[Socket leave_conversation error]:', err.message);
        }
      });

      // Typing indicators
      socket.on('typing', (payload) => {
        try {
          const conversationId = payload?.conversationId;
          const userName = payload?.userName;
          if (conversationId) {
            socket.to(`conv_${conversationId}`).emit('user_typing', {
              conversationId,
              userId,
              userName: userName || socket.user?.email?.split('@')[0] || 'A colleague',
            });
          }
        } catch (err) {
          console.warn('[Socket typing error]:', err.message);
        }
      });

      socket.on('stop_typing', (payload) => {
        try {
          const conversationId = payload?.conversationId;
          if (conversationId) {
            socket.to(`conv_${conversationId}`).emit('user_stop_typing', {
              conversationId,
              userId,
            });
          }
        } catch (err) {
          console.warn('[Socket stop_typing error]:', err.message);
        }
      });

      // Disconnect event
      socket.on('disconnect', (reason) => {
        // Disconnected safely
      });
    });

    console.log('[Socket.IO] Real-time engine initialized successfully.');
    return io;
  } catch (initErr) {
    console.error('🚨 [Socket.IO Init Error Caught Safely]:', initErr.message);
    return null;
  }
}

/**
 * Get current Socket.IO instance
 */
function getIO() {
  return io;
}

/**
 * Emit event to a specific user safely
 */
function emitToUser(userId, event, data) {
  try {
    if (io && userId) {
      io.to(`user_${userId}`).emit(event, data);
    }
  } catch (err) {
    console.warn(`[Socket Emit Error] emitToUser(${userId}):`, err.message);
  }
}

/**
 * Emit event to all participants in a conversation room safely
 */
function emitToConversation(conversationId, event, data) {
  try {
    if (io && conversationId) {
      io.to(`conv_${conversationId}`).emit(event, data);
    }
  } catch (err) {
    console.warn(`[Socket Emit Error] emitToConversation(${conversationId}):`, err.message);
  }
}

module.exports = {
  initSocket,
  getIO,
  emitToUser,
  emitToConversation,
};
