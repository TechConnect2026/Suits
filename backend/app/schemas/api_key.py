"""Pydantic schemas for User API Key management (BYOK)."""

from datetime import datetime
import uuid
from typing import Optional
from pydantic import BaseModel, Field

from app.models.user_api_key import AIProviderName


class AddApiKeyRequest(BaseModel):
    provider: AIProviderName = Field(..., description="Provider name: gemini, openai, claude, openrouter, groq")
    api_key: str = Field(..., min_length=8, max_length=512, description="Plaintext API key from provider console")
    model_preference: Optional[str] = Field(None, max_length=100, description="Optional default model to use")
    set_active: bool = Field(True, description="Whether to make this the active AI provider immediately")


class TestApiKeyRequest(BaseModel):
    provider: AIProviderName = Field(..., description="Provider to test")
    api_key: Optional[str] = Field(None, description="Plaintext key to test before saving")
    key_id: Optional[uuid.UUID] = Field(None, description="Saved key ID to test")
    model: Optional[str] = Field(None, description="Specific model to test")


class ApiKeyResponse(BaseModel):
    id: uuid.UUID
    provider: str
    key_hint: str
    is_active: bool
    model_preference: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TestApiKeyResponse(BaseModel):
    success: bool
    message: str
    provider: str
    latency_ms: Optional[int] = None
    model: Optional[str] = None
