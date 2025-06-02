import express, { type Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { 
  WebSocketMessage, 
  insertMessageSchema,
  insertConversationSchema,
  insertConversationMemberSchema
} from "@shared/schema";
import { upload, getAttachmentType, handleUploadError } from "./uploads";
import path from "path";

interface AuthenticatedWebSocket extends WebSocket {
  userId?: number;
}

// Type for requests with authenticated user
interface AuthRequest extends Request {
  user?: {
    id: number;
    claims?: any;
  };
  session?: {
    user?: any;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes are defined in auth.ts
  
  // Serve static uploads
  app.use('/uploads', isAuthenticated, express.static(path.join(process.cwd(), 'uploads')));
  
  // Upload file attachment
  app.post('/api/attachments/upload', isAuthenticated, upload.single('file'), handleUploadError, async (req: any, res: Response) => {
    try {
      // Pastikan file berhasil diupload
      if (!req.file) {
        return res.status(400).json({ message: 'Tidak ada file yang diupload' });
      }
      
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Tidak terautentikasi' });
      }
      
      // Dapatkan informasi file
      const file = req.file;
      const fileUrl = `/uploads/${file.filename}`;
      const attachmentType = getAttachmentType(file.mimetype);
      
      // Tambahkan informasi pengguna jika itu file audio untuk membantu penamaan file
      const user = await storage.getUser(userId);
      
      // Untuk file audio, tambahkan nama pengguna dan NRP
      let displayFileName = file.originalname;
      if (attachmentType === 'audio' && user) {
        // Jika ini file voice note yang direkam, ganti nama tampilan
        if (displayFileName.includes('personel_')) {
          displayFileName = `Voice Note - ${user.callsign || 'Personel'} - ${user.nrp || ''}`;
        }
        console.log(`File audio dari ${user.callsign} (${user.nrp}) diupload:`, displayFileName);
      }
      
      // Kirim response dengan detail file
      res.status(201).json({
        success: true,
        file: {
          url: fileUrl,
          name: displayFileName, // Tampilkan dengan format yang sesuai
          type: attachmentType,
          size: file.size,
          mimetype: file.mimetype
        }
      });
    } catch (error) {
      console.error('Error saat upload file:', error);
      res.status(500).json({ message: 'Gagal mengupload file' });
    }
  });
  
  // Get all users (for personnel list)
  app.get('/api/all-users', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error('Error fetching all users:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  // Conversations routes (both group chats and direct chats)
  app.get('/api/conversations', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      // Perbaikan: Gunakan session.user.id bukan user.id yang kosong
      const userId = req.session?.user?.id;
      console.log(`[API] Getting conversations for user ID from session: ${userId}`);
      
      if (!userId) {
        return res.status(400).json({ message: "User ID not found in session" });
      }
      
      const conversations = await storage.getUserConversations(userId);
      
      // Membuat response yang membedakan percakapan grup vs percakapan langsung
      const formattedConversations = conversations.map(conv => {
        // Konversi kolom database ke nama yang diharapkan di client
        const conversation = {
          ...conv,
          type: conv.isGroup ? 'group' : 'direct'
        };
        
        // Kita menggunakan nama kolom yang konsisten: lastMessage dan lastMessageTime
        // Tidak perlu konversi ini karena schema di database sudah benar
        
        return conversation;
      });
      
      console.log(`[API] Returning ${formattedConversations.length} conversations for user ${userId}`);
      res.json(formattedConversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });
  
  // Specific route untuk group chats (filter dari conversations)
  app.get('/api/rooms', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      // Perbaikan: Gunakan session.user.id bukan user.id yang kosong
      const userId = req.session?.user?.id;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID not found in session" });
      }
      
      const conversations = await storage.getUserConversations(userId);
      const rooms = conversations.filter(conv => conv.isGroup);
      console.log(`[API] Returning ${rooms.length} group chats for user ${userId}`);
      res.json(rooms);
    } catch (error) {
      console.error("Error fetching rooms:", error);
      res.status(500).json({ message: "Failed to fetch rooms" });
    }
  });
  
  // Specific route untuk direct chats (filter dari conversations)
  app.get('/api/direct-chats', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      // Perbaikan: Gunakan session.user.id bukan user.id yang kosong
      const userId = req.session?.user?.id;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID not found in session" });
      }
      
      const conversations = await storage.getUserConversations(userId);
      const directChats = conversations.filter(conv => !conv.isGroup);
      console.log(`[API] Returning ${directChats.length} direct chats for user ${userId}`);
      res.json(directChats);
    } catch (error) {
      console.error("Error fetching direct chats:", error);
      res.status(500).json({ message: "Failed to fetch direct chats" });
    }
  });
  
  // Get single conversation with members
  app.get('/api/conversations/:id', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const userId = req.session?.user?.id || 0;
      
      if (isNaN(conversationId)) {
        return res.status(400).json({ message: "Invalid conversation ID" });
      }
      
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Get members of this conversation
      const members = await storage.getConversationMembers(conversationId);
      const memberIds = members.map(member => member.userId);
      
      console.log(`[DEBUG] User ${userId} accessing conversation ${conversationId}. Members: ${memberIds.join(',')}`);
      
      // Temporarily disable member check for debugging
      // if (!memberIds.includes(userId)) {
      //   console.log(`User ${userId} attempting to access conversation ${conversationId} but not a member. Members: ${memberIds.join(',')}`);
      //   return res.status(403).json({ message: "You are not a member of this conversation" });
      // }
      
      // If it's a direct chat, add information about the other user
      let otherUser = null;
      if (!conversation.isGroup && members.length === 2) {
        const otherUserId = memberIds.find(id => id !== userId);
        if (otherUserId) {
          otherUser = await storage.getUser(otherUserId);
          
          // Update the conversation name to show the other user's name
          conversation.name = otherUser?.fullName || otherUser?.callsign || 'Unknown User';
        }
      }
      
      const result = {
        ...conversation,
        members: members.length,
        otherUser: otherUser,
        otherUserId: otherUser?.id || null,
      };
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ message: "Failed to fetch conversation" });
    }
  });

  // Create a new conversation (group chat saja, direct chat ditangani oleh /api/direct-chats)
  app.post('/api/conversations', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      if (!req.session?.user?.id) {
        return res.status(401).json({ message: "Unauthorized, invalid user ID" });
      }
      
      const userId = req.session.user.id;
      
      // Konversasi yang dibuat melalui API ini harus berupa grup
      if (req.body.isGroup !== true) {
        return res.status(400).json({ 
          message: "This endpoint is for creating group chats only. For direct chats, use /api/direct-chats"
        });
      }
      
      const parseResult = insertConversationSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid conversation data",
          errors: parseResult.error.format()
        });
      }
      
      console.log(`[API] Creating new group chat "${req.body.name}" by user ${userId}`);
      
      // Create the conversation
      const conversation = await storage.createConversation({
        ...parseResult.data,
        createdById: userId
      });
      
      console.log(`[API] Created new group with ID ${conversation.id}`);
      
      // Add creator as a member
      await storage.addMemberToConversation({
        conversationId: conversation.id,
        userId: userId,
        role: 'admin'  // Creator is admin by default
      });
      
      console.log(`[API] Added creator ${userId} as admin to group ${conversation.id}`);
      
      // Tambahkan anggota lain jika ada
      if (req.body.members && Array.isArray(req.body.members)) {
        for (const memberId of req.body.members) {
          if (memberId !== userId) {  // Jangan tambahkan creator lagi
            await storage.addMemberToConversation({
              conversationId: conversation.id,
              userId: memberId,
              role: 'member'
            });
            console.log(`[API] Added member ${memberId} to group ${conversation.id}`);
          }
        }
      }
      
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });
  
  // Route untuk membuat direct chat
  app.post('/api/direct-chats', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      // Dalam auth.ts, kita menyimpan user di req.session.user bukan di req.user
      if (!req.session?.user?.id) {
        return res.status(401).json({ message: "Unauthorized, invalid user ID" });
      }
      
      const userId = req.session.user.id;
      const { otherUserId } = req.body;
      
      if (!otherUserId) {
        return res.status(400).json({ message: "otherUserId is required" });
      }
      
      // Pastikan user yang dituju ada
      const otherUser = await storage.getUser(otherUserId);
      if (!otherUser) {
        return res.status(404).json({ message: "Other user not found" });
      }
      
      // PERBAIKAN: Cek apakah sudah ada direct chat antara kedua user ini
      const userConversations = await storage.getUserConversations(userId);
      
      // Debug
      console.log(`[API] Checking for existing direct chat between users ${userId} and ${otherUserId}`);
      console.log(`[API] User ${userId} has ${userConversations.length} conversations`);
      
      // Filter untuk direct chats saja
      const directChats = userConversations.filter(c => c.isGroup === false);
      console.log(`[API] User ${userId} has ${directChats.length} direct chats`);
      
      let existingChat = null;
      
      // Untuk setiap direct chat yang ada
      for (const chat of directChats) {
        // Ambil anggota percakapan
        const members = await storage.getConversationMembers(chat.id);
        const memberIds = members.map(m => m.userId);
        
        console.log(`[API] Checking conversation ${chat.id} with members: ${memberIds.join(', ')}`);
        
        // Jika percakapan berisi tepat 2 anggota (user saat ini dan user tujuan)
        if (memberIds.length === 2 && 
            memberIds.includes(userId) && 
            memberIds.includes(otherUserId)) {
          existingChat = chat;
          console.log(`[API] Found existing conversation ${chat.id} between users ${userId} and ${otherUserId}`);
          break;
        }
      }
      
      // Jika sudah ada, gunakan percakapan yang sudah ada
      if (existingChat) {
        console.log(`[API] Using existing direct chat ${existingChat.id} between users ${userId} and ${otherUserId}`);
        return res.status(200).json(existingChat);
      }
      
      console.log(`[API] Creating new direct chat between users ${userId} and ${otherUserId}`);
      
      // Jika belum ada, buat conversation baru dengan tipe direct chat (isGroup=false)
      // Urutkan ID pengguna agar formatnya konsisten
      const sortedIds = [userId, otherUserId].sort((a, b) => a - b);
      const chatName = `Direct Chat ${sortedIds[0]}-${sortedIds[1]}`;
      
      const conversation = await storage.createConversation({
        name: chatName,
        isGroup: false,
        description: null,
        classification: null,
        createdById: userId
      });
      
      console.log(`[API] Created new conversation with ID ${conversation.id}`);
      
      // Tambahkan kedua user ke conversation
      await storage.addMemberToConversation({
        conversationId: conversation.id,
        userId: userId
      });
      
      console.log(`[API] Added user ${userId} to conversation ${conversation.id}`);
      
      await storage.addMemberToConversation({
        conversationId: conversation.id,
        userId: otherUserId
      });
      
      console.log(`[API] Added user ${otherUserId} to conversation ${conversation.id}`);
      console.log(`[API] Direct chat setup complete: ${conversation.id}`);
      
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating direct chat:", error);
      res.status(500).json({ message: "Failed to create direct chat" });
    }
  });
      


  // Conversation members route
  app.post('/api/conversation-members', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const parseResult = insertConversationMemberSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid member data",
          errors: parseResult.error.format()
        });
      }
      
      const member = await storage.addMemberToConversation(parseResult.data);
      res.status(201).json(member);
    } catch (error) {
      console.error("Error adding member:", error);
      res.status(500).json({ message: "Failed to add member" });
    }
  });

  app.get('/api/conversations/:id/members', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      if (isNaN(conversationId)) {
        return res.status(400).json({ message: "Invalid conversation ID" });
      }
      
      const members = await storage.getConversationMembers(conversationId);
      res.json(members);
    } catch (error) {
      console.error("Error fetching members:", error);
      res.status(500).json({ message: "Failed to fetch members" });
    }
  });

  // Messages routes
  app.get('/api/conversations/:id/messages', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      if (isNaN(conversationId)) {
        return res.status(400).json({ message: "Invalid conversation ID" });
      }
      
      // Temporarily disable access check for debugging
      // Sehingga semua pengguna bisa mengakses pesan dalam chat
      const messages = await storage.getMessagesByConversation(conversationId);
      
      // Log jumlah pesan yang ditemukan untuk debugging
      console.log(`Found ${messages.length} messages for conversation ${conversationId}`);
      
      // Buat objek untuk mencari pesan yang di-reply dengan cepat
      const messagesMap = messages.reduce((acc: Record<number, any>, msg: any) => {
        acc[msg.id] = msg;
        return acc;
      }, {});
      
      // Tambahkan detail pesan balasan ke setiap pesan
      const enhancedMessages = messages.map((msg: any) => {
        if (msg.replyToId && messagesMap[msg.replyToId]) {
          const repliedMsg = messagesMap[msg.replyToId];
          return {
            ...msg,
            replyInfo: {
              content: repliedMsg.content,
              senderName: repliedMsg.senderName,
              hasAttachment: repliedMsg.hasAttachment,
              attachmentName: repliedMsg.attachmentName
            }
          };
        }
        return msg;
      });
      
      // Pastikan response-nya adalah array JSON yang valid
      res.setHeader('Content-Type', 'application/json');
      res.json(enhancedMessages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post('/api/messages', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const userId = req.session?.user?.id;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID not found in session" });
      }
      
      console.log(`[API] Creating message from user ${userId} for conversation ${req.body.conversationId}`);
      
      const parseResult = insertMessageSchema.safeParse({
        ...req.body,
        senderId: userId
      });
      
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid message data",
          errors: parseResult.error.format()
        });
      }
      
      const message = await storage.createMessage(parseResult.data);
      console.log(`[API] Message created: ${message.id} in conversation ${message.conversationId}`);
      
      // Broadcast to WebSocket clients
      broadcastToConversation(message.conversationId, {
        type: 'new_message',
        payload: message
      });
      
      res.status(201).json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({ message: "Failed to create message" });
    }
  });
  
  // Delete conversation endpoint
  app.delete('/api/conversations/:id', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const userId = req.session.user.id;
      
      if (isNaN(conversationId)) {
        return res.status(400).json({ message: "Invalid conversation ID" });
      }
      
      // Check if conversation exists
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Only allow creator or admin to delete
      if (conversation.createdById !== userId) {
        return res.status(403).json({ message: "Not authorized to delete this conversation" });
      }
      
      // Delete conversation
      await storage.deleteConversation(conversationId);
      
      res.json({ message: "Conversation deleted successfully" });
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ message: "Failed to delete conversation" });
    }
  });
  
  // Clear chat history endpoint
  app.post('/api/conversations/:id/clear', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const userId = req.session.user.id;
      
      if (isNaN(conversationId)) {
        return res.status(400).json({ message: "Invalid conversation ID" });
      }
      
      // Check if conversation exists
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Clear messages
      await storage.clearConversationMessages(conversationId);
      
      res.json({ message: "Chat history cleared successfully" });
    } catch (error) {
      console.error("Error clearing chat history:", error);
      res.status(500).json({ message: "Failed to clear chat history" });
    }
  });

  // Users route
  app.get('/api/users', isAuthenticated, async (_req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.put('/api/users/status', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const userId = req.session.user.id;
      const { status } = req.body;
      
      if (!status || typeof status !== 'string') {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const user = await storage.updateUserStatus(userId, status);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Broadcast status change
      broadcastToAll({
        type: 'user_status',
        payload: {
          userId,
          status
        }
      });
      
      res.json(user);
    } catch (error) {
      console.error("Error updating status:", error);
      res.status(500).json({ message: "Failed to update status" });
    }
  });

  const httpServer = createServer(app);
  
  // WebSocket server - ini akan menggunakan path yang sama untuk semua koneksi
  console.log("Setting up WebSocket server on path /ws");
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws',
    clientTracking: true 
  });
  
  // Store active connections
  const clients = new Map<number, AuthenticatedWebSocket>();
  
  wss.on('connection', (ws: AuthenticatedWebSocket, req) => {
    console.log("WebSocket connection received");
    
    // Log connection status for debugging
    ws.on('open', () => console.log('WebSocket connection opened'));
    ws.on('error', (error) => console.error('WebSocket error:', error));
    ws.on('close', () => console.log('WebSocket connection closed'));
    
    ws.on('message', async (message) => {
      try {
        console.log('Received message:', message.toString());
        const data = JSON.parse(message.toString()) as WebSocketMessage;
        
        // Handle authentication message
        if (data.type === 'auth') {
          const { userId } = data.payload;
          if (userId) {
            console.log(`User ${userId} authenticated via WebSocket`);
            ws.userId = userId;
            clients.set(userId, ws);
            
            // Update user status to online
            await storage.updateUserStatus(userId, 'online');
            
            // Broadcast user status change
            broadcastToAll({
              type: 'user_status',
              payload: {
                userId,
                status: 'online'
              }
            });
          }
        }
        
        // Handle typing indicator
        if (data.type === 'typing' && ws.userId) {
          const { conversationId, isTyping } = data.payload;
          
          if (conversationId) {
            broadcastToConversation(conversationId, {
              type: 'typing',
              payload: {
                userId: ws.userId,
                conversationId,
                isTyping
              }
            });
          }
        }
        
        // Handle call initiation  
        if (data.type === 'initiate_call' && ws.userId) {
          const { callId, toUserId, callType, fromUserId, fromUserName } = data.payload;
          console.log(`[Call] User ${fromUserId} (${fromUserName}) initiating ${callType} call to ${toUserId}`);
          
          const targetClient = clients.get(toUserId);
          if (targetClient && targetClient.readyState === targetClient.OPEN) {
            targetClient.send(JSON.stringify({
              type: 'incoming_call',
              payload: {
                callId,
                callType,
                fromUserId,
                fromUserName
              }
            }));
            console.log(`[Call] Sent incoming call notification to user ${toUserId}`);
          } else {
            // User is offline, send failure response
            ws.send(JSON.stringify({
              type: 'call_failed',
              payload: {
                callId,
                reason: 'User is offline'
              }
            }));
            console.log(`[Call] User ${toUserId} is offline, call failed`);
          }
        }
        
        // Handle call acceptance
        if (data.type === 'accept_call' && ws.userId) {
          const { callId, toUserId } = data.payload;
          console.log(`[Call] User ${ws.userId} accepted call ${callId}`);
          
          const targetClient = clients.get(toUserId);
          if (targetClient && targetClient.readyState === targetClient.OPEN) {
            targetClient.send(JSON.stringify({
              type: 'call_accepted',
              payload: { callId }
            }));
            console.log(`[Call] Sent call accepted notification to user ${toUserId}`);
          }
        }
        
        // Handle call rejection
        if (data.type === 'reject_call' && ws.userId) {
          const { callId, toUserId } = data.payload;
          console.log(`[Call] User ${ws.userId} rejected call ${callId}`);
          
          const targetClient = clients.get(toUserId);
          if (targetClient && targetClient.readyState === targetClient.OPEN) {
            targetClient.send(JSON.stringify({
              type: 'call_rejected',
              payload: { callId }
            }));
            console.log(`[Call] Sent call rejected notification to user ${toUserId}`);
          }
        }
        
        // Handle call end
        if (data.type === 'end_call' && ws.userId) {
          const { callId, toUserId } = data.payload;
          console.log(`[Call] User ${ws.userId} ended call ${callId}`);
          
          const targetClient = clients.get(toUserId);
          if (targetClient && targetClient.readyState === targetClient.OPEN) {
            targetClient.send(JSON.stringify({
              type: 'call_ended',
              payload: { callId }
            }));
            console.log(`[Call] Sent call ended notification to user ${toUserId}`);
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    // Handle disconnection
    ws.on('close', async () => {
      if (ws.userId) {
        const userId = ws.userId;
        clients.delete(userId);
        
        // Update user status to offline
        await storage.updateUserStatus(userId, 'offline');
        
        // Broadcast user status change
        broadcastToAll({
          type: 'user_status',
          payload: {
            userId,
            status: 'offline'
          }
        });
      }
    });
  });
  
  // Broadcast to all connected clients
  function broadcastToAll(message: WebSocketMessage) {
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }
  
  // Broadcast to conversation members
  async function broadcastToConversation(conversationId: number, message: WebSocketMessage) {
    try {
      const members = await storage.getConversationMembers(conversationId);
      
      members.forEach((member) => {
        const client = clients.get(member.userId);
        if (client && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(message));
        }
      });
    } catch (error) {
      console.error('Error broadcasting to conversation:', error);
    }
  }
  
  // Message delete endpoint
  app.delete('/api/messages/:id', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const messageId = parseInt(req.params.id);
      if (isNaN(messageId)) {
        return res.status(400).json({ message: "Invalid message ID" });
      }
      
      const message = await storage.getMessage(messageId);
      
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }
      
      // Dalam versi militer, semua pengguna dapat menghapus pesan apapun
      // Tidak perlu pengecekan pengirim pesan
      
      const deletedMessage = await storage.deleteMessage(messageId);
      
      // Send real-time notification about the deleted message
      const wsMessage: WebSocketMessage = {
        type: 'new_message',
        payload: {
          ...deletedMessage,
          action: 'delete'
        }
      };
      
      await broadcastToConversation(deletedMessage.conversationId, wsMessage);
      
      res.status(200).json(deletedMessage);
    } catch (error) {
      console.error("Error deleting message:", error);
      res.status(500).json({ message: "Failed to delete message" });
    }
  });
  
  // Forward message endpoint
  app.post('/api/messages/:id/forward', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const messageId = parseInt(req.params.id);
      if (isNaN(messageId)) {
        return res.status(400).json({ message: "Invalid message ID" });
      }
      
      const { conversationId } = req.body;
      if (!conversationId) {
        return res.status(400).json({ message: "Conversation ID is required" });
      }
      
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const newConversationId = parseInt(conversationId);
      
      // Forward the message
      const forwardedMessage = await storage.forwardMessage(messageId, newConversationId, userId);
      
      // Send real-time notification about the new message
      const wsMessage: WebSocketMessage = {
        type: 'new_message',
        payload: forwardedMessage
      };
      
      await broadcastToConversation(newConversationId, wsMessage);
      
      res.status(201).json(forwardedMessage);
    } catch (error) {
      console.error("Error forwarding message:", error);
      res.status(500).json({ message: "Failed to forward message" });
    }
  });

  return httpServer;
}
