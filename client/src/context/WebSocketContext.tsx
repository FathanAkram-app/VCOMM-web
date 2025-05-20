import { createContext, useState, useEffect, useCallback, ReactNode, useContext } from 'react';
import { useAuth } from '@/hooks/use-auth';

interface WebSocketContextType {
  isConnected: boolean;
  sendMessage: (message: any) => void;
  events: Record<string, any> | null;
}

export const WebSocketContext = createContext<WebSocketContextType>({
  isConnected: false,
  sendMessage: () => {},
  events: null
});

interface WebSocketProviderProps {
  children: ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [events, setEvents] = useState<Record<string, any> | null>(null);
  const { user } = useAuth();

  // Inisialisasi WebSocket
  useEffect(() => {
    if (!user) return;

    // Tentukan protokol berdasarkan protokol halaman
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    // Buat koneksi WebSocket
    const newSocket = new WebSocket(wsUrl);
    
    // Tambahkan listener untuk event koneksi
    newSocket.addEventListener('open', () => {
      console.log('WebSocket connection established');
      setIsConnected(true);
      
      // Kirim pesan autentikasi
      newSocket.send(JSON.stringify({
        type: 'authenticate',
        userId: user.id
      }));
      
      // Mulai heartbeat untuk menjaga koneksi tetap aktif
      const heartbeatInterval = setInterval(() => {
        if (newSocket.readyState === WebSocket.OPEN) {
          newSocket.send(JSON.stringify({ type: 'heartbeat' }));
        }
      }, 30000);
      
      // Clean up heartbeat interval saat koneksi ditutup
      newSocket.addEventListener('close', () => {
        clearInterval(heartbeatInterval);
      });
    });
    
    // Handle pesan yang masuk
    newSocket.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        setEvents(data);
        
        // Dispatch custom event untuk komponen lain yang mendengarkan
        const customEvent = new CustomEvent('ws-message', { detail: data });
        window.dispatchEvent(customEvent);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });
    
    // Handle error
    newSocket.addEventListener('error', (event) => {
      console.error('WebSocket error:', event);
      
      // Dispatch custom event untuk error
      const errorEvent = new CustomEvent('ws-error', { detail: event });
      window.dispatchEvent(errorEvent);
    });
    
    // Handle koneksi ditutup
    newSocket.addEventListener('close', (event) => {
      console.log('WebSocket connection closed:', event);
      setIsConnected(false);
      
      // Dispatch custom event untuk penutupan koneksi
      const closeEvent = new CustomEvent('ws-close', { detail: event });
      window.dispatchEvent(closeEvent);
      
      // Coba sambungkan kembali setelah beberapa detik
      setTimeout(() => {
        if (newSocket.readyState === WebSocket.CLOSED) {
          console.log('Attempting to reconnect WebSocket...');
          
          // Notifikasi reconnection
          const reconnectEvent = new CustomEvent('ws-reconnect');
          window.dispatchEvent(reconnectEvent);
        }
      }, 3000);
    });
    
    // Simpan referensi socket
    setSocket(newSocket);
    
    // Cleanup saat komponen unmount
    return () => {
      if (newSocket.readyState === WebSocket.OPEN) {
        newSocket.close();
      }
    };
  }, [user]);
  
  // Fungsi untuk mengirim pesan melalui WebSocket
  const sendMessage = useCallback((message: any) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected. Cannot send message.');
      
      // Mencoba kembali jika socket ada tapi tidak terhubung
      if (socket) {
        const retryConnection = () => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(message));
            socket.removeEventListener('open', retryConnection);
          }
        };
        
        socket.addEventListener('open', retryConnection);
      }
    }
  }, [socket]);
  
  // Value untuk provider
  const value = {
    isConnected,
    sendMessage,
    events
  };
  
  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

// Hook untuk menggunakan WebSocketContext
export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  
  return context;
};