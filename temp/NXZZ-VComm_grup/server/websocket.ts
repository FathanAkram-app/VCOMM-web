import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { storage } from './storage';

// Struktur client websocket
interface WebSocketClient {
  userId: number;
  socket: WebSocket;
  lastHeartbeat: number;
}

// Simpan daftar client yang terhubung
const clients: WebSocketClient[] = [];

// Setup WebSocket server
export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({
    server,
    path: '/ws/chat',
    perMessageDeflate: false,
    clientTracking: true
  });
  
  console.log('🚀 WebSocket server chat baru diinisialisasi di /ws/chat');
  
  // Periksa koneksi klien setiap 30 detik
  setInterval(() => {
    const now = Date.now();
    const timeoutDuration = 70 * 1000; // 70 detik
    
    // Hapus klien yang tidak aktif
    const expiredClients = clients.filter(client => now - client.lastHeartbeat > timeoutDuration);
    
    for (const client of expiredClients) {
      const index = clients.indexOf(client);
      if (index !== -1) {
        clients.splice(index, 1);
        console.log(`👋 Memutuskan klien tidak aktif untuk user ${client.userId}`);
        
        // Update status online
        storage.updateUserOnlineStatus(client.userId, false).catch(err => {
          console.error(`❌ Gagal update status offline untuk user ${client.userId}:`, err);
        });
      }
    }
    
    // Kirim heartbeat ke klien yang tersisa
    for (const client of clients) {
      try {
        if (client.socket.readyState === WebSocket.OPEN) {
          client.socket.send(JSON.stringify({ type: 'ping', timestamp: now }));
        }
      } catch (error) {
        console.error(`❌ Error mengirim ping ke user ${client.userId}:`, error);
      }
    }
    
    console.log(`ℹ️ Status koneksi: ${clients.length} klien terhubung`);
  }, 30000);
  
  // Handle koneksi baru
  wss.on('connection', (ws, req) => {
    console.log(`🔌 Koneksi WebSocket baru dari ${req.socket.remoteAddress}`);
    
    // Ekstrak userId dari parameter URL
    const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    const userId = parseInt(url.searchParams.get('userId') || '0');
    
    if (!userId) {
      console.log('❌ Koneksi WebSocket ditolak: userId tidak disediakan');
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Authentication required. Provide userId in URL parameters.',
        code: 'AUTH_REQUIRED'
      }));
      ws.close();
      return;
    }
    
    // Verifikasi user ada di database
    storage.getUser(userId).then(user => {
      if (!user) {
        console.log(`❌ Koneksi WebSocket ditolak: User dengan ID ${userId} tidak ditemukan`);
        ws.send(JSON.stringify({ 
          type: 'error', 
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        }));
        ws.close();
        return;
      }
      
      // Hapus koneksi lama jika ada
      const existingIdx = clients.findIndex(c => c.userId === userId);
      if (existingIdx >= 0) {
        console.log(`ℹ️ Mengganti koneksi lama untuk user ${userId}`);
        try {
          if (clients[existingIdx].socket.readyState === WebSocket.OPEN) {
            clients[existingIdx].socket.close();
          }
        } catch (e) {
          console.error('Error menutup koneksi lama:', e);
        }
        clients.splice(existingIdx, 1);
      }
      
      // Tambahkan client baru
      const client: WebSocketClient = {
        userId,
        socket: ws,
        lastHeartbeat: Date.now()
      };
      clients.push(client);
      
      // Update status online
      storage.updateUserOnlineStatus(userId, true).catch(err => {
        console.error(`❌ Gagal update status online untuk user ${userId}:`, err);
      });
      
      // Kirim konfirmasi koneksi berhasil
      ws.send(JSON.stringify({
        type: 'connected',
        userId,
        timestamp: new Date().toISOString(),
        message: 'WebSocket connection established successfully.'
      }));
      
      console.log(`✅ User ${userId} (${user.username}) terhubung ke WebSocket`);
      
      // Kirim daftar user online
      broadcastOnlineUsers();
    }).catch(err => {
      console.error('❌ Error verifikasi user:', err);
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Server error during authentication',
        code: 'SERVER_ERROR'
      }));
      ws.close();
    });
    
    // Handle pesan dari client
    ws.on('message', async (message) => {
      try {
        // Dapatkan ID client yang mengirim pesan
        const client = clients.find(c => c.socket === ws);
        if (!client) {
          console.log('❌ Pesan dari client yang tidak terautentikasi');
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: 'Not authenticated',
            code: 'NOT_AUTHENTICATED'
          }));
          return;
        }
        
        // Update waktu heartbeat
        client.lastHeartbeat = Date.now();
        
        // Parse pesan
        const data = JSON.parse(message.toString());
        console.log(`📩 Pesan diterima dari user ${client.userId}:`, data.type);
        
        // Handle berbagai tipe pesan
        if (data.type === 'pong') {
          // Tanggapan heartbeat, tidak perlu diproses lebih lanjut
          return;
        }
        
        if (data.type === 'message') {
          await handleChatMessage(client.userId, data);
        }
        
        if (data.type === 'typing') {
          // Notify recipient that sender is typing
          await broadcastTypingStatus(client.userId, data);
        }
        
      } catch (error) {
        console.error('❌ Error memproses pesan WebSocket:', error);
        
        try {
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: 'Error processing message',
            code: 'PROCESSING_ERROR'
          }));
        } catch (e) {
          console.error('❌ Error mengirim respons error:', e);
        }
      }
    });
    
    // Handle koneksi terputus
    ws.on('close', () => {
      const clientIndex = clients.findIndex(c => c.socket === ws);
      if (clientIndex !== -1) {
        const client = clients[clientIndex];
        console.log(`👋 User ${client.userId} terputus dari WebSocket`);
        
        // Hapus client dari daftar
        clients.splice(clientIndex, 1);
        
        // Update status online
        storage.updateUserOnlineStatus(client.userId, false).catch(err => {
          console.error(`❌ Gagal update status offline untuk user ${client.userId}:`, err);
        });
        
        // Informasi user lain tentang perubahan status
        broadcastOnlineUsers();
      }
    });
    
    // Handle error
    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
      
      const clientIndex = clients.findIndex(c => c.socket === ws);
      if (clientIndex !== -1) {
        const client = clients[clientIndex];
        console.log(`❌ Error pada koneksi user ${client.userId}`);
        
        // Hapus client dari daftar
        clients.splice(clientIndex, 1);
        
        // Update status online
        storage.updateUserOnlineStatus(client.userId, false).catch(err => {
          console.error(`❌ Gagal update status offline untuk user ${client.userId}:`, err);
        });
      }
    });
  });
  
  return wss;
}

