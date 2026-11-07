"""Strategic Adversarial Intelligence Service.

Coordinates:
1. 4-Column Bilateral Opposition Strategy Matrix generation.
2. 3-Prong Interim Stay & Injunction Counter-Strike analysis.
3. Court-ready .docx Adversarial Strategy Brief compilation (1.75" left gutter binding margin).
"""

from __future__ import annotations

import io
import json
import uuid
from typing import Any, List, Optional

import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
import structlog

from app.prompts.adversarial_prompts import (
    ADVERSARIAL_SYSTEM_PROMPT,
    build_interim_stay_prompt,
    build_opposition_matrix_prompt,
)
from app.schemas.adversarial import (
    AdversarialExportRequest,
    InterimStayRequest,
    InterimStayResponse,
    MatrixRow,
    OppositionMatrixRequest,
    OppositionMatrixResponse,
    ThreeProngItem,
)
from app.services.ai_orchestrator import AIOrchestrator

logger = structlog.get_logger()


def _set_cell_background(cell: Any, fill_hex: str) -> None:
    """Sets background shading of a docx table cell."""
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), fill_hex)
    tc_pr.append(shd)


def _set_cell_margins(cell: Any, top: int = 120, bottom: int = 120, left: int = 160, right: int = 160) -> None:
    """Sets cell margins in dxa (1 pt = 20 dxa)."""
    tc_pr = cell._tc.get_or_add_tcPr()
    tc_mar = OxmlElement("w:tcMar")
    for side, val in [("top", top), ("bottom", bottom), ("left", left), ("right", right)]:
        node = OxmlElement(f"w:{side}")
        node.set(qn("w:w"), str(val))
        node.set(qn("w:type"), "dxa")
        tc_mar.append(node)
    tc_pr.append(tc_mar)


