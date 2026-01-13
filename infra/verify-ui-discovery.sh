#!/bin/bash
# Verify UI discovery and routing

LOG_FILE="/Users/fernandochavez/Documents/developer/ai-erp-platform/.cursor/debug.log"

log() {
    echo "{\"timestamp\":$(date +%s000),\"location\":\"verify-ui-discovery.sh\",\"message\":\"$1\",\"data\":$2,\"sessionId\":\"debug-session\",\"runId\":\"verify-ui\",\"hypothesisId\":\"$3\"}" >> "$LOG_FILE"
}

echo "=== Step 1: Check UI Container Status ==="
UI_STATUS=$(docker compose ps ui 2>&1)
echo "$UI_STATUS"
if echo "$UI_STATUS" | grep -q "Up"; then
    echo "✓ UI container is running"
    log "ui-container-status" "{\"status\":\"running\"}" "verify"
else
    echo "✗ UI container not running"
    log "ui-container-status" "{\"status\":\"not_running\"}" "verify"
fi
echo ""

echo "=== Step 2: Check UI Container Labels ==="
UI_LABELS=$(docker inspect ui --format '{{range $k, $v := .Config.Labels}}{{$k}}={{$v}}{{"\n"}}{{end}}' 2>&1)
echo "$UI_LABELS"
if echo "$UI_LABELS" | grep -q "traefik.enable=true"; then
    echo "✓ UI has Traefik labels"
    log "ui-labels" "{\"has_labels\":true}" "verify"
else
    echo "✗ UI missing Traefik labels"
    log "ui-labels" "{\"has_labels\":false}" "verify"
fi
echo ""

echo "=== Step 3: Check Traefik Discovered UI Routers ==="
sleep 3  # Give Traefik time to discover
TRAEFIK_ROUTERS=$(curl -s http://localhost:8080/api/http/routers 2>&1)
if [ $? -eq 0 ]; then
    UI_ROUTERS=$(echo "$TRAEFIK_ROUTERS" | grep -o '"name":"[^"]*ui[^"]*"' || echo "none")
    echo "Found UI routers: $UI_ROUTERS"
    if echo "$UI_ROUTERS" | grep -q "ui"; then
        echo "✓ Traefik discovered UI routers"
        log "traefik-routers" "{\"ui_routers_found\":true,\"routers\":\"$UI_ROUTERS\"}" "verify"
    else
        echo "✗ Traefik did NOT discover UI routers"
        log "traefik-routers" "{\"ui_routers_found\":false}" "verify"
        echo ""
        echo "Full routers list:"
        echo "$TRAEFIK_ROUTERS" | python3 -m json.tool 2>/dev/null | head -50 || echo "$TRAEFIK_ROUTERS"
    fi
else
    echo "✗ Could not access Traefik API"
    log "traefik-api" "{\"accessible\":false}" "verify"
fi
echo ""

echo "=== Step 4: Check Traefik Services ==="
TRAEFIK_SERVICES=$(curl -s http://localhost:8080/api/http/services 2>&1)
if [ $? -eq 0 ]; then
    UI_SERVICES=$(echo "$TRAEFIK_SERVICES" | grep -o '"name":"[^"]*ui[^"]*"' || echo "none")
    echo "Found UI services: $UI_SERVICES"
    if echo "$UI_SERVICES" | grep -q "ui"; then
        echo "✓ Traefik discovered UI service"
        log "traefik-services" "{\"ui_services_found\":true,\"services\":\"$UI_SERVICES\"}" "verify"
    else
        echo "✗ Traefik did NOT discover UI service"
        log "traefik-services" "{\"ui_services_found\":false}" "verify"
    fi
fi
echo ""

echo "=== Step 5: Check Traefik Logs for UI Discovery ==="
TRAEFIK_LOGS=$(docker compose logs --tail=30 traefik 2>&1 | grep -i "ui\|docker\|provider" || echo "No relevant logs")
echo "$TRAEFIK_LOGS"
log "traefik-logs" "{\"output\":\"$(echo "$TRAEFIK_LOGS" | head -10 | jq -Rs .)\"}" "verify"
echo ""

echo "=== Step 6: Test UI Container Port ==="
UI_PORT_TEST=$(docker compose exec -T ui wget -qO- http://localhost:3000 2>&1 | head -5 || echo "failed")
if echo "$UI_PORT_TEST" | grep -q "html\|<!DOCTYPE\|Next.js"; then
    echo "✓ UI responding on port 3000"
    log "ui-port-test" "{\"success\":true}" "verify"
else
    echo "✗ UI not responding on port 3000"
    echo "Output: $UI_PORT_TEST"
    log "ui-port-test" "{\"success\":false,\"output\":\"$(echo "$UI_PORT_TEST" | jq -Rs .)\"}" "verify"
fi
echo ""

echo "=== Step 7: Test HTTP Redirect ==="
HTTP_TEST=$(curl -I http://demo.helioncity.com 2>&1)
echo "$HTTP_TEST"
if echo "$HTTP_TEST" | grep -qE "301|302|Location.*https"; then
    echo "✓ HTTP redirects to HTTPS"
    log "http-redirect" "{\"success\":true}" "verify"
else
    echo "✗ HTTP redirect not working"
    log "http-redirect" "{\"success\":false}" "verify"
fi
echo ""

echo "=== Step 8: Test HTTPS Access ==="
HTTPS_TEST=$(curl -I https://demo.helioncity.com 2>&1)
echo "$HTTPS_TEST"
if echo "$HTTPS_TEST" | grep -qE "200|HTTP/2 200"; then
    echo "✓ HTTPS accessible"
    log "https-access" "{\"success\":true}" "verify"
else
    echo "✗ HTTPS not accessible"
    log "https-access" "{\"success\":false,\"output\":\"$(echo "$HTTPS_TEST" | jq -Rs .)\"}" "verify"
fi

echo ""
echo "=== Summary ==="
echo "Check the output above for any ✗ marks indicating issues."
