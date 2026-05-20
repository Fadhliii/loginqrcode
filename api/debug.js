const { kv } = require('@vercel/kv');

module.exports = async function handler(req, res) {
  console.log("[debug.js] dipanggil");
  const jadwal = await kv.get('jadwal');
  const schedule = await kv.get('schedule');
  const nowWIB = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const jam = 
    nowWIB.getUTCHours().toString().padStart(2, "0") + ":" +
    nowWIB.getUTCMinutes().toString().padStart(2, "0");
  res.json({ jadwal, schedule, jamWIB: jam });
};