// Kirim pesan ke user tertentu
export function sendToUser(userId: number, message: any): boolean {
  const userClients = clients.filter(c => c.userId === userId);
  if (userClients.length === 0) {
    return false;
  }
  
  const messageStr = typeof message === 'string' 
    ? message 
    : JSON.stringify(message);
  
  let success = false;
  
  for (const client of userClients) {
    try {
      if (client.socket.readyState === WebSocket.OPEN) {
        client.socket.send(messageStr);
        success = true;
      }
    } catch (error) {
      console.error(`❌ Error mengirim pesan ke user ${userId}:`, error);
    }
  }
  
  return success;
}

// Broadcast ke semua client
export function broadcastToAll(message: any): number {
  if (clients.length === 0) {
    return 0;
  }
  
  const messageStr = typeof message === 'string' 
    ? message 
    : JSON.stringify(message);
  
  let successCount = 0;
  
  for (const client of clients) {
    try {
      if (client.socket.readyState === WebSocket.OPEN) {
        client.socket.send(messageStr);
        successCount++;
      }
    } catch (error) {
      console.error(`❌ Error broadcast ke user ${client.userId}:`, error);
    }
  }
  
  return successCount;
}

// Broadcast status online ke semua client
async function broadcastOnlineUsers() {
  try {
    const onlineUsers = await storage.getOnlineUsers();
    const onlineUserIds = onlineUsers.map(user => user.id);
    
    broadcastToAll({
      type: 'online_users',
      users: onlineUserIds,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error mendapatkan daftar user online:', error);
  }
}

// Handle pesan chat baru
async function handleChatMessage(senderId: number, data: any) {
  try {
    if (!data.content) {
      return;
    }
    
    // Tentukan tipe chat (room atau direct)
    const isRoom = !!data.roomId;
    const chatId = isRoom ? data.roomId : data.directChatId;
    
    if (!chatId) {
      console.error('❌ Message missing chatId (roomId or directChatId)');
      return;
    }
    
    // Simpan pesan ke database
    const messageData = {
      content: data.content,
      senderId,
      roomId: isRoom ? chatId : undefined,
      directChatId: !isRoom ? chatId : undefined,
      classificationType: data.classification || "routine"
    };
    
    // Validasi dan simpan pesan
    const message = await storage.createMessage(messageData);
    console.log(`✅ Pesan disimpan di database dengan ID: ${message.id}`);
    
    // Tambahkan data pengirim
    const sender = await storage.getUser(senderId);
    
    // Format pesan untuk dikirim ke penerima
    const messageWithSender = {
      id: message.id,
      content: message.content,
      senderId: message.senderId,
      roomId: message.roomId,
      directChatId: message.directChatId,
      createdAt: message.createdAt,
      sender: {
        id: sender?.id,
        username: sender?.username,
        isOnline: sender?.isOnline
      }
    };
    
    // Kirim notifikasi pesan baru ke penerima
    const notification = {
      type: 'new_message',
      message: messageWithSender,
      timestamp: new Date().toISOString()
    };
    
    // Tentukan penerima berdasarkan tipe chat
    if (isRoom) {
      // Pesan room - kirim ke semua anggota ruangan
      const members = await storage.getRoomMembers(chatId);
      
      for (const member of members) {
        // Jangan kirim ke pengirim
        if (member.id !== senderId) {
          sendToUser(member.id, notification);
        }
      }
    } else {
      // Pesan langsung - temukan penerima
      const chat = await storage.getDirectChat(chatId);
      
      if (chat) {
        // Tentukan penerima berdasarkan ID pengirim
        const recipientId = chat.user1Id === senderId ? chat.user2Id : chat.user1Id;
        sendToUser(recipientId, notification);
      }
    }
    
    return messageWithSender;
  } catch (error) {
    console.error('❌ Error memproses pesan chat:', error);
    throw error;
  }
}

// Broadcast status mengetik ke penerima
async function broadcastTypingStatus(senderId: number, data: any) {
  try {
    // Tentukan tipe chat (room atau direct)
    const isRoom = !!data.roomId;
    const chatId = isRoom ? data.roomId : data.directChatId;
    
    if (!chatId) {
      return;
    }
    
    // Format notifikasi
    const notification = {
      type: 'typing',
      senderId,
      isRoom,
      chatId,
      isTyping: data.isTyping === true,
      timestamp: new Date().toISOString()
    };
    
    // Kirim berdasarkan tipe chat
    if (isRoom) {
      // Mengetik di room
      const members = await storage.getRoomMembers(chatId);
      
      for (const member of members) {
        if (member.id !== senderId) {
          sendToUser(member.id, notification);
        }
      }
    } else {
      // Mengetik di chat pribadi
      const chat = await storage.getDirectChat(chatId);
      
      if (chat) {
        const recipientId = chat.user1Id === senderId ? chat.user2Id : chat.user1Id;
        sendToUser(recipientId, notification);
      }
    }
  } catch (error) {
    console.error('❌ Error broadcast status mengetik:', error);
  }
}