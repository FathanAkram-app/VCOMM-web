#!/bin/bash

# Staging Deployment Script
# Server: 72.62.124.132
# User: root

set -e

REMOTE_HOST="72.62.124.132"
REMOTE_USER="root"
REMOTE_DIR="/opt/vcomm-staging"

echo "=== VCOMM Staging Deployment ==="

# Files to deploy
FILES=(
    "docker-compose.staging.yml"
    "turnserver.conf"
)

echo "[1/4] Creating remote directory..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "mkdir -p ${REMOTE_DIR}"

echo "[2/4] Copying files to staging server..."
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  Copying $file..."
        scp "$file" ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/
    else
        echo "  Warning: $file not found, skipping..."
    fi
done

# Copy uploads directory if exists
if [ -d "uploads" ]; then
    echo "  Copying uploads directory..."
    scp -r uploads ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/
fi

# Copy certs directory if exists
if [ -d "certs" ]; then
    echo "  Copying certs directory..."
    scp -r certs ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/
fi

echo "[3/4] Building and starting containers on staging server..."
ssh ${REMOTE_USER}@${REMOTE_HOST} << 'ENDSSH'
cd /opt/vcomm-staging

# Pull latest images
docker pull redis:7-alpine
docker pull coturn/coturn:latest

# Stop existing containers if running
docker compose -f docker-compose.staging.yml down 2>/dev/null || true

# Start containers
docker compose -f docker-compose.staging.yml up -d

# Show status
echo ""
echo "=== Container Status ==="
docker compose -f docker-compose.staging.yml ps
ENDSSH

echo "[4/4] Deployment complete!"
echo ""
echo "Staging server: http://${REMOTE_HOST}:5000"
