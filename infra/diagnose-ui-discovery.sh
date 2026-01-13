#!/bin/bash
# Diagnose why Traefik isn't discovering UI

LOG_FILE="/Users/fernandochavez/Documents/developer/ai-erp-platform/.cursor/debug.log"

log() {
    echo "{\"timestamp\":$(date +%s000),\"location\":\"diagnose-ui-discovery.sh\",\"message\":\"$1\",\"data\":$2,\"sessionId\":\"debug-session\",\"runId\":\"diagnose\",\"hypothesisId\":\"$3\"}" >> "$LOG_FILE"
}

echo "=== Diagnosing UI Discovery Issue ==="
echo ""

echo "=== 1. Check UI Container Status ==="
UI_STATUS=$(docker compose ps ui 2>&1)
echo "$UI_STATUS"
if echo "$UI_STATUS" | grep -q "Up"; then
    echo "✓ UI container is running"
    log "ui-status" "{\"running\":true}" "diagnose"
else
    echo "✗ UI container NOT running"
    log "ui-status" "{\"running\":false}" "diagnose"
    exit 1
fi
echo ""

echo "=== 2. Check UI Container Labels ==="
UI_LABELS=$(docker inspect ui --format '{{range $k, $v := .Config.Labels}}{{$k}}={{$v}}{{"\n"}}{{end}}' 2>&1)
echo "$UI_LABELS"
echo ""

# Check for traefik.enable
if echo "$UI_LABELS" | grep -q "traefik.enable=true"; then
    echo "✓ traefik.enable=true found"
    log "ui-labels-enable" "{\"found\":true}" "diagnose"
else
    echo "✗ traefik.enable=true MISSING"
    log "ui-labels-enable" "{\"found\":false}" "diagnose"
fi

# Check for router rules
if echo "$UI_LABELS" | grep -q "traefik.http.routers"; then
    echo "✓ traefik.http.routers labels found"
    log "ui-labels-routers" "{\"found\":true}" "diagnose"
    echo "Router labels:"
    echo "$UI_LABELS" | grep "traefik.http.routers"
else
    echo "✗ traefik.http.routers labels MISSING"
    log "ui-labels-routers" "{\"found\":false}" "diagnose"
fi
echo ""

echo "=== 3. Check UI Container Network ==="
UI_NETWORK=$(docker inspect ui --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{"\n"}}{{end}}' 2>&1)
echo "UI is on networks: $UI_NETWORK"
if echo "$UI_NETWORK" | grep -q "platform"; then
    echo "✓ UI is on 'platform' network"
    log "ui-network" "{\"on_platform\":true}" "diagnose"
else
    echo "✗ UI NOT on 'platform' network"
    log "ui-network" "{\"on_platform\":false}" "diagnose"
fi
echo ""

echo "=== 4. Check Traefik Network ==="
TRAEFIK_NETWORK=$(docker inspect traefik --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{"\n"}}{{end}}' 2>&1)
echo "Traefik is on networks: $TRAEFIK_NETWORK"
if echo "$TRAEFIK_NETWORK" | grep -q "platform"; then
    echo "✓ Traefik is on 'platform' network"
    log "traefik-network" "{\"on_platform\":true}" "diagnose"
else
    echo "✗ Traefik NOT on 'platform' network"
    log "traefik-network" "{\"on_platform\":false}" "diagnose"
fi
echo ""

echo "=== 5. Check Traefik Docker Provider Config ==="
TRAEFIK_CONFIG=$(docker compose exec -T traefik cat /config/traefik.yml 2>&1)
DOCKER_CONFIG=$(echo "$TRAEFIK_CONFIG" | grep -A 4 "docker:")
echo "$DOCKER_CONFIG"
if echo "$DOCKER_CONFIG" | grep -q "network: platform"; then
    echo "✓ Docker provider configured for 'platform' network"
    log "traefik-docker-config" "{\"network_platform\":true}" "diagnose"
else
    echo "✗ Docker provider NOT configured for 'platform' network"
    log "traefik-docker-config" "{\"network_platform\":false}" "diagnose"
fi
echo ""

