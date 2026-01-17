# AI ERP Platform - Infrastructure

Production-ready VPS deployment using Docker Compose with Traefik v3 reverse proxy.

## Milestones

- **v1.1.0** - Demo apps added (ERPNext + n8n)
- **v1.0.0** - Production-demo hardening (observability + cost controls + safe admin access)
- **v0.9.0** - Demo polish + guardrails (rate limiting, score filtering, admin UI)
- **v0.8.0** - Demo reset + seed dataset (admin endpoints)
- **v0.7.0** - UI deployment (Next.js behind Traefik)
- **v0.6.0** - Authentication (API key protection)
- **v0.5.0** - Chat endpoint (RAG with Qdrant)
- **v0.4.0** - Document ingestion (chunking + embeddings)
- **v0.1.0** - Stable file-provider Traefik architecture

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
├── openai_chat.py       # OpenAI chat client (v0.5)
├── qdrant_client.py     # Qdrant client (updated with collection init)
└── database.py          # Postgres connection (existing)
```

---

## Platform v0.5 – RAG Chat Endpoint

### Overview

The platform now includes a `/chat` endpoint that provides near-zero-cost RAG (Retrieval-Augmented Generation) capabilities. The endpoint reuses existing Qdrant vectors from `/ingest` and uses a lightweight chat model to synthesize answers from retrieved chunks.

### Features

- **RAG Chat**: Answer questions using retrieved context from ingested documents
- **Reuses Vectors**: Does not re-embed documents, only embeds the user query
- **Lightweight Model**: Uses `gpt-4o-mini` by default for cost efficiency
- **Citations**: Returns source citations with each answer
- **Graceful Handling**: Returns appropriate message when no context is found

### Architecture

```
┌─────────────────┐
│  POST /chat     │
│  (User Query)   │
└────────┬────────┘
         │
         ├─► OpenAI (embed query)
         ├─► Qdrant (vector search)
         ├─► Postgres (fetch chunk content)
         ├─► OpenAI Chat (generate answer)
         └─► Return answer + citations
```

### Environment Variables

Add to your `.env` file:

```bash
CHAT_MODEL=gpt-4o-mini          # Optional, defaults to gpt-4o-mini
CHAT_MAX_TOKENS=250             # Optional, defaults to 250
```

### API Endpoint

#### POST /chat

Chat endpoint with RAG capabilities.

**Request:**
```json
{
  "message": "what dishes are gluten free?",
  "top_k": 5
}
```

**Response:**
```json
{
  "message": "what dishes are gluten free?",
  "answer": "Based on the allergen policy, gluten-free options are available...",
  "citations": [
    {
      "chunk_id": "660e8400-e29b-41d4-a716-446655440001",
      "document_id": "550e8400-e29b-41d4-a716-446655440000",
      "source": "policy",
      "title": "Allergen Policy",
      "chunk_index": 1,
      "content": "Gluten-free options include...",
      "score": 0.87
    }
  ]
}
```

**No Results Response:**
```json
{
  "message": "what is the weather?",
  "answer": "I don't have enough information to answer that.",
  "citations": []
}
```

### Testing Instructions

#### 1. Ensure Documents Are Ingested

First, ingest some documents using `/ingest` (see v0.4 documentation).

#### 2. Test Chat Endpoint

```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "what dishes are gluten free?",
    "top_k": 5
  }'
```

Expected response includes:
- `answer`: Generated answer based on retrieved context
- `citations`: Array of source chunks with metadata

#### 3. Test with No Context

```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "what is the weather today?",
    "top_k": 5
  }'
