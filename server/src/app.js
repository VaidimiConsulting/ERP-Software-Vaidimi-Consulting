const express = require('express');
const cors = require('cors');
require('dotenv').config();

const apiRoutes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

// CORS configuration with robust origin matching
const envOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const allowedOrigins = [
  ...envOrigins,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5000',
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like curl, mobile apps, Postman, server-to-server)
      if (!origin) return callback(null, true);

      const isAllowed =
        allowedOrigins.includes(origin) ||
        process.env.NODE_ENV === 'development' ||
        process.env.ALLOW_ALL_ORIGINS === 'true' ||
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:');

      if (isAllowed) {
        return callback(null, true);
      }
      return callback(new Error('CORS policy blocked access from this origin: ' + origin));
    },
    credentials: true,
  })
);

// Body parser with safe limit
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Root welcome route
app.get('/', (req, res) => {
  res.json({
    name: 'Company Employee, Leave, Attendance and Project Management System API',
    version: '1.0.0',
    status: 'Running',
    uptime: process.uptime(),
    documentation: '/api/health',
  });
});

// API Routes
app.use('/api', apiRoutes);

// Centralized Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
