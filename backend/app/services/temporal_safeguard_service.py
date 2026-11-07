"""Temporal Incident-Date Safeguard Service.

Enforces Article 20(1) of the Constitution of India and Section 531 of the BNSS, 2023:
1. Pre-July 1, 2024 offences: Substantive liability MUST strictly remain under IPC 1860.
   Charging or pleading under BNS 2023 is an unconstitutional ex post facto violation.
2. Post-July 1, 2024 offences: Substantive liability MUST be under BNS 2023.
3. Hybrid Transition: Offence prior to July 1, 2024 + FIR/trial post July 1, 2024
   requires Substantive = IPC, Procedure = BNSS.
"""

from __future__ import annotations

import re
from datetime import datetime
from typing import List, Optional, Tuple

import structlog

from app.schemas.era_transition import (
    AutoRemedyItem,
    TemporalInspectionRequest,
    TemporalInspectionResponse,
    TemporalViolationItem,
)

logger = structlog.get_logger()

# Benchmark Statutory Cutoff: 01 July 2024
BENCHMARK_CUTOFF = datetime(2024, 7, 1)

# Canonical Substantive Mappings (IPC <-> BNS)
IPC_TO_BNS_MAP = {
    "420": ("318(4)", "Cheating"),
    "406": ("316", "Criminal Breach of Trust"),
    "302": ("103", "Murder"),
    "304A": ("106", "Death by Negligence"),
    "376": ("64", "Rape"),
    "498A": ("85/86", "Cruelty to Woman"),
    "323": ("115(2)", "Voluntarily Causing Hurt"),
    "341": ("126(2)", "Wrongful Restraint"),
    "506": ("351(2)", "Criminal Intimidation"),
    "120B": ("61(2)", "Criminal Conspiracy"),
    "34": ("3(5)", "Common Intention"),
    "149": ("190", "Unlawful Assembly"),
}

BNS_TO_IPC_MAP = {
    "318(4)": ("420", "Cheating"),
    "318": ("417/420", "Cheating"),
    "316": ("406", "Criminal Breach of Trust"),
    "103": ("302", "Murder"),
    "106": ("304A", "Death by Negligence"),
    "64": ("376", "Rape"),
    "85": ("498A", "Cruelty to Woman"),
    "86": ("498A", "Cruelty to Woman"),
    "115(2)": ("323", "Voluntarily Causing Hurt"),
    "126(2)": ("341", "Wrongful Restraint"),
    "351(2)": ("506", "Criminal Intimidation"),
    "61(2)": ("120B", "Criminal Conspiracy"),
    "3(5)": ("34", "Common Intention"),
    "190": ("149", "Unlawful Assembly"),
}


