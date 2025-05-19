import { useState, useEffect, useRef, useCallback } from 'react';
import { WebSocketMessage } from '@shared/schema';
import { useAuth } from './useAuth';

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const { user } = useAuth();

  // Set up WebSocket connection
  useEffect(() => {
    if (!user) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    console.log("Attempting to connect WebSocket to:", wsUrl);
    
    // Create WebSocket connection with explicit error handling
    let socket: WebSocket;
    try {
      socket = new WebSocket(wsUrl);
      console.log("WebSocket instance created");
    } catch (e) {
      console.error("Error creating WebSocket:", e);
      setError(`Failed to create WebSocket: ${e}`);
      return;
    }
    socketRef.current = socket;
    
    socket.addEventListener('open', () => {
      console.log("WebSocket connection opened successfully");
      setIsConnected(true);
      setError(null);
      
      // Send authentication message
      try {
        const authMessage = JSON.stringify({
          type: 'auth',
          payload: {
            userId: user.id
          }
        });
        console.log("Sending auth message:", authMessage);
        socket.send(authMessage);
      } catch (e) {
        console.error("Error sending auth message:", e);
      }
    });
    
    socket.addEventListener('error', (event) => {
      console.error('WebSocket error:', event);
      setError('WebSocket connection error');
    });
    
    socket.addEventListener('close', () => {
      setIsConnected(false);
    });
    
    return () => {
      socket.close();
    };
  }, [user]);

  // Send message
  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
      return true;
    }
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

  // Add message listener
  const addMessageListener = useCallback((callback: (data: WebSocketMessage) => void) => {
    if (!socketRef.current) return () => {};
    
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as WebSocketMessage;
        callback(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    socketRef.current.addEventListener('message', handleMessage);
    
    return () => {
      if (socketRef.current) {
        socketRef.current.removeEventListener('message', handleMessage);
      }
    };
  }, []);

  return {
    isConnected,
    error,
    sendMessage,
    sendTypingIndicator,
    addMessageListener
  };
}
