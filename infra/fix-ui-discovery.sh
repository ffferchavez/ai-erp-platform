#!/bin/bash
# Complete fix for UI discovery issue - run on VPS

set -e

LOG_FILE="/Users/fernandochavez/Documents/developer/ai-erp-platform/.cursor/debug.log"

log() {
    echo "{\"timestamp\":$(date +%s000),\"location\":\"fix-ui-discovery.sh\",\"message\":\"$1\",\"data\":$2,\"sessionId\":\"debug-session\",\"runId\":\"fix\",\"hypothesisId\":\"fix\"}" >> "$LOG_FILE" 2>/dev/null || true
}

echo "=== Fixing UI Discovery Issue ==="
echo ""

# Ensure we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "ERROR: docker-compose.yml not found!"
    echo "Please run from: /opt/ai-erp-platform/infra"
    exit 1
fi

log "fix-start" "{\"directory\":\"$(pwd)\"}"

# Step 1: Verify DOMAIN_UI is set
echo "=== Step 1: Checking DOMAIN_UI ==="
if [ -f .env ]; then
    DOMAIN_UI=$(grep "^DOMAIN_UI=" .env | cut -d'=' -f2 | tr -d '"' | tr -d "'")
    if [ -z "$DOMAIN_UI" ]; then
        echo "ERROR: DOMAIN_UI not set in .env file"
        exit 1
    fi
    echo "✓ DOMAIN_UI=$DOMAIN_UI"
    log "domain-check" "{\"domain\":\"$DOMAIN_UI\"}"
else
    echo "ERROR: .env file not found"
    exit 1
fi
echo ""

# Step 2: Verify docker-compose.yml has socket mount
echo "=== Step 2: Verifying Docker socket mount ==="
if grep -q "/var/run/docker.sock" docker-compose.yml; then
    echo "✓ Docker socket mount found"
    log "socket-mount-check" "{\"found\":true}"
else
    echo "✗ Adding Docker socket mount..."
    sed -i '/traefik-letsencrypt:\/letsencrypt/a\      - /var/run/docker.sock:/var/run/docker.sock:ro' docker-compose.yml
    echo "✓ Docker socket mount added"
    log "socket-mount-check" "{\"added\":true}"
fi
echo ""

# Step 3: Verify traefik.yml.template has Docker provider
echo "=== Step 3: Verifying Docker provider in template ==="
if grep -q "docker:" traefik/traefik.yml.template; then
    echo "✓ Docker provider found in template"
    log "docker-provider-check" "{\"found\":true}"
else
    echo "✗ Adding Docker provider to template..."
    # Backup
    cp traefik/traefik.yml.template traefik/traefik.yml.template.backup
    
    # Add Docker provider before file provider
    sed -i '/^providers:/a\  docker:\n    endpoint: "unix:///var/run/docker.sock"\n    exposedByDefault: false\n    network: platform' traefik/traefik.yml.template
    
    echo "✓ Docker provider added"
    log "docker-provider-check" "{\"added\":true}"
fi
echo ""

# Step 4: Stop all containers
echo "=== Step 4: Stopping containers ==="
docker compose down
log "containers-stopped" "{}"
echo ""

# Step 5: Recreate UI container with proper labels
echo "=== Step 5: Recreating UI container ==="
# Force recreate to ensure labels are applied correctly
docker compose up -d --force-recreate --build ui
log "ui-recreated" "{}"
echo ""

# Step 6: Start all containers
echo "=== Step 6: Starting all containers ==="
docker compose up -d
log "containers-started" "{}"
echo ""

# Step 7: Wait for containers to be ready
echo "=== Step 7: Waiting for containers (15 seconds) ==="
sleep 15
log "wait-complete" "{}"
echo ""

# Step 8: Verify Docker socket is accessible
echo "=== Step 8: Verifying Docker socket ==="
if docker compose exec -T traefik ls -la /var/run/docker.sock >/dev/null 2>&1; then
    echo "✓ Docker socket accessible"
    log "socket-verify" "{\"accessible\":true}"
else
    echo "✗ Docker socket NOT accessible"
    log "socket-verify" "{\"accessible\":false}"
