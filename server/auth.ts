import express, { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import bcrypt from 'bcryptjs';
import connectPg from 'connect-pg-simple';
import crypto from 'crypto';
import { storage } from './storage';
import { loginSchema, registerUserSchema } from '@shared/schema';
import { gotifyService } from './services/gotify.service';

declare module 'express-session' {
  interface SessionData {
    user?: any;
  }
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week

  // Use MemoryStore for development (PostgreSQL session store disabled due to connection issues)
  console.log("Using MemoryStore for sessions");

  return session({
    secret: process.env.SESSION_SECRET || 'vcomm-military-secret-key',
    // store: undefined will use default MemoryStore
    resave: true,
    saveUninitialized: true,
    cookie: {
      httpOnly: true,
      maxAge: sessionTtl,
      // Disable secure for development
      secure: false,
      sameSite: 'lax',
      path: '/'
    },
  });
}

/**
 * Middleware to handle X-Session-Token header for mobile apps
 * This allows mobile clients to use session tokens without cookie support
 */
export const sessionTokenMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const sessionToken = req.headers['x-session-token'] as string;

  if (sessionToken && !req.headers.cookie) {
    // Construct a signed cookie that express-session can validate
    // The sessionToken is the unsignedSid, we need to add the signature
    // For development, we'll use the session secret to sign it
    const secret = process.env.SESSION_SECRET || 'vcomm-military-secret-key';

    // Create HMAC signature like express-session does
    const signature = crypto
      .createHmac('sha256', secret)
      .update(sessionToken)
      .digest('base64')
      .replace(/=+$/, ''); // Remove trailing '='

    // Construct the signed session ID in the format express-session expects
    const signedSid = `${sessionToken}.${signature}`;
    const cookieValue = `s:${signedSid}`;

    // Set the cookie header so express-session can use it
    req.headers.cookie = `connect.sid=${encodeURIComponent(cookieValue)}`;
    console.log('[Auth] Using X-Session-Token header:', sessionToken.substring(0, 10) + '...');
  }

  next();
};

