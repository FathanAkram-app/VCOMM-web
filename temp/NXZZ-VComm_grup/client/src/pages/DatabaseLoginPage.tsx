import { useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useAuth } from "../context/LocalAuthContext";

export default function DatabaseLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [_, navigate] = useLocation();
  const { toast } = useToast();

  const { login: authLogin } = useAuth();
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast({
        title: "Validasi Gagal",
        description: "Username dan password diperlukan",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // Login dengan direct API endpoint
      const response = await fetch('/api/login/direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username,
          password
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Login gagal");
      }
      
      // Login berhasil
      const userData = data.user;
      
      // Gunakan AuthContext untuk login
      authLogin({
        ...userData,
        isAuthenticated: true
      });
      
      toast({
        title: "Login Berhasil",
        description: `Selamat datang, ${userData.username}. Saluran komunikasi aman telah dibuka.`,
      });
      
      // Redirect ke dashboard
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        title: "Login Gagal",
        description: error.message || "Kredensial tidak valid. Akses ditolak.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#121212]">
      <div className="w-[350px] relative overflow-hidden">
        <div className="p-6 border border-[#333333] rounded-md shadow-lg bg-[#1e1e1e] text-gray-300">
          <div className="mb-6">
            <h1 className="text-xl font-bold tracking-wider text-[#8d9c6b] mb-2">MILITARY SECURE COMMUNICATION</h1>
            <h2 className="text-white font-semibold mb-4">Welcome, Authorized Personnel Only</h2>
            
            <p className="text-sm mb-4">
              This is a <span className="font-semibold">classified military communication 
              system</span> intended for use by active duty personnel and authorized defense staff. All 
              communications—chat, voice call, and data transmission—are encrypted and monitored 
              under military security protocols.
            </p>
            
            <div className="bg-[#242424] p-3 rounded mb-4 text-sm">
              <p className="mb-2">Access to this system is restricted. Your Call Sign, Service Number (NRP), and Security Clearance will be required for authentication.</p>
            </div>
            
            <p className="text-sm mb-4">
              By continuing, you acknowledge:
            </p>
            
            <ul className="list-disc pl-5 text-sm mb-4 space-y-1">
              <li>You are entering a secure military communication network.</li>
              <li>Unauthorized access is strictly prohibited and subject to military law.</li>
              <li>All actions are logged and traceable.</li>
            </ul>
            
            <p className="italic text-sm mb-4 text-[#8d9c6b]">
              Maintain Operational Security. Stay Vigilant. Stay Connected.
            </p>
          </div>
          
          <form onSubmit={handleLogin}>
            <div className="space-y-4">
              <div className="mb-4">
                <Label htmlFor="username" className="text-[#a0a8c0] text-sm font-medium block mb-1">CALLSIGN / USERNAME</Label>
                <Input 
                  id="username" 
                  placeholder="Enter your call sign" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  className="w-full bg-[#2a2a2a] border-[#444444] text-white"
                />
              </div>
              
              <div className="mb-4">
                <Label htmlFor="password" className="text-[#a0a8c0] text-sm font-medium block mb-1">SECURITY CODE / PASSWORD</Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="Enter your security code"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full bg-[#2a2a2a] border-[#444444] text-white"
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full flex items-center justify-center space-x-2 py-2 bg-[#535e3f] hover:bg-[#677a4e] text-white rounded border-0 uppercase tracking-wider font-medium"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    AUTHENTICATING...
                  </>
                ) : (
                  <>
                    <span className="lock-icon mr-2">🔒</span>
                    <span>AUTHENTICATE NOW</span>
                    <span className="ml-2">→</span>
                  </>
                )}
              </Button>
            </div>
          </form>
          
          <div className="mt-4 text-center">
            <p className="text-[10px] text-gray-500">Click this button to begin secure authentication</p>
          </div>
        </div>
      </div>
    </div>
  );
}