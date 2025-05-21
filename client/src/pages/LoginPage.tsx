import { useState } from 'react';
import { useLocation } from 'wouter';

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [callsign, setCallsign] = useState('');
  const [nrp, setNrp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [rank, setRank] = useState('');
  const [branch, setBranch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [, setLocation] = useLocation();

  // Handle login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ callsign, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login gagal');
      }

      localStorage.setItem('user', JSON.stringify(data));
      setLocation('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validasi password
    if (password !== confirmPassword) {
      setError('Security Code tidak cocok');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          callsign,
          nrp,
          password,
          fullName,
          rank,
          branch
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registrasi gagal');
      }

      // Switch to login after successful registration
      setActiveTab('login');
      setPassword('');
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-6">
          <div className="w-24 h-24 mx-auto rounded-lg bg-green-700 border-2 border-green-400 flex items-center justify-center relative">
            <div className="absolute inset-0 bg-green-700 rounded-lg"></div>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
              className="w-14 h-14 text-black relative z-10" strokeWidth="1">
              <path strokeLinecap="round" strokeLinejoin="round" 
                d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-green-500 mt-2">SECURE COMMS</h1>
          <p className="text-xs text-zinc-400 tracking-wide">MILITARY PERSONNEL AUTHENTICATION REQUIRED</p>
        </div>

        {/* Login/Register Tabs */}
        <div className="grid grid-cols-2 mb-4">
          <button 
            onClick={() => setActiveTab('login')}
            className={`py-3 ${activeTab === 'login' ? 'bg-green-800 text-white' : 'bg-zinc-800 text-zinc-400'}`}
          >
            LOGIN
          </button>
          <button 
            onClick={() => setActiveTab('register')}
            className={`py-3 ${activeTab === 'register' ? 'bg-green-800 text-white' : 'bg-zinc-800 text-zinc-400'}`}
          >
            REGISTER
          </button>
        </div>

        {activeTab === 'login' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">CALLSIGN / USERNAME</label>
              <input
                type="text"
                value={callsign}
                onChange={(e) => setCallsign(e.target.value)}
                placeholder="ENTER CALLSIGN"
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-zinc-300"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">NRP / PERSONNEL ID</label>
              <input
                type="text"
                value={nrp}
                onChange={(e) => setNrp(e.target.value)}
                placeholder="ENTER NRP"
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-zinc-300"
              />
            </div>

            <div>
              <div className="flex justify-between items-center">
                <label className="block text-xs text-zinc-400 mb-1">SECURITY CODE / PASSWORD</label>
                <div className="text-xs text-zinc-600 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  ENCRYPTED
                </div>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="ENTER SECURITY CODE"
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-zinc-300"
              />
            </div>

            <div className="text-xs text-zinc-600 text-center">
              UNAUTHORIZED ACCESS IS STRICTLY PROHIBITED
            </div>

            <button
              onClick={handleLogin}
              className="w-full bg-green-800 hover:bg-green-700 text-white py-3 rounded flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              SECURE LOGIN
            </button>

            <div className="text-xs text-zinc-600 text-center">
              © INTRANET COMMUNICATION ONLY • CLASSIFIED
            </div>
          </div>
        )}

        {activeTab === 'register' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">CALLSIGN / USERNAME</label>
              <input
                type="text"
                value={callsign}
                onChange={(e) => setCallsign(e.target.value)}
                placeholder="ENTER CALLSIGN"
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-zinc-300"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">NRP / PERSONNEL ID</label>
              <input
                type="text"
                value={nrp}
                onChange={(e) => setNrp(e.target.value)}
                placeholder="ENTER NRP"
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-zinc-300"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">FULL NAME</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="ENTER FULL NAME"
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-zinc-300"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">RANK</label>
                <select
                  value={rank}
                  onChange={(e) => setRank(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-zinc-300"
                >
                  <option value="">SELECT RANK</option>
                  <option value="PVT">PVT - Private</option>
                  <option value="CPL">CPL - Corporal</option>
                  <option value="SGT">SGT - Sergeant</option>
                  <option value="LT">LT - Lieutenant</option>
                  <option value="CPT">CPT - Captain</option>
                  <option value="MAJ">MAJ - Major</option>
                  <option value="COL">COL - Colonel</option>
                  <option value="GEN">GEN - General</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">BRANCH</label>
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-zinc-300"
                >
                  <option value="">SELECT BRANCH</option>
                  <option value="INF">INF - Infantry</option>
                  <option value="ARM">ARM - Armor</option>
                  <option value="AVI">AVI - Aviation</option>
                  <option value="SIG">SIG - Signal</option>
                  <option value="INT">INT - Intelligence</option>
                  <option value="MED">MED - Medical</option>
                  <option value="LOG">LOG - Logistics</option>
                  <option value="ENG">ENG - Engineers</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">SECURITY CODE / PASSWORD</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="ENTER SECURITY CODE"
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-zinc-300"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">CONFIRM SECURITY CODE</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="CONFIRM SECURITY CODE"
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-zinc-300"
              />
            </div>

            <div className="text-xs text-zinc-600 text-center">
              BY REGISTERING, YOU ACCEPT ALL MILITARY COMMUNICATION PROTOCOLS
            </div>

            <button
              onClick={handleRegister}
              className="w-full bg-green-800 hover:bg-green-700 text-white py-3 rounded flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              REGISTER PERSONNEL
            </button>

            <div className="text-xs text-zinc-600 text-center">
              © INTRANET COMMUNICATION ONLY • CLASSIFIED
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
}