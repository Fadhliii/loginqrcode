/**
 * validate-session.js — Cek apakah saat ini dalam jam sesi absen aktif
 * GET /api/validate-session
 */

const { getActiveSession, getSchedule, getWIBTime } = require('../lib/kv');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const session = await getActiveSession();
    const schedule = await getSchedule();
    const now = getWIBTime();

    if (session) {
      return res.status(200).json({
        success: true,
        data: {
          active: true,
          session,
          currentTime: now,
          message: `Sesi absen aktif: ${session.start} - ${session.end}`,
        },
      });
    }

    /* Tentukan pesan berdasarkan posisi waktu terhadap jadwal */
    let message = 'Tidak ada jadwal sesi absen hari ini';
    if (schedule.length > 0) {
      const allPassed = schedule.every((s) => now > s.end);
      const allUpcoming = schedule.every((s) => now < s.start);
      if (allPassed) message = 'Semua sesi absen hari ini sudah ditutup';
      else if (allUpcoming) message = 'Sesi absen belum dibuka';
      else message = 'Saat ini di luar jam sesi absen';
    }

    return res.status(200).json({
      success: true,
      data: { active: false, session: null, currentTime: now, message },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: `[validate-session.js] ${err.message}`,
    });
  }
};
