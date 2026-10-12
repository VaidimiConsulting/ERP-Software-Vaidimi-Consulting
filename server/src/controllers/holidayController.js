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
    const {
      name,
      date,
      start_date,
      end_date,
      is_paid = true,
      applicable_to = 'ALL',
      description,
    } = req.body;

    const initialDate = start_date || date;
    const finalDate = end_date || initialDate;

    if (!name || !initialDate) {
      return res.status(400).json({
        success: false,
        message: 'Holiday name and start date are required.',
      });
    }

    const start = new Date(initialDate + 'T00:00:00');
    const end = new Date(finalDate + 'T00:00:00');

    if (end < start) {
      return res.status(400).json({
        success: false,
        message: 'End date cannot be earlier than start date.',
      });
    }

    const dayDiff = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;

    // Safety limit: max 30 consecutive days
    if (dayDiff > 30) {
      return res.status(400).json({
        success: false,
        message: 'Holiday leave range cannot exceed 30 consecutive days.',
      });
    }

    const createdRecords = [];
    const cleanName = name.trim();

    for (let i = 0; i < dayDiff; i++) {
      const curDate = new Date(start);
      curDate.setDate(curDate.getDate() + i);
      const curDateStr = curDate.toISOString().split('T')[0];
      const curYear = curDate.getFullYear();

      const dayTitle =
        dayDiff > 1
          ? `${cleanName} (Day ${i + 1} of ${dayDiff})`
          : cleanName;

      const rangeNotice =
        dayDiff > 1
          ? `Festival Leave (${initialDate} to ${finalDate}, ${dayDiff} Days Off)`
          : '';

      const fullDesc = [rangeNotice, description ? description.trim() : '']
        .filter(Boolean)
        .join(' • ');

      // Find or create for each day in range
      const [holidayRecord] = await Holiday.findOrCreate({
        where: { name: dayTitle, date: curDateStr },
        defaults: {
          name: dayTitle,
          date: curDateStr,
          is_paid: is_paid === true || is_paid === 'true',
          applicable_to: applicable_to || 'ALL',
          description: fullDesc || null,
          year: curYear,
        },
      });

      createdRecords.push(holidayRecord);
    }

    return res.status(201).json({
      success: true,
      message:
        dayDiff > 1
          ? `Multi-day festival leave '${cleanName}' (${dayDiff} days: ${initialDate} to ${finalDate}) registered successfully.`
          : 'Holiday created successfully.',
      count: createdRecords.length,
      data: createdRecords[0],
      records: createdRecords,
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
