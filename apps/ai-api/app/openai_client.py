"""
OpenAI client for generating embeddings.
"""
import os
import time
import logging
from typing import List, Optional
from openai import OpenAI

logger = logging.getLogger(__name__)

_openai_client: OpenAI | None = None
_embedding_model: str = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")


def get_openai_client() -> OpenAI:
    """Get or create the OpenAI client."""
    global _openai_client
    if _openai_client is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable is not set")
        _openai_client = OpenAI(api_key=api_key)
    return _openai_client


def get_embedding_model() -> str:
    """Get the embedding model name."""
    return _embedding_model


async def get_embeddings(texts: List[str], tenant_id: Optional[str] = None, request_id: Optional[str] = None) -> List[List[float]]:
    """
    Generate embeddings for a list of texts.
    
    Args:
        texts: List of text strings to embed
        tenant_id: Tenant ID for logging (optional)
        request_id: Request ID for logging (optional)
        
    Returns:
        List of embedding vectors (each is a list of floats)
        
    Raises:
        ValueError: If OPENAI_API_KEY is not set
    """
    client = get_openai_client()
    start_time = time.time()
    success = False
    error_type = None
    
    try:
        # Use async-compatible approach (OpenAI SDK v1+)
        # Note: OpenAI Python SDK doesn't have native async, but we can use it in async context
        response = client.embeddings.create(
            model=_embedding_model,
            input=texts
        )
        
        embeddings = [item.embedding for item in response.data]
        success = True
        return embeddings
    except Exception as e:
        error_type = type(e).__name__
        raise
    finally:
        duration_ms = int((time.time() - start_time) * 1000)
        logger.info(
            "openai_embedding",
            extra={
                "event": "openai_embedding",
                "tenant_id": tenant_id or "unknown",
                "model": _embedding_model,
                "duration_ms": duration_ms,
                "success": success,
                "error_type": error_type,
                "request_id": request_id,
                "text_count": len(texts)
            }
        )


async def get_embedding(text: str, tenant_id: Optional[str] = None, request_id: Optional[str] = None) -> List[float]:
    """
    Generate a single embedding for a text.
    
    Args:
        text: Text string to embed
        tenant_id: Tenant ID for logging (optional)
        request_id: Request ID for logging (optional)
        
    Returns:
        Embedding vector (list of floats)
    """
    embeddings = await get_embeddings([text], tenant_id=tenant_id, request_id=request_id)
    return embeddings[0]
