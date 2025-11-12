#!/bin/bash

# Docker Cleanup Script untuk Proxmox VM
# Script ini membersihkan Docker resources yang tidak terpakai

echo "🐳 Starting Docker cleanup process..."
echo "=================================="

# Function to show disk usage before and after
show_disk_usage() {
    echo "📊 Current Docker disk usage:"
    docker system df
    echo ""
}

# Show initial disk usage
show_disk_usage

# Remove stopped containers
echo "🗑️  Removing stopped containers..."
STOPPED_CONTAINERS=$(docker container prune -f --filter "until=24h" 2>/dev/null | grep "Total reclaimed space" || echo "No containers to remove")
echo "$STOPPED_CONTAINERS"

# Remove unused images
echo "🖼️  Removing unused images..."
UNUSED_IMAGES=$(docker image prune -f --filter "until=24h" 2>/dev/null | grep "Total reclaimed space" || echo "No images to remove")
echo "$UNUSED_IMAGES"

# Remove unused volumes (be careful with this in production)
echo "💾 Removing unused volumes..."
UNUSED_VOLUMES=$(docker volume prune -f 2>/dev/null | grep "Total reclaimed space" || echo "No volumes to remove")
echo "$UNUSED_VOLUMES"

# Remove unused networks
echo "🌐 Removing unused networks..."
UNUSED_NETWORKS=$(docker network prune -f 2>/dev/null | grep "Total reclaimed space" || echo "No networks to remove")
echo "$UNUSED_NETWORKS"

# Remove build cache
echo "🏗️  Removing build cache..."
BUILD_CACHE=$(docker builder prune -f 2>/dev/null | grep "Total reclaimed space" || echo "No build cache to remove")
echo "$BUILD_CACHE"

echo ""
echo "✅ Cleanup completed!"
echo "=================================="

# Show final disk usage
show_disk_usage

# Show running containers
echo "🏃 Currently running containers:"
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "📈 System resources after cleanup:"
echo "Memory usage:"
free -h
echo ""
echo "Disk usage:"
df -h /var/lib/docker

# Log cleanup to file
echo "$(date): Docker cleanup completed" >> ~/docker-cleanup.log