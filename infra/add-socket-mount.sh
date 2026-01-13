#!/bin/bash
# Script to add Docker socket mount to docker-compose.yml on VPS

set -e

COMPOSE_FILE="docker-compose.yml"

if [ ! -f "$COMPOSE_FILE" ]; then
    echo "ERROR: $COMPOSE_FILE not found in current directory"
    exit 1
fi

# Check if already exists
if grep -q "/var/run/docker.sock" "$COMPOSE_FILE"; then
    echo "✓ Docker socket mount already exists"
    exit 0
fi

# Find the line number of traefik-letsencrypt
LETSENCRYPT_LINE=$(grep -n "traefik-letsencrypt:/letsencrypt" "$COMPOSE_FILE" | head -1 | cut -d: -f1)

if [ -z "$LETSENCRYPT_LINE" ]; then
    echo "ERROR: Could not find traefik-letsencrypt line"
    exit 1
fi

echo "Found traefik-letsencrypt at line $LETSENCRYPT_LINE"
echo "Adding Docker socket mount after line $LETSENCRYPT_LINE"

# Create backup
cp "$COMPOSE_FILE" "${COMPOSE_FILE}.backup"
echo "Created backup: ${COMPOSE_FILE}.backup"

# Add the socket mount line after traefik-letsencrypt
# Using sed to insert after the line
sed -i "${LETSENCRYPT_LINE}a\      - /var/run/docker.sock:/var/run/docker.sock:ro" "$COMPOSE_FILE"

echo "✓ Added Docker socket mount to docker-compose.yml"
echo ""
echo "Verifying..."
if grep -q "/var/run/docker.sock" "$COMPOSE_FILE"; then
    echo "✓ Verification successful"
    echo ""
    echo "The line was added. Now restart services:"
    echo "  docker compose down"
    echo "  docker compose up -d --build"
else
    echo "✗ Verification failed - please add manually"
    exit 1
fi
