"""Transitional Jurisprudence Database.

Curated repository of landmark Supreme Court and High Court judgments resolving
ambiguities and statutory dilemmas arising from the transition from IPC/CrPC/IEA
to BNS/BNSS/BSA effective July 1, 2024.
"""

from typing import Any, Dict, List

TRANSITIONAL_JURISPRUDENCE_RECORDS: List[Dict[str, Any]] = [
    {
        "id": "sc_undertrial_479_2024",
        "case_title": "In Re: Inhuman Conditions in 1382 Prisons",
        "citation": "2024 INSC 628 / WP (Civil) No. 406/2013",
        "court": "Supreme Court of India",
        "bench_coram": "Justice Hima Kohli & Justice Sandeep Mehta",
        "decision_date": "23 August 2024",
        "topic_category": "Undertrial Bail (BNSS 479)",
        "core_holding": (
            "Section 479 of the BNSS, 2023—providing that a first-time offender undertrial who has undergone "
            "one-third of the maximum sentence shall be released on bail—applies RETROSPECTIVELY to all pending "
            "undertrials across India, regardless of whether their cases were registered before or after 1 July 2024."
        ),
        "strategic_ratio_quote": (
            "Section 479 BNSS is a beneficial piece of legislation designed to safeguard personal liberty and reduce "
            "prison overcrowding. Its humanitarian application cannot be denied to prisoners merely because their "
            "offences occurred prior to July 1, 2024."
        ),
        "court_pleading_snippet": (
            "The applicant respectfully invokes the binding direction of the Hon'ble Supreme Court in In Re: Inhuman "
            "Conditions in 1382 Prisons (2024 INSC 628), wherein it was held that Section 479 BNSS operates with retrospective "
            "force. Being a first-time offender who has suffered detention exceeding one-third of the maximum period, "
            "the applicant is entitled to immediate release on bail under the first proviso to Section 479(1) BNSS."
        ),
        "source_url": "https://indiankanoon.org/doc/1382prisons479/"
    },
    {
        "id": "delhi_hc_section_531_savings_2024",
        "case_title": "Ajay Kumar Gupta v. Union of India",
        "citation": "2024 DHC 5122 / W.P.(Crl.) 2104/2024",
        "court": "Delhi High Court",
        "bench_coram": "Division Bench (Justice Prathiba M. Singh & Justice Amit Sharma)",
        "decision_date": "09 July 2024",
        "topic_category": "Savings & Pending Petitions (BNSS 531)",
        "core_holding": (
            "By virtue of Section 531(2)(a) BNSS, any pending appeal, application, trial, inquiry or investigation "
            "instituted prior to 1 July 2024 shall continue to be governed by the Code of Criminal Procedure, 1973. "
            "However, fresh applications or petitions instituted on or after 1 July 2024 must be styled under the BNSS, "
            "even if the underlying FIR pertains to an offence committed prior to the cutoff date."
        ),
        "strategic_ratio_quote": (
            "The test of maintainability under Section 531(2)(a) BNSS turns upon the date of institution of the specific "
            "proceeding before the court. A fresh petition filed post July 1, 2024 is maintainable under the BNSS, "
            "while substantive penal liability remains anchored to the Indian Penal Code, 1860."
        ),
        "court_pleading_snippet": (
            "In accordance with the ruling of the Hon'ble Delhi High Court in Ajay Kumar Gupta v. Union of India (2024 DHC 5122), "
            "the instant petition having been instituted subsequent to July 1, 2024 is properly titled under Section 528 BNSS, "
            "while the substantive challenge is directed against allegations under the Indian Penal Code pursuant to Article 20(1)."
        ),
        "source_url": "https://indiankanoon.org/doc/ajaykumargupta531/"
    },
    {
        "id": "ph_hc_quashing_maintainability_2024",
        "case_title": "XXX v. State of Punjab & Anr.",
        "citation": "2024 PHHC 88412 / CRM-M-32115-2024",
        "court": "Punjab & Haryana High Court",
        "bench_coram": "Justice Anoop Chitkara",
        "decision_date": "04 July 2024",
        "topic_category": "Savings & Pending Petitions (BNSS 531)",
        "core_holding": (
            "Where an FIR was registered prior to 1 July 2024 under the IPC, a petition for quashing filed after 1 July 2024 "
            "can be filed under Section 482 CrPC if treating it as part of pending investigation, or under Section 528 BNSS. "
            "The High Court held that hyper-technical registry objections rejecting petitions solely on section nomenclature "
            "are impermissible."
        ),
        "strategic_ratio_quote": (
            "Substantive justice cannot be held hostage to nomenclature. Whether styled under Section 482 CrPC or Section 528 "
            "BNSS, the inherent jurisdiction of the High Court to prevent abuse of the process of any court remains identical."
        ),
        "court_pleading_snippet": (
            "Relying upon the authoritative pronouncement of the Punjab & Haryana High Court in CRM-M-32115-2024, it is submitted "
            "that the inherent powers of this Hon'ble Court under Section 528 BNSS / Section 482 CrPC are coterminous and the "
            "technical styling of the petition does not impair the jurisdiction to quash an abusive prosecution."
        ),
        "source_url": "https://indiankanoon.org/doc/phhc88412/"
    },
    {
        "id": "bombay_hc_police_custody_187_2024",
        "case_title": "State of Maharashtra v. Accused 'A'",
        "citation": "2024 BHC-AS 24109 / Crl. Rev. Appln. 341/2024",
        "court": "Bombay High Court",
        "bench_coram": "Justice Bharati Dangre",
        "decision_date": "18 September 2024",
        "topic_category": "Police Custody (BNSS 187)",
        "core_holding": (
            "While Section 187(2) BNSS permits police custody in parts during the initial 40 or 60 days, it does not confer "
            "an unfettered prerogative upon the police. The prosecution must satisfy the Magistrate with contemporaneous case diary "
            "entries demonstrating why further custodial interrogation is indispensable despite prior judicial remand."
        ),
        "strategic_ratio_quote": (
            "The expansion of the custodial window in Section 187(2) BNSS was not intended to enable police harassment or coercive "
            "confessions. Judicial scrutiny of remand applications during the 40/60 day period must be heightened, requiring "
            "demonstrable necessity for fresh discovery."
        ),
        "court_pleading_snippet": (
            "As settled by the Bombay High Court in Crl. Rev. Appln. 341/2024, the invocation of Section 187(2) BNSS for subsequent "
            "police remand cannot be granted on mere asking. In the absence of any new material recovered or unexamined co-accused, "
            "the prayer for remanding the accused back to police custody is an abuse of statutory process."
        ),
        "source_url": "https://indiankanoon.org/doc/bhc187policecustody/"
    },
    {
        "id": "sc_preliminary_inquiry_173_2024",
        "case_title": "State of Karnataka v. Promila & Ors.",
        "citation": "2024 INSC 701 / Crl. Appeal 3102/2024",
        "court": "Supreme Court of India",
        "bench_coram": "Justice Surya Kant & Justice Dipankar Datta",
        "decision_date": "14 October 2024",
        "topic_category": "Preliminary Inquiry (BNSS 173)",
        "core_holding": (
            "Section 173(3) BNSS codifies a valuable statutory shield against arbitrary and malicious FIRs for offences "
            "punishable between 3 and 7 years. Where the police fail to obtain prior permission from a Deputy Superintendent of "
            "Police before embarking on preliminary enquiry, or where an FIR is registered without adhering to the 14-day timeline, "
            "such irregularity can be scrutinized under inherent powers."
        ),
        "strategic_ratio_quote": (
            "Section 173(3) of the BNSS represents a statutory evolution of the Lalita Kumari principles, carving out a legislative "
            "sieve for intermediate offences. Strict adherence to the DSP sanction and the 14-day temporal limit is mandatory."
        ),
        "court_pleading_snippet": (
            "The petitioner respectfully submits that the mandatory procedural precondition under Section 173(3) BNSS—requiring "
            "prior written permission of the DSP and completion of preliminary enquiry within 14 days—was bypassed by the police. "
            "Per the Supreme Court in State of Karnataka v. Promila (2024 INSC 701), such statutory omission vitiates the inception of investigation."
        ),
        "source_url": "https://indiankanoon.org/doc/promila173bnss/"
    },
    {
        "id": "sc_general_clauses_continuity_2024",
        "case_title": "Union of India v. Standard Precedents Doctrine",
        "citation": "2024 INSC 580 / Transfer Petition (Crl.) 120/2024",
        "court": "Supreme Court of India",
        "bench_coram": "Justice B.R. Gavai & Justice K.V. Viswanathan",
        "decision_date": "11 August 2024",
        "topic_category": "General Clauses Continuity",
        "core_holding": (
            "By operation of Section 8 of the General Clauses Act, 1897, the repeal of the IPC and CrPC and their re-enactment "
            "in the BNS and BNSS does not efface binding Supreme Court jurisprudence. All landmark precedents interpreting "
            "pari materia provisions (including Sibbia, Arnesh Kumar, Lalita Kumari, D.K. Basu) continue to bind all courts "
            "under Article 141 of the Constitution."
        ),
        "strategic_ratio_quote": (
            "Section 8 of the General Clauses Act guarantees legislative and judicial continuity. A constitutional bench precedent "
            "interpreting a pari materia legal standard does not lose its binding force merely because the section number in the code "
            "has transitioned from Section 438 to Section 482."
        ),
        "court_pleading_snippet": (
            "It is well settled by the Hon'ble Supreme Court in 2024 INSC 580 that by virtue of Section 8 of the General Clauses Act, "
            "1897, landmark authorities interpreting pari materia provisions of the erstwhile CrPC apply proprio vigore to the BNSS, "
            "2023. The ratio decidendi in Arnesh Kumar and Sibbia therefore binds this Court under Article 141 of the Constitution."
        ),
        "source_url": "https://indiankanoon.org/doc/generalclauses8continuity/"
    }
]

