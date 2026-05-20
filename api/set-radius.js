/**
 * set-radius.js — Update radius geolokasi
 * POST /api/set-radius
 * Body: { adminkey, radius: 200 }
 */

const { validateAdminKey } = require('../lib/auth');
const { setRadius } = require('../lib/kv');

module.exports = async function handler(req, res) {
  console.log("[set-radius.js] dipanggil");
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { adminkey, radius } = req.body || {};

    if (!validateAdminKey(adminkey)) {
      return res.status(403).json({ success: false, error: 'Admin key tidak valid' });
    }

    const radiusNum = Number(radius);
    if (!radiusNum || radiusNum < 10 || radiusNum > 10000) {
      return res.status(400).json({
        success: false,
        error: 'Radius harus berupa angka antara 10 - 10000 meter',
      });
    }

    await setRadius(radiusNum);

    return res.status(200).json({
      success: true,
      data: { radius: radiusNum, message: `Radius berhasil diatur ke ${radiusNum} meter` },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: `[set-radius.js] ${err.message}`,
    });
  }
};
