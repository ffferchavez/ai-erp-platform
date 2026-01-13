import os
from fastapi import FastAPI, status, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional

from app.database import check_postgres, get_engine
from app.qdrant_client import check_qdrant, ensure_collection_exists, COLLECTION_NAME, get_qdrant_client
from app.schema import ensure_schema_exists
from app.ingest import ingest_document
from app.openai_client import get_embedding
from app.openai_chat import generate_answer
from app.auth import verify_api_key, get_default_tenant_id
from qdrant_client.models import Filter, FieldCondition, MatchValue
from sqlalchemy import text

app = FastAPI(title="AI API", version="0.7.1")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js dev server
        "http://localhost:3001",  # Alternative port
        "https://api.demo.helioncity.com",  # Production API (if UI is served from same domain)
        "https://demo.helioncity.com",  # Production UI
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request/Response models
class IngestRequest(BaseModel):
    source: str
    title: str
    content: str
    tenant_id: Optional[str] = None


class IngestResponse(BaseModel):
    document_id: str
    chunks: int
    qdrant_collection: str


class SearchRequest(BaseModel):
    query: str
    top_k: int = 5
    tenant_id: Optional[str] = None


class SearchResult(BaseModel):
    score: float
    chunk_id: str
    document_id: str
    source: str
    title: str
    chunk_index: int
    content: str


class SearchResponse(BaseModel):
    query: str
    results: List[SearchResult]


class ChatRequest(BaseModel):
    message: str
    top_k: int = 5
    tenant_id: Optional[str] = None


class Citation(BaseModel):
    chunk_id: str
    document_id: str
    source: str
    title: str
    chunk_index: int
    content: str
    score: float


class ChatResponse(BaseModel):
    message: str
    answer: str
    citations: List[Citation]


@app.on_event("startup")
async def startup_event():
    """Initialize schema and Qdrant collection on startup."""
    try:
        # Ensure Postgres schema exists
        await ensure_schema_exists()
        
        # Ensure Qdrant collection exists
        # We need to get the vector size from the embedding model
        # For text-embedding-3-small, it's 1536
        # We'll create a test embedding to get the actual size
        try:
            test_embedding = await get_embedding("test")
            vector_size = len(test_embedding)
            await ensure_collection_exists(vector_size)
        except ValueError:
            # OPENAI_API_KEY not set - collection will be created on first ingest
            # This is acceptable for startup
            pass
    except Exception as e:
        # Log error but don't fail startup
        print(f"Warning: Startup initialization error: {e}")


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/ready")
async def ready():
    """
    Readiness check endpoint.
    Verifies connectivity to Postgres and Qdrant.
    Returns 200 if both are healthy, 503 if either fails.
    """
    postgres_ok, postgres_error = await check_postgres()
    qdrant_ok, qdrant_error = check_qdrant()

    if postgres_ok and qdrant_ok:
        return {"status": "ready", "postgres": "ok", "qdrant": "ok"}

    errors = {}
    if not postgres_ok:
        errors["postgres"] = postgres_error
    if not qdrant_ok:
        errors["qdrant"] = qdrant_error

    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "status": "not ready",
            "errors": errors
        }
    )


@app.get("/")
async def root():
    return {"name": "ai-api", "version": "0.7.1"}


@app.post("/ingest", response_model=IngestResponse, status_code=status.HTTP_201_CREATED)
async def ingest(request: IngestRequest, api_key: str = Depends(verify_api_key)):
    """
    Ingest a document: store in Postgres, chunk, embed, and store in Qdrant.
    Requires X-API-Key header.
    """
    try:
        tenant_id = request.tenant_id or get_default_tenant_id()
        document_id, num_chunks = await ingest_document(
            source=request.source,
            title=request.title,
            content=request.content,
            tenant_id=tenant_id
        )
        
        return IngestResponse(
            document_id=document_id,
            chunks=num_chunks,
            qdrant_collection=COLLECTION_NAME
        )
    except ValueError as e:
        # OPENAI_API_KEY missing or other configuration error
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to ingest document: {str(e)}"
        )


