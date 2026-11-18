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
        self.doc_title = sanitize_for_pdf(title)[:60]
        self.doc_court = sanitize_for_pdf(court_name)[:50]
        self.doc_cnr = sanitize_for_pdf(cnr)

    def header(self):
        self.set_font("Times", "B", 8.5)
        self.set_text_color(100, 100, 100)
        top_bar = f"{self.doc_court.upper()}  |  {self.doc_title}" if self.doc_court else self.doc_title
        self.cell(0, 5, top_bar[:85], align="L")
        self.ln(6)
        self.set_draw_color(180, 150, 90)
        self.set_line_width(0.3)
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self.ln(5)

    def footer(self):
        self.set_y(-12)
        self.set_draw_color(210, 210, 210)
        self.set_line_width(0.2)
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self.ln(2)
        self.set_font("Times", "I", 8)
        self.set_text_color(130, 130, 130)
        self.cell(0, 5, f"Page {self.page_no()}/{{nb}}  --  Verified Legal Record Archive  |  SUITS", align="C")


def _extract_and_sanitize_signatures(content: str) -> tuple[str, list[str]]:
    """Detect and separate digital signature metadata blocks from the main text."""
    try:
        from app.utils.kanoon_formatter import clean_court_text_and_extract_signatures
    except ImportError:
        from backend.app.utils.kanoon_formatter import clean_court_text_and_extract_signatures
    cleaned, sig_dicts = clean_court_text_and_extract_signatures(content)
    signatures = []
    for s in sig_dicts:
        sig_str = f"Signatory: {s['signer']}"
        if s.get("date"):
            sig_str += f"  |  {s['date']}"
        sig_str += f"  |  {s.get('status', 'Digitally Signed')}"
        signatures.append(sig_str)
    return cleaned, signatures


