import { getAuthData } from './authUtils';
import { initializeWebSocket, addEventListener, sendMessage } from './websocket';

interface ChatMessage {
  id?: number;
  senderId: number;
  receiverId?: number;
  roomId?: number;
  text: string;
  timestamp: string;
  isRead: boolean;
}

interface Chat {
  id: number;
  type: 'direct' | 'room';
  name: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  otherUserId?: number;
}

// Initialize the WebSocket connection for chat
export const initializeChatService = async (): Promise<void> => {
  try {
    await initializeWebSocket('chat');
    console.log('Chat service initialized successfully');
    
    // Set up event listeners for incoming messages
    addEventListener('chat_message', handleChatMessage);
    addEventListener('user_status', handleUserStatus);
    addEventListener('notification', handleNotification);
    
    // Send a presence message to notify the server we're online
    const userData = getAuthData();
    if (userData) {
      sendMessage({
        type: 'presence',
        status: 'online',
        userId: userData.id
      });
    }
  } catch (error) {
    console.error('Failed to initialize chat service:', error);
  }
};

// Handle incoming chat messages
const handleChatMessage = (data: any) => {
  console.log('Received chat message:', data);
  
  // Store message in localStorage for persistence
  try {
    const storageKey = data.roomId 
      ? `messages_room_${data.roomId}` 
      : `messages_direct_${data.senderId === getAuthData()?.id ? data.receiverId : data.senderId}`;
    
    const existingMessages = JSON.parse(localStorage.getItem(storageKey) || '[]');
    existingMessages.push({
      id: data.id || Date.now(),
      senderId: data.senderId,
      text: data.text,
      timestamp: data.timestamp || new Date().toISOString(),
      isRead: false
    });
    
    localStorage.setItem(storageKey, JSON.stringify(existingMessages));
    
    // Update the chat list with new message info
    updateChatList(data);
    
    // Trigger event for UI update
    window.dispatchEvent(new CustomEvent('newChatMessage', { detail: data }));
  } catch (error) {
    console.error('Error storing chat message:', error);
  }
};

// Handle user status updates
const handleUserStatus = (data: any) => {
  console.log('User status update:', data);
  
  // Update user status in UI
  window.dispatchEvent(new CustomEvent('userStatusChange', { detail: data }));
};

// Handle notifications
const handleNotification = (data: any) => {
  console.log('Notification received:', data);
  
  // Trigger notification in UI
  window.dispatchEvent(new CustomEvent('notification', { detail: data }));
};

// Update chat list with new message info
const updateChatList = (messageData: any) => {
  try {
    const userData = getAuthData();
    if (!userData) return;
    
    // Get current chat list
    const chatListKey = `user_chats_${userData.id}`;
    let chats: Chat[] = JSON.parse(localStorage.getItem(chatListKey) || '[]');
    
    const chatId = messageData.roomId || (
      messageData.senderId === userData.id 
        ? messageData.receiverId 
        : messageData.senderId
    );
    
    const chatType = messageData.roomId ? 'room' : 'direct';
    
    // Find existing chat or create new one
    let chat = chats.find(c => c.id === chatId && c.type === chatType);
    
    const senderName = messageData.senderName || 
      (messageData.senderId === 7 ? "Eko" : 
      (messageData.senderId === 8 ? "David" : 
      (messageData.senderId === 9 ? "Aji" : `User-${messageData.senderId}`)));
    
    const roomName = messageData.roomName || `Room ${chatId}`;
    
    if (!chat) {
      // Create new chat entry
      chat = {
        id: chatId,
        type: chatType,
        name: chatType === 'direct' ? senderName : roomName,
        lastMessage: messageData.text,
        lastMessageTime: messageData.timestamp || new Date().toISOString(),
        unreadCount: messageData.senderId !== userData.id ? 1 : 0,
        otherUserId: chatType === 'direct' ? (
          messageData.senderId === userData.id 
            ? messageData.receiverId 
            : messageData.senderId
        ) : undefined
      };
      
      chats.push(chat);
      
      // Tampilkan notifikasi untuk chat baru
      if (messageData.senderId !== userData.id) {
        console.log('Pesan baru dari', senderName);
        showSystemNotification(`Pesan baru dari ${senderName}`, messageData.text);
      }
    } else {
      // Update existing chat
      chat.lastMessage = messageData.text;
      chat.lastMessageTime = messageData.timestamp || new Date().toISOString();
      if (messageData.senderId !== userData.id) {
        chat.unreadCount = (chat.unreadCount || 0) + 1;
        
        // Tampilkan notifikasi untuk pesan baru
        console.log('Pesan baru dari', chat.name);
        showSystemNotification(`Pesan baru dari ${chat.name}`, messageData.text);
      }
    }
    
    // Sort by most recent message
    chats.sort((a, b) => {
      const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
      const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
      return timeB - timeA;
    });
    
    // Save updated chat list
    localStorage.setItem(chatListKey, JSON.stringify(chats));
    
    // Simpan juga di localStorage dengan key yang konsisten 
    // Ini memastikan MainLayoutNew dapat mengakses data yang sama
    localStorage.setItem('chatList', JSON.stringify(chats));
    
    // Hitung total unread untuk badge notifikasi
    const totalUnread = chats.reduce((total, c) => total + (c.unreadCount || 0), 0);
    localStorage.setItem('totalUnreadMessages', totalUnread.toString());
    
    // Trigger event for UI update dengan detail lengkap
    window.dispatchEvent(new CustomEvent('chatListUpdated', {
      detail: { chats, totalUnread }
    }));
  } catch (error) {
    console.error('Error updating chat list:', error);
  }
};

