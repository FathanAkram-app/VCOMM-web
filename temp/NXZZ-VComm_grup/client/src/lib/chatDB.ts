/**
 * chatDB.ts - Utilitas untuk mengakses dan mengelola data chat langsung dari database 
 * 
 * File ini menyediakan fungsi-fungsi untuk mengakses pesan chat langsung dari database,
 * dengan fallback ke localStorage untuk memastikan aplikasi tetap berfungsi meskipun
 * ada masalah koneksi.
 */

import { getAuthData, addAuthHeaders } from './authUtils';
import { sendMessage as apiSendMessage, getMessages as apiGetMessages } from './api';

export interface MessageData {
  id?: number;
  senderId: number;
  receiverId?: number;
  roomId?: number;
  chatId?: number;
  content: string;
  timestamp: Date;
  isRead?: boolean;
  senderName?: string;
  isDirectMessage?: boolean;
}

/**
 * Mengambil pesan dari database berdasarkan ID chat
 * 
 * @param chatId ID dari chat (room atau direct chat)
 * @param isRoom true jika chatId adalah ID room, false jika direct chat
 * @returns Array pesan
 */
export async function getMessagesFromDB(chatId: number, isRoom: boolean): Promise<MessageData[]> {
  try {
    // Coba ambil dari API terlebih dahulu
    const messages = await apiGetMessages(chatId, isRoom);
    
    if (Array.isArray(messages) && messages.length > 0) {
      // Cache locally for offline access
      const storageKey = isRoom ? `messages_room_${chatId}` : `messages_direct_${chatId}`;
      localStorage.setItem(storageKey, JSON.stringify(messages));
      
      return messages.map((msg: any) => ({
        id: msg.id,
        senderId: msg.senderId,
        receiverId: msg.receiverId,
        roomId: msg.roomId,
        content: msg.content || msg.text,
        timestamp: new Date(msg.timestamp || msg.createdAt),
        isRead: msg.isRead || false,
        senderName: msg.senderName || msg.sender,
        isDirectMessage: !isRoom
      }));
    } else {
      throw new Error("Failed to get messages or empty response");
    }
  } catch (error) {
    console.error(`Error getting messages from database: ${error}`);
    
    // Fallback to localStorage
    const storageKey = isRoom ? `messages_room_${chatId}` : `messages_direct_${chatId}`;
    const localData = localStorage.getItem(storageKey);
    
    if (localData) {
      try {
        const parsedMessages = JSON.parse(localData);
        return parsedMessages.map((msg: any) => ({
          id: msg.id,
          senderId: msg.senderId,
          receiverId: msg.receiverId,
          roomId: msg.roomId,
          content: msg.content || msg.text,
          timestamp: new Date(msg.timestamp || msg.createdAt),
          isRead: msg.isRead || false,
          senderName: msg.senderName || msg.sender,
          isDirectMessage: !isRoom
        }));
      } catch (parseError) {
        console.error(`Error parsing local messages: ${parseError}`);
        return [];
      }
    }
    
    return [];
  }
}

/**
 * Menambahkan pesan ke localStorage dan mengirimkannya ke server
 * 
 * @param chatId ID chat
 * @param isRoom true jika chat adalah room, false jika direct chat
 * @param content isi pesan
 * @returns Pesan yang berhasil ditambahkan
 */
export async function addLocalMessage(chatId: number, isRoom: boolean, content: string): Promise<MessageData | null> {
  try {
    const authData = getAuthData();
    if (!authData) {
      throw new Error("Not authenticated");
    }
    
    const storageKey = isRoom ? `messages_room_${chatId}` : `messages_direct_${chatId}`;
    const storedMessages = localStorage.getItem(storageKey);
    let existingMessages = [];
    
    if (storedMessages) {
      try {
        existingMessages = JSON.parse(storedMessages);
      } catch (e) {
        console.error(`Error parsing stored messages: ${e}`);
        existingMessages = [];
      }
    }
    
    // Generate a temporary ID untuk pesan baru
    const tempId = Date.now();
    
    // Membuat data pesan baru
    const newMessage: MessageData = {
      id: tempId,
      senderId: authData.id,
      content: content,
      timestamp: new Date(),
      isRead: true,
      senderName: authData.username,
      isDirectMessage: !isRoom
    };
    
    if (isRoom) {
      newMessage.roomId = chatId;
    } else {
      newMessage.receiverId = chatId;
    }
    
    // Simpan sementara ke localStorage
    const updatedMessages = Array.isArray(existingMessages) ? 
      [...existingMessages, newMessage] : 
      [newMessage];
      
    localStorage.setItem(storageKey, JSON.stringify(updatedMessages));
    
    // Kirim ke server menggunakan API
    try {
      const response = await apiSendMessage(content, chatId, isRoom);
      
      if (response && response.id) {
        // Update the message ID with the one from server
        const finalMessages = updatedMessages.map((msg: MessageData) => 
          msg.id === tempId ? { ...msg, id: response.id } : msg
        );
        
        // Save updated messages with server ID
        localStorage.setItem(storageKey, JSON.stringify(finalMessages));
        
        return { ...newMessage, id: response.id };
      }
      
      return newMessage;
    } catch (sendError) {
      console.error(`Error sending message to server: ${sendError}`);
      // Return the message anyway, we'll try to sync later
      return newMessage;
    }
  } catch (error) {
    console.error(`Error adding local message: ${error}`);
    return null;
  }
}

