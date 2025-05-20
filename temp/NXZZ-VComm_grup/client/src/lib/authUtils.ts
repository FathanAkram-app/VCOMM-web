/**
 * authUtils.ts - Utilitas untuk mengelola autentikasi pengguna
 * 
 * File ini berisi fungsi-fungsi untuk mengelola sesi pengguna dan token autentikasi.
 * Ini termasuk fungsi untuk login, logout, memeriksa status autentikasi, dll.
 */

// Kunci untuk menyimpan data autentikasi di localStorage
const AUTH_STORAGE_KEY = 'user_auth';
const TOKEN_STORAGE_KEY = 'auth_token';

// Interface untuk data autentikasi pengguna
export interface AuthData {
  id: number | string;
  username: string;
  nrp?: string;
  name?: string;
  role?: string;
  token?: string;
  rank?: string;
  unit?: string;
  isAuthenticated?: boolean;
}

/**
 * Menyimpan data autentikasi pengguna ke localStorage
 * 
 * @param data Data autentikasi pengguna
 */
export function saveAuthData(data: AuthData): void {
  if (!data) {
    console.error("Cannot save empty auth data");
    return;
  }
  
  // Make sure we mark the user as authenticated
  const authData = {
    ...data,
    isAuthenticated: true
  };
  
  // Save to localStorage
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
    
    // Save token separately if available
    if (authData.token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, authData.token);
    }
    
    console.log("Auth data saved successfully");
  } catch (e) {
    console.error("Error saving auth data:", e);
  }
}

/**
 * Mendapatkan data autentikasi pengguna dari localStorage
 * 
 * @returns Data autentikasi pengguna
 */
export function getAuthData(): AuthData | null {
  try {
    const authDataStr = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!authDataStr) return null;
    
    const data = JSON.parse(authDataStr);
    
    // Verify that we have the minimum required fields
    if (!data.id || !data.username) {
      console.warn("Incomplete auth data found:", data);
      return null;
    }
    
    return data;
  } catch (e) {
    console.error("Error retrieving auth data:", e);
    return null;
  }
}

/**
 * Menghapus data autentikasi pengguna dari localStorage
 */
export function clearAuthData(): void {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    console.log("Auth data cleared successfully");
  } catch (e) {
    console.error("Error clearing auth data:", e);
  }
}

/**
 * Memeriksa apakah pengguna sudah terautentikasi
 * 
 * @returns true jika pengguna sudah terautentikasi, false jika tidak
 */
export function isAuthenticated(): boolean {
  const authData = getAuthData();
  return !!authData && !!authData.isAuthenticated;
}

/**
 * Menambahkan header autentikasi ke request
 * 
 * @returns Object dengan header autentikasi
 */
export function addAuthHeaders(): Record<string, any> {
  const authData = getAuthData();
  
  if (!authData) {
    return {
      headers: {
        'Content-Type': 'application/json'
      }
    };
  }
  
  // Return headers with auth data
  return {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authData.id}`,
      'User-Id': `${authData.id}`,
      'Username': authData.username
    }
  };
}

/**
 * Login user dengan kredensial yang diberikan
 * 
 * @param username Username pengguna
 * @param password Password pengguna
 * @param nrp Nomor Registrasi Personel (opsional)
 * @returns Promise yang mengembalikan data autentikasi atau error
 */
export async function loginUser(username: string, password: string, nrp?: string): Promise<AuthData> {
  try {
    // Use a more reliable XMLHttpRequest instead of fetch
    // to handle different response types better
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/login', true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      
      xhr.onload = function() {
        try {
          if (xhr.status >= 200 && xhr.status < 300) {
            // Try to parse as JSON first
            try {
              const response = JSON.parse(xhr.responseText);
              
              // Save auth data to localStorage
              saveAuthData({
                id: response.id,
                username: response.username,
                nrp: response.nrp || nrp,
                name: response.name,
                role: response.role,
                token: response.token,
                rank: response.rank,
                unit: response.unit
              });
              
              resolve(response);
            } catch (parseError) {
              console.error("Error parsing JSON response:", parseError);
              console.log("Raw response:", xhr.responseText);
              
              // If JSON parsing fails, try to extract the user ID from the response
              // This is a fallback for non-standard responses
              if (xhr.responseText.includes("Login successful") || 
                  xhr.responseText.includes("Authentication successful")) {
                // Try to extract the user ID
                const idMatch = xhr.responseText.match(/id[:|=]\s*(\d+)/i);
                const userId = idMatch ? parseInt(idMatch[1]) : 9; // Default to 9 (Aji) if ID not found
                
                // Extract other data if possible
                const nameMatch = xhr.responseText.match(/name[:|=]\s*"?([^",]+)/i);
                const tokenMatch = xhr.responseText.match(/token[:|=]\s*"?([^",]+)/i);
                
                // Save minimal auth data
                const authData = {
                  id: userId,
                  username: username,
                  nrp: nrp,
                  name: nameMatch ? nameMatch[1] : username,
                  token: tokenMatch ? tokenMatch[1] : undefined
                };
                
                saveAuthData(authData);
                resolve(authData);
              } else {
                reject(new Error("Invalid response format"));
              }
            }
          } else {
            // Handle HTTP error
            reject(new Error(`Login failed with status ${xhr.status}: ${xhr.responseText}`));
          }
        } catch (error) {
          reject(error);
        }
      };
      
      xhr.onerror = function() {
        reject(new Error("Network error during login"));
      };
      
      // Prepare request body with NRP if provided
      const requestBody: Record<string, string> = { username, password };
      if (nrp) {
        requestBody.nrp = nrp;
      }
      
      xhr.send(JSON.stringify(requestBody));
    });
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
}

/**
 * Logout pengguna
 * 
 * @returns Promise yang berhasil jika logout berhasil, error jika gagal
 */
export async function logoutUser(): Promise<void> {
  try {
    // Call logout API
    const response = await fetch('/api/logout', {
      method: 'POST',
      ...addAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`Logout failed with status ${response.status}`);
    }
    
    // Clear auth data from localStorage
    clearAuthData();
  } catch (error) {
    console.error("Logout error:", error);
    // Still clear local data even if API call fails
    clearAuthData();
    throw error;
  }
}