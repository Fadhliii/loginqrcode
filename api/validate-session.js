/**
 * validate-session.js — Cek apakah saat ini dalam jam sesi absen aktif
 * GET /api/validate-session
 */

const { getActiveSession, getSchedule, getWIBTime } = require('../lib/kv');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const schedule = await getSchedule();
    const now = getWIBTime();
    const serverUTC = new Date().toISOString();

    /* Debug logging untuk Vercel Logs */
    console.log("Jadwal dari KV:", JSON.stringify(schedule));
    console.log("Jam sekarang WIB:", now);
    console.log('[validate-session] DEBUG:', JSON.stringify({
      serverUTC,
      nowWIB: now,
      scheduleRaw: schedule,
      scheduleType: typeof schedule,
      isArray: Array.isArray(schedule),
      scheduleLength: schedule ? schedule.length : 0,
      items: Array.isArray(schedule) ? schedule.map((s, i) => ({
        index: i,
        start: s.start,
        end: s.end,
        startType: typeof s.start,
        endType: typeof s.end,
        nowGteStart: now >= s.start,
        nowLteEnd: now <= s.end,
        isActive: now >= s.start && now <= s.end,
      })) : 'NOT_ARRAY',
    }));

    const session = await getActiveSession();

    if (session) {
      return res.status(200).json({
        success: true,
        data: {
          active: true,
          session,
          currentTime: now,
          message: `Sesi absen aktif: ${session.start} - ${session.end}`,
          _debug: { serverUTC, nowWIB: now, scheduleCount: schedule.length },
        },
      });
    }

    /* Tentukan pesan berdasarkan posisi waktu terhadap jadwal */
    let message = 'Tidak ada jadwal sesi absen hari ini';
    if (schedule && schedule.length > 0) {
      const allPassed = schedule.every((s) => s.end && now > s.end.trim());
      const allUpcoming = schedule.every((s) => s.start && now < s.start.trim());
      if (allPassed) message = 'Semua sesi absen hari ini sudah ditutup';
      else if (allUpcoming) message = 'Sesi absen belum dibuka';
      else message = 'Saat ini di luar jam sesi absen';
    }

    return res.status(200).json({
      success: true,
      data: {
        active: false,
        session: null,
        currentTime: now,
        message,
        _debug: {
          serverUTC,
          nowWIB: now,
          scheduleFromKV: schedule,
          scheduleType: typeof schedule,
          isArray: Array.isArray(schedule),
        },
      },
    });
  } catch (err) {
    console.error('[validate-session] ERROR:', err.message, err.stack);
    return res.status(500).json({
      success: false,
      error: `[validate-session.js] ${err.message}`,
    });
  }
};
