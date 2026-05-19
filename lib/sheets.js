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

    return rows.slice(1) // skip header
      .filter((r) => r[1] === todayDate)
      .map((r) => ({
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
