// Versi sederhana dari db.ts untuk koneksi PostgreSQL lokal di Windows
import * as schema from "@shared/schema";
import postgres from 'postgres';

// Default connection string
const connectionString = 'postgres://postgres:admin123!!@localhost:5432/military_comm';
console.log(`Menggunakan koneksi PostgreSQL lokal: postgres://[username]:[hidden]@localhost:5432/military_comm`);

// Buat koneksi database
const sql = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  ssl: false
});

// Import dan setup drizzle ORM
import { drizzle } from 'drizzle-orm/postgres-js';

// Export pool dan db
export const pool = sql;
export const db = drizzle(sql, { schema });