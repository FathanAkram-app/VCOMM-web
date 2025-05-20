/**
 * websocketManager.ts - Pengelola koneksi WebSocket yang lebih stabil
 * 
 * File ini berisi utilitas untuk membuat dan mengelola koneksi WebSocket
 * dengan fitur autentikasi otomatis dan koneksi ulang secara otomatis.
 */

import { getAuthData } from './authUtils';

// Variabel untuk mengidentifikasi apakah running di Windows atau tidak
const isWindows = navigator.platform.indexOf('Win') > -1;

// Maximum reconnect tries
const MAX_RECONNECT_ATTEMPTS = 5;
// Default timeout for connection (ms)
const CONNECTION_TIMEOUT = 3000;

// Interface untuk konfigurasi WebSocket manager
interface WebSocketManagerConfig {
  url: string;
  connectionType: string;
  onOpen?: (event: Event) => void;
  onMessage?: (event: MessageEvent) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
}

/**
 * Pengelola koneksi WebSocket dengan fitur koneksi ulang dan autentikasi otomatis
 */
export class WebSocketManager {
  private socket: WebSocket | null = null;
  private config: WebSocketManagerConfig;
  private reconnectAttempts = 0;
  private reconnectTimer: number | null = null;
  private connectionTimer: number | null = null;
  private connectionType: string;

  constructor(config: WebSocketManagerConfig) {
    this.config = {
      autoReconnect: true,
      maxReconnectAttempts: MAX_RECONNECT_ATTEMPTS,
      reconnectInterval: 3000,
      ...config
    };
    this.connectionType = config.connectionType;
  }

  /**
   * Membuat koneksi WebSocket baru
   */
  connect(): void {
    if (this.socket && (this.socket.readyState === WebSocket.CONNECTING || 
                        this.socket.readyState === WebSocket.OPEN)) {
      console.log(`${this.connectionType} WebSocket already connected or connecting`);
      return;
    }

    const timestamp = Date.now();
    let url = this.config.url;
    
    // Tambahkan parameter untuk mencegah caching
    url += (url.includes('?') ? '&' : '?') + `t=${timestamp}`;
    
    // Log info
    console.log(`Initializing ${this.connectionType} WebSocket connection to ${url}...`);
    
    // Tambahkan kredensi auth ke URL jika tersedia
    const authData = getAuthData();
    if (authData && authData.id) {
      console.log(`Adding user ID ${authData.id} to WebSocket URL params`);
      url += `&userId=${authData.id}`;
      
      // Tambahkan username dan password untuk autentikasi langsung
      // terutama untuk kompatibilitas Windows yang sering masalah dengan headers
      if (isWindows && authData.username) {
        console.log(`Added authentication credentials to WebSocket URL for Windows compatibility`);
        url += `&username=${authData.username}`;
        // Gunakan user ID sebagai password jika password tidak tersedia
        url += `&password=${authData.username}123`;
      }
      
      // Tambahkan parameter tipe koneksi
      url += `&connectionType=${this.connectionType}`;
    }
    
    if (isWindows) {
      console.log(`Running on Windows platform - using enhanced WebSocket settings for better compatibility`);
    }

    // Buat koneksi baru
    this.socket = new WebSocket(url);
    
    // Set up timer untuk timeout
    this.connectionTimer = window.setTimeout(() => {
      if (this.socket && this.socket.readyState !== WebSocket.OPEN) {
        console.log(`${this.connectionType} WebSocket connection timeout`);
        this.socket.close();
        if (this.config.autoReconnect) {
          this.reconnect();
        }
      }
    }, CONNECTION_TIMEOUT);

    // Set up event handlers
    this.socket.addEventListener('open', this.handleOpen);
    this.socket.addEventListener('message', this.handleMessage);
    this.socket.addEventListener('close', this.handleClose);
    this.socket.addEventListener('error', this.handleError);
    
    // Juga atur event handler tradisional untuk kompatibilitas
    this.socket.onopen = this.handleOpenTraditional;
    this.socket.onmessage = this.handleMessageTraditional;
    this.socket.onclose = this.handleCloseTraditional;
    this.socket.onerror = this.handleErrorTraditional;
  }

