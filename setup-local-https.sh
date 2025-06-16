#!/bin/bash

# Script untuk setup HTTPS local server
echo "🔐 Setting up HTTPS for local VCommMessenger deployment..."

# Create certificates directory
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
CN = vcomm.local

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = vcomm.local
DNS.2 = localhost
IP.1 = 192.168.1.100
IP.2 = 127.0.0.1
EOF

# Generate certificate
openssl req -new -x509 -sha256 -key certs/server.key -out certs/server.crt -days 365 -config certs/server.conf

echo "✅ HTTPS certificates generated!"
echo "📱 Add this certificate to mobile devices for trusted connection"
echo "🌐 Access app at: https://vcomm.local:5000"

# Create nginx config for mobile optimization
cat > nginx-mobile.conf << EOF
server {
    listen 443 ssl http2;
    server_name vcomm.local;
    
    ssl_certificate certs/server.crt;
    ssl_certificate_key certs/server.key;
    
    # Mobile optimization
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    # WebSocket upgrade
    location /ws {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
    
    # Main app
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Mobile cache headers
        add_header Cache-Control "public, max-age=31536000" always;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name vcomm.local;
    return 301 https://\$server_name\$request_uri;
}
EOF

echo "📋 Nginx config created: nginx-mobile.conf"