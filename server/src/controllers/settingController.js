const { CompanySetting } = require('../models');

// Default timings - 10:00 AM to 5:30 PM Shift, 1:00 PM to 2:00 PM Lunch Break (6.0 hrs net work)
const DEFAULT_SETTINGS = {
  office_start_time: '10:00',
  office_grace_end_time: '11:00',
  break_start_time: '13:00',
  break_end_time: '14:00',
  office_end_time: '17:30',
  work_hours_standard: '6.0',
};

/**
 * Helper to fetch effective office timing settings
 */
async function getOfficeTimingConfig() {
  try {
    const settings = await CompanySetting.findAll();
    const map = { ...DEFAULT_SETTINGS };
    settings.forEach((s) => {
      map[s.key] = s.value;
    });
    return map;
  } catch (err) {
    return DEFAULT_SETTINGS;
  }
}

/**
 * @route   GET /api/settings
 * @desc    Get all company settings
 * @access  Protected
 */
async function getSettings(req, res) {
  try {
    const config = await getOfficeTimingConfig();
    return res.status(200).json({
      success: true,
      data: config,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve settings: ' + error.message,
    });
  }
}

/**
 * @route   PUT /api/settings
 * @desc    Update company settings (office timings)
 * @access  Protected (ADMIN, HR)
 */
async function updateSettings(req, res) {
  try {
    const updates = req.body; // e.g. { office_start_time: '10:00', office_grace_end_time: '11:00' }

    for (const [key, value] of Object.entries(updates)) {
      await CompanySetting.upsert({
        key,
        value: String(value),
        description: `Company configuration for ${key}`,
      });
    }

    const updated = await getOfficeTimingConfig();
    return res.status(200).json({
      success: true,
      message: 'Company settings updated successfully.',
      data: updated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update settings: ' + error.message,
    });
  }
}

module.exports = {
  getOfficeTimingConfig,
  getSettings,
  updateSettings,
};
