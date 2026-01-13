# Debugging Summary: UI Not Accessible at demo.helioncity.com

## Issues Found and Fixed

### 1. ✅ Traefik Docker Provider Not Enabled
**Problem**: Traefik was only configured with the file provider, but the UI service uses Docker labels. Traefik couldn't discover the UI container.

**Fix**: Added Docker provider to `traefik.yml.template`:
```yaml
providers:
  docker:
    endpoint: "unix:///var/run/docker.sock"
    exposedByDefault: false
    network: platform
```

### 2. ✅ Docker Socket Not Mounted
**Problem**: Traefik container didn't have access to the Docker socket to read container labels.

**Fix**: Added Docker socket volume mount to `docker-compose.yml`:
```yaml
volumes:
  - /var/run/docker.sock:/var/run/docker.sock:ro
```

### 3. ✅ Missing HTTP Router
**Problem**: UI only had HTTPS router, so HTTP requests wouldn't redirect to HTTPS.

**Fix**: Added HTTP router with redirect middleware:
```yaml
labels:
  - traefik.http.routers.ui-http.rule=Host(`${DOMAIN_UI}`)
  - traefik.http.routers.ui-http.entrypoints=web
  - traefik.http.routers.ui-http.middlewares=ui-redirect
  - traefik.http.middlewares.ui-redirect.redirectscheme.scheme=https
```

## Files Changed

1. `infra/traefik/traefik.yml.template` - Added Docker provider
2. `infra/docker-compose.yml` - Added Docker socket mount and HTTP router labels

## Verification Steps

After deploying these changes:

1. **Restart services**:
   ```bash
   cd infra
   docker compose down
   docker compose up -d --build
   ```

2. **Check containers are running**:
   ```bash
   docker compose ps
   ```
   Should show `ui` container as "Up"

3. **Check Traefik discovered UI**:
   ```bash
   curl http://localhost:8080/api/http/routers | jq '.[] | select(.name | contains("ui"))'
   ```
   Should show `ui-http` and `ui-https` routers

4. **Check UI container labels**:
   ```bash
   docker inspect ui --format '{{range $k, $v := .Config.Labels}}{{$k}}={{$v}}{{"\n"}}{{end}}'
   ```
   Should show all Traefik labels with `${DOMAIN_UI}` substituted

5. **Test UI accessibility**:
   ```bash
   curl -I http://demo.helioncity.com
   ```
   Should redirect to HTTPS (301 or 302)

6. **Check Traefik logs**:
   ```bash
   docker compose logs traefik | grep -i "ui\|docker"
   ```
   Should show Docker provider connecting and UI router being created

## Common Issues to Check

### If UI still not accessible:

1. **DNS not pointing to VPS**: Verify `demo.helioncity.com` resolves to your VPS IP
   ```bash
   dig demo.helioncity.com
   ```

2. **Environment variable not set**: Ensure `.env` file has:
   ```bash
   DOMAIN_UI=demo.helioncity.com
   NEXT_PUBLIC_API_BASE=https://api.demo.helioncity.com
   ```

3. **UI container not building**: Check build logs
   ```bash
   docker compose logs ui
   ```

4. **Port 3000 not listening**: Check if UI is listening
   ```bash
   docker compose exec ui wget -qO- http://localhost:3000
   ```

5. **Traefik not reading labels**: Check if Docker socket is accessible
   ```bash
   docker compose exec traefik ls -la /var/run/docker.sock
   ```

## Differences Between Local and VPS

To ensure consistency, compare these files on both local and VPS:

1. `infra/docker-compose.yml` - Should be identical
2. `infra/traefik/traefik.yml.template` - Should be identical
3. `apps/ui/Dockerfile` - Should be identical
4. `.env` file - Domain values may differ, but structure should be same

Run the comparison script:
```bash
./infra/compare-local-vps.sh
```