// Fungsi untuk menampilkan notifikasi sistem
const showSystemNotification = (title: string, body: string) => {
  try {
    // Cek apakah browser mendukung notifikasi
    if (!("Notification" in window)) {
      console.log("Browser tidak mendukung notifikasi desktop");
      return;
    }
    
    // Cek izin notifikasi
    if (Notification.permission === "granted") {
      // Tampilkan notifikasi
      new Notification(title, { body });
    } else if (Notification.permission !== "denied") {
      // Minta izin jika belum ditentukan
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          new Notification(title, { body });
        }
      });
    }
    
    // Putar suara notifikasi jika tersedia
    playNotificationSound();
  } catch (error) {
    console.error("Error showing notification:", error);
  }
};

// Fungsi untuk memainkan suara notifikasi
const playNotificationSound = () => {
  try {
    const audio = new Audio();
    audio.src = "/notification.mp3"; // Path ke file suara notifikasi (opsional)
    audio.play().catch(e => console.log("Autoplay prevented:", e));
  } catch (error) {
    console.error("Error playing notification sound:", error);
  }
};

// Send a chat message
export const sendChatMessage = (message: {
  receiverId?: number;
  roomId?: number;
  text: string;
}): Promise<void> => {
  const userData = getAuthData();
  if (!userData) {
    return Promise.reject(new Error('User not authenticated'));
  }
  
  const messageData = {
    type: 'chat_message',
    senderId: userData.id,
    receiverId: message.receiverId,
    roomId: message.roomId,
    text: message.text,
    timestamp: new Date().toISOString()
  };
  
  // Store message in localStorage
  try {
    const storageKey = message.roomId 
      ? `messages_room_${message.roomId}` 
      : `messages_direct_${message.receiverId}`;
    
    const existingMessages = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const newMessage = {
      id: Date.now(),
      senderId: userData.id,
      text: message.text,
      timestamp: messageData.timestamp,
      isRead: true
    };
    
    existingMessages.push(newMessage);
    localStorage.setItem(storageKey, JSON.stringify(existingMessages));
    
    // Update chat list
    updateChatList({
      ...messageData,
      id: newMessage.id
    });
    
    // Trigger event for UI update
    window.dispatchEvent(new CustomEvent('newChatMessage', { 
      detail: newMessage 
    }));
  } catch (error) {
    console.error('Error storing outgoing message:', error);
  }
  
  // Send message via WebSocket
  return sendMessage(messageData);
};

// Get messages for a specific chat
export const getChatMessages = (chatId: number, isRoom: boolean): ChatMessage[] => {
  try {
    const storageKey = isRoom
      ? `messages_room_${chatId}`
      : `messages_direct_${chatId}`;
    
    return JSON.parse(localStorage.getItem(storageKey) || '[]');
  } catch (error) {
    console.error('Error retrieving chat messages:', error);
    return [];
  }
};

