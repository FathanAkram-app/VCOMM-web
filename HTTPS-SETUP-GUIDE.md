# 🔒 HTTPS Setup Guide untuk Mobile Camera/Microphone Access

## Mengapa HTTPS Diperlukan?
Chrome di mobile memerlukan HTTPS untuk mengakses camera dan microphone. Dengan setup ini, aplikasi NXZZ-VComm akan berfungsi sempurna di HP Android/iPhone melalui jaringan offline.

## ✅ Yang Sudah Selesai:
1. ✅ mkcert sudah terinstall
2. ✅ Certificate sudah dibuat untuk IP 192.168.100.165
3. ✅ Server sudah dimodifikasi untuk support HTTPS
4. ✅ Script startup sudah dibuat

## 📱 Cara Menjalankan Aplikasi dengan HTTPS:

### Metode 1: Menggunakan Script (Paling Mudah)
```bash
# Di Command Prompt, jalankan:
start-https.bat
```

### Metode 2: Manual Copy Certificate
```bash
# 1. Copy certificate ke project directory
copy-certificates.bat

# 2. Start aplikasi
npm run dev
```

## 🌐 URL Akses:
- **Mobile (HP)**: `https://192.168.100.165:5000`
- **Desktop**: `https://localhost:5000`

## 🔧 Certificate Details:
- **File Certificate**: `localhost+2.pem`
- **File Private Key**: `localhost+2-key.pem`
- **Valid untuk**: localhost, 192.168.100.165, 127.0.0.1
- **Berlaku sampai**: 22 August 2027

## 📲 Test Camera/Microphone di Mobile:
1. Buka Chrome di HP
2. Akses: `https://192.168.100.165:5000`
3. Login dengan akun Anda
4. Klik tombol "Test Camera" atau "Test Microphone"
5. Chrome akan meminta permission - klik "Allow"
6. Camera/microphone sekarang siap untuk video call!

## 🚨 Troubleshooting:

### Jika Certificate Error:
- Pastikan file `localhost+2.pem` dan `localhost+2-key.pem` ada di project directory
- Regenerate certificate jika perlu: `mkcert localhost 192.168.100.165 127.0.0.1`

### Jika Mobile tidak bisa akses:
- Pastikan PC dan HP dalam jaringan WiFi yang sama
- Cek IP address PC dengan `ipconfig`
- Pastikan Windows Firewall allow port 5000

### Jika Camera/Microphone masih tidak berfungsi:
- Pastikan menggunakan HTTPS (bukan HTTP)
- Clear browser cache di HP
- Restart Chrome di HP
- Cek permission di Chrome settings

## ✨ Keunggulan Setup Ini:
- ✅ Berfungsi 100% offline (tanpa internet)
- ✅ Camera/microphone berfungsi di mobile
- ✅ Secure dengan SSL encryption
- ✅ Compatible dengan semua device di intranet
- ✅ Certificate valid sampai 2027

Sekarang aplikasi NXZZ-VComm Anda siap untuk deployment offline dengan full camera/microphone support! 🎯