@app.post("/search", response_model=SearchResponse)
async def search(request: SearchRequest):
    """
    Search for documents using semantic search.
    Public endpoint - filters by tenant_id.
    """
    try:
        tenant_id = request.tenant_id or get_default_tenant_id()
        
        # Embed the query
        query_embedding = await get_embedding(request.query)
        
        # Search Qdrant with tenant filter
        qdrant = get_qdrant_client()
        search_results = qdrant.search(
            collection_name=COLLECTION_NAME,
            query_vector=query_embedding,
            query_filter=Filter(
                must=[
                    FieldCondition(
                        key="tenant_id",
                        match=MatchValue(value=tenant_id)
                    )
                ]
            ),
            limit=request.top_k
        )
        
        # Fetch chunk contents from Postgres (also filter by tenant_id for safety)
        engine = get_engine()
        results = []
        
        async with engine.connect() as conn:
            for hit in search_results:
                chunk_id = str(hit.id)
                
                # Fetch chunk content from Postgres with tenant filter
                result = await conn.execute(
                    text("""
                        SELECT c.id, c.document_id, c.chunk_index, c.content,
                               d.source, d.title
                        FROM chunks c
                        JOIN documents d ON c.document_id = d.id
                        WHERE c.id = :chunk_id AND c.tenant_id = :tenant_id
                    """),
                    {"chunk_id": chunk_id, "tenant_id": tenant_id}
                )
                row = result.fetchone()
                
                if row:
                    results.append(SearchResult(
                        score=hit.score,
                        chunk_id=str(row[0]),
                        document_id=str(row[1]),
                        source=row[4],
                        title=row[5],
                        chunk_index=row[2],
                        content=row[3]
                    ))
        
        return SearchResponse(
            query=request.query,
            results=results
        )
    except ValueError as e:
        # OPENAI_API_KEY missing or other configuration error
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to search: {str(e)}"
        )


@app.get("/documents", dependencies=[Depends(verify_api_key)])
async def list_documents(tenant_id: Optional[str] = Query(None)):
    """
    List documents for a tenant.
    Requires X-API-Key header.
    """
    try:
        tenant_id = tenant_id or get_default_tenant_id()
        engine = get_engine()
        
        async with engine.connect() as conn:
            result = await conn.execute(
                text("""
                    SELECT id, tenant_id, source, title, created_at
                    FROM documents
                    WHERE tenant_id = :tenant_id
                    ORDER BY created_at DESC
                """),
                {"tenant_id": tenant_id}
            )
            rows = result.fetchall()
            
            return [
                {
                    "id": str(row[0]),
                    "tenant_id": row[1],
                    "source": row[2],
                    "title": row[3],
                    "created_at": row[4].isoformat() if row[4] else None
                }
                for row in rows
            ]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list documents: {str(e)}"
        )


@app.get("/documents/{document_id}", dependencies=[Depends(verify_api_key)])
async def get_document(document_id: str, tenant_id: Optional[str] = Query(None)):
    """
    Get a document by ID.
    Requires X-API-Key header.
    """
    try:
        tenant_id = tenant_id or get_default_tenant_id()
        engine = get_engine()
        
        async with engine.connect() as conn:
            result = await conn.execute(
                text("""
                    SELECT id, tenant_id, source, title, content, created_at
                    FROM documents
                    WHERE id = :document_id AND tenant_id = :tenant_id
                """),
                {"document_id": document_id, "tenant_id": tenant_id}
            )
            row = result.fetchone()
            
            if not row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Document not found"
                )
            
            return {
                "id": str(row[0]),
                "tenant_id": row[1],
                "source": row[2],
                "title": row[3],
                "content": row[4],
                "created_at": row[5].isoformat() if row[5] else None
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch document: {str(e)}"
        )


