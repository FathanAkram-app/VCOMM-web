// Modul loader hook untuk mengganti @neondatabase/serverless dengan postgres
import { resolve as resolveOriginal } from 'module';
import { Module } from 'module';

const originalResolveFilename = Module._resolveFilename;

// Ganti DB module dengan versi lokal
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === './db') {
    // Ganti dengan modul db.local.ts untuk PostgreSQL lokal
    request = './db.local';
    console.log('[INFO] Menggunakan konfigurasi database lokal (db.local.ts)');
  }
  
  return originalResolveFilename(request, parent, isMain, options);
};

console.log('[INFO] Module hook aktif: ./db -> ./db.local');