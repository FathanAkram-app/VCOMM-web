import { useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, Lock, User, AlertTriangle } from "lucide-react";
import iconPath from "@assets/Icon Chat NXXZ.png";

// Tidak perlu import komponen UI karena kita menggunakan native HTML elements

export default function TabbedLoginPage() {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Login states
  const [username, setUsername] = useState("");
  const [nrp, setNrp] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Registration states
  const [regUsername, setRegUsername] = useState("");
  const [regNrp, setRegNrp] = useState("");
  const [regFullName, setRegFullName] = useState("");
  const [regRank, setRegRank] = useState("");
  const [regBranch, setRegBranch] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regLoading, setRegLoading] = useState(false);

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
      
      // Simpan data pengguna ke localStorage
      localStorage.setItem("currentUser", JSON.stringify({
        ...userData,
        isAuthenticated: true
      }));
      
      toast({
        title: "Login Berhasil",
        description: `Selamat datang, ${userData.username}. Saluran komunikasi aman telah dibuka.`,
      });
      
      // Reload halaman untuk menampilkan SimpleView
      window.location.reload();
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validasi form
    if (!regUsername || !regPassword || !regConfirmPassword || !regNrp || !regFullName || !regRank || !regBranch) {
      toast({
        title: "Validasi Gagal",
        description: "Semua kolom wajib diisi",
        variant: "destructive"
      });
      return;
    }
    
    if (regPassword !== regConfirmPassword) {
      toast({
        title: "Validasi Gagal",
        description: "Password dan konfirmasi password tidak cocok",
        variant: "destructive"
      });
      return;
    }
    
    setRegLoading(true);
    
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: regUsername,
          nrp: regNrp,
          full_name: regFullName,
          rank: regRank,
          branch: regBranch,
          password: regPassword
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Registrasi gagal");
      }
      
      toast({
        title: "Registrasi Berhasil",
        description: "Silakan login dengan akun baru Anda",
      });
      
      // Reset form dan pindah ke tab login
      setRegUsername("");
      setRegNrp("");
      setRegFullName("");
      setRegRank("");
      setRegBranch("");
      setRegPassword("");
      setRegConfirmPassword("");
      setActiveTab("login");
      
    } catch (error: any) {
      console.error("Registration error:", error);
      toast({
        title: "Registrasi Gagal",
        description: error.message || "Tidak dapat mendaftarkan pengguna baru",
        variant: "destructive",
      });
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#1e1e1e]">
      <div className="w-[400px] max-w-[90%]">
        {/* Logo dan Judul */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-24 h-24 mb-2">
            <img src={iconPath} alt="Secure Comms Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-xl font-bold text-[#9eb36b] uppercase mb-1">SECURE COMMS</h1>
          <p className="text-sm text-gray-400 uppercase">MILITARY PERSONNEL AUTHENTICATION REQUIRED</p>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex mb-6">
          <button 
            className={`flex-1 py-3 text-center uppercase font-medium transition-colors ${activeTab === 'login' ? 'bg-[#656e56] text-white' : 'bg-[#3a3a3a] text-gray-400 hover:bg-[#454545]'}`}
            onClick={() => setActiveTab("login")}
          >
            LOGIN
          </button>
          <button 
            className={`flex-1 py-3 text-center uppercase font-medium transition-colors ${activeTab === 'register' ? 'bg-[#656e56] text-white' : 'bg-[#3a3a3a] text-gray-400 hover:bg-[#454545]'}`}
            onClick={() => setActiveTab("register")}
          >
            REGISTER
          </button>
        </div>
        
        {/* Login Form */}
        {activeTab === "login" && (
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium uppercase text-gray-400 block">CALLSIGN / USERNAME</label>
              <input 
                type="text"
                placeholder="ENTER CALLSIGN"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full py-3 px-4 bg-[#2a2a2a] border border-[#444] rounded text-white placeholder:text-gray-500"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium uppercase text-gray-400 block">NRP / PERSONNEL ID</label>
              <input 
                type="text"
                placeholder="ENTER NRP"
                value={nrp}
                onChange={(e) => setNrp(e.target.value)}
                className="w-full py-3 px-4 bg-[#2a2a2a] border border-[#444] rounded text-white placeholder:text-gray-500"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium uppercase text-gray-400">SECURITY CODE / PASSWORD</label>
                <div className="flex items-center space-x-1 text-[10px] bg-[#3a3a3a] px-2 py-1 rounded text-gray-400">
                  <Lock className="w-3 h-3" />
                  <span>ENCRYPTED</span>
                </div>
              </div>
              <input 
                type="password"
                placeholder="ENTER SECURITY CODE"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full py-3 px-4 bg-[#2a2a2a] border border-[#444] rounded text-white placeholder:text-gray-500"
              />
            </div>
            
            <div>
              <p className="text-xs text-gray-500 mb-4">UNAUTHORIZED ACCESS IS STRICTLY PROHIBITED.</p>
            </div>
            
            <button 
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#535e3f] hover:bg-[#677a4e] text-white rounded flex items-center justify-center space-x-2 uppercase"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span>AUTHENTICATING...</span>
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  <span>SECURE LOGIN</span>
                </>
              )}
            </button>
            
            <div className="pt-2 text-center">
              <p className="text-[10px] text-gray-500">
                <AlertTriangle className="inline h-3 w-3 mr-1" />
                INTRANET COMMUNICATIONS ONLY - CLASSIFIED
              </p>
            </div>
          </form>
        )}
        
        {/* Register Form */}
        {activeTab === "register" && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium uppercase text-gray-400 block">CALLSIGN / USERNAME</label>
              <input 
                type="text"
                placeholder="ENTER CALLSIGN"
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                className="w-full py-2 px-4 bg-[#2a2a2a] border border-[#444] rounded text-white placeholder:text-gray-500"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium uppercase text-gray-400 block">NRP / PERSONNEL ID</label>
              <input 
                type="text"
                placeholder="ENTER NRP"
                value={regNrp}
                onChange={(e) => setRegNrp(e.target.value)}
                className="w-full py-2 px-4 bg-[#2a2a2a] border border-[#444] rounded text-white placeholder:text-gray-500"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium uppercase text-gray-400 block">FULL NAME</label>
              <input 
                type="text"
                placeholder="ENTER FULL NAME"
                value={regFullName}
                onChange={(e) => setRegFullName(e.target.value)}
                className="w-full py-2 px-4 bg-[#2a2a2a] border border-[#444] rounded text-white placeholder:text-gray-500"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium uppercase text-gray-400 block">RANK</label>
                <select
                  value={regRank}
                  onChange={(e) => setRegRank(e.target.value)}
                  className="w-full py-2 px-4 bg-[#2a2a2a] border border-[#444] rounded text-white"
                >
                  <option value="" disabled>SELECT RANK</option>
                  <option value="Private">PRIVATE</option>
                  <option value="Sergeant">SERGEANT</option>
                  <option value="Lieutenant">LIEUTENANT</option>
                  <option value="Captain">CAPTAIN</option>
                  <option value="Major">MAJOR</option>
                  <option value="Colonel">COLONEL</option>
                  <option value="General">GENERAL</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium uppercase text-gray-400 block">BRANCH</label>
                <select
                  value={regBranch}
                  onChange={(e) => setRegBranch(e.target.value)}
                  className="w-full py-2 px-4 bg-[#2a2a2a] border border-[#444] rounded text-white"
                >
                  <option value="" disabled>SELECT BRANCH</option>
                  <option value="Army">ARMY</option>
                  <option value="Navy">NAVY</option>
                  <option value="Air Force">AIR FORCE</option>
                  <option value="Marines">MARINES</option>
                  <option value="Special Forces">SPECIAL FORCES</option>
                </select>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium uppercase text-gray-400 block">SECURITY CODE / PASSWORD</label>
              <input 
                type="password"
                placeholder="ENTER SECURITY CODE"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                className="w-full py-2 px-4 bg-[#2a2a2a] border border-[#444] rounded text-white placeholder:text-gray-500"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium uppercase text-gray-400 block">CONFIRM SECURITY CODE</label>
              <input 
                type="password"
                placeholder="CONFIRM SECURITY CODE"
                value={regConfirmPassword}
                onChange={(e) => setRegConfirmPassword(e.target.value)}
                className="w-full py-2 px-4 bg-[#2a2a2a] border border-[#444] rounded text-white placeholder:text-gray-500"
              />
            </div>
            
            <div>
              <p className="text-xs text-gray-500 mb-4">BY REGISTERING, YOU ACCEPT ALL MILITARY COMMUNICATION PROTOCOLS.</p>
            </div>
            
            <button 
              type="submit"
              disabled={regLoading}
              className="w-full py-3 bg-[#535e3f] hover:bg-[#677a4e] text-white rounded flex items-center justify-center space-x-2 uppercase"
            >
              {regLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span>PROCESSING...</span>
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  <span>REGISTER PERSONNEL</span>
                </>
              )}
            </button>
            
            <div className="pt-2 text-center">
              <p className="text-[10px] text-gray-500">
                <AlertTriangle className="inline h-3 w-3 mr-1" />
                INTRANET COMMUNICATIONS ONLY - CLASSIFIED
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}