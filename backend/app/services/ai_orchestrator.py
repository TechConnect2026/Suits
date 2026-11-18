"""AI Orchestrator — Dynamic Routing between User BYOK, Cloud AI, and Local Ollama.

Centralizes execution across all AI features in SUITS:
1. User BYOK Mode: If the authenticated user has configured their own personal API key
   (Gemini, OpenAI, Claude, OpenRouter, Groq), ALL requests route through their chosen key.
2. Platform Cloud Mode (Default): Uses OpenRouter free pool / Gemini rotation.
3. Offline / Local Mode: Uses Local Ollama with Qwen 7B (0 tokens, complete offline privacy).
4. Graceful Limit Detection: Intercepts rate limits (HTTP 429) or quota depletion and raises
   `OnlineAILimitReachedError` to trigger the frontend switch-to-Ollama modal.
"""

from __future__ import annotations

import asyncio
from typing import Any, AsyncGenerator

import structlog

from app.clients.gemini_client import gemini_client
from app.clients.ollama_client import ollama_client
from app.clients.openrouter_client import openrouter_client
from app.clients.prediction_gemini_client import prediction_gemini_client
from app.core.exceptions import OnlineAILimitReachedError
from app.middleware.ai_provider import is_local_ai_active, get_active_byok_provider, get_active_user_id

logger = structlog.get_logger()


