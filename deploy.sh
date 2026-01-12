#!/bin/bash

# VComm Backend Deployment Script
# This script deploys the VComm backend using Docker

echo "🚀 VComm Backend Deployment Script"
echo "=================================="

# Stop and remove existing containers
echo "📦 Stopping existing containers..."
docker compose -f docker-compose.yml down

# Remove old images (optional, uncomment to clean up)
# docker image prune -f

# Start containers (image already loaded)
echo "🏗️  Starting containers..."
docker compose -f docker-compose.yml up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to start..."
sleep 10

# Check if containers are running
echo "✅ Checking container status..."
docker compose -f docker-compose.yml ps

# Show logs
echo "📋 Recent logs:"
docker compose -f docker-compose.yml logs --tail=50

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Services are running on:"
echo "  - Main App: http://localhost:5000"
echo "  - Nginx: http://localhost:80"
echo "  - Postgres: localhost:5432"
echo "  - Redis: localhost:6379"
echo "  - Gotify: http://localhost:8888"
echo "  - Coturn: localhost:3478"
echo ""
echo "To view logs: docker compose -f docker-compose.yml logs -f"
echo "To stop: docker compose -f docker-compose.yml down"
