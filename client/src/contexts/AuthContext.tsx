import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

type User = {
  id: string;
  callsign: string;
  nrp?: string;
  rank?: string;
  fullName?: string;
  profileImageUrl?: string;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: { callsign: string; password: string }) => Promise<void>;
  register: (userData: { 
    callsign: string; 
    password: string; 
    nrp?: string;
    rank?: string;
    fullName?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();

  // Fetch the current user
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ['/api/auth/me'],
    retry: false,
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: { callsign: string; password: string }) => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login gagal');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      toast({
        title: 'Login berhasil',
        description: 'Selamat datang kembali',
        variant: 'success',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Login gagal',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (userData: { 
      callsign: string; 
      password: string; 
      nrp?: string;
      rank?: string;
      fullName?: string;
    }) => {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Registrasi gagal');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      toast({
        title: 'Registrasi berhasil',
        description: 'Akun baru telah dibuat',
        variant: 'success',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Registrasi gagal',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Logout gagal');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      toast({
        title: 'Logout berhasil',
        description: 'Anda telah keluar dari sistem',
        variant: 'military',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Logout gagal',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const login = async (credentials: { callsign: string; password: string }) => {
    await loginMutation.mutateAsync(credentials);
  };

  const register = async (userData: { 
    callsign: string; 
    password: string; 
    nrp?: string;
    rank?: string;
    fullName?: string;
  }) => {
    await registerMutation.mutateAsync(userData);
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  const value: AuthContextType = {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};