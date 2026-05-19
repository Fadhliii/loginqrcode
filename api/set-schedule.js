/**
 * set-schedule.js — Simpan jadwal sesi absen ke Vercel KV
 * POST /api/set-schedule
 * Body: { adminkey, sessions: [{ start: "07:00", end: "07:30" }, ...] }
 */

const { validateAdminKey } = require('../lib/auth');
const { setSchedule } = require('../lib/kv');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { adminkey, sessions } = req.body || {};

    console.log('[set-schedule] Received:', JSON.stringify({ adminkey: adminkey ? '***' : 'EMPTY', sessions }));

    /* Validasi admin key */
    if (!validateAdminKey(adminkey)) {
      console.log('[set-schedule] Admin key INVALID');
      return res.status(403).json({ success: false, error: 'Admin key tidak valid' });
    }

    /* Validasi format sessions */
    if (!Array.isArray(sessions)) {
      return res.status(400).json({
        success: false,
        error: 'Format sessions harus berupa array',
      });
    }

    for (const s of sessions) {
      if (!s.start || !s.end) {
        return res.status(400).json({
          success: false,
          error: 'Setiap sesi harus memiliki start dan end (format HH:MM)',
        });
      }
      // Pastikan format jam tidak ada spasi (Kemungkinan 2)
      s.start = s.start.trim();
      s.end = s.end.trim();
    }

    console.log("Jadwal disimpan:", JSON.stringify(sessions));
    console.log('[set-schedule] Saving to KV:', JSON.stringify(sessions));
    await setSchedule(sessions);
    console.log('[set-schedule] Save SUCCESS');

    return res.status(200).json({
      success: true,
      data: { sessions, message: 'Jadwal sesi berhasil disimpan' },
    });
  } catch (err) {
    console.error('[set-schedule] ERROR:', err.message, err.stack);
    return res.status(500).json({
      success: false,
      error: `[set-schedule.js] ${err.message}`,
    });
  }
};
