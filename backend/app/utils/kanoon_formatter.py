"""Indian Kanoon Document Formatter.

Converts raw HTML returned by the Indian Kanoon API into clean, structured Markdown.
Preserves headings, quotes, citations, bold text, lists, and removes unwanted tags/scripts.
Reflows fragmented court order lines and extracts interleaved digital signatures.
"""

import html
import re
from html.parser import HTMLParser


class _KanoonHTMLToMarkdownParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.output: list[str] = []
        self.tag_stack: list[str] = []
        self.in_script = False
        self.in_style = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag_lower = tag.lower()
        self.tag_stack.append(tag_lower)

        if tag_lower in ("script", "style", "noscript"):
            self.in_script = True
            return

        if tag_lower in ("h1", "h2"):
            self.output.append("\n\n## ")
        elif tag_lower in ("h3", "h4"):
            self.output.append("\n\n### ")
        elif tag_lower in ("h5", "h6"):
            self.output.append("\n\n#### ")
        elif tag_lower in ("p", "div"):
            self.output.append("\n\n")
        elif tag_lower == "br":
            self.output.append("\n")
        elif tag_lower in ("b", "strong"):
            self.output.append(" **")
        elif tag_lower in ("i", "em"):
            self.output.append(" *")
        elif tag_lower == "blockquote":
            self.output.append("\n\n> ")
        elif tag_lower == "li":
            self.output.append("\n- ")
        elif tag_lower == "hr":
            self.output.append("\n\n---\n\n")

    def handle_endtag(self, tag: str) -> None:
        tag_lower = tag.lower()
        if self.tag_stack and self.tag_stack[-1] == tag_lower:
            self.tag_stack.pop()

        if tag_lower in ("script", "style", "noscript"):
            self.in_script = False
            return

        if tag_lower in ("b", "strong"):
            self.output.append("** ")
        elif tag_lower in ("i", "em"):
            self.output.append("* ")
        elif tag_lower in ("p", "div", "h1", "h2", "h3", "h4", "h5", "h6"):
            self.output.append("\n")

    def handle_data(self, data: str) -> None:
        if self.in_script:
            return
        if data:
            self.output.append(data)


def clean_court_text_and_extract_signatures(text: str) -> tuple[str, list[dict[str, str]]]:
    """Clean court judgment text:
    - Removes interspersed digital signature stamps (even when interleaved with judgment lines)
    - Re-stitches split legal sentences
    - Removes isolated page numbers and form-feed markers (\x0c)
    - Returns cleaned text and structured signature records
    """
    text = text.replace('\r\n', '\n').replace('\r', '\n')
    text = re.sub(r'\x0c', '\n', text)
    text = re.sub(r'\n[ \t]*\d+[ \t]*\n(?=[ \t]*[a-zA-Z\n])', '\n', text)

    lines = text.split('\n')
    signatures: list[dict[str, str]] = []
    n = len(lines)
    i = 0

    def is_sig_header(line: str) -> bool:
        s = line.strip()
        return bool(re.match(r'^(?:Signature\s+(?:Not\s+)?Verified|Digitally\s+signed\s+by)', s, re.I))

    while i < n:
        line = lines[i]
        s = line.strip()

        if is_sig_header(s):
            sig_name = ""
            sig_date = ""
            sig_reason = ""
            sig_status = "Digitally Signed (Verified)" if "not" not in s.lower() else "Digital Signature (Unverified)"

            j = i
            while j < min(n, i + 14):
                curr = lines[j].strip()
                if "signature not verified" in curr.lower():
                    sig_status = "Digital Signature (Unverified)"
                    lines[j] = ""
                elif "signature verified" in curr.lower():
                    sig_status = "Digital Signature (Verified)"
                    lines[j] = ""
                elif "digitally signed by" in curr.lower():
                    name_part = re.sub(r'(?i)digitally signed by\s*', '', curr).strip()
                    sig_name = name_part
                    lines[j] = ""
                elif re.match(r'^Date:\s*', curr, re.I):
                    sig_date = curr.strip()
                    lines[j] = ""
                elif re.match(r'^\d{2}:\d{2}', curr) and len(curr) < 25:
                    if sig_date:
                        sig_date += " " + curr
                    else:
                        sig_date = curr
                    lines[j] = ""
                elif re.match(r'^Reason:', curr, re.I):
                    sig_reason = re.sub(r'(?i)reason:\s*', '', curr).strip()
                    lines[j] = ""
                elif sig_name and not sig_date and re.match(r'^[A-Z][a-zA-Z\s]{1,30}$', curr) and not any(k in curr for k in [".", ",", ";", '"', "”", "section", "act", "court", "appeal"]):
                    sig_name = f"{sig_name} {curr}".strip()
                    lines[j] = ""
                j += 1

            signatures.append({
                "signer": sig_name or "Official Court Authority",
                "date": sig_date,
                "reason": sig_reason,
                "status": sig_status,
            })

        i += 1

    final_lines = [l for l in lines if l.strip() or l == ""]
    cleaned_body = "\n".join(final_lines)
    cleaned_body = re.sub(r'\n{3,}', '\n\n', cleaned_body)
    return cleaned_body, signatures


