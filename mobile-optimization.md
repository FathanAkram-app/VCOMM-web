# Mobile Optimization untuk Server Lokal

## Network Configuration

### Router Settings
- **QoS (Quality of Service)**: Prioritas tinggi untuk port 5000
- **Bandwidth allocation**: Min 10 Mbps untuk real-time communication
- **WiFi 5GHz**: Gunakan band 5GHz untuk latensi rendah
- **Channel optimization**: Pilih channel yang tidak crowded

### DNS Local Setup
```bash
# Tambah ke /etc/hosts di server
192.168.1.100 vcomm.local

# Atau setup router DNS
vcomm.local -> 192.168.1.100
```

## Mobile Browser Optimization

### Progressive Web App (PWA) Enhancement
- **Install prompt**: User bisa install seperti native app
- **Offline capability**: Basic functionality tanpa internet
- **Background sync**: Sync pesan ketika online kembali
- **Push notifications**: Alert untuk pesan dan panggilan masuk

### Audio Optimization untuk Mobile
- **Earphone detection**: Auto switch ke earphone jika tersedia
- **Audio compression**: Opus codec untuk bandwidth rendah
- **Echo cancellation**: Built-in WebRTC AEC
- **Auto gain control**: Normalize volume level

## Server Hardware Recommendations (1000 users)

### Minimum Specs
- **CPU**: Intel i7 atau AMD Ryzen 7 (8 cores)
- **RAM**: 32 GB DDR4
- **Storage**: 1 TB NVMe SSD
- **Network**: Gigabit ethernet
- **UPS**: Untuk power stability

### Network Infrastructure
- **Switch**: Managed gigabit switch
- **Router**: Enterprise-grade dengan QoS
- **Access Point**: WiFi 6 untuk mobile connectivity
- **Bandwidth**: Min 100 Mbps internet (untuk external access)

## Mobile Performance Monitoring

### Key Metrics untuk Mobile Users
- **Connection latency**: <50ms di local network
- **Audio quality**: Packet loss <1%
- **Battery usage**: Optimize untuk long sessions
- **Memory usage**: <200MB per session
- **CPU usage**: <30% di mobile device

### Real-time Monitoring Dashboard
- Active mobile connections
- Audio call quality metrics
- Network performance per device
- Battery consumption tracking

## Security untuk Mobile Access

### Certificate Management
- Self-signed certificate untuk HTTPS
- Certificate pinning di PWA
- Automatic certificate renewal
- Mobile device certificate installation

### Network Security
- **VPN option**: Untuk remote access
- **Firewall rules**: Port restrictions
- **MAC filtering**: Device whitelist
- **Network segmentation**: Isolate VComm traffic

## Deployment Checklist

### Server Setup
- [ ] Install certificates
- [ ] Configure HTTPS
- [ ] Setup nginx reverse proxy
- [ ] Configure WebSocket proxy
- [ ] Test mobile connectivity

### Mobile Testing
- [ ] Test di berbagai device Android/iOS
- [ ] Verify PWA installation
- [ ] Test audio quality dengan earphone
- [ ] Verify push notifications
- [ ] Test offline functionality

### Performance Optimization
- [ ] Enable gzip compression
- [ ] Setup CDN untuk static assets
- [ ] Configure browser caching
- [ ] Optimize database queries
- [ ] Setup connection pooling

## Troubleshooting Mobile Issues

### Common Problems
1. **HTTPS Certificate Error**: Install certificate di mobile
2. **Audio Not Working**: Check microphone permissions
3. **PWA Not Installing**: Verify manifest.json
4. **Slow Loading**: Check network compression
5. **Battery Drain**: Optimize background processes

### Debug Tools
- Chrome DevTools untuk mobile debugging
- Network monitoring tools
- Audio analysis tools
- Performance profiling