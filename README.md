# 📋 Absensi Digital — Vercel + Google Sheets

Sistem absensi sekolah berbasis web dengan QR Code, validasi lokasi GPS, 
anti-joki via device fingerprint, dan penyimpanan data ke Google Sheets.

---

## 🏗️ Arsitektur

```
Browser → Vercel Serverless → Google Sheets (data absen)
                            → Vercel KV (jadwal, radius, fingerprint)
```

## 📁 Struktur File

```
/
├── index.html              → UI utama (admin + siswa)
├── vercel.json             → konfigurasi routing Vercel
├── package.json            → dependencies
├── .env.example            → contoh environment variables
│
├── /api
│   ├── submit.js           → validasi + simpan absen
│   ├── validate-session.js → cek jam sesi aktif
│   ├── set-schedule.js     → simpan jadwal sesi
│   ├── get-schedule.js     → ambil jadwal sesi
│   ├── set-radius.js       → update radius
│   └── get-today.js        → data absen hari ini
│
├── /lib
│   ├── auth.js             → validasi admin key
│   ├── fingerprint.js      → hash fingerprint (referensi)
│   ├── geo.js              → hitung jarak koordinat
│   ├── kv.js               → operasi Vercel KV
│   └── sheets.js           → operasi Google Sheets
│
└── /public
    ├── admin.js            → logic halaman admin
    ├── student.js          → logic halaman siswa
    └── style.css           → styling
```

---

## 🚀 Cara Setup & Deploy

### 1. Buat Google Service Account

1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Buat project baru atau pilih project yang ada
3. Aktifkan **Google Sheets API**:
   - Menu → APIs & Services → Library
   - Cari "Google Sheets API" → Enable
4. Buat Service Account:
   - Menu → APIs & Services → Credentials
   - Create Credentials → Service Account
   - Isi nama, klik Create
   - Skip role (opsional), klik Done
5. Buat Key:
   - Klik service account yang baru dibuat
   - Tab "Keys" → Add Key → Create new key → JSON
   - Download file JSON
6. Catat `client_email` dari file JSON (contoh: `absensi@project.iam.gserviceaccount.com`)

### 2. Buat Google Spreadsheet

1. Buat spreadsheet baru di [Google Sheets](https://sheets.google.com)
2. Di baris pertama (header), isi kolom:
   ```
   No | Tanggal | Jam | Nama Lengkap | Status Lokasi | Sesi | Fingerprint
   ```
3. Share spreadsheet ke `client_email` dari service account (Editor)
4. Salin Spreadsheet ID dari URL:
   ```
   https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
   ```

### 3. Buat Vercel KV

1. Buka [Vercel Dashboard](https://vercel.com/dashboard)
2. Pilih project → Tab "Storage" → Create → KV Database
3. Ikuti wizard, pilih region terdekat
4. Setelah dibuat, environment variables `KV_URL`, `KV_REST_API_URL`, 
   dan `KV_REST_API_TOKEN` otomatis tersedia di project

### 4. Isi Environment Variables

Di Vercel Dashboard → Project → Settings → Environment Variables:

| Variable | Keterangan |
|---|---|
| `ADMIN_KEY` | Key rahasia untuk akses admin (bebas) |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Isi seluruh file JSON service account (1 baris) |
| `SPREADSHEET_ID` | ID spreadsheet Google |
| `SCHOOL_LAT` | Latitude sekolah (contoh: `-6.4571`) |
| `SCHOOL_LNG` | Longitude sekolah (contoh: `107.0114`) |
| `RADIUS_METER` | Radius default dalam meter (contoh: `200`) |
| `SCHOOL_NAME` | Nama sekolah untuk label QR |
| `KV_URL` | Otomatis dari Vercel KV |
| `KV_REST_API_URL` | Otomatis dari Vercel KV |
| `KV_REST_API_TOKEN` | Otomatis dari Vercel KV |

> **Tips**: Untuk `GOOGLE_SERVICE_ACCOUNT_JSON`, buka file JSON lalu 
> salin seluruh isinya dalam 1 baris (tanpa line break).

### 5. Deploy ke Vercel

```bash
# Install Vercel CLI (jika belum)
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

Atau hubungkan repo GitHub ke Vercel untuk auto-deploy.

---

## 📖 Cara Pakai

### Admin
1. Buka `https://domain-anda.vercel.app/?adminkey=KEY_ANDA`
2. Atur jadwal sesi absen (contoh: 07:00-07:30, 12:00-12:15)
3. Atur radius geolokasi jika perlu
4. Download QR code, cetak dan tempel di kelas
5. Pantau daftar absensi hari ini (klik Refresh)

### Siswa
1. Scan QR code dengan kamera HP
2. Sistem otomatis cek: sesi aktif → lokasi GPS
3. Jika valid, isi nama lengkap dan submit
4. Selesai!

---

## 🔍 Debugging

Semua error memiliki prefix nama file untuk memudahkan pelacakan:

| Prefix Error | File | Kemungkinan Masalah |
|---|---|---|
| `[auth.js]` | `/lib/auth.js` | `ADMIN_KEY` tidak di-set atau tidak cocok |
| `[geo.js]` | `/lib/geo.js` | Koordinat tidak valid |
| `[kv.js]` | `/lib/kv.js` | Vercel KV tidak terhubung, cek env vars KV |
| `[sheets.js]` | `/lib/sheets.js` | Service account JSON salah, spreadsheet belum di-share |
| `[submit.js]` | `/api/submit.js` | Input tidak lengkap, sesi tidak aktif |
| `[validate-session.js]` | `/api/validate-session.js` | KV tidak tersedia |
| `[set-schedule.js]` | `/api/set-schedule.js` | Format sessions salah |
| `[get-today.js]` | `/api/get-today.js` | Admin key salah |

### Cek Log di Vercel
1. Vercel Dashboard → Project → Deployments → Klik deployment terbaru
2. Tab "Functions" → Klik function yang error → Lihat log

### Error Umum

**"GOOGLE_SERVICE_ACCOUNT_JSON belum di-set"**
→ Pastikan sudah mengisi env var dengan isi file JSON lengkap

**"Gagal append row"**
→ Pastikan spreadsheet sudah di-share ke email service account

**"KV connection error"**
→ Pastikan Vercel KV sudah dibuat dan terhubung ke project

---

## 🔒 Keamanan

- Admin key dikirim via query parameter, hanya untuk akses internal
- Device fingerprint mencegah absen ganda dari 1 perangkat
- Pengecekan nama mencegah duplikasi
- Geolokasi memastikan siswa berada di lokasi sekolah
- KV keys auto-expire setiap 24 jam (TTL 86400 detik)

---

## 📝 Lisensi

MIT — Bebas digunakan dan dimodifikasi.
