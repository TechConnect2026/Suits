"""Drafting Templates Service - Template Catalog and AI Pleading Generator."""

import re
import structlog
from app.prompts.drafting_templates_prompts import (
    DRAFTING_SYSTEM_PROMPT,
    build_drafting_prompt,
)
from app.schemas.drafting import (
    DraftingTemplateId,
    DraftingTemplateItem,
    GeneratePleadingRequest,
    GeneratePleadingResponse,
    TemplateCategory,
    TemplateFieldRequirement,
)
from app.services.ai_orchestrator import AIOrchestrator
from app.services.deficit_guard_service import deficit_guard_service

logger = structlog.get_logger()

# Master catalog of 9 standard Indian court templates
TEMPLATE_CATALOG: list[DraftingTemplateItem] = [
    DraftingTemplateItem(
        id=DraftingTemplateId.CRIMINAL_ANTICIPATORY_BAIL,
        category=TemplateCategory.CRIMINAL,
        title="Anticipatory Bail Application",
        short_title="Anticipatory Bail",
        provisions=["Section 438 CrPC", "Section 482 BNSS"],
        court_jurisdiction="Sessions Court / High Court",
        description="Application seeking pre-arrest protection in non-bailable offences where arrest is reasonably apprehended.",
        sample_cause_title="IN THE HIGH COURT OF DELHI AT NEW DELHI / IN THE SESSIONS COURT AT NEW DELHI",
        fields=[
            TemplateFieldRequirement(key="court_name", label="Court Name", required=True, placeholder="IN THE COURT OF SESSIONS JUDGE AT SAKET, NEW DELHI"),
            TemplateFieldRequirement(key="applicant_name", label="Applicant Name", required=True, placeholder="Ramesh Kumar"),
            TemplateFieldRequirement(key="respondent_name", label="Respondent / State", required=True, default_value="State (NCT of Delhi) through SHO", placeholder="State of..."),
            TemplateFieldRequirement(key="fir_number", label="FIR / Crime Number", required=False, placeholder="FIR No. 104/2026 or 'Pre-FIR Apprehension'"),
            TemplateFieldRequirement(key="police_station", label="Police Station", required=False, placeholder="Hauz Khas"),
            TemplateFieldRequirement(key="sections_alleged", label="Offences Alleged", required=False, placeholder="Sections 420, 406 IPC / 316, 318 BNS"),
        ],
    ),
    DraftingTemplateItem(
        id=DraftingTemplateId.CRIMINAL_REGULAR_BAIL,
        category=TemplateCategory.CRIMINAL,
        title="Regular Bail Application",
        short_title="Regular Bail",
        provisions=["Section 437/439 CrPC", "Section 480/483 BNSS"],
        court_jurisdiction="Magistrate / Sessions / High Court",
        description="Application seeking release of the accused from judicial or police custody post-arrest.",
        sample_cause_title="IN THE COURT OF CHIEF METROPOLITAN MAGISTRATE / SESSIONS JUDGE",
        fields=[
            TemplateFieldRequirement(key="court_name", label="Court Name", required=True, placeholder="IN THE SESSIONS COURT AT PATIALA HOUSE, NEW DELHI"),
            TemplateFieldRequirement(key="applicant_name", label="Applicant / Accused Name", required=True, placeholder="Suresh Gupta (in Judicial Custody)"),
            TemplateFieldRequirement(key="respondent_name", label="Respondent / State", required=True, default_value="State of NCT of Delhi"),
            TemplateFieldRequirement(key="fir_number", label="FIR Number", required=True, placeholder="FIR No. 412/2026"),
            TemplateFieldRequirement(key="police_station", label="Police Station", required=True, placeholder="Connaught Place"),
            TemplateFieldRequirement(key="sections_alleged", label="Sections Alleged", required=True, placeholder="Sections 379, 411 IPC / 303 BNS"),
        ],
    ),
    DraftingTemplateItem(
        id=DraftingTemplateId.CRIMINAL_QUASHING_482,
        category=TemplateCategory.CRIMINAL,
        title="Petition for Quashing of FIR / Charge-Sheet",
        short_title="FIR Quashing (482)",
        provisions=["Section 482 CrPC", "Section 528 BNSS"],
        court_jurisdiction="High Court (Inherent Powers)",
        description="Petition invoking High Court inherent powers to quash frivolous, vexatious, or purely civil criminal proceedings.",
        sample_cause_title="IN THE HIGH COURT OF JUDICATURE AT BOMBAY / DELHI",
        fields=[
            TemplateFieldRequirement(key="court_name", label="High Court Name", required=True, placeholder="IN THE HIGH COURT OF DELHI AT NEW DELHI"),
            TemplateFieldRequirement(key="applicant_name", label="Petitioner(s) Name", required=True, placeholder="Acme Logistics Pvt. Ltd. & Ors."),
            TemplateFieldRequirement(key="respondent_name", label="Respondents", required=True, default_value="1. State (NCT of Delhi)\n2. De-facto Complainant"),
            TemplateFieldRequirement(key="fir_number", label="FIR / CC Number", required=True, placeholder="FIR No. 205/2025"),
            TemplateFieldRequirement(key="police_station", label="Police Station", required=True, placeholder="Okhla Industrial Area"),
            TemplateFieldRequirement(key="sections_alleged", label="Sections Alleged", required=True, placeholder="Sections 420, 120B IPC"),
        ],
    ),
    DraftingTemplateItem(
        id=DraftingTemplateId.CRIMINAL_SECTION_138_NI,
        category=TemplateCategory.CRIMINAL,
        title="Cheque Bounce Criminal Complaint",
        short_title="S.138 NI Complaint",
        provisions=["Sections 138 & 142 Negotiable Instruments Act, 1881"],
        court_jurisdiction="Metropolitan Magistrate / Judicial Magistrate First Class",
        description="Criminal complaint for dishonour of cheque due to insufficient funds or account closed.",
        sample_cause_title="IN THE COURT OF CHIEF METROPOLITAN MAGISTRATE / JMFC",
        fields=[
            TemplateFieldRequirement(key="court_name", label="Court Name", required=True, placeholder="IN THE COURT OF METROPOLITAN MAGISTRATE (NI ACT), SAKET, NEW DELHI"),
            TemplateFieldRequirement(key="applicant_name", label="Complainant Name", required=True, placeholder="Apex Traders through its Partner Shri A.K. Sharma"),
            TemplateFieldRequirement(key="respondent_name", label="Accused Drawer", required=True, placeholder="M/s Blue Horizon Enterprises & Anr."),
            TemplateFieldRequirement(key="case_number", label="Complaint Number", required=False, placeholder="CC NO. _________ OF 2026"),
        ],
    ),
    DraftingTemplateItem(
        id=DraftingTemplateId.CIVIL_WRIT_PETITION,
        category=TemplateCategory.CONSTITUTIONAL,
        title="Writ Petition under Article 226 / 32",
        short_title="Writ Petition (Civil)",
        provisions=["Article 226 (High Court)", "Article 32 (Supreme Court)"],
        court_jurisdiction="High Court / Supreme Court",
        description="Prerogative writ (Certiorari, Mandamus, Prohibition) for enforcement of Fundamental Rights or administrative illegality.",
        sample_cause_title="IN THE HIGH COURT OF DELHI AT NEW DELHI (EXTRAORDINARY WRIT JURISDICTION)",
        fields=[
            TemplateFieldRequirement(key="court_name", label="High Court / Supreme Court", required=True, placeholder="IN THE HIGH COURT OF DELHI AT NEW DELHI"),
            TemplateFieldRequirement(key="applicant_name", label="Petitioner Name", required=True, placeholder="Association of Independent Taxpayers & Anr."),
            TemplateFieldRequirement(key="respondent_name", label="Respondent Authority", required=True, placeholder="1. Union of India through Secretary\n2. Commissioner of GST"),
            TemplateFieldRequirement(key="case_number", label="Writ Petition Number", required=False, placeholder="W.P. (C) NO. _________ OF 2026"),
        ],
    ),
    DraftingTemplateItem(
        id=DraftingTemplateId.CIVIL_CRIMINAL_SLP,
        category=TemplateCategory.CONSTITUTIONAL,
        title="Special Leave Petition (Article 136)",
        short_title="SLP (Supreme Court)",
        provisions=["Article 136 Constitution of India", "Supreme Court Rules 2013"],
        court_jurisdiction="Supreme Court of India",
        description="Appellate petition invoking discretionary jurisdiction of the Supreme Court against final High Court order.",
        sample_cause_title="IN THE SUPREME COURT OF INDIA (CIVIL / CRIMINAL APPELLATE JURISDICTION)",
        fields=[
            TemplateFieldRequirement(key="court_name", label="Supreme Court of India", required=True, default_value="IN THE SUPREME COURT OF INDIA", placeholder="IN THE SUPREME COURT OF INDIA"),
            TemplateFieldRequirement(key="applicant_name", label="Petitioner(s)", required=True, placeholder="Shri Rajeshwar Nath & Ors."),
            TemplateFieldRequirement(key="respondent_name", label="Respondent(s)", required=True, placeholder="State of Maharashtra & Ors."),
            TemplateFieldRequirement(key="case_number", label="SLP Number", required=False, placeholder="SPECIAL LEAVE PETITION (CRL.) NO. _____ OF 2026"),
        ],
    ),
    DraftingTemplateItem(
        id=DraftingTemplateId.CIVIL_PLAINT_WS,
        category=TemplateCategory.CIVIL,
        title="Plaint / Civil Suit (Order VII CPC)",
        short_title="Civil Plaint (CPC)",
        provisions=["Order VII Code of Civil Procedure, 1908"],
        court_jurisdiction="Civil Judge / District Judge / High Court Original Side",
        description="Substantive civil suit for recovery, declaration, specific performance, or permanent injunction.",
        sample_cause_title="IN THE COURT OF DISTRICT JUDGE (COMMERCIAL), DELHI",
        fields=[
            TemplateFieldRequirement(key="court_name", label="Court Name", required=True, placeholder="IN THE COURT OF THE DISTRICT JUDGE, SAKET, NEW DELHI"),
            TemplateFieldRequirement(key="applicant_name", label="Plaintiff Name", required=True, placeholder="Shri Vinay Malhotra"),
            TemplateFieldRequirement(key="respondent_name", label="Defendant Name", required=True, placeholder="Shri Alok Singhania & Anr."),
            TemplateFieldRequirement(key="case_number", label="Suit Number", required=False, placeholder="CS (COMM) NO. ______ OF 2026"),
        ],
    ),
    DraftingTemplateItem(
        id=DraftingTemplateId.COURT_VAKALATNAMA,
        category=TemplateCategory.CIVIL,
        title="Standard Court Vakalatnama",
        short_title="Vakalatnama",
        provisions=["Advocates Act, 1961", "High Court / Supreme Court Rules"],
        court_jurisdiction="All Courts & Tribunals",
        description="Formal appointment and power of attorney authorizing advocate to represent and plead on client's behalf.",
        sample_cause_title="IN THE COURT OF ______________________________________",
        fields=[
            TemplateFieldRequirement(key="court_name", label="Court Name", required=True, placeholder="IN THE HIGH COURT OF DELHI AT NEW DELHI"),
            TemplateFieldRequirement(key="applicant_name", label="Client / Appointing Party", required=True, placeholder="Shri Arvind Saxena"),
            TemplateFieldRequirement(key="respondent_name", label="Opposite Party", required=True, placeholder="State of NCT of Delhi / M/s ABC Corp"),
            TemplateFieldRequirement(key="case_number", label="Case Number", required=False, placeholder="CASE NO. _________ OF 2026"),
        ],
    ),
    DraftingTemplateItem(
        id=DraftingTemplateId.CIVIL_LEGAL_NOTICE,
        category=TemplateCategory.CIVIL,
        title="Statutory Demand / Legal Notice",
        short_title="Legal Notice",
        provisions=["Code of Civil Procedure", "Indian Contract Act", "Specific Relief Act"],
        court_jurisdiction="Pre-Litigation Chamber Document",
        description="Formal pre-litigation legal notice demanding cure of breach, payment of dues, or specific performance within statutory timeline.",
        sample_cause_title="REGISTERED A.D. / SPEED POST / LEGAL NOTICE",
        fields=[
            TemplateFieldRequirement(key="court_name", label="Notice Header", required=True, default_value="FORMAL LEGAL NOTICE UNDER INSTRUCTIONS OF CLIENT", placeholder="FORMAL LEGAL NOTICE"),
            TemplateFieldRequirement(key="applicant_name", label="Sender / Client Name", required=True, placeholder="Shri Manoj Verma"),
            TemplateFieldRequirement(key="respondent_name", label="Recipient / Noticee Name & Address", required=True, placeholder="M/s Zen Construction Ltd., Connaught Place, New Delhi"),
        ],
    ),
]


