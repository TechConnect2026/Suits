"""Contextual Relevance Service ("Why This Helps" Badges).

Generates concise, single-sentence strategic relevance badges matching
advocate queries/facts against search results and cited precedents.
"""

from __future__ import annotations

import asyncio
import json
import re
from typing import List, Optional

import structlog

from app.prompts.precedent_prompts import (
    PRECEDENT_SYSTEM_PROMPT,
    build_why_this_helps_prompt,
)
from app.schemas.precedents import (
    BatchRelevanceRequest,
    BatchRelevanceResponse,
    RelevanceRequest,
    RelevanceResponse,
)
from app.services.ai_orchestrator import AIOrchestrator

logger = structlog.get_logger()


class ContextualRelevanceService:
    """Service to generate 'Why This Helps' single-sentence badges for legal precedents."""

    def __init__(self) -> None:
        self.orchestrator = AIOrchestrator()

    async def generate_relevance_badge(self, req: RelevanceRequest) -> RelevanceResponse:
        """Generates a single-sentence plain-English relevance badge for a precedent."""
        logger.info("generating_why_this_helps_badge", case=req.case_title, query=req.query[:50])

        prompt = build_why_this_helps_prompt(
            query=req.query,
            case_title=req.case_title,
            court_name=req.court_name or "Supreme Court of India",
            snippet=req.snippet or "",
            advocate_posture=req.advocate_posture,
        )

        try:
            raw_response = await self.orchestrator.generate_text(
                prompt=prompt,
                system_prompt=PRECEDENT_SYSTEM_PROMPT,
                temperature=0.2,
            )

            cleaned = raw_response.strip()
            if cleaned.startswith("```"):
                lines = cleaned.splitlines()
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].strip() == "```":
                    lines = lines[:-1]
                cleaned = "\n".join(lines).strip()

            data = json.loads(cleaned)

            badge_text = data.get("why_this_helps", "").strip()
            # Enforce single sentence limit if LLM generated more
            if "." in badge_text:
                first_sentence = badge_text.split(".")[0].strip() + "."
                if len(first_sentence) > 15:
                    badge_text = first_sentence

            return RelevanceResponse(
                case_title=data.get("case_title", req.case_title),
                why_this_helps=badge_text or f"Authoritative precedent on point for {req.case_title}.",
                relevance_category=data.get("relevance_category", "Direct Precedent"),
                strategic_utility=data.get("strategic_utility", "Cite in support of primary argument."),
                key_anchor_section=data.get("key_anchor_section"),
            )
        except Exception as exc:
            logger.warning("why_this_helps_llm_failed_fallback", error=str(exc), case=req.case_title)
            # Resilient rule-based fallback badge
            fallback_badge = f"Establishes key legal principle regarding {req.case_title} relevant to your inquiry."
            if "bail" in req.query.lower():
                fallback_badge = "Governs statutory bail consideration and liberty safeguards under Indian law."
            elif "quash" in req.query.lower() or "482" in req.query.lower():
                fallback_badge = "Establishes standard for exercise of High Court inherent quashing jurisdiction."
            elif "138" in req.query.lower() or "cheque" in req.query.lower():
                fallback_badge = "Interprets statutory notice and presumption standards under Section 138/139 NI Act."
            elif "arbitration" in req.query.lower():
                fallback_badge = "Applies judicial restraint and minimal court intervention under Arbitration Act."

            return RelevanceResponse(
                case_title=req.case_title,
                why_this_helps=fallback_badge,
                relevance_category="General Authority",
                strategic_utility="Review case ratio and cite in support of legal submissions.",
                key_anchor_section=None,
            )

    async def batch_generate_relevance(self, req: BatchRelevanceRequest) -> BatchRelevanceResponse:
        """Batch evaluates relevance badges for up to 8 candidate search results in parallel."""
        # Limit to 8 concurrent items to maintain responsive throughput
        items_to_process = req.items[:8]
        tasks = [self.generate_relevance_badge(item) for item in items_to_process]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        clean_results: List[RelevanceResponse] = []
        for i, res in enumerate(results):
            if isinstance(res, RelevanceResponse):
                clean_results.append(res)
            else:
                item = items_to_process[i]
                clean_results.append(
                    RelevanceResponse(
                        case_title=item.case_title,
                        why_this_helps=f"Relevant precedent on point for {item.case_title}.",
                        relevance_category="General Authority",
                        strategic_utility="Cite in primary submissions.",
                    )
                )

        return BatchRelevanceResponse(results=clean_results)


contextual_relevance_service = ContextualRelevanceService()

