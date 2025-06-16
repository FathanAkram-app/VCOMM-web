# VCommMessenger - Local Server Deployment Guide

## Server Hardware Requirements (1000 users)

### Recommended Local Server Specs
- **CPU**: Intel i7-12700K atau AMD Ryzen 7 5800X (8 cores, 16 threads)
- **RAM**: 64 GB DDR4-3200 (32 GB minimum)
- **Storage**: 2 TB NVMe SSD + 4 TB HDD backup
- **Network**: Dual Gigabit Ethernet + WiFi 6 AP
- **UPS**: 1500VA untuk power stability

### Network Infrastructure
- **Router**: Enterprise WiFi 6 router dengan QoS
- **Switch**: 24-port managed gigabit switch
- **Access Points**: WiFi 6 coverage untuk area operasi
- **Bandwidth**: 100 Mbps internet minimum

## Quick Deployment Steps

### 1. Persiapan Server
```bash
# Install Docker dan Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Clone aplikasi
git clone [repository-url] vcomm-messenger
cd vcomm-messenger

# Setup HTTPS certificates
chmod +x setup-local-https.sh
./setup-local-https.sh
```

### 2. Konfigurasi Network
```bash
# Edit /etc/hosts untuk domain lokal
echo "192.168.1.100 vcomm.local" >> /etc/hosts

# Configure firewall
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 5000/tcp
sudo ufw enable
```

### 3. Deploy Aplikasi
```bash
# Start semua services
docker-compose -f docker-compose.local.yml up -d

# Verify deployment
docker-compose ps
curl -k https://vcomm.local/api/health
```

## Mobile Optimization Settings

### PWA Configuration
Aplikasi sudah dikonfigurasi sebagai Progressive Web App dengan:
- Install prompt otomatis di mobile browser
- Offline functionality untuk basic features
- Background sync untuk pesan
- Push notifications untuk panggilan masuk

### Audio Optimization untuk HP
- **WebRTC Settings**: Optimized untuk mobile bandwidth
- **Codec**: Opus untuk audio compression
- **Echo Cancellation**: Built-in AEC/AGC
- **Earphone Detection**: Auto-switch jika tersedia

### Mobile Browser Settings
Users HP perlu:
1. **Allow microphone/camera permissions**
2. **Enable notifications**
3. **Install PWA** via browser menu "Add to Home Screen"
4. **Trust HTTPS certificate** (one-time setup)

## Performance Tuning

### Database Optimization
```sql
-- PostgreSQL settings untuk 1000 concurrent users
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '16GB';
ALTER SYSTEM SET effective_cache_size = '48GB';
ALTER SYSTEM SET maintenance_work_mem = '2GB';
ALTER SYSTEM SET checkpoint_completion_target = 0.7;
ALTER SYSTEM SET wal_buffers = '16MB';
SELECT pg_reload_conf();
```

### Nginx Optimization
```nginx
# Sudah dikonfigurasi di nginx-mobile.conf
worker_processes auto;
worker_connections 1024;

# Gzip compression untuk mobile
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_comp_level 6;

# WebSocket settings
proxy_read_timeout 86400s;
proxy_send_timeout 86400s;
```

## Mobile User Setup Guide

### Android Setup
1. Buka Chrome/Firefox di HP
2. Go to `https://vcomm.local`
3. Accept certificate warning (one-time)
4. Tap menu → "Add to Home Screen"
5. Allow microphone/camera permissions
6. Enable notifications

### iOS Setup
1. Buka Safari di iPhone/iPad
2. Go to `https://vcomm.local`
3. Accept certificate warning
4. Tap Share → "Add to Home Screen"
5. Allow microphone permissions in Settings

### Recommended Mobile Settings
- **WiFi**: Connect to 5GHz network
- **Battery**: Disable battery optimization untuk VComm
- **Notifications**: Allow all VComm notifications
- **Audio**: Use earphone untuk call quality

## Monitoring & Maintenance

### System Monitoring
```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs -f vcomm-app

# Monitor resource usage
docker stats

# Database connections
docker exec vcomm-postgres psql -U vcomm_user -d vcomm_db -c "SELECT count(*) FROM pg_stat_activity;"
```

### Performance Metrics
- **CPU Usage**: Target <70%
- **RAM Usage**: Target <80%
- **Network Latency**: <50ms local network
- **Audio Quality**: <1% packet loss
- **Concurrent Users**: Monitor via dashboard

### Backup Strategy
```bash
# Daily database backup
docker exec vcomm-postgres pg_dump -U vcomm_user vcomm_db > backup-$(date +%Y%m%d).sql

# Weekly full system backup
rsync -av /opt/vcomm-messenger/ /backup/vcomm-$(date +%Y%m%d)/
```

## Troubleshooting

### Common Mobile Issues
1. **Certificate Error**: Install certificate di mobile
2. **No Audio**: Check microphone permissions
3. **Slow Loading**: Verify WiFi connection
4. **Push Notifications**: Check browser permissions
5. **PWA Not Installing**: Clear browser cache

### Network Issues
- **Latency**: Check WiFi channel congestion
- **Packet Loss**: Verify ethernet cables
- **Bandwidth**: Monitor network usage
- **Connectivity**: Check firewall rules

### Performance Issues
- **High CPU**: Check concurrent connections
- **High Memory**: Restart containers
- **Slow Database**: Analyze query performance
- **WebSocket Errors**: Check nginx proxy settings

## Security Considerations

### Local Network Security
- Change default passwords
- Enable firewall rules
- Setup VPN untuk remote access
- Regular security updates

### Mobile Security
- Certificate pinning di PWA
- Secure WebSocket connections
- Device authentication
- Session timeout settings

## Scaling Plan

### Growth Phases
- **Phase 1 (0-250 users)**: Single server
- **Phase 2 (250-500 users)**: Add load balancer
- **Phase 3 (500-1000 users)**: Database clustering
- **Phase 4 (1000+ users)**: Multiple app servers

### Hardware Scaling
- **CPU**: Add more cores atau upgrade
- **RAM**: Scale to 128 GB
- **Storage**: Add SSD storage
- **Network**: Upgrade to 10 Gbps

## Cost Estimation

### Hardware Investment (one-time)
- Server: $3,000 - $5,000
- Network equipment: $1,000 - $2,000
- UPS & cooling: $500 - $1,000
- **Total**: $4,500 - $8,000

### Operational Costs (monthly)
- Electricity: $100 - $200
- Internet: $100 - $300
- Maintenance: $200 - $500
- **Total**: $400 - $1,000/month

Deployment server lokal ini memberikan kontrol penuh, latensi rendah, dan biaya operasional yang predictable untuk 1000 mobile users.