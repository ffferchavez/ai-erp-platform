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

## Platform v0.4 – Ingest + Semantic Search

### Overview

The platform now supports document ingestion and semantic search capabilities. Documents are stored in Postgres, chunked, embedded using OpenAI, and indexed in Qdrant for fast semantic search.

### Features

- **Document Ingestion**: Store documents with metadata (source, title, content)
- **Automatic Chunking**: Documents are split into 800-character chunks with 120-character overlap
- **Vector Embeddings**: Uses OpenAI's `text-embedding-3-small` model (configurable)
- **Semantic Search**: Query documents using natural language
- **Postgres Schema**: Automatic schema initialization on startup
- **Qdrant Collection**: Automatic collection creation with proper vector configuration

### Architecture

```
┌─────────────────┐
│   POST /ingest  │
│   (Document)    │
└────────┬────────┘
         │
         ├─► Postgres (documents, chunks)
         ├─► OpenAI (embeddings)
         └─► Qdrant (vectors)
         
┌─────────────────┐
│  POST /search   │
│   (Query)       │
└────────┬────────┘
         │
         ├─► OpenAI (query embedding)
         ├─► Qdrant (vector search)
         └─► Postgres (fetch chunk content)
```

### Database Schema

**documents** table:
- `id` (UUID, PK)
- `source` (TEXT) - e.g., "policy", "menu", "manual"
- `title` (TEXT)
- `content` (TEXT)
- `created_at` (TIMESTAMPTZ)

**chunks** table:
- `id` (UUID, PK)
- `document_id` (UUID, FK → documents.id)
- `chunk_index` (INT)
- `content` (TEXT)
- `created_at` (TIMESTAMPTZ)

### Qdrant Collection

- **Name**: `restaurant_knowledge`
- **Distance**: Cosine
- **Vector Size**: Determined automatically from embedding model (1536 for `text-embedding-3-small`)
- **Payload**: `document_id`, `source`, `title`, `chunk_index`

### Environment Variables

Add to your `.env` file:

```bash
OPENAI_API_KEY=sk-your-openai-api-key-here
EMBEDDING_MODEL=text-embedding-3-small  # Optional, defaults to text-embedding-3-small
```

### API Endpoints

#### POST /ingest

Ingest a document into the system.

**Request:**
```json
{
  "source": "policy",
  "title": "Allergen Policy",
  "content": "Our restaurant is committed to providing accurate allergen information..."
}
```

**Response:**
```json
{
  "document_id": "550e8400-e29b-41d4-a716-446655440000",
  "chunks": 3,
  "qdrant_collection": "restaurant_knowledge"
}
```

#### POST /search

Search for documents using semantic search.

**Request:**
```json
{
  "query": "what dishes are gluten free?",
  "top_k": 5
}
```

**Response:**
```json
{
  "query": "what dishes are gluten free?",
  "results": [
    {
      "score": 0.87,
      "chunk_id": "660e8400-e29b-41d4-a716-446655440001",
      "document_id": "550e8400-e29b-41d4-a716-446655440000",
      "source": "policy",
      "title": "Allergen Policy",
      "chunk_index": 1,
      "content": "Gluten-free options include..."
    }
  ]
}
```

#### GET /documents/{document_id}

Retrieve a document by ID.

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "source": "policy",
  "title": "Allergen Policy",
  "content": "Full document content...",
  "created_at": "2024-01-15T10:30:00Z"
}
```

### Testing Instructions

#### 1. Start the Platform

```bash
cd infra
docker compose up -d --build
```

Ensure your `.env` file includes `OPENAI_API_KEY`.

#### 2. Verify Readiness

```bash
curl http://localhost:8000/ready
```

Expected response:
```json
{"status": "ready", "postgres": "ok", "qdrant": "ok"}
```

#### 3. Ingest a Sample Document

```bash
curl -X POST http://localhost:8000/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "source": "policy",
    "title": "Allergen Policy",
    "content": "Our restaurant is committed to providing accurate allergen information. We offer gluten-free options for customers with celiac disease or gluten sensitivity. All gluten-free dishes are prepared in a dedicated area to prevent cross-contamination. Please inform your server of any allergies or dietary restrictions. Common allergens include: wheat, dairy, eggs, soy, tree nuts, peanuts, fish, and shellfish. We cannot guarantee 100% allergen-free preparation due to shared kitchen equipment."
  }'
```

Expected response:
```json
{
  "document_id": "...",
  "chunks": 1,
  "qdrant_collection": "restaurant_knowledge"
}
```

#### 4. Search for Documents

```bash
curl -X POST http://localhost:8000/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "what dishes are gluten free?",
    "top_k": 5
  }'
```

Expected response:
```json
{
  "query": "what dishes are gluten free?",
  "results": [
    {
      "score": 0.87,
      "chunk_id": "...",
      "document_id": "...",
      "source": "policy",
      "title": "Allergen Policy",
      "chunk_index": 0,
      "content": "Our restaurant is committed..."
    }
  ]
}
```

#### 5. Retrieve a Document

```bash
curl http://localhost:8000/documents/{document_id}
```

Replace `{document_id}` with the ID returned from the ingest endpoint.

### Implementation Details

- **Chunking**: Simple character-based chunking (800 chars, 120 overlap)
- **Embeddings**: OpenAI SDK v1+ style, async-compatible
- **Schema Initialization**: Runs automatically on startup via `@app.on_event("startup")`
- **Collection Creation**: Qdrant collection created automatically with correct vector size
- **Error Handling**: Clear error messages if `OPENAI_API_KEY` is missing

### File Structure

```
apps/ai-api/app/
├── main.py              # FastAPI app with endpoints
├── schema.py            # Postgres schema initialization
├── ingest.py            # Chunking and ingestion logic
├── openai_client.py     # OpenAI embedding client
├── qdrant_client.py     # Qdrant client (updated with collection init)
└── database.py          # Postgres connection (existing)
```

---

**Platform v0.1** - Stable file-provider Traefik architecture