```

Expected response:
```json
{
  "message": "what is the weather today?",
  "answer": "I don't have enough information to answer that.",
  "citations": []
}
```

### Implementation Details

- **Query Embedding**: Uses the same embedding model as `/search` (`text-embedding-3-small`)
- **Vector Reuse**: Retrieves existing vectors from Qdrant (no re-embedding of documents)
- **Chat Model**: Configurable via `CHAT_MODEL` env var (default: `gpt-4o-mini`)
- **Token Limit**: Configurable via `CHAT_MAX_TOKENS` env var (default: 250)
- **Prompt Engineering**: Minimal prompt that forces answer only from provided context
- **Citations**: Includes full metadata (document_id, source, title, chunk_index, content, score)

### File Structure

```
apps/ai-api/app/
├── main.py              # FastAPI app with /chat endpoint
├── openai_chat.py       # Chat answer generation (NEW)
├── schema.py            # Postgres schema initialization
├── ingest.py            # Chunking and ingestion logic
├── openai_client.py     # OpenAI embedding client
├── qdrant_client.py     # Qdrant client
└── database.py          # Postgres connection
```

---

## Platform v0.6 – Demo-Friendly Security & Multi-Tenant Isolation

### Overview

Platform v0.6 adds demo-friendly security with API key protection for write/admin endpoints while keeping read endpoints public. It also implements multi-tenant isolation, ensuring each tenant's data is completely separated.

### Features

- **API Key Protection**: Write/admin endpoints require `X-API-Key` header
- **Public Read Endpoints**: `/chat`, `/search`, `/health`, `/ready` remain public for demos
- **Multi-Tenant Isolation**: All documents and chunks are scoped to `tenant_id`
- **Safe Defaults**: Default tenant is `demo` if not specified
- **Backward Compatible**: Existing data automatically gets default tenant ID

### Security Model

**Public Endpoints** (no API key required):
- `POST /chat` - Chat with RAG
- `POST /search` - Semantic search
- `GET /health` - Health check
- `GET /ready` - Readiness check

**Protected Endpoints** (require `X-API-Key` header):
- `POST /ingest` - Ingest documents
- `GET /documents` - List documents
- `GET /documents/{document_id}` - Get document
- `DELETE /documents/{document_id}` - Delete document

### Multi-Tenant Architecture

Every document and chunk belongs to a `tenant_id`:
- Documents are isolated by tenant
- Search and chat queries filter by tenant
- Qdrant vectors include `tenant_id` in payload
- Postgres queries filter by `tenant_id`

### Environment Variables

Add to your `.env` file:

```bash
API_KEY=your-secret-api-key-here          # Required for protected endpoints
DEFAULT_TENANT_ID=demo                    # Optional, defaults to "demo"
```

**Important**: Never commit real API keys to git. Use `.env.example` as a template.

### API Endpoints

#### POST /ingest (Protected)

Ingest a document with optional tenant_id.

**Request Headers:**
```
X-API-Key: your-api-key
```

**Request:**
```json
{
  "source": "policy",
  "title": "Allergen Policy",
  "content": "...",
  "tenant_id": "demo"
}
```

**Response:**
```json
{
  "document_id": "...",
  "chunks": 3,
  "qdrant_collection": "restaurant_knowledge"
}
```

#### POST /search (Public)

Search documents for a specific tenant.

**Request:**
```json
{
  "query": "what dishes are gluten free?",
  "top_k": 5,
  "tenant_id": "demo"
}
```

**Response:** Same as v0.4, but only returns results for the specified tenant.

#### POST /chat (Public)

Chat with RAG for a specific tenant.

**Request:**
```json
{
  "message": "what dishes are gluten free?",
  "top_k": 5,
  "tenant_id": "demo"
}
```

**Response:** Same as v0.5, but only uses context from the specified tenant.

#### GET /documents (Protected)

List all documents for a tenant.

**Request Headers:**
```
X-API-Key: your-api-key
```

**Query Parameters:**
- `tenant_id` (optional, defaults to `DEFAULT_TENANT_ID`)

**Response:**
```json
[
  {
    "id": "...",
    "tenant_id": "demo",
    "source": "policy",
    "title": "Allergen Policy",
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

#### GET /documents/{document_id} (Protected)

Get a specific document.

**Request Headers:**
```
X-API-Key: your-api-key
```

**Query Parameters:**
- `tenant_id` (optional, defaults to `DEFAULT_TENANT_ID`)

**Response:**
```json
{
  "id": "...",
  "tenant_id": "demo",
  "source": "policy",
  "title": "Allergen Policy",
  "content": "...",
  "created_at": "2024-01-15T10:30:00Z"
}
```

#### DELETE /documents/{document_id} (Protected)

Delete a document and all its chunks.

**Request Headers:**
```
X-API-Key: your-api-key
```

**Query Parameters:**
- `tenant_id` (optional, defaults to `DEFAULT_TENANT_ID`)

**Response:**
```json
{
  "message": "Document deleted successfully",
  "document_id": "...",
  "tenant_id": "demo"
}
```

### Testing Instructions

#### 1. Set Up Environment

```bash
# In your .env file
API_KEY=my-secret-key-123
DEFAULT_TENANT_ID=demo
```

#### 2. Test Public Endpoint (No API Key)

```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "what dishes are gluten free?",
    "top_k": 5,
    "tenant_id": "demo"
  }'
```

#### 3. Test Protected Endpoint (With API Key)

```bash
curl -X POST http://localhost:8000/ingest \
  -H "Content-Type: application/json" \
  -H "X-API-Key: my-secret-key-123" \
  -d '{
    "source": "policy",
    "title": "Allergen Policy",
    "content": "Our restaurant offers gluten-free options...",
    "tenant_id": "demo"
  }'
```

#### 4. Test Without API Key (Should Fail)

```bash
curl -X POST http://localhost:8000/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "source": "policy",
    "title": "Test",
    "content": "Test content"
  }'
```

Expected response: `401 Unauthorized`

#### 5. List Documents

```bash
curl -X GET "http://localhost:8000/documents?tenant_id=demo" \
  -H "X-API-Key: my-secret-key-123"
```

#### 6. Delete Document

```bash
curl -X DELETE "http://localhost:8000/documents/{document_id}?tenant_id=demo" \
  -H "X-API-Key: my-secret-key-123"
```

### Database Schema Changes

**New Columns:**
- `documents.tenant_id` (TEXT NOT NULL DEFAULT 'demo')
- `chunks.tenant_id` (TEXT NOT NULL DEFAULT 'demo')

**New Indexes:**
- `idx_documents_tenant_created` on `documents(tenant_id, created_at)`
- `idx_chunks_tenant_document` on `chunks(tenant_id, document_id)`

**Migration:** Existing tables are automatically migrated on startup. Existing rows get the default tenant ID.

### Qdrant Changes

**Payload Updates:**
- All Qdrant points now include `tenant_id` in payload
- Search queries filter by `tenant_id` using Qdrant filters

### Implementation Details

- **API Key Verification**: FastAPI dependency `verify_api_key()` checks `X-API-Key` header
- **Tenant Filtering**: All queries filter by `tenant_id` (both Postgres and Qdrant)
- **Default Tenant**: Uses `DEFAULT_TENANT_ID` env var (defaults to "demo")
- **Backward Compatibility**: Existing data automatically assigned to default tenant

### File Structure

```
apps/ai-api/app/
├── main.py              # FastAPI app with protected/public endpoints
├── auth.py              # API key verification (NEW)
├── openai_chat.py       # Chat answer generation
├── schema.py            # Postgres schema (updated with tenant_id)
├── ingest.py            # Chunking and ingestion (updated with tenant_id)
├── openai_client.py     # OpenAI embedding client
├── qdrant_client.py     # Qdrant client
└── database.py          # Postgres connection
```

### Security Recommendations

1. **For Demos**: Keep `/chat` public so visitors can try it
2. **For Production**: Consider additional security layers (rate limiting, CORS, etc.)
3. **API Keys**: Use strong, randomly generated keys
4. **Tenant Isolation**: Each tenant should have a unique tenant_id
5. **Never Commit Secrets**: Keep `.env` files out of git

---

## Platform v0.7 – UI Demo (Next.js, App Router)

### Overview

Platform v0.7 adds a minimal, production-lean UI built with Next.js (App Router), TypeScript, and Tailwind CSS. The UI demonstrates the AI ERP Platform working end-to-end for the restaurant demo tenant, providing a chat interface and document management capabilities.

The UI is deployed behind Traefik on the VPS:
- **UI**: `https://demo.helioncity.com` - Public-facing Next.js application
- **API**: `https://api.demo.helioncity.com` - FastAPI backend (unchanged)

### Features

- **Chat Interface**: Interactive chat panel with RAG-powered responses
- **Citation Display**: Shows source documents with scores and content snippets
- **Test Queries**: Quick buttons for common restaurant queries
- **Document Management**: List, refresh, and delete documents (requires API key)
- **Tenant Configuration**: UI field to set tenant_id
- **API Key Support**: Optional X-API-Key field for protected endpoints

### Technology Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **API Client**: Custom fetch wrapper with tenant_id and API key support

### Project Structure

```
apps/ui/
├── app/
│   ├── page.tsx              # Home dashboard with chat
│   ├── documents/
│   │   └── page.tsx          # Document management page
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styles
├── lib/
│   └── api.ts                # API client wrapper
├── package.json
├── tsconfig.json
└── .env.local.example        # Environment variables template
```

### Local Development

#### 1. Install Dependencies

```bash
cd apps/ui
npm install
```

#### 2. Environment Setup

Create `.env.local` file (or copy from `.env.local.example`):

```bash
NEXT_PUBLIC_API_BASE=https://api.demo.helioncity.com
```

**Note**: The UI defaults to `https://api.demo.helioncity.com` if `NEXT_PUBLIC_API_BASE` is not set.

#### 3. Run Development Server

```bash
npm run dev
```

The UI will be available at `http://localhost:3000`

#### 4. Build for Production

```bash
npm run build
npm start
```

### VPS Deployment

The UI is deployed as a Docker container behind Traefik, sharing the same infrastructure as the API.

#### 1. Environment Setup

Add the following to your `infra/.env` file:

```bash
DOMAIN_UI=demo.helioncity.com
NEXT_PUBLIC_API_BASE=https://api.demo.helioncity.com
```

**Note**: Make sure `DOMAIN_API` is also set (e.g., `DOMAIN_API=api.demo.helioncity.com`).

#### 2. Deploy

```bash
cd infra
docker compose up -d --build
```

This will:
- Build the UI Docker image using the multi-stage Dockerfile
- Start the UI container on port 3000 (internal)
- Configure Traefik to route `https://demo.helioncity.com` to the UI service
- Automatically generate Let's Encrypt SSL certificate for the UI domain

#### 3. Verify Deployment

```bash
# Check containers
docker compose ps

# Check UI logs
docker compose logs -f ui

# Test UI endpoint
curl https://demo.helioncity.com
```

#### 4. DNS Configuration

Ensure DNS is configured before deployment:
- `demo.helioncity.com` → Your VPS IP address
- `api.demo.helioncity.com` → Your VPS IP address

Both domains point to the same server; Traefik routes based on the Host header.

### Pages

#### `/` (Home Dashboard)

**Features:**
- Chat panel that calls `POST /chat` with `{ tenant_id, message, top_k }`
- Displays assistant answer and renders citations (score, title, content snippet)
- Test buttons with example queries:
  - Opening Hours
  - Reservations
  - Allergens
  - Address
- Tenant ID configuration field (defaults to "demo")
- Top K slider for controlling retrieval count

**Usage:**
1. Set tenant_id (defaults to "demo")
2. Enter a message or click a test query button
3. View the assistant's answer and citations

#### `/documents` (Admin-lite)

**Features:**
- Lists documents via `GET /documents?tenant_id=demo` (requires X-API-Key)
- Refresh button to reload document list
- Delete button per document calling `DELETE /documents/{id}?tenant_id=demo` (requires X-API-Key)
- Clear error display if API key is missing or invalid

**Usage:**
1. Enter your X-API-Key (required for this page)
2. Set tenant_id (defaults to "demo")
3. Click "Refresh" to load documents
4. Click "Delete" on any document to remove it

### API Client (`lib/api.ts`)

The API client provides a clean interface for interacting with the backend:

**Functions:**
- `chat(message, topK, config)` - Send chat message
- `listDocuments(config)` - List documents (requires API key)
- `deleteDocument(documentId, config)` - Delete document (requires API key)

**Configuration:**
```typescript
interface ApiConfig {
  tenantId?: string;  // Defaults to "demo"
  apiKey?: string;    // Required for protected endpoints
}
```

**Error Handling:**
- Custom `ApiError` class with status codes
- Clear error messages for missing API keys
- Graceful handling of network errors

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_BASE` | API base URL | `https://api.demo.helioncity.com` |

### Using Tenant ID and API Key

**Tenant ID:**
- Defaults to "demo" if not specified
- Can be changed via UI field on both pages
- Sent as query parameter `tenant_id` in API requests

**API Key:**
- Required for `/documents` page (list and delete operations)
- Optional for `/` page (chat endpoint is public)
- Entered via UI field on documents page
- Sent as `X-API-Key` header in API requests

### Example Workflow

1. **Start the UI:**
   ```bash
   cd apps/ui
   npm install
   npm run dev
   ```

2. **Test Chat (No API Key Required):**
   - Navigate to `http://localhost:3000`
   - Click "Opening Hours" test button
   - View answer and citations

3. **Manage Documents (API Key Required):**
   - Navigate to `http://localhost:3000/documents`
   - Enter your X-API-Key
   - Click "Refresh" to see documents
   - Delete documents as needed

### Implementation Details

- **Client-Side Rendering**: Both pages use `'use client'` for interactivity
- **State Management**: React hooks (`useState`, `useEffect`) for local state
- **Error Handling**: Try-catch blocks with user-friendly error messages
- **Loading States**: Loading indicators during API calls
- **Responsive Design**: Tailwind CSS for mobile-friendly layouts
- **Dark Mode**: Supports system dark mode preference

### File Structure Details

**`lib/api.ts`:**
- Fetch wrapper with base URL configuration
- Automatic tenant_id query parameter injection
- Optional X-API-Key header support
- TypeScript types for all API responses

**`app/page.tsx`:**
- Chat form with message input and top_k control
- Test query buttons for quick testing
- Citation display with score, title, and content
- Error handling and loading states

**`app/documents/page.tsx`:**
- Document list with refresh functionality
- Delete confirmation dialogs
- API key input with validation
- Empty state messages

### Notes

- The UI is minimal and production-lean—no overengineering
- Backend behavior unchanged—UI only consumes existing API
- All API calls respect tenant_id isolation
- Protected endpoints require API key as per v0.6 security model
- UI calls API via `NEXT_PUBLIC_API_BASE` environment variable
- CORS is configured to allow requests from `https://demo.helioncity.com`

---

## Platform v0.8 – Demo Reset + Seed Dataset

### Overview

Platform v0.8 adds protected admin endpoints for resetting and seeding demo tenants. This enables deterministic, repeatable demo resets with a standard restaurant dataset.

### Features

- **Reset Tenant**: Delete all Postgres documents/chunks and Qdrant points for a tenant
- **Seed Tenant**: Ingest 8 standard restaurant documents into a tenant
- **Reset-Seed**: Combined operation to reset and seed in one command
- **Protected Endpoints**: All admin endpoints require `X-API-Key` header
- **Deterministic**: Same seed dataset every time, always ends in clean state

### Admin Endpoints

All admin endpoints require `X-API-Key` header and are protected by the existing auth system.

#### POST /admin/reset

Reset a tenant by deleting all data.

**Request Headers:**
```
X-API-Key: your-api-key
```

**Request Body:**
```json
{
  "tenant_id": "demo"  // Optional, defaults to DEFAULT_TENANT_ID
}
```

**Response (200 OK):**
```json
{
  "status": "reset",
  "tenant_id": "demo",
  "deleted_postgres_documents": 5,
  "deleted_postgres_chunks": 12,
  "deleted_qdrant_points": -1  // -1 if Qdrant doesn't return count
}
```

#### POST /admin/seed

Seed a tenant with the standard restaurant dataset (8 documents).

**Request Headers:**
```
X-API-Key: your-api-key
```

**Request Body:**
```json
{
  "tenant_id": "demo"  // Optional, defaults to DEFAULT_TENANT_ID
}
```

**Response (201 Created):**
```json
{
  "status": "seeded",
  "tenant_id": "demo",
  "documents": [
    {
      "title": "Restaurant Overview",
      "document_id": "550e8400-e29b-41d4-a716-446655440000",
      "chunks": 1
    },
    {
      "title": "Opening Hours",
      "document_id": "660e8400-e29b-41d4-a716-446655440001",
      "chunks": 1
    }
    // ... 6 more documents
  ]
}
```

#### POST /admin/reset-seed

Reset and seed a tenant in one operation.

**Request Headers:**
```
X-API-Key: your-api-key
```

**Request Body:**
```json
{
  "tenant_id": "demo"  // Optional, defaults to DEFAULT_TENANT_ID
}
```

**Response (201 Created):**
```json
{
  "status": "reset-seeded",
  "tenant_id": "demo",
  "reset": {
    "status": "reset",
    "tenant_id": "demo",
    "deleted_postgres_documents": 5,
    "deleted_postgres_chunks": 12,
    "deleted_qdrant_points": -1
  },
  "seed": {
    "status": "seeded",
    "tenant_id": "demo",
    "documents": [...]
  }
}
```

### Seed Dataset

The seed dataset includes 8 documents:

1. **Restaurant Overview** - Name, address, contact info
2. **Opening Hours** - Operating hours and holiday policy
3. **Reservations Policy** - Booking rules and group policies
4. **Allergens & Food Safety** - Allergen handling information
5. **Delivery & Pickup** - Delivery radius, minimum orders, timing
6. **Payments & Receipts** - Accepted payment methods
7. **Refunds & Complaints** - Complaint handling process
8. **Staff SOP (Closing Checklist)** - Closing procedures

### Testing Instructions

#### Setup Environment Variables

```bash
export BASE=https://api.demo.helioncity.com
export API_KEY=your-secret-api-key-here
export TENANT=demo
```

#### Reset Demo Tenant

```bash
curl -X POST "${BASE}/admin/reset" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${API_KEY}" \
  -d "{\"tenant_id\": \"${TENANT}\"}"
```

#### Seed Demo Tenant

```bash
curl -X POST "${BASE}/admin/seed" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${API_KEY}" \
  -d "{\"tenant_id\": \"${TENANT}\"}"
```

#### Reset and Seed Demo Tenant (One Command)

```bash
curl -X POST "${BASE}/admin/reset-seed" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${API_KEY}" \
  -d "{\"tenant_id\": \"${TENANT}\"}"
```

### Implementation Details

- **Seed Dataset**: Defined in `apps/ai-api/app/seed.py` as a list of documents
- **Reset Logic**: 
  - Deletes Postgres rows via `delete_tenant_data()` in `schema.py`
  - Deletes Qdrant points via `delete_points_by_tenant()` in `qdrant_client.py`
- **Seed Logic**: Uses existing `ingest_document()` function from `ingest.py`
- **Error Handling**: Clear error messages, proper HTTP status codes
- **Tenant Isolation**: All operations respect tenant_id boundaries

### File Structure

```
apps/ai-api/app/
├── main.py              # FastAPI app with admin endpoints (v0.8)
├── seed.py              # Seed dataset definition (NEW)
├── schema.py            # Postgres schema + delete_tenant_data() (UPDATED)
├── qdrant_client.py     # Qdrant client + delete_points_by_tenant() (UPDATED)
├── ingest.py            # Document ingestion (unchanged)
├── auth.py              # API key verification (unchanged)
└── ...
```

### Notes

- Reset operations are **destructive** - all tenant data is permanently deleted
- Seed operations use OpenAI embeddings - ensure `OPENAI_API_KEY` is set
- Qdrant deletion count may return -1 if Qdrant doesn't provide count
- All admin endpoints require API key authentication
- Default tenant uses `DEFAULT_TENANT_ID` environment variable if not specified

---

## Platform v0.9 – Demo Polish + Guardrails

### Overview

Platform v0.9 adds quality improvements to chat/search endpoints with score filtering and citation limits, implements rate limiting for public endpoints, and adds an admin panel UI for managing demo resets.

### Features

- **Chat Improvements**: Optional `min_score` and `max_citations` filters for better quality control
- **Search Improvements**: Optional `min_score` filter to exclude low-relevance results
- **Rate Limiting**: In-memory rate limiter for `/chat` and `/search` (60 requests per 10 minutes per IP)
- **Admin Panel UI**: Web interface for reset/seed operations at `/admin`
- **Navigation**: Links between Chat, Documents, and Admin pages

### API Improvements

#### POST /chat

**New Optional Fields:**
- `min_score` (float, default: 0.45) - Minimum relevance score for retrieved chunks
- `max_citations` (int, default: 3) - Maximum number of citations to return

**Behavior:**
- Retrieves `top_k` chunks from Qdrant
- Filters results by `score >= min_score`
- Uses only filtered results as context for LLM
- Returns at most `max_citations` citations (highest score first)
- If no results after filtering: returns "I don't have enough information to answer that."

**Request Example:**
```json
{
  "message": "What are your opening hours?",
  "top_k": 5,
  "min_score": 0.5,
  "max_citations": 2,
  "tenant_id": "demo"
}
```

#### POST /search

**New Optional Field:**
- `min_score` (float, default: 0.45) - Minimum relevance score for results

**Behavior:**
- Filters results by `score >= min_score` before returning
- Only returns results meeting the minimum score threshold

**Request Example:**
```json
{
  "query": "opening hours",
  "top_k": 5,
  "min_score": 0.5,
  "tenant_id": "demo"
}
```

### Rate Limiting

**Configuration:**
- `RATE_LIMIT_MAX` (default: 60) - Maximum requests per window
- `RATE_LIMIT_WINDOW_SECONDS` (default: 600) - Time window in seconds

**Behavior:**
- Applies to `/chat` and `/search` endpoints only
- Keyed by client IP (checks `X-Forwarded-For` header first, then `request.client.host`)
- Returns HTTP 429 with JSON: `{"detail":"Rate limit exceeded. Try again later."}` when exceeded
- In-memory storage (no Redis required)
- Works behind Traefik (uses X-Forwarded-For header)

**Rate Limit Response (429):**
```json
{
  "detail": "Rate limit exceeded. Try again later."
}
```

### UI Admin Panel

**Location:** `/admin`

**Features:**
- Tenant ID input (default: "demo")
- API key input (required)
- Three action buttons:
  - **Reset Tenant** - Deletes all tenant data
  - **Seed Tenant** - Ingests seed dataset
  - **Reset + Seed** - Combined operation
- Success/error display with formatted JSON output
- Warning message about destructive operations

**Navigation:**
- Links added to home page: "Documents →" and "Admin Panel →"
- Links added to documents page: "← Back to Chat" and "Admin Panel →"
- Links added to admin page: "← Back to Chat" and "Documents →"

### Testing Instructions

#### Test Rate Limiting

```bash
export BASE=https://api.demo.helioncity.com

# Make 61 requests rapidly (should get 429 on 61st)
for i in {1..61}; do
  curl -X POST "${BASE}/chat" \
    -H "Content-Type: application/json" \
    -d '{"message":"test"}'
  echo ""
done
```

#### Test Chat with Filters

```bash
curl -X POST "${BASE}/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are your opening hours?",
    "min_score": 0.5,
    "max_citations": 2,
    "tenant_id": "demo"
  }'
```

#### Test Search with Filter

```bash
curl -X POST "${BASE}/search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "opening hours",
    "min_score": 0.5,
    "tenant_id": "demo"
  }'
```

### Implementation Details

- **Rate Limiting**: Lightweight in-memory middleware using `collections.defaultdict`
- **Score Filtering**: Applied after Qdrant retrieval, before LLM context building
- **Citation Limiting**: Sorted by score (descending), then sliced to `max_citations`
- **No Breaking Changes**: All new fields are optional with sensible defaults
- **CORS**: Maintained for localhost and demo.helioncity.com

### File Structure

```
apps/ai-api/app/
├── main.py              # FastAPI app (v0.9 - chat/search improvements, rate limiting)
├── rate_limit.py        # Rate limiting middleware (NEW)
├── seed.py              # Seed dataset
└── ...

apps/ui/app/
├── page.tsx             # Home page (updated navigation)
├── documents/
│   └── page.tsx         # Documents page (updated navigation)
├── admin/
│   └── page.tsx         # Admin panel (NEW)
└── lib/
    └── api.ts           # API client (extended with admin functions)
```

### Notes

- Rate limiting is per-IP and resets after the time window
- Score filtering improves answer quality by excluding low-relevance chunks
- Citation limiting reduces noise in responses
- Admin panel provides convenient UI for demo management
- All existing functionality remains unchanged (backward compatible)

---

## Platform v1.0 – Production-Demo Hardening

### Overview

Platform v1.0 adds production-grade observability, cost controls, safe admin access, and UI polish. This version focuses on hardening the demo platform for production use while maintaining simplicity.

### Features

- **Structured Logging**: Request tracking with request_id and OpenAI call logging
- **Environment Defaults**: Configurable defaults for all key parameters
- **Admin IP Allowlist**: Optional IP-based access control for admin endpoints
- **UI Improvements**: Confirmation modals, demo script, request_id display, API key warnings

### Structured Logging

All OpenAI API calls are logged with structured data:

**Embedding Calls:**
- `event="openai_embedding"`
- `tenant_id`, `model`, `duration_ms`, `success`, `error_type`, `request_id`, `text_count`

**Chat Completion Calls:**
- `event="openai_chat"`
- `tenant_id`, `model`, `duration_ms`, `success`, `error_type`, `request_id`, `context_count`

Logs are written using Python's `logging` module with structured `extra` fields for easy parsing.

### Request ID Tracking

- Every request gets a unique `request_id` (UUID) via middleware
- `request_id` is attached to request state and included in response headers (`X-Request-ID`)
- `request_id` is included in `/chat` responses and all OpenAI call logs
- Useful for tracing requests across services and debugging

### Environment Defaults

All key parameters can be configured via environment variables:

```bash
# Chat/Search defaults
MIN_SCORE_DEFAULT=0.45          # Minimum relevance score (default: 0.45)
MAX_CITATIONS_DEFAULT=3          # Maximum citations to return (default: 3)
TOP_K_DEFAULT=5                 # Number of chunks to retrieve (default: 5)

# Ingestion defaults
CHUNK_SIZE=800                  # Characters per chunk (default: 800)
CHUNK_OVERLAP=120               # Overlap between chunks (default: 120)

# Admin security
ADMIN_IP_ALLOWLIST=1.2.3.4,10.0.0.0/8  # Comma-separated IPs/CIDRs (optional)
```

**Usage:**
- If not set in request, endpoints use these defaults
- Request-level values override defaults
- Allows global tuning without code changes

### Admin IP Allowlist

**Configuration:**
- `ADMIN_IP_ALLOWLIST` - Comma-separated list of IPs/CIDRs (optional)
- If set, only requests from allowed IPs can access `/admin/*` endpoints
- Still requires `X-API-Key` header (both checks must pass)
- If not set, allowlist is disabled (backward compatible)

**Example:**
```bash
ADMIN_IP_ALLOWLIST=203.0.113.0/24,198.51.100.1
```

**Behavior:**
- Checks `X-Forwarded-For` header first (for Traefik)
- Falls back to `request.client.host`
- Supports CIDR notation (e.g., `10.0.0.0/8`)
- Returns HTTP 403 if IP not allowed

### UI Improvements

#### Admin Panel Enhancements

1. **Confirmation Modal**: 
   - Shows before reset/reset-seed operations
   - Prevents accidental data deletion
   - Clear warning about destructive nature

2. **Demo Script Section**:
   - 8 preset questions for quick testing
   - One-click chat testing
   - Shows answers and citations inline
   - Displays request_id for each response

3. **Request ID Display**:
   - Shown under chat answers (small text)
   - Helps with debugging and support
   - Links requests to logs

4. **API Key Warning Banner**:
   - Appears when API key is entered
   - Reminds users it's sensitive
   - Notes that key is not persisted

### API Changes

#### POST /chat

**Response now includes:**
```json
{
  "message": "...",
  "answer": "...",
  "citations": [...],
  "request_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Request fields use env defaults if not provided:**
- `top_k`: Defaults to `TOP_K_DEFAULT` (5)
- `min_score`: Defaults to `MIN_SCORE_DEFAULT` (0.45)
- `max_citations`: Defaults to `MAX_CITATIONS_DEFAULT` (3)

#### POST /search

**Request fields use env defaults if not provided:**
- `top_k`: Defaults to `TOP_K_DEFAULT` (5)
- `min_score`: Defaults to `MIN_SCORE_DEFAULT` (0.45)

#### POST /admin/*

**New Security:**
- Optional IP allowlist check (if `ADMIN_IP_ALLOWLIST` is set)
- Still requires `X-API-Key` header
- Returns HTTP 403 if IP not allowed

### Logging Configuration

Structured logs are written using Python's `logging` module. To configure:

```python
import logging

# Set log level
logging.basicConfig(level=logging.INFO)

# Or configure JSON logging for production
import json_logging
json_logging.init_fastapi()
```

### Testing Instructions

#### Test Request ID

```bash
curl -X POST "${BASE}/chat" \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}' \
  -v

# Check response for request_id field
# Check X-Request-ID header
```

#### Test Admin IP Allowlist

```bash
# Set allowlist
export ADMIN_IP_ALLOWLIST=127.0.0.1

# Restart API
docker compose restart ai-api

# Test from allowed IP (should work)
curl -X POST "${BASE}/admin/reset" \
  -H "X-API-Key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"tenant_id":"demo"}'

# Test from disallowed IP (should get 403)
# (requires testing from different IP)
```

#### Test Environment Defaults

```bash
# Set custom defaults
export MIN_SCORE_DEFAULT=0.5
export MAX_CITATIONS_DEFAULT=2

# Restart API
docker compose restart ai-api

# Request without fields (should use defaults)
curl -X POST "${BASE}/chat" \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}'
```

### Implementation Details

- **Request ID Middleware**: Generates UUID per request, attaches to state
- **Structured Logging**: Uses Python `logging` with `extra` dict for structured fields
- **IP Allowlist**: Uses `ipaddress` module for CIDR matching
- **Env Defaults**: Read at startup, applied when request fields are None
- **No Breaking Changes**: All new fields are optional, defaults maintain backward compatibility

### File Structure

```
apps/ai-api/app/
├── main.py              # FastAPI app (v1.0 - request_id, env defaults, admin IP)
├── request_id.py        # Request ID middleware (NEW)
├── admin_ip.py          # Admin IP allowlist middleware (NEW)
├── rate_limit.py        # Rate limiting middleware
├── openai_client.py     # Embedding client (updated with logging)
├── openai_chat.py       # Chat client (updated with logging)
├── ingest.py            # Ingestion (updated with env defaults)
└── ...

