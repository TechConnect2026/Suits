"""Pydantic schemas for Pillar 3: Precedent Research & Precedent Surfacing."""

from __future__ import annotations

from typing import List, Literal, Optional
from pydantic import BaseModel, Field


# ── 1. "Why This Helps" Contextual Relevance Schemas ──

class RelevanceRequest(BaseModel):
    """Request payload to generate a 'Why This Helps' single-sentence contextual relevance badge."""
    query: str = Field(..., description="Advocate search query or factual summary")
    case_title: str = Field(..., description="Title of the candidate precedent")
    court_name: Optional[str] = Field(default="Supreme Court of India", description="Adjudicating court")
    decision_date: Optional[str] = Field(None, description="Judgment date")
    snippet: Optional[str] = Field(None, description="Headnote, snippet, or excerpt of the case")
    advocate_posture: Literal["petitioner", "respondent", "general"] = Field(
        default="general",
        description="Perspective for which relevance is evaluated"
    )


class RelevanceResponse(BaseModel):
    """Contextual relevance evaluation and badge text."""
    case_title: str
    why_this_helps: str = Field(..., description="Single-sentence plain-English strategic relevance summary")
    relevance_category: str = Field(
        default="Direct Precedent",
        description="Doctrinal categorization: Direct Precedent, Procedural Shield, Statutory Interpretation, Distinguishing Precedent, Factual Analogy, General Authority"
    )
    strategic_utility: str = Field(..., description="How advocate should deploy this in court")
    key_anchor_section: Optional[str] = Field(None, description="Specific statutory section or Article interpreted")


class BatchRelevanceRequest(BaseModel):
    """Batch request for multiple search results."""
    query: str
    items: List[RelevanceRequest]


class BatchRelevanceResponse(BaseModel):
    """Batch results containing relevance badges."""
    results: List[RelevanceResponse]


# ── 2. Structured 4-Part Verdict Anatomy Schemas ──

class IssueFramedItem(BaseModel):
    """Substantive legal question framed by the court."""
    issue_number: int
    question_of_law: str
    court_finding: str
    answered_in_favour_of: str = Field(
        default="Neutral",
        description="Outcome of this issue: Petitioner / Appellant, Respondent, Partly, Remanded, or Neutral"
    )


class RatioDecidendiItem(BaseModel):
    """Binding legal rule formulated by the bench."""
    core_rule_of_law: str = Field(..., description="The binding legal principle established by the court")
    binding_proposition: str = Field(..., description="Precise doctrinal formulation applicable to future cases")
    governing_paragraphs: List[str] = Field(default_factory=list, description="Exact paragraph numbers (e.g., 'Para 28')")
    bench_strength: Optional[str] = Field(None, description="e.g. Constitution Bench (5 Judges), Division Bench")
    precedential_weight: str = Field(
        default="Binding Supreme Court Precedent",
        description="Binding Supreme Court Precedent, Binding High Court Precedent, or Persuasive High Court Precedent"
    )


class ObiterDictaItem(BaseModel):
    """Non-binding judicial observation, warning, or societal remark."""
    observation: str = Field(..., description="Non-binding judicial observation or guidance")
    context: str = Field(..., description="Context in which the remark was made")
    nature: str = Field(
        default="General Observation",
        description="Societal Commentary, Guidance to Police/Investigating Agencies, Legislative Reform Suggestion, Trial Court Direction, or General Observation"
    )


class StatuteInterpretedItem(BaseModel):
    """Statutory provision analyzed in the judgment."""
    act_name: str
    section_article: str
    nature_of_interpretation: str = Field(
        default="General Interpretation",
        description="Strict, Purposive, Harmonious, Read Down, Constitutional Validity Upheld, or General Interpretation"
    )
    interpretation_summary: str


class StrategicRelevanceItem(BaseModel):
    """Contextual relevance summary combined with ratio extraction."""
    why_this_helps: str = Field(..., description="Single-sentence plain-English strategic relevance summary")
    relevance_category: str = Field(
        default="Direct Precedent",
        description="Doctrinal categorization: Direct Precedent, Procedural Shield, Statutory Interpretation, Distinguishing Precedent, Factual Analogy, General Authority"
    )
    strategic_utility: str = Field(..., description="Tactical instruction on how advocate should deploy this in court")
    key_anchor_section: Optional[str] = Field(None, description="Specific statutory section or Article interpreted")


class VerdictAnatomyRequest(BaseModel):
    """Request payload to break down a judgment into scannable modules combined with strategic relevance."""
    cnr: Optional[str] = Field(None, description="Case CNR if from eCourts cache")
    tid: Optional[int] = Field(None, description="Indian Kanoon Document ID")
    raw_text: Optional[str] = Field(None, description="Full judgment text or extracted text")
    case_title: Optional[str] = Field(default="Judgment", description="Case title")
    court_name: Optional[str] = Field(default="Supreme Court of India", description="Court name")
    search_query: Optional[str] = Field(None, description="Advocate search query or factual inquiry for contextual fitness")
    advocate_posture: Optional[str] = Field(default="general", description="Perspective: petitioner, respondent, or general")


class VerdictAnatomyResponse(BaseModel):
    """Complete 4-Part Verdict Anatomy combined with Why This Helps Strategic Relevance."""
    case_title: str
    official_citation: str
    kanoon_tid: Optional[int] = None
    kanoon_url: Optional[str] = None
    court_name: str
    decision_date: Optional[str] = None
    bench_coram: List[str] = Field(default_factory=list)
    disposition: str = Field(..., description="Operative order: e.g. Appeal Allowed, Conviction Quashed")
    strategic_relevance: Optional[StrategicRelevanceItem] = Field(
        None, description="Why This Helps combined strategic relevance badge"
    )
    issues_framed: List[IssueFramedItem] = Field(default_factory=list)
    material_facts: List[str] = Field(default_factory=list)
    procedural_journey: str = Field(..., description="Trial Court -> High Court -> Supreme Court trajectory")
    ratio_decidendi: RatioDecidendiItem
    obiter_dicta: List[ObiterDictaItem] = Field(default_factory=list)
    statutes_interpreted: List[StatuteInterpretedItem] = Field(default_factory=list)
    one_line_takeaway: str


# ── 3. Citation Formatter Schemas ──

class FormatCitationRequest(BaseModel):
    """Request payload to format a precedent citation for court submission."""
    case_title: str
    official_citation: str
    ratio_summary: str
    paragraph_number: Optional[str] = None
    format_type: Literal[
        "standard_indian",
        "blockquote_pleading",
        "synopsis_table",
    ] = "standard_indian"


class FormatCitationResponse(BaseModel):
    """Formatted citation in plain text and HTML markup."""
    plain_text: str
    html_markup: str

