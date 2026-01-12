"""
API key authentication for protected endpoints.
"""
import os
from fastapi import Header, HTTPException, status

API_KEY = os.getenv("API_KEY", "")
DEFAULT_TENANT_ID = os.getenv("DEFAULT_TENANT_ID", "demo")


def verify_api_key(x_api_key: str = Header(..., alias="X-API-Key")):
    """
    Dependency to verify API key for protected endpoints.
    
    Args:
        x_api_key: API key from X-API-Key header
        
    Raises:
        HTTPException: 401 if API key is missing or invalid
    """
    if not API_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="API_KEY not configured on server"
        )
    
    if x_api_key != API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key"
        )
    
    return x_api_key


def get_default_tenant_id() -> str:
    """Get the default tenant ID from environment."""
    return DEFAULT_TENANT_ID
