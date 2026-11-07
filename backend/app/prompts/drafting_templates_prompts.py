"""Specialized prompts for Indian court-ready drafting templates and anti-hallucination deficit guard."""

from typing import Any

DRAFTING_SYSTEM_PROMPT = """You are an eminent Indian Senior Advocate and Master Court Pleader with decades of experience drafting before the Supreme Court of India, High Courts, Sessions Courts, and District Courts.

You draft authoritative, court-ready pleadings strictly adhering to Indian High Court Rules, Supreme Court Rules 2013, and the Bar Council of India standards.

CRITICAL ARCHITECTURAL RULES (ANTI-HALLUCINATION & REGISTRY COMPLIANCE):
1. MANDATORY DEFICIT FLAGGING:
   - NEVER invent or assume any factual variable not present in the user's brief (such as specific dates, vehicle numbers, cheque numbers, return memo codes, FIR numbers, medical conditions, or witness names).
   - Whenever any required factual or statutory detail is missing or uncertain, you MUST HALT text invention and output an explicit placeholder in exactly this format:
     [REQUIRED: <Clear Description of What Detail is Missing>]
     or
     [CRITICAL MISSING FACT: <Detail>]
   - Example: "[REQUIRED: Date of Service of Statutory Demand Notice via Registered Post]"
   - Example: "[REQUIRED: Bank Return Memo Reason Code & Date]"
   - Example: "[REQUIRED: Specific Overt Act or Role attributed to the Applicant in the FIR]"

2. FORMAL REGISTRY STRUCTURE:
   Every petition/complaint must follow the rigorous standard sequence:
   - IN THE COURT OF ... (Jurisdiction & Cause Title)
   - CASE / APPLICATION NUMBER BLANK (e.g. CRL. MISC. NO. ____ OF 2026)
   - MEMO OF PARTIES (Petitioner / Applicant vs. Respondent / State)
   - TITLE OF APPLICATION (e.g., APPLICATION UNDER SECTION 482 BNSS FOR GRANT OF ANTICIPATORY BAIL)
   - FORMAL OPENING: "MOST RESPECTFULLY SHEWETH:"
   - NUMBERED PARAGRAPHS (1, 2, 3...) detailing chronology of facts without narrative gaps.
   - GROUNDS (Bold uppercase headings A, B, C, D... with authoritative Indian jurisprudence).
   - PRAYER (Lettered paragraphs (a), (b), (c)... followed by "AND FOR THIS ACT OF KINDNESS...").
   - VERIFICATION AFFIDAVIT with deponent affirmation and signature slots.

3. TEMPORAL ACCURACY (CRIMINAL LAW ERA TRANSITION):
   - For offenses alleged before July 1, 2024: Substantive offenses remain under IPC (enforcing Article 20(1) Constitution).
   - For procedural steps initiated on or after July 1, 2024: Refer to BNSS provisions with CrPC concordance in parentheses (e.g., "Section 482 BNSS (corresponding to Section 438 CrPC)").

4. OUTPUT FORMAT:
   Return a clean, semantic HTML structure directly ready to render inside the editor with valid <div>, <p>, <table>, <b>, <u>, and <i> elements. Do NOT output markdown code blocks (no ```html).
"""

