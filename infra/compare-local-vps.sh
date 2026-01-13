#!/bin/bash
# Compare local and VPS code to find inconsistencies

LOG_FILE="/Users/fernandochavez/Documents/developer/ai-erp-platform/.cursor/debug.log"

log() {
    echo "$(date +%s000)|$1|$2|$3" >> "$LOG_FILE"
}

echo "=== Comparing Local vs VPS Configuration ==="

# Check docker-compose.yml for UI service
if grep -q "ui:" infra/docker-compose.yml; then
    echo "✓ UI service exists in docker-compose.yml"
    log "compare" "ui-service-check" "exists"
else
    echo "✗ UI service missing in docker-compose.yml"
    log "compare" "ui-service-check" "missing"
fi

# Check for Docker provider in traefik.yml.template
if grep -q "docker:" infra/traefik/traefik.yml.template; then
    echo "✓ Docker provider enabled in traefik.yml.template"
    log "compare" "docker-provider-check" "enabled"
else
    echo "✗ Docker provider missing in traefik.yml.template"
    log "compare" "docker-provider-check" "missing"
fi

# Check for Docker socket volume
if grep -q "/var/run/docker.sock" infra/docker-compose.yml; then
    echo "✓ Docker socket mounted in docker-compose.yml"
    log "compare" "docker-socket-check" "mounted"
else
    echo "✗ Docker socket not mounted in docker-compose.yml"
    log "compare" "docker-socket-check" "not-mounted"
fi

# Check for UI HTTP router
if grep -q "ui-http" infra/docker-compose.yml; then
    echo "✓ UI HTTP router exists"
    log "compare" "ui-http-router-check" "exists"
else
    echo "✗ UI HTTP router missing"
    log "compare" "ui-http-router-check" "missing"
fi

# Check for UI HTTPS router
if grep -q "ui-https" infra/docker-compose.yml; then
    echo "✓ UI HTTPS router exists"
    log "compare" "ui-https-router-check" "exists"
else
    echo "✗ UI HTTPS router missing"
    log "compare" "ui-https-router-check" "missing"
fi

# Check Dockerfile exists
if [ -f "apps/ui/Dockerfile" ]; then
    echo "✓ UI Dockerfile exists"
    log "compare" "ui-dockerfile-check" "exists"
else
    echo "✗ UI Dockerfile missing"
    log "compare" "ui-dockerfile-check" "missing"
fi

echo -e "\n=== Key Files to Compare ==="
echo "Files that should be identical on local and VPS:"
echo "1. infra/docker-compose.yml"
echo "2. infra/traefik/traefik.yml.template"
echo "3. infra/traefik/dynamic.yml.template"
echo "4. apps/ui/Dockerfile"
