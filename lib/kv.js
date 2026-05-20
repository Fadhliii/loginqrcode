const { Redis } = require('@upstash/redis')

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
})

// Simpan jadwal
async function setSchedule(jadwal) {
  try {
    await redis.set('jadwal', JSON.stringify(jadwal))
    console.log('[kv.js] Jadwal tersimpan:', JSON.stringify(jadwal))
  } catch (err) {
    throw new Error('[kv.js] Gagal simpan jadwal: ' + err.message)
  }
}

// Ambil jadwal
async function getSchedule() {
  try {
    const result = await redis.get('jadwal')
    console.log('[kv.js] Jadwal dari Redis:', JSON.stringify(result))
    if (!result) return []
    return typeof result === 'string' ? JSON.parse(result) : result
  } catch (err) {
    throw new Error('[kv.js] Gagal ambil jadwal: ' + err.message)
  }
}

// Simpan fingerprint (anti spam)
async function setFingerprint(fp, date) {
  try {
    const key = 'fp:' + fp + ':' + date
    await redis.set(key, '1', { ex: 86400 })
  } catch (err) {
    throw new Error('[kv.js] Gagal simpan fingerprint: ' + err.message)
  }
}

// Cek fingerprint
async function checkFingerprint(fp, date) {
  try {
    const key = 'fp:' + fp + ':' + date
    const result = await redis.get(key)
    return result !== null
  } catch (err) {
    throw new Error('[kv.js] Gagal cek fingerprint: ' + err.message)
  }
}

// Simpan nama (anti duplikat)
async function setName(nama, date) {
  try {
    const key = 'name:' + nama.toLowerCase().replace(/\s+/g, '') + ':' + date
    await redis.set(key, '1', { ex: 86400 })
  } catch (err) {
    throw new Error('[kv.js] Gagal simpan nama: ' + err.message)
  }
}

// Cek nama
async function checkName(nama, date) {
  try {
    const key = 'name:' + nama.toLowerCase().replace(/\s+/g, '') + ':' + date
    const result = await redis.get(key)
    return result !== null
  } catch (err) {
    throw new Error('[kv.js] Gagal cek nama: ' + err.message)
  }
}

// Simpan radius
async function setRadius(radius) {
  try {
    await redis.set('radius', radius.toString())
  } catch (err) {
    throw new Error('[kv.js] Gagal simpan radius: ' + err.message)
  }
}

// Ambil radius
async function getRadius() {
  try {
    const result = await redis.get('radius')
    return result ? parseInt(result) : 200
  } catch (err) {
    return 200
  }
}

// ==========================================
// Compatibility Layer for existing API files
// ==========================================
function getWIBNow() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
}

function getWIBDate() {
  const wib = getWIBNow();
  return `${wib.getFullYear()}-${String(wib.getMonth() + 1).padStart(2, '0')}-${String(wib.getDate()).padStart(2, '0')}`;
}

function getWIBTime() {
  const wib = getWIBNow();
  return `${String(wib.getHours()).padStart(2, '0')}:${String(wib.getMinutes()).padStart(2, '0')}`;
}

async function getActiveSession() {
  try {
    const sessions = await getSchedule();
    const now = getWIBTime();
    return sessions.find((s) => s.start && s.end && now >= s.start.trim() && now <= s.end.trim()) || null;
  } catch (err) {
    throw new Error(`[kv.js] Gagal cek sesi aktif: ${err.message}`);
  }
}

async function isFingerprinted(fp) {
  return checkFingerprint(fp, getWIBDate());
}

async function markFingerprint(fp) {
  return setFingerprint(fp, getWIBDate());
}

async function isNameUsed(nama) {
  return checkName(nama, getWIBDate());
}

async function markName(nama) {
  return setName(nama, getWIBDate());
}

module.exports = {
  setSchedule,
  getSchedule,
  setFingerprint,
  checkFingerprint,
  setName,
  checkName,
  setRadius,
  getRadius,
  // Compatibility exports
  getWIBDate,
  getWIBTime,
  getActiveSession,
  isFingerprinted,
  markFingerprint,
  isNameUsed,
  markName,
}
