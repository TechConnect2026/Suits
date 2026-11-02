"""Schemas for Criminal Law Era Transition Engine (IPC/CrPC/IEA ↔ BNS/BNSS/BSA)."""

from __future__ import annotations

from typing import Any, Literal
from pydantic import BaseModel, Field


class PrecedentSummary(BaseModel):
    """Landmark precedent citation and ratio."""
    title: str = Field(description="Case title, e.g., 'Arnesh Kumar v. State of Bihar'")
    citation: str = Field(description="Law report citation, e.g., '(2014) 8 SCC 273'")
    court: str = Field(description="Court name, e.g., 'Supreme Court of India'")
    ratio: str = Field(description="Core legal ratio decidendi")


class StatutoryDelta(BaseModel):
    """Statutory variation, newly added proviso, or procedural departure."""
    provision_name: str = Field(description="Name of the specific amended section or proviso")
    delta_type: Literal[
        "SUBSTANTIAL_CHANGE",
        "NEW_PROVISO_ADDED",
        "PROCEDURE_MODIFIED",
        "PENALTY_ENHANCED",
        "DIRECT_SUBSTITUTION",
    ] = Field(description="Nature of legal variation")
    details: str = Field(description="Explanatory text outlining statutory modification")
    litigator_warning: str = Field(description="Actionable strategic alert or objection for advocate")


class StatuteConcordancePair(BaseModel):
    """Bi-directional mapping between old colonial code and new criminal enactment."""
    id: str = Field(description="Unique concordance identifier")
    old_code: Literal["CrPC", "IPC", "IEA"] = Field(description="Legacy statute name")
    old_section: str = Field(description="Legacy section number, e.g., '438', '41A'")
    old_title: str = Field(description="Legacy section title")
    new_code: Literal["BNSS", "BNS", "BSA"] = Field(description="Enacted 2023 statute name")
    new_section: str = Field(description="New section number, e.g., '482', '35(3)'")
    new_title: str = Field(description="New section title")
    category: Literal["PROCEDURAL", "SUBSTANTIVE", "EVIDENTIARY"] = Field(description="Subject matter category")
    concept_doctrine: str = Field(description="Governing legal doctrine or constitutional protection")
    doctrine_summary: str = Field(description="Summary of the doctrine")
    landmark_precedents: list[PrecedentSummary] = Field(default_factory=list, description="Associated landmark precedents")
    statutory_deltas: list[StatutoryDelta] = Field(default_factory=list, description="Differences between old and new provisions")
    similarity_score: float | None = Field(default=None, description="InLegalBERT semantic match score if queried conceptually")


class PrecedentTranspositionItem(BaseModel):
    """Court-ready transposed argument linking old Supreme Court precedent to new statutory section."""
    precedent_title: str = Field(description="Landmark precedent name, e.g., 'Gurbaksh Singh Sibbia v. State of Punjab'")
    citation: str = Field(description="Official law report citation")
    historic_section_cited: str = Field(description="Old code section, e.g., 'Section 438 CrPC'")
    transposed_section: str = Field(description="New code section, e.g., 'Section 482 BNSS'")
    governing_doctrine: str = Field(description="Doctrinal principle, e.g., 'Pre-arrest Personal Liberty'")
    court_pleading_paragraph: str = Field(
        description="Formal court-ready submission arguing why historic ratio binds the bench under the new enactment"
    )
    statutory_continuity_basis: str = Field(
        description="Statutory continuity anchor, e.g., 'Section 8 General Clauses Act, 1897 & Pari Materia Doctrine'"
    )
    persuasion_ratio: str = Field(description="Crisp ratio distillation for oral argument before the judge")


class EraTransitionCaseAnalysis(BaseModel):
    """Complete era transition report for an active court case."""
    target_cnr: str = Field(description="Case CNR number")
    active_era: Literal["NEW_BNS_ERA", "LEGACY_IPC_ERA", "HYBRID_TRANSITION_ERA"] = Field(
        description="Applicable statutory era based on FIR/offence registration date"
    )
    era_explanation: str = Field(description="Detailed legal explanation of era categorization and date thresholds")
    concordance_mappings: list[StatuteConcordancePair] = Field(
        default_factory=list, description="Applicable old ↔ new statute concordance pairs"
    )
    statutory_deltas: list[StatutoryDelta] = Field(
        default_factory=list, description="Statutory variations and new procedural requirements"
    )
    transposed_precedents: list[PrecedentTranspositionItem] = Field(
        default_factory=list, description="Transposed arguments ready for court drafting"
    )
    procedural_risks: list[str] = Field(
        default_factory=list, description="Procedural risk warnings and objections for litigators"
    )
    model_attribution: str = Field(
        default="InLegalBERT Mode 1 + Gemini 3.6 Flash", description="AI pipeline attribution"
    )
    generated_at: str = Field(description="ISO timestamp when analysis was synthesized")


