import express, { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import bcrypt from 'bcryptjs';
import connectPg from 'connect-pg-simple';
import { storage } from './storage';
import { loginSchema, registerUserSchema } from '@shared/schema';

declare module 'express-session' {
  interface SessionData {
    user?: any;
  }
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  return session({
    secret: process.env.SESSION_SECRET || 'vcomm-military-secret-key',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: sessionTtl,
    },
  });
}

export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

export async function setupAuth(app: express.Express) {
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
      
      // Check if callsign already exists
      const existingUserByCallsign = await storage.getUserByCallsign(parseResult.data.callsign);
      if (existingUserByCallsign) {
        return res.status(400).json({ message: "Call sign already taken" });
      }
      
      // Check if NRP already exists
      const existingUserByNrp = await storage.getUserByNrp(parseResult.data.nrp);
      if (existingUserByNrp) {
        return res.status(400).json({ message: "NRP/ID already registered" });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(parseResult.data.password, 10);
      
      // Create user
      const userData = {
        ...parseResult.data,
        password: hashedPassword,
        status: 'offline'
      };
      
      const user = await storage.createUser(userData);
      
      // Store user in session (auto login)
      req.session.user = {
        id: user.id,
        callsign: user.callsign,
        rank: user.rank,
        branch: user.branch
      };
      
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
      
      // Find user by callsign
      const user = await storage.getUserByCallsign(callsign);
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
      
      // Update user status to online
      await storage.updateUserStatus(user.id, 'online');
      
      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
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
        req.session.destroy(() => {});
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