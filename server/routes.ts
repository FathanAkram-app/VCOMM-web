import type { Express, Request } from "express";
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

interface AuthenticatedWebSocket extends WebSocket {
  userId?: number;
}

// Type for requests with authenticated user
interface AuthRequest extends Request {
  session: {
    user?: any;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes are defined in auth.ts

  // Rooms (group chats) routes
  app.get('/api/rooms', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const userId = req.session.user.id;
      const rooms = await storage.getUserRooms(userId);
      res.json(rooms);
    } catch (error) {
      console.error("Error fetching rooms:", error);
      res.status(500).json({ message: "Failed to fetch rooms" });
    }
  });
  
  // Direct chats routes
  app.get('/api/direct-chats', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const userId = req.session.user.id;
      const directChats = await storage.getUserDirectChats(userId);
      res.json(directChats);
    } catch (error) {
      console.error("Error fetching direct chats:", error);
      res.status(500).json({ message: "Failed to fetch direct chats" });
    }
  });
  
  // All conversations (both rooms and direct chats)
  app.get('/api/conversations', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const userId = req.session.user.id;
      const conversations = await storage.getUserConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });
  
  // Get single conversation
  app.get('/api/conversations/:id', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const userId = req.session.user.id;
      
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
      
      // Check if user is a member of this conversation
      if (!memberIds.includes(userId)) {
        return res.status(403).json({ message: "You are not a member of this conversation" });
      }
      
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

  // Create a new room (group chat)
  app.post('/api/rooms', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const userId = req.session.user.id;
      const parseResult = insertRoomSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid room data",
          errors: parseResult.error.format()
        });
      }
      
      // Create the room
      const room = await storage.createRoom({
        ...parseResult.data
      });
      
      // Add creator as a member
      await storage.addMemberToRoom({
        roomId: room.id,
        userId: userId
      });
      
      res.status(201).json(room);
    } catch (error) {
      console.error("Error creating room:", error);
      res.status(500).json({ message: "Failed to create room" });
    }
  });
  
  // Create a new direct chat
  app.post('/api/direct-chats', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const userId = req.session.user.id;
      const parseResult = insertDirectChatSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid direct chat data",
          errors: parseResult.error.format()
        });
      }
      
      // Check if a direct chat already exists between these users
      const otherUserId = parseResult.data.user2Id;
      
      // Create the direct chat
      const directChat = await storage.createDirectChat({
        user1Id: userId,
        user2Id: otherUserId
      });
      
      res.status(201).json(directChat);
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
      
      const messages = await storage.getMessagesByConversation(conversationId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post('/api/messages', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const userId = req.session.user.id;
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
  
  // WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store active connections
  const clients = new Map<number, AuthenticatedWebSocket>();
  
  wss.on('connection', (ws: AuthenticatedWebSocket) => {
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString()) as WebSocketMessage;
        
        // Handle authentication message
        if (data.type === 'auth' || data.type === 'new_message' || data.type === 'user_status' || data.type === 'typing' || data.type === 'read_receipt') {
          const { userId } = data.payload;
          if (userId) {
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

  return httpServer;
}
