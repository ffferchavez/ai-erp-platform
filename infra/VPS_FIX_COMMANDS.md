# VPS Fix Commands - Copy and Paste These

Run these commands on your VPS one by one:

```bash
cd /opt/ai-erp-platform/infra

# Step 1: Verify DOMAIN_UI is set
grep DOMAIN_UI .env

# Step 2: Ensure Docker socket mount exists (if missing, add it)
grep "/var/run/docker.sock" docker-compose.yml || echo "NEEDS TO BE ADDED"

# Step 3: Ensure Docker provider exists in template (if missing, add it)
grep "docker:" traefik/traefik.yml.template || echo "NEEDS TO BE ADDED"

# Step 4: Stop containers
docker compose down

# Step 5: Recreate UI container
docker compose up -d --force-recreate --build ui

# Step 6: Start all containers
docker compose up -d

# Step 7: Wait 15 seconds
sleep 15

# Step 8: Verify socket
docker compose exec traefik ls -la /var/run/docker.sock

# Step 9: Verify Traefik config
docker compose exec traefik cat /config/traefik.yml | grep -A 3 "docker:"

# Step 10: Check UI labels
docker inspect ui --format '{{range $k, $v := .Config.Labels}}{{$k}}={{$v}}{{"\n"}}{{end}}' | grep traefik

# Step 11: Wait for discovery
sleep 10

# Step 12: Check if discovered
curl -s http://localhost:8080/api/http/routers | grep -i ui
```
