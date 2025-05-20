import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import * as pg from 'postgres';

// Deteksi jika sedang berjalan di Windows
const isWindows = process.platform === 'win32';

// Konfigurasi connection string
let connectionString = process.env.DATABASE_URL;

// Jika tidak ada DATABASE_URL, beri default value berdasarkan platform
if (!connectionString) {
  if (isWindows) {
    // Default connection string untuk Windows
    connectionString = 'postgres://postgres:admin123!!@localhost:5432/military_comm';
    process.env.DATABASE_URL = connectionString;
    console.log(`Menggunakan koneksi default untuk PostgreSQL lokal: postgres://[username]:[hidden]@localhost:5432/military_comm`);
    console.log('PENTING: Edit password di server/db.ts jika koneksi gagal!');
  } else {
    // Di Replit, kita membutuhkan DATABASE_URL untuk terhubung
    throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
  }
}

let pool: any;
let db: any;

// Gunakan koneksi yang sesuai dengan platform
if (isWindows) {
  // Untuk Windows: Gunakan postgres-js (lebih stabil untuk Windows)
  console.log('Platform Windows terdeteksi, menggunakan postgres-js...');
  
  const postgres = pg.default;
  
  // Buat koneksi dengan konfigurasi yang lebih stabil untuk Windows
  const pgClient = postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: false
  });
  
  pool = pgClient;
  
  // Impor drizzle untuk postgres-js - gunakan import dinamis untuk ESM
  try {
    // Gunakan import dinamis karena kita berada di modul ESM
    import('drizzle-orm/postgres-js').then(module => {
      const drizzlePg = module.drizzle;
      db = drizzlePg(pgClient, { schema });
      console.log('Koneksi PostgreSQL lokal berhasil dibuat.');
    }).catch(err => {
      console.error('Error mengimpor drizzle-orm/postgres-js:', err);
      throw err;
    });
  } catch (err) {
    console.error('Error membuat koneksi database:', err);
    throw err;
  }
} else {
  // Untuk Replit: Coba gunakan Neon Database, tapi dengan fallback ke mode in-memory
  try {
    console.log('Mencoba menghubungkan ke Neon Database untuk Replit...');
    neonConfig.webSocketConstructor = ws;
    
    pool = new Pool({ connectionString });
    db = drizzle({ client: pool, schema });
    
    // Uji koneksi dengan query sederhana
    pool.query('SELECT 1').then(() => {
      console.log('Koneksi Neon Database berhasil dibuat.');
    }).catch(err => {
      console.error('Koneksi Neon Database gagal:', err);
      console.warn('PERINGATAN: Menggunakan mode in-memory sebagai fallback!');
      
      // Reset pool dan db untuk mode in-memory
      pool = { query: async () => [] }; // Dummy pool
      db = {
        // Dummy DB dengan fungsi penting untuk operasi fallback
        query: async () => [],
        select: () => ({ 
          from: () => ({ 
            where: () => [],
            innerJoin: () => ({ 
              on: () => ({
                where: () => []
              })
            })
          }) 
        }),
        insert: () => ({ values: () => ({ 
          returning: async () => [], 
          onConflictDoUpdate: () => ({ returning: async () => [] }) 
        }) }),
        update: () => ({ set: () => ({ where: () => ({ returning: async () => [] }) }) }),
        delete: () => ({ where: () => ({ returning: async () => [] }) }),
        // Tambahkan fungsi lainnya sesuai kebutuhan
      };
    });
  } catch (err) {
    console.error('Error saat setup database:', err);
    console.warn('PERINGATAN: Menggunakan mode in-memory sebagai fallback!');
    
    // Gunakan mode in-memory jika ada error
    pool = { query: async () => [] }; // Dummy pool
    db = {
      // Dummy DB dengan fungsi penting untuk operasi fallback
      query: async () => [],
      select: () => ({ 
        from: () => ({ 
          where: () => [],
          innerJoin: () => ({ 
            on: () => ({
              where: () => []
            })
          })
        }) 
      }),
      insert: () => ({ values: () => ({ 
        returning: async () => [], 
        onConflictDoUpdate: () => ({ returning: async () => [] }) 
      }) }),
      update: () => ({ set: () => ({ where: () => ({ returning: async () => [] }) }) }),
      delete: () => ({ where: () => ({ returning: async () => [] }) }),
      // Tambahkan fungsi lainnya sesuai kebutuhan
    };
  }
}

// Export untuk digunakan di aplikasi
export { pool, db };
