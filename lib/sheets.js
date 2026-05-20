/**
 * sheets.js — Helper semua operasi Google Sheets
 * Mengelola autentikasi dan CRUD data absensi ke spreadsheet
 */

const { google } = require('googleapis');

/** Cache auth instance agar tidak re-init tiap request */
let cachedAuth = null;

/**
 * Dapatkan instance autentikasi Google Sheets
 * @returns {google.auth.JWT} Authenticated JWT client
 */
function getAuth() {
  try {
    if (cachedAuth) return cachedAuth;

    const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!raw) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON belum di-set');
    }

    const credentials = JSON.parse(raw);
    cachedAuth = new google.auth.JWT(
      credentials.client_email,
      null,
      credentials.private_key,
      ['https://www.googleapis.com/auth/spreadsheets']
    );
    return cachedAuth;
  } catch (err) {
    throw new Error(`[sheets.js] Gagal autentikasi: ${err.message}`);
  }
}

/**
 * Dapatkan instance Google Sheets API
 * @returns {sheets_v4.Sheets}
 */
function getSheetsClient() {
  return google.sheets({ version: 'v4', auth: getAuth() });
}

/**
 * Tambah baris baru ke sheet
 * @param {object} row - Data absensi
 * @param {string} row.tanggal - Tanggal WIB
 * @param {string} row.jam - Jam WIB
 * @param {string} row.nama - Nama lengkap
 * @param {string} row.statusLokasi - Status dalam/luar radius
 * @param {string} row.sesi - Label sesi (misal "07:00-07:30")
 * @param {string} row.fingerprint - Hash fingerprint perangkat
 */
async function appendRow(row) {
  try {
    const sheets = getSheetsClient();
    const spreadsheetId = process.env.SPREADSHEET_ID;
    if (!spreadsheetId) {
      throw new Error('SPREADSHEET_ID belum di-set');
    }

    /* Hitung nomor urut dari jumlah baris yang sudah ada */
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Sheet1!A:A',
    });
    const rowCount = existing.data.values ? existing.data.values.length : 0;
    const no = rowCount === 0 ? 1 : rowCount; // row 1 = header, data mulai row 2

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Sheet1!A:G',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          no,
          row.tanggal,
          row.jam,
          row.nama,
          row.statusLokasi,
          row.sesi,
          row.fingerprint,
        ]],
      },
    });
  } catch (err) {
    throw new Error(`[sheets.js] Gagal append row: ${err.message}`);
  }
}

/**
 * Helper untuk menormalkan format tanggal dari Google Sheets ke YYYY-MM-DD
 */
function parseSheetDate(val) {
  if (!val) return null;
  const str = val.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  
  const parts = str.split(/[-/]/);
  if (parts.length === 3) {
    let year, month, day;
    if (parts[0].length === 4) {
      year = parts[0];
      month = parts[1].padStart(2, '0');
      day = parts[2].padStart(2, '0');
    } else if (parts[2].length === 4) {
      year = parts[2];
      const p1 = parseInt(parts[0], 10);
      const p2 = parseInt(parts[1], 10);
      if (p1 > 12) {
        day = parts[0].padStart(2, '0');
        month = parts[1].padStart(2, '0');
      } else if (p2 > 12) {
        day = parts[1].padStart(2, '0');
        month = parts[0].padStart(2, '0');
      } else {
        // Default ke DD/MM/YYYY (locale Indonesia)
        day = parts[0].padStart(2, '0');
        month = parts[1].padStart(2, '0');
      }
    }
    if (year && month && day) {
      return `${year}-${month}-${day}`;
    }
  }

  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }
  return str;
}

/**
 * Ambil semua data absensi hari ini
 * @param {string} todayDate - Tanggal format YYYY-MM-DD
 * @returns {Array<object>} Array data absensi hari ini
 */
async function getTodayRows(todayDate) {
  try {
    const sheets = getSheetsClient();
    const spreadsheetId = process.env.SPREADSHEET_ID;
    if (!spreadsheetId) {
      throw new Error('SPREADSHEET_ID belum di-set');
    }

    const result = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Sheet1!A:G',
    });

    const rows = result.data.values || [];
    if (rows.length <= 1) return []; // hanya header atau kosong

    const nowWIB = new Date(Date.now() + 7 * 60 * 60 * 1000);
    const today = nowWIB.toISOString().split('T')[0];

    const filtered = rows.slice(1).filter((r) => {
      const normalizedRowDate = parseSheetDate(r[1]);
      const normalizedToday = parseSheetDate(today);
      return normalizedRowDate === normalizedToday;
    });

    console.log('[sheets.js] Mencari tanggal:', today);
    console.log('[sheets.js] Semua baris:', JSON.stringify(rows));
    console.log('[sheets.js] Baris cocok:', JSON.stringify(filtered));

    return filtered.map((r) => ({
      no: r[0],
      tanggal: r[1],
      jam: r[2],
      nama: r[3],
      statusLokasi: r[4],
      sesi: r[5] || '',
    }));
  } catch (err) {
    throw new Error(`[sheets.js] Gagal ambil data hari ini: ${err.message}`);
  }
}

module.exports = { appendRow, getTodayRows };
