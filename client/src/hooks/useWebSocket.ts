import { useState, useEffect, useRef, useCallback } from 'react';
import { WebSocketMessage } from '@shared/schema';
import { useAuth } from './useAuth';

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const { user } = useAuth();

  // WebSocket connection dinonaktifkan untuk mencegah error
  useEffect(() => {
    // Tidak perlu mencoba koneksi WebSocket lagi
    console.log("WebSocket dinonaktifkan untuk komunikasi offline");
    
    // Tidak ada koneksi WebSocket, gunakan polling sebagai gantinya
    return () => {
      // Cleanup tidak diperlukan
    };
  }, [user]);

  // Metode pengiriman pesan diubah agar tidak mencoba menggunakan WebSocket yang dinonaktifkan
  const sendMessage = useCallback((message: WebSocketMessage) => {
    // WebSocket dinonaktifkan, tidak perlu mencoba mengirim pesan
    console.log("WebSocket dinonaktifkan, pesan tidak dikirim:", message);
    return false;
  }, []);

  // Send typing indicator
  const sendTypingIndicator = useCallback((conversationId: number, isTyping: boolean) => {
    return sendMessage({
      type: 'typing',
      payload: {
        conversationId,
        isTyping
      }
    });
  }, [sendMessage]);

  // Add message listener - dimodifikasi agar tidak mencoba menggunakan WebSocket
  const addMessageListener = useCallback((callback: (data: WebSocketMessage) => void) => {
    // WebSocket dinonaktifkan, listener tidak akan menerima pesan
    console.log("WebSocket dinonaktifkan, message listener tidak aktif");
    
    // Return fungsi cleanup kosong
    return () => {};
  }, []);

  return {
    isConnected,
    error,
    sendMessage,
    sendTypingIndicator,
    addMessageListener
  };
}
