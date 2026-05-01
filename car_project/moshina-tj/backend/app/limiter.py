from fastapi import Request
from slowapi import Limiter
from app.config import settings


def _real_ip(request: Request) -> str:
    """
    Extract the real client IP.
    
    If settings.trusted_proxy is True, it attempts to extract the IP from
    the X-Forwarded-For header, which is typically set by load balancers
    (like Render, Cloudflare, Nginx).
    
    Otherwise, it uses the direct TCP connection IP (request.client.host).
    """
    if settings.trusted_proxy:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            # X-Forwarded-For: client, proxy1, proxy2...
            # The first one is the original client IP.
            return forwarded.split(",")[0].strip()
            
    return request.client.host if request.client else "unknown"


limiter = Limiter(key_func=_real_ip)