class AIOrchestrator:
    """Dispatches AI inference requests based on the active provider context."""

    @staticmethod
    def is_local() -> bool:
        """Check if Local Ollama mode is requested for the current request context."""
        return is_local_ai_active()

    async def _get_byok(self, user_id: Any | None = None) -> Any:
        """Resolve active BYOK provider from ContextVar or user_id."""
        byok = get_active_byok_provider()
        if byok:
            return byok

        effective_uid = user_id or get_active_user_id()
        if effective_uid:
            try:
                import uuid
                u_uuid = effective_uid if isinstance(effective_uid, uuid.UUID) else uuid.UUID(str(effective_uid))
                from app.database.session import async_session_factory
                from app.services.byok_service import byok_service
                async with async_session_factory() as db:
                    resolved = await byok_service.get_active_provider(u_uuid, db)
                    if resolved:
                        logger.info("byok_resolved_from_user_id", user_id=str(effective_uid), provider=resolved.provider, model=resolved.model)
                        return resolved
            except Exception as exc:
                logger.warning("byok_user_id_lookup_failed", user_id=str(effective_uid), error=str(exc))
        return None

    async def generate_json(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.1,
        max_tokens: int | None = None,
        force_provider: str | None = None,
        user_id: Any | None = None,
    ) -> dict[str, Any]:
        """Generate structured JSON using either Ollama (local), User BYOK, or Platform Cloud."""
        use_local = (force_provider == "ollama") or (force_provider is None and self.is_local())

        if use_local:
            logger.info("ai_orchestrator_routing_to_local_ollama", task="generate_json")
            return await ollama_client.generate_json(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=temperature,
                max_tokens=max_tokens or 2048,
            )

        # Check for User BYOK Provider
        byok = await self._get_byok(user_id)
        if byok and force_provider is None:
            logger.info("ai_orchestrator_routing_to_user_byok", provider=byok.provider, model=byok.model, task="generate_json")
            # Strict BYOK mode: DO NOT fall back to platform providers when user has their own key active
            return await byok.generate_json(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                max_tokens=max_tokens or 4096,
                temperature=temperature,
            )

        if force_provider == "gemini":
            return await self.generate_json_gemini_first(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=temperature,
                max_tokens=max_tokens,
            )

        # Platform Cloud AI execution path: Gemini primary -> OpenRouter fallback
        logger.info("ai_orchestrator_routing_to_cloud", task="generate_json")
        try:
            gemini_raw, _ = await prediction_gemini_client.generate_prediction_json(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
            )
            if gemini_raw and isinstance(gemini_raw, dict):
                return gemini_raw
        except Exception as g_err:
            logger.warning("orchestrator_gemini_failed_trying_openrouter", error=str(g_err))

        try:
            raw = await openrouter_client.generate_json(system_prompt, user_prompt)
            if raw and isinstance(raw, dict):
                return raw
        except Exception as or_err:
            g_err_str = str(or_err).lower()
            logger.error("orchestrator_cloud_ai_failed", error=str(or_err))
            if "429" in g_err_str or "quota" in g_err_str or "rate limit" in g_err_str or "resource_exhausted" in g_err_str:
                raise OnlineAILimitReachedError() from or_err

        raise OnlineAILimitReachedError("Online AI services (Gemini & OpenRouter) unavailable or quota exhausted.")

    async def generate_json_gemini_first(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.1,
        max_tokens: int | None = None,
        force_provider: str | None = None,
        user_id: Any | None = None,
    ) -> dict[str, Any]:
        """Generate structured JSON routing User BYOK -> Gemini (gemini-3.5-flash) -> Groq fallback."""
        use_local = (force_provider == "ollama") or (force_provider is None and self.is_local())

        if use_local:
            logger.info("ai_orchestrator_routing_to_local_ollama", task="generate_json_gemini_first")
            return await ollama_client.generate_json(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=temperature,
                max_tokens=max_tokens or 2048,
            )

        # Check for User BYOK Provider
        byok = await self._get_byok(user_id)
        if byok and force_provider is None:
            logger.info("ai_orchestrator_routing_to_user_byok", provider=byok.provider, model=byok.model, task="generate_json_gemini_first")
            # Strict BYOK mode: DO NOT fall back to platform providers when user has their own key active
            return await byok.generate_json(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                max_tokens=max_tokens or 4096,
                temperature=temperature,
            )

        # Platform Cloud AI execution path: Gemini primary -> OpenRouter safety net
        logger.info("ai_orchestrator_routing_to_gemini_primary", task="generate_json_gemini_first")
        try:
            gemini_raw, _ = await prediction_gemini_client.generate_prediction_json(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
            )
            if gemini_raw and isinstance(gemini_raw, dict):
                return gemini_raw
        except Exception as g_err:
            g_err_str = str(g_err).lower()
            logger.error("orchestrator_gemini_first_failed", error=str(g_err))
            if "429" in g_err_str or "quota" in g_err_str or "rate limit" in g_err_str or "resource_exhausted" in g_err_str:
                raise OnlineAILimitReachedError() from g_err

        raise OnlineAILimitReachedError("Online AI service (Gemini) unavailable or quota exhausted.")

    async def generate_text(
        self,
        prompt: str,
        system_prompt: str = "",
        temperature: float | None = None,
        force_provider: str | None = None,
        user_id: Any | None = None,
    ) -> str:
        """Generate unstructured text response using either Ollama, User BYOK, or Platform Cloud."""
        use_local = (force_provider == "ollama") or (force_provider is None and self.is_local())

        if use_local:
            logger.info("ai_orchestrator_routing_to_local_ollama", task="generate_text")
            return await ollama_client.generate(
                prompt=prompt,
                system_prompt=system_prompt,
                temperature=temperature,
            )

        # Check for User BYOK Provider
        byok = await self._get_byok(user_id)
        if byok and force_provider is None:
            logger.info("ai_orchestrator_text_routing_to_user_byok", provider=byok.provider, model=byok.model)
            # Strict BYOK mode: DO NOT fall back to platform providers when user has their own key active
            return await byok.generate_text(
                prompt=prompt,
                system_prompt=system_prompt,
                temperature=temperature if temperature is not None else 0.2,
            )

        if force_provider == "gemini":
            return await self.generate_text_gemini_first(
                prompt=prompt,
                system_prompt=system_prompt,
                temperature=temperature,
                user_id=user_id,
            )

        # Platform Cloud AI execution path: Gemini primary -> OpenRouter fallback
        try:
            result = await gemini_client.generate(system_prompt=system_prompt, user_prompt=prompt)
            if result and result.strip() and not result.startswith("### AI Case Analysis Unavailable"):
                return result
        except Exception as g_err:
            logger.warning("orchestrator_gemini_text_failed_trying_openrouter", error=str(g_err))

        try:
            result = await openrouter_client.generate(user_prompt=prompt, system_prompt=system_prompt)
            if result and result.strip():
                return result
        except Exception as or_err:
            g_err_str = str(or_err).lower()
            if "429" in g_err_str or "quota" in g_err_str or "rate limit" in g_err_str or "credits" in g_err_str:
                raise OnlineAILimitReachedError() from or_err

        raise OnlineAILimitReachedError("Online AI services (Gemini & OpenRouter) unavailable or quota exhausted.")

    async def generate_text_gemini_first(
        self,
        prompt: str,
        system_prompt: str = "",
        temperature: float | None = None,
        force_provider: str | None = None,
        user_id: Any | None = None,
    ) -> str:
        """Generate text routing User BYOK -> Gemini primary (or Local Ollama)."""
        use_local = (force_provider == "ollama") or (force_provider is None and self.is_local())

        if use_local:
            logger.info("ai_orchestrator_routing_to_local_ollama", task="generate_text_gemini_first")
            return await ollama_client.generate(
                prompt=prompt,
                system_prompt=system_prompt,
                temperature=temperature,
            )

        # Check for User BYOK Provider
        byok = await self._get_byok(user_id)
        if byok and force_provider is None:
            logger.info("ai_orchestrator_text_routing_to_user_byok", provider=byok.provider, model=byok.model)
            # Strict BYOK mode: DO NOT fall back to platform providers when user has their own key active
            return await byok.generate_text(
                prompt=prompt,
                system_prompt=system_prompt,
                temperature=temperature if temperature is not None else 0.2,
            )

        # Platform Cloud AI execution path: Gemini primary
        logger.info("ai_orchestrator_routing_to_gemini_text_primary", task="generate_text_gemini_first")
        try:
            result = await gemini_client.generate(
                system_prompt=system_prompt,
                user_prompt=prompt,
                temperature=temperature if temperature is not None else 0.3,
            )
            if result and result.strip() and not result.startswith("### AI Case Analysis Unavailable"):
                return result
        except Exception as g_err:
            g_err_str = str(g_err).lower()
            logger.error("orchestrator_gemini_text_failed", error=str(g_err))
            if "429" in g_err_str or "quota" in g_err_str or "rate limit" in g_err_str or "resource_exhausted" in g_err_str:
                raise OnlineAILimitReachedError() from g_err

        raise OnlineAILimitReachedError("Online AI service (Gemini) unavailable or quota exhausted.")

    async def generate_with_context(
        self,
        system_prompt: str,
        conversation_history: list[dict[str, str]],
        user_message: str,
        case_context: str = "",
        order_context: str = "",
        user_id: Any | None = None,
    ) -> str:
        """Multi-turn context chat generation — User BYOK, Local Ollama, or OpenRouter."""
        if self.is_local():
            logger.info("ai_orchestrator_chat_routing_to_local_ollama")
            return await ollama_client.generate_with_context(
                system_prompt=system_prompt,
                conversation_history=conversation_history,
                user_message=user_message,
                case_context=case_context,
                order_context=order_context,
            )

        # Check for User BYOK Provider
        byok = await self._get_byok(user_id)
        if byok:
            logger.info("ai_orchestrator_chat_routing_to_user_byok", provider=byok.provider, model=byok.model)
            # Strict BYOK mode: DO NOT fall back to platform providers when user has their own key active
            return await byok.generate_with_context(
                system_prompt=system_prompt,
                conversation_history=conversation_history,
                user_message=user_message,
                case_context=case_context,
                order_context=order_context,
            )

        # Platform default: Chatbot uses Gemini primary -> OpenRouter fallback
        logger.info("ai_orchestrator_chat_routing_to_gemini")
        try:
            ai_response = await gemini_client.generate_with_context(
                system_prompt=system_prompt,
                conversation_history=conversation_history,
                user_message=user_message,
                case_context=case_context,
                order_context=order_context,
            )
            if ai_response and ai_response.strip() and not ai_response.startswith("### AI Case Analysis Unavailable"):
                return ai_response
        except Exception as g_err:
            logger.warning("orchestrator_gemini_chat_failed_trying_openrouter", error=str(g_err))

        # OpenRouter fallback
        try:
            ai_response = await openrouter_client.generate_with_context(
                system_prompt=system_prompt,
                conversation_history=conversation_history,
                user_message=user_message,
                case_context=case_context,
                order_context=order_context,
            )
            if ai_response and ai_response.strip():
                return ai_response
        except Exception as or_err:
            err_str = str(or_err).lower()
            logger.error("openrouter_chat_failed", error=str(or_err))
            if "429" in err_str or "quota" in err_str or "rate limit" in err_str or "credits" in err_str:
                raise OnlineAILimitReachedError() from or_err

        raise OnlineAILimitReachedError("Online AI services (Gemini & OpenRouter) unavailable or quota exhausted.")

    async def generate_with_context_stream(
        self,
        system_prompt: str,
        conversation_history: list[dict[str, str]],
        user_message: str,
        case_context: str = "",
        order_context: str = "",
        user_id: Any | None = None,
    ) -> AsyncGenerator[str, None]:
        """Streaming multi-turn context chat generation — User BYOK, Local Ollama, or Platform Cloud."""
        if self.is_local():
            logger.info("ai_orchestrator_chat_stream_routing_to_local_ollama")
            async for token in ollama_client.generate_with_context_stream(
                system_prompt=system_prompt,
                conversation_history=conversation_history,
                user_message=user_message,
                case_context=case_context,
                order_context=order_context,
            ):
                yield token
            return

        # Check for User BYOK Provider
        byok = await self._get_byok(user_id)
        if byok:
            logger.info("ai_orchestrator_chat_stream_routing_to_user_byok", provider=byok.provider, model=byok.model)
            # Strict BYOK mode: DO NOT fall back to platform providers when user has their own key active
            async for token in byok.generate_with_context_stream(
                system_prompt=system_prompt,
                conversation_history=conversation_history,
                user_message=user_message,
                case_context=case_context,
                order_context=order_context,
            ):
                if token:
                    yield token
            return

        # Platform default: Chatbot uses Gemini streaming primary -> OpenRouter streaming fallback
        logger.info("ai_orchestrator_chat_stream_routing_to_gemini")
        has_gemini_tokens = False
        try:
            async for token in gemini_client.generate_with_context_stream(
                system_prompt=system_prompt,
                conversation_history=conversation_history,
                user_message=user_message,
                case_context=case_context,
                order_context=order_context,
            ):
                if token and not token.startswith("The AI service is currently unavailable"):
                    has_gemini_tokens = True
                    yield token
            if has_gemini_tokens:
                return
        except Exception as g_err:
            logger.warning("orchestrator_gemini_stream_failed_trying_openrouter", error=str(g_err))

        # OpenRouter streaming fallback
        has_tokens = False
        try:
            async for token in openrouter_client.generate_with_context_stream(
                system_prompt=system_prompt,
                conversation_history=conversation_history,
                user_message=user_message,
                case_context=case_context,
                order_context=order_context,
            ):
                if token:
                    has_tokens = True
                    yield token
            if has_tokens:
                return
        except Exception as or_err:
            err_str = str(or_err).lower()
            logger.error("openrouter_stream_failed", error=str(or_err))
            if "429" in err_str or "quota" in err_str or "rate limit" in err_str or "credits" in err_str:
                raise OnlineAILimitReachedError() from or_err

        raise OnlineAILimitReachedError("Online AI streaming (Gemini & OpenRouter) unavailable or quota exhausted.")


ai_orchestrator = AIOrchestrator()
