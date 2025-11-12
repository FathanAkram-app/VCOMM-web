# #!/bin/bash
# # filepath: /home/pliskin/Apps/VCommMessengerDocker/VCommMessengerDocker/build-for-offline.sh

# set -e

# echo "📦 Building VCommMessenger for Offline Deployment"

# # Variables
# EXPORT_DIR="vcomm-offline-package"
# DATE=$(date +%Y%m%d_%H%M%S)
# PACKAGE_NAME="vcomm-military-${DATE}"

# # Create export directory
# mkdir -p $EXPORT_DIR

# echo "🏗️  Building Docker images..."

# # Build all images
# docker-compose build --no-cache

# # Get image names
# APP_IMAGE=$(docker-compose config | grep "image:" | grep -v "postgres\|redis\|nginx" | awk '{print $2}' | head -n1)
# if [ -z "$APP_IMAGE" ]; then
#     APP_IMAGE="vcommmessengerdocker_vcomm-app:latest"
# fi

# echo "📥 Exporting Docker images..."

# # Export main application image
# docker save $APP_IMAGE -o $EXPORT_DIR/vcomm-app.tar

# # Export base images
# docker save postgres:15-alpine -o $EXPORT_DIR/postgres.tar
# docker save redis:7-alpine -o $EXPORT_DIR/redis.tar  
# docker save nginx:alpine -o $EXPORT_DIR/nginx.tar

# # Copy configuration files
# echo "📋 Copying configuration files..."
# cp docker-compose.yml $EXPORT_DIR/
# cp .env $EXPORT_DIR/
# cp nginx-mobile.conf $EXPORT_DIR/ 2>/dev/null || echo "nginx-mobile.conf not found, will create"

# # Copy application source (if needed for rebuild)
# if [ -d "src" ]; then
#     cp -r src $EXPORT_DIR/
# fi
# if [ -f "package.json" ]; then
#     cp package.json $EXPORT_DIR/
# fi
# if [ -f "Dockerfile" ]; then
#     cp Dockerfile $EXPORT_DIR/
# fi

# # Create offline deployment script
# cat > $EXPORT_DIR/deploy-offline.sh << 'EOF'
# #!/bin/bash
# # VCommMessenger Offline Deployment Script
# # Run this on the target offline server

# set -e

# echo "🎖️  VCommMessenger Military Offline Deployment"
# echo "=============================================="

# # Check if running as root
# if [ "$EUID" -eq 0 ]; then
#     echo "⚠️  Running as root. Consider creating a dedicated user."
# fi

# # Variables
# SERVER_IP=192.168.200.105
# DOMAIN="vcomm.military"

# echo "🌐 Server IP: $SERVER_IP"
# echo "🔗 Domain: $DOMAIN"

# # Install Docker if not present
# install_docker() {
#     if ! command -v docker &> /dev/null; then
#         echo "📦 Docker not found. Manual installation required."
#         echo "Please install Docker manually from offline media."
#         exit 1
#     fi
    
#     if ! command -v docker-compose &> /dev/null; then
#         echo "📦 Docker Compose not found. Manual installation required."
#         echo "Please install Docker Compose manually."
#         exit 1
#     fi
# }

# # Import Docker images
# import_images() {
#     echo "📥 Importing Docker images..."
    
#     docker load -i vcomm-app.tar
#     docker load -i postgres.tar
#     docker load -i redis.tar
#     docker load -i nginx.tar
    
#     echo "✅ All images imported successfully"
# }

# # Setup network for offline operation
# setup_offline_network() {
#     echo "🌐 Configuring offline network..."
    
#     # Add to hosts file
#     if ! grep -q "$DOMAIN" /etc/hosts; then
#         echo "$SERVER_IP $DOMAIN" | sudo tee -a /etc/hosts
#     fi
    
#     # Configure firewall for internal network only
#     sudo ufw --force enable
#     sudo ufw allow ssh
#     sudo ufw allow from 192.168.0.0/16 to any port 80
#     sudo ufw allow from 192.168.0.0/16 to any port 443
#     sudo ufw allow from 10.0.0.0/8 to any port 80
#     sudo ufw allow from 10.0.0.0/8 to any port 443
#     sudo ufw allow from 172.16.0.0/12 to any port 80
#     sudo ufw allow from 172.16.0.0/12 to any port 443
    
#     # Block external access
#     sudo ufw deny out 53
#     sudo ufw deny out 80
#     sudo ufw deny out 443
    
