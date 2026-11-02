"""Prompt definitions and judicial instructions for Pillar 3: Precedent Research & Precedent Surfacing."""

from __future__ import annotations


PRECEDENT_SYSTEM_PROMPT = """You are an elite Supreme Court Judicial Clerk, Law Reporter, and Senior Research Counsel specializing in Indian Jurisprudence.

CRITICAL JURISPRUDENTIAL RULES (State of Orissa v. Sudhansu Sekhar Misra doctrine):
1. SEPARATION OF RATIO DECIDENDI FROM OBITER DICTA:
   - "A decision is only an authority for what it actually decides." (Lord Halsbury in Quinn v. Leathem, adopted by Supreme Court of India in Sudhansu Sekhar Misra (1968) 2 SCR 154).
   - RATIO DECIDENDI: The binding rule or principle of law without which the decision could not have been reached. You MUST isolate this rule cleanly and state its governing paragraphs.
   - OBITER DICTA: Observations made by the way, societal commentary, non-binding directions to police/authorities, or passing reflections. You MUST explicitly classify these as non-binding.
2. "WHY THIS HELPS" CONTEXTUAL RELEVANCE RULE:
   - When generating a "Why This Helps" badge, write EXACTLY ONE active sentence (maximum 28 words).
   - It must directly explain the strategic leverage of the precedent for the advocate's query or factual context.
   - Examples of good badges:
     - "Shields petitioner against recovery of liquidated damages where respondent suffered no actual legal injury u/s 74 Contract Act (Kailash Nath doctrine)."
     - "Establishes that failure to serve mandatory 60-day statutory notice renders suit against Union of India defective u/s 80 CPC."
     - "Guarantees that an accused is entitled to statutory default bail on expiry of 90/60 days irrespective of subsequent charge-sheet filing."
3. GROUNDED INDIAN LEGAL CITATIONS:
   - Only cite real, authoritative Indian citations (SCC, AIR, SCR, DLT, Bom CR, etc.) and statutes (Constitution of India, CPC 1908, CrPC 1973 / BNSS 2023, IPC 1860 / BNS 2023, Evidence Act 1872 / BSA 2023, NI Act 1881).
4. STRICT JSON FORMAT:
   - Output must be valid, parseable JSON matching the requested schema. Do not enclose in markdown conversational introductions.
"""


def build_why_this_helps_prompt(
    query: str,
    case_title: str,
    court_name: str,
    snippet: str,
    advocate_posture: str = "general",
) -> str:
    """Builds prompt for single-sentence contextual relevance badge."""
    return f"""Evaluate the candidate Indian legal precedent against the advocate's query and generate a strategic 'Why This Helps' relevance badge.

ADVOCATE QUERY / FACTUAL INQUIRY:
{query}

CANDIDATE PRECEDENT:
- Title: {case_title}
- Court: {court_name}
- Advocate Posture: {advocate_posture.upper()}
- Context Snippet: {snippet[:2500] if snippet else "N/A"}

TASK:
Produce a single-sentence plain-English strategic badge explaining why this judgment helps or how it applies to the query.

Format your output as a VALID JSON object matching this schema:
{{
  "case_title": "{case_title}",
  "why_this_helps": "EXACTLY ONE active sentence (max 28 words) stating the strategic leverage of this precedent.",
  "relevance_category": "Direct Precedent | Procedural Shield | Statutory Interpretation | Distinguishing Precedent | Factual Analogy | General Authority",
  "strategic_utility": "How the advocate should deploy this in their argument or draft.",
  "key_anchor_section": "e.g. Section 138 NI Act / Article 226"
}}
"""


