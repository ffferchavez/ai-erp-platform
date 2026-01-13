#!/bin/bash
# Debug script to check Traefik and UI container status

LOG_FILE="/Users/fernandochavez/Documents/developer/ai-erp-platform/.cursor/debug.log"

log() {
    echo "{\"timestamp\":$(date +%s000),\"location\":\"debug-traefik.sh\",\"message\":\"$1\",\"data\":$2,\"sessionId\":\"debug-session\",\"runId\":\"diagnostic\",\"hypothesisId\":\"$3\"}" >> "$LOG_FILE"
}

echo "=== Container Status ==="
CONTAINER_STATUS=$(docker compose ps 2>&1)
echo "$CONTAINER_STATUS"
log "container-status" "{\"output\":\"$(echo "$CONTAINER_STATUS" | head -20 | jq -Rs .)\"}" "A"

echo -e "\n=== UI Container Exists Check ==="
UI_EXISTS=$(docker inspect ui 2>&1)
if [ $? -eq 0 ]; then
    echo "UI container exists"
    log "ui-container-exists" "{\"exists\":true}" "A"
    
    echo -e "\n=== UI Container Labels ==="
    UI_LABELS=$(docker inspect ui --format '{{range $k, $v := .Config.Labels}}{{$k}}={{$v}}{{"\n"}}{{end}}' 2>/dev/null)
    echo "$UI_LABELS"
    log "ui-container-labels" "{\"labels\":\"$(echo "$UI_LABELS" | jq -Rs .)\"}" "A"
    
    echo -e "\n=== UI Container State ==="
    UI_STATE=$(docker inspect ui --format '{{.State.Status}}' 2>/dev/null)
    echo "State: $UI_STATE"
    log "ui-container-state" "{\"status\":\"$UI_STATE\"}" "A"
else
    echo "UI container not found"
    log "ui-container-exists" "{\"exists\":false,\"error\":\"$(echo "$UI_EXISTS" | jq -Rs .)\"}" "A"
fi

echo -e "\n=== Traefik Docker Socket Access ==="
DOCKER_SOCK=$(docker compose exec -T traefik ls -la /var/run/docker.sock 2>&1)
echo "$DOCKER_SOCK"
log "docker-socket-access" "{\"output\":\"$(echo "$DOCKER_SOCK" | jq -Rs .)\"}" "B"

echo -e "\n=== Traefik Configuration ==="
TRAEFIK_CONFIG=$(docker compose exec -T traefik cat /config/traefik.yml 2>&1)
echo "$TRAEFIK_CONFIG"
if echo "$TRAEFIK_CONFIG" | grep -q "docker:"; then
    HAS_DOCKER="true"
else
    HAS_DOCKER="false"
fi
log "traefik-config" "{\"has_docker_provider\":$HAS_DOCKER}" "B"

echo -e "\n=== Traefik Logs (last 50 lines) ==="
TRAEFIK_LOGS=$(docker compose logs --tail=50 traefik 2>&1)
echo "$TRAEFIK_LOGS"
if echo "$TRAEFIK_LOGS" | grep -qi "docker\|provider"; then
    HAS_DOCKER_LOG="true"
else
    HAS_DOCKER_LOG="false"
fi
if echo "$TRAEFIK_LOGS" | grep -qi "ui"; then
    HAS_UI_LOG="true"
else
    HAS_UI_LOG="false"
fi
log "traefik-logs" "{\"has_docker_provider\":$HAS_DOCKER_LOG,\"has_ui_router\":$HAS_UI_LOG}" "B"

echo -e "\n=== UI Container Logs (last 50 lines) ==="
UI_LOGS=$(docker compose logs --tail=50 ui 2>&1)
echo "$UI_LOGS"
log "ui-container-logs" "{\"output\":\"$(echo "$UI_LOGS" | tail -20 | jq -Rs .)\"}" "A"

echo -e "\n=== Traefik API - Routers ==="
TRAEFIK_ROUTERS=$(curl -s http://localhost:8080/api/http/routers 2>&1)
if [ $? -eq 0 ]; then
    echo "$TRAEFIK_ROUTERS" | python3 -m json.tool 2>/dev/null || echo "$TRAEFIK_ROUTERS"
    UI_ROUTERS=$(echo "$TRAEFIK_ROUTERS" | grep -o '"name":"[^"]*ui[^"]*"' || echo "none")
    log "traefik-routers" "{\"ui_routers_found\":\"$UI_ROUTERS\"}" "B"
else
    echo "Traefik API not accessible"
    log "traefik-routers" "{\"error\":\"API not accessible\"}" "B"
fi

echo -e "\n=== Traefik API - Services ==="
TRAEFIK_SERVICES=$(curl -s http://localhost:8080/api/http/services 2>&1)
if [ $? -eq 0 ]; then
    echo "$TRAEFIK_SERVICES" | python3 -m json.tool 2>/dev/null || echo "$TRAEFIK_SERVICES"
    UI_SERVICES=$(echo "$TRAEFIK_SERVICES" | grep -o '"name":"[^"]*ui[^"]*"' || echo "none")
    log "traefik-services" "{\"ui_services_found\":\"$UI_SERVICES\"}" "B"
else
    echo "Traefik API not accessible"
    log "traefik-services" "{\"error\":\"API not accessible\"}" "B"
fi

echo -e "\n=== Environment Variables Check ==="
if [ -f .env ]; then
    DOMAIN_UI_VAL=$(grep "^DOMAIN_UI=" .env 2>/dev/null | cut -d'=' -f2)
    echo "DOMAIN_UI=$DOMAIN_UI_VAL"
    log "env-vars" "{\"DOMAIN_UI\":\"$DOMAIN_UI_VAL\"}" "C"
else
    echo ".env file not found"
    log "env-vars" "{\"error\":\".env file not found\"}" "C"
fi

echo -e "\n=== Testing UI Container Port ==="
UI_PORT_TEST=$(docker compose exec -T ui wget -qO- http://localhost:3000 2>&1 | head -20)
if [ $? -eq 0 ]; then
    echo "UI responding on port 3000"
    log "ui-port-test" "{\"success\":true}" "A"
else
    echo "Cannot connect to UI on port 3000"
    log "ui-port-test" "{\"success\":false,\"error\":\"$(echo "$UI_PORT_TEST" | jq -Rs .)\"}" "A"
fi

echo -e "\n=== Docker Compose Labels Check ==="
LABELS_CHECK=$(grep -A 10 "ui:" docker-compose.yml | grep "traefik" || echo "none")
echo "$LABELS_CHECK"
log "docker-compose-labels" "{\"labels_found\":\"$(echo "$LABELS_CHECK" | jq -Rs .)\"}" "C"
