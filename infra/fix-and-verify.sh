#!/bin/bash
# Fix and verify UI deployment

LOG_FILE="/Users/fernandochavez/Documents/developer/ai-erp-platform/.cursor/debug.log"

log() {
    echo "{\"timestamp\":$(date +%s000),\"location\":\"fix-and-verify.sh\",\"message\":\"$1\",\"data\":$2,\"sessionId\":\"debug-session\",\"runId\":\"fix\",\"hypothesisId\":\"$3\"}" >> "$LOG_FILE"
}

echo "=== Step 1: Verifying Configuration Files ==="

# Check template has Docker provider
if grep -q "docker:" traefik/traefik.yml.template; then
    echo "✓ Template has Docker provider"
    log "template-check" "{\"has_docker_provider\":true}" "fix"
else
    echo "✗ Template missing Docker provider"
    log "template-check" "{\"has_docker_provider\":false}" "fix"
    exit 1
fi

# Check docker-compose has Docker socket mount
if grep -q "/var/run/docker.sock" docker-compose.yml; then
    echo "✓ Docker socket mount configured"
    log "docker-socket-check" "{\"mounted\":true}" "fix"
else
    echo "✗ Docker socket not mounted"
    log "docker-socket-check" "{\"mounted\":false}" "fix"
    exit 1
fi

# Check UI service exists
if grep -q "ui:" docker-compose.yml; then
    echo "✓ UI service defined"
    log "ui-service-check" "{\"exists\":true}" "fix"
else
    echo "✗ UI service missing"
    log "ui-service-check" "{\"exists\":false}" "fix"
    exit 1
fi

echo -e "\n=== Step 2: Restarting Services ==="
echo "Stopping containers..."
docker compose down
log "docker-compose-down" "{\"action\":\"stopped\"}" "fix"

echo "Starting containers with rebuild..."
docker compose up -d --build
log "docker-compose-up" "{\"action\":\"started\",\"rebuild\":true}" "fix"

echo "Waiting 10 seconds for containers to start..."
sleep 10

echo -e "\n=== Step 3: Verifying Fix ==="

# Check UI container exists
if docker inspect ui >/dev/null 2>&1; then
    echo "✓ UI container exists"
    log "ui-container-verify" "{\"exists\":true}" "fix"
else
    echo "✗ UI container not found"
    log "ui-container-verify" "{\"exists\":false}" "fix"
fi

# Check Docker socket accessible
if docker compose exec -T traefik ls -la /var/run/docker.sock >/dev/null 2>&1; then
    echo "✓ Docker socket accessible"
    log "docker-socket-verify" "{\"accessible\":true}" "fix"
else
    echo "✗ Docker socket not accessible"
    log "docker-socket-verify" "{\"accessible\":false}" "fix"
fi

# Check Traefik config has Docker provider
TRAEFIK_CONFIG=$(docker compose exec -T traefik cat /config/traefik.yml 2>&1)
if echo "$TRAEFIK_CONFIG" | grep -q "docker:"; then
    echo "✓ Traefik config has Docker provider"
    log "traefik-config-verify" "{\"has_docker_provider\":true}" "fix"
else
    echo "✗ Traefik config missing Docker provider"
    echo "Config:"
    echo "$TRAEFIK_CONFIG" | grep -A 10 "providers:"
    log "traefik-config-verify" "{\"has_docker_provider\":false}" "fix"
fi

# Check Traefik discovered UI
sleep 5
TRAEFIK_ROUTERS=$(curl -s http://localhost:8080/api/http/routers 2>&1)
if echo "$TRAEFIK_ROUTERS" | grep -q "ui"; then
    echo "✓ Traefik discovered UI routers"
    echo "$TRAEFIK_ROUTERS" | grep -o '"name":"[^"]*ui[^"]*"'
    log "traefik-routers-verify" "{\"ui_routers_found\":true}" "fix"
else
    echo "✗ Traefik did not discover UI routers"
    log "traefik-routers-verify" "{\"ui_routers_found\":false}" "fix"
fi

echo -e "\n=== Step 4: Container Status ==="
docker compose ps

echo -e "\n=== Step 5: Traefik Logs (last 20 lines) ==="
docker compose logs --tail=20 traefik

echo -e "\n=== Step 6: UI Logs (last 20 lines) ==="
docker compose logs --tail=20 ui 2>/dev/null || echo "UI container not running"