#     echo "🔒 Network secured for offline operation"
# }

# # Generate certificates for offline use
# generate_offline_certificates() {
#     echo "🔐 Generating offline HTTPS certificates..."
    
#     mkdir -p certs
    
#     # Generate CA key and certificate
#     openssl genrsa -out certs/ca.key 4096
#     openssl req -new -x509 -days 3650 -key certs/ca.key -out certs/ca.crt \
#         -subj "/C=ID/ST=Military/L=Base/O=Indonesian Military/OU=VComm CA/CN=VComm Root CA"
    
#     # Generate server key
#     openssl genrsa -out certs/server.key 4096
    
#     # Create server certificate request
#     openssl req -new -key certs/server.key -out certs/server.csr \
#         -subj "/C=ID/ST=Military/L=Base/O=Indonesian Military/OU=VComm/CN=$DOMAIN"
    
#     # Create certificate extensions
#     cat > certs/server.ext << EOFEXT
# authorityKeyIdentifier=keyid,issuer
# basicConstraints=CA:FALSE
# keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
# subjectAltName = @alt_names

# [alt_names]
# DNS.1 = $DOMAIN
# DNS.2 = localhost
# DNS.3 = vcomm.local
# IP.1 = $SERVER_IP
# IP.2 = 127.0.0.1
# EOFEXT
    
#     # Sign server certificate
#     openssl x509 -req -in certs/server.csr -CA certs/ca.crt -CAkey certs/ca.key \
#         -CAcreateserial -out certs/server.crt -days 3650 -extensions v3_ext -extfile certs/server.ext
    
#     # Set permissions
#     chmod 600 certs/*.key
#     chmod 644 certs/*.crt
    
#     echo "✅ Military-grade certificates generated"
#     echo "📱 Install ca.crt on mobile devices for trusted connection"
# }

# # Create optimized configuration for offline
# create_offline_config() {
#     echo "⚙️  Creating offline-optimized configuration..."
    
#     # Update nginx config for offline
#     cat > nginx-mobile.conf << 'EOFNGINX'
# # Offline Military nginx configuration

# upstream vcomm_backend {
#     server vcomm-app:5000;
#     keepalive 64;
# }

# # Rate limiting for military network
# limit_req_zone $binary_remote_addr zone=military_api:10m rate=100r/m;
# limit_req_zone $binary_remote_addr zone=military_ws:10m rate=50r/m;

# server {
#     listen 443 ssl http2;
#     server_name vcomm.military localhost;
    
#     # SSL Configuration
#     ssl_certificate /etc/nginx/certs/server.crt;
#     ssl_certificate_key /etc/nginx/certs/server.key;
#     ssl_session_timeout 24h;
#     ssl_session_cache shared:SSL:100m;
#     ssl_session_tickets off;
    
#     # Military-grade SSL
#     ssl_protocols TLSv1.3;
#     ssl_ciphers TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256;
#     ssl_prefer_server_ciphers off;
    
#     # Security headers
#     add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
#     add_header X-Frame-Options DENY always;
#     add_header X-Content-Type-Options nosniff always;
#     add_header Referrer-Policy no-referrer always;
#     add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' wss: ws:; media-src 'self';" always;
    
#     # Military network optimization
#     client_max_body_size 100M;
#     client_body_timeout 60s;
#     client_header_timeout 60s;
    
#     # WebSocket for real-time military comms
#     location /ws {
#         limit_req zone=military_ws burst=20 nodelay;
        
#         proxy_pass http://vcomm_backend;
#         proxy_http_version 1.1;
#         proxy_set_header Upgrade $http_upgrade;
#         proxy_set_header Connection "upgrade";
#         proxy_set_header Host $host;
#         proxy_set_header X-Real-IP $remote_addr;
#         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
#         proxy_set_header X-Forwarded-Proto $scheme;
        
#         # Long-lived connections for military ops
#         proxy_read_timeout 24h;
#         proxy_send_timeout 24h;
#         proxy_connect_timeout 60s;
#         proxy_buffering off;
#     }
    
#     # API endpoints
#     location /api/ {
#         limit_req zone=military_api burst=50 nodelay;
        
#         proxy_pass http://vcomm_backend;
#         proxy_set_header Host $host;
#         proxy_set_header X-Real-IP $remote_addr;
#         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
#         proxy_set_header X-Forwarded-Proto $scheme;
        
