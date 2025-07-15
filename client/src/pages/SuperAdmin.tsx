import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import AdminComplete from "./AdminComplete";

export default function SuperAdmin() {
  const { user, isLoading } = useAuth();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // Enhanced authentication check
    const checkSuperAdminAccess = async () => {
      try {
        const response = await fetch('/api/auth/user', {
          credentials: 'include'
        });
        
        if (!response.ok) {
          // Not authenticated at all
          alert('Anda belum login. Silakan login terlebih dahulu.');
          window.location.href = '/login';
          return;
        }
        
        const userData = await response.json();
        
        if (!userData || userData.role !== 'super_admin') {
          // Authenticated but not super admin
          alert('Akses ditolak. Anda tidak memiliki hak akses Super Admin.');
          window.location.href = '/';
          return;
        }
        
        setAuthChecked(true);
      } catch (error) {
        console.error('Error checking super admin access:', error);
        alert('Terjadi kesalahan saat memeriksa akses. Silakan login ulang.');
        window.location.href = '/login';
      }
    };

    if (!isLoading) {
      checkSuperAdminAccess();
    }
  }, [isLoading]);

  // Show loading until authentication is verified
  if (isLoading || !authChecked) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-[#8d9c6b] border-t-transparent rounded-full animate-spin"></div>
          <div className="text-[#8d9c6b]">VERIFYING SUPER ADMIN ACCESS...</div>
        </div>
      </div>
    );
  }

  // Double check user authentication
  if (!user || user.role !== 'super_admin') {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-red-400 text-center">
          <h2 className="text-xl font-bold mb-2">ACCESS DENIED</h2>
          <p>Super Admin privileges required</p>
          <button 
            onClick={() => window.location.href = '/login'}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  // Show full admin interface for verified super admin
  return <AdminComplete />;
}