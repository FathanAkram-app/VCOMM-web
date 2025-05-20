import { useState } from 'react';
import { useLocation } from 'wouter';

export default function LoginPage() {
  const [callsign, setCallsign] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

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
        throw new Error(data.message || 'Gagal masuk. Coba lagi.');
      }

      // Berhasil login
      setLocation('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-900 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-green-500 mb-2">NXZZ-VComm</h1>
          <p className="text-zinc-400">Sistem Komunikasi Taktis</p>
        </div>

        <div className="bg-zinc-800 p-6 rounded-lg shadow-lg border border-green-900/30">
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label 
                htmlFor="callsign" 
                className="block text-sm font-medium text-zinc-300 mb-1"
              >
                Callsign
              </label>
              <input
                id="callsign"
                type="text"
                value={callsign}
                onChange={(e) => setCallsign(e.target.value)}
                className="w-full p-2 bg-zinc-700 border border-zinc-600 rounded-md 
                          text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>

            <div className="mb-6">
              <label 
                htmlFor="password" 
                className="block text-sm font-medium text-zinc-300 mb-1"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 bg-zinc-700 border border-zinc-600 rounded-md 
                          text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>

            {error && (
              <div className="mb-4 p-2 bg-red-900/30 border border-red-900/50 rounded text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 
                       text-white font-medium rounded-md focus:outline-none focus:ring-2 
                       focus:ring-green-500 focus:ring-opacity-50 transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Memproses...' : 'Login'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-zinc-500">
            <p>Sistem Komunikasi Militer Terenkripsi</p>
            <p className="mt-2">v1.5.0 - Tactical Communication Platform</p>
          </div>
        </div>
      </div>
    </div>
  );
}