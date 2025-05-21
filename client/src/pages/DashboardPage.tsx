import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';

type User = {
  id: number;
  callsign: string;
  fullName?: string;
  rank?: string;
};

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Cek apakah user sudah login
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      setLocation('/');
      return;
    }

    try {
      const userData = JSON.parse(storedUser);
      setUser(userData);
    } catch (error) {
      console.error('Error parsing user data:', error);
      localStorage.removeItem('user');
      setLocation('/');
    } finally {
      setIsLoading(false);
    }
  }, [setLocation]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    setLocation('/');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="text-green-500 text-lg">
          <div className="border-2 border-green-500 border-t-transparent rounded-full w-8 h-8 animate-spin mb-2 mx-auto"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-black">
      {/* Header */}
      <header className="bg-zinc-900 border-b border-green-900/50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-green-800/50 border border-green-500 rounded-md flex items-center justify-center mr-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </div>
            <h1 className="text-green-500 font-bold text-lg uppercase">NXZZ-VComm</h1>
          </div>
          
          <div className="flex items-center">
            <div className="mr-4 text-right hidden sm:block">
              <p className="text-sm text-white">{user?.rank} {user?.callsign}</p>
              <p className="text-xs text-gray-400">{user?.fullName || 'Personnel'}</p>
            </div>
            <button 
              onClick={handleLogout}
              className="bg-zinc-800 hover:bg-zinc-700 text-white text-sm px-3 py-1 rounded border border-zinc-700"
            >
              LOGOUT
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-zinc-900 p-5 rounded-lg border border-zinc-800">
            <h2 className="text-xl font-bold mb-3 text-green-400">Komunikasi Taktis</h2>
            <p className="text-zinc-300 mb-4">
              Sistem komunikasi taktis untuk militer dengan fitur panggilan audio dan video taktis.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button className="bg-green-800 hover:bg-green-700 text-white py-3 px-4 rounded flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                COMMS
              </button>
              <button className="bg-green-800 hover:bg-green-700 text-white py-3 px-4 rounded flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
                </svg>
                CALL
              </button>
            </div>
          </div>
          
          <div className="bg-zinc-900 p-5 rounded-lg border border-zinc-800">
            <h2 className="text-xl font-bold mb-3 text-green-400">Status Sistem</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">WebSocket Connection</span>
                <span className="bg-green-900/30 text-green-500 px-2 py-1 rounded text-xs font-medium">ACTIVE</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Database Connection</span>
                <span className="bg-green-900/30 text-green-500 px-2 py-1 rounded text-xs font-medium">CONNECTED</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Last Activity</span>
                <span className="text-zinc-300 text-sm">{new Date().toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-zinc-900 p-5 rounded-lg border border-zinc-800">
          <h2 className="text-xl font-bold mb-4 text-green-400">Fitur Terimplementasi</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-zinc-800 p-4 rounded border border-zinc-700">
              <div className="flex items-center mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <h3 className="font-bold text-white">Pesan Instan</h3>
              </div>
              <p className="text-zinc-400 text-sm">Komunikasi teks real-time, terenkripsi dan aman.</p>
            </div>
            
            <div className="bg-zinc-800 p-4 rounded border border-zinc-700">
              <div className="flex items-center mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <h3 className="font-bold text-white">Panggilan Audio</h3>
              </div>
              <p className="text-zinc-400 text-sm">Panggilan suara kualitas tinggi, hemat bandwidth.</p>
            </div>
            
            <div className="bg-zinc-800 p-4 rounded border border-zinc-700">
              <div className="flex items-center mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <h3 className="font-bold text-white">Panggilan Video</h3>
              </div>
              <p className="text-zinc-400 text-sm">Komunikasi video tatap muka untuk pengarahan taktis.</p>
            </div>
            
            <div className="bg-zinc-800 p-4 rounded border border-zinc-700">
              <div className="flex items-center mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h3 className="font-bold text-white">Grup Taktis</h3>
              </div>
              <p className="text-zinc-400 text-sm">Komunikasi grup untuk koordinasi unit dan tim.</p>
            </div>
            
            <div className="bg-zinc-800 p-4 rounded border border-zinc-700">
              <div className="flex items-center mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <h3 className="font-bold text-white">Transfer File</h3>
              </div>
              <p className="text-zinc-400 text-sm">Pengiriman file aman untuk dokumen dan media taktis.</p>
            </div>
            
            <div className="bg-zinc-800 p-4 rounded border border-zinc-700">
              <div className="flex items-center mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z" />
                </svg>
                <h3 className="font-bold text-white">Voice Notes</h3>
              </div>
              <p className="text-zinc-400 text-sm">Pesan suara asinkron untuk komunikasi taktis.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-zinc-900 border-t border-zinc-800 py-3">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <p className="text-zinc-500 text-xs">NXZZ-VComm © CLASSIFIED</p>
            <p className="text-zinc-500 text-xs">INTRANET USE ONLY</p>
          </div>
        </div>
      </footer>
    </div>
  );
}