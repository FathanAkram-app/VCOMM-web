import * as schema from "@shared/schema";
import * as dotenv from 'dotenv';
import { NodePgDatabase, drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

// Load environment variables from .env file
dotenv.config();
console.log(process.env.DATABASE_URL)
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Mask the password in logs for security
const maskedUrl = process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':****@');
console.log("Connecting to database:", maskedUrl);

// Buat koneksi pool PostgreSQL standar
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 10, // Maximum 10 connections in pool
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 5000, // Connection timeout after 5 seconds
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

// Handle errors pada level pool
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// Gunakan drizzle dengan node-postgres (bukan neon-serverless)
export const db: NodePgDatabase<typeof schema> = drizzle(pool, { schema });