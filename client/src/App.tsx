import { WebSocketProvider } from './context/WebSocketContext';
import { NotificationProvider } from './context/NotificationContext';
import { CallProvider } from './context/CallContext';
import { GroupCallProvider } from './context/GroupCallContext';
import NotificationManager from './components/NotificationManager';
import CallManager from './components/CallManager';
import GroupCallManager from './components/GroupCallManager';

function App() {
  return (
    <WebSocketProvider>
      <NotificationProvider>
        <CallProvider>
          <GroupCallProvider>
            <div className="min-h-screen bg-zinc-900 text-white">
              {/* Halaman Demo */}
              <div className="container mx-auto p-4">
                <h1 className="text-3xl font-bold text-center text-green-500 my-8">
                  NXZZ-VComm System
                </h1>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-zinc-800 p-4 rounded-lg">
                    <h2 className="text-xl font-bold mb-4 text-green-400">Fitur Panggilan Audio/Video</h2>
                    <p className="text-zinc-300 mb-4">
                      Sistem telah diimplementasikan dengan kemampuan panggilan audio dan video
                      menggunakan teknologi WebRTC. Fitur ini mendukung panggilan 1-on-1 maupun
                      panggilan grup taktis.
                    </p>
                    <ul className="list-disc pl-5 text-zinc-300 space-y-1">
                      <li>Panggilan audio dan video</li>
                      <li>Notifikasi panggilan masuk dengan suara</li>
                      <li>Kontrol mikrofon dan kamera</li>
                      <li>Mendukung grup taktis hingga 9 peserta</li>
                    </ul>
                  </div>
                  
                  <div className="bg-zinc-800 p-4 rounded-lg">
                    <h2 className="text-xl font-bold mb-4 text-green-400">Sistem Notifikasi</h2>
                    <p className="text-zinc-300 mb-4">
                      Sistem notifikasi real-time dengan WebSocket untuk memberi tahu pesan masuk,
                      panggilan, dan aktivitas penting lainnya.
                    </p>
                    <ul className="list-disc pl-5 text-zinc-300 space-y-1">
                      <li>Notifikasi toast dengan animasi</li>
                      <li>Suara notifikasi konfigurasi</li>
                      <li>Sync status online pengguna</li>
                      <li>Navigasi cepat ke percakapan</li>
                    </ul>
                  </div>
                </div>
                
                <div className="mt-8 text-center text-zinc-400">
                  <p>Sistem terintegrasi dan siap digunakan.</p>
                  <p className="mt-2">Status WebSocket: <span className="text-green-500">Aktif</span></p>
                </div>
              </div>
              
              {/* Notification and call managers yang selalu aktif */}
              <NotificationManager />
              <CallManager />
              <GroupCallManager />
            </div>
          </GroupCallProvider>
        </CallProvider>
      </NotificationProvider>
    </WebSocketProvider>
  );
}

export default App;