const { getDbStatus, DB_NAME } = require('../config/db');

/**
 * Health check controller providing system uptime, database status, and environment info
 */
function getHealth(req, res) {
  const dbStatus = getDbStatus();

  return res.status(200).json({
    success: true,
    message: 'Company Management System API is healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    phase: 'Phase 1 - Project Architecture & Setup',
    database: {
      name: DB_NAME,
      ...dbStatus,
    },
  });
}

module.exports = {
  getHealth,
};
