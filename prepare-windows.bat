@echo off
echo ===== Persiapan NXZZ-VComm untuk Windows =====
echo.

echo 1. Membuat public directory...
mkdir server\public
mkdir server\public\assets

echo 2. Membuat file index.html placeholder...
echo ^<!DOCTYPE html^> > server\public\index.html
echo ^<html lang="en"^> >> server\public\index.html
echo ^<head^> >> server\public\index.html
echo     ^<meta charset="UTF-8"^> >> server\public\index.html
echo     ^<meta name="viewport" content="width=device-width, initial-scale=1.0"^> >> server\public\index.html
echo     ^<title^>NXZZ-VComm^</title^> >> server\public\index.html
echo     ^<style^> >> server\public\index.html
echo         body { font-family: Arial, sans-serif; margin: 0; padding: 40px; background: #222; color: #fff; } >> server\public\index.html
echo         .container { max-width: 800px; margin: 0 auto; background: #333; padding: 20px; border-radius: 8px; } >> server\public\index.html
echo         h1 { color: #4CAF50; } >> server\public\index.html
echo         .loading { margin: 20px 0; } >> server\public\index.html
echo         .spinner { display: inline-block; width: 40px; height: 40px; border: 4px solid rgba(76, 175, 80, 0.3); border-radius: 50%%; border-top-color: #4CAF50; animation: spin 1s ease-in-out infinite; } >> server\public\index.html
echo         @keyframes spin { to { transform: rotate(360deg); } } >> server\public\index.html
echo     ^</style^> >> server\public\index.html
echo ^</head^> >> server\public\index.html
echo ^<body^> >> server\public\index.html
echo     ^<div class="container"^> >> server\public\index.html
echo         ^<h1^>NXZZ-VComm Military Communications^</h1^> >> server\public\index.html
echo         ^<p^>Sistem sedang dimuat. Silakan tunggu...^</p^> >> server\public\index.html
echo         ^<div class="loading"^>^<div class="spinner"^>^</div^>^</div^> >> server\public\index.html
echo         ^<p^>Jika halaman tidak berubah setelah beberapa saat, silakan refresh browser Anda.^</p^> >> server\public\index.html
echo     ^</div^> >> server\public\index.html
echo ^</body^> >> server\public\index.html
echo ^</html^> >> server\public\index.html

echo.
echo 3. Selesai!
echo   Sekarang Anda dapat menjalankan aplikasi dengan 'dev-mode.bat'
echo.
pause