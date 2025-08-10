#!/bin/bash

# Docker run script
echo "🚀 Starting ROX Guild Manager..."

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Docker is not running, please start Docker service"
    exit 1
fi

# Check if images exist
if ! docker-compose config &> /dev/null; then
    echo "❌ docker-compose.yml configuration file is incorrect"
    exit 1
fi

# Start services
echo "🔄 Starting services..."
docker-compose up -d

if [ $? -eq 0 ]; then
    echo "✅ Services started successfully!"
    echo ""
    echo "📍 Access URLs:"
    echo "   Client (Nginx): http://localhost"
    echo "   Server API: http://localhost:3001"
    echo "   Redis: localhost:6379"
    echo ""
    echo "🏗️ Production Environment Architecture:"
    echo "   - Client served via Nginx for static files"
    echo "   - API requests automatically proxied to backend server"
    echo "   - Gzip compression and security headers enabled"
    echo "   - Static resource caching optimized"
    echo ""
    echo "📋 Common Commands:"
    echo "   Check status: docker-compose ps"
    echo "   View logs: docker-compose logs -f"
    echo "   Stop services: docker-compose down"
    echo "   Restart services: docker-compose restart"
    echo ""
    echo "⏳ Waiting for services to fully start..."
    sleep 5
    
    # Check service health status
    echo "🔍 Checking service status..."
    docker-compose ps
else
    echo "❌ Service startup failed!"
    echo "View error logs: docker-compose logs"
    exit 1
fi