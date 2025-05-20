/**
 * chatStorage.js - Fungsi-fungsi untuk menyimpan dan mengelola chat
 * 
 * File ini menyediakan fungsi sederhana untuk menyimpan dan mengambil data chat
 * dari localStorage. Data chat disimpan secara bersama sehingga bisa diakses
 * oleh semua pengguna.
 */

// Kunci untuk menyimpan daftar semua chat
const ALL_CHATS_KEY = 'all_chats';

// Kunci untuk menyimpan daftar semua pesan
const ALL_MESSAGES_KEY = 'all_messages';

// Kunci untuk daftar chat pengguna tertentu
const getUserChatsKey = (userId) => `user_${userId}_chats`;

/**
 * Mendapatkan semua chat
 */
export function getAllChats() {
  try {
    const chatsStr = localStorage.getItem(ALL_CHATS_KEY);
    if (chatsStr) {
      return JSON.parse(chatsStr);
    }
  } catch (error) {
    console.error('Error getting all chats:', error);
  }
  return [];
}

/**
 * Menyimpan semua chat
 */
export function saveAllChats(chats) {
  try {
    localStorage.setItem(ALL_CHATS_KEY, JSON.stringify(chats));
  } catch (error) {
    console.error('Error saving all chats:', error);
  }
}

/**
 * Mendapatkan semua pesan
 */
export function getAllMessages() {
  try {
    const messagesStr = localStorage.getItem(ALL_MESSAGES_KEY);
    if (messagesStr) {
      return JSON.parse(messagesStr);
    }
  } catch (error) {
    console.error('Error getting all messages:', error);
  }
  return [];
}

/**
 * Menyimpan semua pesan
 */
export function saveAllMessages(messages) {
  try {
    localStorage.setItem(ALL_MESSAGES_KEY, JSON.stringify(messages));
  } catch (error) {
    console.error('Error saving all messages:', error);
  }
}

/**
 * Mendapatkan daftar chat untuk pengguna tertentu
 */
export function getUserChats(userId) {
  try {
    // Ambil daftar chat global
    const allChats = getAllChats();
    
    // Filter chat yang melibatkan pengguna ini
    const userChats = allChats.filter(chat => {
      if (chat.isGroup) {
        return chat.participants.includes(userId);
      } else {
        return chat.user1Id === userId || chat.user2Id === userId;
      }
    });
    
    // Hitung unread untuk setiap chat
    const userChatsWithUnread = userChats.map(chat => {
      // Ambil pesan untuk chat ini
      const chatMessages = getAllMessages().filter(msg => msg.chatId === chat.id);
      
      // Hitung pesan yang belum dibaca (yang bukan dari pengguna ini dan belum dibaca)
      const unread = chatMessages.filter(msg => 
        msg.senderId !== userId && 
        !msg.readBy.includes(userId)
      ).length;
      
      // Tentukan pesan terakhir
      let lastMessage = '';
      let lastMessageTime = '';
      
      if (chatMessages.length > 0) {
        // Urutkan pesan dari yang terbaru
        chatMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        lastMessage = chatMessages[0].text;
        lastMessageTime = chatMessages[0].timestamp;
      }
      
      // Tentukan nama chat untuk direct chat
      let chatName = chat.name;
      let otherUserId = null;
      
      if (!chat.isGroup) {
        otherUserId = chat.user1Id === userId ? chat.user2Id : chat.user1Id;
        const users = JSON.parse(localStorage.getItem('all_users') || '[]');
        const otherUser = users.find(u => u.id === otherUserId);
        
        if (otherUser) {
          chatName = otherUser.username || `User ${otherUserId}`;
        }
      }
      
      // Return chat dengan info tambahan
      return {
        ...chat,
        otherUserId,
        name: chatName,
        lastMessage,
        lastMessageTime,
        unread
      };
    });
    
    // Urutkan: chat dengan pesan terbaru di atas
    userChatsWithUnread.sort((a, b) => {
      if (!a.lastMessageTime) return 1;
      if (!b.lastMessageTime) return -1;
      return new Date(b.lastMessageTime) - new Date(a.lastMessageTime);
    });
    
    return userChatsWithUnread;
  } catch (error) {
    console.error('Error getting user chats:', error);
    return [];
  }
}

/**
 * Mendapatkan pesan untuk chat tertentu
 */
export function getChatMessages(chatId) {
  try {
    const allMessages = getAllMessages();
    return allMessages
      .filter(msg => msg.chatId === chatId)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  } catch (error) {
    console.error('Error getting chat messages:', error);
    return [];
  }
}

/**
 * Membuat pesan baru
 */
export function createMessage(chatId, senderId, text) {
  try {
    // Ambil semua pesan
    const allMessages = getAllMessages();
    
    // Buat pesan baru
    const newMessage = {
      id: Date.now(),
      chatId,
      senderId,
      text,
      timestamp: new Date().toISOString(),
      readBy: [senderId] // Pengirim sudah membaca pesannya sendiri
    };
    
    // Tambahkan ke daftar pesan
    allMessages.push(newMessage);
    
    // Simpan kembali
    saveAllMessages(allMessages);
    
    return newMessage;
  } catch (error) {
    console.error('Error creating message:', error);
    return null;
  }
}