apps/ui/app/
├── admin/
│   └── page.tsx         # Admin panel (updated with modals, demo script)
├── page.tsx             # Home page (updated with request_id display)
└── lib/
    └── api.ts           # API client (updated with request_id)
```

### Notes

- Request IDs are UUIDs (v4) - globally unique
- Logging uses standard Python logging - integrate with your log aggregation
- IP allowlist is optional - set `ADMIN_IP_ALLOWLIST` to enable
- All env defaults have sensible defaults - no breaking changes
- UI improvements are backward compatible - existing functionality unchanged

---

## Platform v1.1 – Demo Apps: ERPNext + n8n

### Overview

Platform v1.1 adds ERPNext (ERP system) and n8n (workflow automation) as demo applications running on the same VPS behind the existing Traefik reverse proxy.

### Features

- **ERPNext**: Full-featured ERP system accessible at `erp.demo.helioncity.com`
- **n8n**: Workflow automation platform accessible at `n8n.demo.helioncity.com`
- **Shared Infrastructure**: Uses existing Traefik, Docker network, and Let's Encrypt certificates
- **Separate Compose File**: Demo apps in `docker-compose.demo-apps.yml` (doesn't affect main stack)

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Traefik v3.6.1                      │
│  ┌──────────────┐         ┌──────────────┐             │
│  │  Port 80    │────────▶│  Port 443    │             │
│  │  (HTTP)     │         │  (HTTPS)     │             │
│  └──────────────┘         └──────────────┘             │
│         │                        │                      │
│         └────────┬─────────────────┘                    │
│                  │                                      │
│         ┌────────▼────────┐                            │
│         │ Docker Provider │                            │
│         │  (Labels)       │                            │
│         └────────┬─────────┘                            │
└──────────────────┼────────────────────────────────────┘
                   │
    ┌──────────────┼──────────────┐
    │              │              │
┌───▼───┐    ┌─────▼─────┐  ┌────▼────┐
│ ERPNext│   │    n8n    │  │ ai-api  │
│ :8000  │   │  :5678    │  │  :8000  │
└────────┘   └───────────┘  └─────────┘
```

