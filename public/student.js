/**
 * student.js — Logic khusus halaman siswa
 * Validasi sesi → geolokasi → fingerprint → submit absensi
 */

/** Generate fingerprint hash dari data perangkat (mirror /lib/fingerprint.js) */
async function generateFingerprint() {
  try {
    const raw = [
      navigator.userAgent, screen.width, screen.height,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      navigator.language, navigator.hardwareConcurrency || '',
      navigator.deviceMemory || 'unknown',
    ].join('|');
    const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
    const hex = Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    return hex.substring(0, 12);
  } catch (err) {
    console.error('[student.js] Gagal generate fingerprint:', err);
    return 'unknown';
  }
}

/* State */
let studentState = { fingerprint: '', lat: null, lng: null, sessionActive: false, geoReady: false };

/** Minta izin dan dapatkan koordinat GPS */
function checkGeolocation() {
  const geoDot = document.getElementById('geo-dot');
  const geoText = document.getElementById('geo-text');
  const geoStatus = document.getElementById('geo-status');
  geoDot.className = 'geo-dot loading';
  geoText.textContent = 'Mendeteksi lokasi...';
  geoStatus.className = 'status-box alert-info';

  if (!navigator.geolocation) {
    geoDot.className = 'geo-dot inactive';
    geoText.textContent = 'Browser tidak mendukung geolokasi';
    geoStatus.className = 'status-box alert-danger';
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      studentState.lat = pos.coords.latitude;
      studentState.lng = pos.coords.longitude;
      studentState.geoReady = true;
      geoDot.className = 'geo-dot active';
      geoText.textContent = 'Lokasi terdeteksi ✓';
      geoStatus.className = 'status-box alert-success';
      updateSubmitButton();
    },
    () => {
      geoDot.className = 'geo-dot inactive';
      geoText.textContent = 'Gagal mendeteksi lokasi. Aktifkan GPS Anda.';
      geoStatus.className = 'status-box alert-danger';
      studentState.geoReady = false;
      updateSubmitButton();
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
}

/** Cek apakah sesi absen sedang aktif */
async function checkSession() {
  const msgEl = document.getElementById('session-message');
  const formEl = document.getElementById('attendance-form');
  try {
    const json = await (await fetch('/api/validate-session')).json();
    if (!json.success) {
      msgEl.className = 'status-box alert-danger';
      msgEl.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-alert-circle"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><span>${json.error}</span>`;
      formEl.classList.add('hidden');
      return;
    }
    if (json.data.active) {
      studentState.sessionActive = true;
      msgEl.className = 'status-box alert-success';
      msgEl.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-circle-2"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg><span>${json.data.message}</span>`;
      formEl.classList.remove('hidden');
      checkGeolocation();
    } else {
      studentState.sessionActive = false;
      msgEl.className = 'status-box alert-warning';
      msgEl.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clock"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><span>${json.data.message}</span>`;
      formEl.classList.add('hidden');
    }
  } catch (err) {
    msgEl.className = 'status-box alert-danger';
    msgEl.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-wifi-off"><line x1="2" y1="2" x2="22" y2="22"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><path d="M2 8.82a15 15 0 0 1 4.17-2.65"/><path d="M10.66 5c4.01-.36 8.14.9 11.34 3.82"/></svg><span>Gagal menghubungi server</span>`;
    formEl.classList.add('hidden');
  }
}

/** Enable/disable tombol submit berdasarkan state */
function updateSubmitButton() {
  const btn = document.getElementById('btn-submit');
  if (btn) btn.disabled = !(studentState.sessionActive && studentState.geoReady);
}

/** Submit data absensi ke server */
async function submitAttendance(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-submit');
  const nama = document.getElementById('input-nama').value.trim();
  if (!nama) return;

  /* State 1: LOADING */
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div> Sedang memproses...';

  try {
    const json = await (await fetch('/api/submit', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nama, fingerprint: studentState.fingerprint,
        lat: studentState.lat, lng: studentState.lng,
      }),
    })).json();

    if (json.success) {
      /* State 2: BERHASIL */
      document.getElementById('attendance-form').classList.add('hidden');
      document.getElementById('success-nama').textContent = json.data.nama;
      document.getElementById('success-jam').textContent = json.data.jam;
      document.getElementById('success-panel').classList.remove('hidden');
    } else {
      /* State 3: GAGAL */
      document.getElementById('attendance-form').classList.add('hidden');
      document.getElementById('failure-message').textContent = json.error || 'Terjadi kesalahan';
      document.getElementById('failure-panel').classList.remove('hidden');
    }
  } catch (err) {
    /* State 3: GAGAL (koneksi) */
    document.getElementById('attendance-form').classList.add('hidden');
    document.getElementById('failure-message').textContent = 'Gagal menghubungi server. Periksa koneksi Anda.';
    document.getElementById('failure-panel').classList.remove('hidden');
  }
}

/** Inisialisasi halaman siswa */
async function initStudent() {
  studentState.fingerprint = await generateFingerprint();
  await checkSession();

  const form = document.getElementById('form-absen');
  if (form) form.addEventListener('submit', submitAttendance);

  /* Handler tombol Coba Lagi */
  const tryAgainBtn = document.getElementById('btn-try-again');
  if (tryAgainBtn) {
    tryAgainBtn.addEventListener('click', () => {
      document.getElementById('failure-panel').classList.add('hidden');
      document.getElementById('attendance-form').classList.remove('hidden');
      const btn = document.getElementById('btn-submit');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = 'Submit Absensi';
      }
    });
  }
}

window.initStudent = initStudent;
