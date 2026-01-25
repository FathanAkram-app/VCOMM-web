import express, { type Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { cmsStorage } from "./storage-cms";
import { setupAuth, isAuthenticated, inMemoryUsers, inMemoryConversations, inMemoryConversationMembers, nextConversationId, inMemoryMessages, inMemoryConversationMessages, nextMessageId } from "./auth";
import {
  WebSocketMessage,
  insertMessageSchema,
  insertConversationSchema,
  insertConversationMemberSchema
} from "@shared/schema";
import { upload, getAttachmentType, handleUploadError, compressUploadedMedia } from "./uploads";
import path from "path";
import * as fs from "fs";

// Clean Architecture Imports
import { AuthService } from "./services/auth.service";
import { AuthController } from "./controllers/auth.controller";
import { createAuthRoutes } from "./routes/auth.routes";
import { UsersService } from "./services/users.service";
import { UsersController } from "./controllers/users.controller";
import { createUsersRoutes } from "./routes/users.routes";
import { ConversationsService } from "./services/conversations.service";
import { ConversationsController } from "./controllers/conversations.controller";
import { createConversationsRoutes } from "./routes/conversations.routes";
import { MessagesService } from "./services/messages.service";
import { MessagesController } from "./controllers/messages.controller";
import { createMessagesRoutes } from "./routes/messages.routes";
import { PublicService } from "./services/public.service";
import { PublicController } from "./controllers/public.controller";
import { createPublicRoutes } from "./routes/public.routes";
import { AttachmentsService } from "./services/attachments.service";
import { AttachmentsController } from "./controllers/attachments.controller";
import { createAttachmentsRoutes } from "./routes/attachments.routes";
import { CallHistoryService } from "./services/call-history.service";
import { CallHistoryController } from "./controllers/call-history.controller";
import { createCallHistoryRoutes } from "./routes/call-history.routes";
import { AdminService } from "./services/admin.service";
import { AdminController } from "./controllers/admin.controller";
import { createAdminRoutes } from "./routes/admin.routes";
import { LapsitService } from "./services/lapsit.service";
import { LapsitController } from "./controllers/lapsit.controller";
import { createLapsitRoutes } from "./routes/lapsit.routes";
import { createIsAdminMiddleware } from "./middleware/admin.middleware";
import { GroupsService } from "./services/groups.service";
import { GroupsController } from "./controllers/groups.controller";
import { createGroupsRoutes } from "./routes/groups.routes";
import { WebRTCService } from "./services/webrtc.service";
import { WebRTCController } from "./controllers/webrtc.controller";
import { createWebRTCRoutes } from "./routes/webrtc.routes";
import { FCMController } from "./controllers/fcm.controller";
import { setupWebSocketServer } from "./websocket/websocket-server";
import gotifyRoutes from "./routes/gotify.routes";
import userGotifyRoutes from "./routes/user-gotify.routes";

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

  // Initialize services and controllers (Clean Architecture)
  const authService = new AuthService(storage);
  const authController = new AuthController(authService);

  const usersService = new UsersService(storage);
  // Note: broadcastToAll will be available later in the file
  const usersController = new UsersController(usersService);

  const conversationsService = new ConversationsService(storage);
  const conversationsController = new ConversationsController(conversationsService);

  const messagesService = new MessagesService(storage);
  // Note: messagesController will be initialized after WebSocket setup to get broadcastToConversation

  const publicService = new PublicService();
  const publicController = new PublicController(publicService);

  const attachmentsService = new AttachmentsService(storage);
  const attachmentsController = new AttachmentsController(attachmentsService);

  const callHistoryService = new CallHistoryService(storage);
  const callHistoryController = new CallHistoryController(callHistoryService);

  const adminService = new AdminService(cmsStorage);
  const adminController = new AdminController(adminService);

  const lapsitService = new LapsitService(storage);
  const lapsitController = new LapsitController(lapsitService);

  const fcmController = new FCMController();

  // Create isAdmin middleware
  const isAdmin = createIsAdminMiddleware(storage);

  // Mount routes (Messages routes will be mounted after WebSocket setup)
  app.use('/api/auth', createAuthRoutes(authController));
  app.use('/api', createUsersRoutes(usersController));
  app.use('/api', createConversationsRoutes(conversationsController));
  app.use('/api', createPublicRoutes(publicController));
  app.use('/api', createAttachmentsRoutes(attachmentsController));
  app.use('/api', createCallHistoryRoutes(callHistoryController));
  app.use('/api', createAdminRoutes(adminController, isAdmin));
  app.use('/api', createLapsitRoutes(lapsitController));

  // FCM routes
  app.post('/api/fcm/register', isAuthenticated, fcmController.registerToken.bind(fcmController));
  app.post('/api/fcm/unregister', isAuthenticated, fcmController.unregisterToken.bind(fcmController));

  // Gotify routes
  app.use('/api/gotify', isAuthenticated, gotifyRoutes);

  // User Gotify token management routes
  app.use('/api/user', isAuthenticated, userGotifyRoutes);

  // Serve static uploads
  app.use('/uploads', isAuthenticated, express.static(path.join(process.cwd(), 'uploads')));

  // Attachments routes moved to clean architecture (see routes/attachments.routes.ts)

  // Get all users (for personnel list)
  // Users routes moved to clean architecture (see routes/users.routes.ts)

  // Conversations, Messages, and Public routes moved to clean architecture
  // See routes/conversations.routes.ts, routes/messages.routes.ts, and routes/public.routes.ts


  // Call history routes moved to clean architecture (see routes/call-history.routes.ts)

  // Users route
  // User routes moved to clean architecture (see routes/users.routes.ts)

  // Admin and LAPSIT routes moved to clean architecture (see routes/admin.routes.ts and routes/lapsit.routes.ts)


  const httpServer = createServer(app);

  // Setup WebSocket server with modular handlers
  const { clients, sendToUser, broadcastToConversation, broadcastGroupUpdate, broadcastToAll } = setupWebSocketServer(httpServer, storage);

  // Initialize Messages controller with broadcast function (requires broadcastToConversation)
  const messagesController = new MessagesController(messagesService, broadcastToConversation);
  app.use('/api', createMessagesRoutes(messagesController));

  // Initialize Groups service and controller (requires clients and broadcastGroupUpdate)
  const groupsService = new GroupsService(storage, () => clients);
  const groupsController = new GroupsController(groupsService, broadcastGroupUpdate);
  app.use('/api', createGroupsRoutes(groupsController));

  // Initialize WebRTC service and controller (requires sendToUser)
  const webrtcService = new WebRTCService(sendToUser);
  const webrtcController = new WebRTCController(webrtcService);
  app.use('/api', createWebRTCRoutes(webrtcController));

  // WebRTC routes moved to clean architecture (see routes/webrtc.routes.ts)


  return httpServer;
}
