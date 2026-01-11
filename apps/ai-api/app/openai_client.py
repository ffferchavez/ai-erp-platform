"""
OpenAI client for generating embeddings.
"""
import os
from typing import List
from openai import OpenAI

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


async def get_embeddings(texts: List[str]) -> List[List[float]]:
    """
    Generate embeddings for a list of texts.
    
    Args:
        texts: List of text strings to embed
        
    Returns:
        List of embedding vectors (each is a list of floats)
        
    Raises:
        ValueError: If OPENAI_API_KEY is not set
    """
    client = get_openai_client()
    
    # Use async-compatible approach (OpenAI SDK v1+)
    # Note: OpenAI Python SDK doesn't have native async, but we can use it in async context
    response = client.embeddings.create(
        model=_embedding_model,
        input=texts
    )
    
    return [item.embedding for item in response.data]


async def get_embedding(text: str) -> List[float]:
    """
    Generate a single embedding for a text.
    
    Args:
        text: Text string to embed
        
    Returns:
        Embedding vector (list of floats)
    """
    embeddings = await get_embeddings([text])
    return embeddings[0]
