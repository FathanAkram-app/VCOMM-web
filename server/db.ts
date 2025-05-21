import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import pg from 'pg';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Deteksi apakah ini koneksi lokal (localhost) atau Neon (Replit)
const isLocalDatabase = process.env.DATABASE_URL.includes('localhost');

let pool;
let db;

if (isLocalDatabase) {
  console.log('Menggunakan koneksi PostgreSQL lokal');
  // Gunakan driver pg biasa untuk koneksi lokal
  pool = new pg.Pool({ 
    connectionString: process.env.DATABASE_URL 
  });
  db = drizzle(pool, { schema });
} else {
  console.log('Menggunakan koneksi Neon PostgreSQL (Replit)');
  // Gunakan Neon untuk lingkungan Replit
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle(pool, { schema });
}

export { pool, db };