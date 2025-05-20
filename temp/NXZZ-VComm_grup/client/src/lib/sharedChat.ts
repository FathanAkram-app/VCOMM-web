/**
 * sharedChat.ts - Modul untuk menyimpan dan mensinkronkan chat antar pengguna
 * 
 * File ini menggunakan localStorage sebagai "database" yang diakses oleh semua pengguna
 * untuk simulasi pertukaran pesan real-time.
 */

// Tipe untuk pesan chat
export interface SharedMessage {
  id: number;
  chatId: number;
  senderId: number;
  senderName: string;
  content: string;
  timestamp: string;
  isRead: boolean;
}

// Tipe untuk informasi chat
export interface SharedChatInfo {
  id: number;
  isRoom: boolean;
  name: string;
  participants: number[];
  createdAt: string;
  lastMessage?: string;
  lastMessageTime?: string;
}

// Kunci localStorage untuk daftar semua chat
const ALL_CHATS_KEY = 'shared_all_chats';

// Kunci localStorage untuk daftar semua pesan
const ALL_MESSAGES_KEY = 'shared_all_messages';

// Kunci localStorage untuk daftar chat pengguna
const getUserChatsKey = (userId: number) => `user_${userId}_chat_list`;

/**
 * Mendapatkan semua chat dari localStorage
 */
export function getAllChats(): SharedChatInfo[] {
  const chatsStr = localStorage.getItem(ALL_CHATS_KEY);
  if (chatsStr) {
    try {
      return JSON.parse(chatsStr);
    } catch (e) {
      console.error('Error parsing chats:', e);
    }
  }
  return [];
}

/**
 * Menyimpan semua chat ke localStorage
 */
export function saveAllChats(chats: SharedChatInfo[]): void {
  localStorage.setItem(ALL_CHATS_KEY, JSON.stringify(chats));
}

/**
 * Mendapatkan semua pesan dari localStorage
 */
export function getAllMessages(): SharedMessage[] {
  const messagesStr = localStorage.getItem(ALL_MESSAGES_KEY);
  if (messagesStr) {
    try {
      return JSON.parse(messagesStr);
    } catch (e) {
      console.error('Error parsing messages:', e);
    }
  }
  return [];
}

/**
 * Menyimpan semua pesan ke localStorage
 */
export function saveAllMessages(messages: SharedMessage[]): void {
  localStorage.setItem(ALL_MESSAGES_KEY, JSON.stringify(messages));
}

/**
 * Mendapatkan pesan untuk chat tertentu
 */
export function getMessagesForChat(chatId: number): SharedMessage[] {
  const allMessages = getAllMessages();
  return allMessages.filter(msg => msg.chatId === chatId);
}

/**
 * Menambahkan pesan baru
 */
export function addMessage(
  chatId: number,
  senderId: number,
  senderName: string,
  content: string
): SharedMessage {
  // Buat pesan baru
  const newMessage: SharedMessage = {
    id: Date.now(),
    chatId,
    senderId,
    senderName,
    content,
    timestamp: new Date().toISOString(),
    isRead: false
  };
  
  // Simpan pesan
  const allMessages = getAllMessages();
  allMessages.push(newMessage);
  saveAllMessages(allMessages);
  
  // Update info chat
  updateChatLastMessage(chatId, newMessage);
  
  return newMessage;
}

/**
 * Memperbarui informasi pesan terakhir di chat
 */
function updateChatLastMessage(chatId: number, message: SharedMessage): void {
  const allChats = getAllChats();
  const updatedChats = allChats.map(chat => {
    if (chat.id === chatId) {
      return {
        ...chat,
        lastMessage: message.content.length > 30 
          ? message.content.substring(0, 30) + '...' 
          : message.content,
        lastMessageTime: message.timestamp
      };
    }
    return chat;
  });
  
  saveAllChats(updatedChats);
  
  // Update juga unread count di daftar chat pengguna
  updateUserChatLists(chatId, message);
}

/**
 * Memperbarui daftar chat semua pengguna yang terlibat
 */
