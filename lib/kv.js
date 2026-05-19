/**
 * kv.js — Helper semua operasi Vercel KV
 * Mengelola jadwal sesi, radius, fingerprint, dan nama siswa
 */

const { kv } = require('@vercel/kv');

/** Konstanta key dan TTL */
const KEYS = { SCHEDULE: 'schedule', RADIUS: 'radius', FP: 'fp', NAME: 'name' };
const TTL_ONE_DAY = 86400;

/** Dapatkan Date object dalam WIB (UTC+7) */
function getWIBNow() {
  const now = new Date();
  // Tambah 7 jam (WIB = UTC+7) ke UTC time
  const wibMs = now.getTime() + (7 * 60 * 60 * 1000);
  return new Date(wibMs);
}

/** Dapatkan tanggal WIB format YYYY-MM-DD */
function getWIBDate() {
  const wib = getWIBNow();
  const y = wib.getUTCFullYear();
  const m = String(wib.getUTCMonth() + 1).padStart(2, '0');
  const d = String(wib.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Dapatkan jam WIB format HH:MM */
function getWIBTime() {
  const wib = getWIBNow();
  const h = String(wib.getUTCHours()).padStart(2, '0');
  const m = String(wib.getUTCMinutes()).padStart(2, '0');
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
    if (!data) return [];
    return typeof data === 'string' ? JSON.parse(data) : data;
  } catch (err) {
    throw new Error(`[kv.js] Gagal ambil jadwal: ${err.message}`);
  }
}

/** Cek apakah waktu sekarang ada di salah satu sesi aktif */
async function getActiveSession() {
  try {
    const sessions = await getSchedule();
    const now = getWIBTime();
    return sessions.find((s) => now >= s.start && now <= s.end) || null;
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
