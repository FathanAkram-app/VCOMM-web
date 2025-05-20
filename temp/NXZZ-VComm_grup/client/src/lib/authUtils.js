/**
 * Utilitas untuk mengelola autentikasi dan data pengguna
 */

// Kunci untuk menyimpan data pengguna di localStorage
const AUTH_DATA_KEY = 'authCredentials';

/**
 * Menyimpan data autentikasi pengguna di localStorage
 * @param {Object} userData - Data pengguna yang akan disimpan
 */
export function saveAuthData(userData) {
  if (!userData) return;
  
  try {
    localStorage.setItem(AUTH_DATA_KEY, JSON.stringify(userData));
  } catch (error) {
    console.error('Error saving auth data:', error);
  }
}

/**
 * Mengambil data autentikasi pengguna dari localStorage
 * @returns {Object|null} Data pengguna yang tersimpan, atau null jika tidak ada
 */
export function getAuthData() {
  try {
    const userData = localStorage.getItem(AUTH_DATA_KEY);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Error getting auth data:', error);
    return null;
  }
}

/**
 * Menghapus data autentikasi pengguna dari localStorage
 */
export function clearAuthData() {
  try {
    localStorage.removeItem(AUTH_DATA_KEY);
  } catch (error) {
    console.error('Error clearing auth data:', error);
  }
}

/**
 * Menambahkan header autentikasi ke request options
 * @param {Object} options - Request options yang akan dimodifikasi
 * @returns {Object} Request options dengan header autentikasi
 */
export function addAuthHeaders(options = {}) {
  const userData = getAuthData();
  
  if (!userData || !userData.token) {
    return options;
  }
  
  return {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${userData.token}`
    }
  };
}

/**
 * Memeriksa apakah pengguna sudah login
 * @returns {boolean} True jika pengguna sudah login, false jika belum
 */
export function isAuthenticated() {
  return !!getAuthData();
}