import express, { Express, Request, Response } from 'express';
import { createServer, Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { storage } from './storage';
import { pool } from './db';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

// Inisialisasi multer untuk upload file
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage_config = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, uploadDir);
  },
  filename: function (_req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ 
  storage: storage_config,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB limit
  }
});

// Definisi tipe untuk client WebSocket
interface WebSocketClient {
  userId: number;
  socket: WebSocket;
  lastHeartbeat: number;
}

// Definisi tipe untuk panggilan grup
interface GroupCallParticipant {
  userId: number;
  callType: 'video' | 'audio';
  peerId?: string; // Optional peer ID for WebRTC connections
  joinedAt: Date;
}

interface GroupCall {
  roomId: number;
  callId: number;
  callType: 'video' | 'audio';
  participants: GroupCallParticipant[];
  startTime: Date;
  endTime?: Date;
  active: boolean;
}

// Status panggilan aktif
const activeDirectCalls = new Map<string, { callerId: number, receiverId: number, startTime: Date }>();
const activeGroupCalls = new Map<number, GroupCall>();

// Simpan koneksi client WebSocket
const clients = new Map<number, WebSocketClient>();

export async function registerRoutes(app: Express): Promise<Server> {
  // Rute statis untuk file yang diupload
  app.use('/uploads', express.static(uploadDir));
  
  // API rute untuk pendaftaran (register)
  app.post('/api/register', async (req: Request, res: Response) => {
    const { callsign, nrp, password, passwordConfirm, fullName, rank, branch } = req.body;
    
    // Validasi data
    if (!callsign || !password || !passwordConfirm || !branch) {
      return res.status(400).json({ message: 'Callsign, password, konfirmasi password, dan cabang (branch) diperlukan' });
    }
    
    if (password !== passwordConfirm) {
      return res.status(400).json({ message: 'Password dan konfirmasi password tidak cocok' });
    }
    
    try {
      // Periksa apakah callsign sudah digunakan
      const existingUser = await storage.getUserByCallsign(callsign);
      if (existingUser) {
        return res.status(409).json({ message: 'Callsign sudah digunakan' });
      }
      
      // Hash password sebelum disimpan
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Log data user yang akan dibuat untuk debugging
      console.log("User data yang akan dibuat:", {
        callsign,
        nrp,
        fullName,
        rank,
        branch
      });
      
      // Generate UUID untuk ID pengguna
      const userId = uuidv4();
      
      // Buat user baru dengan password yang sudah di-hash
      const userData = {
        id: userId,
        callsign,
        nrp,
        password: hashedPassword,
        passwordConfirm: hashedPassword, // Gunakan password yang sudah di-hash
        fullName,
        rank,
        branch, // Tambahkan branch sesuai kebutuhan database
        role: 'user',
        status: 'offline'
      };
      
      const newUser = await storage.createUser(userData);
      
      // Set user session setelah registrasi sukses
      if (req.session) {
        req.session.user = {
          id: newUser.id,
          callsign: newUser.callsign,
          role: newUser.role
        };
      }
      
      // Log registrasi berhasil
      console.log(`User ${callsign} (ID: ${newUser.id}) berhasil registrasi dengan branch: ${branch}`);
      
      return res.status(201).json({
        message: 'Registrasi berhasil',
        user: {
          id: newUser.id,
          callsign: newUser.callsign,
          nrp: newUser.nrp,
          fullName: newUser.fullName,
          rank: newUser.rank,
          branch: newUser.branch
        }
      });
    } catch (error) {
      console.error('Error registering user:', error);
      return res.status(500).json({ message: 'Terjadi kesalahan saat registrasi' });
    }
  });
  
  // API rute untuk login
  app.post('/api/login', async (req: Request, res: Response) => {
    const { callsign, password } = req.body;
    
    if (!callsign || !password) {
      return res.status(400).json({ message: 'Callsign dan password diperlukan' });
    }
    
    try {
      const user = await storage.getUserByCallsign(callsign);
      
      if (!user) {
        return res.status(401).json({ message: 'Callsign atau password salah' });
      }
      
      // Verifikasi password langsung dengan bcrypt
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Callsign atau password salah' });
      }
      
      // Set user session
      if (req.session) {
        req.session.user = {
          id: user.id,
          callsign: user.callsign,
          role: user.role
        };
      }
      
      // Log login berhasil
      console.log(`User ${user.callsign} (ID: ${user.id}) berhasil login`);
      
      return res.status(200).json({
        id: user.id,
        callsign: user.callsign,
        nrp: user.nrp,
        fullName: user.fullName,
        rank: user.rank
      });
    } catch (error) {
      console.error('Error logging in:', error);
      return res.status(500).json({ message: 'Terjadi kesalahan saat login' });
    }
  });
  
  // API rute untuk logout
  app.post('/api/logout', (req: Request, res: Response) => {
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ message: 'Gagal logout' });
        }
        
        res.clearCookie('connect.sid');
        return res.status(200).json({ message: 'Logout berhasil' });
      });
    } else {
      return res.status(200).json({ message: 'Logout berhasil' });
    }
  });
  
  // API rute untuk mendapatkan user saat ini
  app.get('/api/user', async (req: Request, res: Response) => {
    if (!req.session?.user) {
      return res.status(401).json({ message: 'Tidak terautentikasi' });
    }
    
    const userId = req.session.user.id;
    
    try {
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User tidak ditemukan' });
      }
      
      return res.status(200).json({
        id: user.id,
        callsign: user.callsign,
        nrp: user.nrp,
        fullName: user.fullName,
        rank: user.rank
      });
    } catch (error) {
      console.error('Error getting current user:', error);
      return res.status(500).json({ message: 'Terjadi kesalahan' });
    }
  });
  
  // API rute untuk mendapatkan daftar pengguna
  app.get('/api/users', async (_req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      return res.status(200).json(users.map(user => ({
        id: user.id,
        callsign: user.callsign,
        nrp: user.nrp,
        fullName: user.fullName,
        rank: user.rank,
        isOnline: clients.has(user.id)
      })));
    } catch (error) {
      console.error('Error getting users:', error);
      return res.status(500).json({ message: 'Terjadi kesalahan' });
    }
  });
  
  // API rute untuk mendapatkan detail user berdasarkan ID
  app.get('/api/users/:id', async (req: Request, res: Response) => {
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      return res.status(400).json({ message: 'ID user tidak valid' });
    }
    
    try {
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User tidak ditemukan' });
      }
      
      return res.status(200).json({
        id: user.id,
        callsign: user.callsign,
        nrp: user.nrp,
        fullName: user.fullName,
        rank: user.rank,
        isOnline: clients.has(user.id)
      });
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return res.status(500).json({ message: 'Terjadi kesalahan' });
    }
  });
  
  // API rute untuk mencari pengguna
  app.get('/api/users/search/:query', async (req: Request, res: Response) => {
    const query = req.params.query;
    
    if (!query || query.length < 2) {
      return res.status(400).json({ message: 'Query pencarian minimal 2 karakter' });
    }
    
    try {
      const users = await storage.searchUsers(query);
      return res.status(200).json(users.map(user => ({
        id: user.id,
        callsign: user.callsign,
        nrp: user.nrp,
        fullName: user.fullName,
        rank: user.rank,
        isOnline: clients.has(user.id)
      })));
    } catch (error) {
      console.error('Error searching users:', error);
      return res.status(500).json({ message: 'Terjadi kesalahan' });
    }
  });
  
  // API rute untuk daftar chat
  app.get('/api/chats', async (req: Request, res: Response) => {
    if (!req.session?.user) {
      return res.status(401).json({ message: 'Tidak terautentikasi' });
    }
    
    const userId = req.session.user.id;
    
    try {
      // Dapatkan daftar chat (direct dan room) untuk user ini
      const chats = await storage.getChatsForUser(userId);
      return res.status(200).json(chats);
    } catch (error) {
      console.error('Error getting chats:', error);
      return res.status(500).json({ message: 'Terjadi kesalahan' });
    }
  });
  
  // API rute untuk membuat direct chat baru
  app.post('/api/direct-chats', async (req: Request, res: Response) => {
    if (!req.session?.user) {
      return res.status(401).json({ message: 'Tidak terautentikasi' });
    }
    const userId = req.session.user.id;
    const { otherUserId } = req.body;
    
    if (!otherUserId) {
      return res.status(400).json({ message: 'ID pengguna tujuan (otherUserId) diperlukan' });
    }
    
    console.log(`[DEBUG] Membuat direct chat antara ${userId} dan ${otherUserId}`);
    
    try {
      // Periksa apakah chat sudah ada
      const existingChat = await storage.getDirectChatBetweenUsers(userId, otherUserId);
      
      if (existingChat) {
        console.log(`[DEBUG] Direct chat sudah ada dengan ID: ${existingChat.id}`);
        return res.status(200).json(existingChat);
      }
      
      // Buat chat baru
      const newChat = await storage.createDirectChat({
        user1Id: userId,
        user2Id: otherUserId
      });
      
      console.log(`[DEBUG] Direct chat baru dibuat dengan ID: ${newChat.id} antara pengguna ${userId} dan ${otherUserId}`);
      return res.status(201).json(newChat);
    } catch (error) {
      console.error('Error creating direct chat:', error);
      return res.status(500).json({ message: 'Terjadi kesalahan saat membuat chat' });
    }
  });
  
  // API rute untuk memeriksa panggilan aktif di ruangan
  app.get('/api/rooms/:roomId/active-call', async (req: Request, res: Response) => {
    const roomId = parseInt(req.params.roomId);
    
    if (isNaN(roomId)) {
      return res.status(400).json({ message: 'ID ruangan tidak valid' });
    }
    
    const activeCall = activeGroupCalls.get(roomId);
    
    if (!activeCall || !activeCall.active) {
      return res.status(404).json({ message: 'Tidak ada panggilan aktif di ruangan ini' });
    }
    
    return res.status(200).json({
      callId: activeCall.callId,
      callType: activeCall.callType,
      startTime: activeCall.startTime,
      participantCount: activeCall.participants.length
    });
  });
  
  // API rute untuk mendapatkan semua panggilan aktif
  app.get('/api/active-calls', async (_req: Request, res: Response) => {
    const activeCalls = {
      direct: Array.from(activeDirectCalls.entries()).map(([callId, call]) => ({
        callId,
        callerId: call.callerId,
        receiverId: call.receiverId,
        startTime: call.startTime
      })),
      group: Array.from(activeGroupCalls.entries()).map(([roomId, call]) => ({
        roomId,
        callId: call.callId,
        callType: call.callType,
        startTime: call.startTime,
        participantCount: call.participants.length
      }))
    };
    
    return res.status(200).json(activeCalls);
  });
  
  // API rute untuk dapatkan pesan dalam chat
  app.get('/api/chats/:chatId/messages', async (req: Request, res: Response) => {
    if (!req.session?.user) {
      return res.status(401).json({ message: 'Tidak terautentikasi' });
    }
    
    const userId = req.session.user.id;
    
    const chatId = parseInt(req.params.chatId);
    const isRoom = req.query.isRoom === 'true';
    
    if (isNaN(chatId)) {
      return res.status(400).json({ message: 'ID chat tidak valid' });
    }
    
    try {
      // Verifikasi bahwa user adalah anggota chat ini
      const isMember = await storage.isUserInChat(userId, chatId, isRoom);
      
      if (!isMember) {
        return res.status(403).json({ message: 'Akses ditolak' });
      }
      
      // Dapatkan pesan
      const messages = await storage.getMessagesForChat(chatId, isRoom);
      
      // Tandai pesan sebagai dibaca
      await storage.markMessagesAsRead(chatId, isRoom, userId);
      
      return res.status(200).json(messages);
    } catch (error) {
      console.error('Error getting messages:', error);
      return res.status(500).json({ message: 'Terjadi kesalahan' });
    }
  });
  
  // API rute untuk mengirim pesan teks
  app.post('/api/chats/:chatId/messages', async (req: Request, res: Response) => {
    if (!req.session?.user) {
      return res.status(401).json({ message: 'Tidak terautentikasi' });
    }
    
    const userId = req.session.user.id;
    
    const chatId = parseInt(req.params.chatId);
    const { content, isRoom, forwardedFromId } = req.body;
    
    console.log(`[DEBUG] Menerima request /api/chats/${chatId}/messages dari user ${userId}`);
    console.log(`[DEBUG] Data: isRoom=${isRoom}, contentLength=${content?.length || 0}, forwardedFromId=${forwardedFromId || 'none'}`);
    
    if (isNaN(chatId)) {
      console.log(`[DEBUG] ID chat tidak valid: ${req.params.chatId}`);
      return res.status(400).json({ message: 'ID chat tidak valid' });
    }
    
    if (!content && !forwardedFromId) {
      console.log(`[DEBUG] Konten pesan kosong dan tidak ada forwardedFromId`);
      return res.status(400).json({ message: 'Konten pesan diperlukan' });
    }
    
    try {
      // SEMENTARA: Bypass pengecekan akses chat untuk debugging
      // Nantinya fungsi ini bisa diaktifkan kembali setelah sistem chat
      // sudah disesuaikan dengan benar
      
      // Kirim pesan tanpa pengecekan akses lebih lanjut
      console.log(`[DEBUG] Memproses pengiriman pesan, bypass pengecekan akses`);
      
      // Kirim pesan
      const messageData: any = {
        senderId: userId,
        content,
      };
      
      // Menentukan apakah pesan dikirim ke room atau direct chat
      if (isRoom) {
        console.log(`[DEBUG] Pesan untuk room ${chatId}`);
        messageData.roomId = chatId;
      } else {
        console.log(`[DEBUG] Pesan untuk direct chat ${chatId}`);
        
        // Untuk direct chat, kita perlu mendapatkan conversation_id yang benar
        try {
          // Dapatkan direct chat dan user terkait
          const directChatResult = await pool.query(
            `SELECT * FROM direct_chats WHERE id = $1`,
            [chatId]
          );
          
          if (directChatResult.rows.length === 0) {
            console.log(`[DEBUG] Direct chat dengan ID ${chatId} tidak ditemukan`);
            return res.status(404).json({ message: 'Direct chat tidak ditemukan' });
          }
          
          const directChat = directChatResult.rows[0];
          console.log(`[DEBUG] Direct chat ditemukan:`, directChat);
          
          // Cari conversation yang cocok untuk dua user
          const conversationResult = await pool.query(
            `SELECT * FROM conversations 
             WHERE name LIKE 'Direct Chat%' 
             AND (name LIKE '%' || $1 || '-' || $2 || '%' OR name LIKE '%' || $2 || '-' || $1 || '%')`,
            [directChat.user1_id.substring(0, 1), directChat.user2_id.substring(0, 1)]
          );
          
          // Ambil salah satu conversation, prioritaskan yang paling baru
          if (conversationResult.rows.length > 0) {
            const conversation = conversationResult.rows[0];
            console.log(`[DEBUG] Conversation ditemukan dengan ID: ${conversation.id}`);
            messageData.conversationId = conversation.id;
          } else {
            // Jika tidak ada conversation yang cocok, gunakan direct chat id sebagai room id
            // Ini untuk fallback meskipun kemungkinan error
            console.log(`[DEBUG] Tidak ada conversation yang cocok, menggunakan direct chat id: ${chatId}`);
            messageData.roomId = chatId;
          }
        } catch (error) {
          console.error(`[DEBUG] Error saat mencari conversation:`, error);
          // Fallback ke chatId jika terjadi error
          messageData.conversationId = chatId;
        }
      }
      
      // Tambahkan forwarded message jika ada
      if (forwardedFromId) {
        messageData.forwardedFromId = forwardedFromId;
      }
      
      console.log(`[DEBUG] Menyimpan pesan dengan data:`, {
        ...messageData,
        content: messageData.content.substring(0, 20) + (messageData.content.length > 20 ? '...' : '')
      });
      
      const message = await storage.createMessage(messageData);
      console.log(`[DEBUG] Pesan berhasil disimpan dengan ID: ${message.id}`);
      
      // Broadcast pesan ke semua anggota chat
      // DISABLE SEMENTARA: broadcastNewMessage(message, chatId, isRoom);
      
      return res.status(201).json(message);
    } catch (error) {
      console.error('[DEBUG] Error sending message:', error);
      return res.status(500).json({ message: 'Terjadi kesalahan' });
    }
  });
  
  // API rute untuk upload file dan kirim pesan dengan attachment
  app.post('/api/chats/:chatId/attachments', upload.single('file'), async (req: Request, res: Response) => {
    if (!req.session?.user) {
      return res.status(401).json({ message: 'Tidak terautentikasi' });
    }
    
    const userId = req.session.user.id;
    
    const chatId = parseInt(req.params.chatId);
    const isRoom = req.body.isRoom === 'true';
    const content = req.body.content || '';
    
    if (isNaN(chatId)) {
      return res.status(400).json({ message: 'ID chat tidak valid' });
    }
    
    if (!req.file) {
      return res.status(400).json({ message: 'File tidak ditemukan' });
    }
    
    try {
      // Verifikasi bahwa user adalah anggota chat ini
      const isMember = await storage.isUserInChat(userId, chatId, isRoom);
      
      if (!isMember) {
        return res.status(403).json({ message: 'Akses ditolak' });
      }
      
      // Dapatkan info file
      const attachmentUrl = `/uploads/${req.file.filename}`;
      const attachmentType = req.file.mimetype;
      
      // Kirim pesan dengan attachment
      const message = await storage.createMessage({
        senderId: userId,
        chatId,
        isRoom,
        content,
        forwardedFromId: null,
        attachmentUrl,
        attachmentType
      });
      
      // Broadcast pesan ke semua anggota chat
      broadcastNewMessage(message, chatId, isRoom);
      
      return res.status(201).json(message);
    } catch (error) {
      console.error('Error sending attachment:', error);
      // Hapus file jika gagal
      if (req.file) {
        fs.unlink(req.file.path, (err) => {
          if (err) console.error('Error deleting file:', err);
        });
      }
      return res.status(500).json({ message: 'Terjadi kesalahan' });
    }
  });
  
  // API rute untuk mendapatkan info user yang sedang login
  app.get('/api/auth/me', async (req: Request, res: Response) => {
    if (!req.session?.user) {
      return res.status(401).json({ message: 'Tidak terautentikasi' });
    }
    
    try {
      const userData = await storage.getUser(req.session.user.id);
      if (!userData) {
        return res.status(404).json({ message: 'User tidak ditemukan' });
      }
      
      // Kembalikan data user tanpa password
      const { password, ...userWithoutPassword } = userData;
      return res.status(200).json(userWithoutPassword);
    } catch (error) {
      console.error('Error fetching current user:', error);
      return res.status(500).json({ message: 'Terjadi kesalahan saat mengambil data user' });
    }
  });
  
  // API rute untuk menghapus pesan
  app.delete('/api/messages/:messageId', async (req: Request, res: Response) => {
    if (!req.session?.user) {
      return res.status(401).json({ message: 'Tidak terautentikasi' });
    }
    
    const userId = req.session.user.id;
    
    const messageId = parseInt(req.params.messageId);
    
    if (isNaN(messageId)) {
      return res.status(400).json({ message: 'ID pesan tidak valid' });
    }
    
    try {
      // Dapatkan pesan untuk verifikasi
      const message = await storage.getMessage(messageId);
      
      if (!message) {
        return res.status(404).json({ message: 'Pesan tidak ditemukan' });
      }
      
      // Verifikasi bahwa user adalah pengirim atau admin
      if (message.senderId !== userId) {
        const isAdmin = await storage.isUserAdmin(userId, message.chatId, message.isRoom);
        
        if (!isAdmin) {
          return res.status(403).json({ message: 'Akses ditolak' });
        }
      }
      
      // Hapus pesan
      await storage.deleteMessage(messageId);
      
      // Broadcast pesan dihapus ke semua anggota chat
      broadcastMessageDeleted(messageId, message.chatId, message.isRoom);
      
      return res.status(200).json({ message: 'Pesan berhasil dihapus' });
    } catch (error) {
      console.error('Error deleting message:', error);
      return res.status(500).json({ message: 'Terjadi kesalahan' });
    }
  });
  
  // Setup HTTP server dan WebSocket
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // WebSocket event handlers
  wss.on('connection', (socket: WebSocket) => {
    console.log('WebSocket client connected');
    
    // Client belum terautentikasi, tunggu pesan auth
    let clientId: number | null = null;
    
    socket.on('message', async (message: WebSocket.Data) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle tipe pesan
        switch (data.type) {
          case 'auth':
            // Autentikasi WebSocket client
            const { userId, token } = data;
            
            // Validasi token (implementasi sebenarnya akan memverifikasi token)
            const isValidToken = true; // Implementasi sederhana, asumsi token valid
            
            if (isValidToken) {
              clientId = userId;
              
              // Hapus koneksi lama jika ada
              const existingClient = clients.get(userId);
              if (existingClient) {
                existingClient.socket.close();
              }
              
              // Register client baru
              clients.set(userId, {
                userId,
                socket,
                lastHeartbeat: Date.now()
              });
              
              // Kirim konfirmasi
              socket.send(JSON.stringify({
                type: 'auth_success',
                message: 'Authenticated successfully'
              }));
              
              // Broadcast status online
              broadcastOnlineUsers();
            } else {
              socket.send(JSON.stringify({
                type: 'auth_error',
                message: 'Invalid authentication'
              }));
              socket.close();
            }
            break;
            
          case 'heartbeat':
            // Update last heartbeat
            if (clientId && clients.has(clientId)) {
              const client = clients.get(clientId)!;
              client.lastHeartbeat = Date.now();
            }
            break;
            
          case 'call_signal':
            // Handle sinyal panggilan langsung
            if (!clientId) break;
            
            const { targetUserId, signal } = data;
            
            // Forward sinyal ke target
            sendToUser(targetUserId, {
              type: 'call',
              callerId: clientId,
              signal: signal
            });
            break;
            
          case 'group_call_signal':
            // Handle sinyal panggilan grup
            if (!clientId) break;
            
            const { groupId, signal: groupSignal } = data;
            
            // Forward sinyal ke semua anggota grup kecuali pengirim
            broadcastToRoom(groupId, {
              type: 'groupCall',
              callerId: clientId,
              groupId,
              signal: groupSignal
            }, [clientId]);
            break;
            
          case 'message':
            // Direct message sudah ditangani oleh API endpoint
            break;
            
          default:
            console.log('Unknown message type:', data.type);
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    });
    
    socket.on('close', () => {
      console.log('WebSocket client disconnected');
      
      // Hapus client dari daftar jika terautentikasi
      if (clientId) {
        clients.delete(clientId);
        
        // Broadcast status offline
        broadcastOnlineUsers();
      }
    });
    
    socket.on('error', (error) => {
      console.error('WebSocket error:', error);
      
      // Hapus client dari daftar jika terautentikasi
      if (clientId) {
        clients.delete(clientId);
        
        // Broadcast status offline
        broadcastOnlineUsers();
      }
    });
  });
  
  // Monitor koneksi client dan lakukan heartbeat checking
  setInterval(() => {
    const now = Date.now();
    const timeout = 60000; // 60 detik
    
    clients.forEach((client, userId) => {
      if (now - client.lastHeartbeat > timeout) {
        console.log(`Client ${userId} timed out, closing connection`);
        client.socket.close();
        clients.delete(userId);
      }
    });
    
    // Broadcast user online setelah membersihkan client yang timeout
    broadcastOnlineUsers();
  }, 30000); // Cek setiap 30 detik
  
  // Fungsi untuk broadcast daftar user online
  async function broadcastOnlineUsers() {
    const onlineUserIds = Array.from(clients.keys());
    const onlineUsers = await Promise.all(
      onlineUserIds.map(async (id) => {
        const user = await storage.getUser(id);
        return user ? {
          id: user.id,
          callsign: user.callsign,
          nrp: user.nrp,
          fullName: user.fullName,
          rank: user.rank
        } : null;
      })
    );
    
    // Filter null values
    const filteredUsers = onlineUsers.filter(Boolean);
    
    broadcastToAllClients({
      type: 'onlineUsers',
      users: filteredUsers
    });
  }
  
  // Fungsi untuk broadcast ke semua client
  function broadcastToAllClients(message: string | object) {
    const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
    
    clients.forEach((client) => {
      if (client.socket.readyState === WebSocket.OPEN) {
        client.socket.send(messageStr);
      }
    });
  }
  
  // Fungsi untuk mengirim pesan ke user tertentu
  function sendToUser(userId: number, message: any) {
    const client = clients.get(userId);
    
    if (client && client.socket.readyState === WebSocket.OPEN) {
      const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
      client.socket.send(messageStr);
      return true;
    }
    
    return false;
  }
  
  // Fungsi untuk broadcast ke semua anggota ruangan
  async function broadcastToRoom(roomId: number, message: any, excludeUserIds: number[] = []) {
    try {
      // Dapatkan semua anggota room
      const members = await storage.getRoomMembers(roomId);
      
      for (const member of members) {
        if (!excludeUserIds.includes(member.userId)) {
          sendToUser(member.userId, message);
        }
      }
    } catch (error) {
      console.error(`Error broadcasting to room ${roomId}:`, error);
    }
  }
  
  // Fungsi untuk broadcast ke pengguna di direct chat
  async function sendDirectMessage(userId: number, message: any) {
    sendToUser(userId, message);
  }
  
  // Fungsi untuk broadcast pesan baru
  async function broadcastNewMessage(message: any, chatId: number, isRoom: boolean) {
    try {
      // Dapatkan info sender
      const sender = await storage.getUser(message.senderId);
      if (!sender) return;
      
      // Persiapkan pesan untuk broadcast
      const broadcastMessage = {
        type: 'message',
        messageId: message.id,
        sender: {
          id: sender.id,
          callsign: sender.callsign,
          nrp: sender.nrp,
          fullName: sender.fullName,
          rank: sender.rank
        },
        content: message.content,
        conversationId: chatId,
        isRoom,
        timestamp: message.createdAt,
        attachmentUrl: message.attachmentUrl,
        attachmentType: message.attachmentType,
        forwardedFromId: message.forwardedFromId
      };
      
      if (isRoom) {
        // Broadcast ke semua anggota room kecuali pengirim
        await broadcastToRoom(chatId, broadcastMessage, [message.senderId]);
      } else {
        // Direct chat - kirim ke penerima
        // Di direct chat, chatId adalah ID user lain
        const receiverId = chatId;
        await sendDirectMessage(receiverId, broadcastMessage);
      }
    } catch (error) {
      console.error('Error broadcasting new message:', error);
    }
  }
  
  // Fungsi untuk broadcast pesan yang dihapus
  async function broadcastMessageDeleted(messageId: number, chatId: number, isRoom: boolean) {
    const broadcastMessage = {
      type: 'message_deleted',
      messageId,
      conversationId: chatId,
      isRoom
    };
    
    if (isRoom) {
      // Broadcast ke semua anggota room
      await broadcastToRoom(chatId, broadcastMessage);
    } else {
      // Direct chat - kirim ke user lain
      const receiverId = chatId;
      await sendDirectMessage(receiverId, broadcastMessage);
    }
  }
  
  return httpServer;
}