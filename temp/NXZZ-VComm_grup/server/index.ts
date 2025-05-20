import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.simple"; // Menggunakan versi sederhana tanpa WebSocket
import { setupVite, serveStatic, log } from "./vite";
import { scheduleMessageExpirationJobs } from "./messageExpirationService";

// Auto-detect Windows platform dan set NODE_ENV jika perlu
const isWindows = process.platform === 'win32';
if (isWindows && !process.env.NODE_ENV) {
  console.log('[INFO] Platform Windows terdeteksi. Setting NODE_ENV=development secara otomatis.');
  process.env.NODE_ENV = 'development';
}

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

  // This serves both the API and the client
  // Default to port 5000 but allow override via environment variable
  const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;
  
  // Deteksi platform dan gunakan host sesuai
  const isWindows = process.platform === 'win32';
  const host = isWindows ? 'localhost' : '0.0.0.0';
  
  // Opsi server yang aman untuk Windows dan Replit
  const options: any = { port };
  
  // Tambahkan host parameter
  if (!isWindows) {
    // Jika bukan Windows, gunakan 0.0.0.0 dan reusePort
    options.host = host;
    options.reusePort = true;
  }
  
  server.listen(options, () => {
    log(`serving on ${host}:${port}`);
    
    // Start message expiration service
    scheduleMessageExpirationJobs();
  });
})();