export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  console.log("Checking authentication:", req.session?.user ? "User found" : "No user in session");
  if (!req.session || !req.session.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

// In-memory user storage for when database is unavailable
export const inMemoryUsers = new Map<number, any>();
export let nextUserId = 1;

// In-memory conversation storage for when database is unavailable
export const inMemoryConversations = new Map<number, any>();
export const inMemoryConversationMembers = new Map<number, number[]>(); // conversationId -> userId[]
export let nextConversationId = 1;

// In-memory message storage for when database is unavailable
export const inMemoryMessages = new Map<number, any>();
export const inMemoryConversationMessages = new Map<number, number[]>(); // conversationId -> messageId[]
export let nextMessageId = 1;

export async function setupAuth(app: express.Express) {
  // Convert X-Session-Token header to cookie format for mobile apps
  app.use(sessionTokenMiddleware);

  // Use session middleware
  app.use(getSession());

  // Register route
  app.post('/api/auth/register', async (req, res) => {
    try {
      const parseResult = registerUserSchema.safeParse(req.body);

      if (!parseResult.success) {
        return res.status(400).json({
          message: "Invalid registration data",
          errors: parseResult.error.format()
        });
      }

      let user;
      try {
        // Try database storage first
        const existingUserByCallsign = await storage.getUserByCallsign(parseResult.data.callsign);
        if (existingUserByCallsign) {
          return res.status(400).json({ message: "Call sign already taken" });
        }

        if (parseResult.data.nrp) {
          const existingUserByNrp = await storage.getUserByNrp(parseResult.data.nrp);
          if (existingUserByNrp) {
            return res.status(400).json({ message: "NRP/ID already registered" });
          }
        }

        const hashedPassword = await bcrypt.hash(parseResult.data.password, 10);
        const userData = {
          ...parseResult.data,
          password: hashedPassword,
          status: 'offline'
        };

        user = await storage.createUser(userData);
      } catch (dbError) {
        console.log('Database unavailable, using in-memory storage for registration');

        // Fallback to in-memory storage
        // Check if callsign already exists in memory
        const existingUser = Array.from(inMemoryUsers.values()).find(
          u => u.callsign === parseResult.data.callsign
        );
        if (existingUser) {
          return res.status(400).json({ message: "Call sign already taken" });
        }

        // Check if NRP already exists in memory
        if (parseResult.data.nrp) {
          const existingByNrp = Array.from(inMemoryUsers.values()).find(
            u => u.nrp === parseResult.data.nrp
          );
          if (existingByNrp) {
            return res.status(400).json({ message: "NRP/ID already registered" });
          }
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(parseResult.data.password, 10);

        // Create user in memory
        const userId = nextUserId++;
        user = {
          id: userId,
          ...parseResult.data,
          password: hashedPassword,
          status: 'offline',
          role: 'user',
          profileImageUrl: null,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        inMemoryUsers.set(userId, user);
        console.log(`Created in-memory user: ${user.callsign} (ID: ${userId})`);
      }

      // Auto-provision Gotify client token for push notifications
      try {
        await gotifyService.ensureUserHasToken(user.id, user.callsign);
      } catch (error) {
        console.warn('[Auth] Failed to provision Gotify token for new user:', error);
        // Non-critical, continue with registration
      }

      // Store user in session (auto login)
      req.session.user = {
        id: user.id,
        callsign: user.callsign,
        rank: user.rank,
        branch: user.branch
      };

      // Save session to ensure session ID is generated
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Send session ID as X-Session-Token header for mobile app
      res.setHeader('X-Session-Token', req.sessionID);

      // Return user without password
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: "Failed to register" });
    }
  });

  // Login route
  app.post('/api/auth/login', async (req, res) => {
    try {
      const parseResult = loginSchema.safeParse(req.body);

      if (!parseResult.success) {
        return res.status(400).json({
          message: "Invalid login data",
          errors: parseResult.error.format()
        });
      }

      const { callsign, password } = parseResult.data;
      let user;

      try {
        // Try database first
        user = await storage.getUserByCallsign(callsign);
      } catch (dbError) {
        // Fallback to in-memory storage
        console.log('Database unavailable, checking in-memory users for login');
        user = Array.from(inMemoryUsers.values()).find(u => u.callsign === callsign);
      }

      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Verify password
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Store user in session
      req.session.user = {
        id: user.id,
        callsign: user.callsign,
        rank: user.rank,
        branch: user.branch
      };

      // Auto-provision Gotify client token for push notifications
      try {
        await gotifyService.ensureUserHasToken(user.id, user.callsign);
      } catch (error) {
        console.warn('[Auth] Failed to provision Gotify token on login:', error);
        // Non-critical, continue with login
      }

      // Update user status to online (try database, ignore if fails)
      try {
        await storage.updateUserStatus(user.id, 'online');
      } catch (error) {
        // Update in-memory user status
        if (inMemoryUsers.has(user.id)) {
          const memUser = inMemoryUsers.get(user.id);
          memUser.status = 'online';
          inMemoryUsers.set(user.id, memUser);
        }
      }

      // Save session to ensure session ID is generated
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Send session ID as X-Session-Token header for mobile app
      res.setHeader('X-Session-Token', req.sessionID);

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;

      // Check if user is super admin for redirect
      if (user.role === 'super_admin') {
        res.json({
          ...userWithoutPassword,
          redirectTo: '/superadmin'
        });
      } else {
        res.json(userWithoutPassword);
      }
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: "Failed to login" });
    }
  });

  // Get current user
  app.get('/api/auth/user', isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) {
        req.session.destroy(() => { });
        return res.status(401).json({ message: "User not found" });
      }

      // Return user without password
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // Logout route
  app.post('/api/auth/logout', isAuthenticated, async (req, res) => {
    try {
      // Update user status to offline
      await storage.updateUserStatus(req.session.user.id, 'offline');

      // Destroy session
      req.session.destroy(() => {
        res.json({ message: "Logged out successfully" });
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ message: "Failed to logout" });
    }
  });
}