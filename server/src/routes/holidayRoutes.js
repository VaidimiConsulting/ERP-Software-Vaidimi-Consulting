const express = require('express');
const router = express.Router();
const holidayController = require('../controllers/holidayController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { ROLES } = require('../config/constants');

router.use(authenticate);

router.get('/', holidayController.getHolidays);
router.post('/', authorizeRoles(ROLES.ADMIN, ROLES.HR, ROLES.MANAGER), holidayController.createHoliday);
router.put('/:id', authorizeRoles(ROLES.ADMIN, ROLES.HR, ROLES.MANAGER), holidayController.updateHoliday);
router.delete('/:id', authorizeRoles(ROLES.ADMIN, ROLES.HR, ROLES.MANAGER), holidayController.deleteHoliday);

module.exports = router;
