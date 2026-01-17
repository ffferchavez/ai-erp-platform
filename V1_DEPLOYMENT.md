# Platform v1.0 Deployment Guide

## Summary

Platform v1.0 adds production-grade observability, cost controls, safe admin access, and UI polish.

## Changed/New Files

### New Files
1. `apps/ai-api/app/request_id.py` - Request ID middleware
2. `apps/ai-api/app/admin_ip.py` - Admin IP allowlist middleware
3. `V1_DEPLOYMENT.md` - This file

### Modified Files
1. `apps/ai-api/app/main.py` - Request ID, env defaults, admin IP, version 1.0.0
2. `apps/ai-api/app/openai_client.py` - Structured logging for embeddings
3. `apps/ai-api/app/openai_chat.py` - Structured logging for chat completions
4. `apps/ai-api/app/ingest.py` - Environment defaults for chunking
5. `apps/ui/app/admin/page.tsx` - Confirmation modals, demo script, API key warning
6. `apps/ui/app/page.tsx` - Request ID display
7. `apps/ui/lib/api.ts` - Request ID in ChatResponse
8. `README.md` - Added v1.0 documentation section

## Deployment Commands (VPS)

```bash
# 1. Navigate to project directory
cd /opt/ai-erp-platform

# 2. Pull latest changes
git pull

# 3. Navigate to infra directory
cd infra

# 4. Rebuild and restart services
docker compose down
docker compose up -d --build

# 5. Wait for services to start
sleep 15

# 6. Verify API version
curl https://api.demo.helioncity.com/
# Should return: {"name":"ai-api","version":"1.0.0"}

# 7. Verify request_id in response
curl -X POST https://api.demo.helioncity.com/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}' | jq .request_id
# Should return a UUID string
```

## Environment Variables (Optional)

Add to `.env` file in `infra/` directory:

```bash
# Chat/Search defaults
MIN_SCORE_DEFAULT=0.45
MAX_CITATIONS_DEFAULT=3
TOP_K_DEFAULT=5

# Ingestion defaults
CHUNK_SIZE=800
CHUNK_OVERLAP=120

# Admin IP allowlist (optional)
ADMIN_IP_ALLOWLIST=203.0.113.0/24,198.51.100.1

# Existing variables (unchanged)
API_KEY=your-secret-api-key
OPENAI_API_KEY=your-openai-key
DEFAULT_TENANT_ID=demo
```

## Verification Commands

### Setup Environment Variables

```bash
export BASE=https://api.demo.helioncity.com
export API_KEY=your-secret-api-key-here
export TENANT=demo
```

### 1. Test Request ID

```bash
# Test chat endpoint
curl -X POST "${BASE}/chat" \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"What are your opening hours?\", \"tenant_id\": \"${TENANT}\"}" \
  | jq '{request_id, answer}'

# Check response headers
curl -X POST "${BASE}/chat" \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"test\"}" \
  -v 2>&1 | grep -i "x-request-id"
```

**Expected:** Response includes `request_id` field and `X-Request-ID` header.

### 2. Test Structured Logging

```bash
# Check API logs for structured logging
docker compose logs ai-api | grep "openai_embedding"
docker compose logs ai-api | grep "openai_chat"
```

**Expected:** Logs show structured fields:
```
INFO:openai_embedding: event=openai_embedding tenant_id=demo model=text-embedding-3-small duration_ms=123 success=True request_id=...
```

### 3. Test Environment Defaults

```bash
# Test with defaults (no fields in request)
curl -X POST "${BASE}/chat" \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"test\", \"tenant_id\": \"${TENANT}\"}" \
  | jq '{max_citations: .citations | length}'

# Should use defaults: min_score=0.45, max_citations=3, top_k=5
```

### 4. Test Admin IP Allowlist (if configured)

```bash
# Set allowlist in .env
# ADMIN_IP_ALLOWLIST=127.0.0.1

# Restart API
docker compose restart ai-api

# Test from allowed IP (should work)
curl -X POST "${BASE}/admin/reset" \
  -H "X-API-Key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"tenant_id\": \"${TENANT}\"}"

# Test from disallowed IP (should get 403)
# Requires testing from different IP or modifying X-Forwarded-For header
```

### 5. Test UI Admin Panel

```bash
# Navigate to admin panel
open https://demo.helioncity.com/admin

# Test features:
# - Confirmation modal appears before reset/reset-seed
# - Demo script section with 8 preset questions
# - Request ID displayed under chat answers
# - API key warning banner when key is entered
```

### 6. Test UI Request ID Display

```bash
# Navigate to home page
open https://demo.helioncity.com/

# Send a chat message
# Check that request_id appears under the answer (small text)
```

## Logging Configuration

### View Structured Logs

```bash
# View all logs
docker compose logs ai-api

# Filter for OpenAI calls
docker compose logs ai-api | grep "openai_"

# Filter for specific request_id
docker compose logs ai-api | grep "request_id=550e8400"
```

### Configure JSON Logging (Optional)

For production, configure JSON logging:

```python
# In apps/ai-api/app/main.py, add:
import json_logging
json_logging.init_fastapi(enable_json=True)
```

## Troubleshooting

### Request ID Not Appearing

- Check middleware is registered: `grep RequestIDMiddleware apps/ai-api/app/main.py`
- Check logs for middleware errors: `docker compose logs ai-api | grep request_id`
- Verify response includes `request_id` field: `curl ... | jq .request_id`

### Structured Logging Not Working

- Check Python logging is configured: `logging.basicConfig(level=logging.INFO)`
- Verify logs are being written: `docker compose logs ai-api | tail -20`
- Check for logging errors: `docker compose logs ai-api | grep -i error`

### Admin IP Allowlist Not Working

- Verify `ADMIN_IP_ALLOWLIST` is set: `docker compose exec ai-api env | grep ADMIN_IP`
- Check IP detection: Add logging in `admin_ip.py` to see detected IP
- Test CIDR matching: Ensure format is correct (e.g., `10.0.0.0/8`)

### Environment Defaults Not Applied

- Check env vars are set: `docker compose exec ai-api env | grep -E "MIN_SCORE|MAX_CITATIONS|TOP_K"`
- Verify defaults are read at startup: Check logs for default values
- Restart API after changing env vars: `docker compose restart ai-api`

## Notes

- Request IDs are UUIDs (v4) - globally unique identifiers
- Structured logging uses Python `logging` module - integrate with your log aggregation
- IP allowlist is optional - only active if `ADMIN_IP_ALLOWLIST` is set
- All env defaults have sensible defaults - no breaking changes
- UI improvements are backward compatible - existing functionality unchanged

## Rollback

If issues occur, rollback to v0.9:

```bash
git checkout v0.9
cd infra
docker compose down
docker compose up -d --build
```