echo "=== 6. Check All Traefik Routers ==="
ALL_ROUTERS=$(curl -s http://localhost:8080/api/http/routers 2>&1)
echo "All routers:"
echo "$ALL_ROUTERS" | python3 -m json.tool 2>/dev/null | head -30 || echo "$ALL_ROUTERS" | head -30
echo ""
ROUTER_COUNT=$(echo "$ALL_ROUTERS" | grep -o '"name"' | wc -l)
echo "Total routers found: $ROUTER_COUNT"
log "traefik-all-routers" "{\"count\":$ROUTER_COUNT}" "diagnose"
echo ""

echo "=== 7. Check Traefik Logs for Docker Provider ==="
TRAEFIK_LOGS=$(docker compose logs --tail=100 traefik 2>&1)
echo "Looking for Docker provider messages..."
DOCKER_LOGS=$(echo "$TRAEFIK_LOGS" | grep -i "docker\|provider" | tail -20)
if [ -n "$DOCKER_LOGS" ]; then
    echo "$DOCKER_LOGS"
    log "traefik-docker-logs" "{\"has_logs\":true}" "diagnose"
else
    echo "No Docker/provider messages in logs"
    log "traefik-docker-logs" "{\"has_logs\":false}" "diagnose"
fi
echo ""

echo "=== 8. Check Traefik Logs for Errors ==="
ERROR_LOGS=$(echo "$TRAEFIK_LOGS" | grep -i "error\|warn\|fail" | tail -20)
if [ -n "$ERROR_LOGS" ]; then
    echo "Errors/Warnings found:"
    echo "$ERROR_LOGS"
    log "traefik-errors" "{\"has_errors\":true,\"output\":\"$(echo "$ERROR_LOGS" | jq -Rs .)\"}" "diagnose"
else
    echo "No errors found in logs"
    log "traefik-errors" "{\"has_errors\":false}" "diagnose"
fi
echo ""

echo "=== 9. Check UI Container Labels (Detailed) ==="
echo "All UI labels:"
docker inspect ui --format '{{range $k, $v := .Config.Labels}}{{$k}}={{$v}}{{"\n"}}{{end}}' | grep traefik
echo ""

echo "=== 10. Check DOMAIN_UI Variable ==="
if [ -f .env ]; then
    DOMAIN_UI=$(grep "^DOMAIN_UI=" .env | cut -d'=' -f2)
    echo "DOMAIN_UI from .env: $DOMAIN_UI"
    
    # Check if labels have the actual domain or still have ${DOMAIN_UI}
    if docker inspect ui --format '{{range $k, $v := .Config.Labels}}{{$k}}={{$v}}{{"\n"}}{{end}}' | grep -q '\${DOMAIN_UI}'; then
        echo "✗ Labels still contain \${DOMAIN_UI} - variable not substituted!"
        echo "This means Docker Compose didn't substitute the variable"
        log "domain-substitution" "{\"substituted\":false,\"domain\":\"$DOMAIN_UI\"}" "diagnose"
    else
        echo "✓ Labels have actual domain (not \${DOMAIN_UI})"
        ACTUAL_DOMAIN=$(docker inspect ui --format '{{range $k, $v := .Config.Labels}}{{$k}}={{$v}}{{"\n"}}{{end}}' | grep "Host" | head -1 | sed 's/.*Host(`\(.*\)`).*/\1/')
        echo "Actual domain in labels: $ACTUAL_DOMAIN"
        log "domain-substitution" "{\"substituted\":true,\"domain\":\"$DOMAIN_UI\",\"actual\":\"$ACTUAL_DOMAIN\"}" "diagnose"
    fi
else
    echo "✗ .env file not found"
    log "domain-substitution" "{\"env_file\":false}" "diagnose"
fi

echo ""
echo "=== Summary ==="
echo "Review the checks above. Common issues:"
echo "1. Labels contain \${DOMAIN_UI} instead of actual domain"
echo "2. UI container not on 'platform' network"
echo "3. Traefik Docker provider not connecting"
echo "4. Traefik needs more time to discover (wait 30 seconds)"
