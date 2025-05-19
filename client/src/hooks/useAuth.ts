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
} {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);

  const { data: user, isLoading: isQueryLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 menit
    onError: () => {
      setIsLoading(false);
    },
    onSuccess: () => {
      setIsLoading(false);
    }
  });

  // Memperbarui status loading global
  useEffect(() => {
    if (!isQueryLoading) {
      setIsLoading(false);
    }
  }, [isQueryLoading]);

  // Fungsi untuk logout
  const logout = async (): Promise<void> => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include"
      });

      if (response.ok) {
        // Invalidate query cache
        queryClient.clear();
        
        toast({
          title: "Logout berhasil",
          description: "Anda telah keluar dari sistem",
        });
        
        // Redirect ke halaman login
        window.location.href = "/login";
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
    isLoading: isLoading || isQueryLoading,
    isAuthenticated: !!user,
    logout
  };
}