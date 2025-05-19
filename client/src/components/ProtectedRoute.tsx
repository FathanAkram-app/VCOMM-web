import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  // Langsung periksa apakah user ada, bukan menggunakan isAuthenticated
  const isAuthenticated = !!user;

  useEffect(() => {
    // Debug status autentikasi
    console.log("ProtectedRoute status:", { isLoading, isAuthenticated, user });
    
    if (!isLoading && !isAuthenticated) {
      console.log("Not authenticated, redirecting to login");
      setLocation("/login");
    }
  }, [isLoading, isAuthenticated, user, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#171717]">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-10 h-10 text-[#8d9c6b] animate-spin" />
          <p className="text-lg font-medium text-[#8d9c6b]">AUTHENTICATING...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !isLoading) {
    // Langsung arahkan ke halaman login
    setLocation("/login");
    
    // Tampilkan loading screen sampai redirect selesai
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#171717]">
        <div className="flex flex-col items-center space-y-4 p-8 bg-[#222222] rounded-lg">
          <h1 className="text-[#a6c455] text-xl font-bold">Military Communications</h1>
          <p className="text-white">Redirecting to login page...</p>
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#a6c455]"></div>
        </div>
      </div>
    );
  }

  // Tampilkan konten halaman jika sudah terautentikasi
  return <>{children}</>;
}