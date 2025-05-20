import { createContext, useEffect, ReactNode, useContext, useState, useCallback } from 'react';
import { useAuth } from '../hooks/use-auth';
import { useNotification } from '../hooks/useNotification';
import { useToast } from '../hooks/use-toast';
import websocketManager from '../lib/websocketManager';

interface WebSocketContextType {
  isConnected: boolean;
  reconnect: () => void;
  sendMessage: (message: any) => boolean;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

interface WebSocketProviderProps {
  children: ReactNode;
}

export const WebSocketProvider = ({ children }: WebSocketProviderProps) => {
  const { user } = useAuth();
  const { addMessageNotification } = useNotification();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  
  // Setup WebSocket connection
  useEffect(() => {
    if (user) {
      // Setel kredensial
      websocketManager.setCredentials(user.id, 'auth-token'); // Gunakan token autentikasi yang sebenarnya
      
      // Connect
      websocketManager.connect();
      
      // Setup heartbeat interval
      const heartbeatInterval = setInterval(() => {
        if (websocketManager.isConnectedToServer()) {
          websocketManager.sendHeartbeat();
        }
      }, 30000); // 30 detik
      
      return () => {
        clearInterval(heartbeatInterval);
      };
    }
  }, [user]);
  
  // Setup event listeners
  useEffect(() => {
    // Koneksi handlers
    const handleOpen = () => {
      setIsConnected(true);
      toast({
        title: "Terhubung",
        description: "Koneksi ke server berhasil dibuat.",
      });
    };
    
    const handleClose = () => {
      setIsConnected(false);
      toast({
        title: "Terputus",
        description: "Koneksi ke server terputus. Mencoba menghubungkan kembali...",
        variant: "destructive",
      });
    };
    
    const handleError = () => {
      toast({
        title: "Kesalahan Koneksi",
        description: "Terjadi kesalahan pada koneksi. Coba refresh halaman.",
        variant: "destructive",
      });
    };
    
    // Message handlers
    const handleNewMessage = (data: any) => {
      const { sender, content, conversationId, isRoom } = data;
      
      // Tambahkan notifikasi pesan baru
      addMessageNotification(
        sender.callsign || 'User',
        content,
        conversationId,
        isRoom
      );
    };
    
    const handleCall = (data: any) => {
      // Ini akan ditangani oleh CallContext
      console.log('Incoming call:', data);
    };
    
    const handleGroupCall = (data: any) => {
      // Ini akan ditangani oleh GroupCallContext
      console.log('Incoming group call:', data);
    };
    
    const handleUserStatus = (data: any) => {
      console.log('User status updated:', data);
      // Tangani perubahan status pengguna, mungkin update state lokal atau refetch data
    };
    
    // Tambahkan listeners
    websocketManager.addOpenListener(handleOpen);
    websocketManager.addCloseListener(handleClose);
    websocketManager.addErrorListener(handleError);
    
    websocketManager.addMessageListener('message', handleNewMessage);
    websocketManager.addMessageListener('call', handleCall);
    websocketManager.addMessageListener('groupCall', handleGroupCall);
    websocketManager.addMessageListener('userStatus', handleUserStatus);
    
    // Cleanup
    return () => {
      websocketManager.removeOpenListener(handleOpen);
      websocketManager.removeCloseListener(handleClose);
      websocketManager.removeErrorListener(handleError);
      
      websocketManager.removeMessageListener('message', handleNewMessage);
      websocketManager.removeMessageListener('call', handleCall);
      websocketManager.removeMessageListener('groupCall', handleGroupCall);
      websocketManager.removeMessageListener('userStatus', handleUserStatus);
    };
  }, [addMessageNotification, toast]);
  
  // Fungsi untuk memaksa reconnect
  const reconnect = useCallback(() => {
    websocketManager.disconnect();
    setTimeout(() => {
      websocketManager.connect();
    }, 1000);
  }, []);
  
  // Fungsi untuk mengirim pesan
  const sendMessage = useCallback((message: any) => {
    return websocketManager.sendMessage(message);
  }, []);
  
  const contextValue: WebSocketContextType = {
    isConnected,
    reconnect,
    sendMessage,
  };
  
  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

// Hook untuk mengakses WebSocket context
export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  
  return context;
};