import { saveAuthData } from "./authUtils";

// Data pengguna hardcoded untuk keperluan demo
export const USERS: Record<string, any> = {
  "aji": {
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
  "eko": {
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
  "david": {
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
};

/**
 * Melakukan login tanpa komunikasi server
 * 
 * @param username Username pengguna
 * @param password Password pengguna
 * @returns Data user jika berhasil login, null jika gagal
 */
export function doStaticLogin(username: string, password: string): any {
  // Cari user berdasarkan username
  const userKey = username.toLowerCase();
  const user = USERS[userKey];
  
  // Jika user ditemukan dan password sesuai
  if (user && user.password === password) {
    // Simpan data di localStorage
    saveAuthData(user);
    return user;
  }
  
  // Jika login gagal
  return null;
}