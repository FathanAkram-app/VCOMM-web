/**
 * simpleChat.ts - Utilitas sederhana untuk simulasi chat antar pengguna
 */

// Kunci untuk menyimpan data chat global
const GLOBAL_CHATS_KEY = 'global_chats';
const GLOBAL_MESSAGES_KEY = 'global_messages';

// Tipe untuk pesan
export interface ChatMessage {
  id: number | string;
  senderId: number;
  sender: string;
  text: string;
  timestamp: string;
  isRead: boolean;
}

// Tipe untuk item chat
export interface ChatItem {
  id: number;
  name: string;
  isRoom: boolean;
  lastMessage?: string;
  lastMessageTime?: string;
  unread: number;
  members?: number;
  otherUserId?: number;
  userId?: number;
  isOnline?: boolean;
}

// Menyimpan daftar chat
export function saveGlobalChats(chats: ChatItem[]): void {
  localStorage.setItem(GLOBAL_CHATS_KEY, JSON.stringify(chats));
}

// Mendapatkan daftar chat
export function getGlobalChats(): ChatItem[] {
  const chatsStr = localStorage.getItem(GLOBAL_CHATS_KEY);
  if (chatsStr) {
    return JSON.parse(chatsStr);
  }
  return [];
}

// Menyimpan pesan-pesan
export function saveGlobalMessages(messages: Record<string, ChatMessage[]>): void {
  localStorage.setItem(GLOBAL_MESSAGES_KEY, JSON.stringify(messages));
}

// Mendapatkan pesan-pesan
export function getGlobalMessages(): Record<string, ChatMessage[]> {
  const messagesStr = localStorage.getItem(GLOBAL_MESSAGES_KEY);
  if (messagesStr) {
    return JSON.parse(messagesStr);
  }
  return {};
}

// Menambahkan chat baru ke daftar global
export function addChat(chat: ChatItem): ChatItem {
  const chats = getGlobalChats();
  // Periksa apakah chat sudah ada berdasarkan ID dan isRoom
  const exists = chats.some(c => c.id === chat.id && c.isRoom === chat.isRoom);
  if (!exists) {
    chats.push(chat);
    saveGlobalChats(chats);
  }
  return chat;
}

// Mendapatkan chat berdasarkan ID dan tipe
export function getChat(chatId: number, isRoom: boolean): ChatItem | undefined {
  const chats = getGlobalChats();
  return chats.find(c => c.id === chatId && c.isRoom === isRoom);
}

// Mendapatkan chat untuk pengguna tertentu
export function getChatsForUser(userId: number): ChatItem[] {
  const chats = getGlobalChats();
  return chats.filter(chat => {
    if (chat.isRoom) {
      // Semua pengguna dapat melihat semua room chat
      return true;
    } else {
      // Direct chat hanya terlihat oleh pengguna yang terlibat
      return chat.otherUserId === userId || chat.userId === userId;
    }
  });
}

// Menambahkan pesan ke chat
export function addMessage(chatId: number, isRoom: boolean, message: ChatMessage): ChatMessage {
  const messages = getGlobalMessages();
  const chatKey = `${isRoom ? 'room' : 'direct'}_${chatId}`;
  
  if (!messages[chatKey]) {
    messages[chatKey] = [];
  }
  
  messages[chatKey].push(message);
  saveGlobalMessages(messages);
  
  // Juga update info chat terakhir
  updateChatLastMessage(chatId, isRoom, message.text, message.timestamp);
  
  return message;
}

// Mendapatkan pesan untuk chat tertentu
export function getMessagesForChat(chatId: number, isRoom: boolean): ChatMessage[] {
  const messages = getGlobalMessages();
  const chatKey = `${isRoom ? 'room' : 'direct'}_${chatId}`;
  return messages[chatKey] || [];
}

// Membuat chat direct baru
export function createDirectChat(user1Id: number, user2Id: number, user1Name: string, user2Name: string): number {
  const chatId = Date.now(); // Gunakan timestamp sebagai ID unik
  
  // Chat dari perspektif user1
  const chat1: ChatItem = {
    id: chatId,
    isRoom: false,
    name: user2Name,
    lastMessage: 'Chat started',
    lastMessageTime: new Date().toISOString(),
    unread: 0,
    userId: user1Id,
    otherUserId: user2Id
  };
  
  // Chat dari perspektif user2
  const chat2: ChatItem = {
    id: chatId,
    isRoom: false,
    name: user1Name,
    lastMessage: 'Chat started',
    lastMessageTime: new Date().toISOString(),
    unread: 0,
    userId: user2Id,
    otherUserId: user1Id
  };
  
  // Tambahkan kedua chat ke daftar global
  addChat(chat1);
  addChat(chat2);
  
  // Tambahkan pesan sistem awal
  const initialMessage: ChatMessage = {
    id: Date.now(),
    senderId: 0, // ID 0 untuk sistem
    sender: 'System',
    text: 'Secure communication established.',
    timestamp: new Date().toISOString(),
    isRead: true
  };
  
  addMessage(chatId, false, initialMessage);
  
  return chatId;
}

// Memperbarui pesan terakhir chat
function updateChatLastMessage(chatId: number, isRoom: boolean, lastMessage: string, timestamp: string): void {
  const chats = getGlobalChats();
  const updatedChats = chats.map(chat => {
    if (chat.id === chatId && chat.isRoom === isRoom) {
      return {
        ...chat,
        lastMessage: lastMessage.substring(0, 30) + (lastMessage.length > 30 ? '...' : ''),
        lastMessageTime: timestamp
      };
    }
    return chat;
  });
  
  saveGlobalChats(updatedChats);
}