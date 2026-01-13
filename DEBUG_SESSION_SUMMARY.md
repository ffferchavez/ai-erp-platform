# Debug Session Summary: UI Not Accessible at demo.helioncity.com

## Problem Statement

The Next.js UI deployed behind Traefik on VPS was not accessible at `https://demo.helioncity.com`. The UI service was added to `docker-compose.yml` with Traefik labels, but the site was not reachable.

## Initial Setup

### Files Modified (Before Debugging)
1. **`apps/ui/Dockerfile`** - Created multi-stage production build
2. **`infra/docker-compose.yml`** - Added UI service with Traefik labels
3. **`infra/traefik/traefik.yml.template`** - Added Docker provider configuration
4. **`apps/ai-api/app/main.py`** - Updated CORS to include `https://demo.helioncity.com`
5. **`infra/.env.example`** - Added `DOMAIN_UI` and `NEXT_PUBLIC_API_BASE`

### Original UI Service Configuration
```yaml
ui:
  build:
    context: ../apps/ui
    dockerfile: Dockerfile
  container_name: ui
  restart: unless-stopped
  environment:
    - NEXT_PUBLIC_API_BASE=${NEXT_PUBLIC_API_BASE}
  networks:
    - platform
  labels:
    - traefik.enable=true
    - traefik.http.routers.ui.rule=Host(`${DOMAIN_UI}`)
    - traefik.http.routers.ui.entrypoints=websecure
    - traefik.http.routers.ui.tls=true
    - traefik.http.routers.ui.tls.certresolver=le
    - traefik.http.services.ui.loadbalancer.server.port=3000
```

## Debugging Approach

### Hypotheses Generated
1. **Hypothesis A**: UI container not running or not created
2. **Hypothesis B**: Traefik Docker provider not enabled or Docker socket not accessible
3. **Hypothesis C**: Missing HTTP router (only HTTPS configured)
4. **Hypothesis D**: Environment variables not set correctly
5. **Hypothesis E**: Traefik configuration not processed correctly

### Diagnostic Scripts Created
1. **`infra/debug-traefik.sh`** - Comprehensive diagnostic script that checks:
   - Container status
   - UI container existence and labels
   - Docker socket accessibility
   - Traefik configuration
   - Traefik logs
   - Traefik API (routers/services)
   - Environment variables
   - UI container port connectivity

2. **`infra/compare-local-vps.sh`** - Compares local vs VPS configuration

3. **`infra/fix-and-verify.sh`** - Automated fix and verification script

## Runtime Evidence Collected

### Log Analysis Results

**From `.cursor/debug.log`:**

```json
{
  "message": "ui-container-exists",
  "data": {"exists": false, "error": "no such object: ui"},
  "hypothesisId": "A"
}
```
**Finding**: UI container was never created.

```json
{
  "message": "docker-socket-access",
  "data": {"output": "ls: /var/run/docker.sock: No such file or directory"},
  "hypothesisId": "B"
}
```
**Finding**: Traefik container cannot access Docker socket.

**From Traefik Configuration Check:**
```yaml
# Processed config in /config/traefik.yml showed:
providers:
  file:
    filename: /config/dynamic.yml
    watch: true
# Docker provider was MISSING
```
**Finding**: Traefik processed config only had file provider, not Docker provider.

**From Container Status:**
```
traefik    traefik:v3.0   Up 26 hours ago
# UI container was completely missing
```

## Root Cause Analysis

### Primary Issues Identified

1. **UI Container Never Created**
   - UI service was defined in `docker-compose.yml`
   - But `docker compose up` was never run after adding the service
   - Container didn't exist, so Traefik couldn't discover it

2. **Traefik Docker Provider Not Active**
   - Docker provider was added to `traefik.yml.template`
   - But Traefik container was started 26 hours ago (before template update)
   - Entrypoint script only processes templates on container startup
   - Traefik was still using old config without Docker provider

3. **Docker Socket Not Mounted**
   - Docker socket mount was added to `docker-compose.yml`
   - But Traefik container wasn't restarted to apply the mount
   - Traefik couldn't access Docker API to read container labels

4. **Missing HTTP Router**
   - Original configuration only had HTTPS router (`websecure` entrypoint)
   - HTTP requests to port 80 had no router configured
   - Users accessing `http://demo.helioncity.com` would get 404

## Fixes Applied

### 1. Enabled Docker Provider in Traefik
**File**: `infra/traefik/traefik.yml.template`
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

### 2. Added Docker Socket Mount
**File**: `infra/docker-compose.yml`
```yaml
traefik:
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock:ro
```

