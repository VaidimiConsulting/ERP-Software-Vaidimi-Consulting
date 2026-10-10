const { Sequelize } = require('sequelize');
const mysql = require('mysql2/promise');
require('dotenv').config();

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 3306;
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'company_management_db';

// Function to auto-create database if it does not exist
async function ensureDatabaseExists() {
  try {
    const connection = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
    });
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`;`);
    await connection.end();
    return true;
  } catch (err) {
    // If access denied or other error, we let sequelize handle or report
    return false;
  }
}

// Initialize Sequelize instance with resilient connection settings
const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'mysql',
  logging: process.env.NODE_ENV === 'development' ? false : false,
  pool: {
    max: 20,
    min: 0,
    acquire: 60000,
    idle: 10000,
    evict: 1000,
  },
  retry: {
    match: [
      /SequelizeConnectionError/,
      /SequelizeConnectionRefusedError/,
      /SequelizeHostNotFoundError/,
      /SequelizeHostNotReachableError/,
      /SequelizeInvalidConnectionError/,
      /SequelizeConnectionTimedOutError/,
      /TimeoutError/,
      /PROTOCOL_CONNECTION_LOST/,
      /ECONNRESET/,
      /ETIMEDOUT/,
    ],
    max: 5,
  },
  dialectOptions: {
    connectTimeout: 60000,
    decimalNumbers: true,
  },
  define: {
    timestamps: true,
    underscored: true,
  },
});

let dbConnectionStatus = {
  connected: false,
  message: 'Initializing...',
  error: null,
};

async function testConnection() {
  try {
    await ensureDatabaseExists();
    await sequelize.authenticate();
    dbConnectionStatus = {
      connected: true,
      message: `Successfully connected to MySQL database '${DB_NAME}' on ${DB_HOST}:${DB_PORT}`,
      error: null,
    };
    console.log(`[Database] Connected successfully to MySQL: ${DB_NAME}`);
    return dbConnectionStatus;
  } catch (error) {
    dbConnectionStatus = {
      connected: false,
      message: 'Failed to connect to MySQL database.',
      error: error.message,
    };
    console.warn(`[Database Warning] Could not connect to MySQL: ${error.message}`);
    console.warn(`[Database Warning] Please check server/.env (DB_USER, DB_PASSWORD, DB_NAME, DB_HOST, DB_PORT).`);
    return dbConnectionStatus;
  }
}

function getDbStatus() {
  return dbConnectionStatus;
}

module.exports = {
  sequelize,
  testConnection,
  getDbStatus,
  DB_NAME,
};
