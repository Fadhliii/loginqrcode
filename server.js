/**
 * server.js — Server Mock Lokal
 * Menjalankan aplikasi secara lokal tanpa memerlukan akun Vercel / database.
 * Menyediakan mock data untuk API sehingga UI dapat diuji secara interaktif.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { checkRadius } = require('./lib/geo');

const PORT = 3000;

/* In-memory Mock Database */
let mockSchedule = [
  { start: "07:00", end: "08:30" },
  { start: "12:00", end: "13:00" },
  { start: "18:00", end: "23:59" } // Ditambahkan sesi malam agar selalu aktif saat testing
];
let mockRadius = 200;
let mockAttendance = [
  { nama: "Budi Santoso", jam: "07:15", statusLokasi: "✅ Dalam radius", sesi: "07:00-08:30" },
  { nama: "Siti Rahma", jam: "07:22", statusLokasi: "✅ Dalam radius", sesi: "07:00-08:30" },
  { nama: "Andi Wijaya", jam: "07:45", statusLokasi: "❌ Luar radius", sesi: "07:00-08:30" }
];
let mockFingerprints = new Set();
let mockNames = new Set();

/** Helper to serve static files */
function serveFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`Server Error: ${err.code}`);
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const method = req.method;

  /* CORS Headers */
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // --- API MOCK ROUTES ---

  /* 1. GET /api/validate-session */
  if (url.pathname === '/api/validate-session' && method === 'GET') {
    const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
    const active = mockSchedule.find(s => now >= s.start && now <= s.end);
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      data: {
        active: !!active,
        session: active || null,
        currentTime: now,
        message: active 
          ? `Sesi absen aktif: ${active.start} - ${active.end}` 
          : 'Sesi absen belum dibuka / sudah ditutup'
      }
    }));
    return;
  }

  /* 2. GET /api/get-schedule */
  if (url.pathname === '/api/get-schedule' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, data: { sessions: mockSchedule } }));
    return;
  }

  /* 3. POST /api/set-schedule */
  if (url.pathname === '/api/set-schedule' && method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const data = JSON.parse(body);
      mockSchedule = data.sessions;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, data: { sessions: mockSchedule, message: 'Jadwal sesi berhasil disimpan' } }));
    });
    return;
  }

  /* 4. POST /api/set-radius */
  if (url.pathname === '/api/set-radius' && method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const data = JSON.parse(body);
      mockRadius = Number(data.radius);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, data: { radius: mockRadius, message: `Radius diatur ke ${mockRadius} meter` } }));
    });
    return;
  }

  /* 5. GET /api/get-today */
  if (url.pathname === '/api/get-today' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, data: { rows: mockAttendance } }));
    return;
  }

  /* 6. POST /api/submit */
  if (url.pathname === '/api/submit' && method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const data = JSON.parse(body);
      const nama = data.nama?.trim();
      const fp = data.fingerprint;

      /* Anti-spam validations */
      if (mockNames.has(nama.toLowerCase())) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Nama ini sudah tercatat absen hari ini' }));
        return;
      }
      if (mockFingerprints.has(fp)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Perangkat ini sudah digunakan untuk absen hari ini' }));
        return;
      }

      mockNames.add(nama.toLowerCase());
      mockFingerprints.add(fp);

      const schoolLat = -6.2984798916658065;
      const schoolLng = 107.10119071620488;
      const lat = data.lat !== undefined ? Number(data.lat) : schoolLat;
      const lng = data.lng !== undefined ? Number(data.lng) : schoolLng;

      const { inRadius, distance } = checkRadius(lat, lng, schoolLat, schoolLng, mockRadius);
      if (!inRadius) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: `Anda berada di luar jangkauan absensi (${distance}m). Silakan mendekat ke lokasi sekolah.`
        }));
        return;
      }

      const statusLokasi = '✅ Dalam radius';

      const now = new Date();
      const jam = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
      const record = {
        nama,
        jam,
        statusLokasi,
        sesi: mockSchedule[0] ? `${mockSchedule[0].start}-${mockSchedule[0].end}` : '07:00-08:30'
      };
      mockAttendance.unshift(record);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        data: {
          nama,
          jam,
          statusLokasi,
          distance: `${distance}m`,
          sesi: record.sesi,
          message: 'Absensi berhasil dicatat (Local Mock)!'
        }
      }));
    });
    return;
  }

  // --- STATIC FILES ROUTING ---
  let filePath = '.' + url.pathname;
  if (filePath === './') {
    filePath = './index.html';
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
  };

  const contentType = mimeTypes[extname] || 'application/octet-stream';
  serveFile(res, filePath, contentType);
});

server.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`🚀 LOCAL MOCK SERVER BERJALAN!`);
  console.log(`👉 Buka: http://localhost:${PORT}`);
  console.log(`👉 Halaman Admin: http://localhost:${PORT}/?adminkey=RAHASIAKAMI`);
  console.log(`==================================================\n`);
});