function updateUserChatLists(chatId: number, message: SharedMessage): void {
  const allChats = getAllChats();
  const chat = allChats.find(c => c.id === chatId);
  
  if (!chat) return;
  
  // Untuk setiap peserta di chat
  chat.participants.forEach(userId => {
    // Ambil daftar chat pengguna
    const userChatsKey = getUserChatsKey(userId);
    const userChatsStr = localStorage.getItem(userChatsKey);
    let userChats = [];
    
    if (userChatsStr) {
      try {
        userChats = JSON.parse(userChatsStr);
      } catch (e) {
        console.error(`Error parsing user chats for user ${userId}:`, e);
      }
    }
    
    // Cari chat ini dalam daftar pengguna
    let found = false;
    const updatedUserChats = userChats.map((userChat: any) => {
      if (userChat.id === chatId && userChat.isRoom === chat.isRoom) {
        found = true;
        return {
          ...userChat,
          lastMessage: message.content.length > 30 
            ? message.content.substring(0, 30) + '...' 
            : message.content,
          lastMessageTime: message.timestamp,
          // Tambahkan unread count jika bukan pengirim
          unread: userId !== message.senderId 
            ? (userChat.unread || 0) + 1 
            : userChat.unread || 0
        };
      }
      return userChat;
    });
    
    // Jika chat belum ada di daftar pengguna, tambahkan
    if (!found) {
      // Tentukan nama chat untuk pengguna ini
      let chatName = chat.name;
      if (!chat.isRoom) {
        // Untuk direct chat, tampilkan nama lawan bicara
        const otherParticipant = chat.participants.find(p => p !== userId);
        if (otherParticipant) {
          // Cari nama pengguna
          const allUsers = JSON.parse(localStorage.getItem('allUsers') || '[]');
          const otherUser = allUsers.find((u: any) => u.id === otherParticipant);
          if (otherUser) {
            chatName = otherUser.username || otherUser.nama || `User ${otherParticipant}`;
          }
        }
      }
      
      // Tambahkan chat ke daftar pengguna
      updatedUserChats.push({
        id: chatId,
        isRoom: chat.isRoom,
        name: chatName,
        otherUserId: chat.isRoom ? undefined : chat.participants.find(p => p !== userId),
        lastMessage: message.content.length > 30 
          ? message.content.substring(0, 30) + '...' 
          : message.content,
        lastMessageTime: message.timestamp,
        unread: userId !== message.senderId ? 1 : 0
      });
    }
    
    // Simpan daftar chat yang diperbarui
    localStorage.setItem(userChatsKey, JSON.stringify(updatedUserChats));
  });
}

/**
 * Menandai semua pesan sebagai telah dibaca
 */
export function markMessagesAsRead(chatId: number, userId: number): void {
  const allMessages = getAllMessages();
  let updated = false;
  
  const updatedMessages = allMessages.map(msg => {
    if (msg.chatId === chatId && !msg.isRead && msg.senderId !== userId) {
      updated = true;
      return { ...msg, isRead: true };
    }
    return msg;
  });
  
  if (updated) {
    saveAllMessages(updatedMessages);
    
    // Update unread count di daftar chat pengguna
    const userChatsKey = getUserChatsKey(userId);
    const userChatsStr = localStorage.getItem(userChatsKey);
    
    if (userChatsStr) {
      try {
        const userChats = JSON.parse(userChatsStr);
        const updatedUserChats = userChats.map((chat: any) => {
          if (chat.id === chatId) {
            return { ...chat, unread: 0 };
          }
          return chat;
        });
        
        localStorage.setItem(userChatsKey, JSON.stringify(updatedUserChats));
      } catch (e) {
        console.error('Error updating user chats:', e);
      }
    }
  }
}

/**
 * Membuat chat langsung baru antara dua pengguna
 */
export function createDirectChat(user1Id: number, user2Id: number): number {
  // Cek apakah chat sudah ada
  const allChats = getAllChats();
  const existingChat = allChats.find(chat => 
    !chat.isRoom && 
    chat.participants.length === 2 &&
    chat.participants.includes(user1Id) && 
    chat.participants.includes(user2Id)
  );
  
  if (existingChat) {
    return existingChat.id;
  }
  
  // Buat chat baru
  const chatId = Date.now();
  const newChat: SharedChatInfo = {
    id: chatId,
    isRoom: false,
    name: 'Direct Chat',
    participants: [user1Id, user2Id],
    createdAt: new Date().toISOString()
  };
  
  // Simpan chat baru
  allChats.push(newChat);
  saveAllChats(allChats);
  
  // Buat pesan sistem
  addMessage(chatId, 0, 'System', 'Secure communication established.');
  
  return chatId;
}