class DraftingTemplatesService:
    """Core service for managing templates and synthesizing court pleadings."""

    def __init__(self) -> None:
        self.orchestrator = AIOrchestrator()

    def get_template_catalog(self) -> list[DraftingTemplateItem]:
        """Returns the master list of all 9 court-ready drafting templates."""
        return TEMPLATE_CATALOG

    def get_template_by_id(self, template_id: DraftingTemplateId) -> DraftingTemplateItem | None:
        """Finds a specific template item by enum id."""
        for item in TEMPLATE_CATALOG:
            if item.id == template_id:
                return item
        return None

    async def generate_pleading(self, request: GeneratePleadingRequest) -> GeneratePleadingResponse:
        """Synthesizes a complete court-ready legal pleading with mandatory deficit audit."""
        prompt = build_drafting_prompt(
            template_id=request.template_id.value,
            court_name=request.court_name,
            applicant_name=request.applicant_name,
            applicant_details=request.applicant_details,
            respondent_name=request.respondent_name,
            respondent_details=request.respondent_details,
            case_number=request.case_number,
            factual_narrative=request.factual_narrative,
            grounds_notes=request.grounds_notes,
            interim_prayers=request.interim_prayers,
            main_prayers=request.main_prayers,
            fir_number=request.fir_number,
            police_station=request.police_station,
            sections_alleged=request.sections_alleged,
        )

        logger.info("generating_pleading", template=request.template_id.value, applicant=request.applicant_name)

        # Call AI orchestrator (routes to Gemini/Groq or local Ollama Qwen)
        raw_output = await self.orchestrator.generate_text(
            prompt=prompt,
            system_prompt=DRAFTING_SYSTEM_PROMPT,
            temperature=0.15,
        )

        # Strip any extraneous markdown code fence formatting
        cleaned_html = raw_output.strip()
        cleaned_html = re.sub(r"^```(?:html)?\s*", "", cleaned_html, flags=re.IGNORECASE)
        cleaned_html = re.sub(r"\s*```$", "", cleaned_html)

        # Audit and extract all deficits
        deficits = deficit_guard_service.scan_deficits(cleaned_html, template_id=request.template_id.value)

        # Annotate with interactive HTML chips
        annotated_html = deficit_guard_service.annotate_html_with_deficit_chips(cleaned_html)

        # Calculate word and page metrics
        words = len(re.findall(r"\w+", re.sub(r"<[^>]+>", " ", cleaned_html)))
        estimated_pages = max(1, round(words / 280))

        title = f"{request.template_id.value.replace('_', ' ').title()} - {request.applicant_name}"
        matched_tmpl = self.get_template_by_id(request.template_id)
        if matched_tmpl:
            title = f"{matched_tmpl.short_title} - {request.applicant_name}"

        return GeneratePleadingResponse(
            template_id=request.template_id,
            title=title,
            html_content=annotated_html,
            deficits_found=deficits,
            mandatory_sections=[
                "Cause Title & Memo of Parties",
                "Chronological Facts",
                "Substantive Grounds",
                "Prayer Clause",
                "Verification Affidavit",
            ],
            word_count=words,
            estimated_pages=estimated_pages,
        )


drafting_templates_service = DraftingTemplatesService()

