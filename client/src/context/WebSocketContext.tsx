import { createContext, ReactNode, useCallback, useEffect, useState, useRef } from 'react';
import { useNotification } from '../hooks/useNotification';

// Tipe pesan WebSocket
export type WebSocketMessageType = 
  | 'message' 
  | 'call' 
  | 'notification' 
  | 'user_status' 
  | 'typing'
  | 'call_signal';

// Interface pesan WebSocket
export interface WebSocketMessage {
  type: WebSocketMessageType;
  [key: string]: any;
}

// Interface context
interface WebSocketContextType {
  isConnected: boolean;
  sendMessage: (message: WebSocketMessage) => void;
  lastMessage: WebSocketMessage | null;
  reconnect: () => void;
}

// Default context
export const WebSocketContext = createContext<WebSocketContextType>({
  isConnected: false,
  sendMessage: () => {},
  lastMessage: null,
  reconnect: () => {},
});

// Props provider
interface WebSocketProviderProps {
  children: ReactNode;
}

// Provider
export const WebSocketProvider = ({ children }: WebSocketProviderProps) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const { addNotification } = useNotification();

  // Setup WebSocket connection
  const setupWebSocket = useCallback(() => {
    // Cleanup previous connection if it exists
    if (socket) {
      socket.close();
    }

    // Determine WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    // Create new WebSocket
    const newSocket = new WebSocket(wsUrl);

    // Event handlers
    newSocket.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;
      
      // Send initial authentication if user is logged in
      const user = localStorage.getItem('user');
      if (user) {
        try {
          const userData = JSON.parse(user);
          newSocket.send(JSON.stringify({
            type: 'auth',
            userId: userData.id
          }));
        } catch (error) {
          console.error('Error parsing user data:', error);
        }
      }
    };

    newSocket.onclose = (event) => {
      console.log('WebSocket disconnected', event.code, event.reason);
      setIsConnected(false);
      
      // Attempt to reconnect with exponential backoff
      if (reconnectAttemptsRef.current < 5) {
        const timeout = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        console.log(`Reconnecting in ${timeout / 1000} seconds...`);
        
        if (reconnectTimeoutRef.current) {
          window.clearTimeout(reconnectTimeoutRef.current);
        }
        
        // @ts-ignore
        reconnectTimeoutRef.current = window.setTimeout(() => {
          reconnectAttemptsRef.current++;
          setupWebSocket();
        }, timeout);
      } else {
        addNotification(
          'Koneksi terputus', 
          'Tidak dapat terhubung ke server komunikasi. Coba muat ulang halaman.', 
          'system'
        );
      }
    };

    newSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WebSocketMessage;
        setLastMessage(data);
        
        // Handle different message types
        switch (data.type) {
          case 'notification':
            addNotification(
              data.title || 'Notifikasi baru', 
              data.message, 
              data.notificationType || 'system'
            );
            break;
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    newSocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    setSocket(newSocket);

    // Cleanup when component unmounts
    return () => {
      if (reconnectTimeoutRef.current) {
        window.clearTimeout(reconnectTimeoutRef.current);
      }
      newSocket.close();
    };
  }, [addNotification]);

  // Initial connection
  useEffect(() => {
    setupWebSocket();
    
    // Setup heartbeat to keep connection alive
    const heartbeatInterval = setInterval(() => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'heartbeat' }));
      }
    }, 30000); // Send heartbeat every 30 seconds
    
    return () => {
      clearInterval(heartbeatInterval);
      if (socket) {
        socket.close();
      }
      if (reconnectTimeoutRef.current) {
        window.clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [setupWebSocket, socket]);

  // Send message function
  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message:', message);
    }
  }, [socket]);

  // Reconnect function
  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    setupWebSocket();
  }, [setupWebSocket]);

  return (
    <WebSocketContext.Provider
      value={{ isConnected, sendMessage, lastMessage, reconnect }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};