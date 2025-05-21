import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon } from '@neondatabase/serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import * as schema from '../shared/schema';

// Pastikan variabel lingkungan DATABASE_URL tersedia
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL tidak tersedia');
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql, { schema });

// Menjalankan migrasi
async function runMigration() {
  console.log('Menjalankan migrasi database...');
  try {
    await migrate(db, { migrationsFolder: 'drizzle/migrations' });
    console.log('Migrasi berhasil!');
  } catch (error) {
    console.error('Migrasi gagal:', error);
  }
  process.exit(0);
}

runMigration();
