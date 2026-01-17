import os
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, Filter, FieldCondition, MatchValue

_qdrant_url = os.getenv("QDRANT_URL", "")
_client: QdrantClient | None = None
COLLECTION_NAME = "restaurant_knowledge"


def get_qdrant_client() -> QdrantClient:
    """Get or create the Qdrant client."""
    global _client
    if _client is None:
        if not _qdrant_url:
            raise ValueError("QDRANT_URL environment variable is not set")
        _client = QdrantClient(url=_qdrant_url)
    return _client


def check_qdrant() -> tuple[bool, str]:
    """
    Check Qdrant connectivity.
    Returns (is_healthy, error_message)
    """
    try:
        client = get_qdrant_client()
        # Try to get collections list as a health check
        client.get_collections()
        return True, ""
    except Exception as e:
        return False, str(e)


async def ensure_collection_exists(vector_size: int):
    """
    Ensure the Qdrant collection exists with the correct configuration.
    Creates it if it doesn't exist.
    
    Args:
        vector_size: Size of the embedding vectors
    """
    client = get_qdrant_client()
    
    # Check if collection exists
    collections = client.get_collections()
    collection_names = [col.name for col in collections.collections]
    
    if COLLECTION_NAME not in collection_names:
        # Create collection
        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(
                size=vector_size,
                distance=Distance.COSINE
            )
        )


def delete_points_by_tenant(tenant_id: str) -> int:
    """
    Delete all Qdrant points for a specific tenant.
    
    Args:
        tenant_id: Tenant ID to delete points for
        
    Returns:
        Number of points deleted, or -1 if count not available
    """
    client = get_qdrant_client()
    
    # Create filter for tenant_id
    tenant_filter = Filter(
        must=[
            FieldCondition(
                key="tenant_id",
                match=MatchValue(value=tenant_id)
            )
        ]
    )
    
    # Delete points matching the filter
    # Note: Qdrant delete doesn't return count directly, so we'll return -1
    # and note this in the response
    try:
        client.delete(
            collection_name=COLLECTION_NAME,
            points_selector=tenant_filter
        )
        # Qdrant doesn't return deleted count, so return -1
        return -1
    except Exception as e:
        # If deletion fails, raise the error
        raise ValueError(f"Failed to delete Qdrant points for tenant {tenant_id}: {str(e)}")
