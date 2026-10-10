const http = require('http');
const app = require('./src/app');
const { testConnection } = require('./src/config/db');
const { initSocket } = require('./src/config/socket');

// Port configuration
const PORT = process.env.PORT || 5000;

async function startServer() {
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
  const server = http.createServer(app);
  initSocket(server);

  server.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 Company Management API Server running on port ${PORT}`);
    console.log(`👉 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`👉 Real-Time:    Socket.IO WebSocket Engine Active`);
    console.log(`👉 Environment:  ${process.env.NODE_ENV || 'development'}`);
    console.log(`====================================================`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌ [PORT CONFLICT] Port ${PORT} is already in use by another running process.`);
      console.error(`👉 Stop the existing process or terminate it to free port ${PORT}.\n`);
      process.exit(1);
    } else {
      console.error('[Server Error]', err);
    }
  });

  // Global process error handlers to prevent unexpected crashes in production
  process.on('unhandledRejection', (reason, promise) => {
    console.error('[Unhandled Rejection at Promise]:', reason);
  });

  process.on('uncaughtException', (err) => {
    console.error('[Uncaught Exception]:', err);
  });

  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
