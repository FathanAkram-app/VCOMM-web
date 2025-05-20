// SimplifiedChat.js - Implementasi sederhana tanpa React hooks

// Prefix untuk localStorage
const STORAGE_PREFIX = 'milcomm_';

// Kunci untuk penyimpanan data
const USERS_KEY = `${STORAGE_PREFIX}users`;
const CHATS_KEY = `${STORAGE_PREFIX}chats`;
const MESSAGES_KEY = `${STORAGE_PREFIX}messages`;

// Fungsi inisialisasi
export function initializeChatData() {
  console.log("Initializing chat data");
  
  // Buat data pengguna jika belum ada
  if (!localStorage.getItem(USERS_KEY)) {
    const defaultUsers = [
      { id: 7, username: 'Eko', pangkat: 'Colonel', kesatuan: 'Special Forces' },
      { id: 8, username: 'David', pangkat: 'Colonel', kesatuan: 'Special Forces' },
      { id: 9, username: 'Aji', pangkat: 'Major', kesatuan: 'Communications' }
    ];
    localStorage.setItem(USERS_KEY, JSON.stringify(defaultUsers));
  }
  
  // Buat data chat jika belum ada
  if (!localStorage.getItem(CHATS_KEY)) {
    const defaultChats = [
      {
        id: 1001,
        type: 'group',
        name: 'Special Forces Team',
        participants: [7, 8, 9],
        createdAt: new Date().toISOString()
      },
      {
        id: 1002,
        type: 'direct',
        user1Id: 7, // Eko
        user2Id: 9, // Aji
        createdAt: new Date(Date.now() - 3600000).toISOString() // 1 jam yang lalu
      },
      {
        id: 1003,
        type: 'direct',
        user1Id: 8, // David
        user2Id: 9, // Aji
        createdAt: new Date(Date.now() - 7200000).toISOString() // 2 jam yang lalu
      }
    ];
    localStorage.setItem(CHATS_KEY, JSON.stringify(defaultChats));
  }
  
  // Buat data pesan jika belum ada
  if (!localStorage.getItem(MESSAGES_KEY)) {
    const defaultMessages = [
      // Pesan grup
      {
        id: 2001,
        chatId: 1001,
        senderId: 0, // Sistem
        sender: 'System',
        content: 'Group chat created',
        timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 hari yang lalu
        isRead: true
      },
      {
        id: 2002,
        chatId: 1001,
        senderId: 7, // Eko
        sender: 'Eko',
        content: 'Mission briefing tomorrow at 0800',
        timestamp: new Date(Date.now() - 43200000).toISOString(), // 12 jam yang lalu
        isRead: true
      },
      {
        id: 2003,
        chatId: 1001,
        senderId: 8, // David
        sender: 'David',
        content: 'Roger that',
        timestamp: new Date(Date.now() - 40000000).toISOString(),
        isRead: true
      },
      
      // Chat Eko-Aji
      {
        id: 2004,
        chatId: 1002,
        senderId: 0, // Sistem
        sender: 'System',
        content: 'Secure communication established',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        isRead: true
      },
      {
        id: 2005,
        chatId: 1002,
        senderId: 7, // Eko
        sender: 'Eko',
        content: 'Aji, status laporan?',
        timestamp: new Date(Date.now() - 3500000).toISOString(),
        isRead: true
      },
      {
        id: 2006,
        chatId: 1002,
        senderId: 9, // Aji
        sender: 'Aji',
        content: 'Siap, laporan sudah disiapkan Pak',
        timestamp: new Date(Date.now() - 3400000).toISOString(),
        isRead: true
      },
      
      // Chat David-Aji
      {
        id: 2007,
        chatId: 1003,
        senderId: 0, // Sistem
        sender: 'System',
        content: 'Secure communication established',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        isRead: true
      },
      {
        id: 2008,
        chatId: 1003,
        senderId: 8, // David
        sender: 'David',
        content: 'Persiapan untuk operasi besok sudah selesai?',
        timestamp: new Date(Date.now() - 7100000).toISOString(),
        isRead: true
      },
      {
        id: 2009,
        chatId: 1003,
        senderId: 9, // Aji
        sender: 'Aji',
        content: 'Siap Pak, semua equipment sudah disiapkan',
        timestamp: new Date(Date.now() - 7000000).toISOString(),
        isRead: true
      }
    ];
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(defaultMessages));
  }
  
  console.log("Chat data initialized");
}