def _reflow_paragraphs(text: str) -> list[tuple[str, str]]:
    """Parse raw judgment text into reflowed structural blocks.
    
    Returns a list of (block_type, content):
      - ('court_banner', text)
      - ('case_meta', text)
      - ('heading', text)
      - ('quote', text)
      - ('list_item', text)
      - ('paragraph', text)
    """
    clean_content = text.replace("\r\n", "\n").replace("\r", "\n").replace("\f", "\n\n")
    raw_lines = [l.strip() for l in clean_content.split("\n")]
    
    court_banner_re = re.compile(
        r"^(?:IN THE (?:SUPREME|HIGH) COURT|CIVIL APPELLATE|CRIMINAL APPELLATE|"
        r"ORIGINAL JURISDICTION|APPELLATE JURISDICTION|CIVIL APPEAL|CRIMINAL APPEAL|"
        r"SPECIAL LEAVE PETITION|WRIT PETITION)",
        re.IGNORECASE,
    )
    party_re = re.compile(
        r"^(?:VERSUS|\.\.\.APPELLANT|\.\.\.RESPONDENT|\.\.\.PETITIONER|\.\.\.DEFENDANT)",
        re.IGNORECASE,
    )
    judgment_title_re = re.compile(
        r"^(?:JUDGMENT|ORDER|FINAL ORDER|REPORTABLE|NON-REPORTABLE)$",
        re.IGNORECASE,
    )
    para_start_re = re.compile(
        r"^(?:\d+[\.\)]|\([a-z0-9]+\)|\[\d+\]|[A-Z][\.\)])\s+",
    )
    
    blocks: list[tuple[str, str]] = []
    current_para: list[str] = []
    
    def flush_para():
        nonlocal current_para
        if current_para:
            reflowed = " ".join(current_para)
            reflowed = re.sub(r'[ \t]+', ' ', reflowed).strip()
            if reflowed:
                blocks.append(("paragraph", reflowed))
            current_para = []

    for i, line in enumerate(raw_lines):
        if not line:
            if current_para:
                last_line = current_para[-1]
                next_non_empty = ""
                for j in range(i + 1, min(len(raw_lines), i + 6)):
                    if raw_lines[j]:
                        next_non_empty = raw_lines[j]
                        break

                ends_sentence = bool(re.search(r'[\.\?\!][\'"”’]?$', last_line))
                is_next_numbered = bool(para_start_re.match(next_non_empty))
                is_next_banner = bool(court_banner_re.match(next_non_empty)) or bool(party_re.match(next_non_empty)) or bool(judgment_title_re.match(next_non_empty)) or next_non_empty.startswith("#")

                if (ends_sentence and (is_next_numbered or is_next_banner or (next_non_empty and next_non_empty[0].isupper() and len(last_line) < 65))) or is_next_numbered or is_next_banner:
                    flush_para()
            continue

        # Markdown headings
        if line.startswith("#"):
            flush_para()
            heading_text = re.sub(r"^#+\s*", "", line).strip()
            blocks.append(("heading", heading_text))
            continue

        # Blockquotes
        if line.startswith("> "):
            flush_para()
            blocks.append(("quote", line[2:].strip()))
            continue

        # Lists
        if line.startswith("- ") or line.startswith("* "):
            flush_para()
            blocks.append(("list_item", line[2:].strip()))
            continue

        # Centered court headers
        if court_banner_re.match(line) and len(line) < 85:
            flush_para()
            blocks.append(("court_banner", line))
            continue

        # Party designations
        if party_re.match(line) and len(line) < 65:
            flush_para()
            blocks.append(("court_banner", line))
            continue

        # Standalone judgment title
        if judgment_title_re.match(line):
            flush_para()
            blocks.append(("judgment_title", line))
            continue

        # Distinct numbered paragraphs
        if para_start_re.match(line):
            flush_para()
            current_para.append(line)
            continue

        # Normal line continuation within paragraph
        if current_para:
            if current_para[-1].endswith("-"):
                current_para[-1] = current_para[-1][:-1] + line
            else:
                current_para.append(line)
        else:
            current_para.append(line)

    flush_para()
    return blocks


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
    pdf.set_auto_page_break(auto=True, margin=16)
    pdf.set_margins(20, 16, 20)
    pdf.add_page()

    # Front Matter Banner
    pdf.set_font("Times", "B", 13)
    pdf.set_text_color(20, 20, 20)
    pdf.set_x(pdf.l_margin)
    court_heading = court_name.upper() if court_name else "IN THE COURT OF RECORD"
    pdf.multi_cell(0, 6.5, sanitize_for_pdf(court_heading), align="C")
    pdf.ln(2)

    if title and title != court_name:
        pdf.set_font("Times", "B", 11)
        pdf.set_text_color(45, 45, 45)
        pdf.set_x(pdf.l_margin)
        pdf.multi_cell(0, 5.5, sanitize_for_pdf(title), align="C")
        pdf.ln(2)

    if order_date or cnr:
        meta_items = []
        if cnr:
            meta_items.append(f"Record / Case ID: {cnr}")
        if order_date:
            meta_items.append(f"Date: {order_date}")
        pdf.set_font("Times", "I", 9)
        pdf.set_text_color(110, 110, 110)
        pdf.set_x(pdf.l_margin)
        pdf.multi_cell(0, 4.5, sanitize_for_pdf("  |  ".join(meta_items)), align="C")
        pdf.ln(3)

    # Separator Line
    pdf.set_draw_color(180, 150, 90)
    pdf.set_line_width(0.6)
    pdf.line(pdf.l_margin, pdf.get_y(), pdf.w - pdf.r_margin, pdf.get_y())
    pdf.ln(6)

    # Extract signatures and reflow paragraphs
    sanitized_text, signatures = _extract_and_sanitize_signatures(content)
    blocks = _reflow_paragraphs(sanitized_text)

    for btype, text in blocks:
        clean = sanitize_for_pdf(text)
        if not clean:
            continue

        pdf.set_x(pdf.l_margin)

        if btype == "court_banner":
            pdf.ln(1)
            pdf.set_font("Times", "B", 10.5)
            pdf.set_text_color(40, 40, 40)
            pdf.multi_cell(0, 5, clean, align="C")
            pdf.ln(1)

        elif btype == "judgment_title":
            pdf.ln(2)
            pdf.set_font("Times", "B", 12)
            pdf.set_text_color(20, 20, 20)
            pdf.multi_cell(0, 6, clean, align="C")
            pdf.ln(2)

        elif btype == "heading":
            pdf.ln(3)
            pdf.set_font("Times", "B", 11)
            pdf.set_text_color(25, 25, 25)
            pdf.multi_cell(0, 5.2, clean, align="L")
            pdf.ln(1.5)

        elif btype == "quote":
            pdf.set_x(pdf.l_margin + 6)
            pdf.set_font("Times", "I", 9.5)
            pdf.set_text_color(70, 70, 70)
            avail_w = (pdf.w - pdf.r_margin) - (pdf.l_margin + 6)
            pdf.multi_cell(avail_w, 4.8, clean, align="J")
            pdf.ln(2)

        elif btype == "list_item":
            pdf.set_x(pdf.l_margin + 4)
            pdf.set_font("Times", "", 10)
            pdf.set_text_color(35, 35, 35)
            avail_w = (pdf.w - pdf.r_margin) - (pdf.l_margin + 4)
            pdf.multi_cell(avail_w, 4.8, f"* {clean}", align="J")
            pdf.ln(1.5)

        else:
            # Main reflowed legal paragraph
            pdf.set_font("Times", "", 10.5)
            pdf.set_text_color(30, 30, 30)
            # Use justified alignment for paragraphs longer than 80 chars
            align_mode = "J" if len(clean) > 80 else "L"
            pdf.multi_cell(0, 5.4, clean, align=align_mode)
            pdf.ln(3)

    # Render Digital Signatures in an authentic verification card at the end
    if signatures:
        pdf.ln(4)
        pdf.set_draw_color(190, 165, 110)
        pdf.set_fill_color(248, 246, 240)
        pdf.set_line_width(0.3)
        
        start_y = pdf.get_y()
        if start_y > pdf.h - 40:
            pdf.add_page()
            start_y = pdf.get_y()
            
        pdf.rect(pdf.l_margin, start_y, pdf.w - pdf.l_margin - pdf.r_margin, 20, style="DF")
        pdf.set_xy(pdf.l_margin + 4, start_y + 2)
        pdf.set_font("Times", "B", 8.5)
        pdf.set_text_color(110, 85, 40)
        pdf.cell(0, 4, "[VERIFIED DIGITAL RECORD]", ln=True)
        
        pdf.set_x(pdf.l_margin + 4)
        pdf.set_font("Times", "I", 8)
        pdf.set_text_color(90, 90, 90)
        sig_summary = "  |  ".join(" ".join(s.split()) for s in signatures)
        pdf.multi_cell(pdf.w - pdf.l_margin - pdf.r_margin - 8, 3.8, sanitize_for_pdf(sig_summary)[:240])

    return bytes(pdf.output())