class TemporalSafeguardService:
    """Core auditor for criminal law date-of-offence constitutional boundaries."""

    def _parse_date(self, date_str: str) -> Optional[datetime]:
        """Parses various Indian court date formats into a datetime object."""
        if not date_str or not date_str.strip():
            return None
        cleaned = date_str.strip().replace("st", "").replace("nd", "").replace("rd", "").replace("th", "")
        formats = [
            "%Y-%m-%d",
            "%d-%m-%Y",
            "%d/%m/%Y",
            "%Y/%m/%d",
            "%d %B %Y",
            "%d %b %Y",
            "%B %d, %Y",
            "%b %d, %Y",
            "%d %m %Y",
        ]
        for fmt in formats:
            try:
                return datetime.strptime(cleaned, fmt)
            except ValueError:
                continue

        # Regex search for YYYY-MM-DD or DD/MM/YYYY inside free text
        match = re.search(r"(\d{4}[-/]\d{1,2}[-/]\d{1,2})|(\d{1,2}[-/]\d{1,2}[-/]\d{4})", cleaned)
        if match:
            matched_str = match.group(0)
            for fmt in ["%Y-%m-%d", "%Y/%m/%d", "%d-%m-%Y", "%d/%m/%Y"]:
                try:
                    return datetime.strptime(matched_str, fmt)
                except ValueError:
                    continue
        return None

    def inspect_temporal_incident(self, req: TemporalInspectionRequest) -> TemporalInspectionResponse:
        """Audits incident and FIR dates against the July 1, 2024 constitutional cutoff."""
        logger.info("inspecting_temporal_incident", incident=req.incident_date, fir=req.fir_date)

        incident_dt = self._parse_date(req.incident_date)
        if incident_dt is None:
            # Default to current date if completely unparseable
            incident_dt = datetime.now()

        fir_dt = self._parse_date(req.fir_date) if req.fir_date else None

        is_pre_incident = incident_dt < BENCHMARK_CUTOFF
        is_pre_fir = (fir_dt < BENCHMARK_CUTOFF) if fir_dt else is_pre_incident

        # Determine regime
        if is_pre_incident and is_pre_fir:
            regime = "PURE_LEGACY_IPC"
            substantive_code = "IPC"
            procedural_code = "CrPC"
            evidence_code = "IEA"
            assessment = (
                "PURE LEGACY REGIME: Both the alleged offence and the FIR/proceedings precede 1 July 2024. "
                "Substantive penal charges must strictly lie under the Indian Penal Code, 1860. "
                "Proceedings are governed by the Code of Criminal Procedure, 1973 under Section 531(2)(a) BNSS."
            )
        elif is_pre_incident and not is_pre_fir:
            regime = "HYBRID_TRANSITION_ERA"
            substantive_code = "IPC"
            procedural_code = "BNSS"
            evidence_code = "BSA"
            assessment = (
                "HYBRID TRANSITION REGIME: The alleged offence occurred PRIOR to 1 July 2024, but the FIR/petition "
                "was initiated ON OR AFTER 1 July 2024. Under Article 20(1) of the Constitution of India, substantive penal "
                "liability MUST strictly remain under the IPC. However, procedural petitions and investigation steps "
                "fall under the Bharatiya Nagarik Suraksha Sanhita, 2023 per Delhi High Court in Ajay Kumar Gupta."
            )
        else:
            regime = "PURE_NEW_BNS"
            substantive_code = "BNS"
            procedural_code = "BNSS"
            evidence_code = "BSA"
            assessment = (
                "PURE NEW REGIME: The alleged offence and all consequential proceedings occurred on or after 1 July 2024. "
                "Substantive penal liability is strictly governed by the Bharatiya Nyaya Sanhita, 2023. "
                "Citing legacy IPC sections is improper and invites registry defect notices."
            )

        violations: List[TemporalViolationItem] = []
        remedies: List[AutoRemedyItem] = []

        draft_content = req.draft_text_or_sections or ""

        # Audit Text or Sections
        if draft_content.strip():
            # Check 1: Pre-cutoff incident citing BNS penal sections -> Unconstitutional Article 20(1) violation!
            if is_pre_incident:
                for bns_sec, (ipc_sec, title) in BNS_TO_IPC_MAP.items():
                    pattern = rf"\b(?:section|sec\.?|u/s|s\.)\s*{re.escape(bns_sec)}\b(?:\s*(?:of\s+)?(?:the\s+)?(?:bns|bharatiya nyaya sanhita))?"
                    if re.search(pattern, draft_content, re.IGNORECASE):
                        violations.append(
                            TemporalViolationItem(
                                violation_code="EX_POST_FACTO_PENAL_VIOLATION",
                                title=f"Ex Post Facto Penal Violation: Section {bns_sec} BNS cited for pre-cutoff act",
                                description=(
                                    f"The alleged incident occurred on {incident_dt.strftime('%d %B %Y')} (prior to 1 July 2024). "
                                    f"Charging or prosecuting under Section {bns_sec} BNS ({title}) violates Article 20(1) of the "
                                    "Constitution of India, which guarantees protection against ex post facto penal legislation. "
                                    f"The constitutionally mandated charge is Section {ipc_sec} IPC."
                                ),
                                problematic_citation=f"Section {bns_sec} BNS",
                                correct_statutory_reference=f"Section {ipc_sec} IPC",
                                severity="CRITICAL",
                            )
                        )
                        remedies.append(
                            AutoRemedyItem(
                                original_text=f"Section {bns_sec} BNS",
                                replacement_text=f"Section {ipc_sec} IPC",
                                statute_type="SUBSTANTIVE",
                                rationale=f"Offence date precedes July 1, 2024. Enforce Article 20(1) protection against ex post facto penal law.",
                            )
                        )

            # Check 2: Post-cutoff incident citing repealed IPC sections
            if not is_pre_incident:
                for ipc_sec, (bns_sec, title) in IPC_TO_BNS_MAP.items():
                    pattern = rf"\b(?:section|sec\.?|u/s|s\.)\s*{re.escape(ipc_sec)}\b(?:\s*(?:of\s+)?(?:the\s+)?(?:ipc|indian penal code))?"
                    if re.search(pattern, draft_content, re.IGNORECASE):
                        violations.append(
                            TemporalViolationItem(
                                violation_code="REPEALED_SUBSTANTIVE_LAW_CITED",
                                title=f"Repealed Substantive Law Cited: Section {ipc_sec} IPC",
                                description=(
                                    f"The alleged incident occurred on {incident_dt.strftime('%d %B %Y')} (after 1 July 2024). "
                                    f"The Indian Penal Code, 1860 stands repealed for offences committed after the cutoff date. "
                                    f"The operative penal provision is Section {bns_sec} BNS ({title})."
                                ),
                                problematic_citation=f"Section {ipc_sec} IPC",
                                correct_statutory_reference=f"Section {bns_sec} BNS",
                                severity="HIGH",
                            )
                        )
                        remedies.append(
                            AutoRemedyItem(
                                original_text=f"Section {ipc_sec} IPC",
                                replacement_text=f"Section {bns_sec} BNS",
                                statute_type="SUBSTANTIVE",
                                rationale="Offence date is post-July 1, 2024. Substitute repealed IPC provision with active BNS code.",
                            )
                        )

        # Build formal preliminary objection / submission declaration
        if regime == "HYBRID_TRANSITION_ERA":
            declaration = (
                f"PRELIMINARY SUBMISSION ON STATUTORY REGIME:\n"
                f"It is respectfully submitted that whereas the incident giving rise to the instant proceedings is alleged "
                f"to have occurred on {incident_dt.strftime('%d.%m.%Y')}—prior to the enforcement of the new criminal enactments on "
                f"1st July 2024—substantive penal liability is strictly governed by the Indian Penal Code, 1860, in observance "
                f"of the constitutional mandate enshrined under Article 20(1) of the Constitution of India. However, the instant "
                f"application having been preferred before this Hon'ble Court post-enactment, the procedural remedy is appropriately "
                f"invoked under the Bharatiya Nagarik Suraksha Sanhita, 2023."
            )
        elif regime == "PURE_LEGACY_IPC":
            declaration = (
                f"PRELIMINARY SUBMISSION ON STATUTORY REGIME:\n"
                f"It is submitted that both the alleged incident ({incident_dt.strftime('%d.%m.%Y')}) and the initial proceedings "
                f"predate 1st July 2024. In terms of Section 531(2)(a) of the BNSS, 2023, the entire inquiry, investigation, and "
                f"substantive trial continue to be governed strictly by the Code of Criminal Procedure, 1973 and the Indian Penal Code, 1860."
            )
        else:
            declaration = (
                f"PRELIMINARY SUBMISSION ON STATUTORY REGIME:\n"
                f"The alleged incident having occurred on {incident_dt.strftime('%d.%m.%Y')} (subsequent to 1st July 2024), the matter "
                f"is governed in its entirety by the Bharatiya Nyaya Sanhita, 2023 and the Bharatiya Nagarik Suraksha Sanhita, 2023."
            )

        return TemporalInspectionResponse(
            incident_date_resolved=incident_dt.strftime("%Y-%m-%d"),
            fir_date_resolved=fir_dt.strftime("%Y-%m-%d") if fir_dt else None,
            is_pre_cutoff_incident=is_pre_incident,
            is_pre_cutoff_fir=is_pre_fir,
            statutory_regime=regime,
            substantive_code_required=substantive_code,
            procedural_code_required=procedural_code,
            evidence_act_required=evidence_code,
            constitutional_assessment=assessment,
            violations=violations,
            remedies=remedies,
            court_declaration_snippet=declaration,
        )


temporal_safeguard_service = TemporalSafeguardService()

