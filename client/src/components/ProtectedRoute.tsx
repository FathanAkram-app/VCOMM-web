import { ReactNode } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-lg font-medium text-primary">AUTHENTICATING...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Alihkan ke halaman login jika belum autentikasi
    setLocation("/login");
    return null;
  }

  // Tampilkan konten halaman jika sudah terautentikasi
  return <>{children}</>;
}