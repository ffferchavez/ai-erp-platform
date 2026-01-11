# AI ERP Platform - Infrastructure

Production-ready VPS deployment using Docker Compose with Traefik v3 reverse proxy.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Traefik v3.0                         │
│  ┌──────────────┐         ┌──────────────┐             │
│  │  Port 80    │────────▶│  Port 443    │             │
│  │  (HTTP)     │         │  (HTTPS)     │             │
│  └──────────────┘         └──────────────┘             │
│         │                        │                      │
│         └────────┬─────────────────┘                    │
│                  │                                      │
│         ┌────────▼────────┐                            │
│         │  File Provider  │                            │
│         │  (dynamic.yml)  │                            │
│         └────────┬─────────┘                            │
└──────────────────┼────────────────────────────────────┘
                   │
         ┌─────────▼─────────┐
         │    ai-api:8000    │
         │   (FastAPI App)   │
         └───────────────────┘
```

## 📁 Project Structure

```
ai-erp-platform/
├── README.md                          # This file
├── .env.example                       # Environment variables template
├── .env                               # Your actual config (gitignored)
│
├── infra/
│   ├── docker-compose.yml            # Main orchestration file
│   │
│   └── traefik/
│       ├── traefik.yml.template       # Traefik static config template
│       ├── dynamic.yml.template       # Traefik routing config template
│       ├── entrypoint.sh              # Template processor script
│       ├── traefik.yml                # (Legacy - can be removed)
│       └── dynamic.yml                # (Legacy - can be removed)
│
└── apps/
    └── ai-api/
        ├── Dockerfile
        ├── requirements.txt
        └── app/
            └── main.py                # FastAPI application
```

## 🔧 How It Works

### Template-Based Configuration

This setup uses **template files** that get processed at container startup:

1. **Templates** (`*.template` files) contain placeholders:
   - `${DOMAIN_API}` → Your API domain
   - `${LE_EMAIL}` → Let's Encrypt email

2. **Entrypoint script** (`entrypoint.sh`) processes templates:
   - Reads `.env` file (via Docker Compose environment variables)
   - Substitutes placeholders with actual values
   - Writes processed configs to `/config` volume

3. **Traefik** starts with processed configs:
   - Static config: `/config/traefik.yml`
   - Dynamic config: `/config/dynamic.yml`

### Why Templates?

- **Reusable**: Same codebase for multiple clients/demos
- **No hardcoding**: Domain and email come from `.env`
- **Clean**: No need to edit YAML files for each deployment

## 🚀 Quick Start

### 1. Setup Environment

```bash
# Copy example file
cp .env.example .env

# Edit with your values
nano .env
```

**Required variables:**
```bash
DOMAIN_API=api.demo.helioncity.com    # Your API domain
LE_EMAIL=admin@example.com            # Let's Encrypt email
```

### 2. Deploy

```bash
cd infra
docker compose up -d --build
```

### 3. Verify

```bash
# Check containers
docker compose ps

# Check logs
docker compose logs -f traefik
docker compose logs -f ai-api

# Test endpoints
curl https://api.demo.helioncity.com/health
curl https://api.demo.helioncity.com/
```

## 📋 Configuration Files Explained

### `infra/docker-compose.yml`

Main orchestration file:
- **Traefik service**: Reverse proxy with SSL
- **ai-api service**: FastAPI application
- **Volumes**: 
  - `traefik-config`: Processed config files
  - `traefik-letsencrypt`: SSL certificates
- **Networks**: `platform` network for service communication

### `infra/traefik/traefik.yml.template`

Traefik static configuration:
- EntryPoints: HTTP (80) and HTTPS (443)
- File provider: Watches `dynamic.yml` for routing rules
- Let's Encrypt: SSL certificate resolver
- **Placeholder**: `${LE_EMAIL}`

### `infra/traefik/dynamic.yml.template`

Traefik routing configuration:
- **HTTP router**: Routes `http://${DOMAIN_API}` → ai-api
- **HTTPS router**: Routes `https://${DOMAIN_API}` → ai-api (with SSL)
- **Service**: Points to `ai-api:8000`
- **Placeholder**: `${DOMAIN_API}` (appears twice)

### `infra/traefik/entrypoint.sh`

Template processor script:
- Runs before Traefik starts
- Uses `sed` to substitute `${DOMAIN_API}` and `${LE_EMAIL}`
- Writes processed files to `/config` volume
- Launches Traefik with processed config

## 🔄 For Multiple Clients/Demos

