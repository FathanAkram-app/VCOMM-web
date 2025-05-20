/**
 * chatStorage.ts - Utilitas untuk mengelola penyimpanan chat global
 * 
 * File ini menyediakan fungsi-fungsi untuk menyimpan dan mengambil data chat
 * dari localStorage dengan konsisten, memungkinkan simulasi chat antar pengguna.
 */

// Kunci-kunci penyimpanan global
const GLOBAL_CHAT_LIST_KEY = 'global_chat_list';
const GLOBAL_DIRECT_MESSAGES_PREFIX = 'global_direct_messages_';
const GLOBAL_ROOM_MESSAGES_PREFIX = 'global_room_messages_';

// Tipe data untuk pesan
export interface ChatMessage {
  id: number | string;
  senderId: number;
  sender: string;
  text: string;
  timestamp: string;
  isRead: boolean;
}

// Tipe data untuk item chat
export interface ChatItem {
  id: number;
  name: string;
  isRoom: boolean;
  lastMessage?: string;
  lastMessageTime?: string;
  unread: number;
  members?: number;
  otherUserId?: number;
  isOnline?: boolean;
}

// Mendapatkan daftar chat global
export function getGlobalChatList(): ChatItem[] {
  try {
    const chatListStr = localStorage.getItem(GLOBAL_CHAT_LIST_KEY);
    if (chatListStr) {
      return JSON.parse(chatListStr);
    }
  } catch (error) {
    console.error('Error reading global chat list:', error);
  }
  return [];
}

// Menyimpan daftar chat global
export function saveGlobalChatList(chatList: ChatItem[]): void {
  try {
    localStorage.setItem(GLOBAL_CHAT_LIST_KEY, JSON.stringify(chatList));
  } catch (error) {
    console.error('Error saving global chat list:', error);
  }
}

// Menambahkan atau memperbarui chat di daftar global
export function upsertChatInGlobalList(chat: ChatItem): void {
  try {
    const chatList = getGlobalChatList();
    const existingIndex = chatList.findIndex(c => 
      c.id === chat.id && c.isRoom === chat.isRoom
    );
    
    if (existingIndex >= 0) {
      // Update existing chat
      chatList[existingIndex] = { ...chatList[existingIndex], ...chat };
    } else {
      // Add new chat
      chatList.push(chat);
    }
    
    saveGlobalChatList(chatList);
  } catch (error) {
    console.error('Error upserting chat in global list:', error);
  }
}

// Mendapatkan pesan untuk chat tertentu
export function getMessagesForChat(chatId: number, isRoom: boolean): ChatMessage[] {
  try {
    const prefix = isRoom ? GLOBAL_ROOM_MESSAGES_PREFIX : GLOBAL_DIRECT_MESSAGES_PREFIX;
    const messagesStr = localStorage.getItem(`${prefix}${chatId}`);
    if (messagesStr) {
      return JSON.parse(messagesStr);
    }
  } catch (error) {
    console.error(`Error reading messages for chat ${chatId}:`, error);
  }
  return [];
}

// Menyimpan pesan untuk chat tertentu
export function saveMessagesForChat(chatId: number, isRoom: boolean, messages: ChatMessage[]): void {
  try {
    const prefix = isRoom ? GLOBAL_ROOM_MESSAGES_PREFIX : GLOBAL_DIRECT_MESSAGES_PREFIX;
    localStorage.setItem(`${prefix}${chatId}`, JSON.stringify(messages));
  } catch (error) {
    console.error(`Error saving messages for chat ${chatId}:`, error);
  }
}

// Menambahkan pesan baru ke chat
export function addMessageToChat(chatId: number, isRoom: boolean, message: ChatMessage): void {
  try {
    const messages = getMessagesForChat(chatId, isRoom);
    messages.push(message);
    saveMessagesForChat(chatId, isRoom, messages);
    
    // Perbarui info last message di daftar chat global
    const chatList = getGlobalChatList();
    const chatIndex = chatList.findIndex(c => c.id === chatId && c.isRoom === isRoom);
    
    if (chatIndex >= 0) {
      chatList[chatIndex] = {
        ...chatList[chatIndex],
        lastMessage: message.text.substring(0, 30) + (message.text.length > 30 ? '...' : ''),
        lastMessageTime: message.timestamp
      };
      saveGlobalChatList(chatList);
    }
  } catch (error) {
    console.error(`Error adding message to chat ${chatId}:`, error);
  }
}

// Mendapatkan daftar chat untuk pengguna tertentu
export function getChatListForUser(userId: number): ChatItem[] {
  try {
    // Gunakan daftar global dan filter berdasarkan kecocokan
    const globalList = getGlobalChatList();
    
    // Filter daftar chat yang relevan untuk pengguna ini:
    // 1. Semua room chat (grup)
    // 2. Direct chat yang melibatkan pengguna ini
    return globalList.filter(chat => {
      if (chat.isRoom) {
        return true; // Semua room bisa diakses semua user untuk demo
      } else {
        // Direct chat, periksa apakah pengguna ini terlibat
        // Baik sebagai pemilik chat (id sesuai otherUserId) atau sebagai lawan bicara
        return chat.otherUserId === userId || (chat.id === userId);
      }
    });
  } catch (error) {
    console.error(`Error getting chat list for user ${userId}:`, error);
    return [];
  }
}

// Membuat chat direct baru
export function createDirectChat(userId: number, targetUserId: number, userName: string, targetUserName: string): number {
  try {
    const chatId = Date.now(); // Gunakan timestamp sebagai ID unik
    
    // Buat chat untuk pengguna saat ini
    const userChat: ChatItem = {
      id: chatId,
      name: targetUserName,
      isRoom: false,
      lastMessage: 'Chat started',
      lastMessageTime: new Date().toISOString(),
      unread: 0,
      otherUserId: targetUserId,
      isOnline: false
    };
    
    // Buat chat untuk pengguna target (kebalikan dari chat pengguna saat ini)
    const targetChat: ChatItem = {
      id: chatId,
      name: userName,
      isRoom: false,
      lastMessage: 'Chat started',
      lastMessageTime: new Date().toISOString(),
      unread: 0,
      otherUserId: userId,
      isOnline: false
    };
    
    // Simpan keduanya ke daftar global
    const globalList = getGlobalChatList();
    globalList.push(userChat, targetChat);
    saveGlobalChatList(globalList);
    
    // Buat pesan sistem awal
    const initialMessage: ChatMessage = {
      id: Date.now(),
      senderId: 0, // 0 = sistem
      sender: 'System',
      text: 'Secure communication established.',
      timestamp: new Date().toISOString(),
      isRead: true
    };
    
    // Simpan pesan awal
    saveMessagesForChat(chatId, false, [initialMessage]);
    
    return chatId;
  } catch (error) {
    console.error('Error creating direct chat:', error);
    return 0;
  }
}