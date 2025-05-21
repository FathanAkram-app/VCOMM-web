import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL tidak tersedia!');
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Terhubung ke database!');

    const sql = fs.readFileSync(path.join(__dirname, 'drizzle/migrations/0000_initial.sql'), 'utf8');
    console.log('Menjalankan migrasi...');
    await client.query(sql);
    console.log('Migrasi berhasil!');
  } catch (error) {
    console.error('Error saat menjalankan migrasi:', error);
  } finally {
    await client.end();
  }
}

runMigration();