### n8n Configuration

**Access:** `https://n8n.demo.helioncity.com`

**Features:**
- Workflow automation platform
- Basic authentication enabled
- Webhook support configured
- Data persisted to volume

**Environment Variables:**
- `N8N_HOST`: Domain name (default: `n8n.demo.helioncity.com`)
- `N8N_PROTOCOL`: Protocol (default: `https`)
- `N8N_PORT`: Internal port (default: `5678`)
- `WEBHOOK_URL`: Webhook base URL
- `N8N_EDITOR_BASE_URL`: Editor base URL
- `N8N_BASIC_AUTH_USER`: Basic auth username
- `N8N_BASIC_AUTH_PASSWORD`: Basic auth password
- `N8N_BASIC_AUTH_ACTIVE`: Enable basic auth (default: `true`)

### ERPNext Configuration

**Access:** `https://erp.demo.helioncity.com`

**Components:**
- **MariaDB**: Database server (port 3306)
- **Redis**: Cache and queue server (port 6379)
- **ERPNext**: Application server (port 8000)

**Features:**
- Full ERP system with accounting, inventory, CRM, etc.
- Database persisted to volume
- Sites persisted to volume
- Automatic site creation on first run

**Environment Variables:**
- `ERPNEXT_SITE_NAME`: Site domain (default: `erp.demo.helioncity.com`)
- `ERPNEXT_DB_ROOT_PASSWORD`: MariaDB root password
- `ERPNEXT_DB_NAME`: Database name (default: `frappe`)
- `ERPNEXT_DB_USER`: Database user (default: `frappe`)
- `ERPNEXT_DB_PASSWORD`: Database password
- `ERPNEXT_ADMIN_PASSWORD`: ERPNext admin password
- `ERPNEXT_VERSION`: ERPNext version (default: `v15.0.0`)

