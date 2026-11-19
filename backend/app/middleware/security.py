"""Security headers middleware for production hardening."""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.config import settings


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Enforce industry standard HTTP security headers on all responses."""

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)

        # Prevent MIME-sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"

        # Prevent clickjacking / iframe embedding
        response.headers["X-Frame-Options"] = "DENY"

        # Cross-Site Scripting protection for legacy browsers
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # Strict Referrer policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Restrict dangerous device APIs
        response.headers["Permissions-Policy"] = "camera=(), geolocation=(), payment=()"

        # Enforce HTTPS HSTS in production environments
        if settings.environment == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"

        return response
