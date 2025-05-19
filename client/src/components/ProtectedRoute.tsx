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
  
  // Langsung periksa apakah user ada
  const isAuthenticated = !!user;

  useEffect(() => {
    // Debug status autentikasi
    console.log("ProtectedRoute status:", { isLoading, isAuthenticated, user });
    
    // Redirect ke login jika tidak terautentikasi dan loading selesai
    if (!isLoading && !isAuthenticated) {
      console.log("Pengguna tidak terautentikasi, mengarahkan ke login");
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

  // Tampilkan konten halaman jika sudah terautentikasi
  return <>{children}</>;
}