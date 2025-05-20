// WebSocket Service for real-time communication

interface WebSocketMessage {
  type: string;
  payload: any;
}

type MessageHandler = (message: any) => void;

class WebSocketService {
  private chatSocket: WebSocket | null = null;
  private voiceSocket: WebSocket | null = null;
  private videoSocket: WebSocket | null = null;
  private messageHandlers: Map<string, MessageHandler[]> = new Map();
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000; // Start with 2 seconds
  private isConnected = false;
  
  // Initialize all WebSocket connections
  public connectAll(): void {
    this.connectChatSocket();
    // Voice and video can be connected on demand later
  }
  
  // Connect to chat WebSocket
  private connectChatSocket(): void {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const timestamp = Date.now(); // Add timestamp to prevent caching
      const chatUrl = `${protocol}//${host}/ws/chat?t=${timestamp}`;
      
      console.log(`Initializing chat WebSocket connection to ${chatUrl}...`);
      this.chatSocket = new WebSocket(chatUrl);
      
      this.chatSocket.onopen = () => {
        console.log('chat WebSocket connection established');
        this.isConnected = true;
        this.reconnectAttempts = 0; // Reset reconnect counter
        
        // Send auth message to authenticate
        if (this.chatSocket && this.chatSocket.readyState === WebSocket.OPEN) {
          const token = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');
          if (token) {
            this.chatSocket.send(JSON.stringify({
              type: 'auth',
              payload: { token }
            }));
          }
        }
      };
      
      this.chatSocket.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      this.chatSocket.onclose = () => {
        console.log('chat WebSocket connection closed');
        this.isConnected = false;
        this.attemptReconnect('chat');
      };
      
      this.chatSocket.onerror = (error) => {
        console.error('chat WebSocket error:', error);
      };
    } catch (error) {
      console.error('Error initializing chat WebSocket:', error);
      this.attemptReconnect('chat');
    }
  }
  
  // Subscribe to message types
  public subscribe(messageType: string, handler: MessageHandler): void {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, []);
    }
    
    const handlers = this.messageHandlers.get(messageType);
    if (handlers) {
      handlers.push(handler);
    }
  }
  
  // Unsubscribe from message types
  public unsubscribe(messageType: string, handler: MessageHandler): void {
    if (!this.messageHandlers.has(messageType)) return;
    
    const handlers = this.messageHandlers.get(messageType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }
  
  // Send a chat message
  public sendChatMessage(message: any): void {
    if (this.chatSocket && this.chatSocket.readyState === WebSocket.OPEN) {
      this.chatSocket.send(JSON.stringify(message));
    } else {
      console.error('Chat WebSocket is not connected. Message not sent:', message);
    }
  }
  
  // Handle incoming messages
  private handleMessage(message: WebSocketMessage): void {
    const { type, payload } = message;
    
    // Call all handlers for this message type
    if (this.messageHandlers.has(type)) {
      const handlers = this.messageHandlers.get(type);
      if (handlers) {
        handlers.forEach(handler => handler(payload));
      }
    }
    
    // Also call global message handlers
    if (this.messageHandlers.has('*')) {
      const globalHandlers = this.messageHandlers.get('*');
      if (globalHandlers) {
        globalHandlers.forEach(handler => handler(message));
      }
    }
  }
  
  // Attempt to reconnect
  private attemptReconnect(socketType: 'chat' | 'voice' | 'video'): void {
    // Clear any existing reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    // If we've exceeded max reconnect attempts, give up
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`Maximum reconnect attempts (${this.maxReconnectAttempts}) exceeded for ${socketType} WebSocket.`);
      return;
    }
    
    // Exponential backoff for reconnect
    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts);
    this.reconnectAttempts++;
    
    console.log(`Attempting to reconnect ${socketType} WebSocket in ${delay}ms... (Attempt ${this.reconnectAttempts})`);
    
    this.reconnectTimeout = setTimeout(() => {
      if (socketType === 'chat') {
        this.connectChatSocket();
      }
      // Add other socket types if needed
    }, delay);
  }
  
  // Disconnect all sockets
  public disconnectAll(): void {
    if (this.chatSocket) {
      this.chatSocket.close();
      this.chatSocket = null;
    }
    
    if (this.voiceSocket) {
      this.voiceSocket.close();
      this.voiceSocket = null;
    }
    
    if (this.videoSocket) {
      this.videoSocket.close();
      this.videoSocket = null;
    }
    
    // Clear any pending reconnect attempts
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    this.isConnected = false;
  }
  
  // Check if websocket is connected
  public isWebSocketConnected(): boolean {
    return this.isConnected;
  }
}

// Create a singleton instance
export const websocketService = new WebSocketService();