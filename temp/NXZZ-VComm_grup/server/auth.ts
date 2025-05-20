import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const MemoryStore = createMemoryStore(session);

// Middleware untuk autentikasi dengan token dari header
const authWithToken = async (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) {
    return next(); // Sudah terotentikasi via session
  }
  
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(); // Tidak ada token, lanjut ke middleware berikutnya
  }
  
  const userId = parseInt(authHeader.substring(7), 10);
  if (isNaN(userId)) {
    return next();
  }
  
  try {
    const user = await storage.getUser(userId);
    if (user) {
      // Tambahkan user ke request
      req.user = user;
      req.isAuthenticated = () => true;
      console.log(`[AuthWithToken] User authenticated via token: ${user.username} (ID: ${user.id})`);
    }
  } catch (err) {
    console.error("[AuthWithToken] Error:", err);
  }
  
  next();
};

// Middleware untuk memastikan user terotentikasi
// Bisa via session atau token header
export const isAuthenticatedWithToken = async (req: any, res: any, next: any) => {
  // Jika sudah terotentikasi via session, langsung lanjut
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  
  // Coba autentikasi dengan token dari header
  const authHeader = req.headers.authorization;
  console.log(`[Auth Debug] Authorization header: ${authHeader}`);
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  const userId = parseInt(authHeader.substring(7), 10);
  console.log(`[Auth Debug] Extracted userId from token: ${userId}`);
  
  if (isNaN(userId)) {
    return res.status(401).json({ message: "Invalid authentication token" });
  }
  
  try {
    const user = await storage.getUser(userId);
    if (user) {
      // Tambahkan user ke request
      req.user = user;
      req.isAuthenticated = () => true;
      console.log(`[isAuthenticatedWithToken] User authenticated via token: ${user.username} (ID: ${user.id})`);
      return next();
    } else {
      return res.status(401).json({ message: "User not found" });
    }
  } catch (err) {
    console.error("[isAuthenticatedWithToken] Error:", err);
    return res.status(500).json({ message: "Authentication error" });
  }
};

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: "military-comms-secret-2025", // In production, use environment variable
    resave: false,
    saveUninitialized: false,
    store: new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    }),
    cookie: {
      maxAge: 86400000, // 24 hours
      secure: false, // Set to true if using HTTPS
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Apply token authentication middleware after session
  app.use(authWithToken);

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        // Get user by username
        const user = await storage.getUserByUsername(username);
        
        // If user doesn't exist, authentication fails
        if (!user) {
          return done(null, false, { message: "USERNAME TIDAK TERDAFTAR" });
        }
        
        // Check if password matches
        if (user.password !== password) {
          return done(null, false, { message: "PASSWORD SALAH" });
        }
        
        // Authentication successful
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  });

  // Emergency Login Endpoint (hanya untuk pengujian)
  app.get("/api/emergency-login/:username", async (req, res) => {
    try {
      const username = req.params.username;
      
      // Pastikan kita hanya mengembalikan JSON
      res.setHeader('Content-Type', 'application/json');
      
      if (!username) {
        return res.status(400).json({ message: "Username diperlukan" });
      }
      
      console.log(`[Emergency login] Attempt for user: ${username}`);
      
      // Find user
      const user = await storage.getUserByUsername(username);
      
      // Jika user tidak ditemukan, gunakan default user testing
      if (!user) {
        console.log(`[Emergency login] User not found, creating testing user: ${username}`);
        // Buat data user testing
        const testUser = {
          id: 9,
          username: username,
          password: "test123",
          isOnline: true,
          lastSeen: new Date()
        };
        
        // Langsung kirimkan data tanpa validasi lebih lanjut
        return res.status(200).json({ 
          user: testUser,
          message: "Emergency login successful with test user",
          token: `Bearer ${testUser.id}`
        });
      }
      
      console.log(`[Emergency login] Success for user: ${username} (ID: ${user.id})`);
      
      // Update online status
      try {
        await storage.updateUserOnlineStatus(user.id, true);
      } catch (err) {
        console.error("[Emergency login] Failed to update online status:", err);
      }
      
      // Login tanpa session untuk menghindari masalah
      return res.status(200).json({ 
        user,
        message: "Emergency login successful",
        token: `Bearer ${user.id}`
      });
    } catch (err) {
      console.error('[Emergency login] Error:', err);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  // Register endpoint
  app.post("/api/register", async (req, res, next) => {
    try {
      const { 
        username, 
        password, 
        nrp,
        fullName,
        rank,
        unit,
        branch,
        station,
        bloodType,
        securityClearance,
        emergencyContactName,
        emergencyContactPhone,
        deviceInfo 
      } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "CALLSIGN and PASSWORD are required" });
      }
      
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "CALLSIGN already in use" });
      }

      // Create a detailed deviceInfo string with all military personnel information
      const militaryInfo = [
        `NRP: ${nrp || 'Not provided'}`,
        `Full Name: ${fullName || 'Not provided'}`,
        `Rank: ${rank || 'Not provided'}`,
        `Unit: ${unit || 'Not provided'}`,
        `Branch: ${branch || 'Not provided'}`,
        `Station: ${station || 'Not provided'}`,
        `Blood Type: ${bloodType || 'Not provided'}`,
        `Security Clearance: ${securityClearance || 'Not provided'}`,
        `Emergency Contact: ${emergencyContactName || 'Not provided'} (${emergencyContactPhone || 'Not provided'})`
      ].join("; ");

      const user = await storage.createUser({
        username,
        password,
        deviceInfo: militaryInfo || deviceInfo || "Standard Issue Device"
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json({ user });
      });
    } catch (err) {
      next(err);
    }
  });

  // Login endpoint
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "INVALID CREDENTIALS" });
      
      req.login(user, (err) => {
        if (err) return next(err);
        return res.json({ user });
      });
    })(req, res, next);
  });

  // Logout endpoint
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  // Get current user endpoint
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "NOT AUTHENTICATED" });
    }
    res.json({ user: req.user });
  });
  
  // Direct login endpoint (khusus untuk Windows environment)
  app.post("/api/login/direct", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "CALLSIGN and PASSWORD are required" });
      }
      
      console.log(`[Direct login] Attempt for user: ${username}`);
      
      // Find user
      const user = await storage.getUserByUsername(username);
      
      // Check if user exists
      if (!user) {
        console.log(`[Direct login] User not found: ${username}`);
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Verify password
      if (user.password !== password) {
        console.log(`[Direct login] Invalid password for user: ${username}`);
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      console.log(`[Direct login] Success for user: ${username} (ID: ${user.id})`);
      
      // Update online status
      try {
        await storage.updateUserOnlineStatus(user.id, true);
      } catch (err) {
        console.error("[Direct login] Failed to update online status:", err);
      }
      
      // Login session-based juga jika server mendukung
      req.login(user, (err) => {
        if (err) {
          console.error("[Direct login] Session login error:", err);
          // Continue anyway since we're using token-based auth
        }
        
        // Return user data directly
        return res.json({ 
          user,
          message: "Direct authentication successful"
        });
      });
    } catch (err) {
      console.error('[Direct login] Error:', err);
      res.status(500).json({ message: "Server error" });
    }
  });
}