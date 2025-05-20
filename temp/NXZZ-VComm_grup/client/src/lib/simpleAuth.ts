// Data pengguna statis (hardcoded)
let USERS = [
  {
    id: 9,
    username: "aji",
    password: "aji123",
    nrp: "1003",
    name: "Aji S",
    role: "user",
    rank: "Sergeant",
    unit: "Special Forces",
    isAuthenticated: true
  },
  {
    id: 7,
    username: "eko",
    password: "eko123",
    nrp: "1001",
    name: "Eko P",
    role: "admin",
    rank: "Colonel",
    unit: "Special Forces",
    isAuthenticated: true
  },
  {
    id: 8,
    username: "david",
    password: "david123",
    nrp: "1002",
    name: "David R",
    role: "user",
    rank: "Colonel",
    unit: "Special Forces",
    isAuthenticated: true
  }
];

// Key untuk penyimpanan data pengguna di localStorage
const USERS_KEY = 'military_comm_users';

// Storage key di localStorage
const AUTH_KEY = 'military_comm_auth';

// Interface untuk data user
export interface UserData {
  id: number;
  username: string;
  nrp?: string;
  name?: string;
  role?: string;
  rank?: string;
  unit?: string;
  isAuthenticated: boolean;
  password?: string; // Diperlukan untuk proses validasi login
}

// Interface untuk data tambahan registrasi
export interface RegistrationData {
  nrp?: string;
  fullName?: string;
  rank?: string;
  branch?: string;
}

/**
 * Melakukan login dengan username dan password
 */
export function simpleLogin(username: string, password: string): UserData | null {
  // Cari user yang cocok
  const user = USERS.find(u => 
    u.username.toLowerCase() === username.toLowerCase() && 
    u.password === password
  );
  
  if (user) {
    // Simpan ke localStorage
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    return user;
  }
  
  return null;
}

/**
 * Mendapatkan data user yang telah login
 */
export function getLoggedInUser(): UserData | null {
  const userData = localStorage.getItem(AUTH_KEY);
  if (!userData) return null;
  
  try {
    return JSON.parse(userData);
  } catch (e) {
    console.error('Error parsing user data', e);
    return null;
  }
}

/**
 * Memeriksa apakah user telah login
 */
export function isLoggedIn(): boolean {
  return getLoggedInUser() !== null;
}

/**
 * Logout user
 */
export function logout(): void {
  localStorage.removeItem(AUTH_KEY);
}

/**
 * Inisialisasi data pengguna dari localStorage jika ada
 */
function initializeUsers() {
  const storedUsers = localStorage.getItem(USERS_KEY);
  if (storedUsers) {
    try {
      const parsedUsers = JSON.parse(storedUsers);
      if (Array.isArray(parsedUsers) && parsedUsers.length > 0) {
        // Gabungkan dengan data default tetapi pastikan tidak ada duplikasi
        const userIds = new Set(USERS.map(u => u.id));
        for (const user of parsedUsers) {
          if (!userIds.has(user.id)) {
            USERS.push(user);
          }
        }
      }
    } catch (e) {
      console.error('Error parsing stored users data', e);
    }
  }
  
  // Simpan data pengguna ke localStorage
  localStorage.setItem(USERS_KEY, JSON.stringify(USERS));
}

// Inisialisasi data pengguna saat modul dimuat
initializeUsers();

/**
 * Mendaftarkan pengguna baru
 */
export function simpleRegister(
  username: string, 
  password: string, 
  additionalData: RegistrationData
): boolean {
  // Cek apakah username sudah ada
  if (USERS.some(u => u.username.toLowerCase() === username.toLowerCase())) {
    return false;
  }
  
  // Buat ID baru
  const newId = Math.max(...USERS.map(u => u.id), 0) + 1;
  
  // Buat pengguna baru
  const newUser: UserData = {
    id: newId,
    username,
    password,
    nrp: additionalData.nrp,
    name: additionalData.fullName,
    rank: additionalData.rank,
    unit: additionalData.branch,
    role: "user",
    isAuthenticated: true
  };
  
  // Tambahkan ke array users
  USERS.push(newUser);
  
  // Simpan ke localStorage
  localStorage.setItem(USERS_KEY, JSON.stringify(USERS));
  
  return true;
}