### Deployment

**Prerequisites:**
- Existing platform stack running (Traefik, network "platform")
- DNS records pointing to VPS:
  - `erp.demo.helioncity.com` → VPS IP
  - `n8n.demo.helioncity.com` → VPS IP

**Steps:**
1. Copy environment template:
   ```bash
   cp infra/.env.demo-apps.example infra/.env.demo-apps
   ```

2. Edit `.env.demo-apps` with secure passwords

3. Start demo apps:
   ```bash
   cd infra
   docker compose -f docker-compose.demo-apps.yml --env-file .env.demo-apps up -d
   ```

4. Wait for services to start (ERPNext first-time setup takes 5-10 minutes)

5. Access:
   - ERPNext: `https://erp.demo.helioncity.com`
   - n8n: `https://n8n.demo.helioncity.com`

### First-Time ERPNext Site Creation

If automatic site creation fails, manually create the site:

```bash
# Enter ERPNext container
docker compose -f docker-compose.demo-apps.yml exec erpnext bash

# Create new site
bench new-site erp.demo.helioncity.com \
  --db-root-password ${ERPNEXT_DB_ROOT_PASSWORD} \
  --admin-password ${ERPNEXT_ADMIN_PASSWORD} \
  --install-app erpnext

# Exit container
exit
```

