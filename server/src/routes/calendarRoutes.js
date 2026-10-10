const express = require('express');
const router = express.Router();
const calendarController = require('../controllers/calendarController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { ROLES } = require('../config/constants');

router.use(authenticate);

router.get('/events', calendarController.getCalendarEvents);
router.post('/events', authorizeRoles(ROLES.ADMIN, ROLES.MANAGER), calendarController.createCompanyEvent);
router.delete('/events/:id', authorizeRoles(ROLES.ADMIN, ROLES.MANAGER), calendarController.deleteCompanyEvent);

module.exports = router;
