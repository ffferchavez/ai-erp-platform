"""
Ingestion logic: chunking, embedding, and storing documents.
"""
import os
import uuid
from typing import List, Tuple
from sqlalchemy import text
from app.database import get_engine
from app.qdrant_client import get_qdrant_client, ensure_collection_exists
from app.openai_client import get_embeddings
from app.auth import get_default_tenant_id

# Environment defaults
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "800"))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "120"))


def chunk_text(content: str, chunk_size: int = None, overlap: int = None) -> List[str]:
    """
    Split text into chunks with overlap.
    
    Args:
        content: Text content to chunk
        chunk_size: Maximum characters per chunk (defaults to CHUNK_SIZE env var)
        overlap: Number of characters to overlap between chunks (defaults to CHUNK_OVERLAP env var)
        
    Returns:
        List of chunk strings (deterministic)
    """
    chunk_size = chunk_size if chunk_size is not None else CHUNK_SIZE
    overlap = overlap if overlap is not None else CHUNK_OVERLAP
    
    if len(content) <= chunk_size:
        return [content]
    
    chunks = []
    start = 0
    
    while start < len(content):
        end = start + chunk_size
        chunk = content[start:end]
        chunks.append(chunk)
        
        # Move start position forward by chunk_size - overlap
        start += chunk_size - overlap
        
        # If we've reached the end, break
        if end >= len(content):
            break
    
    return chunks


async def ingest_document(
    source: str,
    title: str,
    content: str,
    tenant_id: str | None = None
) -> Tuple[str, int]:
    """
    Ingest a document: store in Postgres, chunk, embed, and store in Qdrant.
    
    Args:
        source: Document source (e.g., "policy", "menu", "manual")
        title: Document title
        content: Document content
        tenant_id: Tenant ID (defaults to DEFAULT_TENANT_ID)
        
    Returns:
        Tuple of (document_id, num_chunks)
        
    Raises:
        ValueError: If OPENAI_API_KEY is not set
    """
    engine = get_engine()
    qdrant = get_qdrant_client()
    
    # Use provided tenant_id or default
    if tenant_id is None:
        tenant_id = get_default_tenant_id()
    
    # Generate document ID
    document_id = str(uuid.uuid4())
    
    # Insert document into Postgres
    async with engine.begin() as conn:
        await conn.execute(
            text("""
                INSERT INTO documents (id, tenant_id, source, title, content)
                VALUES (:id, :tenant_id, :source, :title, :content)
            """),
            {
                "id": document_id,
                "tenant_id": tenant_id,
                "source": source,
                "title": title,
                "content": content
            }
        )
    
    # Chunk the content
    chunks = chunk_text(content)
    
    # Generate chunk IDs and prepare for Postgres insertion
    chunk_records = []
    for idx, chunk_content in enumerate(chunks):
        chunk_id = str(uuid.uuid4())
        chunk_records.append({
            "id": chunk_id,
            "document_id": document_id,
            "chunk_index": idx,
            "content": chunk_content
        })
    
    # Insert chunks into Postgres
    async with engine.begin() as conn:
        for record in chunk_records:
            await conn.execute(
                text("""
                    INSERT INTO chunks (id, document_id, tenant_id, chunk_index, content)
                    VALUES (:id, :document_id, :tenant_id, :chunk_index, :content)
                """),
                {
                    **record,
                    "tenant_id": tenant_id
                }
            )
    
    # Generate embeddings for all chunks
    chunk_texts = [record["content"] for record in chunk_records]
    embeddings = await get_embeddings(chunk_texts)
    
    # Ensure Qdrant collection exists (get vector size from first embedding)
    vector_size = len(embeddings[0]) if embeddings else 1536  # fallback to default
    await ensure_collection_exists(vector_size)
    
    # Prepare Qdrant points
    points = []
    for i, record in enumerate(chunk_records):
        points.append({
            "id": record["id"],  # Use chunk UUID as Qdrant point ID
            "vector": embeddings[i],
            "payload": {
                "document_id": document_id,
                "chunk_id": record["id"],
                "tenant_id": tenant_id,
                "chunk_index": record["chunk_index"],
                "text": record["content"],
                "title": title,
                "source": source
            }
        })
    
    # Upsert into Qdrant
    qdrant.upsert(
        collection_name="restaurant_knowledge",
        points=points
    )
    
    return document_id, len(chunks)
