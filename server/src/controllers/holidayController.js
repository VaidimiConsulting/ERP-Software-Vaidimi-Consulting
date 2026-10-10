const { Op } = require('sequelize');
const { Holiday } = require('../models');

/**
 * @route   GET /api/holidays
 * @desc    Get all holidays (filtered by year or upcoming)
 * @access  Protected
 */
async function getHolidays(req, res) {
  try {
    const { year, upcoming } = req.query;
    const where = {};

    if (year) {
      where.year = parseInt(year);
    }

    if (upcoming === 'true') {
      const today = new Date().toISOString().split('T')[0];
      where.date = { [Op.gte]: today };
    }

    const holidays = await Holiday.findAll({
      where,
      order: [['date', 'ASC']],
    });

    return res.status(200).json({
      success: true,
      count: holidays.length,
      data: holidays,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve holidays: ' + error.message,
    });
  }
}

/**
 * @route   POST /api/holidays
 * @desc    Create holiday
 * @access  Protected (ADMIN, MANAGER)
 */
async function createHoliday(req, res) {
  try {
    const { name, date, is_paid = true, applicable_to = 'ALL', description } = req.body;

    if (!name || !date) {
      return res.status(400).json({
        success: false,
        message: 'Holiday name and date are required.',
      });
    }

    const year = new Date(date).getFullYear();

    const existing = await Holiday.findOne({ where: { name: name.trim(), date } });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A holiday with this name and date already exists.',
      });
    }

    const holiday = await Holiday.create({
      name: name.trim(),
      date,
      is_paid,
      applicable_to,
      description: description ? description.trim() : null,
      year,
    });

    return res.status(201).json({
      success: true,
      message: 'Holiday created successfully.',
      data: holiday,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create holiday: ' + error.message,
    });
  }
}

/**
 * @route   PUT /api/holidays/:id
 * @desc    Update holiday
 * @access  Protected (ADMIN, MANAGER)
 */
async function updateHoliday(req, res) {
  try {
    const { id } = req.params;
    const holiday = await Holiday.findByPk(id);

    if (!holiday) {
      return res.status(404).json({ success: false, message: 'Holiday not found.' });
    }

    const { name, date, is_paid, applicable_to, description } = req.body;
    const updates = {};

    if (name !== undefined && name.trim()) updates.name = name.trim();
    if (date !== undefined && date && String(date).trim() !== '') {
      updates.date = date;
      const parsedYear = new Date(date).getFullYear();
      if (!isNaN(parsedYear)) {
        updates.year = parsedYear;
      }
    }
    if (is_paid !== undefined) updates.is_paid = is_paid;
    if (applicable_to !== undefined) updates.applicable_to = applicable_to;
    if (description !== undefined) updates.description = description ? description.trim() : null;

    await holiday.update(updates);

    return res.status(200).json({
      success: true,
      message: 'Holiday updated successfully.',
      data: holiday,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update holiday: ' + error.message,
    });
  }
}

/**
 * @route   DELETE /api/holidays/:id
 * @desc    Delete holiday
 * @access  Protected (ADMIN, MANAGER)
 */
async function deleteHoliday(req, res) {
  try {
    const { id } = req.params;
    const holiday = await Holiday.findByPk(id);

    if (!holiday) {
      return res.status(404).json({ success: false, message: 'Holiday not found.' });
    }

    await holiday.destroy();

    return res.status(200).json({
      success: true,
      message: `Holiday '${holiday.name}' deleted successfully.`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete holiday: ' + error.message,
    });
  }
}

module.exports = {
  getHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday,
};
