/**
 * localChatStorage.ts
 * Sistem penyimpanan chat lokal yang memungkinkan pesan-pesan dapat
 * dibagikan antar pengguna meskipun tidak terhubung ke server
 */

// Interface untuk pesan chat
export interface LocalChatMessage {
  id: number;
  senderId: number;
  sender: string;
  text: string;
  timestamp: string;
  isRead: boolean;
}

// Interface untuk item chat
export interface LocalChatItem {
  id: number;
  isRoom: boolean;
  name: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unread?: number;
  otherUserId?: number;
}

// Kunci untuk menyimpan pesan chat di localStorage
const getChatMessagesKey = (chatId: number, isRoom: boolean) => 
  `chat_messages_${isRoom ? 'room' : 'direct'}_${chatId}`;

// Kunci untuk menyimpan daftar chat pengguna
const getUserChatsKey = (userId: number) => 
  `user_${userId}_chats`;

// Kunci untuk menyimpan daftar pesanan pengguna
const getAllUsersKey = () => 'all_users';

// Mengambil semua pengguna dari storage
export function getAllUsers(): any[] {
  try {
    const usersStr = localStorage.getItem(getAllUsersKey());
    if (usersStr) {
      return JSON.parse(usersStr);
    }
  } catch (e) {
    console.error('Error loading users:', e);
  }
  return [];
}

// Menyimpan semua pengguna ke storage
export function saveAllUsers(users: any[]): void {
  try {
    localStorage.setItem(getAllUsersKey(), JSON.stringify(users));
  } catch (e) {
    console.error('Error saving users:', e);
  }
}

// Mendapatkan pesan-pesan untuk sebuah chat
export function getChatMessages(chatId: number, isRoom: boolean): LocalChatMessage[] {
  try {
    const messagesKey = getChatMessagesKey(chatId, isRoom);
    const messagesStr = localStorage.getItem(messagesKey);
    
    if (messagesStr) {
      return JSON.parse(messagesStr);
    }
  } catch (e) {
    console.error(`Error loading messages for chat ${chatId}:`, e);
  }
  
  return [];
}

// Menyimpan pesan-pesan untuk sebuah chat
export function saveChatMessages(chatId: number, isRoom: boolean, messages: LocalChatMessage[]): void {
  try {
    const messagesKey = getChatMessagesKey(chatId, isRoom);
    localStorage.setItem(messagesKey, JSON.stringify(messages));
  } catch (e) {
    console.error(`Error saving messages for chat ${chatId}:`, e);
  }
}

// Menambahkan pesan baru ke chat
export function addChatMessage(chatId: number, isRoom: boolean, message: LocalChatMessage): void {
  try {
    // Ambil pesan yang ada
    const existingMessages = getChatMessages(chatId, isRoom);
    
    // Tambahkan pesan baru
    existingMessages.push(message);
    
    // Simpan kembali
    saveChatMessages(chatId, isRoom, existingMessages);
    
    // Jika chat bukan room, perbarui untuk kedua belah pihak
    if (!isRoom) {
      // Perbarui chat list untuk pengirim
      updateChatListItem(message.senderId, chatId, isRoom, message);
      
      // Tentukan otherUserId
      const chatList = getUserChats(message.senderId);
      const thisChat = chatList.find(c => c.id === chatId && c.isRoom === isRoom);
      
      if (thisChat && thisChat.otherUserId) {
        // Perbarui chat list untuk penerima
        updateChatListItem(thisChat.otherUserId, chatId, isRoom, message);
      }
    }
    
    console.log(`Message added to chat ${chatId} (${isRoom ? 'room' : 'direct'})`);
  } catch (e) {
    console.error(`Error adding message to chat ${chatId}:`, e);
  }
}

// Mendapatkan daftar chat untuk seorang pengguna
export function getUserChats(userId: number): LocalChatItem[] {
  try {
    const chatsKey = getUserChatsKey(userId);
    const chatsStr = localStorage.getItem(chatsKey);
    
    if (chatsStr) {
      return JSON.parse(chatsStr);
    }
  } catch (e) {
    console.error(`Error loading chats for user ${userId}:`, e);
  }
  
  return [];
}

// Menyimpan daftar chat untuk seorang pengguna
export function saveUserChats(userId: number, chats: LocalChatItem[]): void {
  try {
    const chatsKey = getUserChatsKey(userId);
    localStorage.setItem(chatsKey, JSON.stringify(chats));
  } catch (e) {
    console.error(`Error saving chats for user ${userId}:`, e);
  }
}

