/**
 * fingerprint.js — Helper hash device fingerprint
 * Menghasilkan hash SHA-256 dari data perangkat untuk identifikasi unik
 * File ini juga menjadi referensi logic yang dipakai di frontend (public/student.js)
 */

const crypto = require('crypto');

/**
 * Buat hash fingerprint dari data perangkat
 * @param {object} data - Data perangkat dari client
 * @param {string} data.userAgent
 * @param {number} data.screenWidth
 * @param {number} data.screenHeight
 * @param {string} data.timezone
 * @param {string} data.language
 * @param {number} data.hardwareConcurrency
 * @param {string|number} data.deviceMemory
 * @returns {string} 12 karakter pertama dari SHA-256 hash
 */
function hashFingerprint(data) {
  try {
    const raw = [
      data.userAgent || '',
      data.screenWidth || '',
      data.screenHeight || '',
      data.timezone || '',
      data.language || '',
      data.hardwareConcurrency || '',
      data.deviceMemory || 'unknown',
    ].join('|');

    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    return hash.substring(0, 12);
  } catch (err) {
    throw new Error(`[fingerprint.js] Gagal hash fingerprint: ${err.message}`);
  }
}

module.exports = { hashFingerprint };
