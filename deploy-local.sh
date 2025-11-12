#!/bin/bash

# VCommMessenger Local Deployment Script
# Optimized for mobile users on local network

set -e

echo "🚀 VCommMessenger Local Deployment Starting..."
echo "📱 Optimized for mobile users with 1000+ capacity"

# Variables
SERVER_IP=${1:-$(hostname -I | awk '{print $1}')}
DOMAIN="vcomm.local"
DB_PASSWORD=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)

echo "🌐 Server IP: $SERVER_IP"
echo "🔗 Domain: $DOMAIN"

# Check system requirements
check_requirements() {
    echo "🔍 Checking system requirements..."
    
    # Check RAM
    TOTAL_RAM=$(free -g | awk 'NR==2{print $2}')
    if [ "$TOTAL_RAM" -lt 16 ]; then
        echo "⚠️  Warning: RAM is ${TOTAL_RAM}GB, recommended 32GB+ for 1000 users"
    fi
    
    # Check disk space
    DISK_SPACE=$(df -BG / | awk 'NR==2{gsub(/G/,"",$4); print $4}')
    if [ "$DISK_SPACE" -lt 100 ]; then
        echo "⚠️  Warning: Disk space is ${DISK_SPACE}GB, recommended 500GB+ for storage"
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        echo "📦 Installing Docker..."
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        sudo usermod -aG docker $USER
        rm get-docker.sh
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        echo "📦 Installing Docker Compose..."
        sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
    fi
}

# Setup network configuration
setup_network() {
    echo "🌐 Configuring network for mobile access..."
    
    # Add domain to hosts file
    if ! grep -q "$DOMAIN" /etc/hosts; then
        echo "$SERVER_IP $DOMAIN" | sudo tee -a /etc/hosts
    fi
    
    # Configure firewall
    echo "🔥 Configuring firewall..."
    sudo ufw --force enable
    sudo ufw allow ssh
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    sudo ufw allow 5000/tcp
    sudo ufw allow from 192.168.0.0/16 to any port 5432
    sudo ufw allow from 10.0.0.0/8 to any port 5432
    
    # Optimize network settings for real-time communication
    echo "⚡ Optimizing network for real-time communication..."
    sudo sysctl -w net.core.rmem_max=16777216
    sudo sysctl -w net.core.wmem_max=16777216
    sudo sysctl -w net.ipv4.tcp_rmem="4096 65536 16777216"
    sudo sysctl -w net.ipv4.tcp_wmem="4096 65536 16777216"
    sudo sysctl -w net.core.netdev_max_backlog=5000
}

