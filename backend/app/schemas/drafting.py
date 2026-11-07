"""Pydantic schemas for Court-Ready Drafting Engine & Paper-Book Exporter."""

from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class DraftingTemplateId(str, Enum):
    CRIMINAL_ANTICIPATORY_BAIL = "CRIMINAL_ANTICIPATORY_BAIL"
    CRIMINAL_REGULAR_BAIL = "CRIMINAL_REGULAR_BAIL"
    CRIMINAL_QUASHING_482 = "CRIMINAL_QUASHING_482"
    CRIMINAL_SECTION_138_NI = "CRIMINAL_SECTION_138_NI"
    CIVIL_WRIT_PETITION = "CIVIL_WRIT_PETITION"
    CIVIL_CRIMINAL_SLP = "CIVIL_CRIMINAL_SLP"
    CIVIL_PLAINT_WS = "CIVIL_PLAINT_WS"
    COURT_VAKALATNAMA = "COURT_VAKALATNAMA"
    CIVIL_LEGAL_NOTICE = "CIVIL_LEGAL_NOTICE"


class TemplateCategory(str, Enum):
    CRIMINAL = "criminal"
    CIVIL = "civil"
    CONSTITUTIONAL = "constitutional"


class TemplateFieldRequirement(BaseModel):
    key: str
    label: str
    required: bool = True
    field_type: str = "text"  # text | textarea | date | select
    placeholder: str = ""
    default_value: Optional[str] = None


class DraftingTemplateItem(BaseModel):
    id: DraftingTemplateId
    category: TemplateCategory
    title: str
    short_title: str
    provisions: list[str]
    court_jurisdiction: str
    description: str
    fields: list[TemplateFieldRequirement]
    sample_cause_title: str


class DeficitItem(BaseModel):
    placeholder: str
    variable_key: str
    field_label: str
    severity: str = "CRITICAL"  # CRITICAL | RECOMMENDED
    description: str


class GeneratePleadingRequest(BaseModel):
    template_id: DraftingTemplateId
    court_name: str
    case_number: Optional[str] = "CRIMINAL / CIVIL MISC. NO. ______ OF 2026"
    applicant_name: str
    applicant_details: Optional[str] = "Aged about [__] years, Resident of [Address]"
    respondent_name: str
    respondent_details: Optional[str] = "Through its Authorized Representative / SHO"
    fir_number: Optional[str] = None
    police_station: Optional[str] = None
    sections_alleged: Optional[str] = None
    factual_narrative: str = Field(..., description="Chronological facts, dates, actions, or allegations.")
    grounds_notes: Optional[str] = None
    interim_prayers: Optional[str] = None
    main_prayers: Optional[str] = None
    cnr: Optional[str] = None
    document_id: Optional[str] = None


class GeneratePleadingResponse(BaseModel):
    template_id: DraftingTemplateId
    title: str
    html_content: str
    deficits_found: list[DeficitItem] = Field(default_factory=list)
    mandatory_sections: list[str] = Field(default_factory=list)
    word_count: int = 0
    estimated_pages: int = 1


class AuditDeficitsRequest(BaseModel):
    template_id: DraftingTemplateId
    text_or_html: str


class AuditDeficitsResponse(BaseModel):
    deficits: list[DeficitItem] = Field(default_factory=list)
    clean_ratio: float = 1.0


class DocxExportRequest(BaseModel):
    html_content: str
    document_title: str = "Court_Paper_Book"
    font_family: str = "Bookman Old Style"
    font_size_pt: float = 13.5
    line_spacing: float = 1.5
    left_margin_inches: float = 1.75
    top_margin_inches: float = 1.5
    right_margin_inches: float = 1.0
    bottom_margin_inches: float = 1.0

