"""Pydantic schemas for Pillar 2: Strategic Adversarial Intelligence & Argument Builder."""

from __future__ import annotations

from typing import List, Literal, Optional
from pydantic import BaseModel, Field


# ── 1. Bilateral Opposition Strategy Matrix Schemas ──

class MatrixRow(BaseModel):
    """A single row in the 4-column Opposition Strategy Matrix."""
    id: str = Field(..., description="Unique row identifier")
    category: Literal[
        "Jurisdiction",
        "Limitation",
        "Merits & Evidence",
        "Natural Justice",
        "Statutory Bar",
        "General",
    ] = Field(default="General", description="Legal categorization of the issue")
    moving_party_ground: str = Field(..., description="Primary plea or factual assertion of moving party")
    opposing_attack_vector: str = Field(..., description="Anticipated counter-argument or vulnerability exploited by opponent")
    strategic_rebuttal: str = Field(..., description="Grounded counter-strike and rejoinder tactic")
    governing_citation: str = Field(..., description="Case name and official legal reporter citation")
    ratio_decidendi: str = Field(..., description="One-line core legal principle established by precedent")
    strength_score: int = Field(default=8, ge=1, le=10, description="Rebuttal resilience score (1-10)")


class OppositionMatrixRequest(BaseModel):
    """Request payload to generate a 4-column opposition strategy matrix."""
    document_id: Optional[str] = Field(None, description="Vault document UUID if analyzing an uploaded file")
    raw_text: Optional[str] = Field(None, description="Raw pleading / facts text from editor")
    case_title: Optional[str] = Field(default="Adversarial Strategy Analysis", description="Title or matter reference")
    forum: Optional[str] = Field(default="High Court", description="Target adjudication forum (High Court, Supreme Court, District Court)")
    advocate_posture: Literal["petitioner", "respondent"] = Field(
        default="petitioner",
        description="Whether the advocate represents petitioner/applicant or respondent/defendant"
    )
    specific_concerns: Optional[str] = Field(None, description="Particular issues or opposing claims to address")


class OppositionMatrixResponse(BaseModel):
    """Generated 4-column opposition matrix."""
    case_title: str
    forum: str
    advocate_posture: str
    executive_summary: str
    rows: List[MatrixRow]
    overall_strength_assessment: str


# ── 2. Interim Stay & Injunction Counter-Strike Schemas ──

class ThreeProngItem(BaseModel):
    """Assessment of a single prong in the 3-prong judicial test."""
    prong_name: Literal["Prima Facie Case", "Balance of Convenience", "Irreparable Injury"]
    moving_party_argument: str = Field(..., description="Grounds supporting stay / injunction under this prong")
    opposing_counter_argument: str = Field(..., description="Anticipated opposition grounds to deny or vacate stay")
    adjudication_guidance: str = Field(..., description="Judicial lens / doctrine applied by Indian courts")
    landmark_precedent: str = Field(..., description="Key precedent with ratio governing this prong")


class InterimStayRequest(BaseModel):
    """Request payload for urgent interim stay & injunction analysis."""
    document_id: Optional[str] = Field(None, description="Vault document UUID")
    raw_text: Optional[str] = Field(None, description="Case facts or draft application text")
    stay_relief_sought: str = Field(..., description="Exact interim order sought (e.g., stay on arrest, stay on recovery)")
    matter_type: Literal[
        "civil_suit",
        "writ_petition",
        "arbitration_s9",
        "criminal_482_quashing",
        "bail_application"
    ] = Field(default="writ_petition", description="Type of legal proceeding")
    advocate_side: Literal["seeking_stay", "opposing_stay"] = Field(
        default="seeking_stay",
        description="Whether advocate is seeking ad-interim relief or defending/vacating it"
    )


class InterimStayResponse(BaseModel):
    """Court-ready interim stay evaluation and drafted averments."""
    matter_type: str
    advocate_side: str
    stay_relief_sought: str
    prongs: List[ThreeProngItem]
    drafted_stay_clauses: str = Field(..., description="Court-ready drafted averments and interim prayer")
    vacation_grounds: List[str] = Field(..., description="Key grounds to seek vacation under Order 39 Rule 4 or equivalent")


# ── 3. Procedural Weakness Radar Schemas ──

class DefectItem(BaseModel):
    """A detected procedural or statutory landmine."""
    id: str
    severity: Literal["CRITICAL", "HIGH", "MEDIUM", "LOW"]
    category: str
    title: str
    description: str
    governing_rule: str
    cure_recommendation: str
    cure_clause_template: Optional[str] = Field(None, description="Drafted clause to paste into pleading to cure the defect")


class WeaknessRadarRequest(BaseModel):
    """Request payload to scan a pleading for fatal procedural defects."""
    document_id: Optional[str] = Field(None, description="Vault document UUID")
    raw_text: Optional[str] = Field(None, description="Full pleading text to scan")
    court_level: Optional[str] = Field(default="High Court", description="Forum level")


class WeaknessRadarResponse(BaseModel):
    """Scored defect audit result with risk tier."""
    risk_score: int = Field(..., ge=0, le=100, description="0=Completely clean, 100=Fatal threshold defect")
    risk_tier: Literal["CLEAN", "LOW", "MODERATE", "CRITICAL"]
    total_defects: int
    defects: List[DefectItem]
    procedural_clearance_summary: str


# ── 4. Adversarial Strategy Export Schemas ──

class AdversarialExportRequest(BaseModel):
    """Payload to compile a full court-ready Adversarial Brief in DOCX format."""
    case_title: str = Field(default="Strategic Adversarial Brief")
    forum: str = Field(default="High Court")
    advocate_name: Optional[str] = Field(default="Advocate-on-Record")
    matrix: Optional[OppositionMatrixResponse] = None
    stay_analysis: Optional[InterimStayResponse] = None
    weakness_radar: Optional[WeaknessRadarResponse] = None