fi
echo ""

# Step 9: Verify Traefik config has Docker provider
echo "=== Step 9: Verifying Traefik config ==="
TRAEFIK_CONFIG=$(docker compose exec -T traefik cat /config/traefik.yml 2>&1)
if echo "$TRAEFIK_CONFIG" | grep -q "docker:"; then
    echo "✓ Traefik config has Docker provider"
    log "traefik-config-verify" "{\"has_docker\":true}"
else
    echo "✗ Traefik config missing Docker provider"
    log "traefik-config-verify" "{\"has_docker\":false}"
fi
echo ""

# Step 10: Check UI container labels
echo "=== Step 10: Checking UI container labels ==="
UI_LABELS=$(docker inspect ui --format '{{range $k, $v := .Config.Labels}}{{$k}}={{$v}}{{"\n"}}{{end}}' 2>&1)
if echo "$UI_LABELS" | grep -q "traefik.enable=true"; then
    echo "✓ UI has traefik.enable=true"
    
    # Check if DOMAIN_UI was substituted
    if echo "$UI_LABELS" | grep -q '\${DOMAIN_UI}'; then
        echo "✗ WARNING: Labels still contain \${DOMAIN_UI} - variable not substituted!"
        echo "This might be a Docker Compose version issue."
        echo "Labels:"
        echo "$UI_LABELS" | grep Host
        log "ui-labels" "{\"has_enable\":true,\"substituted\":false}"
    else
        echo "✓ Labels have actual domain (not \${DOMAIN_UI})"
        ACTUAL_DOMAIN=$(echo "$UI_LABELS" | grep "Host" | head -1 | sed 's/.*Host(`\(.*\)`).*/\1/')
        echo "  Domain in labels: $ACTUAL_DOMAIN"
        log "ui-labels" "{\"has_enable\":true,\"substituted\":true,\"domain\":\"$ACTUAL_DOMAIN\"}"
    fi
else
    echo "✗ UI missing traefik.enable=true"
    log "ui-labels" "{\"has_enable\":false}"
fi
echo ""

# Step 11: Wait for Traefik to discover (give it time)
echo "=== Step 11: Waiting for Traefik discovery (10 seconds) ==="
sleep 10
echo ""

# Step 12: Check if Traefik discovered UI
echo "=== Step 12: Checking Traefik discovery ==="
TRAEFIK_ROUTERS=$(curl -s http://localhost:8080/api/http/routers 2>&1)
UI_ROUTERS=$(echo "$TRAEFIK_ROUTERS" | grep -o '"name":"[^"]*ui[^"]*"' || echo "none")

if echo "$UI_ROUTERS" | grep -q "ui"; then
    echo "✓ SUCCESS! Traefik discovered UI routers:"
    echo "$UI_ROUTERS" | sed 's/"name":"\([^"]*\)"/  - \1/g'
    log "discovery-success" "{\"routers\":\"$UI_ROUTERS\"}"
    echo ""
    echo "=== UI should now be accessible! ==="
    echo "Test with: curl -I http://demo.helioncity.com"
    echo "Should redirect to HTTPS"
else
    echo "✗ Traefik did NOT discover UI routers yet"
    echo "This might take a bit longer. Checking Traefik logs..."
    echo ""
    docker compose logs --tail=30 traefik | grep -i "ui\|docker\|error" || echo "No relevant logs"
    echo ""
    echo "Try waiting 30 more seconds and check again:"
    echo "  curl -s http://localhost:8080/api/http/routers | grep ui"
    log "discovery-failed" "{\"routers\":\"$UI_ROUTERS\"}"
fi

echo ""
echo "=== Fix Complete ==="
echo "If UI routers still not discovered, check:"
echo "1. UI container labels: docker inspect ui --format '{{range \$k, \$v := .Config.Labels}}{{\$k}}={{\$v}}{{\"\\n\"}}{{end}}' | grep traefik"
echo "2. Traefik logs: docker compose logs traefik | tail -50"
echo "3. Traefik API: curl http://localhost:8080/api/http/routers"