  /**
   * Mengirim pesan melalui WebSocket
   * 
   * @param data Data yang akan dikirim
   * @returns true jika berhasil, false jika gagal
   */
  send(data: any): boolean {
    if (this.isConnected()) {
      try {
        let messageToSend: string;
        
        if (typeof data === 'string') {
          messageToSend = data;
        } else {
          messageToSend = JSON.stringify(data);
        }
        
        this.socket?.send(messageToSend);
        return true;
      } catch (error) {
        console.error(`Error sending data via ${this.connectionType} WebSocket:`, error);
        return false;
      }
    } else {
      console.warn(`Cannot send data: ${this.connectionType} WebSocket not connected`);
      return false;
    }
  }

  /**
   * Memeriksa apakah WebSocket terhubung
   * 
   * @returns true jika WebSocket terhubung, false jika tidak
   */
  isConnected(): boolean {
    return !!this.socket && this.socket.readyState === WebSocket.OPEN;
  }

  /**
   * Menutup koneksi WebSocket
   */
  disconnect(): void {
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.socket) {
      // Clear event listeners
      this.socket.removeEventListener('open', this.handleOpen);
      this.socket.removeEventListener('message', this.handleMessage);
      this.socket.removeEventListener('close', this.handleClose);
      this.socket.removeEventListener('error', this.handleError);
      
      // Clean up traditional handlers
      this.socket.onopen = null;
      this.socket.onmessage = null;
      this.socket.onclose = null;
      this.socket.onerror = null;
      
      // Close the socket
      if (this.socket.readyState === WebSocket.OPEN || 
          this.socket.readyState === WebSocket.CONNECTING) {
        this.socket.close();
      }
      this.socket = null;
    }
    
