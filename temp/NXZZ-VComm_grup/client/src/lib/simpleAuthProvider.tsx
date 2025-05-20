import React, { createContext, useContext, useEffect, useState } from 'react';

// Tipe data untuk user
export interface SimpleUser {
  id: number;
  username: string;
  nrp?: string;
  name?: string;
  role?: string;
  rank?: string;
  unit?: string;
  isAuthenticated: boolean;
}

// Objek untuk menyimpan data user hardcoded
const USERS: { [key: string]: SimpleUser } = {
  'aji': {
    id: 9,
    username: 'aji',
    nrp: '1003',
    name: 'Aji S',
    role: 'user',
    rank: 'Sergeant',
    unit: 'Special Forces',
    isAuthenticated: true
  },
  'eko': {
    id: 7,
    username: 'eko',
    nrp: '1001',
    name: 'Eko P',
    role: 'admin', 
    rank: 'Colonel',
    unit: 'Special Forces',
    isAuthenticated: true
  },
  'david': {
    id: 8,
    username: 'david',
    nrp: '1002',
    name: 'David R',
    role: 'user',
    rank: 'Colonel',
    unit: 'Special Forces',
    isAuthenticated: true
  }
};

// Username to password mapping
const PASSWORDS: { [key: string]: string } = {
  'aji': 'aji123',
  'eko': 'eko123',
  'david': 'david123'
};

// Context untuk menyimpan state auth
type SimpleAuthContextType = {
  user: SimpleUser | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  isLoading: boolean;
};

const SimpleAuthContext = createContext<SimpleAuthContextType | null>(null);

const AUTH_STORAGE_KEY = 'simple_auth_user';

// Provider untuk auth context
export function SimpleAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SimpleUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user data from localStorage pada awal aplikasi
  useEffect(() => {
    const loadUser = () => {
      try {
        const savedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
        if (savedAuth) {
          const userData = JSON.parse(savedAuth);
          setUser(userData);
        }
      } catch (error) {
        console.error('Error loading auth data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  // Fungsi untuk login
  const login = (username: string, password: string): boolean => {
    // Cek apakah username ada
    const lowercaseUsername = username.toLowerCase();
    if (!USERS[lowercaseUsername]) {
      return false;
    }

    // Cek apakah password sesuai
    if (PASSWORDS[lowercaseUsername] !== password) {
      return false;
    }

    // Login berhasil
    const userData = USERS[lowercaseUsername];
    setUser(userData);

    // Simpan ke localStorage
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData));
    return true;
  };

  // Fungsi untuk logout
  const logout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  return (
    <SimpleAuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </SimpleAuthContext.Provider>
  );
}

// Hook untuk mengakses auth context
export function useSimpleAuth() {
  const context = useContext(SimpleAuthContext);
  if (!context) {
    throw new Error('useSimpleAuth must be used within a SimpleAuthProvider');
  }
  return context;
}