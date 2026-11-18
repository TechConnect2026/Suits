"""AI Provider & BYOK Context Middleware.

Reads the `X-AI-Provider` header and authenticated user JWT to bind active providers to
thread/task-safe ContextVars. This allows all backend AI services across SUITS
(Headnote, Prediction, Chatbot, Counter-Pleading, Document Extraction, Era Transition)
to automatically route through the user's personal BYOK key (Gemini, OpenAI, Claude,
OpenRouter, Groq) or Local Ollama without changing route signatures.
"""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING
from contextvars import ContextVar
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

if TYPE_CHECKING:
    from app.clients.byok_provider import BYOKProvider

# ContextVar for active AI mode: "cloud" | "ollama"
active_ai_provider: ContextVar[str] = ContextVar("active_ai_provider", default="cloud")

# ContextVar for active user BYOK provider instance (Gemini, OpenAI, Claude, OpenRouter, Groq)
active_byok_provider: ContextVar[Any] = ContextVar("active_byok_provider", default=None)

# ContextVar for active authenticated user ID (persists across downstream async calls)
active_user_id: ContextVar[uuid.UUID | None] = ContextVar("active_user_id", default=None)


def get_active_ai_provider() -> str:
    """Return the active AI provider mode ("cloud" or "ollama")."""
    return active_ai_provider.get()


def is_local_ai_active() -> bool:
    """Return True if Local Ollama is requested for the current request."""
    return active_ai_provider.get() == "ollama"


def get_active_byok_provider() -> Any:
    """Return the active user BYOK provider instance if configured, else None."""
    return active_byok_provider.get()


def get_active_user_id() -> uuid.UUID | None:
    """Return the active authenticated user ID from context if available."""
    return active_user_id.get()


class AIProviderMiddleware(BaseHTTPMiddleware):
    """Inspects X-AI-Provider header and authenticated user BYOK configuration."""

    async def dispatch(self, request: Request, call_next) -> Response:
        header_val = request.headers.get("x-ai-provider", "").lower().strip()
        provider_mode = "ollama" if header_val in ("ollama", "local") else "cloud"

        mode_token = active_ai_provider.set(provider_mode)
        byok_instance = None
        user_uuid: uuid.UUID | None = None

        # Check for user BYOK provider if in cloud mode
        if provider_mode != "ollama":
            auth_header = request.headers.get("authorization", "")
            if auth_header.startswith("Bearer "):
                raw_jwt = auth_header[7:].strip()
                try:
                    from app.core.security import decode_access_token
                    payload = decode_access_token(raw_jwt)
                    if payload and payload.get("sub"):
                        user_uuid = uuid.UUID(payload["sub"])
                        from app.database.session import async_session_factory
                        from app.services.byok_service import byok_service
                        async with async_session_factory() as db:
                            byok_instance = await byok_service.get_active_provider(user_uuid, db)
                except Exception:
                    pass

        byok_token = active_byok_provider.set(byok_instance)
        user_id_token = active_user_id.set(user_uuid)

        try:
            response = await call_next(request)
            response.headers["X-AI-Provider"] = provider_mode
            if byok_instance:
                response.headers["X-BYOK-Provider"] = byok_instance.provider

            # For StreamingResponse, wrap the body_iterator so ContextVars survive the entire stream!
            from starlette.responses import StreamingResponse
            if isinstance(response, StreamingResponse):
                original_iterator = response.body_iterator

                async def wrapped_stream():
                    try:
                        async for chunk in original_iterator:
                            yield chunk
                    finally:
                        active_ai_provider.reset(mode_token)
                        active_byok_provider.reset(byok_token)
                        active_user_id.reset(user_id_token)

                response.body_iterator = wrapped_stream()
                return response

            return response
        except Exception:
            active_ai_provider.reset(mode_token)
            active_byok_provider.reset(byok_token)
            active_user_id.reset(user_id_token)
            raise
        else:
            active_ai_provider.reset(mode_token)
            active_byok_provider.reset(byok_token)
            active_user_id.reset(user_id_token)
