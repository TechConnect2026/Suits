"""DOCX Export Service - Generates registry-compliant court paper-books (.docx) using python-docx."""

import io
import re
from bs4 import BeautifulSoup, NavigableString, Tag
from docx import Document
from docx.enum.table import WD_ALIGN_VERTICAL, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor
import structlog

from app.schemas.drafting import DocxExportRequest

logger = structlog.get_logger()


def _set_cell_border(cell, **kwargs):
    """Set cell borders in python-docx table cells."""
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    tcBorders = tcPr.first_child_found_in("w:tcBorders")
    if tcBorders is None:
        tcBorders = OxmlElement("w:tcBorders")
        tcPr.append(tcBorders)
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        edge_data = kwargs.get(edge)
        if edge_data:
            tag = "w:{}".format(edge)
            element = tcBorders.find(qn(tag))
            if element is None:
                element = OxmlElement(tag)
                tcBorders.append(element)
            for key, val in edge_data.items():
                element.set(qn("w:{}".format(key)), str(val))


class DocxExportService:
    """Compiles HTML court pleadings into strictly formatted Microsoft Word documents."""

    def compile_court_paper_book(self, request: DocxExportRequest) -> io.BytesIO:
        """Takes an HTML court pleading and exports a registry-compliant .docx file."""
        doc = Document()

        # ── 1. Page Geometry & Court Registry Margins ──
        section = doc.sections[0]
        # Standard ISO A4 dimensions
        section.page_width = Inches(8.27)   # 210 mm
        section.page_height = Inches(11.69) # 297 mm

        # Registry Margins: 1.75" left binding gutter, 1.5" top, 1.0" right/bottom
        section.left_margin = Inches(request.left_margin_inches)
        section.top_margin = Inches(request.top_margin_inches)
        section.right_margin = Inches(request.right_margin_inches)
        section.bottom_margin = Inches(request.bottom_margin_inches)

        # ── 2. Default Typography Setup ──
        font_name = request.font_family or "Bookman Old Style"
        font_size = Pt(request.font_size_pt or 13.5)

        normal_style = doc.styles["Normal"]
        normal_style.font.name = font_name
        normal_style.font.size = font_size
        normal_style.font.color.rgb = RGBColor(17, 24, 39) # Deep dark ink

        # Paragraph spacing & line spacing (1.5 lines standard for Indian Courts)
        normal_style.paragraph_format.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
        normal_style.paragraph_format.space_after = Pt(6)
        normal_style.paragraph_format.space_before = Pt(0)

        # ── 3. Parse HTML DOM into DOCX ──
        soup = BeautifulSoup(request.html_content, "html.parser")
        
        # Traverse top-level elements
        for node in soup.children:
            if isinstance(node, NavigableString):
                text = str(node).strip()
                if text:
                    p = doc.add_paragraph()
                    self._format_paragraph_alignment(p, text)
                    p.add_run(text)
                continue

            if isinstance(node, Tag):
                self._render_html_tag(doc, node, font_name, font_size)

        # ── 4. Save to BytesIO ──
        out_stream = io.BytesIO()
        doc.save(out_stream)
        out_stream.seek(0)
        return out_stream

    def _render_html_tag(self, doc: Document, tag: Tag, font_name: str, font_size: Pt) -> None:
        """Renders an individual HTML tag into python-docx element."""
        # 1. Page breaks
        if "court-page-break" in tag.get("class", []) or "page-break-after" in tag.get("style", "").lower():
            doc.add_page_break()
            return

        # 2. Tables (e.g. Memo of Parties or Dates & Events)
        if tag.name == "table":
            self._render_table(doc, tag, font_name, font_size)
            return

        # 3. Headings & Paragraphs
        if tag.name in ["p", "div", "h1", "h2", "h3", "h4", "h5", "h6"]:
            # Check if this div is just a wrapper with page break
            if "page-break-after: always" in tag.get("style", "").lower() and not tag.get_text(strip=True):
                doc.add_page_break()
                return

            # Check if div contains tables or other block elements
            child_tables = tag.find_all("table", recursive=False)
            if child_tables:
                for child in tag.children:
                    if isinstance(child, Tag):
                        self._render_html_tag(doc, child, font_name, font_size)
                return

            p = doc.add_paragraph()
            self._apply_paragraph_styles(p, tag)
            self._render_inline_children(p, tag, font_name, font_size)
            return

        # Fallback for other block tags
        for child in tag.children:
            if isinstance(child, Tag):
                self._render_html_tag(doc, child, font_name, font_size)

    def _apply_paragraph_styles(self, paragraph, tag: Tag) -> None:
        """Extracts CSS text-align and formatting to apply to docx paragraph."""
        style_attr = tag.get("style", "").lower()

        # Alignment
        if "text-align: center" in style_attr or tag.name in ["h1", "h2"]:
            paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
        elif "text-align: right" in style_attr:
            paragraph.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        elif "text-align: justify" in style_attr:
            paragraph.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        else:
            # Body text defaults to justified in Indian courts if numbered
            text = tag.get_text(strip=True)
            if re.match(r"^\d+\.|\([a-z0-9]+\)|^[A-Z]\.\s+FOR\s+THAT", text):
                paragraph.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
                # Standard first line indent for numbered legal averments
                paragraph.paragraph_format.first_line_indent = Inches(0.4)
            else:
                paragraph.alignment = WD_ALIGN_PARAGRAPH.LEFT

        # Margin adjustments from inline CSS
        if "margin-left:" in style_attr:
            match = re.search(r"margin-left:\s*(\d+)px", style_attr)
            if match:
                px = int(match.group(1))
                paragraph.paragraph_format.left_indent = Inches(px / 96.0)

    def _render_inline_children(self, paragraph, parent_tag: Tag, font_name: str, font_size: Pt) -> None:
        """Renders text runs with bold, italics, underlines, and deficit highlights."""
        for item in parent_tag.children:
            if isinstance(item, NavigableString):
                text = str(item)
                if text:
                    run = paragraph.add_run(text)
                    run.font.name = font_name
                    run.font.size = font_size
                continue

            if isinstance(item, Tag):
                run = paragraph.add_run(item.get_text())
                run.font.name = font_name
                run.font.size = font_size

                # Check tags and styles
                is_bold = item.name in ["b", "strong"] or "font-weight: bold" in item.get("style", "").lower()
                is_italic = item.name in ["i", "em"] or "font-style: italic" in item.get("style", "").lower()
                is_underline = item.name == "u" or "text-decoration: underline" in item.get("style", "").lower()

                # Deficit Chip formatting in DOCX
                if item.name == "mark" or "court-deficit-chip" in item.get("class", []):
                    run.font.bold = True
                    run.font.color.rgb = RGBColor(180, 83, 9) # Amber court gold
                    # Underline deficits to make them jump out for registry review
                    run.font.underline = True
                else:
                    run.font.bold = is_bold
                    run.font.italic = is_italic
                    run.font.underline = is_underline

    def _render_table(self, doc: Document, table_tag: Tag, font_name: str, font_size: Pt) -> None:
        """Converts an HTML table into a clean python-docx table."""
        rows = table_tag.find_all("tr")
        if not rows:
            return

        col_count = max(len(row.find_all(["td", "th"])) for row in rows)
        docx_table = doc.add_table(rows=len(rows), cols=col_count)
        docx_table.alignment = WD_TABLE_ALIGNMENT.CENTER
        docx_table.autofit = True

        for r_idx, row in enumerate(rows):
            cells = row.find_all(["td", "th"])
            for c_idx, cell_tag in enumerate(cells):
                if c_idx >= col_count:
                    break
                cell = docx_table.cell(r_idx, c_idx)
                cell.vertical_alignment = WD_ALIGN_VERTICAL.TOP

                # Style cell text
                cell_p = cell.paragraphs[0]
                cell_p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
                cell_p.paragraph_format.space_after = Pt(2)

                style_attr = cell_tag.get("style", "").lower()
                if "text-align: center" in style_attr:
                    cell_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                elif "text-align: right" in style_attr:
                    cell_p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
                else:
                    cell_p.alignment = WD_ALIGN_PARAGRAPH.LEFT

                self._render_inline_children(cell_p, cell_tag, font_name, font_size)

        # Add a subtle blank paragraph after table for spacing
        doc.add_paragraph()

    def _format_paragraph_alignment(self, paragraph, text: str) -> None:
        """Infers paragraph alignment for raw strings."""
        if any(h in text.upper() for h in ["IN THE COURT OF", "IN THE HIGH COURT", "MEMO OF PARTIES", "VERSUS"]):
            paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
        else:
            paragraph.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY


docx_export_service = DocxExportService()

