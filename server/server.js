// 1. Process-level safety handlers at the absolute top of entry point
process.on('uncaughtException', (err, origin) => {
  console.error(`\n🚨 [Crash Prevention - Uncaught Exception] [Origin: ${origin}]:`, err?.stack || err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('\n🚨 [Crash Prevention - Unhandled Promise Rejection]:', reason);
});

process.on('warning', (warning) => {
  console.warn(`[Process Warning: ${warning.name}]`, warning.message);
});

const http = require('http');
const app = require('./src/app');
const { testConnection } = require('./src/config/db');
const { initSocket } = require('./src/config/socket');

// Port configuration (Hostinger sets process.env.PORT automatically)
const PORT = process.env.PORT || 5000;

// 2. Create HTTP Server & initialize Socket.IO immediately
const server = http.createServer(app);
initSocket(server);

// 3. MUST call listen() immediately without blocking (Required by Hostinger within 3s)
server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Company Management API Server running on port ${PORT}`);
  console.log(`👉 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`👉 Real-Time:    Socket.IO WebSocket Engine Active`);
  console.log(`👉 Environment:  ${process.env.NODE_ENV || 'production'}`);
  console.log(`🛡️  Crash Guard:  Active (Hostinger Compatible)`);
  console.log(`====================================================`);

  // Asynchronously connect database in the background without blocking listen()
  initDatabaseAsync();
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ [PORT CONFLICT] Port ${PORT} is already in use by another running process.`);
    process.exit(1);
  } else {
    console.error('[Server Error - Handled Safely]:', err.message);
  }
});

// Non-blocking asynchronous database initialization
async function initDatabaseAsync() {
  try {
    console.log('[Server] Connecting to MySQL database...');
    const dbStatus = await testConnection();
    if (dbStatus && dbStatus.connected) {
      try {
        const { sequelize } = require('./src/models');
        await sequelize.sync();
        console.log('[Server] ✅ Database models connected and verified with MySQL.');
      } catch (syncErr) {
        console.warn('[Server Warning] Model sync warning:', syncErr.message);
      }
    } else {
      console.warn('[Server Warning] Database not connected yet:', dbStatus?.message || dbStatus?.error);
    }
  } catch (err) {
    console.warn('[Server Warning] Async DB init caught:', err.message);
  }
}

// Graceful Shutdown Handlers
const gracefulShutdown = (signal) => {
  console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    console.log('[Server] HTTP and WebSocket listeners closed.');
    process.exit(0);
  });
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Export server instance directly for Passenger / Hostinger
module.exports = server;
