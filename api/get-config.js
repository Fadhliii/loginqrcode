/**
 * get-config.js — Ambil konfigurasi (Spreadsheet ID URL) untuk admin
 * GET /api/get-config?adminkey=xxx
 */

const { validateAdminKey } = require('../lib/auth');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const adminkey = req.query.adminkey || '';

    if (!validateAdminKey(adminkey)) {
      return res.status(403).json({ success: false, error: 'Admin key tidak valid' });
    }

    return res.status(200).json({
      success: true,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${process.env.SPREADSHEET_ID}/edit`
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: `[get-config.js] ${err.message}`,
    });
  }
};
