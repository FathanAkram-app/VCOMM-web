import { getAuthData } from './authUtils';

interface Chat {
  id: number;
  type: 'direct' | 'room';
  name: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  otherUserId?: number;
}

/**
 * Inisialisasi chat default antara Eko dan Aji
 * Fungsi ini akan memastikan chat antara Eko (ID: 7) dan Aji (ID: 9)
 * selalu tersedia di localStorage
 */
export const initializeDefaultChats = (): void => {
  const userData = getAuthData();
  if (!userData) return;
  
  const userId = userData.id;
  
  // Hanya berlaku untuk user Eko dan Aji
  if (userId !== 7 && userId !== 9) return;
  
  // Tentukan other user ID
  const otherUserId = userId === 7 ? 9 : 7;
  const otherName = userId === 7 ? "Aji" : "Eko";
  
  // Buat chat di localStorage
  const chatListKey = `user_chats_${userId}`;
  let chats: Chat[] = JSON.parse(localStorage.getItem(chatListKey) || '[]');
  
  // Periksa apakah chat sudah ada
  const chatExists = chats.some(c => 
    c.type === 'direct' && c.otherUserId === otherUserId
  );
  
  // Jika chat belum ada, tambahkan
  if (!chatExists) {
    const newChat: Chat = {
      id: userId === 7 ? 1001 : 2001, // ID berbeda untuk menghindari konflik
      type: 'direct',
      name: otherName,
      lastMessage: "Secure communication established.",
      lastMessageTime: new Date().toISOString(),
      unreadCount: 0,
      otherUserId
    };
    
    chats.push(newChat);
    localStorage.setItem(chatListKey, JSON.stringify(chats));
    
    // Inisialisasi pesan kosong
    const messageKey = `messages_direct_${otherUserId}`;
    if (!localStorage.getItem(messageKey)) {
      localStorage.setItem(messageKey, JSON.stringify([
        {
          id: Date.now(),
          senderId: 0, // System message
          text: 'Secure connection established',
          timestamp: new Date().toISOString(),
          isRead: true
        }
      ]));
    }
    
    console.log(`Created default chat between ${userData.username} and ${otherName}`);
  }
  
  // Tambahkan juga chat ruangan default untuk Special Forces
  const roomExists = chats.some(c => c.type === 'room' && c.id === 1);
  
  if (!roomExists) {
    const specialForcesRoom: Chat = {
      id: 1,
      type: 'room',
      name: "Special Forces Team",
      lastMessage: "Mission briefing tomorrow at 0800",
      lastMessageTime: new Date().toISOString(),
      unreadCount: 0
    };
    
    chats.push(specialForcesRoom);
    localStorage.setItem(chatListKey, JSON.stringify(chats));
    
    // Inisialisasi pesan kosong untuk room
    const roomMessagesKey = `messages_room_1`;
    if (!localStorage.getItem(roomMessagesKey)) {
      localStorage.setItem(roomMessagesKey, JSON.stringify([
        {
          id: Date.now(),
          senderId: 0, // System message
          text: 'Special Forces Team secure room created',
          timestamp: new Date().toISOString(),
          isRead: true
        }
      ]));
    }
    
    console.log(`Created default Special Forces room for ${userData.username}`);
  }
  
  // Tambahkan David sebagai kontak default juga
  const davidChatExists = chats.some(c => 
    c.type === 'direct' && c.otherUserId === 8
  );
  
  if (!davidChatExists) {
    const davidChat: Chat = {
      id: userId === 7 ? 1002 : 2002,
      type: 'direct',
      name: "David",
      lastMessage: "Persiapan untuk operasi besok sudah selesai?",
      lastMessageTime: new Date().toISOString(),
      unreadCount: 0,
      otherUserId: 8
    };
    
    chats.push(davidChat);
    localStorage.setItem(chatListKey, JSON.stringify(chats));
    
    // Inisialisasi pesan kosong
    const davidMessageKey = `messages_direct_8`;
    if (!localStorage.getItem(davidMessageKey)) {
      localStorage.setItem(davidMessageKey, JSON.stringify([
        {
          id: Date.now(),
          senderId: 0, // System message
          text: 'Secure connection established with David',
          timestamp: new Date().toISOString(),
          isRead: true
        }
      ]));
    }
    
    console.log(`Created default chat between ${userData.username} and David`);
  }
};

/**
 * Mendapatkan daftar chat dari localStorage dan menambahkan chat default
 * jika daftar kosong
 */
export const getFixedChats = (): Chat[] => {
  const userData = getAuthData();
  if (!userData) return [];
  
  // Jalankan inisialisasi untuk memastikan chat default ada
  initializeDefaultChats();
  
  // Ambil daftar chat yang sudah ada (termasuk yang baru ditambahkan)
  const chatListKey = `user_chats_${userData.id}`;
  let chats: Chat[] = JSON.parse(localStorage.getItem(chatListKey) || '[]');
  
  // Jika masih kosong juga, buat hardcoded list
  if (chats.length === 0) {
    if (userData.id === 7 || userData.id === 9) {
      // Untuk user Eko dan Aji
      const otherUserId = userData.id === 7 ? 9 : 7;
      const otherName = userData.id === 7 ? "Aji" : "Eko";
      
      chats = [
        {
          id: 1,
          type: 'room',
          name: "Special Forces Team",
          lastMessage: "Mission briefing tomorrow at 0800",
          lastMessageTime: new Date().toISOString(),
          unreadCount: 2
        },
        {
          id: userData.id === 7 ? 1001 : 2001,
          type: 'direct',
          name: otherName,
          lastMessage: "Secure communication established.",
          lastMessageTime: new Date().toISOString(),
          unreadCount: 1,
          otherUserId
        },
        {
          id: userData.id === 7 ? 1002 : 2002,
          type: 'direct',
          name: "David",
          lastMessage: "Persiapan untuk operasi besok sudah selesai?",
          lastMessageTime: new Date().toISOString(),
          unreadCount: 0,
          otherUserId: 8
        }
      ];
      
      // Simpan chat-chat ini ke localStorage
      localStorage.setItem(chatListKey, JSON.stringify(chats));
    }
  }
  
  return chats;
};