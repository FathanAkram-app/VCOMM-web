// Tipe data untuk callback WebSocket
type MessageCallback = (data: any) => void;
type ConnectionCallback = () => void;

// Tipe data untuk event yang didukung
type EventType = 
  | 'message' 
  | 'call' 
  | 'groupCall' 
  | 'userStatus' 
  | 'onlineUsers'
  | 'error';

class WebSocketManager {
  private socket: WebSocket | null = null;
  private isConnected = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 2000; // 2 detik
  private messageListeners: Map<EventType, MessageCallback[]> = new Map();
  private connectionListeners: {
    onOpen: ConnectionCallback[];
    onClose: ConnectionCallback[];
    onError: ConnectionCallback[];
  } = {
    onOpen: [],
    onClose: [],
    onError: []
  };
  
  private userId: number | null = null;
  private authToken: string | null = null;
  
  // Singleton pattern
  private static instance: WebSocketManager;
  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }
  
  // Private constructor untuk singleton
  private constructor() {}
  
  public setCredentials(userId: number, authToken: string): void {
    this.userId = userId;
    this.authToken = authToken;
  }
  
  // Metode untuk memulai koneksi
  public connect(): void {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      console.log('WebSocket already connected or connecting');
      return;
    }
    
    try {
      // Gunakan protokol yang sesuai dengan lokasi
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      this.socket = new WebSocket(wsUrl);
      
      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onerror = this.handleError.bind(this);
      
      console.log('Connecting to WebSocket server...');
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.scheduleReconnect();
    }
  }
  
  // Metode untuk menutup koneksi
  public disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this.isConnected = false;
    this.reconnectAttempts = 0;
  }
  
  // Handler untuk event koneksi terbuka
  private handleOpen(event: Event): void {
    console.log('WebSocket connection established');
    this.isConnected = true;
    this.reconnectAttempts = 0;
    
    // Kirim autentikasi
    if (this.userId && this.authToken) {
      this.sendMessage({
        type: 'auth',
        userId: this.userId,
        token: this.authToken
      });
    }
    
    // Notifikasi listeners
    this.connectionListeners.onOpen.forEach(callback => callback());
  }
  
  // Handler untuk menerima pesan
  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      console.log('Received WebSocket message:', data);
      
      // Proses berdasarkan tipe pesan
      if (data.type) {
        const eventType = data.type as EventType;
        const listeners = this.messageListeners.get(eventType);
        
        if (listeners) {
          listeners.forEach(callback => callback(data));
        }
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }
  
  // Handler untuk koneksi tertutup
  private handleClose(event: CloseEvent): void {
    console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
    this.isConnected = false;
    
    // Notifikasi listeners
    this.connectionListeners.onClose.forEach(callback => callback());
    
    if (event.code !== 1000) { // 1000 adalah kode penutupan normal
      this.scheduleReconnect();
    }
  }
  
  // Handler untuk error
  private handleError(event: Event): void {
    console.error('WebSocket error:', event);
    
    // Notifikasi listeners
    this.connectionListeners.onError.forEach(callback => callback());
    
    // Tidak perlu memanggil scheduleReconnect() di sini karena onclose akan dipanggil setelah error
  }
  
  // Metode untuk mencoba koneksi ulang
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      console.log(`Scheduling reconnect attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts} in ${this.reconnectDelay}ms`);
      this.reconnectTimer = setTimeout(() => {
        this.reconnectAttempts++;
        this.connect();
      }, this.reconnectDelay);
      
      // Tingkatkan jeda secara eksponensial, maksimal 30 detik
      this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 30000);
    } else {
      console.error('Max reconnect attempts reached. WebSocket connection failed permanently.');
    }
  }
  
  // Metode untuk mengirim pesan
  public sendMessage(message: any): boolean {
    if (!this.isConnected || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('Cannot send message: WebSocket is not connected');
      return false;
    }
    
    try {
      const data = typeof message === 'string' ? message : JSON.stringify(message);
      this.socket.send(data);
      return true;
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      return false;
    }
  }
  
  // Metode untuk menambahkan listener pesan
  public addMessageListener(eventType: EventType, callback: MessageCallback): void {
    if (!this.messageListeners.has(eventType)) {
      this.messageListeners.set(eventType, []);
    }
    
    const listeners = this.messageListeners.get(eventType)!;
    if (!listeners.includes(callback)) {
      listeners.push(callback);
    }
  }
  
  // Metode untuk menghapus listener pesan
  public removeMessageListener(eventType: EventType, callback: MessageCallback): void {
    if (!this.messageListeners.has(eventType)) {
      return;
    }
    
    const listeners = this.messageListeners.get(eventType)!;
    const index = listeners.indexOf(callback);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  }
  
  // Metode untuk menambahkan listener koneksi terbuka
  public addOpenListener(callback: ConnectionCallback): void {
    if (!this.connectionListeners.onOpen.includes(callback)) {
      this.connectionListeners.onOpen.push(callback);
    }
  }
  
  // Metode untuk menghapus listener koneksi terbuka
  public removeOpenListener(callback: ConnectionCallback): void {
    const index = this.connectionListeners.onOpen.indexOf(callback);
    if (index !== -1) {
      this.connectionListeners.onOpen.splice(index, 1);
    }
  }
  
  // Metode untuk menambahkan listener koneksi tertutup
  public addCloseListener(callback: ConnectionCallback): void {
    if (!this.connectionListeners.onClose.includes(callback)) {
      this.connectionListeners.onClose.push(callback);
    }
  }
  
  // Metode untuk menghapus listener koneksi tertutup
  public removeCloseListener(callback: ConnectionCallback): void {
    const index = this.connectionListeners.onClose.indexOf(callback);
    if (index !== -1) {
      this.connectionListeners.onClose.splice(index, 1);
    }
  }
  
  // Metode untuk menambahkan listener error
  public addErrorListener(callback: ConnectionCallback): void {
    if (!this.connectionListeners.onError.includes(callback)) {
      this.connectionListeners.onError.push(callback);
    }
  }
  
  // Metode untuk menghapus listener error
  public removeErrorListener(callback: ConnectionCallback): void {
    const index = this.connectionListeners.onError.indexOf(callback);
    if (index !== -1) {
      this.connectionListeners.onError.splice(index, 1);
    }
  }
  
  // Metode untuk mendapatkan status koneksi
  public isConnectedToServer(): boolean {
    return this.isConnected;
  }
  
  // Metode untuk kirim heartbeat/ping
  public sendHeartbeat(): void {
    this.sendMessage({ type: 'heartbeat', userId: this.userId });
  }
  
  // Spesifik untuk fitur panggilan: mengirim sinyal panggilan
  public sendCallSignal(targetUserId: number, signal: any): void {
    this.sendMessage({
      type: 'call_signal',
      targetUserId,
      signal
    });
  }
  
  // Spesifik untuk fitur grup panggilan: mengirim sinyal panggilan grup
  public sendGroupCallSignal(groupId: number, signal: any): void {
    this.sendMessage({
      type: 'group_call_signal',
      groupId,
      signal
    });
  }
}

// Ekspor instance singleton
export default WebSocketManager.getInstance();