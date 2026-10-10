const express = require('express');
const cors = require('cors');
require('dotenv').config();

const apiRoutes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

// CORS configuration
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

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like curl, mobile apps, server-to-server)
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        process.env.NODE_ENV === 'development' ||
        process.env.ALLOW_ALL_ORIGINS === 'true'
      ) {
        return callback(null, true);
      }
      return callback(new Error('CORS policy blocked access from this origin: ' + origin));
    },
    credentials: true,
  })
);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root welcome route
app.get('/', (req, res) => {
  res.json({
    name: 'Company Employee, Leave, Attendance and Project Management System API',
    version: '1.0.0',
    status: 'Running',
    documentation: '/api/health',
  });
});

// API Routes
app.use('/api', apiRoutes);

// Error Middleware
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