class ConcordanceLookupResponse(BaseModel):
    """Response schema for section or doctrine concordance search."""
    query: str = Field(description="Searched section number, statute name, or legal doctrine")
    match_count: int = Field(description="Number of matching concordance pairs")
    pairs: list[StatuteConcordancePair] = Field(default_factory=list, description="Matching concordance pairs")


class EraTransitionInstant(BaseModel):
    """Zero-LLM instant concordance snapshot – served from static Python dictionary (0 tokens, <10ms)."""
    target_cnr: str = Field(description="Case CNR number")
    active_era: Literal["NEW_BNS_ERA", "LEGACY_IPC_ERA", "HYBRID_TRANSITION_ERA"] = Field(
        description="Applicable statutory era resolved from case filing date and cited statutes"
    )
    era_explanation: str = Field(description="Plain-language explanation of era categorization")
    concordance_mappings: list[StatuteConcordancePair] = Field(
        default_factory=list, description="Applicable old ↔ new statute concordance pairs for this case"
    )
    statutory_deltas: list[StatutoryDelta] = Field(
        default_factory=list, description="Statutory variations between old and new provisions"
    )
    procedural_risks: list[str] = Field(
        default_factory=list, description="Procedural litigator risk alerts derived from concordance data"
    )
    source: str = Field(default="STATIC_CONCORDANCE_DICT", description="Data origin – confirms no LLM was called")


class TransitionQuestionRequest(BaseModel):
    """Request schema for asking legal questions about criminal law era transition."""
    question: str = Field(..., description="Legal question regarding IPC/CrPC/IEA to BNS/BNSS/BSA transition")
    category: str | None = Field(default=None, description="Optional category filter (PROCEDURAL, SUBSTANTIVE, EVIDENTIARY)")
    active_era: str | None = Field(default=None, description="Specific era context if applicable")


class TransitionQuestionResponse(BaseModel):
    """Response schema for criminal law era transition Q&A."""
    question: str = Field(description="The original legal question")
    answer: str = Field(description="Authoritative, detailed statutory and judicial transition answer")
    key_sections: list[StatuteConcordancePair] = Field(default_factory=list, description="Relevant statutory concordance pairs")
    governing_principles: list[str] = Field(default_factory=list, description="Constitutional and statutory transition principles")
    procedural_warnings: list[str] = Field(default_factory=list, description="Strategic litigator warnings and alerts")
    draft_pleading_snippet: str | None = Field(default=None, description="Court-ready pleading paragraph for application/petition")
    confidence: float = Field(default=0.95, description="Confidence score of statutory concordance")


# ── Pillar 4: Temporal Safeguard & Verbatim Diff Schemas ──

class TemporalViolationItem(BaseModel):
    """Specific statutory or constitutional violation identified."""
    violation_code: Literal[
        "EX_POST_FACTO_PENAL_VIOLATION",
        "REPEALED_SUBSTANTIVE_LAW_CITED",
        "PROCEDURAL_CONTINUITY_MISMATCH",
        "EVIDENTIARY_CERTIFICATE_AMBIGUITY",
    ]
    title: str = Field(..., description="Short title of the violation")
    description: str = Field(..., description="Detailed explanation grounded in Article 20(1) or Section 531 BNSS")
    problematic_citation: str = Field(..., description="Cited section that triggers this violation")
    correct_statutory_reference: str = Field(..., description="Constitutionally and procedurally valid section")
    severity: Literal["CRITICAL", "HIGH", "WARNING"] = "CRITICAL"


class AutoRemedyItem(BaseModel):
    """Automated section replacement instruction."""
    original_text: str = Field(..., description="Defective section string in draft, e.g. 'Section 318(4) BNS'")
    replacement_text: str = Field(..., description="Correct section string, e.g. 'Section 420 IPC'")
    statute_type: Literal["SUBSTANTIVE", "PROCEDURAL", "EVIDENTIARY"]
    rationale: str = Field(..., description="Reason for replacement (Article 20(1) / Section 531 BNSS)")


