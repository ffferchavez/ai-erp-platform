import os
from qdrant_client import QdrantClient

_qdrant_url = os.getenv("QDRANT_URL", "")
_client: QdrantClient | None = None


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
