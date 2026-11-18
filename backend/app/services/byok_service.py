"""BYOK (Bring Your Own Key) Service.

Manages encrypted user AI API keys, provides live connection testing,
and delivers decrypted in-memory BYOKProvider instances for active request contexts.
"""

from __future__ import annotations

import json
import uuid
from typing import Any
import structlog
from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.clients.byok_provider import BYOKProvider
from app.models.user_api_key import UserApiKey, AIProviderName
from app.services.cache_service import cache_service
from app.services.encryption_service import encryption_service

logger = structlog.get_logger()

_CACHE_TTL = 300  # 5 minutes cache for active decrypted provider metadata


class BYOKService:
    """Orchestrates secure storage, retrieval, and execution for user-provided AI keys."""

    async def get_user_keys(self, user_id: uuid.UUID, db: AsyncSession) -> list[UserApiKey]:
        """Fetch all configured keys for the user (masked previews only)."""
        stmt = (
            select(UserApiKey)
            .where(UserApiKey.user_id == user_id)
            .order_by(UserApiKey.created_at.desc())
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def get_active_provider(self, user_id: uuid.UUID, db: AsyncSession) -> BYOKProvider | None:
        """Retrieve and decrypt the active BYOK provider for this user.
        
        Cached in Redis for high-throughput zero-DB overhead on active requests.
        Decryption is strictly in-memory during inference.
        """
        cache_key = f"byok:active:{user_id}"
        cached = await cache_service.get(cache_key)
        if isinstance(cached, dict):
            if not cached.get("has_byok"):
                return None
            try:
                decrypted_key = encryption_service.decrypt_key(cached["encrypted_key"], user_id)
                return BYOKProvider(
                    provider=cached["provider"],
                    api_key=decrypted_key,
                    model_preference=cached.get("model"),
                )
            except Exception:
                pass

        stmt = (
            select(UserApiKey)
            .where(UserApiKey.user_id == user_id, UserApiKey.is_active == True)  # noqa: E712
            .limit(1)
        )
        result = await db.execute(stmt)
        active_key = result.scalar_one_or_none()

        if not active_key:
            # Cache negative result for 60 seconds
            await cache_service.set(cache_key, {"has_byok": False}, ttl_seconds=60)
            return None

        # Cache positive metadata (with encrypted string) for fast subsequent hits
        await cache_service.set(
            cache_key,
            {
                "has_byok": True,
                "provider": active_key.provider,
                "encrypted_key": active_key.encrypted_key,
                "model": active_key.model_preference,
            },
            ttl_seconds=_CACHE_TTL,
        )

        try:
            decrypted_key = encryption_service.decrypt_key(active_key.encrypted_key, user_id)
            return BYOKProvider(
                provider=active_key.provider,
                api_key=decrypted_key,
                model_preference=active_key.model_preference,
            )
        except Exception as exc:
            logger.error("byok_decryption_failed", user_id=str(user_id), error=str(exc))
            return None

    async def add_or_update_key(
        self,
        user_id: uuid.UUID,
        provider: str,
        api_key: str,
        model_preference: str | None,
        set_active: bool,
        db: AsyncSession,
    ) -> UserApiKey:
        """Encrypt and store an API key for the user."""
        clean_provider = provider.lower().strip()
        clean_key = api_key.strip()

        # Encrypt with AES-256-GCM
        encrypted_str = encryption_service.encrypt_key(clean_key, user_id)
        hint = encryption_service.mask_key(clean_key)

        # If setting active, deactivate existing keys first
        if set_active:
            await db.execute(
                update(UserApiKey)
                .where(UserApiKey.user_id == user_id)
                .values(is_active=False)
            )

        # Check if a key for this provider already exists for user
        stmt = select(UserApiKey).where(
            UserApiKey.user_id == user_id,
            UserApiKey.provider == clean_provider,
        )
        existing = (await db.execute(stmt)).scalar_one_or_none()

        if existing:
            existing.encrypted_key = encrypted_str
            existing.key_hint = hint
            existing.is_active = set_active
            if model_preference:
                existing.model_preference = model_preference.strip()
            record = existing
        else:
            record = UserApiKey(
                user_id=user_id,
                provider=clean_provider,
                encrypted_key=encrypted_str,
                key_hint=hint,
                is_active=set_active,
                model_preference=model_preference.strip() if model_preference else None,
            )
            db.add(record)

        await db.commit()
        await db.refresh(record)

        # Invalidate active cache
        await cache_service.delete(f"byok:active:{user_id}")
        logger.info("byok_key_saved", user_id=str(user_id), provider=clean_provider, is_active=set_active)
        return record

    async def test_key(
        self,
        user_id: uuid.UUID,
        provider: str,
        api_key: str | None = None,
        key_id: uuid.UUID | None = None,
        model: str | None = None,
        db: AsyncSession | None = None,
    ) -> tuple[bool, str, int, str]:
        """Test API key connection. Either with a fresh plaintext key or an existing saved key."""
        clean_provider = provider.lower().strip()
        plain_key = api_key

        if not plain_key and key_id and db:
            stmt = select(UserApiKey).where(UserApiKey.id == key_id, UserApiKey.user_id == user_id)
            saved = (await db.execute(stmt)).scalar_one_or_none()
            if not saved:
                return False, "Saved key not found.", 0, model or ""
            plain_key = encryption_service.decrypt_key(saved.encrypted_key, user_id)
            if not model:
                model = saved.model_preference

        if not plain_key:
            return False, "No API key provided to test.", 0, model or ""

        client = BYOKProvider(clean_provider, plain_key, model)
        return await client.test_connection()

    async def activate_key(
        self,
        user_id: uuid.UUID,
        key_id: uuid.UUID,
        db: AsyncSession,
    ) -> UserApiKey:
        """Set a specific key as the active AI provider."""
        # Deactivate all
        await db.execute(
            update(UserApiKey)
            .where(UserApiKey.user_id == user_id)
            .values(is_active=False)
        )

        # Activate target key
        stmt = select(UserApiKey).where(UserApiKey.id == key_id, UserApiKey.user_id == user_id)
        target = (await db.execute(stmt)).scalar_one_or_none()
        if not target:
            raise ValueError("API key not found.")

        target.is_active = True
        await db.commit()
        await db.refresh(target)

        await cache_service.delete(f"byok:active:{user_id}")
        logger.info("byok_key_activated", user_id=str(user_id), provider=target.provider)
        return target

    async def deactivate_all(self, user_id: uuid.UUID, db: AsyncSession) -> None:
        """Switch user back to Platform Default AI."""
        await db.execute(
            update(UserApiKey)
            .where(UserApiKey.user_id == user_id)
            .values(is_active=False)
        )
        await db.commit()
        await cache_service.delete(f"byok:active:{user_id}")
        logger.info("byok_all_deactivated", user_id=str(user_id))

    async def delete_key(self, user_id: uuid.UUID, key_id: uuid.UUID, db: AsyncSession) -> bool:
        """Delete an API key."""
        stmt = delete(UserApiKey).where(UserApiKey.id == key_id, UserApiKey.user_id == user_id)
        res = await db.execute(stmt)
        await db.commit()
        await cache_service.delete(f"byok:active:{user_id}")
        logger.info("byok_key_deleted", user_id=str(user_id), key_id=str(key_id))
        return res.rowcount > 0


byok_service = BYOKService()