# Generate HTTPS certificates
generate_certificates() {
    echo "🔐 Generating HTTPS certificates for mobile trust..."
    
    mkdir -p certs
    
    # Generate private key
    openssl genrsa -out certs/server.key 2048
    
    # Create certificate config
    cat > certs/server.conf << EOF
[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_req
prompt = no

[req_distinguished_name]
CN = $DOMAIN

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = $DOMAIN
DNS.2 = localhost
IP.1 = $SERVER_IP
IP.2 = 127.0.0.1
EOF
    
    # Generate certificate
    openssl req -new -x509 -sha256 -key certs/server.key -out certs/server.crt -days 365 -config certs/server.conf
    
    echo "✅ HTTPS certificates generated"
    echo "📱 Mobile users need to trust this certificate once"
}

# Create optimized nginx configuration
create_nginx_config() {
    echo "⚙️  Creating mobile-optimized nginx configuration..."
    
    cat > nginx-mobile.conf << 'EOF'
# Mobile-optimized nginx configuration for VCommMessenger

upstream vcomm_backend {
    server vcomm-app:5000;
    keepalive 32;
}

# Rate limiting for mobile connections
limit_req_zone $binary_remote_addr zone=mobile_api:10m rate=30r/m;
limit_req_zone $binary_remote_addr zone=mobile_ws:10m rate=10r/m;

server {
    listen 443 ssl http2;
    server_name vcomm.local;
    
    # SSL Configuration
    ssl_certificate /etc/nginx/certs/server.crt;
    ssl_certificate_key /etc/nginx/certs/server.key;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;
    
    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # Mobile optimization headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy no-referrer-when-downgrade always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # PWA headers
    add_header Service-Worker-Allowed / always;
    
    # Compression for mobile bandwidth
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;
    
    # WebSocket proxy for real-time communication
    location /ws {
        limit_req zone=mobile_ws burst=5 nodelay;
        
        proxy_pass http://vcomm_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket timeouts
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
        proxy_connect_timeout 60s;
        
        # Buffer settings for mobile
        proxy_buffering off;
    }
    
    # API routes
    location /api/ {
        limit_req zone=mobile_api burst=10 nodelay;
        
        proxy_pass http://vcomm_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Mobile API optimization
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Static files with aggressive caching for mobile
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://vcomm_backend;
        
        # Cache headers for mobile performance
        expires 1y;
        add_header Cache-Control "public, immutable" always;
        add_header X-Cache-Status "STATIC" always;
    }
    
    # Main application
    location / {
        proxy_pass http://vcomm_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Mobile HTML caching
        expires 1h;
        add_header Cache-Control "public, must-revalidate" always;
    }
}

# HTTP redirect to HTTPS
server {
    listen 80;
    server_name vcomm.local;
    return 301 https://$server_name$request_uri;
}
EOF
}

# Create production environment file
create_env_file() {
    echo "📝 Creating production environment configuration..."
    
    cat > .env.production << EOF
# VCommMessenger Production Environment
NODE_ENV=production
DATABASE_URL=postgresql://vcomm_user:${DB_PASSWORD}@postgres:5432/vcomm_db
SESSION_SECRET=${SESSION_SECRET}
HTTPS_ENABLED=true

# Mobile optimization settings
MAX_CONNECTIONS=1000
WEBSOCKET_HEARTBEAT=30000
AUDIO_BITRATE=64000
VIDEO_BITRATE=500000

# Security settings
CORS_ORIGIN=https://vcomm.local
SECURE_COOKIES=true
TRUST_PROXY=true
EOF
}

# Setup monitoring
setup_monitoring() {
    echo "📊 Setting up system monitoring..."
    
    cat > monitor.sh << 'EOF'
#!/bin/bash
# VCommMessenger monitoring script

echo "🖥️  System Status:"
echo "CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2 + $4}')% usage"
echo "RAM: $(free | grep Mem | awk '{printf "%.1f%", $3/$2 * 100.0}')"
echo "Disk: $(df -h / | awk 'NR==2{print $5}')"

echo ""
echo "📱 VCommMessenger Status:"
docker-compose ps

echo ""
echo "🔌 Active Connections:"
docker exec vcomm-postgres psql -U vcomm_user -d vcomm_db -t -c "SELECT count(*) as active_connections FROM pg_stat_activity WHERE state = 'active';"

echo ""
echo "💾 Database Size:"
docker exec vcomm-postgres psql -U vcomm_user -d vcomm_db -t -c "SELECT pg_size_pretty(pg_database_size('vcomm_db'));"
EOF
    chmod +x monitor.sh
}

# Main deployment
main() {
    echo "🚀 Starting VCommMessenger deployment..."
    
    check_requirements
    setup_network
    generate_certificates
    create_nginx_config
    create_env_file
    setup_monitoring
    
    echo "📦 Starting application containers..."
    docker-compose up -d
    
    # Wait for services to start
    echo "⏳ Waiting for services to initialize..."
    sleep 30
    
    # Run database migrations
    echo "🗄️  Setting up database..."
    docker-compose exec vcomm-app npm run db:push
    
    echo ""
    echo "✅ VCommMessenger deployed successfully!"
    echo ""
    echo "📱 Mobile Access Instructions:"
    echo "1. Connect mobile devices to same WiFi network"
    echo "2. Open browser and go to: https://$DOMAIN"
    echo "3. Accept security certificate (one-time setup)"
    echo "4. Tap 'Add to Home Screen' for PWA installation"
    echo "5. Allow microphone/camera permissions"
    echo ""
    echo "🖥️  Server Management:"
    echo "- Monitor: ./monitor.sh"
    echo "- Logs: docker-compose logs -f"
    echo "- Restart: docker-compose restart"
    echo "- Stop: docker-compose down"
    echo ""
    echo "🔐 Save these credentials:"
    echo "Database Password: $DB_PASSWORD"
    echo "Session Secret: $SESSION_SECRET"
    echo ""
    echo "📊 Server accessible at: https://$DOMAIN"
    echo "🌐 Server IP: $SERVER_IP"
}

# Run main function
main "$@"