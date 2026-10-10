const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { ROLES } = require('../config/constants');
const { getSettings, updateSettings } = require('../controllers/settingController');

// All authenticated users can read office timings
router.get('/', authenticate, getSettings);

// Only ADMIN and HR can update office timings
router.put('/', authenticate, authorizeRoles(ROLES.ADMIN, ROLES.HR), updateSettings);

module.exports = router;