@app.delete("/documents/{document_id}", dependencies=[Depends(verify_api_key)])
async def delete_document(document_id: str, tenant_id: Optional[str] = Query(None)):
    """
    Delete a document and its chunks.
    Requires X-API-Key header.
    Deletes from both Postgres and Qdrant.
    """
    try:
        tenant_id = tenant_id or get_default_tenant_id()
        engine = get_engine()
        qdrant = get_qdrant_client()
        
        # Verify document exists and belongs to tenant
        async with engine.begin() as conn:
            result = await conn.execute(
                text("""
                    SELECT id FROM documents
                    WHERE id = :document_id AND tenant_id = :tenant_id
                """),
                {"document_id": document_id, "tenant_id": tenant_id}
            )
            row = result.fetchone()
            
            if not row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Document not found"
                )
            
            # Get chunk IDs for Qdrant deletion
            chunk_result = await conn.execute(
                text("""
                    SELECT id FROM chunks
                    WHERE document_id = :document_id AND tenant_id = :tenant_id
                """),
                {"document_id": document_id, "tenant_id": tenant_id}
            )
            chunk_rows = chunk_result.fetchall()
            chunk_ids = [str(row[0]) for row in chunk_rows]
            
            # Delete from Postgres (CASCADE will handle chunks)
            await conn.execute(
                text("""
                    DELETE FROM documents
                    WHERE id = :document_id AND tenant_id = :tenant_id
                """),
                {"document_id": document_id, "tenant_id": tenant_id}
            )
        
        # Delete from Qdrant using filter
        if chunk_ids:
            qdrant.delete(
                collection_name=COLLECTION_NAME,
                points_selector=Filter(
                    must=[
                        FieldCondition(
                            key="document_id",
                            match=MatchValue(value=document_id)
                        ),
                        FieldCondition(
                            key="tenant_id",
                            match=MatchValue(value=tenant_id)
                        )
                    ]
                )
            )
        
        return {
            "message": "Document deleted successfully",
            "document_id": document_id,
            "tenant_id": tenant_id
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete document: {str(e)}"
        )


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Chat endpoint with RAG: embed query, retrieve chunks, generate answer.
    Reuses existing Qdrant vectors (does not re-embed documents).
    Public endpoint - filters by tenant_id.
    """
    try:
        tenant_id = request.tenant_id or get_default_tenant_id()
        
        # 1. Embed the user query (same as /search)
        query_embedding = await get_embedding(request.message)
        
        # 2. Retrieve top_k chunks from Qdrant with tenant filter
        qdrant = get_qdrant_client()
        search_results = qdrant.search(
            collection_name=COLLECTION_NAME,
            query_vector=query_embedding,
            query_filter=Filter(
                must=[
                    FieldCondition(
                        key="tenant_id",
                        match=MatchValue(value=tenant_id)
                    )
                ]
            ),
            limit=request.top_k
        )
        
        # 3. Fetch chunk contents from Postgres and build citations (also filter by tenant_id)
        engine = get_engine()
        citations = []
        contexts = []
        
        async with engine.connect() as conn:
            for hit in search_results:
                chunk_id = str(hit.id)
                
                # Fetch chunk content from Postgres with tenant filter
                result = await conn.execute(
                    text("""
                        SELECT c.id, c.document_id, c.chunk_index, c.content,
                               d.source, d.title
                        FROM chunks c
                        JOIN documents d ON c.document_id = d.id
                        WHERE c.id = :chunk_id AND c.tenant_id = :tenant_id
                    """),
                    {"chunk_id": chunk_id, "tenant_id": tenant_id}
                )
                row = result.fetchone()
                
                if row:
                    citation = Citation(
                        chunk_id=str(row[0]),
                        document_id=str(row[1]),
                        source=row[4],
                        title=row[5],
                        chunk_index=row[2],
                        content=row[3],
                        score=hit.score
                    )
                    citations.append(citation)
                    contexts.append(row[3])  # Add content to contexts for answer generation
        
        # 4. Generate answer from contexts using lightweight chat model
        if not contexts:
            answer = "I don't have enough information to answer that."
        else:
            answer = await generate_answer(
                message=request.message,
                contexts=contexts
            )
        
        return ChatResponse(
            message=request.message,
            answer=answer,
            citations=citations
        )
    except ValueError as e:
        # OPENAI_API_KEY missing or other configuration error
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate chat response: {str(e)}"
        )
