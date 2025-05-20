import { useState, useEffect, useCallback, useRef } from 'react';

// Tipe data untuk status koneksi
export type WebSocketStatus = 'connecting' | 'open' | 'closed' | 'error';

// Tipe data untuk pesan
export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void;
  onStatusChange?: (status: WebSocketStatus) => void;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
}

/**
 * Hook untuk mengelola koneksi WebSocket
 */
export function useWebSocket(userId: number | undefined, options?: UseWebSocketOptions) {
  const [status, setStatus] = useState<WebSocketStatus>('closed');
  const [error, setError] = useState<Error | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);

  const {
    onMessage,
    onStatusChange,
    reconnectDelay = 2000,
    maxReconnectAttempts = 5
  } = options || {};

  // Connect WebSocket
  const connect = useCallback(() => {
    if (!userId) return;
    
    try {
      // Bersihkan timer reconnect sebelumnya jika ada
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      
      // Tutup socket sebelumnya jika ada
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      
      // Buat URL WebSocket
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsURL = `${protocol}//${window.location.host}/ws/chat?userId=${userId}`;
      
      console.log(`🔄 Menghubungkan ke WebSocket: ${wsURL}`);
      setStatus('connecting');
      
      // Buat koneksi baru
      const socket = new WebSocket(wsURL);
      socketRef.current = socket;
      
      // Setup event handlers
      socket.onopen = () => {
        console.log('✅ Koneksi WebSocket berhasil');
        setStatus('open');
        setError(null);
        reconnectAttemptsRef.current = 0;
        if (onStatusChange) onStatusChange('open');
      };
      
      socket.onclose = (event) => {
        console.log(`❌ Koneksi WebSocket terputus. Kode: ${event.code}, Alasan: ${event.reason}`);
        setStatus('closed');
        if (onStatusChange) onStatusChange('closed');
        
        // Coba reconnect jika belum melebihi batas percobaan
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          console.log(`🔄 Percobaan reconnect ${reconnectAttemptsRef.current}/${maxReconnectAttempts} dalam ${reconnectDelay}ms`);
          
          reconnectTimerRef.current = setTimeout(() => {
            connect();
          }, reconnectDelay);
        } else {
          console.log('❌ Batas percobaan reconnect tercapai');
          setError(new Error('Batas percobaan reconnect tercapai'));
        }
      };
      
      socket.onerror = (event) => {
        console.error('❌ Error WebSocket:', event);
        setStatus('error');
        setError(new Error('Koneksi WebSocket error'));
        if (onStatusChange) onStatusChange('error');
      };
      
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          // Handle pesan ping dari server (heartbeat)
          if (message.type === 'ping') {
            // Kirim pong untuk menjaga koneksi tetap hidup
            send({ type: 'pong', timestamp: new Date().toISOString() });
            return;
          }
          
          // Teruskan pesan ke callback
          if (onMessage) {
            onMessage(message);
          }
        } catch (e) {
          console.error('❌ Error parsing pesan WebSocket:', e);
        }
      };
    } catch (e) {
      console.error('❌ Error membuat koneksi WebSocket:', e);
      setStatus('error');
      setError(e instanceof Error ? e : new Error('Unknown error'));
      if (onStatusChange) onStatusChange('error');
    }
  }, [userId, onMessage, onStatusChange, reconnectDelay, maxReconnectAttempts]);
  
  // Kirim pesan melalui WebSocket
  const send = useCallback((message: any): boolean => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      console.error('❌ Tidak dapat mengirim pesan: WebSocket tidak terhubung');
      return false;
    }
    
    try {
      const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
      socketRef.current.send(messageStr);
      return true;
    } catch (e) {
      console.error('❌ Error mengirim pesan:', e);
      return false;
    }
  }, []);
  
  // Tutup koneksi
  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    
    setStatus('closed');
  }, []);
  
  // Connect saat userId berubah
  useEffect(() => {
    if (userId) {
      connect();
    } else {
      disconnect();
    }
    
    return () => {
      disconnect();
    };
  }, [userId, connect, disconnect]);
  
  return {
    status,
    error,
    send,
    connect,
    disconnect
  };
}

export default useWebSocket;