// Mark messages as read
export const markMessagesAsRead = (chatId: number, isRoom: boolean): void => {
  try {
    const userData = getAuthData();
    if (!userData) return;
    
    const storageKey = isRoom
      ? `messages_room_${chatId}`
      : `messages_direct_${chatId}`;
    
    const messages = JSON.parse(localStorage.getItem(storageKey) || '[]');
    
    // Mark all messages as read
    const updatedMessages = messages.map((msg: ChatMessage) => ({
      ...msg,
      isRead: true
    }));
    
    localStorage.setItem(storageKey, JSON.stringify(updatedMessages));
    
    // Update chat list to reset unread count
    const chatListKey = `user_chats_${userData.id}`;
    let chats: Chat[] = JSON.parse(localStorage.getItem(chatListKey) || '[]');
    
    const chat = chats.find(c => c.id === chatId && c.type === (isRoom ? 'room' : 'direct'));
    if (chat) {
      chat.unreadCount = 0;
      localStorage.setItem(chatListKey, JSON.stringify(chats));
    }
    
    // Notify server that messages have been read
    sendMessage({
      type: 'mark_read',
      userId: userData.id,
      chatId,
      isRoom
    });
    
    // Trigger event for UI update
    window.dispatchEvent(new CustomEvent('messagesRead', {
      detail: { chatId, isRoom }
    }));
  } catch (error) {
    console.error('Error marking messages as read:', error);
  }
};

// Get list of available chats
export const getUserChats = (): Chat[] => {
  const userData = getAuthData();
  if (!userData) return [];
  
  try {
    const chatListKey = `user_chats_${userData.id}`;
    return JSON.parse(localStorage.getItem(chatListKey) || '[]');
  } catch (error) {
    console.error('Error retrieving user chats:', error);
    return [];
  }
};

// Get known users for creating new chats
export const getKnownUsers = (): any[] => {
  try {
    const allUsersStr = localStorage.getItem('allUsers');
    if (!allUsersStr) return [];
    
    const allUsers = JSON.parse(allUsersStr);
    const userData = getAuthData();
    
    if (userData) {
      // Filter out current user
      return allUsers.filter((user: any) => user.id !== userData.id);
    }
    
    return allUsers;
  } catch (error) {
    console.error('Error retrieving known users:', error);
    return [];
  }
};

// Create a direct chat
export const createDirectChat = async (otherUserId: number): Promise<Chat> => {
  const userData = getAuthData();
  if (!userData) {
    throw new Error('User not authenticated');
  }
  
  try {
    // Create chat in localStorage
    const chatListKey = `user_chats_${userData.id}`;
    let chats: Chat[] = JSON.parse(localStorage.getItem(chatListKey) || '[]');
    
    // Check if chat already exists
    let chat = chats.find(c => c.type === 'direct' && c.otherUserId === otherUserId);
    
    if (!chat) {
      // Get user info for name
      const allUsers = JSON.parse(localStorage.getItem('allUsers') || '[]');
      const otherUser = allUsers.find((u: any) => u.id === otherUserId);
      
      chat = {
        id: otherUserId,
        type: 'direct',
        name: otherUser?.username || `User-${otherUserId}`,
        lastMessage: 'Start a conversation',
        lastMessageTime: new Date().toISOString(),
        unreadCount: 0,
        otherUserId
      };
      
      chats.push(chat);
      localStorage.setItem(chatListKey, JSON.stringify(chats));
      
      // Initialize empty message list
      const storageKey = `messages_direct_${otherUserId}`;
      if (!localStorage.getItem(storageKey)) {
        localStorage.setItem(storageKey, JSON.stringify([
          {
            id: Date.now(),
            senderId: 0, // System message
            text: 'Secure connection established',
            timestamp: new Date().toISOString(),
            isRead: true
          }
        ]));
      }
      
      // Notify server about new chat
      sendMessage({
        type: 'create_direct_chat',
        userId: userData.id,
        otherUserId
      });
      
      // Trigger event for UI update
      window.dispatchEvent(new CustomEvent('chatListUpdated'));
    }
    
    return chat;
  } catch (error) {
    console.error('Error creating direct chat:', error);
    throw error;
  }
};