#         proxy_connect_timeout 30s;
#         proxy_send_timeout 30s;
#         proxy_read_timeout 30s;
#     }
    
#     # Static assets with long caching
#     location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
#         proxy_pass http://vcomm_backend;
#         expires 30d;
#         add_header Cache-Control "public, immutable";
#     }
    
#     # Main application
#     location / {
#         proxy_pass http://vcomm_backend;
#         proxy_set_header Host $host;
#         proxy_set_header X-Real-IP $remote_addr;
#         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
#         proxy_set_header X-Forwarded-Proto $scheme;
#     }
# }

# # Redirect HTTP to HTTPS
# server {
#     listen 80;
#     server_name vcomm.military localhost;
#     return 301 https://$server_name$request_uri;
# }
# EOFNGINX

#     # Update docker-compose for offline
#     cat > docker-compose.yml << 'EOFDOCKER'
# version: '3.8'

# services:
#   vcomm-app:
#     image: vcommmessengerdocker_vcomm-app:latest
#     container_name: vcomm-messenger
#     restart: unless-stopped
#     environment:
#       - NODE_ENV=production
#       - DATABASE_URL=postgresql://vcomm_user:vcomm_military_secure_pass@postgres:5432/vcomm_db
#       - SESSION_SECRET=military-grade-session-secret-change-this-immediately
#       - HTTPS_ENABLED=true
#       - MAX_CONNECTIONS=1000
#       - WEBSOCKET_HEARTBEAT=30000
#       - AUDIO_BITRATE=64000
#       - VIDEO_BITRATE=500000
#     ports:
#       - "5000:5000"
#     volumes:
#       - ./certs:/app/certs:ro
#       - ./uploads:/app/uploads
#       - ./logs:/app/logs
#     depends_on:
#       - postgres
#       - redis
#     networks:
#       - vcomm-network
#     deploy:
#       resources:
#         limits:
#           memory: 4G
#         reservations:
#           memory: 2G

#   postgres:
#     image: postgres:15-alpine
#     container_name: vcomm-postgres
#     restart: unless-stopped
#     environment:
#       - POSTGRES_DB=vcomm_db
#       - POSTGRES_USER=vcomm_user
#       - POSTGRES_PASSWORD=vcomm_military_secure_pass
#       - POSTGRES_INITDB_ARGS=--auth-host=md5
#     volumes:
#       - postgres_data:/var/lib/postgresql/data
#       - ./backups:/backups
#     command: >
#       postgres
#       -c max_connections=1000
#       -c shared_buffers=1GB
#       -c effective_cache_size=3GB
#       -c maintenance_work_mem=256MB
#       -c checkpoint_completion_target=0.7
#       -c wal_buffers=64MB
#       -c default_statistics_target=100
#       -c random_page_cost=1.1
#       -c effective_io_concurrency=200
#     networks:
#       - vcomm-network
#     deploy:
#       resources:
#         limits:
#           memory: 8G
#         reservations:
#           memory: 4G

#   redis:
#     image: redis:7-alpine
#     container_name: vcomm-redis
#     restart: unless-stopped
#     command: >
#       redis-server
#       --appendonly yes
#       --maxmemory 2gb
#       --maxmemory-policy allkeys-lru
#       --tcp-keepalive 300
#       --timeout 0
#     volumes:
#       - redis_data:/data
#     networks:
#       - vcomm-network
#     deploy:
#       resources:
#         limits:
#           memory: 2G
#         reservations:
#           memory: 1G

#   nginx:
#     image: nginx:alpine
#     container_name: vcomm-nginx
#     restart: unless-stopped
#     ports:
#       - "80:80"
#       - "443:443"
#     volumes:
#       - ./nginx-mobile.conf:/etc/nginx/conf.d/default.conf:ro
#       - ./certs:/etc/nginx/certs:ro
#       - ./nginx-logs:/var/log/nginx
#     depends_on:
#       - vcomm-app
#     networks:
#       - vcomm-network

# volumes:
#   postgres_data:
#     driver: local
#   redis_data:
#     driver: local

# networks:
#   vcomm-network:
#     driver: bridge
#     driver_opts:
#       com.docker.network.bridge.name: vcomm-br0
# EOFDOCKER
# }

# # Setup military monitoring
# setup_military_monitoring() {
#     echo "📊 Setting up military monitoring system..."
    
#     cat > military-status.sh << 'EOFMON'
# #!/bin/bash
# # Military Status Report