### Option A: Same Server, Different Domains

```bash
# Client 1
DOMAIN_API=client1-api.example.com
LE_EMAIL=client1@example.com
docker compose up -d

# Client 2 (different directory or different .env)
DOMAIN_API=client2-api.example.com
LE_EMAIL=client2@example.com
docker compose up -d
```

### Option B: Different Servers

1. Clone repo on new server
2. Copy `.env.example` to `.env`
3. Edit `.env` with client's domain/email
4. Deploy: `docker compose up -d --build`

## 🔐 SSL Certificates

- **Automatic**: Let's Encrypt certificates generated automatically
- **Storage**: `/letsencrypt/acme.json` (persisted in volume)
- **Challenge**: HTTP-01 (requires port 80 open)
- **Renewal**: Automatic (Traefik handles it)

**Important**: DNS must point to your server IP before starting!

## 🆚 VPS vs This Setup

### Your Current VPS (Simple)
- Hardcoded domain in `dynamic.yml`
- Hardcoded email in `traefik.yml`
- No templates, no processing
- Works great for single deployment

### This Setup (Reusable)
- Templates with placeholders
- Environment variables from `.env`
- Template processing at startup
- Works great for multiple clients/demos

**Both approaches work!** This setup just makes it easier to reuse.

## 🐛 Troubleshooting

### Containers won't start
```bash
# Check logs
docker compose logs traefik
docker compose logs ai-api

# Verify .env file exists
cat infra/.env  # or root .env
```

### SSL certificate not generating
- Check DNS points to server IP
- Verify port 80 is open
- Check Traefik logs for Let's Encrypt errors

### 404 errors
- Verify domain in `.env` matches DNS
- Check `dynamic.yml` was processed correctly:
  ```bash
  docker compose exec traefik cat /config/dynamic.yml
  ```

### Template not processing
- Check environment variables are set:
  ```bash
  docker compose exec traefik env | grep DOMAIN
  ```
- Verify entrypoint script ran:
  ```bash
  docker compose logs traefik | grep entrypoint
  ```

## 📝 Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DOMAIN_API` | API domain name | `api.demo.helioncity.com` |
| `LE_EMAIL` | Let's Encrypt email | `admin@example.com` |

## 🔗 API Endpoints

Once deployed, your API is available at:

- **Health check**: `https://${DOMAIN_API}/health`
- **Root**: `https://${DOMAIN_API}/`

Expected responses:
```json
GET /health → {"status":"ok"}
GET / → {"name":"ai-api","version":"0.1.0"}
```

## 📚 Additional Resources

- [Traefik Documentation](https://doc.traefik.io/traefik/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)

## 🎯 Summary

**What this setup does:**
1. Reads `.env` file for domain and email
2. Processes template files with those values
3. Starts Traefik with processed configs
4. Routes traffic to ai-api service
5. Generates SSL certificates automatically

**Why it's reusable:**
- Change `.env` → Different domain/email
- Same codebase → Multiple deployments
- No code changes → Just configuration

---

## Platform v0.2 – Data Layer

### Overview

The platform now includes two internal data services: **Postgres** (relational database) and **Qdrant** (vector database). Both services are accessible only within the `platform` Docker network and are not exposed to the public internet.

### Postgres

**Purpose**: Relational database for structured data (users, transactions, metadata, etc.)

**Configuration**:
- Image: `postgres:16`
- Database: `ai_erp`
- User: `ai_erp`
- Password: Set via `POSTGRES_PASSWORD` environment variable
- Port: `5432` (internal only)
- Volume: `postgres-data` (persistent storage)

**Access**: Services connect using `DATABASE_URL` environment variable:
```
postgresql://ai_erp:password@postgres:5432/ai_erp
```

### Qdrant

**Purpose**: Vector database for embeddings, semantic search, and AI-related vector operations

**Configuration**:
- Image: `qdrant/qdrant:latest`
- Port: `6333` (internal only, not exposed to host)
- Volume: `qdrant-storage` (persistent storage)

**Access**: Services connect using `QDRANT_URL` environment variable:
```
http://qdrant:6333
```

### Internal-Only Services

Both Postgres and Qdrant are:
- ✅ Connected to the `platform` network
- ✅ Accessible via Docker service names (`postgres`, `qdrant`)
- ✅ Not exposed to the public internet
- ✅ Using persistent volumes for data durability

Only `ai-api` can access these services internally. No Traefik routing is configured for them.

---

**Platform v0.1** - Stable file-provider Traefik architecture
