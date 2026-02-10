# Staging Deployment Script (PowerShell)
# Server: 72.62.124.132
# User: root

$REMOTE_HOST = "72.62.124.132"
$REMOTE_USER = "root"
$REMOTE_DIR = "/opt/vcomm-staging"

Write-Host "=== VCOMM Staging Deployment ===" -ForegroundColor Cyan

Write-Host "[1/4] Creating remote directory..." -ForegroundColor Yellow
ssh ${REMOTE_USER}@${REMOTE_HOST} "mkdir -p ${REMOTE_DIR}"

Write-Host "[2/4] Copying files to staging server..." -ForegroundColor Yellow

# Copy docker-compose file
if (Test-Path "docker-compose.staging.yml") {
    Write-Host "  Copying docker-compose.staging.yml..."
    scp docker-compose.staging.yml ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/
}

# Copy turnserver.conf if exists
if (Test-Path "turnserver.conf") {
    Write-Host "  Copying turnserver.conf..."
    scp turnserver.conf ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/
}

# Copy uploads directory if exists
if (Test-Path "uploads") {
    Write-Host "  Copying uploads directory..."
    scp -r uploads ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/
}

# Copy certs directory if exists
if (Test-Path "certs") {
    Write-Host "  Copying certs directory..."
    scp -r certs ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/
}

Write-Host "[3/4] Starting containers on staging server..." -ForegroundColor Yellow
ssh ${REMOTE_USER}@${REMOTE_HOST} @"
cd ${REMOTE_DIR}
docker pull redis:7-alpine
docker pull coturn/coturn:latest
docker compose -f docker-compose.staging.yml down 2>/dev/null || true
docker compose -f docker-compose.staging.yml up -d
echo ''
echo '=== Container Status ==='
docker compose -f docker-compose.staging.yml ps
"@

Write-Host "[4/4] Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Staging server: http://${REMOTE_HOST}:5000" -ForegroundColor Cyan
