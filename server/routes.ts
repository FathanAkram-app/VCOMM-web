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
  user?: any;
  session?: any & {
    user?: any;
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Add global request logging
  app.use((req, res, next) => {
    if (req.method === 'DELETE' && req.path.includes('/api/conversations/')) {
      console.log(`[GLOBAL MIDDLEWARE] ${req.method} ${req.path}`);
      console.log('[GLOBAL MIDDLEWARE] Session exists:', !!req.session);
      console.log('[GLOBAL MIDDLEWARE] Session user:', req.session?.user);
    }
    next();
  });

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

  // Get specific user by ID (for group call participant names)
  app.get('/api/users/:userId', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Return only safe user data for group calls
      res.json({
        id: user.id,
        callsign: user.callsign,
        fullName: user.fullName,
        rank: user.rank
      });
    } catch (error) {
      console.error('Error getting user by ID:', error);
      res.status(500).json({ message: 'Failed to get user' });
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

  // Clear chat history endpoint
  app.delete('/api/conversations/:id/clear', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      if (isNaN(conversationId)) {
        return res.status(400).json({ message: "Invalid conversation ID" });
      }
      
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(400).json({ message: "User ID not found in session" });
      }
      
      // Check if user is member of the conversation
      const members = await storage.getConversationMembers(conversationId);
      const isMember = members.some((member: any) => member.userId == userId);
      
      if (!isMember) {
        return res.status(403).json({ message: "Not authorized to clear this conversation" });
      }
      
      // Clear all messages in the conversation
      await storage.clearConversationMessages(conversationId);
      
      console.log(`[API] Cleared chat history for conversation ${conversationId} by user ${userId}`);
      res.json({ message: "Chat history cleared successfully" });
    } catch (error) {
      console.error("Error clearing chat history:", error);
      res.status(500).json({ message: "Failed to clear chat history" });
    }
  });

  // Delete conversation/group endpoint
  app.delete('/api/conversations/:id', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      if (isNaN(conversationId)) {
        return res.status(400).json({ message: "Invalid conversation ID" });
      }
      
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(400).json({ message: "User ID not found in session" });
      }
      
      // Get conversation details
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // For groups, check if user is member
      if (conversation.isGroup) {
        const members = await storage.getConversationMembers(conversationId);
        const isMember = members.some((member: any) => member.userId == userId);
        
        if (!isMember) {
          return res.status(403).json({ message: "Not authorized to delete this group" });
        }
      }
      
      // Delete the conversation and all related data
      await storage.deleteConversation(conversationId);
      
      console.log(`[API] Deleted conversation ${conversationId} by user ${userId}`);
      res.json({ message: "Conversation deleted successfully" });
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ message: "Failed to delete conversation" });
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
      console.log(`[API] Request body:`, req.body);
      
      const parseResult = insertMessageSchema.safeParse({
        ...req.body,
        senderId: userId
      });
      
      console.log(`[API] Parse result success:`, parseResult.success);
      if (parseResult.success) {
        console.log(`[API] Parsed data:`, parseResult.data);
      }
      
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
  
  // Delete conversation endpoint (changed to POST to handle session properly)
  app.post('/api/conversations/:id/delete', isAuthenticated, async (req: AuthRequest, res) => {
    console.log('[DEBUG] DELETE (POST) endpoint reached');
    
    try {
      const conversationId = parseInt(req.params.id);
      const userId = req.session?.user?.id;
      
      if (!userId) {
        console.log('[DEBUG] No user ID in session');
        return res.status(401).json({ message: "Authentication required" });
      }
      
      console.log(`[API] User ${userId} attempting to delete conversation ${conversationId}`);
      
      if (isNaN(conversationId)) {
        return res.status(400).json({ message: "Invalid conversation ID" });
      }
      
      // Check if conversation exists
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Check if user is a member of this conversation
      const isMember = await storage.isUserMemberOfConversation(userId, conversationId);
      if (!isMember) {
        return res.status(403).json({ message: "Not authorized - not a member of this conversation" });
      }
      
      // If user is the creator, delete the entire conversation
      // If user is a member, just remove them from the conversation
      if (conversation.createdById === userId) {
        // Creator deletes entire conversation
        await storage.deleteConversation(conversationId);
      } else {
        // Member removes themselves from conversation
        await storage.removeUserFromConversation(userId, conversationId);
      }
      
      res.json({ message: "Conversation deleted successfully" });
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ message: "Failed to delete conversation" });
    }
  });
  
  // Clear chat history endpoint
  app.post('/api/conversations/:id/clear', isAuthenticated, async (req: AuthRequest, res) => {
    console.log('[DEBUG] CLEAR endpoint reached');
    
    try {
      const conversationId = parseInt(req.params.id);
      const userId = req.session?.user?.id;
      
      if (!userId) {
        console.log('[DEBUG] No user ID in session for clear');
        return res.status(401).json({ message: "Authentication required" });
      }
      
      console.log(`[API] User ${userId} attempting to clear conversation ${conversationId}`);
      
      if (isNaN(conversationId)) {
        return res.status(400).json({ message: "Invalid conversation ID" });
      }
      
      // Check if conversation exists
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Check if user is a member of this conversation
      const isMember = await storage.isUserMemberOfConversation(userId, conversationId);
      if (!isMember) {
        return res.status(403).json({ message: "Not authorized - not a member of this conversation" });
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
  
  // Store active group calls and their participants
  const activeGroupCalls = new Map<string, Set<number>>();
  
  // Helper function to broadcast group updates to all group members
  const broadcastGroupUpdate = async (groupId: number, updateType: string, data: any) => {
    try {
      const members = await storage.getConversationMembers(groupId);
      for (const member of members) {
        const client = clients.get(member.userId);
        if (client && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'group_update',
            payload: {
              groupId,
              updateType,
              data
            }
          }));
        }
      }
      console.log(`[Group Update] Broadcasted ${updateType} to ${members.length} members of group ${groupId}`);
    } catch (error) {
      console.error(`[Group Update] Error broadcasting ${updateType}:`, error);
    }
  };
  
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

        // Handle WebRTC ready signal
        if (data.type === 'webrtc_ready' && ws.userId) {
          const { callId, toUserId } = data.payload;
          console.log(`[WebRTC] User ${ws.userId} is ready for WebRTC on call ${callId}`);
          
          const targetClient = clients.get(toUserId);
          if (targetClient && targetClient.readyState === targetClient.OPEN) {
            targetClient.send(JSON.stringify({
              type: 'webrtc_ready',
              payload: { callId }
            }));
            console.log(`[WebRTC] Sent ready signal to user ${toUserId}`);
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
        
        // Handle group call initiation
        if (data.type === 'start_group_call' && ws.userId) {
          const { callId, groupId, groupName, callType, fromUserId, fromUserName } = data.payload;
          console.log(`[Group Call] User ${fromUserId} (${fromUserName}) starting ${callType} group call in group ${groupId} (${groupName})`);
          
          // Check if there's already an active group call for this group
          let existingCallId = null;
          for (const [activeCallId, participants] of activeGroupCalls.entries()) {
            if (activeCallId.includes(`_${groupId}_`) && participants.size > 0) {
              existingCallId = activeCallId;
              break;
            }
          }
          
          if (existingCallId) {
            console.log(`[Group Call] Found existing group call ${existingCallId} for group ${groupId}`);
            // Join existing call instead of creating new one
            activeGroupCalls.get(existingCallId)!.add(fromUserId);
            
            // Get current participants list
            const participants = Array.from(activeGroupCalls.get(existingCallId) || []);
            console.log(`[Group Call] User ${fromUserId} joined existing call, participants:`, participants);
            
            try {
              // Get group members to notify
              const members = await storage.getConversationMembers(groupId);
              
              // Send incoming group call notifications to ALL members (not just the joiner)
              // This allows members to see the incoming call modal and choose to join
              let invitationsSent = 0;
              for (const member of members) {
                if (member.userId !== fromUserId) { // Don't send to the person starting the call
                  const targetClient = clients.get(member.userId);
                  if (targetClient && targetClient.readyState === targetClient.OPEN) {
                    targetClient.send(JSON.stringify({
                      type: 'incoming_group_call',
                      payload: {
                        callId: existingCallId,
                        groupId,
                        groupName,
                        callType,
                        fromUserId,
                        fromUserName
                      }
                    }));
                    invitationsSent++;
                    console.log(`[Group Call] Sent group call invitation to user ${member.userId}`);
                  }
                }
              }
              console.log(`[Group Call] Sent ${invitationsSent} group call invitations for existing call ${existingCallId}`);
              
              // Broadcast participant update to all group members
              for (const member of members) {
                const targetClient = clients.get(member.userId);
                if (targetClient && targetClient.readyState === targetClient.OPEN) {
                  targetClient.send(JSON.stringify({
                    type: 'group_call_participants_update',
                    payload: {
                      callId: existingCallId,
                      participants,
                      newParticipant: fromUserId
                    }
                  }));
                }
              }
            } catch (error) {
              console.error(`[Group Call] Error broadcasting participant update:`, error);
            }
            return;
          }
          
          try {
            // Create new group call
            // Get group members
            const members = await storage.getConversationMembers(groupId);
            console.log(`[Group Call] Found ${members.length} members in group ${groupId}`);
            
            // Send group call invitation to all members except the initiator
            let invitationsSent = 0;
            for (const member of members) {
              if (member.userId !== fromUserId) {
                const targetClient = clients.get(member.userId);
                if (targetClient && targetClient.readyState === targetClient.OPEN) {
                  targetClient.send(JSON.stringify({
                    type: 'incoming_group_call',
                    payload: {
                      callId,
                      groupId,
                      groupName,
                      callType,
                      fromUserId,
                      fromUserName
                    }
                  }));
                  invitationsSent++;
                  console.log(`[Group Call] Sent group call invitation to user ${member.userId}`);
                }
              }
            }
            console.log(`[Group Call] Sent ${invitationsSent} group call invitations for call ${callId}`);
            
            // Add the initiator to the group call participants
            if (!activeGroupCalls.has(callId)) {
              activeGroupCalls.set(callId, new Set());
            }
            activeGroupCalls.get(callId)!.add(fromUserId);
            console.log(`[Group Call] Added initiator ${fromUserId} to call ${callId}`);
          } catch (error) {
            console.error(`[Group Call] Error getting group members for group ${groupId}:`, error);
          }
        }

        // Handle group call join
        if (data.type === 'join_group_call' && ws.userId) {
          const { callId, groupId, fromUserId } = data.payload;
          const userId = fromUserId || ws.userId; // Use fromUserId from payload or fallback to ws.userId
          console.log(`[Group Call] User ${userId} joining group call ${callId}`);
          
          // Add user to the group call participants
          if (!activeGroupCalls.has(callId)) {
            activeGroupCalls.set(callId, new Set());
          }
          activeGroupCalls.get(callId)!.add(userId);
          
          // Get current participants list
          const participants = Array.from(activeGroupCalls.get(callId) || []);
          console.log(`[Group Call] Current participants in ${callId}:`, participants);
          
          try {
            // Get group members to notify
            const members = await storage.getConversationMembers(groupId);
            
            // Broadcast participant update to all group members
            for (const member of members) {
              const targetClient = clients.get(member.userId);
              if (targetClient && targetClient.readyState === targetClient.OPEN) {
                targetClient.send(JSON.stringify({
                  type: 'group_call_participants_update',
                  payload: {
                    callId,
                    participants,
                    newParticipant: userId
                  }
                }));
              }
            }
            console.log(`[Group Call] Broadcasted participant update for call ${callId}`);
          } catch (error) {
            console.error(`[Group Call] Error broadcasting participant update:`, error);
          }
        }

        // Handle call end
        if (data.type === 'end_call' && ws.userId) {
          const { callId, toUserId } = data.payload;
          console.log(`[Call] User ${ws.userId} ended call ${callId}`);
          
          // Check if it's a group call
          if (callId.includes('group_call_')) {
            const groupId = data.payload.groupId;
            
            // Find the correct active group call for this groupId
            let foundCallId = null;
            for (const [activeCallId, participants] of activeGroupCalls.entries()) {
              if (activeCallId.includes(`_${groupId}_`) && participants.has(ws.userId)) {
                foundCallId = activeCallId;
                break;
              }
            }
            
            if (foundCallId) {
              // Remove user from group call participants
              activeGroupCalls.get(foundCallId)!.delete(ws.userId);
              const remainingParticipants = activeGroupCalls.get(foundCallId)!.size;
              
              console.log(`[Group Call] User ${ws.userId} left call ${foundCallId}, ${remainingParticipants} participants remaining`);
              
              if (remainingParticipants === 0) {
                // No participants left, end the entire call
                activeGroupCalls.delete(foundCallId);
                console.log(`[Group Call] Removed empty group call ${foundCallId}`);
                
                broadcastToAll({
                  type: 'group_call_ended',
                  payload: { 
                    callId: foundCallId,
                    endedByUserId: ws.userId
                  }
                });
                console.log(`[Group Call] Broadcasted group call end for ${foundCallId}`);
              } else {
                // Some participants still remain, just notify user left
                broadcastToAll({
                  type: 'group_call_user_left',
                  userId: ws.userId,
                  roomId: groupId,
                  callType: data.payload.callType || 'audio'
                });
                console.log(`[Group Call] Broadcasted user ${ws.userId} left group call ${foundCallId}`);
              }
            } else {
              console.log(`[Group Call] No active group call found for user ${ws.userId} in group ${groupId}`);
            }
          } else {
            // For individual calls, notify specific user
            const targetClient = clients.get(toUserId);
            if (targetClient && targetClient.readyState === targetClient.OPEN) {
              targetClient.send(JSON.stringify({
                type: 'call_ended',
                payload: { callId }
              }));
              console.log(`[Call] Sent call ended notification to user ${toUserId}`);
            }
          }
        }

        // Handle WebRTC offer
        if (data.type === 'webrtc_offer' && ws.userId) {
          const { callId, offer } = data;
          console.log(`[WebRTC] Relaying offer for call ${callId}`);
          
          // Find the target user based on call participants
          clients.forEach((client, userId) => {
            if (userId !== ws.userId && client.readyState === client.OPEN) {
              client.send(JSON.stringify({
                type: 'webrtc_offer',
                callId,
                offer
              }));
            }
          });
        }

        // Handle WebRTC answer
        if (data.type === 'webrtc_answer' && ws.userId) {
          const { callId, answer } = data;
          console.log(`[WebRTC] Relaying answer for call ${callId}`);
          
          // Find the target user based on call participants
          clients.forEach((client, userId) => {
            if (userId !== ws.userId && client.readyState === client.OPEN) {
              client.send(JSON.stringify({
                type: 'webrtc_answer',
                callId,
                answer
              }));
            }
          });
        }

        // Handle WebRTC ICE candidate (both 1-on-1 and group calls)
        if (data.type === 'webrtc_ice_candidate' && ws.userId) {
          const { callId, candidate, targetUserId, fromUserId } = data.payload || data;
          console.log(`[WebRTC] Relaying ICE candidate for call ${callId} from ${fromUserId || ws.userId} to ${targetUserId || 'all'}`);
          
          if (targetUserId) {
            // Send to specific user (for group calls)
            const targetClient = clients.get(targetUserId);
            if (targetClient && targetClient.readyState === targetClient.OPEN) {
              targetClient.send(JSON.stringify({
                type: 'webrtc_ice_candidate',
                payload: {
                  callId,
                  candidate,
                  fromUserId: fromUserId || ws.userId
                }
              }));
              console.log(`[WebRTC] ICE candidate sent to user ${targetUserId}`);
            } else {
              console.log(`[WebRTC] Target user ${targetUserId} not found or not connected`);
            }
          } else {
            // Broadcast to all participants (fallback for 1-on-1 calls)
            let sentCount = 0;
            clients.forEach((client, userId) => {
              if (userId !== ws.userId && client.readyState === client.OPEN) {
                client.send(JSON.stringify({
                  type: 'webrtc_ice_candidate',
                  callId,
                  candidate
                }));
                sentCount++;
              }
            });
            console.log(`[WebRTC] ICE candidate broadcast to ${sentCount} participants`);
          }
        }

        // Handle group call WebRTC offer
        if (data.type === 'group_webrtc_offer' && ws.userId) {
          const { callId, offer, targetUserId, fromUserId } = data.payload;
          console.log(`[Group WebRTC] Relaying offer for call ${callId} from ${fromUserId} to ${targetUserId}`);
          
          const targetClient = clients.get(targetUserId);
          if (targetClient && targetClient.readyState === targetClient.OPEN) {
            targetClient.send(JSON.stringify({
              type: 'group_webrtc_offer',
              payload: {
                callId,
                offer,
                fromUserId
              }
            }));
          }
        }

        // Handle group call WebRTC answer
        if (data.type === 'group_webrtc_answer' && ws.userId) {
          const { callId, answer, targetUserId, fromUserId } = data.payload;
          console.log(`[Group WebRTC] Relaying answer for call ${callId} from ${fromUserId} to ${targetUserId}`);
          
          const targetClient = clients.get(targetUserId);
          if (targetClient && targetClient.readyState === targetClient.OPEN) {
            targetClient.send(JSON.stringify({
              type: 'group_webrtc_answer',
              payload: {
                callId,
                answer,
                fromUserId
              }
            }));
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



  // Group Management API Routes
  
  // Get group information
  app.get('/api/group-info/:groupId', isAuthenticated, async (req: any, res) => {
    try {
      const groupId = parseInt(req.params.groupId);
      const userId = req.session?.user?.id;
      
      if (!groupId || !userId) {
        return res.status(400).json({ message: 'Invalid group ID or user ID' });
      }
      
      // Get group conversation
      const conversation = await storage.getConversation(groupId);
      if (!conversation || !conversation.isGroup) {
        return res.status(404).json({ message: 'Group not found' });
      }
      
      // Check if user is member
      const membership = await storage.getConversationMembership(userId, groupId);
      if (!membership) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // Get member count
      const members = await storage.getConversationMembers(groupId);
      
      res.json({
        id: conversation.id,
        name: conversation.name,
        description: conversation.description,
        createdAt: conversation.createdAt,
        memberCount: members.length,
        isAdmin: membership.role === 'admin',
        classification: conversation.classification
      });
    } catch (error) {
      console.error('Error getting group info:', error);
      res.status(500).json({ message: 'Failed to get group info' });
    }
  });
  
  // Get group members
  app.get('/api/group-members/:groupId', isAuthenticated, async (req: any, res) => {
    try {
      const groupId = parseInt(req.params.groupId);
      const userId = req.session?.user?.id;
      
      if (!groupId || !userId) {
        return res.status(400).json({ message: 'Invalid group ID or user ID' });
      }
      
      // Check if user is member
      const membership = await storage.getConversationMembership(userId, groupId);
      if (!membership) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const members = await storage.getConversationMembers(groupId);
      
      // Get user details and online status
      const memberDetails = await Promise.all(
        members.map(async (member) => {
          const user = await storage.getUser(member.userId);
          return {
            id: user?.id,
            callsign: user?.callsign,
            fullName: user?.fullName,
            role: member.role,
            joinedAt: member.joinedAt,
            isOnline: clients.has(member.userId)
          };
        })
      );
      
      res.json(memberDetails);
    } catch (error) {
      console.error('Error getting group members:', error);
      res.status(500).json({ message: 'Failed to get group members' });
    }
  });
  
  // Update group name
  app.patch('/api/groups/:groupId/name', isAuthenticated, async (req: any, res) => {
    try {
      const groupId = parseInt(req.params.groupId);
      const userId = req.session?.user?.id;
      const { name } = req.body;
      
      if (!groupId || !userId || !name?.trim()) {
        return res.status(400).json({ message: 'Invalid data' });
      }
      
      // Check if user is admin
      const membership = await storage.getConversationMembership(userId, groupId);
      if (!membership || membership.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }
      
      await storage.updateConversation(groupId, { name: name.trim() });
      
      // Broadcast group update to all members
      await broadcastGroupUpdate(groupId, 'name_updated', { name: name.trim() });
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating group name:', error);
      res.status(500).json({ message: 'Failed to update group name' });
    }
  });
  
  // Update group description
  app.patch('/api/groups/:groupId/description', isAuthenticated, async (req: any, res) => {
    try {
      const groupId = parseInt(req.params.groupId);
      const userId = req.session?.user?.id;
      const { description } = req.body;
      
      if (!groupId || !userId) {
        return res.status(400).json({ message: 'Invalid data' });
      }
      
      // Check if user is admin
      const membership = await storage.getConversationMembership(userId, groupId);
      if (!membership || membership.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }
      
      await storage.updateConversation(groupId, { description: description?.trim() || null });
      
      // Broadcast group update to all members
      await broadcastGroupUpdate(groupId, 'description_updated', { description: description?.trim() || null });
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating group description:', error);
      res.status(500).json({ message: 'Failed to update group description' });
    }
  });
  
  // Add members to group
  app.post('/api/groups/:groupId/members', isAuthenticated, async (req: any, res) => {
    try {
      const groupId = parseInt(req.params.groupId);
      const userId = req.session?.user?.id;
      const { userIds } = req.body;
      
      if (!groupId || !userId || !Array.isArray(userIds)) {
        return res.status(400).json({ message: 'Invalid data' });
      }
      
      // Check if user is admin
      const membership = await storage.getConversationMembership(userId, groupId);
      if (!membership || membership.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }
      
      // Add users to group
      const addedMembers = [];
      for (const targetUserId of userIds) {
        const existingMembership = await storage.getConversationMembership(targetUserId, groupId);
        if (!existingMembership) {
          await storage.addConversationMember(targetUserId, groupId, 'member');
          addedMembers.push(targetUserId);
        }
      }
      
      // Broadcast group update to all members
      if (addedMembers.length > 0) {
        await broadcastGroupUpdate(groupId, 'members_added', { addedMembers });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error adding group members:', error);
      res.status(500).json({ message: 'Failed to add group members' });
    }
  });
  
  // Remove member from group
  app.delete('/api/groups/:groupId/members/:memberId', isAuthenticated, async (req: any, res) => {
    try {
      const groupId = parseInt(req.params.groupId);
      const memberId = parseInt(req.params.memberId);
      const userId = req.session?.user?.id;
      
      if (!groupId || !memberId || !userId) {
        return res.status(400).json({ message: 'Invalid data' });
      }
      
      // Check if user is admin
      const membership = await storage.getConversationMembership(userId, groupId);
      if (!membership || membership.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }
      
      // Can't remove yourself
      if (memberId === userId) {
        return res.status(400).json({ message: 'Cannot remove yourself' });
      }
      
      await storage.removeConversationMember(memberId, groupId);
      
      // Broadcast group update to all members
      await broadcastGroupUpdate(groupId, 'member_removed', { removedMemberId: memberId });
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error removing group member:', error);
      res.status(500).json({ message: 'Failed to remove group member' });
    }
  });
  
  // Change member role
  app.patch('/api/groups/:groupId/members/:memberId/role', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const groupId = parseInt(req.params.groupId);
      const memberId = parseInt(req.params.memberId);
      const userId = req.session?.user?.id;
      const { role } = req.body;
      
      if (!groupId || !memberId || !userId || !['admin', 'member'].includes(role)) {
        return res.status(400).json({ message: 'Invalid data' });
      }
      
      // Check if user is admin
      const membership = await storage.getConversationMembership(userId, groupId);
      if (!membership || membership.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }
      
      // Can't change your own role
      if (memberId === userId) {
        return res.status(400).json({ message: 'Cannot change your own role' });
      }
      
      await storage.updateConversationMemberRole(memberId, groupId, role);
      
      // Broadcast group update to all members
      await broadcastGroupUpdate(groupId, 'member_role_changed', { memberId, newRole: role });
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error changing member role:', error);
      res.status(500).json({ message: 'Failed to change member role' });
    }
  });
  
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

  // Helper function to send message to specific user
  function sendToUser(userId: number, message: any) {
    const client = clients.get(userId);
    if (client && client.readyState === client.OPEN) {
      client.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  // WebRTC HTTP API fallback endpoints
  app.post('/api/webrtc/offer', async (req: Request, res: Response) => {
    try {
      const { callId, targetUserId, offer } = req.body;
      
      console.log(`[HTTP API] Received WebRTC offer for call ${callId}, target user ${targetUserId}`);
      
      // Send WebRTC offer to target user via WebSocket
      const message = {
        type: 'webrtc_offer',
        callId,
        offer
      };
      
      sendToUser(targetUserId, message);
      console.log(`[HTTP API] Sent WebRTC offer to user ${targetUserId}`);
      
      res.json({ success: true });
    } catch (error) {
      console.error('[HTTP API] Error handling WebRTC offer:', error);
      res.status(500).json({ message: 'Failed to send WebRTC offer' });
    }
  });
  
  app.post('/api/webrtc/answer', async (req: Request, res: Response) => {
    try {
      const { callId, targetUserId, answer } = req.body;
      
      console.log(`[HTTP API] Received WebRTC answer for call ${callId}, target user ${targetUserId}`);
      
      // Send WebRTC answer to target user via WebSocket
      const message = {
        type: 'webrtc_answer',
        callId,
        answer
      };
      
      sendToUser(targetUserId, message);
      console.log(`[HTTP API] Sent WebRTC answer to user ${targetUserId}`);
      
      res.json({ success: true });
    } catch (error) {
      console.error('[HTTP API] Error handling WebRTC answer:', error);
      res.status(500).json({ message: 'Failed to send WebRTC answer' });
    }
  });
  
  app.post('/api/webrtc/ice-candidate', async (req: Request, res: Response) => {
    try {
      const { callId, targetUserId, candidate } = req.body;
      
      console.log(`[HTTP API] Received ICE candidate for call ${callId}, target user ${targetUserId}`);
      
      // Send ICE candidate to target user via WebSocket
      const message = {
        type: 'webrtc_ice_candidate',
        callId,
        candidate
      };
      
      sendToUser(targetUserId, message);
      console.log(`[HTTP API] Sent ICE candidate to user ${targetUserId}`);
      
      res.json({ success: true });
    } catch (error) {
      console.error('[HTTP API] Error handling ICE candidate:', error);
      res.status(500).json({ message: 'Failed to send ICE candidate' });
    }
  });

  return httpServer;
}
