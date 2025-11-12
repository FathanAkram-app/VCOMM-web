#!/bin/bash

# Docker Services Startup Script untuk Proxmox VM
echo "🚀 Starting Docker services..."

# Function to check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        echo "❌ Docker is not running. Please start Docker first:"
        echo "sudo systemctl start docker"
        exit 1
    fi
}

# Function to start basic services
start_basic_services() {
    echo "📦 Starting basic services (Nginx + Portainer)..."
    if [ -f "docker-compose.yml" ]; then
        docker compose up -d
        echo "✅ Basic services started"
    else
        echo "❌ docker-compose.yml not found"
        return 1
    fi
}

# Function to start monitoring services
start_monitoring() {
    echo "📊 Starting monitoring services..."
    if [ -f "monitoring-docker-compose.yml" ]; then
        docker compose -f monitoring-docker-compose.yml up -d
        echo "✅ Monitoring services started"
    else
        echo "❌ monitoring-docker-compose.yml not found"
        return 1
    fi
}

# Main execution
check_docker

case "${1:-basic}" in
    "basic")
        start_basic_services
        ;;
    "monitoring")
        start_monitoring
        ;;
    "all")
        start_basic_services
        start_monitoring
        ;;
    "stop")
        echo "🛑 Stopping all services..."
        docker compose down 2>/dev/null || true
        docker compose -f monitoring-docker-compose.yml down 2>/dev/null || true
        echo "✅ All services stopped"
        ;;
    *)
        echo "Usage: $0 [basic|monitoring|all|stop]"
        echo "  basic     - Start Nginx and Portainer (default)"
        echo "  monitoring- Start monitoring stack (Prometheus, Grafana)"
        echo "  all       - Start all services"
        echo "  stop      - Stop all services"
        exit 1
        ;;
esac

# Show status
if [ "${1}" != "stop" ]; then
    echo ""
    echo "📋 Service Status:"
    docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"
    
    echo ""
    echo "🌐 Access URLs:"
    echo "  Nginx:     http://localhost:8080"
    echo "  Portainer: http://localhost:9000"
    if [ "${1}" == "monitoring" ] || [ "${1}" == "all" ]; then
        echo "  Grafana:   http://localhost:3000 (admin/admin)"
        echo "  Prometheus: http://localhost:9090"
        echo "  cAdvisor:  http://localhost:8081"
    fi
fi