import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Lock } from "lucide-react";
import iconPath from "@assets/Icon Chat NXXZ.png";

export default function SimpleLogin() {
  const [callsign, setCallsign] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ callsign, password }),
      });
      
      if (response.ok) {
        // Login berhasil, refresh halaman untuk reload context
        window.location.href = '/';
      } else {
        alert('Login gagal. Periksa callsign dan password Anda.');
      }
    } catch (error) {
      console.error('Error during login:', error);
      alert('Terjadi kesalahan koneksi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#171717] via-[#2d2d2d] to-[#171717] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#8d9c6b]/10 border-2 border-[#8d9c6b]/20 mb-4">
            <img 
              src={iconPath} 
              alt="NXZZ-VComm" 
              className="w-12 h-12 object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">NXZZ-VComm</h1>
          <p className="text-[#8d9c6b] text-lg">Military Communications System</p>
        </div>

        {/* Login Form */}
        <div className="bg-[#2d2d2d] border border-[#8d9c6b]/20 rounded-lg p-6 shadow-xl">
          <div className="flex items-center gap-2 text-[#8d9c6b] mb-6">
            <Shield className="w-5 h-5" />
            <span className="font-semibold">SECURE LOGIN</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Callsign
              </label>
              <Input
                type="text"
                value={callsign}
                onChange={(e) => setCallsign(e.target.value)}
                placeholder="Masukkan callsign Anda"
                className="w-full bg-[#171717] border-[#8d9c6b]/30 text-white placeholder-gray-400"
                required
                minLength={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Password
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password Anda"
                className="w-full bg-[#171717] border-[#8d9c6b]/30 text-white placeholder-gray-400"
                required
                minLength={6}
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#8d9c6b] hover:bg-[#7a8a5f] text-white font-semibold py-3"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Authenticating...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  LOGIN
                </div>
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-[#8d9c6b]/20">
            <p className="text-xs text-gray-400 text-center">
              Authorized personnel only. All communications are monitored.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}