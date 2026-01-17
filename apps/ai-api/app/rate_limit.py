"""
Lightweight in-memory rate limiter middleware.
No Redis, no external dependencies.
"""
import os
import time
from collections import defaultdict
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

# Rate limit configuration from environment
RATE_LIMIT_MAX = int(os.getenv("RATE_LIMIT_MAX", "60"))
RATE_LIMIT_WINDOW_SECONDS = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "600"))

# In-memory storage: {ip: [(timestamp, ...), ...]}
_request_times: dict[str, list[float]] = defaultdict(list)


def get_client_ip(request: Request) -> str:
    """
    Get client IP address, checking X-Forwarded-For first (for Traefik).
    
    Args:
        request: FastAPI request object
        
    Returns:
        Client IP address as string
    """
    # Check X-Forwarded-For header (set by Traefik)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # X-Forwarded-For can contain multiple IPs, take the first one
        return forwarded_for.split(",")[0].strip()
    
    # Fallback to direct client host
    return request.client.host if request.client else "unknown"


def is_rate_limited(ip: str) -> bool:
    """
    Check if IP has exceeded rate limit.
    
    Args:
        ip: Client IP address
        
    Returns:
        True if rate limited, False otherwise
    """
    now = time.time()
    window_start = now - RATE_LIMIT_WINDOW_SECONDS
    
    # Get request times for this IP
    times = _request_times[ip]
    
    # Remove old entries outside the window
    _request_times[ip] = [t for t in times if t > window_start]
    
    # Check if limit exceeded
    if len(_request_times[ip]) >= RATE_LIMIT_MAX:
        return True
    
    # Record this request
    _request_times[ip].append(now)
    
    return False


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Rate limiting middleware for public endpoints.
    Applies to /chat and /search only.
    """
    
    async def dispatch(self, request: Request, call_next):
        # Only apply to /chat and /search endpoints
        if request.url.path in ["/chat", "/search"]:
            ip = get_client_ip(request)
            
            if is_rate_limited(ip):
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={"detail": "Rate limit exceeded. Try again later."}
                )
        
        # Continue with request
        response = await call_next(request)
        return response