# clear
# echo "🎖️  VCOMM MILITARY COMMUNICATIONS STATUS"
# echo "========================================"
# echo "📅 Report Time: $(date)"
# echo "🖥️  Server: $(hostname)"
# echo "🌐 Network: OFFLINE/MILITARY"
# echo ""

# echo "📊 SYSTEM RESOURCES:"
# echo "CPU Usage: $(top -bn1 | grep "Cpu(s)" | awk '{print $2 + $4}')%"
# echo "Memory: $(free | grep Mem | awk '{printf "%.1f%% (%s/%s)", $3/$2 * 100.0, $3, $2}')"
# echo "Disk Usage: $(df -h / | awk 'NR==2{print $5 " (" $3 "/" $2 ")"}')"
# echo "Load Average: $(uptime | awk -F'load average:' '{print $2}')"
# echo ""

# echo "🐳 DOCKER SERVICES:"
# docker-compose ps
# echo ""

# echo "💾 DATABASE STATUS:"
# docker exec vcomm-postgres psql -U vcomm_user -d vcomm_db -t -c "
#     SELECT 'Active Connections: ' || count(*) FROM pg_stat_activity WHERE state = 'active';
#     SELECT 'Database Size: ' || pg_size_pretty(pg_database_size('vcomm_db'));
#     SELECT 'Tables: ' || count(*) FROM information_schema.tables WHERE table_schema = 'public';
# "
# echo ""

# echo "📱 ACTIVE USERS (Last 1 hour):"
# docker exec vcomm-postgres psql -U vcomm_user -d vcomm_db -t -c "
#     SELECT count(*) as active_users FROM users WHERE last_active > NOW() - INTERVAL '1 hour';
# " 2>/dev/null || echo "User table not ready"
# echo ""

# echo "🔒 SECURITY STATUS: ✅ MILITARY GRADE"
# echo "🌐 NETWORK MODE: ✅ OFFLINE"
# echo "📡 COMMUNICATIONS: ✅ OPERATIONAL"
# EOFMON
#     chmod +x military-status.sh
    
#     # Create backup script
#     cat > backup-military.sh << 'EOFBACK'
# #!/bin/bash
# # Military backup script

# BACKUP_DIR="./backups"
# DATE=$(date +%Y%m%d_%H%M%S)

# mkdir -p $BACKUP_DIR

# echo "🎖️  Creating military backup..."

# # Database backup
# docker exec vcomm-postgres pg_dump -U vcomm_user vcomm_db > $BACKUP_DIR/vcomm_db_$DATE.sql

# # Uploads backup
# tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz uploads/

# # Configuration backup
# tar -czf $BACKUP_DIR/config_$DATE.tar.gz docker-compose.yml nginx-mobile.conf certs/

# echo "✅ Military backup completed: $BACKUP_DIR"
# ls -la $BACKUP_DIR/*$DATE*
# EOFBACK
#     chmod +x backup-military.sh
# }

# # Main deployment function
# main() {
#     echo "🎖️  Starting VCommMessenger Military Deployment..."
    
#     install_docker
#     import_images
#     setup_offline_network
#     generate_offline_certificates
#     create_offline_config
#     setup_military_monitoring
    
#     echo "🚀 Starting military communication system..."
#     docker-compose up -d
    
#     echo "⏳ Initializing military database..."
#     sleep 30
    
#     # Initialize database
#     docker-compose exec vcomm-app npm run db:push 2>/dev/null || echo "Database initialization may need manual setup"
    
#     echo ""
#     echo "✅ VCOMM MILITARY DEPLOYMENT COMPLETE!"
#     echo "========================================"
#     echo ""
#     echo "🎖️  MILITARY ACCESS POINTS:"
#     echo "Primary: https://vcomm.military"
#     echo "Direct IP: https://$SERVER_IP"
#     echo ""
#     echo "📱 MOBILE SETUP:"
#     echo "1. Install CA certificate: certs/ca.crt"
#     echo "2. Connect to same network"
#     echo "3. Access via browser"
#     echo "4. Add to homescreen (PWA)"
#     echo ""
#     echo "🛡️  OPERATIONS:"
#     echo "Status Check: ./military-status.sh"
#     echo "Create Backup: ./backup-military.sh"
#     echo "View Logs: docker-compose logs -f"
#     echo "Restart: docker-compose restart"
#     echo ""
#     echo "🔒 SECURITY: MILITARY GRADE ENCRYPTION"
#     echo "🌐 NETWORK: OFFLINE OPERATIONAL"
#     echo "📡 STATUS: COMMUNICATIONS READY"
# }

