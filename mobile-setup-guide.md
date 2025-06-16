# Panduan Setup Mobile User - VCommMessenger

## Persiapan Awal

### Syarat Minimum HP
- **Android**: Versi 8.0+ dengan Chrome 80+
- **iOS**: iOS 13+ dengan Safari 13+
- **RAM**: Minimum 3 GB untuk performa optimal
- **Storage**: 100 MB free space untuk PWA cache
- **Network**: WiFi dengan signal strength minimal -60 dBm

## Setup Langkah demi Langkah

### 1. Koneksi ke Network
```
1. Connect HP ke WiFi yang sama dengan server
2. Pastikan IP range dalam 192.168.x.x atau 10.x.x.x
3. Test ping ke server: ping 192.168.1.100
4. Speed test: minimum 10 Mbps download/upload
```

### 2. Akses Aplikasi
```
Android (Chrome/Firefox):
1. Buka browser
2. Ketik: https://vcomm.local
3. Tap "Advanced" → "Proceed to vcomm.local"
4. Allow semua permissions yang diminta

iOS (Safari):
1. Buka Safari
2. Ketik: https://vcomm.local  
3. Tap "Advanced" → "Continue"
4. Allow microphone/camera permissions
```

### 3. Install PWA (Progressive Web App)
```
Android:
1. Tap menu (3 dots) di Chrome
2. Pilih "Add to Home screen"
3. Konfirm "Install" atau "Add"
4. Icon VComm akan muncul di home screen

iOS:
1. Tap Share button (kotak dengan panah)
2. Scroll dan pilih "Add to Home Screen"
3. Edit nama jika perlu, tap "Add"
4. App akan muncul seperti aplikasi native
```

### 4. Permissions Setup
```
Wajib Allow:
✓ Microphone - untuk audio calls
✓ Camera - untuk video calls  
✓ Notifications - untuk incoming calls
✓ Location (optional) - untuk tactical features

Android Settings:
Settings → Apps → VComm → Permissions → Allow all

iOS Settings:
Settings → Safari → Website Settings → Microphone/Camera → Allow
```

## Optimasi Performance Mobile

### Battery Optimization
```
Android:
1. Settings → Battery → Battery Optimization
2. Find VComm/Chrome → "Don't optimize"
3. Settings → Apps → VComm → Battery → "Unrestricted"

iOS:
1. Settings → Battery → Battery Health
2. Disable "Low Power Mode" saat menggunakan VComm
3. Settings → Screen Time → Always Allowed → Add VComm
```

### Network Optimization
```
WiFi Settings:
- Pilih 5GHz network jika tersedia
- Forget dan reconnect jika signal lemah
- Disable "Smart WiFi" yang auto-switch network
- Enable "Keep WiFi on during sleep"

Mobile Data (Emergency):
- Enable "High Performance Mode" jika tersedia
- Disable background apps yang tidak perlu
- Set VComm sebagai "Priority app" untuk data
```

### Audio Settings untuk Call Quality
```
Recommended Setup:
1. Gunakan earphone dengan microphone built-in
2. Atau headset bluetooth dengan codec aptX
3. Disable "Adaptive Audio" di settings HP
4. Set media volume ke 70-80% untuk optimal quality

Testing Audio:
1. Buka VComm → Settings → Audio Test
2. Test microphone dengan recording
3. Test speaker output dengan different modes
4. Verify earphone detection working
```

## Troubleshooting Mobile Issues

### Connection Problems
```
Symptom: Cannot access https://vcomm.local
Solutions:
1. Check WiFi connection status
2. Try IP direct: https://192.168.1.100:5000
3. Restart WiFi on phone
4. Clear browser cache/data
5. Try different browser (Chrome/Firefox/Safari)
```

### Certificate Issues
```
Symptom: "Your connection is not private"
Solutions:
1. Tap "Advanced" → "Proceed to vcomm.local"
2. Android: Settings → Security → Trusted Credentials
3. iOS: Settings → General → About → Certificate Trust
4. Contact admin for certificate installation
```

### Audio/Video Problems
```
No Audio in Calls:
1. Check microphone permissions
2. Test earphone connection
3. Disable other audio apps
4. Restart browser/app
5. Check server audio test in Settings

Poor Call Quality:
1. Move closer to WiFi router
2. Switch to 5GHz network
3. Close background apps
4. Use earphone instead of speaker
5. Check network bandwidth
```

### Performance Issues
```
App Running Slow:
1. Close other browser tabs
2. Restart browser completely
3. Clear browser cache
4. Restart phone if needed
5. Check available RAM/storage

Battery Drain:
1. Lower screen brightness
2. Disable location services
3. Close unnecessary background apps
4. Use earphone to reduce speaker power
5. Enable battery optimization exceptions
```

### PWA Installation Issues
```
"Add to Home Screen" not showing:
1. Make sure using HTTPS connection
2. Clear browser data completely
3. Refresh page and wait 30 seconds
4. Try incognito/private mode first
5. Update browser to latest version

PWA won't open:
1. Delete and reinstall PWA
2. Clear all VComm data from browser
3. Restart phone
4. Check available storage space
```

## Best Practices untuk Mobile

### Daily Usage
- Start aplikasi dari home screen icon (PWA)
- Keep WiFi connected untuk best performance
- Use earphone untuk private conversations
- Enable notifications untuk incoming calls
- Regular restart aplikasi jika ada memory issues

### Call Quality Tips
- Position HP dekat router untuk strong signal
- Avoid using during WiFi peak hours
- Use airplane mode + WiFi untuk reduce interference
- Test audio sebelum important calls
- Have backup komunikasi method ready

### Security Mobile
- Logout dari browser jika sharing device
- Don't save passwords di public devices
- Enable screen lock dengan PIN/biometric
- Regular update browser untuk security patches

### Group Call Mobile
- Join dengan earphone untuk better audio
- Mute microphone when not speaking
- Use stable WiFi connection
- Close other video apps before joining
- Monitor battery level untuk long calls

Server lokal dengan optimasi ini akan memberikan performa excellent untuk 1000 mobile users dengan latency rendah dan control penuh atas infrastruktur komunikasi.