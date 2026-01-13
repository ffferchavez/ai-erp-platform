#!/bin/bash
# Check UI labels and Traefik connection

echo "=== Checking UI Container Labels ==="
docker inspect ui --format '{{range $k, $v := .Config.Labels}}{{$k}}={{$v}}{{"\n"}}{{end}}' | grep traefik

echo ""
echo "=== Checking if DOMAIN_UI was substituted ==="
docker inspect ui --format '{{range $k, $v := .Config.Labels}}{{$k}}={{$v}}{{"\n"}}{{end}}' | grep Host

echo ""
echo "=== Checking Traefik Logs (last 50 lines) ==="
docker compose logs --tail=50 traefik

echo ""
echo "=== Checking Traefik Docker Provider Connection ==="
docker compose logs traefik | grep -i "docker\|provider\|error" | tail -20

echo ""
echo "=== Checking All Routers ==="
curl -s http://localhost:8080/api/http/routers | python3 -m json.tool | head -30

echo ""
echo "=== Checking UI Container Network ==="
docker inspect ui --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{"\n"}}{{end}}'

echo ""
echo "=== Checking Traefik Container Network ==="
docker inspect traefik --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{"\n"}}{{end}}'
