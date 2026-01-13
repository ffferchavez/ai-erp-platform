#!/bin/bash
# Verify VPS configuration matches expected fixes

LOG_FILE="/Users/fernandochavez/Documents/developer/ai-erp-platform/.cursor/debug.log"

log() {
    echo "{\"timestamp\":$(date +%s000),\"location\":\"verify-vps-config.sh\",\"message\":\"$1\",\"data\":$2,\"sessionId\":\"debug-session\",\"runId\":\"verify\",\"hypothesisId\":\"$3\"}" >> "$LOG_FILE"
}

echo "=== Verifying VPS Configuration ==="

# Check if docker-compose.yml has Docker socket mount
if [ -f "docker-compose.yml" ]; then
    if grep -q "/var/run/docker.sock" docker-compose.yml; then
        echo "✓ docker-compose.yml has Docker socket mount"
        log "docker-socket-in-compose" "{\"found\":true}" "verify"
        # Show the line
        echo "  Line: $(grep '/var/run/docker.sock' docker-compose.yml)"
    else
        echo "✗ docker-compose.yml MISSING Docker socket mount"
        log "docker-socket-in-compose" "{\"found\":false}" "verify"
        echo ""
        echo "Expected in traefik volumes:"
        echo "  - /var/run/docker.sock:/var/run/docker.sock:ro"
    fi
else
    echo "✗ docker-compose.yml not found in current directory"
    log "docker-compose-exists" "{\"found\":false}" "verify"
fi

# Check if traefik.yml.template has Docker provider
if [ -f "traefik/traefik.yml.template" ]; then
    if grep -q "docker:" traefik/traefik.yml.template; then
        echo "✓ traefik.yml.template has Docker provider"
        log "docker-provider-in-template" "{\"found\":true}" "verify"
    else
        echo "✗ traefik.yml.template MISSING Docker provider"
        log "docker-provider-in-template" "{\"found\":false}" "verify"
    fi
else
    echo "✗ traefik.yml.template not found"
    log "traefik-template-exists" "{\"found\":false}" "verify"
fi

# Check current Traefik container volumes
echo ""
echo "=== Current Traefik Container Volumes ==="
TRAEFIK_VOLUMES=$(docker inspect traefik --format '{{range .Mounts}}{{.Source}}:{{.Destination}} {{.Type}}{{"\n"}}{{end}}' 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "$TRAEFIK_VOLUMES"
    if echo "$TRAEFIK_VOLUMES" | grep -q "docker.sock"; then
        echo "✓ Docker socket IS mounted in running container"
        log "docker-socket-mounted" "{\"mounted\":true}" "verify"
    else
        echo "✗ Docker socket NOT mounted in running container"
        log "docker-socket-mounted" "{\"mounted\":false}" "verify"
        echo ""
        echo "Container needs to be restarted to apply mount!"
    fi
else
    echo "Could not inspect Traefik container"
    log "traefik-inspect" "{\"error\":\"container_not_found\"}" "verify"
fi

# Check Traefik processed config
echo ""
echo "=== Traefik Processed Config (providers section) ==="
TRAEFIK_CONFIG=$(docker compose exec -T traefik cat /config/traefik.yml 2>/dev/null | grep -A 10 "providers:")
if [ $? -eq 0 ]; then
    echo "$TRAEFIK_CONFIG"
    if echo "$TRAEFIK_CONFIG" | grep -q "docker:"; then
        echo "✓ Traefik config HAS Docker provider"
        log "traefik-config-docker" "{\"has_docker\":true}" "verify"
    else
        echo "✗ Traefik config MISSING Docker provider"
        log "traefik-config-docker" "{\"has_docker\":false}" "verify"
        echo ""
        echo "Traefik needs restart to process new template!"
    fi
else
    echo "Could not read Traefik config"
    log "traefik-config-read" "{\"error\":\"cannot_read\"}" "verify"
fi

echo ""
echo "=== Summary ==="
echo "If Docker socket mount is missing from docker-compose.yml:"
echo "  1. Update docker-compose.yml with socket mount"
echo "  2. Run: docker compose down && docker compose up -d"
echo ""
echo "If Docker socket mount exists in docker-compose.yml but not in container:"
echo "  1. Run: docker compose down && docker compose up -d"
echo ""
echo "If Traefik config missing Docker provider:"
echo "  1. Ensure traefik.yml.template has Docker provider"
echo "  2. Run: docker compose restart traefik"
echo "  (or: docker compose down && docker compose up -d)"