    console.log(`${this.connectionType} WebSocket disconnected`);
  }

  /**
   * Mencoba koneksi ulang WebSocket
   */
  private reconnect(): void {
    this.reconnectAttempts++;
    console.log(`Attempting to reconnect ${this.connectionType} WebSocket (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);
    
    if (this.reconnectAttempts <= (this.config.maxReconnectAttempts || MAX_RECONNECT_ATTEMPTS)) {
      this.reconnectTimer = window.setTimeout(() => {
        this.connect();
      }, this.config.reconnectInterval);
    } else {
      console.error(`Maximum ${this.connectionType} WebSocket reconnect attempts reached.`);
      this.reconnectAttempts = 0;
    }
  }

  // Event handlers dengan addEventListener
  private handleOpen = (event: Event): void => {
    console.log(`${this.connectionType} WebSocket connection opened via addEventListener`);
    
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }
    
    this.reconnectAttempts = 0;
    
    if (this.config.onOpen) {
      this.config.onOpen(event);
    }
    
    // Send authentication immediately
    this.sendAuthenticationMessage();
  };

  private handleMessage = (event: MessageEvent): void => {
    if (this.config.onMessage) {
      try {
        // Handle string or object messages
        let parsedData: any;
        
        if (typeof event.data === 'string') {
          try {
            parsedData = JSON.parse(event.data);
          } catch (e) {
            parsedData = event.data;
          }
        } else {
          parsedData = event.data;
        }
        
        // Respond to ping with pong
        if (parsedData && parsedData.type === 'ping') {
          console.log("Unknown message type:", parsedData.type, parsedData);
          this.send({
            type: 'pong',
            timestamp: Date.now(),
            connectionType: this.connectionType
          });
          return;
        }
        
        // Pass to handler
        this.config.onMessage(event);
      } catch (error) {
        console.error(`Error processing ${this.connectionType} WebSocket message:`, error);
      }
    }
  };

  private handleClose = (event: CloseEvent): void => {
    console.log(`${this.connectionType} WebSocket connection closed with code: ${event.code}, reason: ${event.reason}`);
    
    // Clean up timers
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }
    
    // Increment error count for tracking persistent issues
    if (event.code === 1006) {
      console.log(`WebSocket ${this.connectionType} error ${event.code}: Error count ${this.reconnectAttempts + 1}/3`);
    }
    
    if (this.config.onClose) {
      this.config.onClose(event);
    }
    
    if (this.config.autoReconnect) {
      console.log(`Will try to reconnect ${this.connectionType} WebSocket in ${this.config.reconnectInterval}ms (attempt ${this.reconnectAttempts + 1}/${this.config.maxReconnectAttempts})`);
      this.reconnect();
    }
  };

  private handleError = (event: Event): void => {
    console.log(`${this.connectionType} WebSocket error:`, event);
    
    if (this.config.onError) {
      this.config.onError(event);
    }
  };
  
  // Event handlers tradisional untuk kompatibilitas maksimum
  private handleOpenTraditional = (event: Event): void => {
    console.log(`${this.connectionType} WebSocket connection established via onopen`);
    // Kita sudah menangani ini di handleOpen
  };

  private handleMessageTraditional = (event: MessageEvent): void => {
    // Kita sudah menangani ini di handleMessage
  };

  private handleCloseTraditional = (event: CloseEvent): void => {
    // Kita sudah menangani ini di handleClose
  };

  private handleErrorTraditional = (event: Event): void => {
    // Kita sudah menangani ini di handleError
  };
  
  /**
   * Mengirim pesan autentikasi
   */
  private sendAuthenticationMessage(): void {
    const authData = getAuthData();
    
    if (authData) {
      console.log(`Sending ${this.connectionType} WebSocket authentication message`);
      
      this.send({
        type: 'auth',
        userId: authData.id,
        username: authData.username,
        connectionType: this.connectionType
      });
    } else {
      console.warn(`No auth data available for ${this.connectionType} WebSocket authentication`);
    }
  }
}

// Singleton instances untuk setiap tipe koneksi
let chatWebSocket: WebSocketManager | null = null;
let voiceCallWebSocket: WebSocketManager | null = null;
let videoCallWebSocket: WebSocketManager | null = null;

/**
 * Inisialisasi semua koneksi WebSocket
 */
export function initializeWebSockets(): void {
  // URL dasar untuk WebSocket
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  
  let url = '';
  
  if (isWindows) {
    // Koneksi normal untuk Windows
    console.log("Using Replit WebSocket connection settings");
    url = `${protocol}//${host}/ws`;
  } else {
    // Koneksi untuk Replit
    console.log("Using Replit WebSocket connection settings");
    url = `${protocol}//${host}/ws`;
  }
  
  // Inisialisasi chat WebSocket jika belum
  if (!chatWebSocket) {
    chatWebSocket = new WebSocketManager({
      url: `${url}/chat`,
      connectionType: 'chat',
      reconnectInterval: 3000
    });
    chatWebSocket.connect();
  }
  
  // Inisialisasi voice call WebSocket jika belum
  if (!voiceCallWebSocket) {
    voiceCallWebSocket = new WebSocketManager({
      url: `${url}/voice-call`,
      connectionType: 'voice-call',
      reconnectInterval: 4000
    });
    voiceCallWebSocket.connect();
  }
  
  // Inisialisasi video call WebSocket jika belum
  if (!videoCallWebSocket) {
    videoCallWebSocket = new WebSocketManager({
      url: `${url}/video-call`,
      connectionType: 'video-call',
      reconnectInterval: 5000
    });
    videoCallWebSocket.connect();
  }
}

/**
 * Mendapatkan instance WebSocket untuk chat
 */
export function getChatWebSocket(): WebSocketManager | null {
  return chatWebSocket;
}

/**
 * Mendapatkan instance WebSocket untuk voice call
 */
export function getVoiceCallWebSocket(): WebSocketManager | null {
  return voiceCallWebSocket;
}

/**
 * Mendapatkan instance WebSocket untuk video call
 */
export function getVideoCallWebSocket(): WebSocketManager | null {
  return videoCallWebSocket;
}

/**
 * Mengirim pesan melalui WebSocket
 * 
 * @param message Pesan yang akan dikirim
 * @param connectionType Tipe koneksi (chat, voice-call, atau video-call)
 * @returns true jika berhasil, false jika gagal
 */
export function sendWebSocketMessage(message: any, connectionType: 'chat' | 'voice-call' | 'video-call'): boolean {
  let socket: WebSocketManager | null = null;
  
  switch (connectionType) {
    case 'chat':
      socket = getChatWebSocket();
      break;
    case 'voice-call':
      socket = getVoiceCallWebSocket();
      break;
    case 'video-call':
      socket = getVideoCallWebSocket();
      break;
  }
  
  if (socket && socket.isConnected()) {
    return socket.send(message);
  } else {
    console.warn(`Cannot send message: ${connectionType} WebSocket not connected`);
    return false;
  }
}