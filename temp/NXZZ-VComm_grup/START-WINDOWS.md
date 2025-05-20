# Cara Menjalankan Aplikasi di Windows

## Langkah-langkah Cepat

### 1. Siapkan Database
- Pastikan PostgreSQL berjalan
- Buat database `military_comm`:
  ```sql
  CREATE DATABASE military_comm;
  ```

### 2. Setup Aplikasi
- Install dependensi:
  ```
  npm install
  ```

- Salin file `.env.windows` menjadi `.env`:
  ```
  copy .env.windows .env
  ```

- Jalankan migrasi:
  ```
  npm run db:push
  ```

### 3. Jalankan Aplikasi

Aplikasi sudah dimodifikasi untuk berjalan secara otomatis di Windows. Cukup jalankan:

```
npx tsx server/index.ts
```

Atau gunakan cross-env sebagai alternatif:

```
npx cross-env NODE_ENV=development tsx server/index.ts
```

### 4. Akses Aplikasi
- Buka browser dan akses `http://localhost:5000`