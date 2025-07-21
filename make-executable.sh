#!/bin/bash

# Make all scripts executable
chmod +x install-proxmox.sh
chmod +x monitor-system.sh
chmod +x maintenance.sh
chmod +x performance-monitor.sh
chmod +x setup-ssl.sh

echo "✅ All scripts are now executable!"
echo ""
echo "Available scripts:"
echo "  ./install-proxmox.sh     - Auto installation for Proxmox VM"
echo "  ./monitor-system.sh      - System monitoring"
echo "  ./maintenance.sh         - Maintenance operations"
echo "  ./performance-monitor.sh - Performance monitoring"
echo "  ./setup-ssl.sh          - SSL certificate setup"