class TemporalInspectionRequest(BaseModel):
    """Request payload to inspect incident/FIR dates against July 1, 2024 cutoff."""
    incident_date: str = Field(..., description="Date of alleged offence (YYYY-MM-DD or textual date)")
    fir_date: str | None = Field(default=None, description="Date of FIR registration or complaint filing")
    draft_text_or_sections: str | None = Field(
        default=None,
        description="Draft petition text or comma-separated list of cited sections to audit"
    )
    case_type: Literal["Bail", "Quashing", "Trial", "Appeal", "Demand Notice", "General"] = "General"


class TemporalInspectionResponse(BaseModel):
    """Constitutional Article 20(1) and BNSS procedural audit verdict."""
    incident_date_resolved: str = Field(..., description="Normalized incident date")
    fir_date_resolved: str | None = Field(None, description="Normalized FIR date")
    is_pre_cutoff_incident: bool = Field(
        ..., description="True if offence was committed prior to July 1, 2024"
    )
    is_pre_cutoff_fir: bool = Field(
        ..., description="True if FIR was registered prior to July 1, 2024"
    )
    statutory_regime: Literal["PURE_LEGACY_IPC", "HYBRID_TRANSITION_ERA", "PURE_NEW_BNS"] = Field(
        ..., description="Constitutional regime classification"
    )
    substantive_code_required: Literal["IPC", "BNS"] = Field(
        ..., description="Mandatory penal code under Article 20(1)"
    )
    procedural_code_required: Literal["CrPC", "BNSS"] = Field(
        ..., description="Governing procedural code under Section 531 BNSS"
    )
    evidence_act_required: Literal["IEA", "BSA"] = Field(
        ..., description="Applicable evidentiary code"
    )
    constitutional_assessment: str = Field(..., description="Authoritative legal finding")
    violations: list[TemporalViolationItem] = Field(default_factory=list)
    remedies: list[AutoRemedyItem] = Field(default_factory=list)
    court_declaration_snippet: str = Field(
        ..., description="Court-ready preliminary objection or submission asserting applicable era"
    )


class WordDiffChunk(BaseModel):
    """A single tokenized chunk in the statutory diff."""
    text: str
    type: Literal["unchanged", "added", "deleted"]


class MetadataDelta(BaseModel):
    """Comparative legal parameter between old and new section."""
    parameter: str = Field(..., description="e.g., Bailability, Cognizability, Maximum Sentence")
    old_value: str
    new_value: str
    has_changed: bool
    advocate_impact: str


class StatutoryVerbatimDiffRequest(BaseModel):
    """Request payload for verbatim statutory diff."""
    pair_id: str = Field(..., description="Concordance pair identifier, e.g. 'crpc_438_bnss_482'")
    old_code: str | None = None
    old_section: str | None = None
    new_code: str | None = None
    new_section: str | None = None


class StatutoryVerbatimDiffResponse(BaseModel):
    """Complete word-level statutory diff and litigator delta."""
    pair_id: str
    old_title_full: str
    new_title_full: str
    old_verbatim_text: str
    new_verbatim_text: str
    diff_chunks: list[WordDiffChunk]
    metadata_deltas: list[MetadataDelta]
    key_litigator_takeaways: list[str]
    court_submission_pleading: str


class TransitionalJurisprudenceItem(BaseModel):
    """Landmark ruling resolving criminal transition ambiguities."""
    id: str
    case_title: str
    citation: str
    court: str
    bench_coram: str
    decision_date: str
    topic_category: Literal[
        "Undertrial Bail (BNSS 479)",
        "Police Custody (BNSS 187)",
        "Preliminary Inquiry (BNSS 173)",
        "Mandatory Videography (BNSS 105)",
        "Savings & Pending Petitions (BNSS 531)",
        "Electronic Evidence (BSA 63)",
        "General Clauses Continuity",
    ]
    core_holding: str
    strategic_ratio_quote: str
    court_pleading_snippet: str
    source_url: str | None = None


class TransitionalJurisprudenceResponse(BaseModel):
    """List of transitional jurisprudence authorities with topic filters."""
    total_count: int
    items: list[TransitionalJurisprudenceItem]
