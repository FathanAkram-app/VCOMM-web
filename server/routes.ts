import express, { type Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { cmsStorage } from "./storage-cms";
import { setupAuth, isAuthenticated } from "./auth";
import { 
  WebSocketMessage, 
  insertMessageSchema,
  insertConversationSchema,
  insertConversationMemberSchema
} from "@shared/schema";
import { upload, getAttachmentType, handleUploadError, compressUploadedMedia } from "./uploads";
import path from "path";
import * as fs from "fs";

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
  
  // Update user status
  app.post('/api/auth/update-status', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const { status } = req.body;
      if (!status || !['online', 'busy', 'away', 'offline'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }
      
      await storage.updateUserStatus(userId, status);
      res.json({ message: 'Status updated successfully', status });
    } catch (error) {
      console.error('Error updating user status:', error);
      res.status(500).json({ message: 'Failed to update status' });
    }
  });

  // Change password
  app.post('/api/auth/change-password', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current password and new password are required' });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters long' });
      }
      
      const result = await storage.changeUserPassword(userId, currentPassword, newPassword);
      if (!result.success) {
        return res.status(400).json({ message: result.message });
      }
      
      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      console.error('Error changing password:', error);
      res.status(500).json({ message: 'Failed to change password' });
    }
  });
  
  // Serve static uploads
  app.use('/uploads', isAuthenticated, express.static(path.join(process.cwd(), 'uploads')));
  
  // Upload file attachment
  app.post('/api/attachments/upload', isAuthenticated, upload.single('file'), handleUploadError, compressUploadedMedia, async (req: any, res: Response) => {
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
      
      // PERBAIKAN: Cek conversation yang sudah ada (termasuk yang disembunyikan)
      console.log(`[API] Checking for existing direct chat between users ${userId} and ${otherUserId}`);
      
      // Pertama, cek conversation yang terlihat
      const userConversations = await storage.getUserConversations(userId);
      const directChats = userConversations.filter(c => c.isGroup === false);
      console.log(`[API] User ${userId} has ${directChats.length} visible direct chats`);
      
      let existingChat = null;
      
      // Cek direct chat yang terlihat
      for (const chat of directChats) {
        const members = await storage.getConversationMembers(chat.id);
        const memberIds = members.map(m => m.userId);
        
        if (memberIds.length === 2 && 
            memberIds.includes(userId) && 
            memberIds.includes(otherUserId)) {
          existingChat = chat;
          console.log(`[API] Found existing visible conversation ${chat.id} between users ${userId} and ${otherUserId}`);
          break;
        }
      }
      
      // Jika tidak ada conversation yang terlihat, cek conversation yang disembunyikan
      if (!existingChat) {
        console.log(`[API] Checking for hidden direct chat between users ${userId} and ${otherUserId}`);
        const hiddenChat = await storage.findHiddenDirectChatBetweenUsers(userId, otherUserId);
        
        if (hiddenChat) {
          console.log(`[API] Found hidden conversation ${hiddenChat.id}, restoring it for user ${userId}`);
          // Kembalikan conversation yang disembunyikan
          await storage.unhideConversationForUser(userId, hiddenChat.id);
          existingChat = hiddenChat;
        }
      }
      
      // Jika sudah ada conversation (visible atau restored), gunakan yang ada
      if (existingChat) {
        console.log(`[API] Using existing/restored direct chat ${existingChat.id} between users ${userId} and ${otherUserId}`);
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
  // Test broadcast endpoint
  app.post('/api/test-broadcast', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const conversationId = parseInt(req.body.conversationId) || 41;
      const testMessage = {
        type: 'new_message',
        payload: {
          id: 999999,
          content: 'Test notification message',
          conversationId: conversationId,
          senderId: req.session?.user?.id || 1,
          senderName: 'Test User',
          timestamp: new Date().toISOString()
        }
      };
      
      console.log(`[TEST BROADCAST] Sending test notification to conversation ${conversationId}`);
      console.log(`[TEST BROADCAST] Connected clients: ${clients.size}`);
      
      // Broadcast to all connected clients
      clients.forEach((client, userId) => {
        if (client.readyState === WebSocket.OPEN) {
          try {
            client.send(JSON.stringify(testMessage));
            console.log(`[TEST BROADCAST] Sent to user ${userId}`);
          } catch (error) {
            console.error(`[TEST BROADCAST] Failed to send to user ${userId}:`, error);
          }
        }
      });
      
      res.json({ success: true, message: 'Test broadcast sent', clientCount: clients.size });
    } catch (error) {
      console.error('Error sending test broadcast:', error);
      res.status(500).json({ error: 'Failed to send test broadcast' });
    }
  });

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

  // Mark conversation messages as read
  app.post('/api/conversations/:id/mark-read', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const userId = req.session?.user?.id;
      const conversationId = parseInt(req.params.id);
      
      if (!userId) {
        return res.status(400).json({ message: "User ID not found in session" });
      }
      
      if (isNaN(conversationId)) {
        return res.status(400).json({ message: "Invalid conversation ID" });
      }
      
      console.log(`[API] Marking messages as read for user ${userId} in conversation ${conversationId}`);
      
      // Mark messages as read
      await storage.markConversationMessagesAsRead(conversationId, userId);
      
      res.json({ success: true, message: "Messages marked as read" });
    } catch (error) {
      console.error("Error marking messages as read:", error);
      res.status(500).json({ message: "Failed to mark messages as read" });
    }
  });

  // Messages routes
  app.get('/api/conversations/:id/messages', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const userId = req.session?.user?.id;
      
      if (isNaN(conversationId)) {
        return res.status(400).json({ message: "Invalid conversation ID" });
      }
      
      if (!userId) {
        return res.status(400).json({ message: "User ID not found in session" });
      }
      
      // Get messages filtered for this specific user (excluding messages they deleted)
      const messages = await storage.getMessagesByConversationForUser(conversationId, userId);
      
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
      console.log(`[BROADCAST] Sending notification for message ${message.id} to conversation ${message.conversationId}`);
      console.log(`[BROADCAST] Current WebSocket clients count: ${clients.size}`);
      console.log(`[BROADCAST] Message sender: ${userId}`);
      console.log(`[BROADCAST] Message content: ${message.content}`);
      
      // Log all connected clients
      const connectedClientIds = Array.from(clients.keys());
      console.log(`[BROADCAST] Connected client IDs: [${connectedClientIds.join(', ')}]`);
      
      const wsMessage: WebSocketMessage = {
        type: 'new_message',
        payload: message
      };
      
      console.log(`[BROADCAST] WebSocket message payload:`, JSON.stringify(wsMessage, null, 2));
      
      // Broadcast only to conversation members (more efficient)
      await broadcastToConversation(message.conversationId, wsMessage);
      console.log(`[BROADCAST] Notification sent successfully`);
      
      res.status(201).json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({ message: "Failed to create message" });
    }
  });
  
  // Hide conversation endpoint - only hide from user's view, don't delete history
  app.post('/api/conversations/:id/hide', isAuthenticated, async (req: AuthRequest, res) => {
    console.log('[DEBUG] HIDE conversation endpoint reached');
    
    try {
      const conversationId = parseInt(req.params.id);
      const userId = req.session?.user?.id;
      
      if (!userId) {
        console.log('[DEBUG] No user ID in session');
        return res.status(401).json({ message: "Authentication required" });
      }
      
      console.log(`[API] User ${userId} attempting to hide conversation ${conversationId}`);
      
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
      
      // Hide conversation from user's list (set isHidden = true)
      await storage.hideConversationForUser(userId, conversationId);
      
      res.json({ message: "Conversation hidden successfully" });
    } catch (error) {
      console.error("Error hiding conversation:", error);
      res.status(500).json({ message: "Failed to hide conversation" });
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
  
  // Clear chat history endpoint - only clear for the requesting user
  app.post('/api/conversations/:id/clear', isAuthenticated, async (req: AuthRequest, res) => {
    console.log('[DEBUG] CLEAR endpoint reached');
    
    try {
      const conversationId = parseInt(req.params.id);
      const userId = req.session?.user?.id;
      
      if (!userId) {
        console.log('[DEBUG] No user ID in session for clear');
        return res.status(401).json({ message: "Authentication required" });
      }
      
      console.log(`[API] User ${userId} attempting to clear conversation ${conversationId} for themselves only`);
      
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
      
      // Clear chat history only for this user (personal clear)
      await storage.clearChatHistoryForUser(userId, conversationId);
      
      res.json({ message: "Chat history cleared for you only. Other participants still have their chat history." });
    } catch (error) {
      console.error("Error clearing chat history:", error);
      res.status(500).json({ message: "Failed to clear chat history" });
    }
  });

  // Public endpoints for registration (without authentication)
  app.get("/api/public/ranks", async (req, res) => {
    try {
      const { branch } = req.query;
      let ranks;
      
      if (branch) {
        ranks = await cmsStorage.getRanksByBranch(branch as string);
      } else {
        ranks = await cmsStorage.getAllRanks();
      }
      
      res.json(ranks);
    } catch (error) {
      console.error("Error fetching public ranks:", error);
      res.status(500).json({ message: "Failed to fetch ranks" });
    }
  });

  app.get("/api/public/branches", async (req, res) => {
    try {
      const branches = await cmsStorage.getAllBranches();
      res.json(branches);
    } catch (error) {
      console.error("Error fetching public branches:", error);
      res.status(500).json({ message: "Failed to fetch branches" });
    }
  });

  // Call history route
  app.get('/api/call-history', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      console.log(`[API] Fetching call history for user ${userId}`);
      
      // Disable caching to ensure fresh data
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      // Get call history from storage
      const callHistory = await storage.getCallHistory(userId);
      const historyArray = callHistory || [];
      console.log(`[API] Found ${historyArray.length} call history entries for user ${userId}`);
      
      res.json(historyArray);
    } catch (error) {
      console.error("Error fetching call history:", error);
      res.status(500).json({ message: "Failed to fetch call history" });
    }
  });

  // Delete call history entry
  app.delete('/api/call-history/:id', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const userId = req.session?.user?.id;
      const callId = parseInt(req.params.id);
      
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      if (isNaN(callId)) {
        return res.status(400).json({ message: "Invalid call ID" });
      }
      
      await storage.deleteCallHistory(callId, userId);
      res.json({ message: "Call history deleted successfully" });
    } catch (error) {
      console.error("Error deleting call history:", error);
      res.status(500).json({ message: "Failed to delete call history" });
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

  // User Settings endpoints
  app.get('/api/user-settings', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      console.log('[API] Fetching settings for user:', userId);
      const settings = await storage.getUserSettings(userId);
      res.json(settings);
    } catch (error) {
      console.error('[API] Error fetching user settings:', error);
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  });

  app.put('/api/user-settings', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const settings = req.body;
      console.log('[API] Updating settings for user:', userId);
      
      const updatedSettings = await storage.updateUserSettings(userId, settings);
      res.json(updatedSettings);
    } catch (error) {
      console.error('[API] Error updating user settings:', error);
      res.status(500).json({ error: 'Failed to update settings' });
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

  // CMS Admin routes (protected)
  const isAdmin = async (req: any, res: any, next: any) => {
    try {
      const user = req.user?.claims || req.session?.user;
      if (!user || !user.id) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Get user data from database to check current role
      const userRecord = await storage.getUser(user.id);
      if (!userRecord || (userRecord.role !== 'admin' && userRecord.role !== 'super_admin')) {
        return res.status(403).json({ message: "Admin access required" });
      }

      next();
    } catch (error) {
      console.error("Error checking admin status:", error);
      res.status(500).json({ message: "Failed to verify admin status" });
    }
  };

  // System Configuration routes
  app.get("/api/admin/config", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const configs = await cmsStorage.getAllConfigs();
      res.json(configs);
    } catch (error) {
      console.error("Error fetching configs:", error);
      res.status(500).json({ message: "Failed to fetch configurations" });
    }
  });

  app.put("/api/admin/config/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { configValue } = req.body;
      const user = req.user?.claims || req.session?.user;
      const config = await cmsStorage.updateConfig(parseInt(id), { configValue });
      
      // Log admin activity
      await cmsStorage.logAdminActivity({
        adminId: user.id || user.sub,
        action: 'UPDATE_CONFIG',
        targetTable: 'system_config',
        targetId: id,
        newData: { configValue },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      res.json(config);
    } catch (error) {
      console.error("Error updating config:", error);
      res.status(500).json({ message: "Failed to update configuration" });
    }
  });

  // Military Ranks routes
  app.get("/api/admin/ranks", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const ranks = await cmsStorage.getAllRanks();
      res.json(ranks);
    } catch (error) {
      console.error("Error fetching ranks:", error);
      res.status(500).json({ message: "Failed to fetch ranks" });
    }
  });

  app.post("/api/admin/ranks", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const rank = await cmsStorage.createRank(req.body);
      const user = req.user?.claims || req.session?.user;
      
      await cmsStorage.logAdminActivity({
        adminId: user.id || user.sub,
        action: 'CREATE_RANK',
        targetTable: 'military_ranks',
        targetId: rank.id.toString(),
        newData: req.body,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      res.json(rank);
    } catch (error) {
      console.error("Error creating rank:", error);
      res.status(500).json({ message: "Failed to create rank" });
    }
  });

  app.put("/api/admin/ranks/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const user = req.user?.claims || req.session?.user;
      const rank = await cmsStorage.updateRank(parseInt(id), req.body);
      
      await cmsStorage.logAdminActivity({
        adminId: user.id || user.sub,
        action: 'UPDATE_RANK',
        targetTable: 'military_ranks',
        targetId: id,
        newData: req.body,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      res.json(rank);
    } catch (error) {
      console.error("Error updating rank:", error);
      res.status(500).json({ message: "Failed to update rank" });
    }
  });

  app.delete("/api/admin/ranks/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const user = req.user?.claims || req.session?.user;
      
      await cmsStorage.deleteRank(parseInt(id));
      
      await cmsStorage.logAdminActivity({
        adminId: user.id || user.sub,
        action: 'DELETE_RANK',
        targetTable: 'military_ranks',
        targetId: id,
        newData: {},
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting rank:", error);
      res.status(500).json({ message: "Failed to delete rank" });
    }
  });

  // Military Branches routes
  app.get("/api/admin/branches", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const branches = await cmsStorage.getAllBranches();
      res.json(branches);
    } catch (error) {
      console.error("Error fetching branches:", error);
      res.status(500).json({ message: "Failed to fetch branches" });
    }
  });

  app.post("/api/admin/branches", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const branch = await cmsStorage.createBranch(req.body);
      const user = req.user?.claims || req.session?.user;
      
      await cmsStorage.logAdminActivity({
        adminId: user.id || user.sub,
        action: 'CREATE_BRANCH',
        targetTable: 'military_branches',
        targetId: branch.id.toString(),
        newData: req.body,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      res.json(branch);
    } catch (error) {
      console.error("Error creating branch:", error);
      res.status(500).json({ message: "Failed to create branch" });
    }
  });

  app.put("/api/admin/branches/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const user = req.user?.claims || req.session?.user;
      const branch = await cmsStorage.updateBranch(parseInt(id), req.body);
      
      await cmsStorage.logAdminActivity({
        adminId: user.id || user.sub,
        action: 'UPDATE_BRANCH',
        targetTable: 'military_branches',
        targetId: id,
        newData: req.body,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      res.json(branch);
    } catch (error) {
      console.error("Error updating branch:", error);
      res.status(500).json({ message: "Failed to update branch" });
    }
  });

  app.delete("/api/admin/branches/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const user = req.user?.claims || req.session?.user;
      
      await cmsStorage.deleteBranch(parseInt(id));
      
      await cmsStorage.logAdminActivity({
        adminId: user.id || user.sub,
        action: 'DELETE_BRANCH',
        targetTable: 'military_branches',
        targetId: id,
        newData: {},
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting branch:", error);
      res.status(500).json({ message: "Failed to delete branch" });
    }
  });

  // User Management Routes
  app.get("/api/admin/users", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const users = await cmsStorage.getAllUsersForAdmin();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.put("/api/admin/users/:id/role", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      const user = req.user?.claims || req.session?.user;
      
      const updatedUser = await cmsStorage.updateUserRole(parseInt(id), role);
      
      // Log admin activity
      await cmsStorage.logAdminActivity({
        adminId: user.id || user.sub,
        action: 'UPDATE_USER_ROLE',
        targetTable: 'users',
        targetId: id,
        newData: { role },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.put("/api/admin/users/:id/status", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const user = req.user?.claims || req.session?.user;
      
      const updatedUser = await cmsStorage.updateUserStatus(parseInt(id), status);
      
      // Log admin activity
      await cmsStorage.logAdminActivity({
        adminId: user.id || user.sub,
        action: 'UPDATE_USER_STATUS',
        targetTable: 'users',
        targetId: id,
        newData: { status },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user status:", error);
      res.status(500).json({ message: "Failed to update user status" });
    }
  });

  app.delete("/api/admin/users/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const user = req.user?.claims || req.session?.user;
      
      await cmsStorage.deleteUser(parseInt(id));
      
      // Log admin activity
      await cmsStorage.logAdminActivity({
        adminId: user.id || user.sub,
        action: 'DELETE_USER',
        targetTable: 'users',
        targetId: id,
        newData: {},
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Dashboard Statistics
  app.get("/api/admin/dashboard/stats", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const stats = await cmsStorage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard statistics" });
    }
  });

  // System Health
  app.get("/api/admin/dashboard/health", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const health = await cmsStorage.getSystemHealth();
      res.json(health);
    } catch (error) {
      console.error("Error fetching system health:", error);
      res.status(500).json({ message: "Failed to fetch system health" });
    }
  });

  // Security Events
  app.get("/api/admin/dashboard/security", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const events = await cmsStorage.getSecurityEvents();
      res.json(events);
    } catch (error) {
      console.error("Error fetching security events:", error);
      res.status(500).json({ message: "Failed to fetch security events" });
    }
  });

  // Admin Activity Logs
  app.get("/api/admin/logs", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const logs = await cmsStorage.getAdminLogs(100);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching admin logs:", error);
      res.status(500).json({ message: "Failed to fetch admin logs" });
    }
  });

  // Admin Lapsit routes
  app.get("/api/admin/lapsit", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const lapsitReports = await cmsStorage.getAllLapsitReports();
      res.json(lapsitReports);
    } catch (error) {
      console.error("Error fetching lapsit reports:", error);
      res.status(500).json({ message: "Failed to fetch lapsit reports" });
    }
  });

  app.delete("/api/admin/lapsit/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const reportId = parseInt(req.params.id);
      await cmsStorage.deleteLapsitReport(reportId);
      
      // Log admin activity with proper admin ID
      const adminId = req.session?.user?.id || req.user?.id;
      if (adminId) {
        await cmsStorage.logAdminActivity(
          adminId,
          'DELETE_LAPSIT_REPORT',
          `Deleted lapsit report ID: ${reportId}`
        );
      }
      
      res.json({ message: "Lapsit report deleted successfully" });
    } catch (error) {
      console.error("Error deleting lapsit report:", error);
      res.status(500).json({ message: "Failed to delete lapsit report" });
    }
  });

  // User Management
  app.get("/api/admin/users", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const users = await cmsStorage.getAllUsersForAdmin();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.put("/api/admin/users/:id/role", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      const user = req.user?.claims || req.session?.user;
      
      const updatedUser = await cmsStorage.updateUserRole(parseInt(id), role);
      
      await cmsStorage.logAdminActivity({
        adminId: user.id || user.sub,
        action: 'UPDATE_USER_ROLE',
        targetTable: 'users',
        targetId: id,
        newData: { role },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Public config endpoint for menu visibility
  app.get("/api/config/menu", async (req, res) => {
    try {
      const menuConfigs = await cmsStorage.getAllConfigs();
      const menuSettings = menuConfigs
        .filter(config => config.category === 'menu')
        .reduce((acc, config) => {
          acc[config.configKey] = config.configValue === 'true';
          return acc;
        }, {} as Record<string, boolean>);
      
      res.json(menuSettings);
    } catch (error) {
      console.error("Error fetching menu config:", error);
      res.status(500).json({ message: "Failed to fetch menu configuration" });
    }
  });

  // Initialize default configs on server start
  (async () => {
    try {
      await cmsStorage.initializeDefaultConfigs();
      console.log('Default system configurations initialized');
    } catch (error) {
      console.error('Failed to initialize default configs:', error);
    }
  })();

  // Lapsit routes
  app.get('/api/lapsit/categories', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const categories = await storage.getLapsitCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching lapsit categories:", error);
      res.status(500).json({ message: "Failed to fetch lapsit categories" });
    }
  });

  app.post('/api/lapsit/reports', isAuthenticated, upload.single('image'), handleUploadError, compressUploadedMedia, async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.claims?.sub;
      console.log('[LAPSIT] User ID from auth:', userId);
      console.log('[LAPSIT] File received:', req.file ? req.file.originalname : 'No file');
      let attachmentUrl = null;
      let attachmentName = null;

      // Handle file upload if present
      if (req.file) {
        // File sudah tersimpan oleh multer disk storage
        // filename sudah dibuat secara unique oleh multer
        attachmentUrl = `/uploads/${req.file.filename}`;
        attachmentName = req.file.originalname;
        
        console.log(`File uploaded: ${req.file.filename} (original: ${req.file.originalname})`);
      }

      const reportData = {
        categoryId: parseInt(req.body.categoryId),
        subCategoryId: req.body.subCategoryId ? parseInt(req.body.subCategoryId) : null,
        title: req.body.title,
        content: req.body.content,
        priority: req.body.priority || 'normal',
        classification: req.body.classification || 'UNCLASSIFIED',
        location: req.body.location || null,
        attachmentUrl,
        attachmentName,
        reportedById: userId || 2
      };
      
      const report = await storage.createLapsitReport(reportData);
      res.json(report);
    } catch (error) {
      console.error("Error creating lapsit report:", error);
      res.status(500).json({ message: "Failed to create lapsit report" });
    }
  });



  app.get('/api/lapsit/reports', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      console.log('[API] Fetching lapsit reports for authenticated user');
      const userId = req.user?.claims?.sub;
      console.log(`[API] User ID from session: ${userId}`);
      const reports = await storage.getLapsitReports();
      console.log(`[API] Found ${reports.length} lapsit reports`);
      
      // Add CORS headers to ensure proper response
      res.header('Content-Type', 'application/json');
      res.header('Cache-Control', 'no-cache');
      res.json(reports);
    } catch (error) {
      console.error("Error fetching lapsit reports:", error);
      res.status(500).json({ message: "Failed to fetch lapsit reports" });
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
  
  // Track active sessions per user for single session enforcement
  const activeSessions = new Map<number, { sessionId: string, timestamp: number, ws?: AuthenticatedWebSocket }>();
  
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
        
        // Debug log specifically for group call messages
        if (data.type === 'start_group_call') {
          console.log('[DEBUG] ✅ START_GROUP_CALL message received:', JSON.stringify(data, null, 2));
        }
        
        // Handle authentication message
        if (data.type === 'auth') {
          const { userId } = data.payload;
          if (userId) {
            // Check for existing session - implement single session login
            const existingSession = activeSessions.get(userId);
            if (existingSession) {
              console.log(`[SINGLE SESSION] User ${userId} already has active session, terminating previous connection`);
              
              // Close existing WebSocket connection
              if (existingSession.ws && existingSession.ws.readyState === WebSocket.OPEN) {
                existingSession.ws.send(JSON.stringify({
                  type: 'session_terminated',
                  payload: {
                    reason: 'login_elsewhere',
                    message: 'Sesi Anda telah dihentikan karena Anda login dari perangkat lain'
                  }
                }));
                existingSession.ws.close();
                console.log(`[SINGLE SESSION] Closed previous WebSocket connection for user ${userId}`);
              }
              
              // Remove from clients map
              clients.delete(userId);
              console.log(`[SINGLE SESSION] Removed previous client for user ${userId}`);
            }
            
            // Generate new session ID
            const sessionId = `session_${userId}_${Date.now()}`;
            
            console.log(`User ${userId} authenticated via WebSocket with session ${sessionId}`);
            console.log(`[WebSocket] Current clients before adding: [${Array.from(clients.keys()).join(', ')}]`);
            
            ws.userId = userId;
            clients.set(userId, ws);
            activeSessions.set(userId, {
              sessionId,
              timestamp: Date.now(),
              ws
            });
            
            console.log(`[WebSocket] Current clients after adding: [${Array.from(clients.keys()).join(', ')}]`);
            console.log(`[WebSocket] User ${userId} WebSocket readyState: ${ws.readyState}`);
            console.log(`[SINGLE SESSION] Created new session ${sessionId} for user ${userId}`);
            
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
          
          // Get target user's name
          const targetUser = await storage.getUser(toUserId);
          const targetUserName = targetUser ? (targetUser.callsign || targetUser.fullName || 'Unknown') : 'Unknown';
          
          // Log call initiation
          await storage.addCallHistory({
            callId,
            callType,
            initiatorId: fromUserId,
            conversationId: null,
            participants: [fromUserId.toString(), toUserId.toString()],
            status: 'incoming',
            startTime: new Date(),
            endTime: null,
            duration: null
          });
          
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
            
            // Set timeout for unanswered calls (30 seconds)
            setTimeout(async () => {
              try {
                // Check if call is still in "incoming" status (not answered)
                const existingCall = await storage.getCallByCallId(callId);
                if (existingCall && existingCall.status === 'incoming') {
                  // Update to missed call status
                  await storage.updateCallStatus(callId, 'missed');
                  console.log(`[Call] Call ${callId} marked as missed (timeout)`);
                  
                  // Notify both users that call was missed
                  [fromUserId, toUserId].forEach(userId => {
                    const client = clients.get(userId);
                    if (client && client.readyState === client.OPEN) {
                      client.send(JSON.stringify({
                        type: 'call_missed',
                        payload: { callId, reason: 'timeout' }
                      }));
                    }
                  });
                }
              } catch (error) {
                console.error('[Call] Error handling call timeout:', error);
              }
            }, 30000); // 30 seconds timeout
          } else {
            // User is offline, log missed call
            await storage.addCallHistory({
              callId,
              callType,
              initiatorId: fromUserId,
              conversationId: null,
              participants: [fromUserId.toString(), toUserId.toString()],
              status: 'missed',
              startTime: new Date(),
              endTime: null,
              duration: null
            });
            
            // Send failure response
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
          
          // Update call history status to accepted
          await storage.updateCallStatus(callId, 'accepted');
          
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
          
          // Update call history status to rejected
          await storage.updateCallStatus(callId, 'rejected');
          
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
            console.log(`[Group Call] Checking ${members.length} members:`, members.map(m => ({ userId: m.userId, role: m.role })));
            console.log(`[Group Call] Connected clients:`, Array.from(clients.keys()));
            
            for (const member of members) {
              if (member.userId !== fromUserId) {
                const targetClient = clients.get(member.userId);
                console.log(`[Group Call] Checking member ${member.userId}: client=${!!targetClient}, readyState=${targetClient?.readyState}`);
                
                if (targetClient && targetClient.readyState === targetClient.OPEN) {
                  const inviteMessage = {
                    type: 'incoming_group_call',
                    payload: {
                      callId,
                      groupId,
                      groupName,
                      callType,
                      fromUserId,
                      fromUserName
                    }
                  };
                  
                  console.log(`[Group Call] 📤 Sending message to user ${member.userId}, WebSocket state: ${targetClient.readyState}`);
                  targetClient.send(JSON.stringify(inviteMessage));
                  invitationsSent++;
                  console.log(`[Group Call] ✅ Sent group call invitation to user ${member.userId}:`, inviteMessage);
                  console.log(`[Group Call] 📡 Message sent successfully to user ${member.userId}`);
                } else {
                  console.log(`[Group Call] ❌ Cannot send to user ${member.userId}: client=${!!targetClient}, readyState=${targetClient?.readyState || 'N/A'}`);
                }
              } else {
                console.log(`[Group Call] Skipping initiator ${member.userId}`);
              }
            }
            console.log(`[Group Call] Sent ${invitationsSent} group call invitations for call ${callId}`);
            
            // If no invitations were sent, notify the initiator
            if (invitationsSent === 0) {
              const initiatorClient = clients.get(fromUserId);
              if (initiatorClient && initiatorClient.readyState === initiatorClient.OPEN) {
                initiatorClient.send(JSON.stringify({
                  type: 'group_call_no_participants',
                  payload: {
                    callId,
                    message: 'No group members are currently online to receive the call invitation. Please try again when other members are active.'
                  }
                }));
                console.log(`[Group Call] ⚠️ Notified initiator ${fromUserId} that no members are online`);
              }
            }
            
            // Log group call initiation to call history
            await storage.addCallHistory({
              callId,
              callType: `group_${callType}`,
              initiatorId: fromUserId,
              conversationId: groupId,
              participants: [fromUserId.toString()],
              status: 'incoming',
              startTime: new Date(),
              endTime: null,
              duration: null
            });
            
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
          
          // Update participants in call history
          await storage.updateGroupCallParticipants(callId, participants.map(id => id.toString()));
          
          try {
            // Get group members to notify
            const members = await storage.getConversationMembers(groupId);
            
            // Broadcast participant update to all group members
            console.log(`[Group Call] Broadcasting participant update to ${members.length} members for call ${callId}`);
            console.log(`[Group Call] Participants to broadcast:`, participants);
            
            for (const member of members) {
              const targetClient = clients.get(member.userId);
              if (targetClient && targetClient.readyState === targetClient.OPEN) {
                const updateMessage = {
                  type: 'group_call_participants_update',
                  payload: {
                    callId,
                    participants,
                    newParticipant: userId
                  }
                };
                
                console.log(`[Group Call] 📤 Sending participants update to user ${member.userId}:`, updateMessage);
                targetClient.send(JSON.stringify(updateMessage));
                console.log(`[Group Call] ✅ Participants update sent to user ${member.userId}`);
              } else {
                console.log(`[Group Call] ❌ Cannot send participants update to user ${member.userId}: client=${!!targetClient}, readyState=${targetClient?.readyState || 'N/A'}`);
              }
            }
            
            // 🔥 NEW: Auto-initiate WebRTC connections for group calls
            // After broadcasting participants, automatically trigger WebRTC setup
            console.log(`[Group Call] 🚀 Auto-initiating WebRTC for ${participants.length} participants`);
            
            // Send WebRTC initiation signals to all participants
            for (const participantId of participants) {
              const participantClient = clients.get(participantId);
              if (participantClient && participantClient.readyState === participantClient.OPEN) {
                const webrtcInitMessage = {
                  type: 'initiate_group_webrtc',
                  payload: {
                    callId,
                    allParticipants: participants,
                    yourUserId: participantId
                  }
                };
                
                console.log(`[Group Call] 🎯 Sending WebRTC initiation to user ${participantId}`);
                participantClient.send(JSON.stringify(webrtcInitMessage));
              }
            }
            console.log(`[Group Call] Broadcasted participant update for call ${callId}`);
          } catch (error) {
            console.error(`[Group Call] Error broadcasting participant update:`, error);
          }
        }

        // Handle request for group participants update
        if (data.type === 'request_group_participants' && ws.userId) {
          const { callId, groupId, requestingUserId } = data.payload;
          console.log(`[Group Call] User ${requestingUserId} requesting participants for call ${callId}`);
          
          // Get current participants list
          const participants = Array.from(activeGroupCalls.get(callId) || []);
          console.log(`[Group Call] Current participants in ${callId}:`, participants);
          
          // Send participants update to requesting user
          if (participants.length > 0) {
            const updateMessage = {
              type: 'group_call_participants_update',
              payload: {
                callId,
                participants,
                requestResponse: true
              }
            };
            
            ws.send(JSON.stringify(updateMessage));
            console.log(`[Group Call] ✅ Sent participants update response to user ${requestingUserId}:`, updateMessage);
          } else {
            console.log(`[Group Call] ❌ No participants found for call ${callId}`);
          }
        }

        // Handle call end
        if (data.type === 'end_call' && ws.userId) {
          const { callId, toUserId } = data.payload;
          console.log(`[Call] User ${ws.userId} ended call ${callId}`);
          
          // Update call history status to ended
          await storage.updateCallStatus(callId, 'ended');
          
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
        console.log(`[WebSocket] User ${userId} disconnected`);
        console.log(`[WebSocket] Current clients before removing: [${Array.from(clients.keys()).join(', ')}]`);
        
        clients.delete(userId);
        
        // Clean up active session if this was the active WebSocket
        const activeSession = activeSessions.get(userId);
        if (activeSession && activeSession.ws === ws) {
          activeSessions.delete(userId);
          console.log(`[SINGLE SESSION] Removed active session for user ${userId}`);
        }
        
        console.log(`[WebSocket] Current clients after removing: [${Array.from(clients.keys()).join(', ')}]`);
        
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
      console.log(`[BROADCAST] Found ${members.length} members in conversation ${conversationId}`);
      console.log(`[BROADCAST] Member list: [${members.map(m => m.userId).join(', ')}]`);
      console.log(`[BROADCAST] Active WebSocket clients: ${clients.size}`);
      
      let sentCount = 0;
      const maxRetries = 3;
      
      for (const member of members) {
        const client = clients.get(member.userId);
        console.log(`[BROADCAST] Member ${member.userId}: client exists=${!!client}, connected=${client?.readyState === WebSocket.OPEN}`);
        
        if (client && client.readyState === WebSocket.OPEN) {
          let retryCount = 0;
          let messageSent = false;
          
          while (retryCount < maxRetries && !messageSent) {
            try {
              console.log(`[BROADCAST] Sending message to user ${member.userId} (attempt ${retryCount + 1}): ${JSON.stringify(message).substring(0, 100)}...`);
              client.send(JSON.stringify(message));
              sentCount++;
              messageSent = true;
              console.log(`[BROADCAST] ✅ Message sent to user ${member.userId}`);
            } catch (error) {
              retryCount++;
              console.log(`[BROADCAST] ⚠️ Send failed for user ${member.userId}, retry ${retryCount}/${maxRetries}`);
              
              if (retryCount < maxRetries) {
                // Wait 50ms before retry
                await new Promise(resolve => setTimeout(resolve, 50));
              }
            }
          }
          
          if (!messageSent) {
            console.log(`[BROADCAST] ❌ Failed to send to user ${member.userId} after ${maxRetries} attempts`);
          }
        } else {
          console.log(`[BROADCAST] ❌ Cannot send to user ${member.userId} - client not available or not connected`);
        }
      }
      
      console.log(`[BROADCAST] Successfully sent message to ${sentCount}/${members.length} members`);
      
      // Additional verification - check if all expected clients received the message
      if (sentCount < members.length) {
        console.log(`[BROADCAST] ⚠️ Not all members received message. Expected: ${members.length}, Sent: ${sentCount}`);
      }
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
      const { deleteForEveryone } = req.body;
      const userId = req.session?.user?.id;
      
      console.log(`[DELETE] Message ${messageId}, deleteForEveryone: ${deleteForEveryone}, userId: ${userId}`);
      console.log(`[DELETE] Request body:`, req.body);
      
      if (isNaN(messageId)) {
        return res.status(400).json({ message: "Invalid message ID" });
      }
      
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const message = await storage.getMessage(messageId);
      
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }
      
      // Check permissions for "delete for everyone"
      if (deleteForEveryone && message.senderId !== userId) {
        return res.status(403).json({ message: "You can only delete your own messages for everyone" });
      }
      
      if (deleteForEveryone) {
        // Delete for everyone - actually delete the message
        const deletedMessage = await storage.deleteMessage(messageId);
        
        // Send real-time notification about the deleted message
        const wsMessage: WebSocketMessage = {
          type: 'new_message',
          payload: {
            ...deletedMessage,
            action: 'delete_for_everyone'
          }
        };
        
        await broadcastToConversation(deletedMessage.conversationId, wsMessage);
        res.status(200).json({ message: "Message deleted for everyone", deletedMessage });
      } else {
        // Delete for me only - mark as deleted for this user
        await storage.markMessageAsDeletedForUser(messageId, userId);
        res.status(200).json({ message: "Message deleted for you" });
      }
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
