/**
 * get-today.js — Ambil data absensi hari ini dari Google Sheets
 * GET /api/get-today?adminkey=xxx
 */

const { validateAdminKey } = require('../lib/auth');
const { getTodayRows } = require('../lib/sheets');
const { getWIBDate } = require('../lib/kv');

module.exports = async function handler(req, res) {
  console.log("[get-today.js] dipanggil");
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const adminkey = req.query.adminkey || '';

    if (!validateAdminKey(adminkey)) {
      return res.status(403).json({ success: false, error: 'Admin key tidak valid' });
    }

    const today = getWIBDate();
    const rows = await getTodayRows(today);

    return res.status(200).json({
      success: true,
      data: { date: today, count: rows.length, rows },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: `[get-today.js] ${err.message}`,
    });
  }
};
