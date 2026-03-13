from fastapi import Request
from slowapi import Limiter


def _real_ip(request: Request) -> str:
    """
    Use the direct TCP connection IP, never the X-Forwarded-For header.
    This prevents attackers from bypassing rate limits by spoofing the header.
    On Render/Railway behind a trusted reverse proxy, set TRUSTED_PROXY=true
    and the middleware will already have populated request.client.host correctly.
    """
    return request.client.host if request.client else "unknown"


limiter = Limiter(key_func=_real_ip)
