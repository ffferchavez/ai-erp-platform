"""
Request ID middleware for request tracking.
"""
import uuid
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware


class RequestIDMiddleware(BaseHTTPMiddleware):
    """
    Middleware to generate and attach request_id to each request.
    """
    
    async def dispatch(self, request: Request, call_next):
        # Generate request ID
        request_id = str(uuid.uuid4())
        
        # Attach to request state
        request.state.request_id = request_id
        
        # Continue with request
        response = await call_next(request)
        
        # Optionally add request_id to response headers
        response.headers["X-Request-ID"] = request_id
        
        return response
