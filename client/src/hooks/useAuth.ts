import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { useToast } from './use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { InsertUser, User } from '@shared/schema';
import { z } from 'zod';

// Schema validasi untuk login
export const loginSchema = z.object({
  callsign: z.string().min(2, { message: "Callsign minimal 2 karakter" }),
  password: z.string().min(6, { message: "Password minimal 6 karakter" }),
});

// Schema validasi untuk registrasi
export const registerSchema = z.object({
  callsign: z.string().min(2, { message: "Callsign minimal 2 karakter" }),
  nrp: z.string().min(5, { message: "NRP minimal 5 karakter" }),
  fullName: z.string().min(3, { message: "Nama lengkap minimal 3 karakter" }),
  rank: z.string().min(1, { message: "Pangkat harus diisi" }),
  branch: z.string().min(1, { message: "Kesatuan harus diisi" }),
  password: z.string().min(6, { message: "Password minimal 6 karakter" }),
  passwordConfirm: z.string().min(6, { message: "Konfirmasi password minimal 6 karakter" }),
}).refine((data) => data.password === data.passwordConfirm, {
  message: "Password dan konfirmasi password tidak sama",
  path: ["passwordConfirm"],
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginFormData) => Promise<void>;
  register: (data: RegisterFormData) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
}

const fetchJson = async (url: string, options: RequestInit = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Terjadi kesalahan');
  }

  return data;
};

export function useAuth(): AuthContextType {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Cek status autentikasi pengguna saat aplikasi dimuat
  const checkAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await fetchJson('/api/auth/me');
      setUser(data);
      setError(null);
    } catch (error) {
      setUser(null);
      // Tidak perlu menampilkan error saat pengecekan otomatis
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Proses login pengguna
  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      return fetchJson('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: (data) => {
      setUser(data);
      setError(null);
      toast({
        title: "Login berhasil",
        description: `Selamat datang, ${data.fullName || data.callsign}!`,
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    },
    onError: (error: Error) => {
      setError(error.message);
      toast({
        title: "Login gagal",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Proses registrasi pengguna baru
  const registerMutation = useMutation({
    mutationFn: async (data: RegisterFormData) => {
      // Hapus passwordConfirm karena tidak perlu dikirim ke server
      const { passwordConfirm, ...registerData } = data;
      return fetchJson('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(registerData),
      });
    },
    onSuccess: (data) => {
      setUser(data);
      setError(null);
      toast({
        title: "Registrasi berhasil",
        description: `Akun ${data.callsign} berhasil dibuat dan otomatis login.`,
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    },
    onError: (error: Error) => {
      setError(error.message);
      toast({
        title: "Registrasi gagal",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Proses logout
  const logoutMutation = useMutation({
    mutationFn: async () => {
      return fetchJson('/api/auth/logout', {
        method: 'POST',
      });
    },
    onSuccess: () => {
      setUser(null);
      toast({
        title: "Logout berhasil",
        description: "Anda telah keluar dari sistem.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout gagal",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const login = async (data: LoginFormData) => {
    setError(null);
    await loginMutation.mutateAsync(data);
  };

  const register = async (data: RegisterFormData) => {
    setError(null);
    await registerMutation.mutateAsync(data);
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  return {
    user,
    isLoading: isLoading || loginMutation.isPending || registerMutation.isPending || logoutMutation.isPending,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    error,
  };
}

// Pembuatan Context untuk membagi state auth ke seluruh aplikasi
export const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: false,
  isAuthenticated: false,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  error: null,
});

export const useAuthContext = () => useContext(AuthContext);