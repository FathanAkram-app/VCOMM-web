import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import Admin from "./Admin";

export default function SuperAdmin() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    // Redirect non-super-admin users to main chat
    if (!isLoading && user && user.role !== 'super_admin') {
      window.location.href = '/';
    }
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!user || user.role !== 'super_admin') {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-red-400">Unauthorized - Super Admin access required</div>
      </div>
    );
  }

  // Show full admin interface for super admin
  return <Admin />;
}