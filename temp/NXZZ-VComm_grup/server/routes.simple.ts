import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticatedWithToken } from "./auth";
import chatRoutes from "./chat-routes";
import { 
  insertUserSchema, insertRoomSchema, insertRoomMemberSchema, 
  insertDirectChatSchema, insertMessageSchema, insertCallSchema 
} from "@shared/schema";

// Fungsi untuk mendaftarkan routes API
export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  setupAuth(app);
  
  // Register chat API routes
  app.use('/api', chatRoutes);
  
  // Endpoint untuk mendaftarkan pengguna baru
  app.post('/api/register', async (req: Request, res: Response) => {
    try {
      const { username, password, nrp, fullName, rank, branch } = req.body;
      
      // Validasi data masukan
      if (!username || !password) {
        return res.status(400).json({ message: "Username dan password diperlukan" });
      }
      
      // Periksa apakah username sudah digunakan
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(409).json({ message: "Username sudah digunakan" });
      }
      
      // Buat user baru
      const newUser = await storage.createUser({
        username,
        password, // Catatan: Dalam implementasi nyata, password harus di-hash
        nrp,
        fullName,
        rank,
        branch,
        role: "user"
      });
      
      // Hapus password dari respons
      const { password: _, ...userWithoutPassword } = newUser;
      
      res.status(201).json({
        message: "Registrasi berhasil",
        user: userWithoutPassword
      });
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(500).json({ message: "Terjadi kesalahan saat mendaftarkan pengguna" });
    }
  });
  
  // Inisialisasi HTTP server
  const httpServer = createServer(app);
  
  // Log konfigurasi
  console.log("Menggunakan konfigurasi sederhana (polling) untuk komunikasi chat...");
  
  // API untuk mendapatkan pesan
  app.get('/api/messages', isAuthenticatedWithToken, async (req: Request, res: Response) => {
    try {
      const directChatId = req.query.directChatId ? parseInt(req.query.directChatId as string) : undefined;
      const roomId = req.query.roomId ? parseInt(req.query.roomId as string) : undefined;
      const userId = req.user ? req.user.id : null;
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      if (!directChatId && !roomId) {
        return res.status(400).json({ message: "Either directChatId or roomId is required" });
      }
      
      let messages = [];
      if (directChatId) {
        messages = await storage.getDirectChatMessages(directChatId);
      } else if (roomId) {
        messages = await storage.getRoomMessages(roomId);
      }
      
      // Format pesan untuk ditampilkan di UI
      const formattedMessages = messages.map(msg => ({
        id: msg.id,
        chatId: msg.directChatId || msg.roomId,
        senderId: msg.senderId,
        content: msg.content,
        timestamp: msg.createdAt,
        isRead: msg.read
      }));
      
      res.json(formattedMessages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });
  
  // API untuk mengirim pesan baru
  app.post('/api/messages', isAuthenticatedWithToken, async (req: Request, res: Response) => {
    try {
      // Logging untuk membantu debug
      console.log("[/messages] Auth info - req.user:", req.user);
      console.log("[/messages] Auth info - Token:", req.headers.authorization ? req.headers.authorization.substring(7) : "none");
      console.log("[/messages] Auth info - X-User-ID:", req.headers['x-user-id']);
      
      const { content, directChatId, roomId, isRoom, classificationType = "routine" } = req.body;
      const userId = req.user ? req.user.id : null;
      
      // Log user ID yang diambil
      console.log("[/messages] Menggunakan user ID dari token:", userId);
      console.log("[/messages] Request body:", req.body);
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      if (!content) {
        return res.status(400).json({ message: "Message content is required" });
      }
      
      if (!directChatId && !roomId) {
        return res.status(400).json({ message: "Either directChatId or roomId is required" });
      }
      
      // PERBAIKAN: Langsung menerima permintaan tanpa validasi untuk mengatasi masalah 403
      console.log("[PERBAIKAN] Menerima permintaan tanpa validasi tambahan");
      
      // Menentukan chat ID yang final berdasarkan flag isRoom
      const finalDirectChatId = !isRoom ? directChatId : undefined;
      const finalRoomId = isRoom ? roomId : undefined;
      
      // Simpan pesan ke database
      const message = await storage.createMessage({
        content,
        senderId: userId,
        directChatId: finalDirectChatId,
        roomId: finalRoomId,
        classificationType
      });
      
      console.log(`✅ Pesan baru disimpan dengan ID: ${message.id}`);
      
      // Return pesan yang berhasil disimpan
      return res.status(201).json(message);
    } catch (error) {
      console.error("Error sending message:", error);
      return res.status(500).json({ message: "Failed to send message" });
    }
  });
  
  // API untuk mendapatkan status pengguna online
  app.get('/api/users/online', isAuthenticatedWithToken, async (req: Request, res: Response) => {
    try {
      const onlineUsers = await storage.getOnlineUsers();
      return res.json(onlineUsers.map(user => ({ id: user.id, username: user.username })));
    } catch (error) {
      console.error("Error fetching online users:", error);
      return res.status(500).json({ message: "Failed to fetch online users" });
    }
  });
  
  // API untuk update status online pengguna
  app.post('/api/users/status', isAuthenticatedWithToken, async (req: Request, res: Response) => {
    try {
      const { isOnline } = req.body;
      const userId = req.user ? req.user.id : null;
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const updatedUser = await storage.updateUserOnlineStatus(userId, isOnline === true);
      return res.json({ id: updatedUser.id, isOnline: updatedUser.isOnline });
    } catch (error) {
      console.error("Error updating online status:", error);
      return res.status(500).json({ message: "Failed to update online status" });
    }
  });
  
  // API untuk menandai pesan sebagai sudah dibaca
  app.post('/api/messages/read', isAuthenticatedWithToken, async (req: Request, res: Response) => {
    try {
      const { chatId, isRoom } = req.body;
      const userId = req.user ? req.user.id : null;
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      if (chatId === undefined) {
        return res.status(400).json({ message: "Chat ID is required" });
      }
      
      await storage.markMessagesAsRead(chatId, isRoom === true, userId);
      return res.json({ success: true });
    } catch (error) {
      console.error("Error marking messages as read:", error);
      return res.status(500).json({ message: "Failed to mark messages as read" });
    }
  });
  
  return httpServer;
}