/**
 * Mendapatkan daftar chat untuk pengguna tertentu
 */
export function getUserChats(userId: number): any[] {
  const userChatsKey = getUserChatsKey(userId);
  const userChatsStr = localStorage.getItem(userChatsKey);
  
  if (userChatsStr) {
    try {
      return JSON.parse(userChatsStr);
    } catch (e) {
      console.error('Error parsing user chats:', e);
    }
  }
  
  // Jika tidak ada daftar chat pengguna, buat berdasarkan data global
  const allChats = getAllChats();
  const userChats = allChats
    .filter(chat => chat.participants.includes(userId))
    .map(chat => {
      // Tentukan nama chat
      let chatName = chat.name;
      let otherUserId = undefined;
      
      if (!chat.isRoom) {
        // Untuk direct chat, tampilkan nama lawan bicara
        const otherParticipant = chat.participants.find(p => p !== userId);
        if (otherParticipant) {
          otherUserId = otherParticipant;
          // Cari nama pengguna
          const allUsers = JSON.parse(localStorage.getItem('allUsers') || '[]');
          const otherUser = allUsers.find((u: any) => u.id === otherParticipant);
          if (otherUser) {
            chatName = otherUser.username || otherUser.nama || `User ${otherParticipant}`;
          }
        }
      }
      
      return {
        id: chat.id,
        isRoom: chat.isRoom,
        name: chatName,
        otherUserId,
        lastMessage: chat.lastMessage || '',
        lastMessageTime: chat.lastMessageTime || chat.createdAt,
        unread: 0
      };
    });
  
  // Simpan daftar chat pengguna
  localStorage.setItem(userChatsKey, JSON.stringify(userChats));
  
  return userChats;
}

/**
 * Membuat data chat awal jika belum ada
 */
export function initializeChats(): void {
  // Cek apakah sudah ada data chat
  if (getAllChats().length > 0) {
    return;
  }
  
  // Buat data pengguna default jika belum ada
  const defaultUsers = [
    { id: 7, username: 'Eko', nama: 'Eko', pangkat: 'Colonel', kesatuan: 'Special Forces', nrp: '1001' },
    { id: 8, username: 'David', nama: 'David', pangkat: 'Colonel', kesatuan: 'Special Forces', nrp: '1002' },
    { id: 9, username: 'Aji', nama: 'Aji', pangkat: 'Major', kesatuan: 'Communications', nrp: '1003' }
  ];
  localStorage.setItem('allUsers', JSON.stringify(defaultUsers));
  
  // Buat beberapa direct chat sebagai contoh
  // Chat Eko - Aji
  const chat1Id = createDirectChat(7, 9);
  // Chat David - Aji
  const chat2Id = createDirectChat(8, 9);
  // Chat Eko - David
  const chat3Id = createDirectChat(7, 8);
  
  // Tambahkan beberapa pesan contoh
  addMessage(chat1Id, 7, 'Eko', 'Halo Aji, status laporan?');
  addMessage(chat1Id, 9, 'Aji', 'Laporan sudah disiapkan, Pak.');
  
  addMessage(chat2Id, 8, 'David', 'Aji, persiapan operasi sudah selesai?');
  addMessage(chat2Id, 9, 'Aji', 'Siap, semua sudah siap.');
  
  addMessage(chat3Id, 7, 'Eko', 'David, jadwal briefing besok jam berapa?');
  addMessage(chat3Id, 8, 'David', 'Jam 0800, Pak.');
  
  // Buat group chat
  const groupChatId = Date.now();
  const groupChat: SharedChatInfo = {
    id: groupChatId,
    isRoom: true,
    name: 'Special Forces Team',
    participants: [7, 8, 9],
    createdAt: new Date().toISOString()
  };
  
  // Simpan group chat
  const allChats = getAllChats();
  allChats.push(groupChat);
  saveAllChats(allChats);
  
  // Tambahkan pesan di group chat
  addMessage(groupChatId, 0, 'System', 'Group chat created.');
  addMessage(groupChatId, 7, 'Eko', 'Selamat pagi semua, ada update operasi?');
  addMessage(groupChatId, 8, 'David', 'Operasi berjalan sesuai rencana, Pak.');
  addMessage(groupChatId, 9, 'Aji', 'Semua komunikasi aman terkendali.');
}