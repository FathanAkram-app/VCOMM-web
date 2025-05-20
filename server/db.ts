import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "@shared/schema";
import ws from "ws";
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Konfigurasi WebSocket untuk Neon Database
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Mask the password in logs for security
const maskedUrl = process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':****@');
console.log("Connecting to database:", maskedUrl);

// Set pooling configuration untuk mencegah too many clients error
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 10, // Maximum 10 connections in pool
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 5000, // Connection timeout after 5 seconds
});

// Handle errors pada level pool
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// Export drizzle instance
export const db = drizzle(pool, { schema });