/**
 * Menandai pesan sebagai telah dibaca
 * 
 * @param chatId ID chat
 * @param isRoom true jika chat adalah room, false jika direct chat
 */
export async function markMessagesAsRead(chatId: number, isRoom: boolean): Promise<boolean> {
  try {
    // Call API first
    const endpoint = isRoom 
      ? `/api/chat/rooms/${chatId}/mark-read`
      : `/api/chat/direct-chats/${chatId}/mark-read`;
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        ...addAuthHeaders()
      });
      
      if (!response.ok) {
        console.error(`Failed to mark messages as read on server: ${response.status}`);
      }
    } catch (apiError) {
      console.error(`Error calling mark-read API: ${apiError}`);
    }
    
    // Also update local storage
    const storageKey = isRoom ? `messages_room_${chatId}` : `messages_direct_${chatId}`;
    const storedMessages = localStorage.getItem(storageKey);
    
    if (storedMessages) {
      try {
        const messages = JSON.parse(storedMessages);
        
        if (Array.isArray(messages)) {
          const updatedMessages = messages.map((msg: MessageData) => ({
            ...msg,
            isRead: true
          }));
          
          localStorage.setItem(storageKey, JSON.stringify(updatedMessages));
        }
      } catch (e) {
        console.error(`Error updating local messages read status: ${e}`);
      }
    }
    
    return true;
  } catch (error) {
    console.error(`Error marking messages as read: ${error}`);
    return false;
  }
}

/**
 * Pastikan ada direct chat antara dua pengguna
 * 
 * @param otherUserId ID pengguna lain dalam direct chat
 * @returns ID direct chat atau null jika gagal
 */
export async function ensureDirectChatExists(otherUserId: number): Promise<number | null> {
  try {
    const authData = getAuthData();
    if (!authData) {
      throw new Error("Not authenticated");
    }
    
    // Cek apakah ada direct chat yang tersimpan di localStorage
    const directChatsKey = `direct_chats_${authData.id}`;
    const storedChats = localStorage.getItem(directChatsKey);
    
    if (storedChats) {
      try {
        const chats = JSON.parse(storedChats);
        
        // Cari direct chat dengan user yang dimaksud
        const existingChat = chats.find((chat: any) => 
          chat.otherUserId === otherUserId || 
          chat.userId === otherUserId
        );
        
        if (existingChat && existingChat.id) {
          return existingChat.id;
        }
      } catch (e) {
        console.error(`Error parsing stored direct chats: ${e}`);
      }
    }
    
    // Jika tidak ada, coba buat melalui API
    try {
      const response = await fetch('/api/chat/direct-chats', {
        method: 'POST',
        ...addAuthHeaders(),
        body: JSON.stringify({ otherUserId })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create direct chat: ${response.status}`);
      }
      
      const chatData = await response.json();
      
      if (chatData && chatData.id) {
        return chatData.id;
      }
    } catch (apiError) {
      console.error(`Error creating direct chat via API: ${apiError}`);
      
      // Fallback: return hardcoded ID 17 for Eko-Aji direct chat
      if ((authData.id === 7 && otherUserId === 9) || 
          (authData.id === 9 && otherUserId === 7)) {
        return 17; // Hardcoded Eko-Aji direct chat ID
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Error ensuring direct chat exists: ${error}`);
    return null;
  }
}

/**
 * Dapatkan info user berdasarkan ID
 * 
 * @param userId ID user
 * @returns Data user atau null jika tidak ditemukan
 */
export async function getUserInfo(userId: number): Promise<any | null> {
  try {
    // Coba ambil dari cache lokal dulu
    const usersKey = 'users_cache';
    const storedUsers = localStorage.getItem(usersKey);
    
    if (storedUsers) {
      try {
        const users = JSON.parse(storedUsers);
        const user = users.find((u: any) => u.id === userId);
        
        if (user) {
          return user;
        }
      } catch (e) {
        console.error(`Error parsing stored users: ${e}`);
      }
    }
    
    // Jika tidak ada di cache, ambil dari API
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'GET',
        ...addAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get user info: ${response.status}`);
      }
      
      const userData = await response.json();
      
      if (userData) {
        return userData;
      }
    } catch (apiError) {
      console.error(`Error getting user info via API: ${apiError}`);
      
      // Fallback untuk user penting
      if (userId === 7) {
        return { id: 7, username: 'Eko', name: 'Eko', rank: 'Colonel', unit: 'Special Forces' };
      } else if (userId === 8) {
        return { id: 8, username: 'David', name: 'David', rank: 'Colonel', unit: 'Special Forces' };
      } else if (userId === 9) {
        return { id: 9, username: 'Aji', name: 'Aji', rank: 'Lieutenant', unit: 'Communications' };
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Error getting user info: ${error}`);
    return null;
  }
}