### File Structure

```
infra/
├── docker-compose.yml              # Main stack (ai-api, ui, postgres, qdrant)
├── docker-compose.demo-apps.yml    # Demo apps (ERPNext, n8n) (NEW)
├── .env.example                    # Main stack env template
├── .env.demo-apps.example          # Demo apps env template (NEW)
└── ...
```

### Notes

- Demo apps use the existing "platform" Docker network
- Traefik automatically discovers services via Docker labels
- Let's Encrypt certificates are automatically provisioned
- Demo apps are isolated from main stack (separate compose file)
- ERPNext first-time setup can take 5-10 minutes
- n8n requires basic auth credentials (set in `.env.demo-apps`)

### Troubleshooting

**ERPNext not accessible:**
- Check site creation: `docker compose -f docker-compose.demo-apps.yml logs erpnext`
- Verify database connection: `docker compose -f docker-compose.demo-apps.yml exec erpnext-db mysql -u root -p`
- Check Traefik routing: `curl http://localhost:8080/api/http/routers | jq '.[] | select(.name | contains("erpnext"))'`

**n8n not accessible:**
- Check container logs: `docker compose -f docker-compose.demo-apps.yml logs n8n`
- Verify basic auth credentials in `.env.demo-apps`
- Check Traefik routing: `curl http://localhost:8080/api/http/routers | jq '.[] | select(.name | contains("n8n"))'`

**Traefik not discovering services:**
- Verify Docker socket mount: `docker compose -f docker-compose.demo-apps.yml exec traefik ls /var/run/docker.sock`
- Check network: `docker network inspect platform`
- Restart Traefik: `docker compose restart traefik`

---

**Platform v0.1** - Stable file-provider Traefik architecture
