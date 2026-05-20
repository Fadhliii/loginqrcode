module.exports = async function handler(req, res) {
  const { kv } = require('../lib/kv')
  const adminkey = req.query.adminkey
  
  if (adminkey !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Hapus semua fingerprint dan nama hari ini
  const nowWIB = new Date(Date.now() + 7 * 60 * 60 * 1000)
  const date = nowWIB.toISOString().split('T')[0]
  
  const { Redis } = require('@upstash/redis')
  const redis = new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  })

  // Scan dan hapus semua key hari ini
  const keys = await redis.keys('*:' + date)
  if (keys.length > 0) {
    await redis.del(...keys)
  }

  res.json({ 
    success: true, 
    message: 'Reset berhasil', 
    keysDeleted: keys 
  })
}