def build_verdict_anatomy_prompt(
    text: str,
    case_title: str,
    court_name: str,
    search_query: Optional[str] = None,
    advocate_posture: str = "general",
) -> str:
    """Builds prompt to deconstruct a judgment into the 4-part Verdict Anatomy combined with 'Why This Helps' strategic relevance."""
    context_directive = ""
    if search_query and search_query.strip():
        context_directive = f"""
ADVOCATE CONTEXT / INQUIRY:
- Search Query / Issue: "{search_query.strip()}"
- Advocate Posture: {advocate_posture.upper()}
Evaluate how this precedent specifically assists or impacts an advocate researching "{search_query.strip()}".
"""

    return f"""Deconstruct the following Indian court judgment into a structured 4-Part Verdict Anatomy combined with 'Why This Helps' Strategic Relevance under the Sudhansu Sekhar Misra doctrine.

CASE PARTICULARS:
- Case Title: {case_title}
- Court: {court_name}
{context_directive}
JUDGMENT TEXT:
{text[:14000]}

TASK:
Extract and structure:
1. 'Why This Helps' Strategic Relevance (Single-sentence plain-English tactical leverage explaining why this precedent helps the advocate)
2. Binding Ratio Decidendi (Core rule of law, binding proposition, and governing paragraphs)
3. Issues Framed (Substantive questions of law and court answers)
4. Material Facts & Procedural Journey
5. Obiter Dicta & Judicial Observations (Persuasive/non-binding commentary)
6. Statutes & Articles Interpreted

Format your output as a VALID JSON object matching this schema:
{{
  "case_title": "{case_title}",
  "official_citation": "Authoritative citation (e.g., (1999) 6 SCC 172 or AIR 1999 SC 2378)",
  "court_name": "{court_name}",
  "decision_date": "YYYY-MM-DD or Month Year",
  "bench_coram": ["Justice Name 1", "Justice Name 2"],
  "disposition": "Operative order (e.g. Appeal Allowed, Conviction Set Aside, Remanded)",
  "strategic_relevance": {{
    "why_this_helps": "EXACTLY ONE active sentence (max 28 words) explaining the strategic leverage of this precedent to the advocate's query or case.",
    "relevance_category": "Direct Precedent | Procedural Shield | Statutory Interpretation | Distinguishing Precedent | Factual Analogy | General Authority",
    "strategic_utility": "Direct tactical guidance on how the advocate should deploy this binding ratio before the bench.",
    "key_anchor_section": "e.g. Section 41A CrPC / Section 438 CrPC / Article 226"
  }},
  "issues_framed": [
    {{
      "issue_number": 1,
      "question_of_law": "Precise legal question formulated by the bench.",
      "court_finding": "Court finding on this issue.",
      "answered_in_favour_of": "Petitioner / Appellant | Respondent | Partly | Remanded | Neutral"
    }}
  ],
  "material_facts": [
    "Material fact point 1 that directly influenced the outcome",
    "Material fact point 2",
    "Material fact point 3"
  ],
  "procedural_journey": "Summary of trial court decision -> appellate High Court finding -> Supreme Court ruling.",
  "ratio_decidendi": {{
    "core_rule_of_law": "The binding rule of law established by the court.",
    "binding_proposition": "Precise legal proposition applicable to future disputes.",
    "governing_paragraphs": ["Para 28", "Para 32"],
    "bench_strength": "e.g. Constitution Bench (5 Judges) | Division Bench (2 Judges)",
    "precedential_weight": "Binding Supreme Court Precedent | Binding High Court Precedent | Persuasive High Court Precedent"
  }},
  "obiter_dicta": [
    {{
      "observation": "Non-binding judicial remark or observation.",
      "context": "Context in which the remark was made.",
      "nature": "Societal Commentary | Guidance to Police/Investigating Agencies | Legislative Reform Suggestion | Trial Court Direction | General Observation"
    }}
  ],
  "statutes_interpreted": [
    {{
      "act_name": "Name of Act (e.g. Code of Civil Procedure, 1908)",
      "section_article": "Section / Article (e.g. Section 100)",
      "nature_of_interpretation": "Strict | Purposive | Harmonious | Read Down | Constitutional Validity Upheld | General Interpretation",
      "interpretation_summary": "Summary of interpretation."
    }}
  ],
  "one_line_takeaway": "Punchy one-line executive summary of the entire verdict."
}}
"""

