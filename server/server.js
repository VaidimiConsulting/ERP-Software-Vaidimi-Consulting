// 1. Process-level safety handlers at the absolute top of entry point
process.on('uncaughtException', (err, origin) => {
  console.error(`\n🚨 [Crash Prevention - Uncaught Exception] [Origin: ${origin}]:`, err?.stack || err);
  // Keep process running safely instead of exiting abruptly
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

// Port configuration
const PORT = process.env.PORT || 5000;

let serverInstance = null;

async function startServer() {
  try {
    // Test MySQL connection using Sequelize
    console.log('[Server] Testing MySQL database connection...');
    const dbStatus = await testConnection();
    if (dbStatus && dbStatus.connected) {
      try {
        const { sequelize } = require('./src/models');
        await sequelize.sync();
        console.log('[Server] Database models connected and verified with MySQL.');
      } catch (syncErr) {
        console.warn('[Server Warning] Model sync warning:', syncErr.message);
      }
    }

    // Create HTTP Server & initialize Socket.IO
    serverInstance = http.createServer(app);
    initSocket(serverInstance);

    serverInstance.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`🚀 Company Management API Server running on port ${PORT}`);
      console.log(`👉 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`👉 Real-Time:    Socket.IO WebSocket Engine Active`);
      console.log(`👉 Environment:  ${process.env.NODE_ENV || 'development'}`);
      console.log(`🛡️  Crash Guard:  Active (Uncaught exceptions & rejections secured)`);
      console.log(`====================================================`);
    });

    serverInstance.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ [PORT CONFLICT] Port ${PORT} is already in use by another running process.`);
        console.error(`👉 Stop the existing process or terminate it to free port ${PORT}.\n`);
        process.exit(1);
      } else {
        console.error('[Server Error - Handled Safely]:', err.message);
      }
    });

    // Graceful Shutdown Handlers
    const gracefulShutdown = (signal) => {
      console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
      if (serverInstance) {
        serverInstance.close(() => {
          console.log('[Server] HTTP and WebSocket listeners closed.');
          process.exit(0);
        });
      } else {
        process.exit(0);
      }
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    return serverInstance;
  } catch (startupErr) {
    console.error('🚨 [Server Startup Fatal Error Protected]:', startupErr);
    // Don't terminate, allow recovery
    return null;
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
