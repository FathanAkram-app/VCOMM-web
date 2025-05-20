import { MessageWithSender, User, ChatListItem, RoomWithMembers } from "@shared/schema";
import { getAuthData, getAuthenticatedWebSocketUrl } from "./authUtils";

// WebSocket connections for different features
type WebSocketType = 'chat' | 'voice' | 'video';

// WebSocket connections - export for diagnostics
export let chatWs: WebSocket | null = null;
export let voiceWs: WebSocket | null = null;
export let videoWs: WebSocket | null = null;

// For backward compatibility during migration
export let ws: WebSocket | null = null;

// Message queues for each connection type
let chatMessageQueue: any[] = [];
let voiceMessageQueue: any[] = [];
let videoMessageQueue: any[] = [];
let messageQueue: any[] = []; // Legacy queue

// Reconnect attempts for each connection
let chatReconnectAttempts = 0;
let voiceReconnectAttempts = 0;
let videoReconnectAttempts = 0;
let reconnectAttempts = 0; // Legacy reconnect counter

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_INTERVAL = 3000;

// Event handlers
type EventHandler = (data: any) => void;
const eventHandlers: Record<string, EventHandler[]> = {};

// User info
let currentUser: User | null = null;

// Authentication credentials for reconnection
let authCredentials: { username: string; password: string; deviceInfo?: string } | null = null;

// Get WebSocket connection based on type
const getWsConnection = (type: WebSocketType | 'legacy'): WebSocket | null => {
  switch (type) {
    case 'chat':
      return chatWs;
    case 'voice':
      return voiceWs;
    case 'video':
      return videoWs;
    case 'legacy':
      return ws;
    default:
      return null;
  }
};

// Initialize all WebSocket connections
export const initializeAllWebSockets = async (): Promise<void> => {
  try {
    console.log("Initializing all WebSocket connections");
    await Promise.all([
      initializeWebSocket('chat'),
      // Legacy connection for backward compatibility
      initializeWebSocket('legacy'),
      // Initialize voice and video connections right away
      initializeWebSocket('voice'),
      initializeWebSocket('video')
    ]);
    console.log("All WebSocket connections initialized successfully");
  } catch (error) {
    console.error("Error initializing WebSocket connections:", error);
  }
};

