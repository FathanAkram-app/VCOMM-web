import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { AlertTriangle, Lock } from "lucide-react";
import logoPath from "@assets/Icon Chat NXXZ.png";

export default function MilitaryLoginPage() {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const { login, register } = useAuth();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  
  // Login form states
  const [callsign, setCallsign] = useState("");
  const [nrp, setNrp] = useState("");
  const [password, setPassword] = useState("");
  
  // Register form states
  const [regCallsign, setRegCallsign] = useState("");
  const [regNrp, setRegNrp] = useState("");
  const [regFullName, setRegFullName] = useState("");
  const [regRank, setRegRank] = useState("");
  const [regBranch, setRegBranch] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!callsign || !password) return;
    
    setIsLoading(true);
    try {
      // Login secara langsung dengan fetch untuk mendapatkan respons
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ callsign, password }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login gagal');
      }
      
      // Jika berhasil login, arahkan ke halaman chat
      const userData = await response.json();
      console.log("Login berhasil:", userData);
      
      // Simpan data user ke localStorage untuk state management
      localStorage.setItem('currentUser', JSON.stringify({
        ...userData,
        isAuthenticated: true
      }));
      
      // Redirect ke chat
      window.location.href = "/chat";
    } catch (error: any) {
      console.error("Login error:", error);
      alert(error.message || "Login gagal");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regCallsign || !regPassword || !regConfirmPassword) return;
    
    if (regPassword !== regConfirmPassword) {
      alert("Password tidak sama!");
      return;
    }
    
    setIsLoading(true);
    try {
      // Siapkan data untuk registrasi
      const formData = {
        callsign: regCallsign,
        password: regPassword,
        passwordConfirm: regPassword,
        nrp: regNrp || "",
        fullName: regFullName || "",
        rank: regRank || "",
        branch: regBranch || "ARM"
      };
      
      // Panggil endpoint registrasi secara langsung
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registrasi gagal');
      }
      
      // Jika berhasil, pindah ke tab login
      setActiveTab("login");
      alert("Registrasi berhasil! Silahkan login.");
    } catch (error: any) {
      console.error("Register error:", error);
      alert(error.message || "Terjadi kesalahan saat registrasi");
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4">
      {/* Logo */}
      <div className="mb-4">
        <img src={logoPath} alt="Secure Comms Logo" className="w-24 h-24" />
      </div>
      
      {/* App Title */}
      <h1 className="text-[#a2bd62] text-2xl font-bold mb-1">SECURE COMMS</h1>
      <p className="text-gray-400 text-sm mb-6">MILITARY PERSONNEL AUTHENTICATION REQUIRED</p>
      
      {/* Tabs */}
      <div className="w-full max-w-md mb-6">
        <div className="grid grid-cols-2 gap-2">
          <button 
            onClick={() => setActiveTab("login")}
            className={`py-3 px-6 text-center font-bold ${
              activeTab === "login" 
                ? "bg-[#717f4f] text-white" 
                : "bg-[#414639] text-gray-300"
            }`}
          >
            LOGIN
          </button>
          <button 
            onClick={() => setActiveTab("register")}
            className={`py-3 px-6 text-center font-bold ${
              activeTab === "register" 
                ? "bg-[#717f4f] text-white" 
                : "bg-[#414639] text-gray-300"
            }`}
          >
            REGISTER
          </button>
        </div>
      </div>
      
      {/* Login Form */}
      {activeTab === "login" && (
        <form onSubmit={handleLogin} className="w-full max-w-md space-y-6">
          <div className="space-y-2">
            <label htmlFor="callsign" className="block text-sm text-gray-300">
              CALLSIGN / USERNAME
            </label>
            <input
              id="callsign"
              type="text"
              value={callsign}
              onChange={(e) => setCallsign(e.target.value)}
              placeholder="ENTER CALLSIGN"
              className="w-full px-4 py-3 bg-[#2c2e2e] border border-[#4b4f45] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#a2bd62]"
              required
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="nrp" className="block text-sm text-gray-300">
              NRP / PERSONNEL ID
            </label>
            <input
              id="nrp"
              type="text"
              value={nrp}
              onChange={(e) => setNrp(e.target.value)}
              placeholder="ENTER NRP"
              className="w-full px-4 py-3 bg-[#2c2e2e] border border-[#4b4f45] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#a2bd62]"
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-sm text-gray-300">
                SECURITY CODE / PASSWORD
              </label>
              <span className="text-xs bg-[#35392e] px-2 py-1 flex items-center text-[#a2bd62]">
                <Lock className="h-3 w-3 mr-1" /> ENCRYPTED
              </span>
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="ENTER SECURITY CODE"
              className="w-full px-4 py-3 bg-[#2c2e2e] border border-[#4b4f45] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#a2bd62]"
              required
            />
          </div>
          
          <p className="text-xs text-gray-400 pt-2">
            UNAUTHORIZED ACCESS IS STRICTLY PROHIBITED.
          </p>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#717f4f] hover:bg-[#5d6a3d] text-white py-3 font-bold focus:outline-none focus:ring-2 focus:ring-[#a2bd62] flex items-center justify-center"
          >
            {isLoading ? "AUTHENTICATING..." : (
              <>
                <Lock className="h-4 w-4 mr-2" /> SECURE LOGIN
              </>
            )}
          </button>
        </form>
      )}
      
      {/* Register Form */}
      {activeTab === "register" && (
        <form onSubmit={handleRegister} className="w-full max-w-md space-y-6">
          <div className="space-y-2">
            <label htmlFor="reg-callsign" className="block text-sm text-gray-300">
              CALLSIGN / USERNAME
            </label>
            <input
              id="reg-callsign"
              type="text"
              value={regCallsign}
              onChange={(e) => setRegCallsign(e.target.value)}
              placeholder="ENTER CALLSIGN"
              className="w-full px-4 py-3 bg-[#2c2e2e] border border-[#4b4f45] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#a2bd62]"
              required
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="reg-nrp" className="block text-sm text-gray-300">
              NRP / PERSONNEL ID
            </label>
            <input
              id="reg-nrp"
              type="text"
              value={regNrp}
              onChange={(e) => setRegNrp(e.target.value)}
              placeholder="ENTER NRP"
              className="w-full px-4 py-3 bg-[#2c2e2e] border border-[#4b4f45] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#a2bd62]"
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="reg-fullname" className="block text-sm text-gray-300">
              FULL NAME
            </label>
            <input
              id="reg-fullname"
              type="text"
              value={regFullName}
              onChange={(e) => setRegFullName(e.target.value)}
              placeholder="ENTER FULL NAME"
              className="w-full px-4 py-3 bg-[#2c2e2e] border border-[#4b4f45] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#a2bd62]"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="reg-rank" className="block text-sm text-gray-300">
                RANK
              </label>
              <select
                id="reg-rank"
                value={regRank}
                onChange={(e) => setRegRank(e.target.value)}
                className="w-full px-4 py-3 bg-[#2c2e2e] border border-[#4b4f45] text-white focus:outline-none focus:ring-2 focus:ring-[#a2bd62]"
              >
                <option value="">SELECT RANK</option>
                <option value="PVT">PVT</option>
                <option value="PFC">PFC</option>
                <option value="SPC">SPC</option>
                <option value="CPL">CPL</option>
                <option value="SGT">SGT</option>
                <option value="SSG">SSG</option>
                <option value="2LT">2LT</option>
                <option value="1LT">1LT</option>
                <option value="CPT">CPT</option>
                <option value="MAJ">MAJ</option>
                <option value="LTC">LTC</option>
                <option value="COL">COL</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="reg-branch" className="block text-sm text-gray-300">
                BRANCH
              </label>
              <select
                id="reg-branch"
                value={regBranch}
                onChange={(e) => setRegBranch(e.target.value)}
                className="w-full px-4 py-3 bg-[#2c2e2e] border border-[#4b4f45] text-white focus:outline-none focus:ring-2 focus:ring-[#a2bd62]"
              >
                <option value="">SELECT BRANCH</option>
                <option value="ARM">ARMY</option>
                <option value="NAV">NAVY</option>
                <option value="AIR">AIR FORCE</option>
                <option value="MAR">MARINES</option>
                <option value="SPF">SPECIAL FORCES</option>
              </select>
            </div>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="reg-password" className="block text-sm text-gray-300">
              SECURITY CODE / PASSWORD
            </label>
            <input
              id="reg-password"
              type="password"
              value={regPassword}
              onChange={(e) => setRegPassword(e.target.value)}
              placeholder="ENTER SECURITY CODE"
              className="w-full px-4 py-3 bg-[#2c2e2e] border border-[#4b4f45] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#a2bd62]"
              required
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="reg-confirm-password" className="block text-sm text-gray-300">
              CONFIRM SECURITY CODE
            </label>
            <input
              id="reg-confirm-password"
              type="password"
              value={regConfirmPassword}
              onChange={(e) => setRegConfirmPassword(e.target.value)}
              placeholder="CONFIRM SECURITY CODE"
              className="w-full px-4 py-3 bg-[#2c2e2e] border border-[#4b4f45] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#a2bd62]"
              required
            />
          </div>
          
          <p className="text-xs text-gray-400 pt-2">
            BY REGISTERING, YOU ACCEPT ALL MILITARY COMMUNICATION PROTOCOLS.
          </p>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#717f4f] hover:bg-[#5d6a3d] text-white py-3 font-bold focus:outline-none focus:ring-2 focus:ring-[#a2bd62] flex items-center justify-center"
          >
            {isLoading ? "PROCESSING..." : "REGISTER PERSONNEL"}
          </button>
        </form>
      )}
      
      <div className="mt-6 text-xs text-gray-500 flex items-center">
        <AlertTriangle className="h-3 w-3 mr-1" /> INTRANET COMMUNICATIONS ONLY - CLASSIFIED
      </div>
    </div>
  );
}