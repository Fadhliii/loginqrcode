/**
 * submit.js — Validasi dan simpan absensi
 * POST /api/submit
 * Body: { nama, fingerprint, lat, lng }
 *
 * Flow validasi berurutan:
 * 1. Cek sesi absen aktif
 * 2. Cek fingerprint duplikat
 * 3. Cek nama duplikat
 * 4. Hitung jarak & status lokasi
 * 5. Simpan ke KV + Google Sheets
 */

const { getActiveSession, getRadius, getWIBDate, getWIBTime,
  isFingerprinted, markFingerprint, isNameUsed, markName } = require('../lib/kv');
const { checkRadius } = require('../lib/geo');
const { appendRow } = require('../lib/sheets');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { nama, fingerprint, lat, lng } = req.body || {};

    /* Validasi input */
    if (!nama || !nama.trim()) {
      return res.status(400).json({ success: false, error: 'Nama lengkap wajib diisi' });
    }
    if (!fingerprint) {
      return res.status(400).json({ success: false, error: 'Fingerprint perangkat tidak terdeteksi' });
    }
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ success: false, error: 'Lokasi tidak terdeteksi' });
    }

    /* 1. Cek sesi aktif */
    const session = await getActiveSession();
    if (!session) {
      return res.status(403).json({
        success: false,
        error: 'Tidak ada sesi absen yang aktif saat ini',
      });
    }

    /* 2. Cek fingerprint */
    if (await isFingerprinted(fingerprint)) {
      return res.status(403).json({
        success: false,
        error: 'Perangkat ini sudah digunakan untuk absen hari ini',
      });
    }

    /* 3. Cek nama */
    if (await isNameUsed(nama.trim())) {
      return res.status(403).json({
        success: false,
        error: 'Nama ini sudah tercatat absen hari ini',
      });
    }

    /* 4. Hitung jarak */
    const schoolLat = Number(process.env.SCHOOL_LAT || -6.2984798916658065);
    const schoolLng = Number(process.env.SCHOOL_LNG || 107.10119071620488);
    const radius = await getRadius();
    const { inRadius, distance } = checkRadius(
      Number(lat), Number(lng), schoolLat, schoolLng, radius
    );

    if (!inRadius) {
      return res.status(403).json({
        success: false,
        error: `Anda berada di luar jangkauan absensi (${distance}m). Silakan mendekat ke lokasi sekolah.`
      });
    }

    const statusLokasi = '✅ Dalam radius';
    const sesiLabel = `${session.start}-${session.end}`;
    const tanggal = getWIBDate();
    const jam = getWIBTime();

    /* 5. Simpan ke KV dan Google Sheets */
    await markFingerprint(fingerprint);
    await markName(nama.trim());
    await appendRow({
      tanggal, jam, nama: nama.trim(),
      statusLokasi, sesi: sesiLabel, fingerprint,
    });

    return res.status(200).json({
      success: true,
      data: {
        nama: nama.trim(), jam, statusLokasi,
        distance: `${distance}m`, sesi: sesiLabel,
        message: 'Absensi berhasil dicatat!',
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: `[submit.js] ${err.message}`,
    });
  }
};