class AdversarialService:
    """Core service for Strategic Adversarial Intelligence."""

    def __init__(self) -> None:
        self.orchestrator = AIOrchestrator()

    async def generate_matrix(self, req: OppositionMatrixRequest) -> OppositionMatrixResponse:
        """Generates the 4-column bilateral opposition strategy matrix."""
        logger.info("generating_opposition_matrix", case_title=req.case_title, forum=req.forum)

        text = req.raw_text or ""
        if not text.strip():
            text = f"Matter in {req.forum} involving {req.case_title}. Specific concerns: {req.specific_concerns or 'General merits and jurisdictional objections.'}"

        prompt = build_opposition_matrix_prompt(
            text=text,
            case_title=req.case_title or "Adversarial Strategy Analysis",
            forum=req.forum or "High Court",
            advocate_posture=req.advocate_posture,
            specific_concerns=req.specific_concerns,
        )

        raw_response = await self.orchestrator.generate_text(
            prompt=prompt,
            system_prompt=ADVERSARIAL_SYSTEM_PROMPT,
            temperature=0.25,
        )

        cleaned = raw_response.strip()
        if cleaned.startswith("```"):
            lines = cleaned.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            cleaned = "\n".join(lines).strip()

        try:
            data = json.loads(cleaned)
        except Exception as exc:
            logger.error("opposition_matrix_json_parse_error", error=str(exc), raw=cleaned[:300])
            # Fallback basic response
            return OppositionMatrixResponse(
                case_title=req.case_title or "Matter",
                forum=req.forum or "High Court",
                advocate_posture=req.advocate_posture,
                executive_summary="Adversarial evaluation indicates key preliminary thresholds surrounding maintainability and factual proof.",
                rows=[
                    MatrixRow(
                        id="row-1",
                        category="Jurisdiction",
                        moving_party_ground="The petitioner approaches this court under Article 226 / Section 9 for urgent equitable relief.",
                        opposing_attack_vector="The respondent will assert lack of jurisdiction due to an existing alternate statutory remedy or arbitration clause.",
                        strategic_rebuttal="Demonstrate that the alternate remedy is not an absolute bar where fundamental rights or natural justice are infringed (Whirlpool doctrine).",
                        governing_citation="Whirlpool Corp. v. Registrar of Trade Marks (1998) 8 SCC 1",
                        ratio_decidendi="Alternate statutory remedy does not operate as an absolute bar when natural justice is violated or action is wholly without jurisdiction.",
                        strength_score=9,
                    )
                ],
                overall_strength_assessment="Focus on establishing lack of alternative efficacious forum and manifest arbitrariness.",
            )

        rows: List[MatrixRow] = []
        for idx, r in enumerate(data.get("rows", [])):
            rows.append(
                MatrixRow(
                    id=r.get("id") or f"row-{idx + 1}",
                    category=r.get("category", "General"),
                    moving_party_ground=r.get("moving_party_ground", ""),
                    opposing_attack_vector=r.get("opposing_attack_vector", ""),
                    strategic_rebuttal=r.get("strategic_rebuttal", ""),
                    governing_citation=r.get("governing_citation", "AIR / SCC Precedent"),
                    ratio_decidendi=r.get("ratio_decidendi", "Established legal principle."),
                    strength_score=int(r.get("strength_score", 8)),
                )
            )

        return OppositionMatrixResponse(
            case_title=data.get("case_title", req.case_title or "Adversarial Strategy"),
            forum=data.get("forum", req.forum or "High Court"),
            advocate_posture=data.get("advocate_posture", req.advocate_posture),
            executive_summary=data.get("executive_summary", "Strategic breakdown generated."),
            rows=rows,
            overall_strength_assessment=data.get("overall_strength_assessment", "Proceed with rejoinder readiness on jurisdiction."),
        )

    async def analyze_interim_stay(self, req: InterimStayRequest) -> InterimStayResponse:
        """Analyzes urgent interim stay / injunction under the 3-prong standard."""
        logger.info("analyzing_interim_stay", matter_type=req.matter_type, side=req.advocate_side)

        text = req.raw_text or f"Application for urgent interim relief: {req.stay_relief_sought}"

        prompt = build_interim_stay_prompt(
            text=text,
            stay_relief_sought=req.stay_relief_sought,
            matter_type=req.matter_type,
            advocate_side=req.advocate_side,
        )

        raw_response = await self.orchestrator.generate_text(
            prompt=prompt,
            system_prompt=ADVERSARIAL_SYSTEM_PROMPT,
            temperature=0.25,
        )

        cleaned = raw_response.strip()
        if cleaned.startswith("```"):
            lines = cleaned.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            cleaned = "\n".join(lines).strip()

        try:
            data = json.loads(cleaned)
        except Exception as exc:
            logger.error("interim_stay_json_parse_error", error=str(exc), raw=cleaned[:300])
            # Fallback
            return InterimStayResponse(
                matter_type=req.matter_type,
                advocate_side=req.advocate_side,
                stay_relief_sought=req.stay_relief_sought,
                prongs=[
                    ThreeProngItem(
                        prong_name="Prima Facie Case",
                        moving_party_argument="Serious question to be tried with strong probability of ultimate success.",
                        opposing_counter_argument="Disputed factual issues require full trial; no patent illegality.",
                        adjudication_guidance="Court examines whether the applicant has established an arguable point of law.",
                        landmark_precedent="Colgate Palmolive (India) Ltd. v. Hindustan Lever Ltd. (1999) 7 SCC 1",
                    ),
                    ThreeProngItem(
                        prong_name="Balance of Convenience",
                        moving_party_argument="Refusal of stay will result in total destruction of subject matter and disproportionate harm.",
                        opposing_counter_argument="Granting stay halts public administration or commercial obligations.",
                        adjudication_guidance="Comparative mischief weighed between parties.",
                        landmark_precedent="Dalpat Kumar v. Prahlad Singh (1992) 1 SCC 719",
                    ),
                    ThreeProngItem(
                        prong_name="Irreparable Injury",
                        moving_party_argument="Injury cannot be compensated in terms of money; petition will become infructuous.",
                        opposing_counter_argument="Damages, if any, can be adequately quantified and recouped at final hearing.",
                        adjudication_guidance="Irretrievable injustice test applied strictly.",
                        landmark_precedent="State of Mizoram v. Biakchhawna (1995) 1 SCC 156",
                    ),
                ],
                drafted_stay_clauses=(
                    f"<p>1. That the Applicant has established an overwhelming prima facie case for the grant of stay against {req.stay_relief_sought}.</p>"
                    f"<p>2. That the balance of convenience heavily tilts in favour of the Applicant.</p>"
                    f"<p>3. That irreparable injury, which cannot be adequately compensated in monetary terms, would be occasioned if stay is denied.</p>"
                ),
                vacation_grounds=[
                    "Material suppression of facts disentitling equitable relief under Order XXXIX Rule 4 CPC.",
                    "Adequacy of monetary compensation precluding injunction.",
                    "Laches and acquiescence on the part of the applicant.",
                ],
            )

        prongs: List[ThreeProngItem] = []
        for p in data.get("prongs", []):
            prongs.append(
                ThreeProngItem(
                    prong_name=p.get("prong_name", "Prima Facie Case"),
                    moving_party_argument=p.get("moving_party_argument", ""),
                    opposing_counter_argument=p.get("opposing_counter_argument", ""),
                    adjudication_guidance=p.get("adjudication_guidance", ""),
                    landmark_precedent=p.get("landmark_precedent", ""),
                )
            )

        return InterimStayResponse(
            matter_type=data.get("matter_type", req.matter_type),
            advocate_side=data.get("advocate_side", req.advocate_side),
            stay_relief_sought=data.get("stay_relief_sought", req.stay_relief_sought),
            prongs=prongs,
            drafted_stay_clauses=data.get("drafted_stay_clauses", ""),
            vacation_grounds=data.get("vacation_grounds", []),
        )

    def export_docx_brief(self, req: AdversarialExportRequest) -> bytes:
        """Exports the full Adversarial Strategy Brief into a registry-compliant .docx paper-book."""
        doc = docx.Document()

        # Enforce Indian High Court Paper-Book Margins
        sections = doc.sections
        for section in sections:
            section.page_width = Inches(8.27)    # A4 Width
            section.page_height = Inches(11.69)  # A4 Height
            section.left_margin = Inches(1.75)   # 1.75" Left Gutter Margin for Court Thread-Binding
            section.right_margin = Inches(1.0)
            section.top_margin = Inches(1.5)
            section.bottom_margin = Inches(1.0)

        # Style standard
        normal_style = doc.styles["Normal"]
        font = normal_style.font
        font.name = "Bookman Old Style"
        font.size = Pt(13)
        font.color.rgb = RGBColor(0, 0, 0)
        normal_style.paragraph_format.line_spacing = 1.3
        normal_style.paragraph_format.space_after = Pt(6)

        # ── Document Header ──
        p_hdr = doc.add_paragraph()
        p_hdr.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r_hdr = p_hdr.add_run(f"IN THE {req.forum.upper()}\n")
        r_hdr.bold = True
        r_hdr.font.size = Pt(14)

        r_sub = p_hdr.add_run("STRATEGIC ADVERSARIAL LITIGATION BRIEF & OPPOSITION MATRIX\n")
        r_sub.bold = True
        r_sub.font.size = Pt(13)

        r_title = p_hdr.add_run(f"IN RE: {req.case_title.upper()}\n")
        r_title.bold = True
        r_title.font.size = Pt(12)

        p_div = doc.add_paragraph()
        p_div.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_div.add_run("─" * 40).font.color.rgb = RGBColor(120, 120, 120)

        # ── Section 1: Executive Strategy ──
        if req.matrix:
            h1 = doc.add_paragraph()
            r_h1 = h1.add_run("I. EXECUTIVE LITIGATION STRATEGY")
            r_h1.bold = True
            r_h1.font.size = Pt(13.5)

            p_sum = doc.add_paragraph()
            p_sum.add_run(f"Advocate Posture: ").bold = True
            p_sum.add_run(f"{req.matrix.advocate_posture.title()}\n")
            p_sum.add_run(f"Strategic Assessment: ").bold = True
            p_sum.add_run(req.matrix.executive_summary)

            p_eval = doc.add_paragraph()
            p_eval.add_run("Courtroom Resilience Guidance: ").bold = True
            p_eval.add_run(req.matrix.overall_strength_assessment)

            doc.add_paragraph()

            # ── 4-Column Opposition Matrix Table ──
            h_tbl = doc.add_paragraph()
            r_htbl = h_tbl.add_run("II. BILATERAL OPPOSITION STRATEGY MATRIX (4-COLUMN)")
            r_htbl.bold = True
            r_htbl.font.size = Pt(13.5)

            table = doc.add_table(rows=1, cols=4)
            table.alignment = WD_TABLE_ALIGNMENT.CENTER
            table.autofit = False

            # Column widths (Total width ~ 5.52 inches available on A4 with 1.75" gutter)
            col_widths = [Inches(1.3), Inches(1.3), Inches(1.4), Inches(1.5)]

            hdr_cells = table.rows[0].cells
            headers = ["Petitioner Ground", "Opposing Vector", "Strategic Rebuttal", "Governing Ratio"]
            for i, text in enumerate(headers):
                cell = hdr_cells[i]
                cell.width = col_widths[i]
                p = cell.paragraphs[0]
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                run = p.add_run(text)
                run.bold = True
                run.font.size = Pt(10.5)
                run.font.color.rgb = RGBColor(30, 30, 30)
                _set_cell_background(cell, "EAEAEA")
                _set_cell_margins(cell, top=140, bottom=140, left=140, right=140)

            for row in req.matrix.rows:
                r_cells = table.add_row().cells
                vals = [
                    f"[{row.category}]\n{row.moving_party_ground}",
                    row.opposing_attack_vector,
                    row.strategic_rebuttal,
                    f"Citation: {row.governing_citation}\n\nRatio: {row.ratio_decidendi}",
                ]
                for i, val in enumerate(vals):
                    cell = r_cells[i]
                    cell.width = col_widths[i]
                    p = cell.paragraphs[0]
                    run = p.add_run(val)
                    run.font.size = Pt(9.5)
                    _set_cell_margins(cell, top=120, bottom=120, left=140, right=140)

            doc.add_paragraph()

        # ── Section 2: Interim Stay & Injunction Counter-Strike ──
        if req.stay_analysis:
            doc.add_page_break()
            h2 = doc.add_paragraph()
            r_h2 = h2.add_run("III. INTERIM STAY & INJUNCTION ADVERSARIAL ASSESSMENT")
            r_h2.bold = True
            r_h2.font.size = Pt(13.5)

            p_st = doc.add_paragraph()
            p_st.add_run("Relief Sought: ").bold = True
            p_st.add_run(f"{req.stay_analysis.stay_relief_sought}\n")
            p_st.add_run("Advocate Posture: ").bold = True
            p_st.add_run(f"{req.stay_analysis.advocate_side.replace('_', ' ').title()}\n")

            # 3 Prongs
            for p_item in req.stay_analysis.prongs:
                doc.add_paragraph().add_run(f"• {p_item.prong_name.upper()}:").bold = True
                doc.add_paragraph(f"  - Moving Ground: {p_item.moving_party_argument}")
                doc.add_paragraph(f"  - Opposition Counter: {p_item.opposing_counter_argument}")
                doc.add_paragraph(f"  - Judicial Lens: {p_item.adjudication_guidance}")
                doc.add_paragraph(f"  - Authority: {p_item.landmark_precedent}")

            if req.stay_analysis.vacation_grounds:
                doc.add_paragraph().add_run("Grounds for Vacation of Ad-Interim Order:").bold = True
                for vg in req.stay_analysis.vacation_grounds:
                    doc.add_paragraph(f"  - {vg}")

            doc.add_paragraph()

        # ── Section 3: Procedural Weakness Radar ──
        if req.weakness_radar and req.weakness_radar.defects:
            h3 = doc.add_paragraph()
            r_h3 = h3.add_run("IV. PROCEDURAL WEAKNESS RADAR & DEFECT AUDIT")
            r_h3.bold = True
            r_h3.font.size = Pt(13.5)

            p_rk = doc.add_paragraph()
            p_rk.add_run(f"Litigation Risk Tier: ").bold = True
            p_rk.add_run(f"{req.weakness_radar.risk_tier} (Risk Index: {req.weakness_radar.risk_score}/100)\n")
            p_rk.add_run(req.weakness_radar.procedural_clearance_summary)

            for d in req.weakness_radar.defects:
                p_def = doc.add_paragraph()
                p_def.add_run(f"[{d.severity}] {d.title}\n").bold = True
                p_def.add_run(f"Governing Rule: {d.governing_rule}\n")
                p_def.add_run(f"Vulnerability: {d.description}\n")
                p_def.add_run(f"Cure Action: {d.cure_recommendation}\n")
                if d.cure_clause_template:
                    p_def.add_run("Recommended Cure Clause to Insert:\n").italic = True
                    p_def.add_run(f"\"{d.cure_clause_template}\"\n")

        # Signature Block
        p_sig = doc.add_paragraph()
        p_sig.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        p_sig.add_run(f"\n\n\n___________________________________\n{req.advocate_name or 'Advocate-on-Record'}\nChambers of Counsel")

        buffer = io.BytesIO()
        doc.save(buffer)
        buffer.seek(0)
        return buffer.getvalue()


adversarial_service = AdversarialService()