/**
 * Menandai pesan sebagai telah dibaca
 */
export function markChatAsRead(chatId, userId) {
  try {
    const allMessages = getAllMessages();
    let updated = false;
    
    // Perbarui status baca untuk setiap pesan di chat ini
    const updatedMessages = allMessages.map(msg => {
      if (msg.chatId === chatId && !msg.readBy.includes(userId)) {
        updated = true;
        return {
          ...msg,
          readBy: [...msg.readBy, userId]
        };
      }
      return msg;
    });
    
    // Simpan jika ada perubahan
    if (updated) {
      saveAllMessages(updatedMessages);
    }
    
    return updated;
  } catch (error) {
    console.error('Error marking chat as read:', error);
    return false;
  }
}

/**
 * Membuat chat langsung baru
 */
export function createDirectChat(user1Id, user2Id) {
  try {
    // Cek apakah chat sudah ada
    const allChats = getAllChats();
    const existingChat = allChats.find(chat => 
      !chat.isGroup && 
      ((chat.user1Id === user1Id && chat.user2Id === user2Id) ||
       (chat.user1Id === user2Id && chat.user2Id === user1Id))
    );
    
    if (existingChat) {
      return existingChat;
    }
    
    // Ambil info pengguna
    const users = JSON.parse(localStorage.getItem('all_users') || '[]');
    const user1 = users.find(u => u.id === user1Id);
    const user2 = users.find(u => u.id === user2Id);
    
    // Buat chat baru
    const newChat = {
      id: Date.now(),
      isGroup: false,
      user1Id,
      user2Id,
      name: "", // Akan diisi berdasarkan lawan bicara
      createdAt: new Date().toISOString()
    };
    
    // Tambahkan ke daftar chat
    allChats.push(newChat);
    saveAllChats(allChats);
    
    // Buat pesan sistem
    createMessage(newChat.id, 0, "Secure communication established.");
    
    return newChat;
  } catch (error) {
    console.error('Error creating direct chat:', error);
    return null;
  }
}

/**
 * Membuat chat group
 */
export function createGroupChat(name, participantIds) {
  try {
    // Buat chat baru
    const newChat = {
      id: Date.now(),
      isGroup: true,
      name,
      participants: participantIds,
      createdAt: new Date().toISOString()
    };
    
    // Tambahkan ke daftar chat
    const allChats = getAllChats();
    allChats.push(newChat);
    saveAllChats(allChats);
    
    // Buat pesan sistem
    createMessage(newChat.id, 0, "Group chat created.");
    
    return newChat;
  } catch (error) {
    console.error('Error creating group chat:', error);
    return null;
  }
}

/**
 * Inisialisasi data awal jika belum ada
 */
export function initializeData() {
  try {
    // Cek apakah sudah ada data
    if (getAllChats().length > 0 && getAllMessages().length > 0) {
      return;
    }
    
    console.log('Initializing chat data...');
    
    // Buat data pengguna jika belum ada
    const existingUsers = JSON.parse(localStorage.getItem('all_users') || '[]');
    if (existingUsers.length === 0) {
      const defaultUsers = [
        { id: 7, username: 'Eko', pangkat: 'Colonel', kesatuan: 'Special Forces', nrp: '1001' },
        { id: 8, username: 'David', pangkat: 'Colonel', kesatuan: 'Special Forces', nrp: '1002' },
        { id: 9, username: 'Aji', pangkat: 'Major', kesatuan: 'Communications', nrp: '1003' }
      ];
      localStorage.setItem('all_users', JSON.stringify(defaultUsers));
    }
    
    // Buat beberapa chat contoh
    
    // Chat Eko-David
    const chat1 = createDirectChat(7, 8);
    createMessage(chat1.id, 7, "Halo David, jadwal briefing besok jam berapa?");
    createMessage(chat1.id, 8, "Jam 0800, Pak.");
    
    // Chat Eko-Aji
    const chat2 = createDirectChat(7, 9);
    createMessage(chat2.id, 7, "Aji, sudah siapkan laporan?");
    createMessage(chat2.id, 9, "Sudah, Pak. Akan saya kirimkan sekarang.");
    
    // Chat David-Aji
    const chat3 = createDirectChat(8, 9);
    createMessage(chat3.id, 8, "Aji, equipment sudah disiapkan?");
    createMessage(chat3.id, 9, "Siap, semua sudah lengkap.");
    
    // Group chat
    const groupChat = createGroupChat("Special Forces Team", [7, 8, 9]);
    createMessage(groupChat.id, 7, "Selamat pagi semua, persiapan operasi sudah selesai?");
    createMessage(groupChat.id, 8, "Siap, semua sudah siap.");
    createMessage(groupChat.id, 9, "Komunikasi sudah disiapkan, Pak.");
    
    console.log('Chat data initialized successfully.');
  } catch (error) {
    console.error('Error initializing data:', error);
  }
}