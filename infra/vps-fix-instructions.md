# VPS Fix Instructions - Docker Socket Not Accessible

## Problem
Docker socket is not accessible in Traefik container, preventing Docker provider from discovering UI container.

## Step 1: Verify docker-compose.yml Has Socket Mount

On your VPS, check if the socket mount exists:

```bash
cd /opt/ai-erp-platform/infra
grep -A 2 "traefik-config:/config" docker-compose.yml
```

**Expected output should include:**
```yaml
      - traefik-config:/config
      - traefik-letsencrypt:/letsencrypt
      - /var/run/docker.sock:/var/run/docker.sock:ro
```

**If line 16 is MISSING**, you need to add it to docker-compose.yml:

```yaml
    volumes:
      - ./traefik/traefik.yml.template:/templates/traefik.yml.template:ro
      - ./traefik/dynamic.yml.template:/templates/dynamic.yml.template:ro
      - ./traefik/entrypoint.sh:/entrypoint-custom.sh:ro
      - traefik-config:/config
      - traefik-letsencrypt:/letsencrypt
      - /var/run/docker.sock:/var/run/docker.sock:ro  # <-- ADD THIS LINE
```

## Step 2: Verify traefik.yml.template Has Docker Provider

```bash
cd /opt/ai-erp-platform/infra
grep -A 5 "providers:" traefik/traefik.yml.template
```

**Expected output:**
```yaml
providers:
  docker:
    endpoint: "unix:///var/run/docker.sock"
    exposedByDefault: false
    network: platform
  file:
    filename: /config/dynamic.yml
    watch: true
```

**If Docker provider is MISSING**, add it to traefik/traefik.yml.template:

```yaml
providers:
  docker:
    endpoint: "unix:///var/run/docker.sock"
    exposedByDefault: false
    network: platform
  file:
    filename: /config/dynamic.yml
    watch: true
```

## Step 3: Restart Services

**IMPORTANT**: You must restart Traefik for volume mounts and config changes to take effect:

```bash
cd /opt/ai-erp-platform/infra

# Option 1: Restart just Traefik (if only config changed)
docker compose restart traefik

# Option 2: Full restart (recommended - ensures all changes applied)
docker compose down
docker compose up -d --build
```

## Step 4: Verify Fix

After restart, verify Docker socket is accessible:

```bash
# Check socket is mounted
docker compose exec traefik ls -la /var/run/docker.sock

# Should output something like:
# srw-rw---- 1 root root 0 Dec 31 12:00 /var/run/docker.sock

# Check Traefik config has Docker provider
docker compose exec traefik cat /config/traefik.yml | grep -A 5 "providers:"

# Should show docker: section
```

## Step 5: Check UI Container

```bash
# Check if UI container exists
docker compose ps | grep ui

# If missing, create it:
docker compose up -d --build ui

# Check UI container logs
docker compose logs ui
```

## Step 6: Verify Traefik Discovered UI

```bash
# Check Traefik discovered UI routers
curl http://localhost:8080/api/http/routers | grep -i ui

# Should show:
# "name":"ui-http@docker"
# "name":"ui-https@docker"
```

## Quick Fix Script

If you want to do everything at once:

```bash
cd /opt/ai-erp-platform/infra

# Verify files are correct (check output)
echo "=== Checking docker-compose.yml ==="
grep "/var/run/docker.sock" docker-compose.yml || echo "MISSING: Add socket mount!"

echo "=== Checking traefik.yml.template ==="
grep "docker:" traefik/traefik.yml.template || echo "MISSING: Add Docker provider!"

# Restart everything
echo "=== Restarting services ==="
docker compose down
docker compose up -d --build

# Wait for startup
sleep 10

# Verify
echo "=== Verifying fix ==="
docker compose exec traefik ls -la /var/run/docker.sock && echo "✓ Socket accessible" || echo "✗ Socket NOT accessible"
docker compose exec traefik cat /config/traefik.yml | grep -q "docker:" && echo "✓ Docker provider in config" || echo "✗ Docker provider MISSING"
docker compose ps | grep -q ui && echo "✓ UI container exists" || echo "✗ UI container MISSING"
```

## Common Issues

### Issue: "no configuration file provided"
**Cause**: Running `docker compose` from wrong directory  
**Fix**: Always run from `/opt/ai-erp-platform/infra` directory

### Issue: Socket still not accessible after restart
**Cause**: docker-compose.yml doesn't have the mount line  
**Fix**: Add the mount line manually (see Step 1)

### Issue: Traefik config doesn't have Docker provider
**Cause**: Template doesn't have Docker provider OR Traefik didn't restart  
**Fix**: Check template, then restart Traefik

### Issue: UI container not created
**Cause**: `docker compose up` wasn't run after adding UI service  
**Fix**: Run `docker compose up -d --build ui`
