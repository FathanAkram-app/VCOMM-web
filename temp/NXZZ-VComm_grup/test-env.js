// Script untuk memeriksa apakah .env terbaca dengan benar
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { config } from 'dotenv';

// Konfigurasi dotenv
config();

// Fungsi utama
function main() {
  console.log('========= TEST ENVIRONMENT VARIABLES =========');
  
  // Periksa file .env
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const envPath = path.join(__dirname, '.env');
  const envExists = fs.existsSync(envPath);
  
  console.log(`File .env exists: ${envExists}`);
  if (envExists) {
    try {
      const envContent = fs.readFileSync(envPath, 'utf8');
      console.log('\nFile .env content:');
      console.log('----------------------------------------');
      console.log(envContent);
      console.log('----------------------------------------');
    } catch (err) {
      console.error('Error reading .env file:', err.message);
    }
  }
  
  // Periksa variabel lingkungan
  console.log('\nEnvironment variables:');
  console.log('DATABASE_URL:', process.env.DATABASE_URL || 'NOT SET');
  console.log('PGUSER:', process.env.PGUSER || 'NOT SET');
  console.log('PGHOST:', process.env.PGHOST || 'NOT SET');
  console.log('PGDATABASE:', process.env.PGDATABASE || 'NOT SET');
  console.log('PGPORT:', process.env.PGPORT || 'NOT SET');
  console.log('PGPASSWORD:', process.env.PGPASSWORD ? '*****' : 'NOT SET');
  console.log('NODE_ENV:', process.env.NODE_ENV || 'NOT SET');
  
  console.log('\n============================================');
}

main();