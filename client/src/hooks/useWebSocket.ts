import { useState, useEffect, useRef, useCallback } from 'react';
import { WebSocketMessage } from '@shared/schema';
import { useAuth } from './useAuth';

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const { user } = useAuth();
  const messageListenersRef = useRef<Set<(data: any) => void>>(new Set());

  useEffect(() => {
    if (!user) return;

    let reconnectTimeout: NodeJS.Timeout;
    
    const connectWebSocket = () => {
      try {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        
        console.log("[WebSocket] Connecting to:", wsUrl);
        socketRef.current = new WebSocket(wsUrl);

        socketRef.current.onopen = () => {
          console.log("[WebSocket] Connected successfully");
          setIsConnected(true);
          setError(null);
          
          // Authenticate user
          if (socketRef.current && user) {
            socketRef.current.send(JSON.stringify({
              type: 'auth',
              payload: { userId: user.id }
            }));
          }
        };

        socketRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log("[WebSocket] Received message:", data);
            
            // Notify all listeners
            messageListenersRef.current.forEach(listener => {
              try {
                listener(data);
              } catch (error) {
                console.error("[WebSocket] Error in message listener:", error);
              }
            });
          } catch (error) {
            console.error("[WebSocket] Failed to parse message:", error);
          }
        };

        socketRef.current.onclose = () => {
          console.log("[WebSocket] Connection closed");
          setIsConnected(false);
          
          // Attempt to reconnect after 3 seconds
          if (user) {
            reconnectTimeout = setTimeout(connectWebSocket, 3000);
          }
        };

        socketRef.current.onerror = (error) => {
          console.error("[WebSocket] Error:", error);
          setError("WebSocket connection failed");
        };
      } catch (error) {
        console.error("[WebSocket] Failed to create connection:", error);
        setError("Failed to create WebSocket connection");
      }
    };

    connectWebSocket();

    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [user]);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
      return true;
    } else {
      console.warn("[WebSocket] Cannot send message - not connected");
      return false;
    }
  }, []);

  const sendTypingIndicator = useCallback((conversationId: number, isTyping: boolean) => {
    return sendMessage({
      type: 'typing',
      payload: {
        conversationId,
        isTyping
      }
    });
  }, [sendMessage]);

  const addMessageListener = useCallback((callback: (data: any) => void) => {
    messageListenersRef.current.add(callback);
    
    return () => {
      messageListenersRef.current.delete(callback);
    };
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    error,
    sendMessage,
    sendTypingIndicator,
    addMessageListener
  };
}
