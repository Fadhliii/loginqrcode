/**
 * admin.js — Logic khusus halaman admin
 * Mengelola QR code, jadwal sesi, radius, dan daftar absensi hari ini
 */
let ADMIN_KEY = '';

/** Ambil admin key dari URL */
function getAdminKey() {
  const params = new URLSearchParams(window.location.search);
  ADMIN_KEY = params.get('adminkey') || '';
}

/** Generate QR code permanen berisi URL website */
function initQRCode() {
  if (!ADMIN_KEY) return;
  const container = document.getElementById('qrcode');
  container.innerHTML = '';
  /* eslint-disable no-undef */
  new QRCode(container, {
    text: window.location.origin,
    width: 256,
    height: 256
  });
}

/** Download QR code sebagai PNG dengan label sekolah + tanggal */
function downloadQR() {
  const qrCanvas = document.querySelector('#qrcode canvas');
  const qrImg = document.querySelector('#qrcode img');
  const schoolName = document.getElementById('school-name-label')?.textContent || 'Sekolah';
  const today = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
  const exp = document.createElement('canvas'), ctx = exp.getContext('2d'), pad = 32;
  exp.width = 256 + pad * 2; exp.height = 256 + pad * 2 + 60;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, exp.width, exp.height);
  if (qrCanvas) {
    ctx.drawImage(qrCanvas, pad, pad);
  } else if (qrImg) {
    ctx.drawImage(qrImg, pad, pad, 256, 256);
  }
  ctx.fillStyle = '#1e1b4b'; ctx.font = 'bold 14px Inter,sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(schoolName, exp.width / 2, 256 + pad + 24);
  ctx.font = '12px Inter,sans-serif'; ctx.fillStyle = '#6b7280';
  ctx.fillText(today, exp.width / 2, 256 + pad + 44);
  const a = document.createElement('a');
  a.download = `QR-Absensi-${today.replace(/\s/g, '-')}.png`; a.href = exp.toDataURL('image/png'); a.click();
}

/** Render daftar sesi ke DOM */
function renderSessions(sessions) {
  const list = document.getElementById('session-list');
  if (!sessions.length) {
    list.innerHTML = '<div class="empty-state"><p>Belum ada sesi</p></div>';
    return;
  }
  list.innerHTML = sessions.map((s, i) => `
    <div class="session-item">
      <span class="session-time">🕐 ${s.start} — ${s.end}</span>
      <button class="btn btn-danger" onclick="removeSession(${i})">Hapus</button>
    </div>
  `).join('');
}

/** Muat jadwal sesi dari KV */
async function loadSchedule() {
  try {
    const json = await (await fetch('/api/get-schedule')).json();
    if (json.success) renderSessions(json.data.sessions);
  } catch (err) { console.error('[admin.js] Gagal muat jadwal:', err); }
}

/** Helper: ambil sessions saat ini dari API */
async function fetchSessions() {
  const json = await (await fetch('/api/get-schedule')).json();
  return json.success ? json.data.sessions : [];
}

/** Tambah sesi baru */
async function addSession() {
  const start = document.getElementById('session-start').value;
  const end = document.getElementById('session-end').value;
  if (!start || !end) return alert('Isi jam mulai dan selesai');
  if (start >= end) return alert('Jam mulai harus sebelum jam selesai');
  try {
    const sessions = await fetchSessions();
    sessions.push({ start, end });
    const res = await fetch('/api/set-schedule', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminkey: ADMIN_KEY, sessions }),
    });
    const json = await res.json();
    if (json.success) {
      renderSessions(sessions);
      document.getElementById('session-start').value = '';
      document.getElementById('session-end').value = '';
    } else { alert(json.error); }
  } catch (err) { alert('[admin.js] Gagal tambah sesi: ' + err.message); }
}

/** Hapus sesi berdasarkan index */
async function removeSession(index) {
  try {
    const sessions = await fetchSessions();
    sessions.splice(index, 1);
    await fetch('/api/set-schedule', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminkey: ADMIN_KEY, sessions }),
    });
    renderSessions(sessions);
  } catch (err) { alert('[admin.js] Gagal hapus sesi: ' + err.message); }
}

/** Simpan radius ke KV */
async function saveRadius() {
  const val = document.getElementById('radius-select').value;
  try {
    const res = await fetch('/api/set-radius', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminkey: ADMIN_KEY, radius: Number(val) }),
    });
    const json = await res.json();
    const msg = document.getElementById('radius-msg');
    msg.textContent = json.success ? '✅ Tersimpan' : json.error;
    msg.className = json.success ? 'badge badge-success' : 'badge badge-danger';
    setTimeout(() => { msg.textContent = ''; }, 3000);
  } catch (err) { alert('[admin.js] Gagal simpan radius: ' + err.message); }
}

/** Muat data absensi hari ini */
async function loadTodayAttendance() {
  const tbody = document.getElementById('attendance-body');
  tbody.innerHTML = '<tr><td colspan="4"><div class="skeleton" style="width:100%;height:32px"></div></td></tr>';
  try {
    const json = await (await fetch(`/api/get-today?adminkey=${ADMIN_KEY}`)).json();
    if (!json.success) { tbody.innerHTML = `<tr><td colspan="4">${json.error}</td></tr>`; return; }
    const rows = json.data.rows;
    document.getElementById('attendance-count').textContent = rows.length;
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">Belum ada absensi hari ini</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map((r) => `<tr>
      <td style="font-weight:600;color:var(--text-primary)">${r.nama}</td>
      <td>${r.jam}</td>
      <td>${r.statusLokasi.includes('✅')
        ? '<span class="badge badge-success">Dalam radius</span>'
        : '<span class="badge badge-danger">Luar radius</span>'}</td>
      <td style="color:var(--text-muted)">${r.sesi}</td>
    </tr>`).join('');
  } catch (err) { tbody.innerHTML = '<tr><td colspan="4">Gagal memuat data</td></tr>'; }
}

/** Inisialisasi halaman admin */
function initAdmin() {
  getAdminKey();
  document.getElementById('admin-panel').classList.remove('hidden');
  document.getElementById('student-panel').classList.add('hidden');
  initQRCode();
  loadSchedule();
  loadTodayAttendance();
  document.getElementById('btn-add-session').addEventListener('click', addSession);
  document.getElementById('btn-save-radius').addEventListener('click', saveRadius);
  document.getElementById('btn-download-qr').addEventListener('click', downloadQR);
  document.getElementById('btn-refresh').addEventListener('click', loadTodayAttendance);
}

window.initAdmin = initAdmin;
window.removeSession = removeSession;
