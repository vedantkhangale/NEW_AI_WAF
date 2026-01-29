#!/bin/bash
# Quick setup script for Linux/Mac users

echo "========================================"
echo "  AegisX WAF - Quick Setup"
echo "========================================"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "Error: Docker not found. Please install Docker first."
    exit 1
fi

# Check GeoIP database
if [ ! -f "geoip/GeoLite2-City.mmdb" ]; then
    echo "Warning: GeoIP database not found!"
    echo "Download from: https://dev.maxmind.com/geoip/geolite2-free-geolocation-data"
    echo "Place in: geoip/GeoLite2-City.mmdb"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Start services
echo "Starting AegisX WAF..."
docker-compose up -d --build

echo ""
echo "========================================"
echo "  AegisX WAF Started!"
echo "========================================"
echo "Dashboard: http://localhost:3000"
echo "Simulator: http://localhost:8080"
echo "========================================"
echo ""
echo "Press Ctrl+C to view logs..."
sleep 3

# Show logs
docker-compose logs -f
