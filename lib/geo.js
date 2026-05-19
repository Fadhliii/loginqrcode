/**
 * geo.js — Helper hitung jarak koordinat menggunakan formula Haversine
 * Digunakan untuk validasi apakah siswa berada dalam radius sekolah
 */

const EARTH_RADIUS_METERS = 6371000;

/** Konversi derajat ke radian */
function toRad(deg) {
  return (deg * Math.PI) / 180;
}

/**
 * Hitung jarak antara 2 titik koordinat dalam meter (Haversine)
 * @param {number} lat1 - Latitude titik 1
 * @param {number} lng1 - Longitude titik 1
 * @param {number} lat2 - Latitude titik 2
 * @param {number} lng2 - Longitude titik 2
 * @returns {number} Jarak dalam meter (dibulatkan)
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  try {
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(EARTH_RADIUS_METERS * c);
  } catch (err) {
    throw new Error(`[geo.js] Gagal hitung jarak: ${err.message}`);
  }
}

/**
 * Cek apakah koordinat berada dalam radius dari titik pusat
 * @param {number} lat - Latitude user
 * @param {number} lng - Longitude user
 * @param {number} centerLat - Latitude pusat (sekolah)
 * @param {number} centerLng - Longitude pusat (sekolah)
 * @param {number} radiusMeter - Radius dalam meter
 * @returns {{ inRadius: boolean, distance: number }}
 */
function checkRadius(lat, lng, centerLat, centerLng, radiusMeter) {
  try {
    const distance = calculateDistance(lat, lng, centerLat, centerLng);
    return { inRadius: distance <= radiusMeter, distance };
  } catch (err) {
    throw new Error(`[geo.js] Gagal cek radius: ${err.message}`);
  }
}

module.exports = { calculateDistance, checkRadius };
