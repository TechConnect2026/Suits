"""Cache service - Two-tier caching with Redis and in-memory fallback.

Implements the documented cache strategy:
Request → In-Memory / Redis → PostgreSQL → External API → Store both
"""

import json
import time
from typing import Any

import structlog
import redis.asyncio as redis

from app.core.config import settings

logger = structlog.get_logger()


class CacheService:
    """Two-tier cache: In-Memory / Redis (fast) + PostgreSQL (persistent)."""

    def __init__(self) -> None:
        self._redis: redis.Redis | None = None
        self._memory_cache: dict[str, tuple[float | None, Any]] = {}

    def _prune_memory_cache(self) -> None:
        """Keep in-memory cache bounded under 2000 items to prevent unbounded memory growth."""
        max_entries = 2000
        if len(self._memory_cache) > max_entries:
            now = time.time()
            expired = [k for k, (exp, _) in self._memory_cache.items() if exp is not None and now >= exp]
            for k in expired:
                self._memory_cache.pop(k, None)
            if len(self._memory_cache) > max_entries:
                for k in list(self._memory_cache.keys())[:500]:
                    self._memory_cache.pop(k, None)

    async def _get_redis(self) -> redis.Redis | None:
        """Get Redis connection, returning None if unavailable (graceful degradation)."""
        if self._redis is None:
            try:
                self._redis = redis.from_url(
                    settings.redis_url,
                    decode_responses=True,
                    socket_connect_timeout=1,
                )
                await self._redis.ping()
            except Exception as exc:
                logger.debug("redis_connection_unavailable_using_memory", error=str(exc))
                self._redis = None
        return self._redis

    async def get(self, key: str) -> Any | None:
        """Get a value from cache (checking Redis and in-memory fallback)."""
        # 1. Check in-memory fast cache first
        if key in self._memory_cache:
            expiry, val = self._memory_cache[key]
            if expiry is None or time.time() < expiry:
                logger.debug("memory_cache_hit", key=key)
                return val
            else:
                del self._memory_cache[key]

        # 2. Check Redis if available
        r = await self._get_redis()
        if r is not None:
            try:
                value = await r.get(key)
                if value:
                    logger.debug("redis_cache_hit", key=key)
                    parsed = json.loads(value)
                    self._memory_cache[key] = (time.time() + 3600, parsed)
                    self._prune_memory_cache()
                    return parsed
            except Exception as exc:
                logger.debug("redis_cache_get_error", key=key, error=str(exc))

        return None

    async def set(
        self,
        key: str,
        value: Any,
        ttl_seconds: int | None = None,
        ttl: int | None = None,
    ) -> None:
        """Set a value in cache (both in-memory and Redis). Accepts either ttl_seconds or ttl."""
        effective_ttl = ttl_seconds if ttl_seconds is not None else ttl
        # 1. Save to in-memory cache
        expiry = time.time() + effective_ttl if effective_ttl else None
        self._memory_cache[key] = (expiry, value)
        self._prune_memory_cache()

        # 2. Save to Redis if available
        r = await self._get_redis()
        if r is not None:
            try:
                serialized = json.dumps(value, default=str)
                if effective_ttl:
                    await r.setex(key, effective_ttl, serialized)
                else:
                    await r.set(key, serialized)
                logger.debug("cache_set", key=key, ttl=effective_ttl)
            except Exception as exc:
                logger.debug("cache_set_error", key=key, error=str(exc))

    async def delete(self, key: str) -> None:
        """Delete a value from cache."""
        self._memory_cache.pop(key, None)
        r = await self._get_redis()
        if r is not None:
            try:
                await r.delete(key)
                logger.debug("cache_delete", key=key)
            except Exception as exc:
                logger.debug("cache_delete_error", key=key, error=str(exc))

    async def delete_pattern(self, pattern: str) -> None:
        """Delete all keys matching a pattern."""
        import re
        regex = re.compile(pattern.replace("*", ".*"))
        keys_to_del = [k for k in self._memory_cache if regex.match(k)]
        for k in keys_to_del:
            self._memory_cache.pop(k, None)

        r = await self._get_redis()
        if r is not None:
            try:
                keys = []
                async for key in r.scan_iter(match=pattern):
                    keys.append(key)
                if keys:
                    await r.delete(*keys)
                    logger.debug("cache_delete_pattern", pattern=pattern, count=len(keys))
            except Exception as exc:
                logger.debug("cache_delete_pattern_error", error=str(exc))

    async def revoke_token(self, jti: str, ttl_seconds: int = 86400) -> None:
        """Add a token JTI (or identifier) to the revocation blocklist."""
        await self.set(f"token_blocklist:{jti}", "revoked", ttl_seconds=ttl_seconds)

    async def is_token_revoked(self, jti: str) -> bool:
        """Check if a token JTI is in the revocation blocklist."""
        val = await self.get(f"token_blocklist:{jti}")
        return val is not None

    async def record_auth_failure(self, identifier: str, window_seconds: int = 900) -> int:
        """Record a failed auth attempt and return the count within the rolling window."""
        key = f"auth_fail:{identifier}"
        r = await self._get_redis()
        if r is not None:
            try:
                cnt = await r.incr(key)
                if cnt == 1:
                    await r.expire(key, window_seconds)
                return cnt
            except Exception as exc:
                logger.debug("redis_record_auth_fail_error", error=str(exc))

        # In-memory fallback
        exp, current_cnt = self._memory_cache.get(key, (None, 0))
        now = time.time()
        if exp is None or now >= exp:
            new_cnt = 1
            self._memory_cache[key] = (now + window_seconds, new_cnt)
        else:
            new_cnt = current_cnt + 1
            self._memory_cache[key] = (exp, new_cnt)
        return new_cnt

    async def get_auth_failures(self, identifier: str) -> int:
        """Get the current count of failed auth attempts."""
        key = f"auth_fail:{identifier}"
        r = await self._get_redis()
        if r is not None:
            try:
                val = await r.get(key)
                return int(val) if val else 0
            except Exception:
                pass
        exp, current_cnt = self._memory_cache.get(key, (None, 0))
        if exp is not None and time.time() < exp:
            return int(current_cnt)
        return 0

    async def reset_auth_failures(self, identifier: str) -> None:
        """Reset failed auth attempts upon successful authentication."""
        await self.delete(f"auth_fail:{identifier}")

    async def close(self) -> None:
        if self._redis:
            await self._redis.aclose()


# Singleton
cache_service = CacheService()
