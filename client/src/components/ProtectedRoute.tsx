import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log("Not authenticated, redirecting to login");
      setLocation("/login");
    }
  }, [isLoading, isAuthenticated, setLocation]);

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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#171717]">
        <div className="flex flex-col items-center space-y-4 p-8 bg-[#222222] rounded-lg">
          <h1 className="text-[#a6c455] text-xl font-bold">Military Communications</h1>
          <p className="text-white">You need to log in to use this application.</p>
          <Button 
            onClick={() => setLocation("/login")} 
            className="bg-[#4d5d30] hover:bg-[#5a6b38] text-white py-2 px-4 rounded">
            Back to Login
          </Button>
        </div>
      </div>
    );
  }

  // Tampilkan konten halaman jika sudah terautentikasi
  return <>{children}</>;
}