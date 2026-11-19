"""Rate limiting middleware with distributed Redis sliding-window and local fallback."""

import time
import uuid
from collections import defaultdict

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.core.config import settings
from app.services.cache_service import cache_service


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Distributed sliding-window rate limiter with graceful in-memory fallback."""

    def __init__(self, app, max_requests: int | None = None, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests or settings.rate_limit_per_minute
        self.window = window_seconds
        self._requests: dict[str, list[float]] = defaultdict(list)
        self._last_cleanup = time.monotonic()

    def _extract_client_ip(self, request: Request) -> str:
        """Extract the real client IP address behind reverse proxies."""
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip.strip()
        return request.client.host if request.client else "unknown"

    def _prune_stale_ips(self, now: float) -> None:
        """Periodically clean empty IP buckets to prevent unbounded memory growth."""
        if now - self._last_cleanup > 300:
            stale = [
                ip
                for ip, timestamps in self._requests.items()
                if not timestamps or (now - timestamps[-1] >= self.window)
            ]
            for ip in stale:
                self._requests.pop(ip, None)
            self._last_cleanup = now

    async def _check_rate_limit(self, client_ip: str, effective_limit: int) -> bool:
        """Return True if allowed, False if rate limited."""
        # 1. Attempt Redis sliding-window check
        r = await cache_service._get_redis()
        if r is not None:
            try:
                now_epoch = time.time()
                key = f"rl:{client_ip}"
                clear_before = now_epoch - self.window
                member_id = f"{now_epoch}:{uuid.uuid4().hex[:8]}"

                pipe = r.pipeline()
                pipe.zremrangebyscore(key, 0, clear_before)
                pipe.zcard(key)
                results = await pipe.execute()

                current_count = results[1]
                if current_count >= effective_limit:
                    return False

                # Under limit -> record attempt and set expiry
                add_pipe = r.pipeline()
                add_pipe.zadd(key, {member_id: now_epoch})
                add_pipe.expire(key, self.window + 5)
                await add_pipe.execute()
                return True
            except Exception:
                # If Redis operation fails, fall through to in-memory check
                pass

        # 2. Local in-memory sliding-window fallback
        now = time.monotonic()
        valid_timestamps = [t for t in self._requests[client_ip] if now - t < self.window]
        if len(valid_timestamps) >= effective_limit:
            return False

        valid_timestamps.append(now)
        self._requests[client_ip] = valid_timestamps
        self._prune_stale_ips(now)
        return True

    async def dispatch(self, request: Request, call_next):
        # Always bypass rate limiting for CORS preflight (OPTIONS) and health check
        if request.method == "OPTIONS" or request.url.path.startswith("/api/health"):
            return await call_next(request)

        # In development mode, provide generous headroom for single-user dev
        effective_limit = (
            max(self.max_requests, 600)
            if settings.environment == "development"
            else self.max_requests
        )

        client_ip = self._extract_client_ip(request)
        allowed = await self._check_rate_limit(client_ip, effective_limit)

        if not allowed:
            return JSONResponse(
                status_code=429,
                content={
                    "success": False,
                    "message": "Too many requests. Please try again later.",
                    "error_code": "RATE_LIMITED",
                },
                headers={"Retry-After": str(self.window)},
            )

        return await call_next(request)
