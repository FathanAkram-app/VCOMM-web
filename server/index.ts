import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import https from "https";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { createHttpsServer } from "./https-config";
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env file
dotenv.config();

const app = express();

// Enable trust proxy for proper IP handling
app.set('trust proxy', 1);

// Add CORS headers for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Session-Token');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }

  next();
});

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
  try {
    // Decide the ONE server that will both listen AND host the /ws upgrade handler, BEFORE
    // registerRoutes attaches the WebSocket server to it. (Previously the WSS was attached to a
    // separate plain-HTTP server that never listened in HTTPS mode, so every wss:// upgrade was
    // destroyed and all call/chat signaling was dead over HTTPS.)
    //
    // HTTPS is enabled when HTTPS_ENABLED=true (reading TLS_CERT/TLS_KEY, defaulting to the docker
    // mount at /app/certs) OR when the mkcert localhost+2 pair exists in the cwd (local offline dev).
    const httpsEnabled = process.env.HTTPS_ENABLED === 'true';
    const envCertPath = process.env.TLS_CERT || '/app/certs/server.crt';
    const envKeyPath = process.env.TLS_KEY || '/app/certs/server.key';
    const mkcertCert = path.join(process.cwd(), 'localhost+2.pem');
    const mkcertKey = path.join(process.cwd(), 'localhost+2-key.pem');

    let finalServer: import('http').Server | import('https').Server;
    let usingHttps = false;

    if (httpsEnabled) {
      // Explicit opt-in: fail loudly if the certs aren't readable rather than silently falling back
      // to HTTP (which would serve the web client from an insecure origin where getUserMedia is
      // unavailable).
      try {
        const options = { key: fs.readFileSync(envKeyPath), cert: fs.readFileSync(envCertPath) };
        finalServer = https.createServer(options, app);
        usingHttps = true;
        console.log(`🔒 HTTPS_ENABLED: serving HTTPS with certs ${envCertPath} / ${envKeyPath}`);
      } catch (e: any) {
        console.error(`❌ HTTPS_ENABLED=true but certs are unreadable (${envCertPath} / ${envKeyPath}): ${e.message}`);
        process.exit(1);
      }
    } else if (fs.existsSync(mkcertCert) && fs.existsSync(mkcertKey)) {
      finalServer = createHttpsServer(app);
      usingHttps = true;
      console.log('🔒 Using HTTPS with mkcert certificates for offline deployment');
    } else {
      finalServer = createServer(app);
      console.log('🌐 Using HTTP (HTTPS not enabled and no mkcert certificates found)');
    }

    // Attach routes + the WebSocket server to the server that will actually listen.
    await registerRoutes(app, finalServer);

    // Error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error('Server error:', err);
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
    });

    // Setup vite in development (HMR websocket rides the same server, so it works over HTTPS too).
    if (process.env.NODE_ENV === "development") {
      await setupVite(app, finalServer as import('http').Server);
    } else {
      serveStatic(app);
    }

    const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;
    const host = process.env.HOST || "0.0.0.0";

    finalServer.listen({
      port,
      host,
      // reusePort option causes issues on Windows
      ...(process.platform !== 'win32' && { reusePort: true }),
    }, () => {
      const protocol = usingHttps ? 'https' : 'http';
      log(`serving on ${protocol}://${host}:${port}`);
      if (protocol === 'https') {
        console.log(`📱 Access from mobile: https://chat.id:${port}`);
      }
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();