### 3. Added HTTP Router with HTTPS Redirect
**File**: `infra/docker-compose.yml` (UI service labels)
```yaml
labels:
  - traefik.enable=true
  # HTTP router with redirect
  - traefik.http.routers.ui-http.rule=Host(`${DOMAIN_UI}`)
  - traefik.http.routers.ui-http.entrypoints=web
  - traefik.http.routers.ui-http.middlewares=ui-redirect
  - traefik.http.middlewares.ui-redirect.redirectscheme.scheme=https
  # HTTPS router
  - traefik.http.routers.ui-https.rule=Host(`${DOMAIN_UI}`)
  - traefik.http.routers.ui-https.entrypoints=websecure
  - traefik.http.routers.ui-https.tls=true
  - traefik.http.routers.ui-https.tls.certresolver=le
  - traefik.http.services.ui.loadbalancer.server.port=3000
```

## Current State

### Files Modified
1. ✅ `infra/traefik/traefik.yml.template` - Docker provider added
2. ✅ `infra/docker-compose.yml` - Docker socket mount + HTTP router labels added
3. ✅ `infra/debug-traefik.sh` - Diagnostic script with logging
4. ✅ `infra/fix-and-verify.sh` - Automated fix script
5. ✅ `infra/compare-local-vps.sh` - Configuration comparison script

### Required Actions
**Services need to be restarted** to apply fixes:
```bash
cd infra
docker compose down
docker compose up -d --build
```

This will:
- Create the UI container (first time)
- Restart Traefik to process new template with Docker provider
- Mount Docker socket so Traefik can discover containers
- Enable HTTP→HTTPS redirect

## Architecture Overview

### How Traefik Discovers Services

**Two Provider Types:**

1. **File Provider** (for API):
   - Uses `dynamic.yml` template
   - Processed by `entrypoint.sh` script
   - Substitutes `${DOMAIN_API}` and `${LE_EMAIL}`
   - Routes `api.demo.helioncity.com` → `ai-api:8000`

2. **Docker Provider** (for UI):
   - Reads Docker container labels directly
   - Requires Docker socket access (`/var/run/docker.sock`)
   - Discovers containers with `traefik.enable=true` label
   - Routes based on `Host()` rules in labels

### Why Both Providers?

- **API**: Uses file provider because it was configured before UI existed
- **UI**: Uses Docker provider because it's easier to configure via labels
- Both can coexist - Traefik supports multiple providers

## Key Learnings

1. **Docker Compose Changes Require Restart**
   - Adding new services requires `docker compose up`
   - Volume mounts only apply on container start
   - Template processing happens on container startup

2. **Traefik Provider Configuration**
   - File provider: Static config, good for services defined in YAML
   - Docker provider: Dynamic discovery, good for containerized services
   - Both can be used simultaneously

3. **HTTP vs HTTPS Routing**
   - Need separate routers for each entrypoint
   - HTTP router should redirect to HTTPS
   - HTTPS router handles TLS termination

4. **Docker Socket Access**
   - Traefik needs read-only access to Docker socket
   - Mount: `/var/run/docker.sock:/var/run/docker.sock:ro`
   - Required for Docker provider to work

## Verification Checklist

After restarting services, verify:

- [ ] UI container exists: `docker compose ps | grep ui`
- [ ] Docker socket accessible: `docker compose exec traefik ls /var/run/docker.sock`
- [ ] Traefik config has Docker provider: `docker compose exec traefik cat /config/traefik.yml | grep docker`
- [ ] Traefik discovered UI: `curl http://localhost:8080/api/http/routers | grep ui`
- [ ] HTTP redirects to HTTPS: `curl -I http://demo.helioncity.com`
- [ ] HTTPS works: `curl -I https://demo.helioncity.com`

## Next Steps

1. Run `infra/fix-and-verify.sh` on VPS to apply fixes
2. Verify all checks pass
3. Test UI accessibility in browser
4. Monitor Traefik logs for any errors

## Code Structure Reference

```
infra/
├── docker-compose.yml          # Main orchestration (UI service + Traefik socket mount)
├── traefik/
│   ├── traefik.yml.template    # Traefik static config (Docker + File providers)
│   ├── dynamic.yml.template    # File provider routes (API only)
│   └── entrypoint.sh           # Template processor script
├── debug-traefik.sh            # Diagnostic script
├── fix-and-verify.sh           # Fix automation script
└── compare-local-vps.sh        # Config comparison script

apps/
├── ui/
│   └── Dockerfile              # Multi-stage Next.js build
└── ai-api/
    └── app/main.py             # FastAPI (CORS updated)
```

## Environment Variables Required

```bash
DOMAIN_API=api.demo.helioncity.com
DOMAIN_UI=demo.helioncity.com
NEXT_PUBLIC_API_BASE=https://api.demo.helioncity.com
LE_EMAIL=admin@example.com
```

---

**Status**: Fixes applied, awaiting service restart to verify.
