import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { createHttpsServer } from "./https-config";
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env file
dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  // Check if SSL certificates exist for HTTPS
  const certPath = path.join(process.cwd(), 'localhost+2.pem');
  const keyPath = path.join(process.cwd(), 'localhost+2-key.pem');
  
  let finalServer;
  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    // Use HTTPS with mkcert certificates for offline deployment
    finalServer = createHttpsServer(app);
    console.log('🔒 Using HTTPS with mkcert certificates for offline deployment');
  } else {
    // Fallback to HTTP for development
    finalServer = server;
    console.log('🌐 Using HTTP (HTTPS certificates not found)');
  }

  const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;
  const host = process.env.HOST || "0.0.0.0";
  
  finalServer.listen({
    port,
    host,
    // reusePort option causes issues on Windows
    ...(process.platform !== 'win32' && { reusePort: true }),
  }, () => {
    const protocol = fs.existsSync(certPath) && fs.existsSync(keyPath) ? 'https' : 'http';
    log(`serving on ${protocol}://${host}:${port}`);
    if (protocol === 'https') {
      console.log(`📱 Access from mobile: https://192.168.100.165:${port}`);
    }
  });
})();
