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
    <div className="flex items-center justify-center min-h-screen bg-black">
      <div className="flex flex-col w-full max-w-md">
        {/* Logo */}
        <div className="mb-6 text-center">
          <div className="inline-block w-24 h-24 rounded-lg bg-green-800/30 border-2 border-green-400 flex items-center justify-center mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-xl text-green-400 font-bold uppercase mb-1">SECURE COMMS</h1>
          <p className="text-xs text-gray-400 uppercase tracking-wide">MILITARY PERSONNEL AUTHENTICATION REQUIRED</p>
        </div>

        {/* Tab buttons */}
        <div className="grid grid-cols-2 mb-6 border-b border-zinc-800">
          <button
            className={`py-3 text-center uppercase text-sm font-medium ${
              activeTab === 'login' ? 'bg-green-800/20 text-white' : 'bg-zinc-800/30 text-gray-400'
            }`}
            onClick={() => setActiveTab('login')}
          >
            LOGIN
          </button>
          <button
            className={`py-3 text-center uppercase text-sm font-medium ${
              activeTab === 'register' ? 'bg-green-800/20 text-white' : 'bg-zinc-800/30 text-gray-400'
            }`}
            onClick={() => setActiveTab('register')}
          >
            REGISTER
          </button>
        </div>

        {/* Login form */}
        {activeTab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 uppercase mb-1">CALLSIGN / USERNAME</label>
              <input
                type="text"
                value={callsign}
                onChange={(e) => setCallsign(e.target.value)}
                className="w-full py-2 px-3 bg-transparent border border-zinc-800 rounded text-gray-200 placeholder-gray-500 uppercase text-sm"
                placeholder="ENTER CALLSIGN"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 uppercase mb-1">NRP / PERSONNEL ID</label>
              <input
                type="text"
                value={nrp}
                onChange={(e) => setNrp(e.target.value)}
                className="w-full py-2 px-3 bg-transparent border border-zinc-800 rounded text-gray-200 placeholder-gray-500 uppercase text-sm"
                placeholder="ENTER NRP"
                required
              />
            </div>

            <div className="relative">
              <div className="flex items-center justify-between">
                <label className="block text-xs text-gray-400 uppercase mb-1">SECURITY CODE / PASSWORD</label>
                <span className="text-xs text-gray-600 mb-1 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  ENCRYPTED
                </span>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full py-2 px-3 bg-transparent border border-zinc-800 rounded text-gray-200 placeholder-gray-500 uppercase text-sm"
                placeholder="ENTER SECURITY CODE"
                required
              />
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-900 text-red-400 px-3 py-2 rounded text-xs">
                {error}
              </div>
            )}

            <p className="text-gray-600 text-xs uppercase tracking-wide text-center">
              UNAUTHORIZED ACCESS IS STRICTLY PROHIBITED
            </p>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-green-800 hover:bg-green-700 text-white font-medium uppercase rounded flex items-center justify-center"
            >
              {loading ? (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              )}
              {loading ? 'PROCESSING...' : 'SECURE LOGIN'}
            </button>
          </form>
        )}

        {/* Registration form */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3">
            <div>
              <label className="block text-xs text-gray-400 uppercase mb-1">CALLSIGN / USERNAME</label>
              <input
                type="text"
                value={callsign}
                onChange={(e) => setCallsign(e.target.value)}
                className="w-full py-2 px-3 bg-transparent border border-zinc-800 rounded text-gray-200 placeholder-gray-500 uppercase text-sm"
                placeholder="ENTER CALLSIGN"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 uppercase mb-1">NRP / PERSONNEL ID</label>
              <input
                type="text"
                value={nrp}
                onChange={(e) => setNrp(e.target.value)}
                className="w-full py-2 px-3 bg-transparent border border-zinc-800 rounded text-gray-200 placeholder-gray-500 uppercase text-sm"
                placeholder="ENTER NRP"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 uppercase mb-1">FULL NAME</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full py-2 px-3 bg-transparent border border-zinc-800 rounded text-gray-200 placeholder-gray-500 uppercase text-sm"
                placeholder="ENTER FULL NAME"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 uppercase mb-1">RANK</label>
                <select
                  value={rank}
                  onChange={(e) => setRank(e.target.value)}
                  className="w-full py-2 px-3 bg-zinc-900 border border-zinc-800 rounded text-gray-200 uppercase text-sm"
                  required
                >
                  <option value="">SELECT RANK</option>
                  <option value="PVT">PVT - Private</option>
                  <option value="PFC">PFC - Private First Class</option>
                  <option value="SPC">SPC - Specialist</option>
                  <option value="CPL">CPL - Corporal</option>
                  <option value="SGT">SGT - Sergeant</option>
                  <option value="SSG">SSG - Staff Sergeant</option>
                  <option value="SFC">SFC - Sergeant First Class</option>
                  <option value="MSG">MSG - Master Sergeant</option>
                  <option value="1SG">1SG - First Sergeant</option>
                  <option value="SGM">SGM - Sergeant Major</option>
                  <option value="CSM">CSM - Command Sergeant Major</option>
                  <option value="2LT">2LT - Second Lieutenant</option>
                  <option value="1LT">1LT - First Lieutenant</option>
                  <option value="CPT">CPT - Captain</option>
                  <option value="MAJ">MAJ - Major</option>
                  <option value="LTC">LTC - Lieutenant Colonel</option>
                  <option value="COL">COL - Colonel</option>
                  <option value="BG">BG - Brigadier General</option>
                  <option value="MG">MG - Major General</option>
                  <option value="LTG">LTG - Lieutenant General</option>
                  <option value="GEN">GEN - General</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs text-gray-400 uppercase mb-1">BRANCH</label>
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full py-2 px-3 bg-zinc-900 border border-zinc-800 rounded text-gray-200 uppercase text-sm"
                  required
                >
                  <option value="">SELECT BRANCH</option>
                  <option value="INF">INF - Infantry</option>
                  <option value="ARM">ARM - Armor</option>
                  <option value="ART">ART - Artillery</option>
                  <option value="AVI">AVI - Aviation</option>
                  <option value="ENG">ENG - Engineer</option>
                  <option value="SIG">SIG - Signal</option>
                  <option value="MI">MI - Military Intelligence</option>
                  <option value="MP">MP - Military Police</option>
                  <option value="MED">MED - Medical</option>
                  <option value="LOG">LOG - Logistics</option>
                  <option value="SF">SF - Special Forces</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 uppercase mb-1">SECURITY CODE / PASSWORD</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full py-2 px-3 bg-transparent border border-zinc-800 rounded text-gray-200 placeholder-gray-500 uppercase text-sm"
                placeholder="ENTER SECURITY CODE"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 uppercase mb-1">CONFIRM SECURITY CODE</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full py-2 px-3 bg-transparent border border-zinc-800 rounded text-gray-200 placeholder-gray-500 uppercase text-sm"
                placeholder="CONFIRM SECURITY CODE"
                required
              />
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-900 text-red-400 px-3 py-2 rounded text-xs">
                {error}
              </div>
            )}

            <p className="text-gray-600 text-xs text-center mt-2">
              BY REGISTERING, YOU ACCEPT ALL MILITARY COMMUNICATION PROTOCOLS
            </p>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-green-800 hover:bg-green-700 text-white font-medium uppercase flex items-center justify-center rounded"
            >
              {loading ? (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              )}
              {loading ? 'PROCESSING...' : 'REGISTER PERSONNEL'}
            </button>
          </form>
        )}

        <div className="text-center mt-4">
          <p className="text-xs text-gray-600">© INTRANET COMMUNICATION ONLY • CLASSIFIED</p>
        </div>
      </div>
    </div>
  );
}