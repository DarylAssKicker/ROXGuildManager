#!/bin/bash

# Docker build script
echo "🐳 Starting to build ROX Guild Manager Docker images..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed, please install Docker first"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed, please install Docker Compose first"
    exit 1
fi

# Stop and remove existing containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Remove existing images (optional)
read -p "Do you want to remove existing images and rebuild? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗑️  Removing existing images..."
    docker-compose down --rmi all
fi

# Ask whether to clear cache and rebuild
read -p "Do you want to clear cache and rebuild? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔨 Building images (clearing cache)..."
    BUILD_COMMAND="docker-compose build --no-cache"
else
    echo "🔨 Building images (using cache)..."
    BUILD_COMMAND="docker-compose build"
fi

if $BUILD_COMMAND; then
    echo "✅ Images built successfully!"
    echo "📋 Available commands:"
    echo "   Start services: docker-compose up -d"
    echo "   View logs: docker-compose logs -f"
    echo "   Stop services: docker-compose down"
    echo "   Restart services: docker-compose restart"
else
    echo "❌ Image build failed!"
    echo "💡 Common troubleshooting:"
    echo "   1. Check if running Linux script on Windows environment, please use docker-build.bat"
    echo "   2. Check if Docker and Docker Compose are properly installed"
    echo "   3. View detailed errors: docker-compose logs"
    exit 1
fi