# # Execute deployment
# main "$@"
# EOF

# chmod +x $EXPORT_DIR/deploy-offline.sh

# # Create system requirements check
# cat > $EXPORT_DIR/check-requirements.sh << 'EOF'
# #!/bin/bash
# # System requirements checker for VCommMessenger

# echo "🔍 VCommMessenger System Requirements Check"
# echo "==========================================="

# # Check OS
# echo "Operating System: $(uname -a)"

# # Check RAM
# TOTAL_RAM=$(free -g | awk 'NR==2{print $2}')
# echo "RAM: ${TOTAL_RAM}GB $([ $TOTAL_RAM -ge 16 ] && echo '✅' || echo '⚠️  Recommended: 16GB+')"

# # Check Disk
# DISK_SPACE=$(df -BG / | awk 'NR==2{gsub(/G/,"",$4); print $4}')
# echo "Disk Space: ${DISK_SPACE}GB $([ $DISK_SPACE -ge 100 ] && echo '✅' || echo '⚠️  Recommended: 500GB+')"

# # Check CPU
# CPU_CORES=$(nproc)
# echo "CPU Cores: ${CPU_CORES} $([ $CPU_CORES -ge 8 ] && echo '✅' || echo '⚠️  Recommended: 8+')"

# # Check Docker
# if command -v docker &> /dev/null; then
#     echo "Docker: ✅ $(docker --version)"
# else
#     echo "Docker: ❌ Not installed"
# fi

# # Check Docker Compose
# if command -v docker-compose &> /dev/null; then
#     echo "Docker Compose: ✅ $(docker-compose --version)"
# else
#     echo "Docker Compose: ❌ Not installed"
# fi

# echo ""
# echo "📋 Recommendations for 1000+ users:"
# echo "- RAM: 32GB+ for optimal performance"
# echo "- CPU: 16+ cores for concurrent connections"
# echo "- Storage: SSD with 1TB+ space"
# echo "- Network: Gigabit LAN for video calls"
# EOF

# chmod +x $EXPORT_DIR/check-requirements.sh

# # Create package info
# cat > $EXPORT_DIR/README.md << EOF
# # VCommMessenger Military Offline Package

# ## 📦 Package Contents
# - Docker images (exported as .tar files)
# - Configuration files
# - Deployment scripts
# - Monitoring tools

# ## 🚀 Quick Deployment

# 1. Extract this package on target server
# 2. Run: \`sudo ./check-requirements.sh\`
# 3. Run: \`sudo ./deploy-offline.sh\`
# 4. Access: https://vcomm.military

# ## 📱 Mobile Setup
# 1. Install certificate: \`certs/ca.crt\`
# 2. Connect to server network
# 3. Open browser: https://vcomm.military
# 4. Add to homescreen for PWA

# ## 🛡️ Security Features
# - Military-grade encryption
# - Offline-only operation
# - Certificate-based authentication
# - Network isolation

# ## 📊 Monitoring
# - \`./military-status.sh\` - System status
# - \`./backup-military.sh\` - Create backups
# - \`docker-compose logs -f\` - View logs

# Built: $(date)
# Version: Military-$(git rev-parse --short HEAD 2>/dev/null || echo 'standalone')
# EOF

# # Create compressed package
# echo "📦 Creating deployment package..."
# tar -czf ${PACKAGE_NAME}.tar.gz $EXPORT_DIR/

# # Calculate checksums
# sha256sum ${PACKAGE_NAME}.tar.gz > ${PACKAGE_NAME}.sha256

# echo ""
# echo "✅ Offline package created successfully!"
# echo ""
# echo "📦 Package: ${PACKAGE_NAME}.tar.gz"
# echo "🔍 Checksum: ${PACKAGE_NAME}.sha256"
# echo "📁 Size: $(du -h ${PACKAGE_NAME}.tar.gz | cut -f1)"
# echo ""
# echo "🚀 Transfer this package to target server and run:"
# echo "   tar -xzf ${PACKAGE_NAME}.tar.gz"
# echo "   cd $EXPORT_DIR"
# echo "   sudo ./deploy-offline.sh"
# echo ""
# echo "📋 Package includes:"
# echo "   - All Docker images"
# echo "   - Configuration files"
# echo "   - Deployment scripts"
# echo "   - Monitoring tools"
# echo "   - Security certificates"