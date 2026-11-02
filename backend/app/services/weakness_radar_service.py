"""Procedural Weakness Radar Service.

Implements rule-based deterministic pre-scanning coupled with LLM contextual analysis
to surface fatal procedural defects, statutory bars, and evidentiary gaps under Indian law.
"""

from __future__ import annotations

import re
import uuid
from typing import Any, List
import structlog

from app.prompts.adversarial_prompts import (
    ADVERSARIAL_SYSTEM_PROMPT,
    build_weakness_radar_prompt,
)
from app.schemas.adversarial import DefectItem, WeaknessRadarResponse
from app.services.ai_orchestrator import AIOrchestrator

logger = structlog.get_logger()


class WeaknessRadarService:
    """Evaluates pleadings for procedural and statutory vulnerabilities."""

    def __init__(self) -> None:
        self.orchestrator = AIOrchestrator()

    def run_deterministic_rules(self, text: str) -> List[dict[str, Any]]:
        """Scans pleading text deterministically for common Indian court procedural gaps."""
        findings: List[dict[str, Any]] = []
        lower = text.lower()

        # 1. Commercial Suit & Section 12A Commercial Courts Act
        is_commercial = bool(
            re.search(r"commercial\s+suit|cs\s*\(comm\)|commercial\s+court|commercial\s+division", lower)
        )
        has_sec_12a = bool(
            re.search(r"section\s+12\s*a|pre-institution\s+mediation|urgent\s+interim\s+relief", lower)
        )
        if is_commercial and not has_sec_12a:
            findings.append({
                "rule_id": "COMM_SEC_12A",
                "severity": "CRITICAL",
                "category": "Statutory Bar",
                "title": "Mandatory Pre-Institution Mediation Deficit (Sec 12A Commercial Courts Act)",
                "description": (
                    "This appears to be a Commercial Suit, but there is no averment regarding compliance with "
                    "mandatory pre-institution mediation under Section 12A CCA 2015, nor an express plea for "
                    "urgent interim relief under the Patil Automation exception."
                ),
                "governing_rule": "Section 12A, Commercial Courts Act, 2015; Patil Automation (2022) 10 SCC 1",
                "cure_recommendation": (
                    "Incorporate a dedicated paragraph pleading urgent interim relief (e.g. ad-interim injunction) "
                    "to legally dispense with pre-institution mediation, or attach the Non-Starter Report."
                ),
                "cure_clause_template": (
                    "That the Plaintiff seeks urgent ad-interim ex-parte orders of injunction. "
                    "Consequently, in terms of Section 12A of the Commercial Courts Act, 2015 and the law laid down by "
                    "the Hon'ble Supreme Court in Patil Automation Pvt. Ltd. v. Rakheja Engineers (2022) 10 SCC 1, "
                    "the requirement of pre-institution mediation is lawfully dispensed with."
                ),
            })

        # 2. Electronic Evidence Certificate (Sec 65B IEA / Sec 63 BSA)
        has_electronic_evidence = bool(
            re.search(r"whatsapp|email|electronic\s+record|cctv|printout|sms|call\s+recording|screenshot", lower)
        )
        has_cert_65b = bool(
            re.search(r"65\s*-?\s*b|section\s+63\s+of\s+the\s+bharatiya\s+sakshya|certificate\s+under\s+section\s+65", lower)
        )
        if has_electronic_evidence and not has_cert_65b:
            findings.append({
                "rule_id": "EVID_SEC_65B",
                "severity": "HIGH",
                "category": "Evidentiary Gap",
                "title": "Missing Electronic Records Certificate (Section 65B IEA / Section 63 BSA)",
                "description": (
                    "The pleading references electronic records (emails, WhatsApp, screenshots, or printouts) "
                    "without averring the filing of a mandatory statutory certificate under Section 65B of the "
                    "Indian Evidence Act, 1872 or Section 63 of the Bharatiya Sakshya Adhiniyam, 2023."
                ),
                "governing_rule": "Arjun Panditrao Khotkar v. Kailash Kushanrao Gorantyal (2020) 7 SCC 1",
                "cure_recommendation": "Attach a verified affidavit under Section 65B IEA / Section 63 BSA by the device custodian.",
                "cure_clause_template": (
                    "That true printouts of the aforesaid electronic records/emails are annexed herewith as Annexure P-__, "
                    "and the requisite Statutory Certificate under Section 65B of the Indian Evidence Act, 1872 / "
                    "Section 63 of the Bharatiya Sakshya Adhiniyam, 2023 duly affirmed by the custodian of the computer system is filed alongside."
                ),
            })

        # 3. Section 80 CPC Notice against Government
        is_govt_defendant = bool(
            re.search(r"union\s+of\s+india|state\s+of\s+|collector|municipal\s+corporation|deputy\s+commissioner", lower)
        )
        is_suit = bool(re.search(r"plaint|suit\s+for|in\s+the\s+court\s+of\s+civil\s+judge|district\s+judge", lower))
        has_sec_80 = bool(re.search(r"section\s+80|notice\s+under\s+section\s+80|leave\s+under\s+section\s+80\(2\)", lower))
        if is_govt_defendant and is_suit and not has_sec_80:
            findings.append({
                "rule_id": "CPC_SEC_80",
                "severity": "CRITICAL",
                "category": "Statutory Bar",
                "title": "Mandatory Two-Month Statutory Notice Bar (Section 80 CPC)",
                "description": (
                    "The suit names the Government / public officer as a defendant, but fails to aver the service of "
                    "a mandatory 2-month statutory notice under Section 80(1) CPC, or an application for leave under Section 80(2) CPC."
                ),
                "governing_rule": "Section 80, Code of Civil Procedure, 1908",
                "cure_recommendation": "Plead delivery of Section 80 notice with postal receipts, or move an urgent leave application u/s 80(2) CPC.",
                "cure_clause_template": (
                    "That since the matter involves extreme urgency and requires immediate ex-parte relief, "
                    "the Plaintiff has filed an accompanying application seeking leave of this Hon'ble Court under Section 80(2) CPC "
                    "to institute the present suit without serving the two months' statutory notice under Section 80(1) CPC."
                ),
            })

        # 4. Cheque Bounce & Section 141 NI Act Corporate Averments
        is_ni_act = bool(re.search(r"138\s+negotiable|section\s+138|cheque\s+bounce", lower))
        has_company_accused = bool(re.search(r"pvt\.\s*ltd|ltd\.|limited|llp|director|authorized\s+signatory", lower))
        has_sec_141_averment = bool(
            re.search(r"in\s*-?\s*charge\s+of\s+and\s+responsible|day-to-day\s+affairs|conduct\s+of\s+the\s+business", lower)
        )
        if is_ni_act and has_company_accused and not has_sec_141_averment:
            findings.append({
                "rule_id": "NI_SEC_141",
                "severity": "HIGH",
                "category": "Pleading Defect",
                "title": "Defective Section 141 NI Act Vicarious Liability Averments",
                "description": (
                    "Corporate directors are named as accused in this Section 138 complaint without the mandatory "
                    "specific averment that they were in charge of and responsible to the company for the conduct of its business."
                ),
                "governing_rule": "SMS Pharmaceuticals Ltd. v. Neeta Bhalla (2005) 8 SCC 89; Sunita Palita v. Panchami Stone Quarry (2022) 10 SCC 152",
                "cure_recommendation": "Insert the exact statutory words of Section 141(1) NI Act specifying each director's active involvement.",
                "cure_clause_template": (
                    "That Accused No. 2 and 3 are the Directors of Accused No. 1 Company and at the material time of issuance "
                    "and dishonour of the subject cheque, were actively in charge of, managing, and responsible to the company for "
                    "the day-to-day conduct of its business and management affairs."
                ),
            })

        # 5. Article 226 Alternate Remedy Defense
        is_writ = bool(re.search(r"article\s+226|writ\s+petition|extraordinary\s+original", lower))
        has_alt_remedy_plea = bool(
            re.search(r"alternate\s+remedy|efficacious\s+remedy|whirlpool|no\s+other\s+speedy|inadequacy\s+of", lower)
        )
        if is_writ and not has_alt_remedy_plea:
            findings.append({
                "rule_id": "WRIT_ALT_REMEDY",
                "severity": "MEDIUM",
                "category": "Maintainability",
                "title": "Absence of Averment on Exhaustion / Inefficacy of Alternate Remedy",
                "description": (
                    "In a Writ Petition under Article 226, opposing counsel routinely raises the preliminary objection "
                    "of an existing statutory alternate remedy. The petition must explicitly plead why the alternate remedy is inefficacious or inapplicable."
                ),
                "governing_rule": "Whirlpool Corp. v. Registrar of Trade Marks (1998) 8 SCC 1; Godrej Sara Lee Ltd. v. Excise & Taxation Officer (2023) 10 SCC 700",
                "cure_recommendation": "Plead that the impugned action violates fundamental rights or principles of natural justice, establishing maintainability under Whirlpool exceptions.",
                "cure_clause_template": (
                    "That the Petitioner has no other efficacious, speedy, or alternative statutory remedy except to approach "
                    "this Hon'ble Court under Article 226 of the Constitution of India. The availability of an alternate forum does not bar "
                    "this petition as the impugned order has been passed in complete violation of fundamental rights and the principles of natural justice (Whirlpool Corporation doctrine)."
                ),
            })

        return findings

    async def scan_pleading(
        self,
        text: str,
        court_level: str = "High Court",
    ) -> WeaknessRadarResponse:
        """Runs the deterministic rules scanner followed by LLM contextual audit."""
        logger.info("running_weakness_radar_scan", text_len=len(text), court_level=court_level)

        deterministic_findings = self.run_deterministic_rules(text)

        prompt = build_weakness_radar_prompt(
            text=text,
            court_level=court_level,
            deterministic_findings=deterministic_findings,
        )

        try:
            raw_response = await self.orchestrator.generate_text(
                prompt=prompt,
                system_prompt=ADVERSARIAL_SYSTEM_PROMPT,
                temperature=0.2,
            )

            # Clean JSON formatting fences
            cleaned = raw_response.strip()
            if cleaned.startswith("```"):
                lines = cleaned.splitlines()
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].strip() == "```":
                    lines = lines[:-1]
                cleaned = "\n".join(lines).strip()

            import json
            data = json.loads(cleaned)

            defects: List[DefectItem] = []
            for idx, d in enumerate(data.get("defects", [])):
                defects.append(
                    DefectItem(
                        id=d.get("id") or f"defect-{idx + 1}",
                        severity=d.get("severity", "MEDIUM"),
                        category=d.get("category", "Procedural Defect"),
                        title=d.get("title", "Procedural Irregularity"),
                        description=d.get("description", ""),
                        governing_rule=d.get("governing_rule", "Registry Practice Directions"),
                        cure_recommendation=d.get("cure_recommendation", "Review and rectify prior to filing."),
                        cure_clause_template=d.get("cure_clause_template"),
                    )
                )

            # Ensure any critical deterministic rule not covered by LLM is preserved
            existing_titles = {d.title for d in defects}
            for det in deterministic_findings:
                if det["title"] not in existing_titles:
                    defects.append(
                        DefectItem(
                            id=f"det-{uuid.uuid4().hex[:6]}",
                            severity=det["severity"],
                            category=det["category"],
                            title=det["title"],
                            description=det["description"],
                            governing_rule=det["governing_rule"],
                            cure_recommendation=det["cure_recommendation"],
                            cure_clause_template=det.get("cure_clause_template"),
                        )
                    )

            # Compute or validate risk score
            critical_count = sum(1 for d in defects if d.severity == "CRITICAL")
            high_count = sum(1 for d in defects if d.severity == "HIGH")
            medium_count = sum(1 for d in defects if d.severity == "MEDIUM")

            computed_score = min(100, critical_count * 35 + high_count * 20 + medium_count * 10)
            risk_score = max(data.get("risk_score", computed_score), computed_score)

            if risk_score >= 70:
                risk_tier = "CRITICAL"
            elif risk_score >= 40:
                risk_tier = "MODERATE"
            elif risk_score > 0:
                risk_tier = "LOW"
            else:
                risk_tier = "CLEAN"

            return WeaknessRadarResponse(
                risk_score=risk_score,
                risk_tier=risk_tier,
                total_defects=len(defects),
                defects=defects,
                procedural_clearance_summary=data.get(
                    "procedural_clearance_summary",
                    f"Audit completed: {len(defects)} procedural/statutory points flagged for attention."
                ),
            )

        except Exception as exc:
            logger.warning("weakness_radar_llm_failed_fallback_to_rules", error=str(exc))
            # Fallback gracefully to deterministic findings
            defects: List[DefectItem] = []
            for idx, det in enumerate(deterministic_findings):
                defects.append(
                    DefectItem(
                        id=f"rule-{idx + 1}",
                        severity=det["severity"],
                        category=det["category"],
                        title=det["title"],
                        description=det["description"],
                        governing_rule=det["governing_rule"],
                        cure_recommendation=det["cure_recommendation"],
                        cure_clause_template=det.get("cure_clause_template"),
                    )
                )

            critical_count = sum(1 for d in defects if d.severity == "CRITICAL")
            high_count = sum(1 for d in defects if d.severity == "HIGH")
            medium_count = sum(1 for d in defects if d.severity == "MEDIUM")
            computed_score = min(100, critical_count * 35 + high_count * 20 + medium_count * 10)

            return WeaknessRadarResponse(
                risk_score=computed_score,
                risk_tier="CRITICAL" if computed_score >= 70 else ("MODERATE" if computed_score >= 40 else ("LOW" if computed_score > 0 else "CLEAN")),
                total_defects=len(defects),
                defects=defects,
                procedural_clearance_summary=(
                    f"Deterministic scan flagged {len(defects)} essential statutory/procedural issues to rectify."
                ),
            )


weakness_radar_service = WeaknessRadarService()
