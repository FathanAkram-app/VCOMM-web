import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { User } from "@shared/schema";
import { useToast } from "./use-toast";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

/**
 * Hook untuk menangani autentikasi pengguna
 */
export function useAuth(): AuthState & {
  logout: () => Promise<void>;
  login: (callsign: string, password: string) => Promise<User>;
} {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);

  const { data: user, isLoading: isQueryLoading, refetch } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 0, // Tidak menyimpan cache, selalu fetch baru
    gcTime: 0, 
    refetchOnWindowFocus: true, // Refresh data ketika window aktif kembali
    onError: () => {
      console.log("Error fetching user data");
    },
    onSuccess: (data) => {
      console.log("User data fetched successfully:", data);
    }
  });

  // Memperbarui status loading global
  useEffect(() => {
    if (!isQueryLoading) {
      setIsLoading(false);
    }
  }, [isQueryLoading]);

  // Fungsi untuk login
  const login = async (callsign: string, password: string): Promise<User> => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ callsign, password }),
        credentials: "include"
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Login gagal");
      }

      const userData = await response.json();
      console.log("Login berhasil, data user:", userData);
      
      // Refresh user data dalam cache
      queryClient.setQueryData(["/api/auth/user"], userData);
      
      // Paksa refresh data user
      await refetch();
      
      // Return user data
      return userData;
    } catch (error: any) {
      console.error("Login error:", error);
      throw error;
    }
  };

  // Fungsi untuk logout
  const logout = async (): Promise<void> => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include"
      });

      if (response.ok) {
        // Clear query cache
        queryClient.clear();
        
        // Set user data to null
        queryClient.setQueryData(["/api/auth/user"], null);
        
        toast({
          title: "Logout berhasil",
          description: "Anda telah keluar dari sistem",
        });
      } else {
        throw new Error("Gagal logout");
      }
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        variant: "destructive",
        title: "Logout gagal",
        description: "Terjadi kesalahan saat logout",
      });
    }
  };

  return {
    user: user || null,
    isLoading: isLoading && isQueryLoading,
    isAuthenticated: !!user,
    logout,
    login
  };
}