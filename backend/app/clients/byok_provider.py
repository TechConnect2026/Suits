"""Unified BYOK AI Provider Adapter.

Executes AI inference using the user's personal API key across:
1. Google Gemini (Google AI Studio)
2. OpenAI (ChatGPT / GPT-4o)
3. Claude (Anthropic Messages API)
4. OpenRouter (Multi-model hub)
5. Groq Cloud (Ultra-fast inference)

All calls are non-blocking async with httpx and standard REST APIs.
"""

from __future__ import annotations

import asyncio
import json
import re
import time
from typing import Any, AsyncGenerator
import httpx
import structlog

logger = structlog.get_logger()

_DEFAULT_MODELS = {
    "gemini": "gemini-3.1-flash-lite",
    "openai": "gpt-4o-mini",
    "claude": "claude-3-7-sonnet-20250219",
    "openrouter": "openrouter/auto",
    "groq": "llama-3.3-70b-versatile",
}

_GEMINI_ALIASES: dict[str, str] = {
    "gemini-3.5-flash": "gemini-3.1-flash-lite",
    "gemini-3.5-flash-lite": "gemini-3.1-flash-lite",
    "gemini-3.1-flash": "gemini-3.1-flash-lite",
    "gemini-3-flash": "gemini-3.1-flash-lite",
    "gemini-3-flash-preview": "gemini-3.1-flash-lite",
    "gemini-2.5-flash": "gemini-3.1-flash-lite",
    "gemini-2.5-flash-lite": "gemini-3.1-flash-lite",
    "gemini-2.0-flash": "gemini-3.1-flash-lite",
    "gemini-1.5-flash": "gemini-3.1-flash-lite",
    "gemini-3.1-pro": "gemini-3.1-flash-lite",
    "gemini-3.1-pro-preview": "gemini-3.1-flash-lite",
    "gemini-flash-latest": "gemini-3.1-flash-lite",
    "gemini-flash-lite-latest": "gemini-3.1-flash-lite",
}


def _extract_json_from_text(text: str) -> dict[str, Any] | None:
    """Robustly parse JSON object from raw LLM output, selecting the fullest object if multiple exist."""
    if not text or not text.strip():
        return None

    cleaned = text.strip()
    candidates: list[dict[str, Any]] = []

    # 1. Direct parse
    try:
        p = json.loads(cleaned)
        if isinstance(p, dict):
            candidates.append(p)
    except Exception:
        pass

    # 2. All fenced blocks
    for m in re.findall(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned, re.IGNORECASE):
        try:
            p = json.loads(m.strip())
            if isinstance(p, dict):
                candidates.append(p)
        except Exception:
            pass

    # 3. Outermost braces
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end != -1 and end > start:
        try:
            p = json.loads(cleaned[start : end + 1])
            if isinstance(p, dict):
                candidates.append(p)
        except Exception:
            pass

    if candidates:
        return max(
            candidates,
            key=lambda c: (
                1 if ("executiveSummary" in c or "executive_summary" in c or "caseNumber" in c) else 0,
                len(c.keys()),
            ),
        )

    return None