def build_drafting_prompt(
    template_id: str,
    court_name: str,
    applicant_name: str,
    applicant_details: str | None,
    respondent_name: str,
    respondent_details: str | None,
    case_number: str | None,
    factual_narrative: str,
    grounds_notes: str | None = None,
    interim_prayers: str | None = None,
    main_prayers: str | None = None,
    fir_number: str | None = None,
    police_station: str | None = None,
    sections_alleged: str | None = None,
) -> str:
    """Constructs prompt for specific Indian court pleading template."""
    
    specific_template_guidelines = {
        "CRIMINAL_ANTICIPATORY_BAIL": """
TEMPLATE: ANTICIPATORY BAIL APPLICATION (u/s 482 BNSS / 438 CrPC)
Specific requirements:
1. State clearly: The Applicant has clean antecedents and is a respected citizen with deep roots in society.
2. Establish "Reason to Believe / Apprehension of Arrest" due to targeted harassment or political/commercial rivalry.
3. Show that Custodial Interrogation is wholly unnecessary as no physical recovery remains to be effected.
4. Express unambiguous undertaking: Applicant undertakes to join investigation as and when summoned, shall not tamper with evidence, and shall not flee jurisdiction.
5. Grounds must cite the triple-test compliance (Gurbaksh Singh Sibbia / Sushila Aggarwal).
6. Prayer: (a) Grant anticipatory bail in the event of arrest; (b) Direct interim protection / no coercive steps pending adjudication.
""",
        "CRIMINAL_REGULAR_BAIL": """
TEMPLATE: REGULAR BAIL APPLICATION (u/s 483 BNSS / 439 CrPC)
Specific requirements:
1. State incarceration period: Date of arrest, time spent in judicial custody, and filing status of charge-sheet.
2. Establish completion of investigation: If charge-sheet is filed, custodial detention cannot be punitive.
3. Grounds must address the gravity of allegations vs. lack of direct evidence, medical/family hardship, and delay in trial commencement (Satender Kumar Antil / Sanjay Chandra principles).
4. Prayer: Order release of the Applicant on regular bail on furnishing suitable surety.
""",
        "CRIMINAL_QUASHING_482": """
TEMPLATE: PETITION FOR QUASHING OF FIR / PROCEEDINGS (u/s 528 BNSS / 482 CrPC)
Specific requirements:
1. Invoke inherent extraordinary powers of the High Court to prevent abuse of process and secure ends of justice.
2. Ground 1: Factual allegations even if accepted in entirety do not disclose prima facie commission of a cognizable offence.
3. Ground 2: Civil commercial dispute given criminal color solely to exert coercive pressure.
4. Ground 3: Complete fitment under guidelines laid down in State of Haryana v. Bhajan Lal (1992 Supp (1) SCC 335).
5. Prayer: (a) Quash the FIR and consequential proceedings; (b) Stay investigation / trial during pendency.
""",
        "CRIMINAL_SECTION_138_NI": """
TEMPLATE: CRIMINAL COMPLAINT UNDER SECTION 138 OF THE NEGOTIABLE INSTRUMENTS ACT, 1881
Specific requirements:
1. Strict statutory chronology:
   (i) Issuance of cheque in discharge of existing legally enforceable debt/liability.
   (ii) Presentation of cheque to bank within validity (3 months).
   (iii) Dishonour by drawee bank with cheque return memo date & specific reason code.
   (iv) Issuance of statutory demand notice within 30 days of memo receipt via Speed Post.
   (v) Failure of drawer to pay cheque amount within 15 days of notice receipt.
   (vi) Filing of complaint within 30 days of cause of action arising under Section 142.
2. Verification block with complainant's sworn deposition.
""",
        "CIVIL_WRIT_PETITION": """
TEMPLATE: WRIT PETITION UNDER ARTICLE 226 OF THE CONSTITUTION OF INDIA
Specific requirements:
1. State jurisdiction: High Court Extraordinary Original Writ Jurisdiction.
2. Formal averment: Non-availability of equally efficacious alternative statutory remedy.
3. Specific violation of fundamental rights (Articles 14, 19, 21) or statutory mandates.
4. Absence of delay and laches.
5. Specific prayer for appropriate prerogative writ (Certiorari quashing order, Mandamus directing action, Prohibition, etc.).
6. Separate interim relief application / stay prayer.
""",
        "CIVIL_CRIMINAL_SLP": """
TEMPLATE: SPECIAL LEAVE PETITION UNDER ARTICLE 136 OF THE CONSTITUTION OF INDIA
Specific requirements:
1. Supreme Court of India formatting.
2. Detailed statement of Question of Law of General Public Importance.
3. Details of impugned final judgment/order passed by High Court.
4. Declaration that no other SLP has been filed against the same judgment.
5. Grounds for grant of Special Leave with constitutional jurisprudence.
""",
        "CIVIL_PLAINT_WS": """
TEMPLATE: PLAINT / SUIT UNDER ORDER VII CPC
Specific requirements:
1. Specific description of parties, registration status, and addresses.
2. Distinct statement of facts constituting Cause of Action, when it arose, and how it subsists.
3. Specific declaration on Territorial and Pecuniary Jurisdiction of the Court.
4. Valuation of suit for court fee purposes and statement of ad-valorem court fee paid.
5. Itemized Prayer clause with interest claims and litigation costs.
""",
        "COURT_VAKALATNAMA": """
TEMPLATE: FORMAL COURT VAKALATNAMA (POWER OF ATTORNEY)
Specific requirements:
1. Formal appointment of advocate with enrollment number and chamber address.
2. Full authorization to plead, compromise, deposit, withdraw moneys, and receive summons.
3. Signature block for client / deponent and acceptance signature by advocate.
""",
        "CIVIL_LEGAL_NOTICE": """
TEMPLATE: STATUTORY DEMAND / LEGAL NOTICE
Specific requirements:
1. Addressed to proposed respondent with complete designation.
2. Clear chronological statement of contractual / statutory breach.
3. Specific quantifiable demand with applicable interest rate.
4. Strict 15-day / 30-day compliance deadline.
5. Unambiguous reservation of rights for civil suit and criminal prosecution upon failure to comply.
"""
    }.get(template_id, "TEMPLATE: FORMAL COURT PLEADING")

    notes_str = f"ADVOCATE'S SPECIAL GROUNDS / NOTES:\n{grounds_notes}\n" if grounds_notes else ""
    interim_str = f"INTERIM PRAYERS SOUGHT:\n{interim_prayers}\n" if interim_prayers else ""
    main_str = f"MAIN PRAYERS SOUGHT:\n{main_prayers}\n" if main_prayers else ""
    fir_str = f"FIR NUMBER: {fir_number}\nPOLICE STATION: {police_station}\nSECTIONS: {sections_alleged}\n" if fir_number else ""

    return f"""TASK: Draft a complete, high-quality, court-ready Indian legal pleading following the specific statutory guidelines below.

{specific_template_guidelines}

CASE PARTICULARS:
COURT NAME: {court_name}
CASE NUMBER: {case_number or 'CRIMINAL / CIVIL MISC. NO. ______ OF 2026'}
APPLICANT / PETITIONER: {applicant_name} ({applicant_details or 'Adult resident'})
RESPONDENT: {respondent_name} ({respondent_details or 'Through Authorized Representative'})
{fir_str}
FACTUAL NARRATIVE & CHRONOLOGY:
{factual_narrative}

{notes_str}
{interim_str}
{main_str}

MANDATORY RULES:
1. If any factual variable is missing from the above details (such as dates of specific notices, specific FIR numbers, monetary amounts, or police station names), you MUST insert a highlighted placeholder: [REQUIRED: <description>] or [CRITICAL MISSING FACT: <description>]. DO NOT MAKE UP DATES OR AMOUNTS.
2. Render as clean HTML with proper inline styling, centered cause titles, bold headings, justified paragraphs with paragraph numbers, and a complete Verification Affidavit.
3. Do NOT wrap output in markdown code blocks. Output semantic HTML directly.
"""

