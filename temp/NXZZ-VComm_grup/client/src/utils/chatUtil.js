/**
 * chatUtil.js - Utilitas untuk mengelola chat dan pesan antar pengguna
 */

// Kunci untuk menyimpan pesan chat
const getChatKey = (chatId, isRoom) => `chat_messages_${isRoom ? 'room' : 'direct'}_${chatId}`;

// Kunci untuk daftar chat pengguna
const getUserChatsKey = (userId) => `user_${userId}_chats`;

// Menyimpan pesan chat
export function saveMessages(chatId, isRoom, messages) {
  localStorage.setItem(getChatKey(chatId, isRoom), JSON.stringify(messages));
}

// Mendapatkan pesan chat
export function getMessages(chatId, isRoom) {
  const messagesStr = localStorage.getItem(getChatKey(chatId, isRoom));
  if (messagesStr) {
    return JSON.parse(messagesStr);
  }
  return [];
}

// Menambahkan pesan baru
export function addMessage(chatId, isRoom, message) {
  const messages = getMessages(chatId, isRoom);
  messages.push(message);
  saveMessages(chatId, isRoom, messages);
  
  // Update juga informasi chat terakhir untuk kedua pengguna
  updateLastMessageInfo(chatId, isRoom, message);
  
  return message;
}

// Memperbarui informasi pesan terakhir di daftar chat
function updateLastMessageInfo(chatId, isRoom, message) {
  // Jika ini direct chat, update untuk kedua pengguna
  if (!isRoom) {
    // Mendapatkan daftar chat sender
    const senderId = message.senderId;
    updateUserChatLastMessage(senderId, chatId, isRoom, message);
    
    // Menentukan recipient ID - ini adalah otherUserId di chat
    const directChat = getUserChat(senderId, chatId, isRoom);
    if (directChat && directChat.otherUserId) {
      updateUserChatLastMessage(directChat.otherUserId, chatId, isRoom, message);
    }
  } else {
    // Untuk room chat, perbarui semua anggota (tidak diimplementasikan sekarang)
  }
}

// Mendapatkan chat dari daftar pengguna
function getUserChat(userId, chatId, isRoom) {
  const userChats = getUserChats(userId);
  return userChats.find(chat => chat.id === chatId && chat.isRoom === isRoom);
}

// Memperbarui chat dengan pesan terakhir
function updateUserChatLastMessage(userId, chatId, isRoom, message) {
  const userChats = getUserChats(userId);
  const updatedChats = userChats.map(chat => {
    if (chat.id === chatId && chat.isRoom === isRoom) {
      return {
        ...chat,
        lastMessage: message.text.substring(0, 30) + (message.text.length > 30 ? '...' : ''),
        lastMessageTime: message.timestamp,
        // Tambahkan unread jika pesan bukan dari pengguna ini
        unread: userId !== message.senderId ? (chat.unread || 0) + 1 : chat.unread || 0
      };
    }
    return chat;
  });
  
  saveUserChats(userId, updatedChats);
}

// Menyimpan daftar chat pengguna
export function saveUserChats(userId, chats) {
  localStorage.setItem(getUserChatsKey(userId), JSON.stringify(chats));
}

// Mendapatkan daftar chat pengguna
export function getUserChats(userId) {
  const chatsStr = localStorage.getItem(getUserChatsKey(userId));
  if (chatsStr) {
    return JSON.parse(chatsStr);
  }
  return [];
}

// Menambahkan chat direct baru
export function createDirectChat(user1Id, user2Id, user1Name, user2Name) {
  const chatId = Date.now(); // Gunakan timestamp sebagai ID unik
  
  // Buat chat untuk user1
  const user1Chats = getUserChats(user1Id);
  const chat1 = {
    id: chatId,
    name: user2Name,
    isRoom: false,
    lastMessage: 'Chat started',
    lastMessageTime: new Date().toISOString(),
    unread: 0,
    otherUserId: user2Id
  };
  user1Chats.push(chat1);
  saveUserChats(user1Id, user1Chats);
  
  // Buat chat untuk user2
  const user2Chats = getUserChats(user2Id);
  const chat2 = {
    id: chatId,
    name: user1Name,
    isRoom: false,
    lastMessage: 'Chat started',
    lastMessageTime: new Date().toISOString(),
    unread: 0,
    otherUserId: user1Id
  };
  user2Chats.push(chat2);
  saveUserChats(user2Id, user2Chats);
  
  // Tambahkan pesan sistem awal
  const initialMessage = {
    id: Date.now(),
    senderId: 0, // ID 0 untuk sistem
    sender: 'System',
    text: '',
    timestamp: new Date().toISOString(),
    isRead: true
  };
  
  addMessage(chatId, false, initialMessage);
  
  return chatId;
}