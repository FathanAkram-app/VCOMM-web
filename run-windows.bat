@echo off
set DATABASE_URL=postgresql://postgres:admin123!!@localhost:5432/nxzz_vcomm
set SESSION_SECRET=rahasia_acak_anda
npx tsx server/index.ts