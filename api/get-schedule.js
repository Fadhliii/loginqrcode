/**
 * get-schedule.js — Ambil jadwal sesi absen dari Vercel KV
 * GET /api/get-schedule
 */

const { getSchedule } = require('../lib/kv');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const sessions = await getSchedule();

    return res.status(200).json({
      success: true,
      data: { sessions },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: `[get-schedule.js] ${err.message}`,
    });
  }
};