// Memperbarui item chat dalam daftar chat pengguna
function updateChatListItem(userId: number, chatId: number, isRoom: boolean, message: LocalChatMessage): void {
  try {
    // Ambil daftar chat pengguna
    const chatList = getUserChats(userId);
    
    // Temukan chat yang sesuai
    const chatIndex = chatList.findIndex(c => c.id === chatId && c.isRoom === isRoom);
    
    if (chatIndex >= 0) {
      // Perbarui chat yang ada
      chatList[chatIndex] = {
        ...chatList[chatIndex],
        lastMessage: message.text.length > 30 
          ? message.text.substring(0, 30) + '...' 
          : message.text,
        lastMessageTime: message.timestamp,
        // Tambahkan unread count jika pesan dari orang lain
        unread: userId !== message.senderId 
          ? (chatList[chatIndex].unread || 0) + 1 
          : chatList[chatIndex].unread || 0
      };
    } else {
      // Jika chat belum ada, cari info dari daftar pengguna
      const allUsers = getAllUsers();
      let otherUser;
      
      if (userId !== message.senderId) {
        // User ini adalah penerima, sender adalah other user
        otherUser = allUsers.find(u => u.id === message.senderId);
      } else {
        // Untuk sender, kita tidak tahu penerima dari pesan saja, jadi gunakan default
        otherUser = { id: 0, username: 'Unknown' };
      }
      
      // Buat chat baru
      if (otherUser) {
        chatList.push({
          id: chatId,
          isRoom: isRoom,
          name: otherUser.username || `User ${otherUser.id}`,
          lastMessage: message.text.length > 30 
            ? message.text.substring(0, 30) + '...' 
            : message.text,
          lastMessageTime: message.timestamp,
          unread: userId !== message.senderId ? 1 : 0,
          otherUserId: otherUser.id
        });
      }
    }
    
    // Simpan kembali daftar chat
    saveUserChats(userId, chatList);
    console.log(`Chat list updated for user ${userId}`);
  } catch (e) {
    console.error(`Error updating chat list for user ${userId}:`, e);
  }
}

// Membuat chat langsung baru antar dua pengguna
export function createLocalDirectChat(user1Id: number, user2Id: number): number {
  try {
    const allUsers = getAllUsers();
    const user1 = allUsers.find(u => u.id === user1Id);
    const user2 = allUsers.find(u => u.id === user2Id);
    
    if (!user1 || !user2) {
      console.error('Cannot create chat: users not found');
      return -1;
    }
    
    // Gunakan timestamp sebagai ID unik
    const chatId = Date.now();
    
    // Buat pesan awal sistem
    const initialMessage: LocalChatMessage = {
      id: Date.now(),
      senderId: 0, // ID 0 untuk sistem
      sender: 'System',
      text: 'Secure communication established.',
      timestamp: new Date().toISOString(),
      isRead: true
    };
    
    // Simpan pesan
    saveChatMessages(chatId, false, [initialMessage]);
    
    // Tambahkan ke daftar chat pengguna 1
    const user1Chats = getUserChats(user1Id);
    user1Chats.push({
      id: chatId,
      isRoom: false,
      name: user2.username || `User ${user2.id}`,
      lastMessage: initialMessage.text,
      lastMessageTime: initialMessage.timestamp,
      unread: 0,
      otherUserId: user2Id
    });
    saveUserChats(user1Id, user1Chats);
    
    // Tambahkan ke daftar chat pengguna 2
    const user2Chats = getUserChats(user2Id);
    user2Chats.push({
      id: chatId,
      isRoom: false,
      name: user1.username || `User ${user1.id}`,
      lastMessage: initialMessage.text,
      lastMessageTime: initialMessage.timestamp,
      unread: 0,
      otherUserId: user1Id
    });
    saveUserChats(user2Id, user2Chats);
    
    console.log(`Direct chat created between users ${user1Id} and ${user2Id} with ID ${chatId}`);
    return chatId;
  } catch (e) {
    console.error('Error creating direct chat:', e);
    return -1;
  }
}

// Membuat chat default jika tidak ada chat
export function ensureDefaultChats(userId: number): void {
  try {
    const userChats = getUserChats(userId);
    
    // Jika belum ada chat, buat default chat dengan Eko (ID 7) dan David (ID 8)
    if (userChats.length === 0) {
      console.log(`Creating default chats for user ${userId}`);
      const allUsers = getAllUsers();
      
      // Buat chat dengan Eko jika user bukan Eko
      if (userId !== 7) {
        const eko = allUsers.find(u => u.id === 7);
        if (eko) {
          const chatId = createLocalDirectChat(userId, 7);
          console.log(`Created default chat with Eko, chatId: ${chatId}`);
        }
      }
      
      // Buat chat dengan David jika user bukan David
      if (userId !== 8) {
        const david = allUsers.find(u => u.id === 8);
        if (david) {
          const chatId = createLocalDirectChat(userId, 8);
          console.log(`Created default chat with David, chatId: ${chatId}`);
        }
      }
    }
  } catch (e) {
    console.error(`Error ensuring default chats for user ${userId}:`, e);
  }
}

// Memastikan ada setidaknya data pengguna
export function ensureUsers(): void {
  try {
    let allUsers = getAllUsers();
    
    // Jika tidak ada data pengguna, buat default
    if (allUsers.length === 0) {
      console.log('Creating default users');
      allUsers = [
        { id: 7, username: 'Eko', nama: 'Eko', pangkat: 'Colonel', kesatuan: 'Special Forces', nrp: '1001' },
        { id: 8, username: 'David', nama: 'David', pangkat: 'Colonel', kesatuan: 'Special Forces', nrp: '1002' },
        { id: 9, username: 'Aji', nama: 'Aji', pangkat: 'Major', kesatuan: 'Communications', nrp: '1003' }
      ];
      saveAllUsers(allUsers);
    }
  } catch (e) {
    console.error('Error ensuring users:', e);
  }
}