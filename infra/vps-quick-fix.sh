#!/bin/bash
# Quick fix script for VPS - run from /opt/ai-erp-platform/infra

set -e

echo "=== VPS Quick Fix Script ==="
echo ""

# Ensure we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "ERROR: docker-compose.yml not found!"
    echo "Please run this script from: /opt/ai-erp-platform/infra"
    echo "Current directory: $(pwd)"
    exit 1
fi

echo "✓ Found docker-compose.yml"
echo ""

# Step 1: Check if socket mount exists
echo "=== Step 1: Checking Docker socket mount ==="
if grep -q "/var/run/docker.sock" docker-compose.yml; then
    echo "✓ Docker socket mount found in docker-compose.yml"
    SOCKET_EXISTS=true
else
    echo "✗ Docker socket mount MISSING"
    echo ""
    echo "Adding socket mount to docker-compose.yml..."
    # This is a bit tricky - we'll need to add it manually
    echo "Please add this line to docker-compose.yml in the traefik volumes section:"
    echo "  - /var/run/docker.sock:/var/run/docker.sock:ro"
    echo ""
    echo "It should be after the traefik-letsencrypt line."
    SOCKET_EXISTS=false
fi
echo ""

# Step 2: Check if Docker provider exists in template
echo "=== Step 2: Checking Traefik Docker provider ==="
if grep -q "docker:" traefik/traefik.yml.template; then
    echo "✓ Docker provider found in traefik.yml.template"
    DOCKER_PROVIDER_EXISTS=true
else
    echo "✗ Docker provider MISSING in traefik.yml.template"
    DOCKER_PROVIDER_EXISTS=false
fi
echo ""

# Step 3: Check current container state
echo "=== Step 3: Checking current container state ==="
if docker inspect traefik >/dev/null 2>&1; then
    echo "✓ Traefik container exists"
    
    # Check if socket is mounted
    if docker inspect traefik --format '{{range .Mounts}}{{.Destination}}{{"\n"}}{{end}}' | grep -q "docker.sock"; then
        echo "✓ Docker socket IS mounted in running container"
        SOCKET_MOUNTED=true
    else
        echo "✗ Docker socket NOT mounted in running container"
        SOCKET_MOUNTED=false
    fi
else
    echo "✗ Traefik container not found"
    SOCKET_MOUNTED=false
fi
echo ""

# Step 4: Summary and actions needed
echo "=== Summary ==="
if [ "$SOCKET_EXISTS" = true ] && [ "$DOCKER_PROVIDER_EXISTS" = true ]; then
    if [ "$SOCKET_MOUNTED" = false ]; then
        echo "Configuration files are correct, but container needs restart."
        echo ""
        echo "Restarting services..."
        docker compose down
        docker compose up -d --build
        echo ""
        echo "Waiting 10 seconds for containers to start..."
        sleep 10
        echo ""
        echo "=== Verifying fix ==="
        if docker compose exec -T traefik ls -la /var/run/docker.sock >/dev/null 2>&1; then
            echo "✓ Docker socket is now accessible"
        else
            echo "✗ Docker socket still not accessible - check docker-compose.yml"
        fi
    else
        echo "✓ Everything looks correct!"
        echo "Docker socket is mounted and configuration is correct."
    fi
else
    echo "✗ Configuration files need to be updated."
    echo ""
    echo "Please ensure:"
    echo "1. docker-compose.yml has: - /var/run/docker.sock:/var/run/docker.sock:ro"
    echo "2. traefik/traefik.yml.template has Docker provider section"
    echo ""
    echo "Then run: docker compose down && docker compose up -d --build"
fi

echo ""
echo "=== Checking UI container ==="
if docker compose ps | grep -q ui; then
    echo "✓ UI container exists"
else
    echo "✗ UI container not found - will be created on next docker compose up"
fi

echo ""
echo "=== Done ==="
