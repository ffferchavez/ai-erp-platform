"""
Admin IP allowlist middleware.
"""
import os
import ipaddress
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

ADMIN_IP_ALLOWLIST = os.getenv("ADMIN_IP_ALLOWLIST", "")


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


def is_ip_allowed(ip: str, allowlist: str) -> bool:
    """
    Check if IP is in the allowlist (supports CIDR notation).
    
    Args:
        ip: Client IP address
        allowlist: Comma-separated list of IPs/CIDRs
        
    Returns:
        True if IP is allowed, False otherwise
    """
    if not allowlist:
        # If allowlist is empty, allow all (backward compatible)
        return True
    
    try:
        client_ip = ipaddress.ip_address(ip)
    except ValueError:
        # Invalid IP format
        return False
    
    # Parse allowlist
    allowed_ranges = []
    for entry in allowlist.split(","):
        entry = entry.strip()
        if not entry:
            continue
        
        try:
            # Try as CIDR
            if "/" in entry:
                allowed_ranges.append(ipaddress.ip_network(entry, strict=False))
            else:
                # Single IP
                allowed_ranges.append(ipaddress.ip_network(f"{entry}/32", strict=False))
        except ValueError:
            # Invalid entry, skip
            continue
    
    # Check if client IP matches any allowed range
    for allowed_range in allowed_ranges:
        if client_ip in allowed_range:
            return True
    
    return False


class AdminIPAllowlistMiddleware(BaseHTTPMiddleware):
    """
    Middleware to restrict admin endpoints to allowed IPs.
    Applies to /admin/* endpoints only.
    """
    
    async def dispatch(self, request: Request, call_next):
        # Only apply to admin endpoints
        if request.url.path.startswith("/admin"):
            if ADMIN_IP_ALLOWLIST:
                ip = get_client_ip(request)
                
                if not is_ip_allowed(ip, ADMIN_IP_ALLOWLIST):
                    return JSONResponse(
                        status_code=status.HTTP_403_FORBIDDEN,
                        content={"detail": "Access denied. Your IP is not in the admin allowlist."}
                    )
        
        # Continue with request
        response = await call_next(request)
        return response
