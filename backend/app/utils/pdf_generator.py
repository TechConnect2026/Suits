"""PDF Generator for Court Judgments and Orders."""

import re
from fpdf import FPDF
from fpdf.enums import XPos, YPos


def sanitize_for_pdf(text: str) -> str:
    """Normalize unicode characters for PDF core fonts (Latin-1)."""
    if not text:
        return ""
    replacements = {
        "\u2018": "'", "\u2019": "'", "\u201a": "'", "\u201b": "'",
        "\u201c": '"', "\u201d": '"', "\u201e": '"', "\u201f": '"',
        "\u2014": " -- ", "\u2013": " - ", "\u2026": "...",
        "\u20b9": "Rs. ", "\u00a0": " ", "\u200b": "",
        "\u2022": "* ", "\u25cf": "* ", "\u25cb": "- ",
        "\u00a7": "Sec. ", "\u00b6": "Para ", "\u2010": "-",
        "\u2011": "-", "\u2012": "-", "\u2015": "--",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    return text.encode("latin-1", "replace").decode("latin-1")


class CourtRecordPDF(FPDF):
    def __init__(self, title: str = "Court Record", court_name: str = "Court Record", cnr: str = ""):
        super().__init__()
        self.doc_title = sanitize_for_pdf(title)[:55]
        self.doc_court = sanitize_for_pdf(court_name)[:50]
        self.doc_cnr = sanitize_for_pdf(cnr)

    def header(self):
        self.set_font("Helvetica", "B", 8)
        self.set_text_color(110, 110, 110)
        top_bar = f"{self.doc_court.upper()}  |  {self.doc_title}" if self.doc_court else self.doc_title
        self.cell(0, 5, top_bar[:80], align="L")
        self.ln(6)
        self.set_draw_color(200, 180, 130)
        self.set_line_width(0.3)
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self.ln(5)

    def footer(self):
        self.set_y(-12)
        self.set_draw_color(220, 220, 220)
        self.set_line_width(0.2)
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self.ln(2)
        self.set_font("Helvetica", "I", 7.5)
        self.set_text_color(140, 140, 140)
        self.cell(0, 5, f"Page {self.page_no()}/{{nb}}  --  Verified Legal Record Archive  |  SUIT", align="C")


def synthesize_court_pdf(
    content: str,
    title: str = "Court Order / Judgment",
    court_name: str = "Court of Record",
    order_date: str = "",
    cnr: str = "",
) -> bytes:
    """Generate a clean, high-resolution court record PDF from markdown or plain text."""
    pdf = CourtRecordPDF(title=title, court_name=court_name, cnr=cnr)
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.set_margins(18, 15, 18)
    pdf.add_page()

    # Front Matter Banner
    pdf.set_font("Helvetica", "B", 13)
    pdf.set_text_color(25, 25, 25)
    pdf.set_x(pdf.l_margin)
    court_heading = court_name.upper() if court_name else "IN THE COURT OF RECORD"
    pdf.multi_cell(0, 6.5, sanitize_for_pdf(court_heading), align="C")
    pdf.ln(2)

    if title and title != court_name:
        pdf.set_font("Helvetica", "B", 11)
        pdf.set_text_color(50, 50, 50)
        pdf.set_x(pdf.l_margin)
        pdf.multi_cell(0, 5.5, sanitize_for_pdf(title), align="C")
        pdf.ln(2)

    if order_date or cnr:
        meta_items = []
        if cnr:
            meta_items.append(f"Record / Case ID: {cnr}")
        if order_date:
            meta_items.append(f"Date: {order_date}")
        pdf.set_font("Helvetica", "I", 8.5)
        pdf.set_text_color(110, 110, 110)
        pdf.set_x(pdf.l_margin)
        pdf.multi_cell(0, 4.5, sanitize_for_pdf("  |  ".join(meta_items)), align="C")
        pdf.ln(3)

    # Separator Line
    pdf.set_draw_color(180, 150, 90)
    pdf.set_line_width(0.6)
    pdf.line(pdf.l_margin, pdf.get_y(), pdf.w - pdf.r_margin, pdf.get_y())
    pdf.ln(6)

    # Document Body
    clean_content = content.replace("\r\n", "\n").replace("\r", "\n").replace("\f", "\n\n")
    lines = clean_content.split("\n")

    pdf.set_text_color(35, 35, 35)
    for raw_line in lines:
        stripped = raw_line.strip()
        if not stripped:
            pdf.ln(2.2)
            continue

        clean = sanitize_for_pdf(stripped)
        pdf.set_x(pdf.l_margin)

        # Markdown Headings
        if clean.startswith("## ") or clean.startswith("### ") or clean.startswith("#### "):
            heading_text = re.sub(r"^#+\s*", "", clean).strip()
            pdf.ln(2.5)
            pdf.set_font("Helvetica", "B", 10.5)
            pdf.set_text_color(25, 25, 25)
            pdf.multi_cell(0, 5, heading_text)
            pdf.ln(1)
            pdf.set_font("Helvetica", "", 9)
            pdf.set_text_color(40, 40, 40)
        elif clean.startswith("> "):
            # Blockquote / judicial excerpt
            quote_text = clean[2:].strip()
            pdf.set_x(pdf.l_margin + 6)
            pdf.set_font("Helvetica", "I", 8.5)
            pdf.set_text_color(70, 70, 70)
            avail_w = (pdf.w - pdf.r_margin) - (pdf.l_margin + 6)
            pdf.multi_cell(avail_w, 4.5, quote_text)
            pdf.set_font("Helvetica", "", 9)
            pdf.set_text_color(40, 40, 40)
        elif clean.startswith("- ") or clean.startswith("* "):
            # List items
            item_text = clean[2:].strip()
            pdf.set_x(pdf.l_margin + 4)
            avail_w = (pdf.w - pdf.r_margin) - (pdf.l_margin + 4)
            pdf.multi_cell(avail_w, 4.6, f"* {item_text}")
        else:
            pdf.multi_cell(0, 4.6, clean)

    return bytes(pdf.output())
