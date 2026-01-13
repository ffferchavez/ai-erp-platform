#!/bin/bash
# Add Docker provider to traefik.yml.template on VPS

set -e

TEMPLATE_FILE="traefik/traefik.yml.template"

if [ ! -f "$TEMPLATE_FILE" ]; then
    echo "ERROR: $TEMPLATE_FILE not found"
    exit 1
fi

# Check if already exists
if grep -q "docker:" "$TEMPLATE_FILE"; then
    echo "✓ Docker provider already exists in template"
    exit 0
fi

echo "Adding Docker provider to $TEMPLATE_FILE"

# Create backup
cp "$TEMPLATE_FILE" "${TEMPLATE_FILE}.backup"
echo "Created backup: ${TEMPLATE_FILE}.backup"

# Find the providers: line
PROVIDERS_LINE=$(grep -n "^providers:" "$TEMPLATE_FILE" | head -1 | cut -d: -f1)

if [ -z "$PROVIDERS_LINE" ]; then
    echo "ERROR: Could not find providers: line"
    exit 1
fi

echo "Found providers: at line $PROVIDERS_LINE"

# Add Docker provider section after providers: line
# Using sed to insert after the line
sed -i "${PROVIDERS_LINE}a\  docker:\n    endpoint: \"unix:///var/run/docker.sock\"\n    exposedByDefault: false\n    network: platform" "$TEMPLATE_FILE"

echo "✓ Added Docker provider to template"
echo ""
echo "Verifying..."
if grep -q "docker:" "$TEMPLATE_FILE"; then
    echo "✓ Verification successful"
    echo ""
    echo "Template now contains:"
    grep -A 5 "providers:" "$TEMPLATE_FILE"
    echo ""
    echo "Now restart Traefik to apply changes:"
    echo "  docker compose restart traefik"
    echo ""
    echo "Then verify with:"
    echo "  docker compose exec traefik cat /config/traefik.yml | grep -A 5 'providers:'"
else
    echo "✗ Verification failed"
    exit 1
fi
