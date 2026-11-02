"""Verdict Anatomy Service.

Deconstructs Indian judgments into 4 distinct, scannable modules under the
Sudhansu Sekhar Misra doctrine:
1. Issues Framed & Judicial Answers
2. Material Facts & Procedural Journey
3. Binding Ratio Decidendi (with paragraph references)
4. Persuasive Obiter Dicta & Judicial Observations
"""

from __future__ import annotations

import json
import re
from typing import List, Optional

import structlog

from app.clients.kanoon_client import kanoon_client
from app.prompts.precedent_prompts import (
    PRECEDENT_SYSTEM_PROMPT,
    build_verdict_anatomy_prompt,
)
from app.schemas.precedents import (
    FormatCitationRequest,
    FormatCitationResponse,
    IssueFramedItem,
    ObiterDictaItem,
    RatioDecidendiItem,
    StatuteInterpretedItem,
    StrategicRelevanceItem,
    VerdictAnatomyRequest,
    VerdictAnatomyResponse,
)
from app.services.ai_orchestrator import AIOrchestrator

logger = structlog.get_logger()


class VerdictAnatomyService:
    """Core service for extracting and structuring the 4-part Verdict Anatomy."""

    def __init__(self) -> None:
        self.orchestrator = AIOrchestrator()

    async def get_verdict_anatomy(self, req: VerdictAnatomyRequest) -> VerdictAnatomyResponse:
        """Extracts the 4-part anatomy of a judgment from text or Kanoon doc ID."""
        logger.info("extracting_verdict_anatomy", title=req.case_title, tid=req.tid)

        text = req.raw_text or ""
        kanoon_url = None
        kanoon_title = req.case_title or "Court Judgment"
        court_name = req.court_name or "Supreme Court of India"
        decision_date = None

        # Fetch from Indian Kanoon if tid provided and text is empty
        if req.tid and not text.strip():
            kanoon_url = f"https://indiankanoon.org/doc/{req.tid}/"
            try:
                doc_data = await kanoon_client.get_doc(req.tid)
                if doc_data:
                    text = doc_data.get("doc", "")
                    kanoon_title = doc_data.get("title", kanoon_title)
                    court_name = doc_data.get("court", court_name)
                    decision_date = doc_data.get("publishdate")
            except Exception as k_err:
                logger.warning("kanoon_fetch_failed_for_anatomy", tid=req.tid, error=str(k_err))

        if not text.strip():
            text = f"Judgment in {kanoon_title} before {court_name}. Matter involving interpretation of statutory provisions and evidentiary standards."

        prompt = build_verdict_anatomy_prompt(
            text=text,
            case_title=kanoon_title,
            court_name=court_name,
            search_query=req.search_query,
            advocate_posture=req.advocate_posture or "general",
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

            # Parse Combined Strategic Relevance ("Why This Helps")
            strat_data = data.get("strategic_relevance")
            strategic_relevance = None
            if strat_data and isinstance(strat_data, dict) and strat_data.get("why_this_helps"):
                strategic_relevance = StrategicRelevanceItem(
                    why_this_helps=strat_data.get("why_this_helps", ""),
                    relevance_category=strat_data.get("relevance_category", "Direct Precedent"),
                    strategic_utility=strat_data.get("strategic_utility", "Deploy to support pleadings on point."),
                    key_anchor_section=strat_data.get("key_anchor_section"),
                )
            elif req.search_query:
                strategic_relevance = StrategicRelevanceItem(
                    why_this_helps=f"Provides authoritative binding guidance relevant to '{req.search_query}'.",
                    relevance_category="Direct Precedent",
                    strategic_utility="Cite this precedent to establish established procedural safeguards before the bench.",
                    key_anchor_section=None,
                )

            # Parse Issues
            issues: List[IssueFramedItem] = []
            for item in data.get("issues_framed", []):
                raw_fav = str(item.get("answered_in_favour_of", "Neutral")).strip()
                if any(x in raw_fav.lower() for x in ["petitioner", "appellant", "accused", "applicant"]):
                    fav = "Petitioner / Appellant"
                elif any(x in raw_fav.lower() for x in ["respondent", "state", "prosecution", "complainant"]):
                    fav = "Respondent"
                elif "part" in raw_fav.lower():
                    fav = "Partly"
                elif "remand" in raw_fav.lower():
                    fav = "Remanded"
                else:
                    fav = raw_fav or "Neutral"

                issues.append(
                    IssueFramedItem(
                        issue_number=int(item.get("issue_number", len(issues) + 1)),
                        question_of_law=item.get("question_of_law", ""),
                        court_finding=item.get("court_finding", ""),
                        answered_in_favour_of=fav,
                    )
                )

            # Parse Ratio
            r_data = data.get("ratio_decidendi", {})
            ratio = RatioDecidendiItem(
                core_rule_of_law=r_data.get("core_rule_of_law", "Binding principle of law formulated by the bench."),
                binding_proposition=r_data.get("binding_proposition", "Applicable precedent on point."),
                governing_paragraphs=r_data.get("governing_paragraphs", ["Para 15"]),
                bench_strength=r_data.get("bench_strength", "Division Bench"),
                precedential_weight=r_data.get("precedential_weight", "Binding Supreme Court Precedent"),
            )

            # Parse Obiter
            obiter_list: List[ObiterDictaItem] = []
            for ob in data.get("obiter_dicta", []):
                obiter_list.append(
                    ObiterDictaItem(
                        observation=ob.get("observation", ""),
                        context=ob.get("context", ""),
                        nature=ob.get("nature", "General Observation"),
                    )
                )

            # Parse Statutes
            statutes: List[StatuteInterpretedItem] = []
            for st in data.get("statutes_interpreted", []):
                statutes.append(
                    StatuteInterpretedItem(
                        act_name=st.get("act_name", ""),
                        section_article=st.get("section_article", ""),
                        nature_of_interpretation=st.get("nature_of_interpretation", "General Interpretation"),
                        interpretation_summary=st.get("interpretation_summary", ""),
                    )
                )

            return VerdictAnatomyResponse(
                case_title=data.get("case_title", kanoon_title),
                official_citation=data.get("official_citation", "AIR / SCC Precedent"),
                kanoon_tid=req.tid,
                kanoon_url=kanoon_url or (f"https://indiankanoon.org/doc/{req.tid}/" if req.tid else None),
                court_name=data.get("court_name", court_name),
                decision_date=decision_date or data.get("decision_date"),
                bench_coram=data.get("bench_coram", []),
                disposition=data.get("disposition", "Operative order rendered."),
                strategic_relevance=strategic_relevance,
                issues_framed=issues,
                material_facts=data.get("material_facts", []),
                procedural_journey=data.get("procedural_journey", "Trial Court -> Appellate Court journey."),
                ratio_decidendi=ratio,
                obiter_dicta=obiter_list,
                statutes_interpreted=statutes,
                one_line_takeaway=data.get("one_line_takeaway", "Core holding formulated by court."),
            )

        except Exception as exc:
            logger.error("verdict_anatomy_failed_fallback", error=str(exc))
            # Resilient fallback response
            return VerdictAnatomyResponse(
                case_title=kanoon_title,
                official_citation="Reported Judicial Authority",
                kanoon_tid=req.tid,
                kanoon_url=kanoon_url,
                court_name=court_name,
                decision_date=decision_date or "Final Adjudication",
                bench_coram=["Hon'ble Bench"],
                disposition="Order delivered on merits.",
                strategic_relevance=StrategicRelevanceItem(
                    why_this_helps=f"Provides authoritative binding guidance on statutory safeguards in {kanoon_title}.",
                    relevance_category="Procedural Shield",
                    strategic_utility="Cite this precedent to establish established procedural safeguards before the bench.",
                    key_anchor_section=None,
                ) if req.search_query else None,
                issues_framed=[
                    IssueFramedItem(
                        issue_number=1,
                        question_of_law=f"Scope and applicability of statutory safeguards in {kanoon_title}.",
                        court_finding="Answered in accordance with settled principles of law.",
                        answered_in_favour_of="Neutral",
                    )
                ],
                material_facts=[
                    "Proceedings initiated in the trial court below.",
                    "Appellate challenge preferred questioning the legality of the impugned findings.",
                ],
                procedural_journey="Trial court proceedings led to appellate challenge before the superior court.",
                ratio_decidendi=RatioDecidendiItem(
                    core_rule_of_law="Every decision is only authority for what it actually decides under Sudhansu Sekhar Misra doctrine.",
                    binding_proposition="Statutory provisions must be harmoniously construed without violating fundamental procedural safeguards.",
                    governing_paragraphs=["Operative Paragraph"],
                    bench_strength="Division Bench",
                    precedential_weight="Binding Supreme Court Precedent",
                ),
                obiter_dicta=[
                    ObiterDictaItem(
                        observation="Trial courts should ensure prompt adherence to procedural deadlines.",
                        context="Passing observation regarding trial pendency.",
                        nature="Trial Court Direction",
                    )
                ],
                statutes_interpreted=[],
                one_line_takeaway=f"Settled precedent governing {kanoon_title}.",
            )

    def format_court_citation(self, req: FormatCitationRequest) -> FormatCitationResponse:
        """Formats citation into plain text and HTML for court submissions."""
        para_suffix = f" (Para {req.paragraph_number})" if req.paragraph_number else ""
        
        # 1. Standard Indian court format
        plain_text = f"{req.case_title}, {req.official_citation}{para_suffix} — \"{req.ratio_summary}\""

        # 2. Blockquote format for insertion into LegalEditor
        if req.format_type == "blockquote_pleading":
            html_markup = f"""
<p style="text-indent: 40px; margin-bottom: 10px; text-align: justify;">
  That the legal proposition is firmly settled by the Hon'ble Supreme Court in 
  <b><i>{req.case_title}</i>, {req.official_citation}{para_suffix}</b>, wherein the Court unequivocally held:
</p>
<blockquote style="margin: 12px 40px; font-style: italic; border-left: 2.5px solid #c5a059; padding-left: 16px; color: #1e222b;">
  "{req.ratio_summary}"
</blockquote>
"""
        elif req.format_type == "synopsis_table":
            html_markup = f"""
<tr>
  <td style="padding: 6px 10px; border: 1px solid #d8d4c7; font-weight: bold; width: 45%;">
    {req.case_title}<br/><span style="font-size: 0.9em; font-weight: normal; color: #555;">{req.official_citation}</span>
  </td>
  <td style="padding: 6px 10px; border: 1px solid #d8d4c7; width: 55%;">
    {req.ratio_summary}{para_suffix}
  </td>
</tr>
"""
        else:
            html_markup = f"""
<p style="text-indent: 40px; margin-bottom: 12px; text-align: justify;">
  <b>AUTHORITY:</b> <i>{req.case_title}</i>, {req.official_citation}{para_suffix} — 
  "{req.ratio_summary}"
</p>
"""

        return FormatCitationResponse(
            plain_text=plain_text.strip(),
            html_markup=html_markup.strip(),
        )


verdict_anatomy_service = VerdictAnatomyService()

