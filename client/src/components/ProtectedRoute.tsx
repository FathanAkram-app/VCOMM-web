import { ReactNode, useEffect, useState } from "react";
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
  const [redirectAttempts, setRedirectAttempts] = useState(0);
  
  // Langsung periksa apakah user ada
  const isAuthenticated = !!user;

  useEffect(() => {
    // Debug status autentikasi
    console.log("ProtectedRoute status:", { isLoading, isAuthenticated, user });
    
    // Redirect ke login jika tidak terautentikasi dan loading selesai
    if (!isLoading && !isAuthenticated) {
      // Jika sudah terlalu banyak mencoba redirect, jangan terus menerus redirect
      if (redirectAttempts < 3) {
        console.log("Pengguna tidak terautentikasi, mengarahkan ke login");
        setRedirectAttempts(prev => prev + 1);
        setLocation("/login");
      }
    } else if (isAuthenticated) {
      // Reset counter jika autentikasi berhasil
      setRedirectAttempts(0);
    }
  }, [isLoading, isAuthenticated, user, setLocation, redirectAttempts]);

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

  // Jika sudah terautentikasi ATAU terlalu banyak percobaan redirect, tampilkan konten
  return <>{children}</>;
}