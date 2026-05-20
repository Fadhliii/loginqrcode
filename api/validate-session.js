/**
 * validate-session.js — Cek apakah saat ini dalam jam sesi absen aktif
 * GET /api/validate-session
 */

const { getActiveSession, getSchedule, getWIBTime } = require('../lib/kv');

module.exports = async function handler(req, res) {
  console.log("[validate-session.js] dipanggil");
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const schedule = await getSchedule();
    
    // Fix timezone menggunakan manual UTC+7 sesuai permintaan
    const nowUTC = new Date();
    const nowWIB = new Date(nowUTC.getTime() + (7 * 60 * 60 * 1000));
    const jamSekarang = 
      nowWIB.getUTCHours().toString().padStart(2, "0") + ":" + 
      nowWIB.getUTCMinutes().toString().padStart(2, "0");

    // Fallback jika KV kosong/error
    if (!schedule || schedule.length === 0) {
      console.log("KV kosong atau error - tidak ada jadwal");
      return res.status(200).json({ 
        success: true, 
        data: { active: false, session: null, currentTime: jamSekarang, message: "Belum ada jadwal" } 
      });
    }

    let aktif = false;
    let session = null;
    
    if (Array.isArray(schedule)) {
      schedule.forEach(sesi => {
        // Menggunakan sesi.start dan sesi.end karena struktur datanya demikian
        if (sesi.start && sesi.end && jamSekarang >= sesi.start.trim() && jamSekarang <= sesi.end.trim()) {
          aktif = true;
          session = sesi;
        }
      });
    }

    // Console log sesuai permintaan untuk debug Vercel Logs
    console.log("Jam WIB:", jamSekarang);
    console.log("Jadwal dari KV:", JSON.stringify(schedule));
    console.log("Status aktif:", aktif);

    const serverUTC = new Date().toISOString();

    if (aktif && session) {
      return res.status(200).json({
        success: true,
        data: {
          active: true,
          session,
          currentTime: jamSekarang,
          message: `Sesi absen aktif: ${session.start} - ${session.end}`,
          _debug: { serverUTC, nowWIB: jamSekarang, scheduleCount: schedule.length },
        },
      });
    }

    /* Tentukan pesan berdasarkan posisi waktu terhadap jadwal */
    let message = 'Tidak ada jadwal sesi absen hari ini';
    if (schedule && schedule.length > 0) {
      const allPassed = schedule.every((s) => s.end && jamSekarang > s.end.trim());
      const allUpcoming = schedule.every((s) => s.start && jamSekarang < s.start.trim());
      if (allPassed) message = 'Semua sesi absen hari ini sudah ditutup';
      else if (allUpcoming) message = 'Sesi absen belum dibuka';
      else message = 'Saat ini di luar jam sesi absen';
    }

    return res.status(200).json({
      success: true,
      data: {
        active: false,
        session: null,
        currentTime: jamSekarang,
        message,
        _debug: {
          serverUTC,
          nowWIB: jamSekarang,
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