// Dapatkan pengguna berdasarkan ID
export function getUserById(userId) {
  try {
    const allUsers = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    return allUsers.find(u => u.id === userId);
  } catch (error) {
    console.error('Error getting user by ID:', error);
    return null;
  }
}

// Fungsi untuk mendapatkan daftar chat
export function getChatList(currentUserId) {
  if (!currentUserId) {
    console.error("No user ID provided");
    return [];
  }
  
  try {
    // Ambil semua chat
    const chats = JSON.parse(localStorage.getItem(CHATS_KEY) || '[]');
    console.log("All chats:", chats);
    
    // Filter chat untuk pengguna saat ini
    const userChats = chats.filter(chat => {
      if (chat.type === 'group') {
        return chat.participants && chat.participants.includes(currentUserId);
      } else {
        return chat.user1Id === currentUserId || chat.user2Id === currentUserId;
      }
    });
    console.log("User chats:", userChats);
    
    // Ambil semua pesan
    const allMessages = JSON.parse(localStorage.getItem(MESSAGES_KEY) || '[]');
    
    // Proses setiap chat
    const processedChats = userChats.map(chat => {
      let displayName = chat.name || '';
      let otherUserId = null;
      
      if (chat.type === 'direct') {
        // Untuk chat langsung, dapatkan info pengguna lain
        otherUserId = chat.user1Id === currentUserId ? chat.user2Id : chat.user1Id;
        const otherUser = getUserById(otherUserId);
        
        if (otherUser) {
          displayName = otherUser.username;
        } else {
          displayName = `User ${otherUserId}`;
        }
      }
      
      // Dapatkan pesan untuk chat ini
      const chatMessages = allMessages.filter(msg => msg.chatId === chat.id);
      
      // Urutkan berdasarkan timestamp (terbaru dulu)
      chatMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      // Dapatkan pesan terakhir
      const lastMessage = chatMessages.length > 0 ? chatMessages[0] : null;
      
      // Hitung pesan yang belum dibaca
      const unreadCount = chatMessages.filter(msg => 
        !msg.isRead && msg.senderId !== currentUserId
      ).length;
      
      return {
        ...chat,
        displayName,
        otherUserId,
        lastMessage: lastMessage ? lastMessage.content : '',
        lastMessageTime: lastMessage ? lastMessage.timestamp : chat.createdAt,
        unreadCount
      };
    });
    
    // Urutkan berdasarkan pesan terbaru
    processedChats.sort((a, b) => {
      const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
      const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
      return timeB - timeA;
    });
    
    console.log("Processed chats:", processedChats);
    return processedChats;
  } catch (error) {
    console.error('Error getting chat list:', error);
    return [];
  }
}

// Fungsi untuk mendapatkan pesan dari chat
export function getChatMessages(chatId) {
  if (!chatId) {
    console.error("No chat ID provided");
    return [];
  }
  
  try {
    const allMessages = JSON.parse(localStorage.getItem(MESSAGES_KEY) || '[]');
    
    // Filter untuk chat ini
    const chatMessages = allMessages.filter(msg => msg.chatId === chatId);
    
    // Urutkan berdasarkan timestamp (terlama dulu)
    chatMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    return chatMessages;
  } catch (error) {
    console.error('Error getting chat messages:', error);
    return [];
  }
}

// Fungsi untuk menandai pesan sebagai dibaca
export function markMessagesAsRead(chatId, currentUserId) {
  if (!chatId || !currentUserId) {
    console.error("Missing chat ID or user ID");
    return;
  }
  
  try {
    const allMessages = JSON.parse(localStorage.getItem(MESSAGES_KEY) || '[]');
    let updated = false;
    
    // Tandai pesan dari orang lain sebagai dibaca
    const updatedMessages = allMessages.map(msg => {
      if (msg.chatId === chatId && msg.senderId !== currentUserId && !msg.isRead) {
        updated = true;
        return { ...msg, isRead: true };
      }
      return msg;
    });
    
    // Simpan jika diperbarui
    if (updated) {
      localStorage.setItem(MESSAGES_KEY, JSON.stringify(updatedMessages));
      console.log("Messages marked as read");
    }
  } catch (error) {
    console.error('Error marking messages as read:', error);
  }
}

