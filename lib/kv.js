/**
 * kv.js — Helper semua operasi Vercel KV
 * Mengelola jadwal sesi, radius, fingerprint, dan nama siswa
 */

const { kv } = require('@vercel/kv');

if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
  console.error("ERROR: KV_REST_API_URL dan KV_REST_API_TOKEN belum di-set di Vercel env");
}

/** Konstanta key dan TTL */
const KEYS = { SCHEDULE: 'schedule', RADIUS: 'radius', FP: 'fp', NAME: 'name' };
const TTL_ONE_DAY = 86400;

/** Dapatkan Date object dalam WIB (UTC+7) */
function getWIBNow() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
}

/** Dapatkan tanggal WIB format YYYY-MM-DD */
function getWIBDate() {
  const wib = getWIBNow();
  const y = wib.getFullYear();
  const m = String(wib.getMonth() + 1).padStart(2, '0');
  const d = String(wib.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Dapatkan jam WIB format HH:MM */
function getWIBTime() {
  const wib = getWIBNow();
  const h = String(wib.getHours()).padStart(2, '0');
  const m = String(wib.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/** Simpan jadwal sesi absen */
async function setSchedule(sessions) {
  try {
    await kv.set(KEYS.SCHEDULE, JSON.stringify(sessions));
  } catch (err) {
    throw new Error(`[kv.js] Gagal simpan jadwal: ${err.message}`);
  }
}

/** Ambil jadwal sesi absen */
async function getSchedule() {
  try {
    const data = await kv.get(KEYS.SCHEDULE);
    console.log("KV get jadwal result:", JSON.stringify(data));
    if (!data) return [];
    let parsed = data;
    // Fix kemungkinan double-stringify di Vercel KV
    while (typeof parsed === 'string') {
      try { parsed = JSON.parse(parsed); } catch(e) { break; }
    }
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    throw new Error(`[kv.js] Gagal ambil jadwal: ${err.message}`);
  }
}

/** Cek apakah waktu sekarang ada di salah satu sesi aktif */
async function getActiveSession() {
  try {
    const sessions = await getSchedule();
    const now = getWIBTime();
    return sessions.find((s) => s.start && s.end && now >= s.start.trim() && now <= s.end.trim()) || null;
  } catch (err) {
    throw new Error(`[kv.js] Gagal cek sesi aktif: ${err.message}`);
  }
}

/** Simpan radius geolokasi ke KV */
async function setRadius(meter) {
  try {
    await kv.set(KEYS.RADIUS, Number(meter));
  } catch (err) {
    throw new Error(`[kv.js] Gagal simpan radius: ${err.message}`);
  }
}

/** Ambil radius geolokasi (fallback ke env atau 200) */
async function getRadius() {
  try {
    const r = await kv.get(KEYS.RADIUS);
    return r ? Number(r) : Number(process.env.RADIUS_METER || 200);
  } catch (err) {
    throw new Error(`[kv.js] Gagal ambil radius: ${err.message}`);
  }
}

/** Cek apakah fingerprint sudah digunakan hari ini */
async function isFingerprinted(fp) {
  try {
    const key = `${KEYS.FP}:${fp}:${getWIBDate()}`;
    const val = await kv.get(key);
    return !!val;
  } catch (err) {
    throw new Error(`[kv.js] Gagal cek fingerprint: ${err.message}`);
  }
}

/** Tandai fingerprint sudah digunakan hari ini */
async function markFingerprint(fp) {
  try {
    const key = `${KEYS.FP}:${fp}:${getWIBDate()}`;
    await kv.set(key, '1', { ex: TTL_ONE_DAY });
  } catch (err) {
    throw new Error(`[kv.js] Gagal simpan fingerprint: ${err.message}`);
  }
}

/** Cek apakah nama sudah absen hari ini */
async function isNameUsed(name) {
  try {
    const key = `${KEYS.NAME}:${name.toLowerCase().trim()}:${getWIBDate()}`;
    const val = await kv.get(key);
    return !!val;
  } catch (err) {
    throw new Error(`[kv.js] Gagal cek nama: ${err.message}`);
  }
}

/** Tandai nama sudah absen hari ini */
async function markName(name) {
  try {
    const key = `${KEYS.NAME}:${name.toLowerCase().trim()}:${getWIBDate()}`;
    await kv.set(key, '1', { ex: TTL_ONE_DAY });
  } catch (err) {
    throw new Error(`[kv.js] Gagal simpan nama: ${err.message}`);
  }
}

module.exports = {
  getWIBDate, getWIBTime,
  setSchedule, getSchedule, getActiveSession,
  setRadius, getRadius,
  isFingerprinted, markFingerprint,
  isNameUsed, markName,
};
