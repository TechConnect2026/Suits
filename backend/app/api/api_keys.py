"""User API Keys (BYOK) Management API.

Allows authenticated users to configure personal API keys for:
- Google Gemini (Google AI Studio)
- OpenAI (ChatGPT / GPT-4o)
- Claude (Anthropic)
- OpenRouter
- Groq Cloud

Security:
- All keys are encrypted at rest with AES-256-GCM using authenticated associated data (AAD).
- Plaintext keys are NEVER returned in GET responses (only safe masked hints like `sk-ant...8f2b`).
- Instant live testing verifies keys before saving.
"""

import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.dependencies.auth import CurrentUser
from app.schemas.api_key import (
    AddApiKeyRequest,
    ApiKeyResponse,
    TestApiKeyRequest,
    TestApiKeyResponse,
)
from app.services.byok_service import byok_service

router = APIRouter(prefix="/user/api-keys", tags=["User API Keys (BYOK)"])


@router.get("", response_model=List[ApiKeyResponse])
async def list_user_api_keys(
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """List all configured API keys for the authenticated user (masked preview only)."""
    keys = await byok_service.get_user_keys(user.id, db)
    return [ApiKeyResponse.model_validate(k) for k in keys]


@router.post("", response_model=ApiKeyResponse, status_code=status.HTTP_201_CREATED)
async def add_or_update_api_key(
    request: AddApiKeyRequest,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Encrypt and store an API key for the authenticated user.
    
    The key is encrypted using AES-256-GCM. The plaintext key is NEVER stored.
    """
    try:
        saved = await byok_service.add_or_update_key(
            user_id=user.id,
            provider=request.provider.value,
            api_key=request.api_key,
            model_preference=request.model_preference,
            set_active=request.set_active,
            db=db,
        )
        return ApiKeyResponse.model_validate(saved)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to save API key: {str(exc)}",
        )


@router.post("/test", response_model=TestApiKeyResponse)
async def test_api_key(
    request: TestApiKeyRequest,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Test connection and authentication for an API key in real time."""
    success, message, latency_ms, model_name = await byok_service.test_key(
        user_id=user.id,
        provider=request.provider.value,
        api_key=request.api_key,
        key_id=request.key_id,
        model=request.model,
        db=db,
    )
    return TestApiKeyResponse(
        success=success,
        message=message,
        provider=request.provider.value,
        latency_ms=latency_ms,
        model=model_name,
    )


@router.patch("/{key_id}/activate", response_model=ApiKeyResponse)
async def activate_api_key(
    key_id: uuid.UUID,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Set the specified key as the active AI provider."""
    try:
        updated = await byok_service.activate_key(user.id, key_id, db)
        return ApiKeyResponse.model_validate(updated)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.patch("/deactivate-all")
async def deactivate_all_keys(
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Switch user back to Platform Default AI."""
    await byok_service.deactivate_all(user.id, db)
    return {"success": True, "message": "All BYOK keys deactivated. Platform AI is now active."}


@router.delete("/{key_id}")
async def delete_api_key(
    key_id: uuid.UUID,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Delete a saved API key."""
    deleted = await byok_service.delete_key(user.id, key_id, db)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="API key not found.")
    return {"success": True, "message": "API key deleted successfully."}