class BYOKProvider:
    """Unified client for executing inference via user-configured BYOK keys."""

    def __init__(self, provider: str, api_key: str, model_preference: str | None = None) -> None:
        self.provider = provider.lower().strip()
        self.api_key = api_key.strip()
        raw_model = (model_preference or _DEFAULT_MODELS.get(self.provider) or "gpt-4o-mini").strip()
        if self.provider == "gemini":
            self.model = "gemini-3.1-flash-lite"
        else:
            self.model = raw_model
        self.timeout = 60.0

    async def test_connection(self) -> tuple[bool, str, int, str]:
        """Test API key validity and connectivity.
        
        Returns: (success: bool, message: str, latency_ms: int, model_name: str)
        """
        start = time.monotonic()
        try:
            if self.provider == "gemini":
                # Google Gemini test strictly using gemini-3.1-flash-lite
                candidate_models = ["gemini-3.1-flash-lite"]
                seen: set[str] = set()
                candidates = [m for m in candidate_models if not (m in seen or seen.add(m))]
                last_error = ""
                async with httpx.AsyncClient(timeout=15.0) as client:
                    for cand in candidates:
                        url = f"https://generativelanguage.googleapis.com/v1beta/models/{cand}:generateContent?key={self.api_key}"
                        resp = await client.post(
                            url,
                            json={
                                "contents": [{"parts": [{"text": "Hello, respond with OK."}]}],
                                "generationConfig": {"maxOutputTokens": 5},
                            },
                        )
                        latency = int((time.monotonic() - start) * 1000)
                        if resp.status_code == 200:
                            self.model = cand
                            return True, f"Google Gemini verified successfully ({cand}, {latency}ms).", latency, cand

                        # Intelligently inspect error response
                        try:
                            err_data = resp.json().get("error", {})
                            err_msg = err_data.get("message", resp.text[:150])
                        except Exception:
                            err_msg = resp.text[:150]

                        if "free tier is not available for this project" in err_msg.lower():
                            last_error = (
                                "Gemini Free Tier not enabled on this Google Cloud Project: "
                                "Google restricts free tier for accounts requiring age verification or projects with billing locks. "
                                "Fix: Generate a fresh API key in a brand new project at https://aistudio.google.com/app/apikey "
                                "or use Groq / OpenRouter for instant 100% free AI."
                            )
                        elif "api_key_invalid" in err_msg.lower() or "invalid api key" in err_msg.lower():
                            last_error = "Invalid Google Gemini API key. Please check the key string copied from Google AI Studio."
                        else:
                            last_error = f"Gemini error ({resp.status_code}): {err_msg}"

                        if resp.status_code not in (403, 404):
                            break
                    return False, last_error, latency, self.model

            elif self.provider == "openai":
                # OpenAI test
                url = "https://api.openai.com/v1/chat/completions"
                headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
                async with httpx.AsyncClient(timeout=15.0) as client:
                    resp = await client.post(
                        url,
                        headers=headers,
                        json={
                            "model": self.model,
                            "messages": [{"role": "user", "content": "hi"}],
                            "max_tokens": 5,
                        },
                    )
                    latency = int((time.monotonic() - start) * 1000)
                    if resp.status_code == 200:
                        return True, f"OpenAI ({self.model}) verified successfully ({latency}ms).", latency, self.model
                    return False, f"OpenAI error ({resp.status_code}): {resp.text[:150]}", latency, self.model

            elif self.provider == "claude":
                # Anthropic Claude test
                url = "https://api.anthropic.com/v1/messages"
                headers = {
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                }
                async with httpx.AsyncClient(timeout=15.0) as client:
                    resp = await client.post(
                        url,
                        headers=headers,
                        json={
                            "model": self.model,
                            "max_tokens": 5,
                            "messages": [{"role": "user", "content": "hi"}],
                        },
                    )
                    latency = int((time.monotonic() - start) * 1000)
                    if resp.status_code == 200:
                        return True, f"Claude ({self.model}) verified successfully ({latency}ms).", latency, self.model
                    return False, f"Anthropic error ({resp.status_code}): {resp.text[:150]}", latency, self.model

            elif self.provider == "openrouter":
                # OpenRouter test (can use auth check or 1 token chat)
                url = "https://openrouter.ai/api/v1/auth/key"
                headers = {"Authorization": f"Bearer {self.api_key}"}
                async with httpx.AsyncClient(timeout=15.0) as client:
                    resp = await client.get(url, headers=headers)
                    latency = int((time.monotonic() - start) * 1000)
                    if resp.status_code == 200:
                        data = resp.json().get("data", {})
                        label = data.get("label", "Key active")
                        return True, f"OpenRouter verified ({label}, {latency}ms).", latency, self.model
                    return False, f"OpenRouter error ({resp.status_code}): {resp.text[:150]}", latency, self.model

            elif self.provider == "groq":
                # Groq test
                url = "https://api.groq.com/openai/v1/chat/completions"
                headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
                async with httpx.AsyncClient(timeout=15.0) as client:
                    resp = await client.post(
                        url,
                        headers=headers,
                        json={
                            "model": self.model,
                            "messages": [{"role": "user", "content": "hi"}],
                            "max_tokens": 5,
                        },
                    )
                    latency = int((time.monotonic() - start) * 1000)
                    if resp.status_code == 200:
                        return True, f"Groq Cloud verified successfully ({latency}ms).", latency, self.model
                    return False, f"Groq error ({resp.status_code}): {resp.text[:150]}", latency, self.model

            return False, f"Unknown provider: {self.provider}", 0, self.model
        except Exception as exc:
            latency = int((time.monotonic() - start) * 1000)
            return False, f"Connection failed: {str(exc)}", latency, self.model

    async def generate_text(
        self,
        prompt: str,
        system_prompt: str = "",
        temperature: float = 0.2,
        max_tokens: int = 4096,
    ) -> str:
        """Generate unstructured text response."""
        if self.provider == "gemini":
            return await self._generate_gemini_text(prompt, system_prompt, temperature, max_tokens)
        elif self.provider == "claude":
            return await self._generate_claude_text(prompt, system_prompt, temperature, max_tokens)
        else:  # openai, openrouter, groq (OpenAI-compatible)
            base_url = "https://api.openai.com/v1" if self.provider == "openai" else (
                "https://openrouter.ai/api/v1" if self.provider == "openrouter" else "https://api.groq.com/openai/v1"
            )
            return await self._generate_openai_compat_text(base_url, prompt, system_prompt, temperature, max_tokens)

    async def generate_json(
        self,
        system_prompt: str,
        user_prompt: str,
        max_tokens: int = 4096,
        temperature: float = 0.1,
    ) -> dict[str, Any]:
        """Generate structured JSON response."""
        json_sys_prompt = f"{system_prompt}\n\nIMPORTANT: You MUST respond ONLY with valid RFC-8259 JSON. Do not include markdown fences or explanation."
        if self.provider == "gemini":
            candidate_models = ["gemini-3.1-flash-lite"]
            seen_m: set[str] = set()
            candidates = [m for m in candidate_models if not (m in seen_m or seen_m.add(m))]
            last_resp: httpx.Response | None = None
            for cand_model in candidates:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{cand_model}:generateContent?key={self.api_key}"
                payload = {
                    "contents": [{"parts": [{"text": user_prompt}]}],
                    "systemInstruction": {"parts": [{"text": json_sys_prompt}]},
                    "generationConfig": {
                        "temperature": temperature,
                        "maxOutputTokens": max_tokens,
                        "responseMimeType": "application/json",
                    },
                }
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    resp = await client.post(url, json=payload)
                    last_resp = resp
                    if resp.status_code == 200:
                        self.model = cand_model
                        data = resp.json()
                        text = data["candidates"][0]["content"]["parts"][0]["text"]
                        parsed = _extract_json_from_text(text)
                        if parsed:
                            return parsed
                    elif resp.status_code in (404, 503):
                        logger.warning("gemini_json_model_fallback", model=cand_model, status_code=resp.status_code)
                        continue
                    resp.raise_for_status()

            if last_resp is not None:
                last_resp.raise_for_status()
            raise ValueError("Gemini returned invalid JSON structure.")

        elif self.provider == "claude":
            text = await self._generate_claude_text(user_prompt, json_sys_prompt, temperature, max_tokens)
            parsed = _extract_json_from_text(text)
            if parsed:
                return parsed
            raise ValueError("Claude returned invalid JSON structure.")

        else:
            base_url = "https://api.openai.com/v1" if self.provider == "openai" else (
                "https://openrouter.ai/api/v1" if self.provider == "openrouter" else "https://api.groq.com/openai/v1"
            )
            headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
            if self.provider == "openrouter":
                headers["HTTP-Referer"] = "https://suits.app"
                headers["X-Title"] = "SUITS AI"

            messages = [
                {"role": "system", "content": json_sys_prompt},
                {"role": "user", "content": user_prompt},
            ]
            req_body: dict[str, Any] = {
                "model": self.model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "response_format": {"type": "json_object"},
            }
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.post(f"{base_url}/chat/completions", headers=headers, json=req_body)
                resp.raise_for_status()
                data = resp.json()
                msg = data["choices"][0]["message"]
                text = msg.get("content") or msg.get("reasoning") or ""
                parsed = _extract_json_from_text(text)
                if parsed:
                    return parsed
                raise ValueError(f"{self.provider} returned invalid JSON structure.")

    async def generate_with_context(
        self,
        system_prompt: str,
        conversation_history: list[dict[str, str]],
        user_message: str,
        case_context: str = "",
        order_context: str = "",
        temperature: float = 0.3,
    ) -> str:
        """Multi-turn context chat generation."""
        combined_prompt = self._build_chat_prompt(case_context, order_context, user_message)
        if self.provider == "gemini":
            return await self._generate_gemini_chat(system_prompt, conversation_history, combined_prompt, temperature)
        elif self.provider == "claude":
            return await self._generate_claude_chat(system_prompt, conversation_history, combined_prompt, temperature)
        else:
            base_url = "https://api.openai.com/v1" if self.provider == "openai" else (
                "https://openrouter.ai/api/v1" if self.provider == "openrouter" else "https://api.groq.com/openai/v1"
            )
            return await self._generate_openai_compat_chat(base_url, system_prompt, conversation_history, combined_prompt, temperature)

    async def generate_with_context_stream(
        self,
        system_prompt: str,
        conversation_history: list[dict[str, str]],
        user_message: str,
        case_context: str = "",
        order_context: str = "",
        temperature: float = 0.3,
    ) -> AsyncGenerator[str, None]:
        """Stream multi-turn chat response tokens."""
        combined_prompt = self._build_chat_prompt(case_context, order_context, user_message)
        if self.provider == "gemini":
            async for token in self._stream_gemini(system_prompt, conversation_history, combined_prompt, temperature):
                yield token
        elif self.provider == "claude":
            async for token in self._stream_claude(system_prompt, conversation_history, combined_prompt, temperature):
                yield token
        else:
            base_url = "https://api.openai.com/v1" if self.provider == "openai" else (
                "https://openrouter.ai/api/v1" if self.provider == "openrouter" else "https://api.groq.com/openai/v1"
            )
            async for token in self._stream_openai_compat(base_url, system_prompt, conversation_history, combined_prompt, temperature):
                yield token

    # --- Internal Provider Implementations ---

    def _build_chat_prompt(self, case_context: str, order_context: str, user_message: str) -> str:
        parts = []
        if case_context:
            parts.append(f"## Case Information\n{case_context}")
        if order_context:
            parts.append(f"## Relevant Order / Document\n{order_context}")
        parts.append(f"## Current Question\n{user_message}")
        parts.append(
            "## Response Instructions\n"
            "- Provide a comprehensive, detailed, and thorough legal analysis\n"
            "- Structure with clear Markdown headings (##, ###) and bold text\n"
            "- Cite specific dates, statutes, judges, and case precedents from context"
        )
        return "\n\n".join(parts)

    async def _generate_gemini_text(self, prompt: str, system_prompt: str, temperature: float, max_tokens: int) -> str:
        candidate_models = ["gemini-3.1-flash-lite"]
        seen_m: set[str] = set()
        candidates = [m for m in candidate_models if not (m in seen_m or seen_m.add(m))]
        last_resp: httpx.Response | None = None
        for cand_model in candidates:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{cand_model}:generateContent?key={self.api_key}"
            payload: dict[str, Any] = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": temperature, "maxOutputTokens": max_tokens},
            }
            if system_prompt:
                payload["systemInstruction"] = {"parts": [{"text": system_prompt}]}

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.post(url, json=payload)
                last_resp = resp
                if resp.status_code == 200:
                    self.model = cand_model
                    data = resp.json()
                    return data["candidates"][0]["content"]["parts"][0]["text"]
                elif resp.status_code in (404, 503):
                    logger.warning("gemini_text_model_fallback", model=cand_model, status_code=resp.status_code)
                    continue
                resp.raise_for_status()

        if last_resp is not None:
            last_resp.raise_for_status()
        raise ValueError("Gemini returned empty response.")

    async def _generate_gemini_chat(self, system_prompt: str, history: list[dict[str, str]], prompt: str, temperature: float) -> str:
        candidate_models = ["gemini-3.1-flash-lite"]
        seen_m: set[str] = set()
        candidates = [m for m in candidate_models if not (m in seen_m or seen_m.add(m))]
        contents = []
        for m in history[-10:]:
            role = "user" if m.get("role") == "user" else "model"
            contents.append({"role": role, "parts": [{"text": m.get("message", "")}]})
        contents.append({"role": "user", "parts": [{"text": prompt}]})

        payload: dict[str, Any] = {
            "contents": contents,
            "generationConfig": {"temperature": temperature, "maxOutputTokens": 4096},
        }
        if system_prompt:
            payload["systemInstruction"] = {"parts": [{"text": system_prompt}]}

        last_resp: httpx.Response | None = None
        for cand_model in candidates:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{cand_model}:generateContent?key={self.api_key}"
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.post(url, json=payload)
                last_resp = resp
                if resp.status_code == 200:
                    self.model = cand_model
                    data = resp.json()
                    return data["candidates"][0]["content"]["parts"][0]["text"]
                elif resp.status_code in (404, 503):
                    logger.warning("gemini_chat_model_fallback", model=cand_model, status_code=resp.status_code)
                    continue
                resp.raise_for_status()

        if last_resp is not None:
            last_resp.raise_for_status()
        raise ValueError("Gemini chat returned empty response.")

    async def _stream_gemini(self, system_prompt: str, history: list[dict[str, str]], prompt: str, temperature: float) -> AsyncGenerator[str, None]:
        candidate_models = ["gemini-3.1-flash-lite"]
        seen_m: set[str] = set()
        candidates = [m for m in candidate_models if not (m in seen_m or seen_m.add(m))]
        contents = []
        for m in history[-10:]:
            role = "user" if m.get("role") == "user" else "model"
            contents.append({"role": role, "parts": [{"text": m.get("message", "")}]})
        contents.append({"role": "user", "parts": [{"text": prompt}]})

        payload: dict[str, Any] = {
            "contents": contents,
            "generationConfig": {"temperature": temperature, "maxOutputTokens": 4096},
        }
        if system_prompt:
            payload["systemInstruction"] = {"parts": [{"text": system_prompt}]}

        for cand_model in candidates:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{cand_model}:streamGenerateContent?alt=sse&key={self.api_key}"
            had_token = False
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                async with client.stream("POST", url, json=payload) as response:
                    if response.status_code in (404, 503):
                        logger.warning("gemini_stream_model_fallback", model=cand_model, status_code=response.status_code)
                        continue
                    response.raise_for_status()
                    async for line in response.aiter_lines():
                        if line.startswith("data: "):
                            raw_data = line[6:].strip()
                            if not raw_data:
                                continue
                            try:
                                chunk = json.loads(raw_data)
                                parts = chunk.get("candidates", [{}])[0].get("content", {}).get("parts", [])
                                for p in parts:
                                    txt = p.get("text", "")
                                    if txt:
                                        had_token = True
                                        yield txt
                            except Exception:
                                continue
                    if had_token:
                        self.model = cand_model
                        return

    async def _generate_claude_text(self, prompt: str, system_prompt: str, temperature: float, max_tokens: int) -> str:
        url = "https://api.anthropic.com/v1/messages"
        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }
        payload: dict[str, Any] = {
            "model": self.model,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "messages": [{"role": "user", "content": prompt}],
        }
        if system_prompt:
            payload["system"] = system_prompt

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["content"][0]["text"]

    async def _generate_claude_chat(self, system_prompt: str, history: list[dict[str, str]], prompt: str, temperature: float) -> str:
        url = "https://api.anthropic.com/v1/messages"
        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }
        messages = []
        for m in history[-10:]:
            role = "user" if m.get("role") == "user" else "assistant"
            messages.append({"role": role, "content": m.get("message", "")})
        messages.append({"role": "user", "content": prompt})

        payload: dict[str, Any] = {
            "model": self.model,
            "max_tokens": 4096,
            "temperature": temperature,
            "messages": messages,
        }
        if system_prompt:
            payload["system"] = system_prompt

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["content"][0]["text"]

    async def _stream_claude(self, system_prompt: str, history: list[dict[str, str]], prompt: str, temperature: float) -> AsyncGenerator[str, None]:
        url = "https://api.anthropic.com/v1/messages"
        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }
        messages = []
        for m in history[-10:]:
            role = "user" if m.get("role") == "user" else "assistant"
            messages.append({"role": role, "content": m.get("message", "")})
        messages.append({"role": "user", "content": prompt})

        payload: dict[str, Any] = {
            "model": self.model,
            "max_tokens": 4096,
            "temperature": temperature,
            "messages": messages,
            "stream": True,
        }
        if system_prompt:
            payload["system"] = system_prompt

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            async with client.stream("POST", url, headers=headers, json=payload) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        raw_data = line[6:].strip()
                        if not raw_data:
                            continue
                        try:
                            event = json.loads(raw_data)
                            if event.get("type") == "content_block_delta":
                                delta = event.get("delta", {})
                                if delta.get("type") == "text_delta":
                                    yield delta.get("text", "")
                        except Exception:
                            continue

    async def _generate_openai_compat_text(self, base_url: str, prompt: str, system_prompt: str, temperature: float, max_tokens: int) -> str:
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        if self.provider == "openrouter":
            headers["HTTP-Referer"] = "https://suits.app"
            headers["X-Title"] = "SUITS AI"

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(f"{base_url}/chat/completions", headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]

    async def _generate_openai_compat_chat(self, base_url: str, system_prompt: str, history: list[dict[str, str]], prompt: str, temperature: float) -> str:
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        if self.provider == "openrouter":
            headers["HTTP-Referer"] = "https://suits.app"
            headers["X-Title"] = "SUITS AI"

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        for m in history[-10:]:
            role = "user" if m.get("role") == "user" else "assistant"
            messages.append({"role": role, "content": m.get("message", "")})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": 4096,
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(f"{base_url}/chat/completions", headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]

    async def _stream_openai_compat(self, base_url: str, system_prompt: str, history: list[dict[str, str]], prompt: str, temperature: float) -> AsyncGenerator[str, None]:
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        if self.provider == "openrouter":
            headers["HTTP-Referer"] = "https://suits.app"
            headers["X-Title"] = "SUITS AI"

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        for m in history[-10:]:
            role = "user" if m.get("role") == "user" else "assistant"
            messages.append({"role": role, "content": m.get("message", "")})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": 4096,
            "stream": True,
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            async with client.stream("POST", f"{base_url}/chat/completions", headers=headers, json=payload) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        raw_data = line[6:].strip()
                        if raw_data == "[DONE]":
                            break
                        if not raw_data:
                            continue
                        try:
                            chunk = json.loads(raw_data)
                            delta = chunk.get("choices", [{}])[0].get("delta", {})
                            content = delta.get("content", "")
                            if content:
                                yield content
                        except Exception:
                            continue
