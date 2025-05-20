// File database untuk koneksi PostgreSQL lokal
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

// Cek apakah DATABASE_URL tersedia
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL tidak ditemukan. Menggunakan koneksi default...");
  // Gunakan koneksi default jika DATABASE_URL tidak tersedia
  process.env.DATABASE_URL = 'postgres://postgres:password@localhost:5432/military_comm';
  console.warn("Menggunakan koneksi default:", 
    process.env.DATABASE_URL.replace(/postgres:\/\/[^:]+:([^@]+)@/, 'postgres://[username]:[hidden]@'));
  console.warn("EDIT FILE INI DAN GANTI PASSWORD DENGAN PASSWORD POSTGRES ANDA YANG BENAR!");
}

// Buat koneksi database
const connectionString = process.env.DATABASE_URL;
console.log("Menghubungkan ke database PostgreSQL...");

const client = postgres(connectionString);
export const db = drizzle(client, { schema });
export { client as pool };

console.log("Koneksi database berhasil dibuat.");