// Initialize a specific WebSocket connection
export const initializeWebSocket = async (type: WebSocketType | 'legacy'): Promise<void> => {
  // Get the relevant WebSocket and check if it's already connected
  const currentWs = getWsConnection(type);
  if (currentWs && (currentWs.readyState === WebSocket.OPEN || currentWs.readyState === WebSocket.CONNECTING)) {
    console.log(`${type} WebSocket already connected or connecting`);
    return;
  }

  // Determine the appropriate WebSocket protocol and URL
  // Check if we're running on Replit or local development
  const isReplit = window.location.hostname.includes('replit');
  const isLocalhost = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1';
                      
  // For different environments: Replit vs Local Development
  let protocol, host;
  
  // Simplify the protocol determination logic
  protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  
  if (isReplit) {
    // For Replit environment, use their domain
    console.log("Using Replit WebSocket connection settings");
    host = window.location.host;
  } else {
    // For local Windows development or accessing from other devices on local network
    console.log("Using local development WebSocket connection settings");
    
    // Use current hostname with port 5000 for local development
    // For Windows environment, always use explicit IP or hostname rather than localhost
    if (isLocalhost) {
      // Try to detect if we're on Windows and use the appropriate host format
      const isWindows = navigator.platform.indexOf('Win') > -1;
      
      if (isWindows) {
        // On Windows, using the explicit loopback IP can be more reliable than 'localhost'
        console.log("Windows detected, using explicit loopback IP for better WebSocket reliability");
        host = "127.0.0.1:5000";
      } else {
        // On non-Windows platforms, localhost is usually fine
        host = "localhost:5000";
      }
    } else {
      // If we're accessing from another device on the network, use the hostname
      host = `${window.location.hostname}:5000`;
      console.log(`Connecting to server at ${host} from non-localhost client`);
    }
  }
  
  let wsUrl: string;
  switch (type) {
    case 'chat':
      wsUrl = `${protocol}//${host}/ws/chat`;
      break;
    case 'voice':
      wsUrl = `${protocol}//${host}/ws/call/voice`;
      break;
    case 'video':
      wsUrl = `${protocol}//${host}/ws/call/video`;
      break;
    case 'legacy':
    default:
      wsUrl = `${protocol}//${host}/ws`;
      break;
  }

  // Add timestamp and user session token if available
  let wsUrlWithParams = `${wsUrl}?t=${Date.now()}`;
  
  // Mencoba mendapatkan data auth dari localStorage menggunakan format data yang benar
  // Untuk mengatasi masalah autentikasi WebSocket pada Windows yang tidak mendukung cookies
  let user;
  try {
    // Pertama coba mendapatkan dari currentUser yang disimpan di memory
    if (currentUser && currentUser.id) {
      user = currentUser;
    } else {
      // Jika tidak ada, coba dari localStorage dengan berbagai format yang mungkin
      const authData = getAuthData();
      if (authData && authData.id) {
        user = authData;
      } else {
        // Coba format lain yang mungkin digunakan
        user = JSON.parse(localStorage.getItem('currentUser') || 'null');
      }
    }
  } catch (error) {
    console.error("Error parsing user data from localStorage:", error);
    user = null;
  }
  
  if (user && user.id) {
    wsUrlWithParams += `&userId=${user.id}`;
    console.log(`Adding user ID ${user.id} to WebSocket URL params`);
    
    // Tambahkan username/password untuk autentikasi langsung
    const username = user.username || localStorage.getItem('username');
    const password = user.password || localStorage.getItem('password');
    
    if (username && password) {
      wsUrlWithParams += `&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
      console.log(`Added authentication credentials to WebSocket URL`);
    } else {
      // Coba cara alternatif untuk mendapatkan kredensial
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (token) {
        wsUrlWithParams += `&token=${encodeURIComponent(token)}`;
        console.log(`Added auth token to WebSocket URL`);
      } else {
        console.log(`No credentials available for WebSocket authentication`);
      }
    }
    
    // Add connection type - helps with routing on the server
    wsUrlWithParams += `&connectionType=${type}`;
  } else {
    console.warn(`No user data available for WebSocket connection - authentication may fail`);
  }
      
  return new Promise<void>((resolve, reject) => {
    try {
      // Create new WebSocket connection with timeout
      console.log(`Initializing ${type} WebSocket connection to ${wsUrlWithParams}...`);
      
      // Windows-specific debug info
      const isWindows = navigator.platform.indexOf('Win') > -1;
      if (isWindows) {
        console.log(`Running on Windows platform - using enhanced WebSocket settings for better compatibility`);
      }
      
      const newWs = new WebSocket(wsUrlWithParams);
      
      // Add special property to help with debugging
      (newWs as any).connectionType = type;
      
      // Setup connection timeout - increased for slower connections
      const connectionTimeout = setTimeout(() => {
        if (newWs.readyState !== WebSocket.OPEN) {
          console.error(`${type} WebSocket connection timeout`);
          newWs.close();
          reject(new Error(`${type} WebSocket connection timeout`));
        }
      }, 15000); // Increased to 15 seconds for very slow connections
      
      // Store the connection in the appropriate variable
      switch (type) {
        case 'chat':
          chatWs = newWs;
          break;
        case 'voice':
          voiceWs = newWs;
          break;
        case 'video':
          videoWs = newWs;
          break;
        case 'legacy':
          ws = newWs;
          break;
      }
      
      // Log active WebSocket state periodically for debugging
      const wsStateInterval = setInterval(() => {
        // Don't log if connection is already closed
        if (newWs.readyState === WebSocket.CLOSED || newWs.readyState === WebSocket.CLOSING) {
          clearInterval(wsStateInterval);
          return;
        }
        
        console.log(`${type} WebSocket state: ${
          newWs.readyState === WebSocket.CONNECTING ? 'CONNECTING' :
          newWs.readyState === WebSocket.OPEN ? 'OPEN' :
          newWs.readyState === WebSocket.CLOSING ? 'CLOSING' : 'CLOSED'
        }`);
      }, 10000);
      
      // Clear all intervals on page unload
      window.addEventListener('beforeunload', () => {
        clearInterval(wsStateInterval);
        clearTimeout(connectionTimeout);
      });
      
      newWs.addEventListener('open', () => {
        clearTimeout(connectionTimeout);
        console.log(`${type} WebSocket connection opened via addEventListener`);
      });

      newWs.onopen = () => {
        console.log(`${type} WebSocket connection established via onopen`);
        
        // Clear timeout when connected
        clearTimeout(connectionTimeout);
        
        // Reset the error counter when connection is successfully established
        localStorage.setItem(`ws_1006_errors_${type}`, '0');
        
        // If we were using polling fallback, dispatch a recovery event
        // This will allow the application to switch back to WebSockets when possible
        const wsRecoveryEvent = new Event('ws-recovery');
        window.dispatchEvent(wsRecoveryEvent);
        
        // Send any queued messages for this connection type
        let queue: any[] = [];
        switch (type) {
          case 'chat':
            queue = chatMessageQueue;
            chatMessageQueue = [];
            break;
          case 'voice':
            queue = voiceMessageQueue;
            voiceMessageQueue = [];
            break;
          case 'video':
            queue = videoMessageQueue;
            videoMessageQueue = [];
            break;
          case 'legacy':
            queue = messageQueue;
            messageQueue = [];
            break;
        }
        
        if (queue.length > 0) {
          console.log(`Sending ${queue.length} queued messages for ${type} connection`);
          queue.forEach(msg => {
            try {
              newWs.send(JSON.stringify(msg));
            } catch (error) {
              console.error(`Error sending queued message:`, error);
            }
          });
        }
        
        // Reauthenticate if we have credentials
        if (authCredentials) {
          authenticateConnection(
            type, 
            authCredentials.username, 
            authCredentials.password, 
            authCredentials.deviceInfo
          );
        }
        
        // Reset reconnect attempts for this connection type
        switch (type) {
          case 'chat':
            chatReconnectAttempts = 0;
            break;
          case 'voice':
            voiceReconnectAttempts = 0;
            break;
          case 'video':
            videoReconnectAttempts = 0;
            break;
          case 'legacy':
            reconnectAttempts = 0;
            break;
        }
        
        // Start heartbeat for this connection
        startHeartbeat(type);
        
        resolve();
      };

      // Error tracking variables
      let errorCount = 0;
      let consecutiveErrorCount = 0;
      const MAX_ERROR_NOTIFICATIONS = 3;
      
      newWs.onclose = (event) => {
        // Don't log every close event to reduce console spam
        if (errorCount < MAX_ERROR_NOTIFICATIONS) {
          console.log(`${type} WebSocket connection closed with code: ${event.code}, reason: ${event.reason || 'No reason provided'}`);
          errorCount++;
        }
        
        // Handle specific WebSocket error code 1006 (abnormal closure)
        // This is commonly seen in Replit environment
        if (event.code === 1006) {
          // Keep track of consecutive 1006 errors for this connection type
          consecutiveErrorCount++;
          // If we keep getting these errors, it indicates a persistent network issue
          const errorKey = `ws_1006_errors_${type}`;
          const errorCount = (parseInt(localStorage.getItem(errorKey) || '0', 10) + 1);
          localStorage.setItem(errorKey, errorCount.toString());
          
          // After 3 consecutive errors, trigger the fallback event
          if (errorCount >= 3) {
            // Dispatch a custom event that our ProtectedRoute component can listen for
            const ws1006Event = new Event('ws-error-1006');
            window.dispatchEvent(ws1006Event);
            
            console.log(`Dispatched ws-error-1006 event for ${type} WebSocket after ${errorCount} consecutive failures`);
          } else {
            console.log(`WebSocket ${type} error 1006: Error count ${errorCount}/3`);
          }
        } else {
          // Reset the error counter if we get a different error
          localStorage.setItem(`ws_1006_errors_${type}`, '0');
        }
        
        // Track reconnect attempts for this connection type
        let attempts = 0;
        switch (type) {
          case 'chat':
            attempts = ++chatReconnectAttempts;
            break;
          case 'voice':
            attempts = ++voiceReconnectAttempts;
            break;
          case 'video':
            attempts = ++videoReconnectAttempts;
            break;
          case 'legacy':
            attempts = ++reconnectAttempts;
            break;
        }
        
        // Trigger an event for the application to handle
        triggerEvent("websocket_closed", {
          connectionType: type,
          code: event.code,
          reason: event.reason,
          attempts
        });
        
        // Attempt to reconnect if under the maximum attempts
        // Use exponential backoff for reconnection timing
        if (attempts < MAX_RECONNECT_ATTEMPTS) {
          const backoffDelay = RECONNECT_INTERVAL * Math.pow(1.5, attempts - 1);
          console.log(`Will try to reconnect ${type} WebSocket in ${backoffDelay}ms (attempt ${attempts}/${MAX_RECONNECT_ATTEMPTS})`);
          
          setTimeout(() => {
            console.log(`Attempting to reconnect ${type} WebSocket (attempt ${attempts}/${MAX_RECONNECT_ATTEMPTS})`);
            initializeWebSocket(type);
          }, backoffDelay);
        } else {
          // Notify reconnection failure
          triggerEvent("connection_lost", { 
            message: `${type} connection lost. Please refresh the page.`,
            connectionType: type
          });
        }
      };

      // Track error state to prevent multiple error logs for same connection
      let hasReportedError = false;
      
      newWs.onerror = (error) => {
        // Only log error once per connection attempt
        if (!hasReportedError) {
          console.error(`${type} WebSocket error:`, error);
          hasReportedError = true;
        }
        
        // Set a timeout to automatically try to re-initialize
        // (This is a backup to the onclose handler)
        if (type !== 'legacy') {
          setTimeout(() => {
            const currentSocket = getWsConnection(type);
            if (!currentSocket || currentSocket.readyState !== WebSocket.OPEN) {
              console.log(`${type} WebSocket connection timeout`);
            }
          }, 10000); // 10 second timeout
        }
        
        reject(error);
      };

      newWs.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Add the connection type to the message data for differentiation if needed
          data.connectionType = type;
          handleWebSocketMessage(data);
        } catch (error) {
          console.error(`Error parsing ${type} WebSocket message:`, error);
        }
      };
    } catch (error) {
      console.error(`Failed to initialize ${type} WebSocket:`, error);
      reject(error);
    }
  });
};

// Heartbeat to keep connection alive for a specific connection type
const startHeartbeat = (type: WebSocketType | 'legacy') => {
  const HEARTBEAT_INTERVAL = 25000; // 25 seconds
  
  // Get the appropriate WebSocket connection for this type
  const socketConnection = getWsConnection(type);
  if (!socketConnection) return;
  
  const interval = setInterval(() => {
    // Get the latest version of the connection
    const currentSocket = getWsConnection(type);
    if (currentSocket && currentSocket.readyState === WebSocket.OPEN) {
      // Send heartbeat to the specific connection
      sendMessageToConnection(type, { type: "heartbeat" });
    } else {
      clearInterval(interval);
    }
  }, HEARTBEAT_INTERVAL);

  // Clear interval on page unload
  window.addEventListener("beforeunload", () => {
    clearInterval(interval);
  });
};

// Handle incoming WebSocket messages
const handleWebSocketMessage = (data: any) => {
  const { type } = data;

  switch (type) {
    case "auth_success":
      currentUser = data.user;
      // Save to localStorage for persistence
      localStorage.setItem('currentUser', JSON.stringify(data.user));
      triggerEvent("auth_success", data);
      break;
    
    case "error":
      triggerEvent("error", data);
      break;
    
    case "heartbeat_ack":
      // Heartbeat acknowledgement, nothing to do
      break;
    
    case "contacts":
      triggerEvent("contacts_updated", data);
      break;
    
    case "chats":
      triggerEvent("chats_updated", data);
      break;
    
    case "online_users":
      triggerEvent("online_users_updated", data);
      break;
    
    case "direct_chat":
      triggerEvent("direct_chat_loaded", data);
      break;
    
    case "room_messages":
      triggerEvent("room_messages_loaded", data);
      break;
    
    case "new_message":
      triggerEvent("new_message_received", data);
      break;
    
    case "message_sent":
      triggerEvent("message_sent", data);
      break;
    
    case "room_details":
      triggerEvent("room_details_loaded", data);
      break;
    
    case "room_created":
      triggerEvent("room_created", data);
      break;
    
    case "room_update":
      triggerEvent("room_updated", data);
      break;
    
    case "call_incoming":
      triggerEvent("call_incoming", data);
      break;
    
    case "call_initiated":
      triggerEvent("call_initiated", data);
      break;
    
    case "call_answered":
      triggerEvent("call_answered", data);
      break;
    
    case "call_ice_candidate":
      triggerEvent("call_ice_candidate", data);
      break;
    
    case "call_ended":
      triggerEvent("call_ended", data);
      break;
    
    case "call_failed":
      triggerEvent("call_failed", data);
      break;
      
    // Group call message types
    case "group_call_offer":
      triggerEvent("group_call_offer", data);
      break;
      
    case "group_call_answer":
      triggerEvent("group_call_answer", data);
      break;
      
    case "group_call_ice_candidate":
      triggerEvent("group_call_ice_candidate", data);
      break;
      
    case "group_call_user_joined":
      triggerEvent("group_call_user_joined", data);
      break;
      
    case "group_call_user_left":
      triggerEvent("group_call_user_left", data);
      break;
      
    case "group_call_ended":
      triggerEvent("group_call_ended", data);
      break;
      
    case "group_call_end_success":
      triggerEvent("group_call_end_success", data);
      console.log(`Group call end success: Room ${data.roomId}, duration: ${data.duration}s`);
      break;
    
    default:
      console.log("Unknown message type:", type, data);
  }
};

// Send a message through a specific WebSocket connection
export const sendMessageToConnection = (type: WebSocketType | 'legacy', message: any): void => {
  // Get the appropriate WebSocket and message queue for this connection type
  let socket: WebSocket | null;
  let queue: any[];
  
  switch (type) {
    case 'chat':
      socket = chatWs;
      queue = chatMessageQueue;
      break;
    case 'voice':
      socket = voiceWs;
      queue = voiceMessageQueue;
      break;
    case 'video':
      socket = videoWs;
      queue = videoMessageQueue;
      break;
    case 'legacy':
    default:
      socket = ws;
      queue = messageQueue;
      break;
  }
  
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  } else {
    // Queue message for when connection is established
    switch (type) {
      case 'chat':
        chatMessageQueue.push(message);
        break;
      case 'voice':
        voiceMessageQueue.push(message);
        break;
      case 'video':
        videoMessageQueue.push(message);
        break;
      case 'legacy':
      default:
        messageQueue.push(message);
        break;
    }
    
    // Try to reconnect if not already connecting
    if (!socket || socket.readyState !== WebSocket.CONNECTING) {
      initializeWebSocket(type);
    }
  }
};

// Send message to the appropriate connection based on message type
export const sendMessage = (message: any): void => {
  const messageType = message.type || '';
  
  // Route message to appropriate connection type based on message content
  if (messageType.startsWith('call_')) {
    // Call-related messages need to include callType for proper routing
    const callType = message.callType || 'video'; // Default to video if not specified
    
    if (callType === 'audio') {
      // First try voice WebSocket
      if (voiceWs && voiceWs.readyState === WebSocket.OPEN) {
        sendMessageToConnection('voice', message);
        return;
      }
      
      // If not initialized yet, try to initialize it
      if (!voiceWs || voiceWs.readyState !== WebSocket.CONNECTING) {
        initializeWebSocket('voice').then(() => {
          if (voiceWs && voiceWs.readyState === WebSocket.OPEN) {
            // Authenticate if needed
            if (authCredentials) {
              authenticateConnection('voice', 
                authCredentials.username, 
                authCredentials.password, 
                authCredentials.deviceInfo
              );
            }
            // Queue the message to be sent after connection
            voiceMessageQueue.push(message);
          }
        });
      } else {
        // Connection is being established, queue the message
        voiceMessageQueue.push(message);
      }
    } else {
      // For video calls
      if (videoWs && videoWs.readyState === WebSocket.OPEN) {
        sendMessageToConnection('video', message);
        return;
      }
      
      // If not initialized yet, try to initialize it
      if (!videoWs || videoWs.readyState !== WebSocket.CONNECTING) {
        initializeWebSocket('video').then(() => {
          if (videoWs && videoWs.readyState === WebSocket.OPEN) {
            // Authenticate if needed
            if (authCredentials) {
              authenticateConnection('video', 
                authCredentials.username, 
                authCredentials.password, 
                authCredentials.deviceInfo
              );
            }
            // Queue the message to be sent after connection
            videoMessageQueue.push(message);
          }
        });
      } else {
        // Connection is being established, queue the message
        videoMessageQueue.push(message);
      }
    }
    
    // Always send to chat connection as a backup
    if (chatWs && chatWs.readyState === WebSocket.OPEN) {
      sendMessageToConnection('chat', message);
    } else if (ws && ws.readyState === WebSocket.OPEN) {
      // Legacy connection as last resort
      sendMessageToConnection('legacy', message);
    }
  } else if (messageType === 'auth' || 
             messageType === 'heartbeat' || 
             messageType === 'get_contacts' || 
             messageType === 'get_chats' ||
             messageType === 'get_direct_chat' ||
             messageType === 'get_room_details' ||
             messageType === 'get_room_messages' ||
             messageType === 'create_room' ||
             messageType === 'join_room' ||
             messageType === 'leave_room' ||
             messageType === 'send_message') {
    // Chat-related messages
    if (chatWs && chatWs.readyState === WebSocket.OPEN) {
      sendMessageToConnection('chat', message);
    } else {
      // Legacy connection as fallback
      sendMessageToConnection('legacy', message);
    }
  } else {
    // For any other message types, use the legacy connection
    sendMessageToConnection('legacy', message);
  }
};

// Register event handler
export const addEventListener = (event: string, handler: EventHandler): void => {
  if (!eventHandlers[event]) {
    eventHandlers[event] = [];
  }
  eventHandlers[event].push(handler);
};

// Remove event handler
export const removeEventListener = (event: string, handler: EventHandler): void => {
  if (eventHandlers[event]) {
    eventHandlers[event] = eventHandlers[event].filter(h => h !== handler);
  }
};

// Trigger event handlers
const triggerEvent = (event: string, data: any): void => {
  if (eventHandlers[event]) {
    eventHandlers[event].forEach(handler => handler(data));
  }
};

// Authenticate a specific WebSocket connection
export const authenticateConnection = (
  type: WebSocketType | 'legacy',
  username: string,
  password: string,
  deviceInfo?: string
): void => {
  // Create auth message
  const authMessage = {
    type: "auth",
    username,
    password,
    deviceInfo: deviceInfo || `${window.navigator.userAgent}`
  };
  
  // Store credentials for reconnections
  if (!authCredentials) {
    authCredentials = {
      username,
      password,
      deviceInfo: deviceInfo || `${window.navigator.userAgent}`
    };
    
    // Also store the user info in localStorage if not already there
    // for connection authentication across page refreshes
    if (currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    }
  }
  
  // Send auth message to the specific connection
  sendMessageToConnection(type, authMessage);
};

// Main authentication function - authenticates all active connections
export const authenticate = (username: string, password: string, deviceInfo?: string): void => {
  // Store credentials for reconnection
  authCredentials = { username, password, deviceInfo };
  
  // Authenticate legacy connection first (for backward compatibility)
  authenticateConnection('legacy', username, password, deviceInfo);
  
  // Then authenticate all specialized connections that exist
  if (chatWs) {
    authenticateConnection('chat', username, password, deviceInfo);
  }
  
  // Authenticate voice and video connections if they exist
  if (voiceWs) {
    authenticateConnection('voice', username, password, deviceInfo);
  }
  
  if (videoWs) {
    authenticateConnection('video', username, password, deviceInfo);
  }
  
  // Initialize any connections that don't exist yet
  if (!chatWs || chatWs.readyState !== WebSocket.OPEN) {
    initializeWebSocket('chat').then(() => {
      if (authCredentials) {
        authenticateConnection('chat', username, password, deviceInfo);
      }
    });
  }
  
  if (!voiceWs || voiceWs.readyState !== WebSocket.OPEN) {
    initializeWebSocket('voice').then(() => {
      if (authCredentials) {
        authenticateConnection('voice', username, password, deviceInfo);
      }
    });
  }
  
  if (!videoWs || videoWs.readyState !== WebSocket.OPEN) {
    initializeWebSocket('video').then(() => {
      if (authCredentials) {
        authenticateConnection('video', username, password, deviceInfo);
      }
    });
  }
};

// Get current user
export const getCurrentUser = (): User | null => {
  return currentUser;
};

// Get contacts/users
export const getContacts = (): void => {
  const user = currentUser || JSON.parse(localStorage.getItem('currentUser') || 'null');
  sendMessage({ 
    type: "get_contacts",
    requesterId: user?.id // Include requesterId for Windows environment
  });
};

// Get user's chats
export const getUserChats = (): void => {
  const user = currentUser || JSON.parse(localStorage.getItem('currentUser') || 'null');
  sendMessage({ 
    type: "get_chats",
    requesterId: user?.id // Include requesterId for Windows environment
  });
};

// Get direct chat with another user
export const getDirectChat = (otherUserId: number): void => {
  const user = currentUser || JSON.parse(localStorage.getItem('currentUser') || 'null');
  sendMessage({ 
    type: "get_direct_chat",
    otherUserId,
    requesterId: user?.id // Include requesterId for Windows environment
  });
};

// Get room details including members
export const getRoomDetails = (roomId: number): void => {
  const user = currentUser || JSON.parse(localStorage.getItem('currentUser') || 'null');
  sendMessage({
    type: "get_room_details",
    roomId,
    requesterId: user?.id // Include requesterId for Windows environment
  });
};

// Get messages for a room
export const getRoomMessages = (roomId: number): void => {
  const user = currentUser || JSON.parse(localStorage.getItem('currentUser') || 'null');
  sendMessage({
    type: "get_room_messages",
    roomId,
    requesterId: user?.id // Include requesterId for Windows environment
  });
};

// Create a new room
export const createRoom = (name: string, memberIds?: number[]): void => {
  // Get current user for explicit auth in Windows environment
  const user = currentUser || JSON.parse(localStorage.getItem('currentUser') || 'null');
  
  console.log("Creating room with name:", name, "Members:", memberIds);
  console.log("Current user from localStorage:", user);
  
  sendMessage({
    type: "create_room",
    name,
    memberIds,
    creatorId: user?.id, // Include creator ID for authentication
    sessionAuth: true // Flag to indicate authenticated session
  });
};

// Join a room
export const joinRoom = (roomId: number): void => {
  const user = currentUser || JSON.parse(localStorage.getItem('currentUser') || 'null');
  sendMessage({
    type: "join_room",
    roomId,
    requesterId: user?.id // Include requesterId for Windows environment
  });
};

// Leave a room
export const leaveRoom = (roomId: number): void => {
  const user = currentUser || JSON.parse(localStorage.getItem('currentUser') || 'null');
  sendMessage({
    type: "leave_room",
    roomId,
    requesterId: user?.id // Include requesterId for Windows environment
  });
};

// Send a message to a direct chat or room
export const sendChatMessage = (
  content: string,
  directChatId?: number,
  roomId?: number,
  classificationType: string = 'routine'
): void => {
  const user = currentUser || JSON.parse(localStorage.getItem('currentUser') || 'null');
  sendMessage({
    type: "send_message",
    content,
    directChatId,
    roomId,
    senderId: user?.id, // Include senderId for Windows environment
    classificationType
  });
};

// WebRTC call signaling

// Send call offer
export const sendCallOffer = async (
  targetId: number,
  isRoom: boolean,
  sdp: string,
  callType: 'video' | 'audio'
): Promise<void> => {
  // Use the appropriate message with callType included for correct routing
  const user = currentUser || JSON.parse(localStorage.getItem('currentUser') || 'null');
  const message = {
    type: "call_offer",
    targetId,
    isRoom,
    sdp,
    callType,
    callerId: user?.id // Include callerId for Windows environment
  };
  
  console.log(`Sending ${callType} call offer to ${isRoom ? 'room' : 'user'} ${targetId}`);
  
  // First make sure the appropriate connection is established
  const connectionType = callType === 'audio' ? 'voice' : 'video';
  const connection = getWsConnection(connectionType);
  
  if (!connection || connection.readyState !== WebSocket.OPEN) {
    console.log(`${connectionType} WebSocket not ready, initializing...`);
    try {
      await initializeWebSocket(connectionType);
      
      // Authenticate if we have credentials
      if (authCredentials) {
        authenticateConnection(connectionType, 
          authCredentials.username, 
          authCredentials.password, 
          authCredentials.deviceInfo
        );
      }
    } catch (error) {
      console.error(`Failed to initialize ${connectionType} WebSocket for call offer:`, error);
    }
  }
  
  // Use the sendMessage function which will intelligently route based on message type
  sendMessage(message);
};

// Send call answer
export const sendCallAnswer = async (callId: number, sdp: string, callType: 'video' | 'audio'): Promise<void> => {
  // Use the appropriate message with callType included for correct routing
  const user = currentUser || JSON.parse(localStorage.getItem('currentUser') || 'null');
  const message = {
    type: "call_answer",
    callId,
    sdp,
    callType,
    answererId: user?.id // Include answererId for Windows environment
  };
  
  console.log(`Sending ${callType} call answer for call ${callId} from user ${user?.id}`);
  
  // First make sure the appropriate connection is established
  const connectionType = callType === 'audio' ? 'voice' : 'video';
  const connection = getWsConnection(connectionType);
  
  if (!connection || connection.readyState !== WebSocket.OPEN) {
    console.log(`${connectionType} WebSocket not ready, initializing...`);
    try {
      await initializeWebSocket(connectionType);
      
      // Authenticate if we have credentials
      if (authCredentials) {
        authenticateConnection(connectionType, 
          authCredentials.username, 
          authCredentials.password, 
          authCredentials.deviceInfo
        );
      }
    } catch (error) {
      console.error(`Failed to initialize ${connectionType} WebSocket for call answer:`, error);
    }
  }
  
  // Use the sendMessage function which will intelligently route based on message type
  sendMessage(message);
};

// Send ICE candidate
export const sendIceCandidate = async (targetId: number, candidate: RTCIceCandidate, callType: 'video' | 'audio'): Promise<void> => {
  // Use the appropriate message with callType included for correct routing
  const user = currentUser || JSON.parse(localStorage.getItem('currentUser') || 'null');
  const message = {
    type: "call_ice_candidate",
    targetId,
    candidate,
    callType,
    senderId: user?.id // Include senderId for Windows environment
  };
  
  console.log(`Sending ICE candidate for ${callType} call to peer ${targetId}`);
  
  // First make sure the appropriate connection is established
  const connectionType = callType === 'audio' ? 'voice' : 'video';
  const connection = getWsConnection(connectionType);
  
  if (!connection || connection.readyState !== WebSocket.OPEN) {
    console.log(`${connectionType} WebSocket not ready for ICE candidate, initializing...`);
    try {
      await initializeWebSocket(connectionType);
      
      // Authenticate if we have credentials
      if (authCredentials) {
        authenticateConnection(connectionType, 
          authCredentials.username, 
          authCredentials.password, 
          authCredentials.deviceInfo
        );
      }
    } catch (error) {
      console.error(`Failed to initialize ${connectionType} WebSocket for ICE candidate:`, error);
    }
  }
  
  // Use the sendMessage function which will intelligently route based on message type
  sendMessage(message);
};

// End a call
export const endCall = async (callId: number, callType: 'video' | 'audio'): Promise<void> => {
  // Use the appropriate message with callType included for correct routing
  const user = currentUser || JSON.parse(localStorage.getItem('currentUser') || 'null');
  const message = {
    type: "call_end",
    callId,
    callType,
    userId: user?.id  // Include userId for Windows environment
  };
  
  console.log(`Ending ${callType} call with ID ${callId}`);
  
  // First make sure the appropriate connection is established
  const connectionType = callType === 'audio' ? 'voice' : 'video';
  const connection = getWsConnection(connectionType);
  
  if (!connection || connection.readyState !== WebSocket.OPEN) {
    console.log(`${connectionType} WebSocket not ready for ending call, initializing...`);
    try {
      await initializeWebSocket(connectionType);
      
      // Authenticate if we have credentials
      if (authCredentials) {
        authenticateConnection(connectionType, 
          authCredentials.username, 
          authCredentials.password, 
          authCredentials.deviceInfo
        );
      }
    } catch (error) {
      console.error(`Failed to initialize ${connectionType} WebSocket for ending call:`, error);
    }
  }
  
  // Use the sendMessage function which will intelligently route based on message type
  sendMessage(message);
};

// Group Call Functionality

// Group Call Functionality
export const sendGroupCallOffer = async (
  roomId: number, 
  peerId: number, 
  sdp: string, 
  callType: 'video' | 'audio'
): Promise<void> => {
  const user = currentUser || JSON.parse(localStorage.getItem('currentUser') || 'null');
  const message = {
    type: "group_call_offer",
    roomId,
    peerId,
    sdp,
    callType,
    callerId: user?.id // Explicit user ID for Windows environment
  };
  
  console.log(`Sending ${callType} group call offer to room ${roomId}`);
  
  // Use appropriate connection for call type
  const connectionType = callType === 'audio' ? 'voice' : 'video';
  const connection = getWsConnection(connectionType);
  
  if (!connection || connection.readyState !== WebSocket.OPEN) {
    console.log(`${connectionType} WebSocket not ready, initializing...`);
    try {
      await initializeWebSocket(connectionType);
      
      // Authenticate if we have credentials
      if (authCredentials) {
        authenticateConnection(connectionType, 
          authCredentials.username, 
          authCredentials.password, 
          authCredentials.deviceInfo
        );
      }
    } catch (error) {
      console.error(`Failed to initialize ${connectionType} WebSocket for group call offer:`, error);
    }
  }
  
  // IMPORTANT: Try to send directly through different channels to ensure delivery
  // This multi-path approach increases reliability
  
  // 1. Try the dedicated connection first (most reliable path)
  const targetConnection = getWsConnection(connectionType);
  if (targetConnection && targetConnection.readyState === WebSocket.OPEN) {
    console.log(`Sending group ${callType} call offer directly via ${connectionType} WebSocket`);
    targetConnection.send(JSON.stringify(message));
  }
  
  // 2. Also try legacy connection as backup
  const legacyConnection = getWsConnection('legacy');
  if (legacyConnection && legacyConnection.readyState === WebSocket.OPEN) {
    console.log(`Also sending via legacy WebSocket as backup`);
    legacyConnection.send(JSON.stringify(message));
  }
  
  // 3. Also try chat connection as another backup path
  const chatConnection = getWsConnection('chat');
  if (chatConnection && chatConnection.readyState === WebSocket.OPEN) {
    console.log(`Also sending via chat WebSocket as extra backup`);
    chatConnection.send(JSON.stringify(message));
  }
  
  // 4. Finally use the general message routing function
  console.log(`Sending group ${callType} call offer with general routing. SDP length: ${sdp.length}`);
  sendMessage(message);
};

export const sendGroupCallAnswer = async (
  roomId: number,
  peerId: number,
  sdp: string,
  callType: 'video' | 'audio'
): Promise<void> => {
  const user = currentUser || JSON.parse(localStorage.getItem('currentUser') || 'null');
  const message = {
    type: "group_call_answer",
    roomId,
    peerId,
    sdp,
    callType,
    answererId: user?.id // Explicit user ID for Windows environment
  };
  
  console.log(`Sending ${callType} group call answer to peer ${peerId} in room ${roomId}`);
  
  // Use appropriate connection for call type
  const connectionType = callType === 'audio' ? 'voice' : 'video';
  const connection = getWsConnection(connectionType);
  
  if (!connection || connection.readyState !== WebSocket.OPEN) {
    console.log(`${connectionType} WebSocket not ready, initializing...`);
    try {
      await initializeWebSocket(connectionType);
      
      // Authenticate if we have credentials
      if (authCredentials) {
        authenticateConnection(connectionType, 
          authCredentials.username, 
          authCredentials.password, 
          authCredentials.deviceInfo
        );
      }
    } catch (error) {
      console.error(`Failed to initialize ${connectionType} WebSocket for group call answer:`, error);
    }
  }
  
  // IMPORTANT: Use multi-path delivery for group call answers too
  // This ensures reliable signaling across all connection types
  
  // 1. Try the dedicated connection first (most reliable path)
  const targetConnection = getWsConnection(connectionType);
  if (targetConnection && targetConnection.readyState === WebSocket.OPEN) {
    console.log(`Sending group ${callType} call answer directly via ${connectionType} WebSocket`);
    targetConnection.send(JSON.stringify(message));
  }
  
  // 2. Also try legacy connection as backup
  const legacyConnection = getWsConnection('legacy');
  if (legacyConnection && legacyConnection.readyState === WebSocket.OPEN) {
    console.log(`Also sending answer via legacy WebSocket as backup`);
    legacyConnection.send(JSON.stringify(message));
  }
  
  // 3. Also try chat connection as another backup path
  const chatConnection = getWsConnection('chat');
  if (chatConnection && chatConnection.readyState === WebSocket.OPEN) {
    console.log(`Also sending answer via chat WebSocket as extra backup`);
    chatConnection.send(JSON.stringify(message));
  }
  
  // 4. Finally use the general message routing function
  console.log(`Sending group ${callType} call answer with general routing. SDP length: ${sdp.length}`);
  sendMessage(message);
};

export const sendGroupCallIceCandidate = async (
  roomId: number,
  peerId: number,
  candidate: RTCIceCandidate,
  callType: 'video' | 'audio'
): Promise<void> => {
  const user = currentUser || JSON.parse(localStorage.getItem('currentUser') || 'null');
  const message = {
    type: "group_call_ice_candidate",
    roomId,
    peerId,
    candidate,
    callType,
    senderId: user?.id // Explicit user ID for Windows environment
  };
  
  console.log(`Sending ICE candidate for ${callType} group call to peer ${peerId} in room ${roomId}`);
  
  // Use appropriate connection for call type
  const connectionType = callType === 'audio' ? 'voice' : 'video';
  const connection = getWsConnection(connectionType);
  
  if (!connection || connection.readyState !== WebSocket.OPEN) {
    console.log(`${connectionType} WebSocket not ready, initializing...`);
    try {
      await initializeWebSocket(connectionType);
      
      // Authenticate if we have credentials
      if (authCredentials) {
        authenticateConnection(connectionType, 
          authCredentials.username, 
          authCredentials.password, 
          authCredentials.deviceInfo
        );
      }
    } catch (error) {
      console.error(`Failed to initialize ${connectionType} WebSocket for group call ICE candidate:`, error);
    }
  }
  
  // IMPORTANT: Use multi-path delivery for ICE candidates too
  // ICE candidates are critical for establishing peer connections
  
  // 1. Try the dedicated connection first (most reliable path)
  const targetConnection = getWsConnection(connectionType);
  if (targetConnection && targetConnection.readyState === WebSocket.OPEN) {
    console.log(`Sending ICE candidate directly via ${connectionType} WebSocket`);
    targetConnection.send(JSON.stringify(message));
  }
  
  // 2. Also try legacy connection as backup
  const legacyConnection = getWsConnection('legacy');
  if (legacyConnection && legacyConnection.readyState === WebSocket.OPEN) {
    console.log(`Also sending ICE candidate via legacy WebSocket as backup`);
    legacyConnection.send(JSON.stringify(message));
  }
  
  // 3. Also try chat connection as another backup path
  const chatConnection = getWsConnection('chat');
  if (chatConnection && chatConnection.readyState === WebSocket.OPEN) {
    console.log(`Also sending ICE candidate via chat WebSocket as extra backup`);
    chatConnection.send(JSON.stringify(message));
  }
  
  // 4. Finally use the general message routing function
  console.log(`Sending group ${callType} call ICE candidate with general routing.`);
  sendMessage(message);
};

export const endGroupCall = async (
  callId: number,
  roomId: number,
  callType: 'video' | 'audio'
): Promise<void> => {
  const user = currentUser || JSON.parse(localStorage.getItem('currentUser') || 'null');
  const message = {
    type: "group_call_end",
    callId,
    roomId,
    callType,
    userId: user?.id // Explicit user ID for Windows environment
  };
  
  console.log(`Ending ${callType} group call ID ${callId} in room ${roomId}`);
  
  // Use appropriate connection for call type
  const connectionType = callType === 'audio' ? 'voice' : 'video';
  const connection = getWsConnection(connectionType);
  
  if (!connection || connection.readyState !== WebSocket.OPEN) {
    console.log(`${connectionType} WebSocket not ready, initializing...`);
    try {
      await initializeWebSocket(connectionType);
      
      // Authenticate if we have credentials
      if (authCredentials) {
        authenticateConnection(connectionType, 
          authCredentials.username, 
          authCredentials.password, 
          authCredentials.deviceInfo
        );
      }
    } catch (error) {
      console.error(`Failed to initialize ${connectionType} WebSocket for ending group call:`, error);
    }
  }
  
  // Send the message
  sendMessage(message);
};

// Group call user status notifications
export const sendGroupCallUserJoined = async (
  roomId: number,
  callId: number,
  callType: 'video' | 'audio'
): Promise<void> => {
  const user = currentUser || JSON.parse(localStorage.getItem('currentUser') || 'null');
  const message = {
    type: "group_call_user_joined",
    roomId,
    callId,
    callType,
    userId: user?.id
  };
  
  console.log(`Sending notification for user joined ${callType} group call in room ${roomId}`);
  
  // Use appropriate connection for call type
  const connectionType = callType === 'audio' ? 'voice' : 'video';
  const connection = getWsConnection(connectionType);
  
  if (!connection || connection.readyState !== WebSocket.OPEN) {
    console.log(`${connectionType} WebSocket not ready, initializing...`);
    try {
      await initializeWebSocket(connectionType);
      
      // Authenticate if we have credentials
      if (authCredentials) {
        authenticateConnection(connectionType, 
          authCredentials.username, 
          authCredentials.password, 
          authCredentials.deviceInfo
        );
      }
    } catch (error) {
      console.error(`Failed to initialize ${connectionType} WebSocket for user joined notification:`, error);
    }
  }
  
  // Send the message through all available channels
  sendMessage(message);
};

export const sendGroupCallUserLeft = async (
  roomId: number,
  callId: number,
  callType: 'video' | 'audio'
): Promise<void> => {
  const user = currentUser || JSON.parse(localStorage.getItem('currentUser') || 'null');
  const message = {
    type: "group_call_user_left",
    roomId,
    callId,
    callType,
    userId: user?.id
  };
  
  console.log(`Sending notification for user left ${callType} group call in room ${roomId}`);
  
  // Use appropriate connection for call type
  const connectionType = callType === 'audio' ? 'voice' : 'video';
  const connection = getWsConnection(connectionType);
  
  if (!connection || connection.readyState !== WebSocket.OPEN) {
    console.log(`${connectionType} WebSocket not ready, initializing...`);
    try {
      await initializeWebSocket(connectionType);
      
      // Authenticate if we have credentials
      if (authCredentials) {
        authenticateConnection(connectionType, 
          authCredentials.username, 
          authCredentials.password, 
          authCredentials.deviceInfo
        );
      }
    } catch (error) {
      console.error(`Failed to initialize ${connectionType} WebSocket for user left notification:`, error);
    }
  }
  
  // Send the message
  sendMessage(message);
};
