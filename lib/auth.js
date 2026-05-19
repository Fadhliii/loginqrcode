/**
 * auth.js — Helper validasi admin key
 * Memverifikasi apakah key yang diberikan cocok dengan ADMIN_KEY di env
 */

/**
 * Validasi admin key terhadap environment variable
 * @param {string} key - Key yang dikirim oleh client
 * @returns {boolean} true jika key valid
 * @throws {Error} jika ADMIN_KEY belum dikonfigurasi
 */
function validateAdminKey(key) {
  try {
    const adminKey = process.env.ADMIN_KEY;
    if (!adminKey) {
      throw new Error('ADMIN_KEY belum di-set di environment variables');
    }
    return typeof key === 'string' && key.length > 0 && key === adminKey;
  } catch (err) {
    throw new Error(`[auth.js] Gagal validasi admin key: ${err.message}`);
  }
}

module.exports = { validateAdminKey };