// Fungsi untuk mengirim pesan
export function sendMessage(chatId, senderId, senderName, content) {
  if (!chatId || !senderId || !content.trim()) {
    console.error("Missing required data for sending message");
    return null;
  }
  
  try {
    const allMessages = JSON.parse(localStorage.getItem(MESSAGES_KEY) || '[]');
    
    // Buat pesan baru
    const newMsg = {
      id: Date.now(),
      chatId: chatId,
      senderId: senderId,
      sender: senderName,
      content: content.trim(),
      timestamp: new Date().toISOString(),
      isRead: false
    };
    
    // Tambahkan ke pesan
    allMessages.push(newMsg);
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(allMessages));
    
    console.log("Message sent:", newMsg);
    return newMsg;
  } catch (error) {
    console.error('Error sending message:', error);
    return null;
  }
}

// Fungsi untuk mendapatkan chat berdasarkan ID
export function getChatById(chatId) {
  if (!chatId) {
    console.error("No chat ID provided");
    return null;
  }
  
  try {
    const chats = JSON.parse(localStorage.getItem(CHATS_KEY) || '[]');
    return chats.find(c => c.id === chatId) || null;
  } catch (error) {
    console.error('Error getting chat by ID:', error);
    return null;
  }
}

// Fungsi untuk membuat respons otomatis
export function createAutoResponse(chatId, responderId) {
  if (!chatId || !responderId) {
    console.error("Missing required data for auto response");
    return;
  }
  
  try {
    const responder = getUserById(responderId);
    if (!responder) {
      console.error("Responder not found");
      return;
    }
    
    // Opsi respons
    const responses = [
      'Siap, laksanakan!',
      'Perintah diterima.',
      'Roger that.',
      'Akan segera dilaksanakan.',
      'Copy that, standing by.',
      'Mengerti, Pak.',
      'Affirmative.',
      'Sedang diproses saat ini.'
    ];
    
    // Pilih respons acak
    const responseContent = responses[Math.floor(Math.random() * responses.length)];
    
    // Kirim respons
    sendMessage(
      chatId, 
      responderId, 
      responder.username, 
      responseContent
    );
    
  } catch (error) {
    console.error('Error creating auto response:', error);
  }
}

// Fungsi untuk membuat chat direct baru
export function createDirectChat(currentUserId, otherUserId) {
  if (!currentUserId || !otherUserId) {
    console.error("Missing user IDs");
    return null;
  }
  
  try {
    // Periksa apakah chat sudah ada
    const allChats = JSON.parse(localStorage.getItem(CHATS_KEY) || '[]');
    
    const existingChat = allChats.find(chat => 
      chat.type === 'direct' && 
      ((chat.user1Id === currentUserId && chat.user2Id === otherUserId) ||
       (chat.user1Id === otherUserId && chat.user2Id === currentUserId))
    );
    
    if (existingChat) {
      console.log("Chat already exists:", existingChat);
      return existingChat;
    }
    
    // Buat chat baru
    const newChatId = Date.now();
    const newChat = {
      id: newChatId,
      type: 'direct',
      user1Id: currentUserId,
      user2Id: otherUserId,
      createdAt: new Date().toISOString()
    };
    
    // Simpan chat
    allChats.push(newChat);
    localStorage.setItem(CHATS_KEY, JSON.stringify(allChats));
    
    // Buat pesan sistem awal
    sendMessage(
      newChatId,
      0, // System
      'System',
      'Secure communication established'
    );
    
    console.log("New chat created:", newChat);
    return newChat;
  } catch (error) {
    console.error('Error creating direct chat:', error);
    return null;
  }
}

// Fungsi untuk mendapatkan daftar pengguna
export function getAllUsers(exceptUserId = null) {
  try {
    const allUsers = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    
    if (exceptUserId) {
      return allUsers.filter(u => u.id !== exceptUserId);
    }
    
    return allUsers;
  } catch (error) {
    console.error('Error getting all users:', error);
    return [];
  }
}

// Fungsi untuk format waktu chat
export function formatChatTime(timestamp) {
  try {
    const date = new Date(timestamp);
    const now = new Date();
    
    // Hari ini, tampilkan waktu
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Kemarin, tampilkan "Kemarin"
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Kemarin';
    }
    
    // Dalam satu minggu, tampilkan nama hari
    const dayDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (dayDiff < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    
    // Lebih lama, tampilkan tanggal
    return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
  } catch (error) {
    console.error('Error formatting chat time:', error);
    return '';
  }
}

// Fungsi untuk format waktu pesan
export function formatMessageTime(timestamp) {
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (error) {
    console.error('Error formatting message time:', error);
    return '';
  }
}

// Render fungsi untuk komponen chat
// Ini hanya framework, implementasi akan dilakukan langsung di komponen UI