def reflow_legal_markdown(text: str) -> str:
    """Reflow fragmented lines within paragraphs while preserving structure, headings, and lists."""
    lines = [l.strip() for l in text.splitlines()]
    blocks: list[str] = []
    current_para: list[str] = []

    para_start_re = re.compile(r"^(?:\d+[\.\)]|\([a-z0-9]+\)|\[\d+\]|[A-Z][\.\)])\s+", re.I)
    court_banner_re = re.compile(
        r"^(?:IN THE (?:SUPREME|HIGH) COURT|CIVIL APPELLATE|CRIMINAL APPELLATE|"
        r"ORIGINAL JURISDICTION|APPELLATE JURISDICTION|CIVIL APPEAL|CRIMINAL APPEAL|"
        r"SPECIAL LEAVE PETITION|WRIT PETITION|REPORTABLE|NON-REPORTABLE|VERSUS|"
        r"JUDGMENT|ORDER|FINAL ORDER)",
        re.I
    )

    def flush():
        nonlocal current_para
        if current_para:
            joined = " ".join(current_para)
            joined = re.sub(r'[ \t]+', ' ', joined).strip()
            if joined:
                blocks.append(joined)
            current_para = []

    for i, line in enumerate(lines):
        if not line:
            if current_para:
                last_line = current_para[-1]
                next_non_empty = ""
                for j in range(i + 1, min(len(lines), i + 6)):
                    if lines[j]:
                        next_non_empty = lines[j]
                        break

                ends_sentence = bool(re.search(r'[\.\?\!][\'"”’]?$', last_line))
                is_next_numbered = bool(para_start_re.match(next_non_empty))
                is_next_header = bool(court_banner_re.match(next_non_empty)) or next_non_empty.startswith("#")

                if (ends_sentence and (is_next_numbered or is_next_header or (next_non_empty and next_non_empty[0].isupper() and len(last_line) < 65))) or is_next_numbered or is_next_header:
                    flush()
            continue

        if line.startswith("#") or line.startswith("> ") or line.startswith("- ") or line.startswith("* ") or line == "---":
            flush()
            blocks.append(line)
            continue

        if court_banner_re.match(line) and len(line) < 85:
            flush()
            blocks.append(f"### {line}")
            continue

        if para_start_re.match(line):
            flush()
            current_para.append(line)
            continue

        if current_para:
            if current_para[-1].endswith("-"):
                current_para[-1] = current_para[-1][:-1] + line
            else:
                current_para.append(line)
        else:
            current_para.append(line)

    flush()
    return "\n\n".join(blocks)


def convert_kanoon_html_to_markdown(raw_html: str, title: str | None = None, docsource: str | None = None, publishdate: str | None = None) -> str:
    """Convert raw Indian Kanoon HTML to clean, formatted Markdown.
    
    Args:
        raw_html: The HTML string from Kanoon API's 'doc' field.
        title: Optional document/case title.
        docsource: Optional court name / source.
        publishdate: Optional judgment date.
    
    Returns:
        Structured Markdown representation of the court document.
    """
    if not raw_html or not raw_html.strip():
        return "*No document text available from Indian Kanoon.*"

    # Pre-clean known Kanoon wrapper patterns
    cleaned_html = raw_html
    cleaned_html = re.sub(r'<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>', '', cleaned_html, flags=re.IGNORECASE)
    cleaned_html = re.sub(r'<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>', '', cleaned_html, flags=re.IGNORECASE)

    # Parse HTML to Markdown
    parser = _KanoonHTMLToMarkdownParser()
    parser.feed(cleaned_html)
    raw_md = "".join(parser.output)

    # Unescape HTML entities
    decoded_md = html.unescape(raw_md)

    # Clean interspersed signatures and extract them
    cleaned_text, sigs = clean_court_text_and_extract_signatures(decoded_md)

    # Reflow paragraphs
    reflowed_text = reflow_legal_markdown(cleaned_text)

    # Post-process formatting
    reflowed_text = re.sub(r'\*\*\s+', ' **', reflowed_text)
    reflowed_text = re.sub(r'\s+\*\*', '** ', reflowed_text)
    reflowed_text = re.sub(r'\*\*\*\*', '', reflowed_text)
    result_text = reflowed_text.strip()

    # Prepend document header if not already in document
    header_parts = []
    if title and title.strip():
        clean_title = re.sub(r'<[^>]+>', '', title).strip()
        if not result_text.startswith(f"# {clean_title}") and not result_text.startswith(f"## {clean_title}"):
            header_parts.append(f"# {clean_title}")

    meta_sub = []
    if docsource and docsource.strip():
        meta_sub.append(f"**Court:** {docsource.strip()}")
    if publishdate and publishdate.strip():
        meta_sub.append(f"**Date:** {publishdate.strip()}")
    if meta_sub:
        header_parts.append(" | ".join(meta_sub))

    if header_parts:
        header_block = "\n\n".join(header_parts) + "\n\n---\n\n"
        if not result_text.startswith("#"):
            result_text = header_block + result_text

    # Append Verified Digital Record at bottom if signatures were found
    if sigs:
        sig_block = "\n\n---\n\n### Verified Digital Record\n"
        for s in sigs:
            sig_block += f"- **Signatory:** {s['signer']}\n"
            if s['date']:
                sig_block += f"- **Date:** {s['date']}\n"
            sig_block += f"- **Status:** {s['status']}\n"
        result_text += sig_block

    return result_text.strip()
