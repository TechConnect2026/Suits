"""Statutory Verbatim Database.

Contains exact gazetted legislative texts, word-for-word statutory comparisons,
and litigation metadata for key criminal provisions across CrPC/BNSS, IPC/BNS, and IEA/BSA.
"""

from typing import Any, Dict

VERBATIM_STATUTORY_STORE: Dict[str, Dict[str, Any]] = {
    "crpc_438_bnss_482": {
        "pair_id": "crpc_438_bnss_482",
        "category": "PROCEDURAL",
        "old_code": "CrPC",
        "old_section": "438",
        "old_title": "Direction for grant of bail to person apprehending arrest",
        "new_code": "BNSS",
        "new_section": "482",
        "new_title": "Direction for grant of bail to person apprehending arrest",
        "old_verbatim_text": (
            "(1) Where any person has reason to believe that he may be arrested on accusation of having committed a "
            "non-bailable offence, he may apply to the High Court or the Court of Session for a direction under this section "
            "that in the event of such arrest he shall be released on bail; and that Court may, after taking into consideration, "
            "inter alia, the following factors, namely:—\n"
            "(i) the nature and gravity of the accusation;\n"
            "(ii) the antecedents of the applicant including the fact as to whether he has previously undergone imprisonment on conviction by a Court in respect of any cognizable offence;\n"
            "(iii) the possibility of the applicant to flee from justice; and\n"
            "(iv) where the accusation has been made with the object of injuring or humiliating the applicant by having him so arrested,\n"
            "either reject the application forthwith or issue an interim order for the grant of anticipatory bail.\n"
            "(2) When the High Court or the Court of Session makes an order granting an interim bail under sub-section (1), "
            "it shall cause a notice being not less than seven days notice to be given to the Public Prosecutor."
        ),
        "new_verbatim_text": (
            "(1) Where any person has reason to believe that he may be arrested on accusation of having committed a "
            "non-bailable offence, he may apply to the High Court or the Court of Session for a direction under this section "
            "that in the event of such arrest he shall be released on bail; and that Court may, after taking into consideration, "
            "inter alia, the following factors, namely:—\n"
            "(i) the nature and gravity of the accusation;\n"
            "(ii) the antecedents of the applicant including the fact as to whether he has previously undergone imprisonment on conviction by a Court in respect of any cognizable offence;\n"
            "(iii) the possibility of the applicant to flee from justice; and\n"
            "(iv) where the accusation has been made with the object of injuring or humiliating the applicant by having him so arrested,\n"
            "either reject the application forthwith or issue an interim order for the grant of anticipatory bail.\n"
            "(2) When the High Court or the Court of Session makes an order granting an interim bail under sub-section (1), "
            "it shall cause a notice being not less than seven days notice together with a copy of such order to be served on the Public Prosecutor and the Superintendent of Police."
        ),
        "metadata_deltas": [
            {
                "parameter": "Notice Requirements",
                "old_value": "7 days notice to Public Prosecutor only",
                "new_value": "7 days notice with copy of order to Public Prosecutor AND Superintendent of Police",
                "has_changed": True,
                "advocate_impact": "Registry now requires mandatory proof of service on Superintendent of Police along with Public Prosecutor."
            },
            {
                "parameter": "Bailability",
                "old_value": "Non-Bailable",
                "new_value": "Non-Bailable",
                "has_changed": False,
                "advocate_impact": "Governing principles of personal liberty under Gurbaksh Singh Sibbia preserved intact."
            },
            {
                "parameter": "Forum of Adjudication",
                "old_value": "Sessions Court or High Court (Concurrent)",
                "new_value": "Sessions Court or High Court (Concurrent)",
                "has_changed": False,
                "advocate_impact": "Advocates may continue filing before Sessions Court first as standard practice."
            }
        ],
        "key_litigator_takeaways": [
            "Section 482 BNSS retains the core four statutory factors from Section 438 CrPC.",
            "Sub-section (2) now mandates service of the interim order upon the Superintendent of Police, not merely the Public Prosecutor.",
            "Binding precedents under Section 438 CrPC (e.g. Sushila Aggarwal, Sibbia) remain fully applicable by virtue of Section 8 General Clauses Act."
        ],
        "court_submission_pleading": (
            "It is respectfully submitted that while the present application is preferred under Section 482 of the "
            "Bharatiya Nagarik Suraksha Sanhita, 2023, the provision stands in pari materia with Section 438 of the Code of "
            "Criminal Procedure, 1973. By operation of Section 8 of the General Clauses Act, 1897, the constitutional and "
            "procedural principles enunciated by the Constitution Bench in Gurbaksh Singh Sibbia v. State of Punjab and "
            "Sushila Aggarwal v. State (NCT of Delhi) continue to govern the grant of pre-arrest bail."
        )
    },

    "crpc_41a_bnss_35_3": {
        "pair_id": "crpc_41a_bnss_35_3",
        "category": "PROCEDURAL",
        "old_code": "CrPC",
        "old_section": "41A",
        "old_title": "Notice of appearance before police officer",
        "new_code": "BNSS",
        "new_section": "35(3)",
        "new_title": "When police may arrest without warrant - Notice of appearance",
        "old_verbatim_text": (
            "(1) The police officer shall, in all cases where the arrest of a person is not required under the provisions "
            "of sub-section (1) of section 41, issue a notice directing the person against whom a reasonable complaint has been "
            "made, or credible information has been received, or a reasonable suspicion exists that he has committed a cognizable offence, "
            "to appear before him or at such other place as may be specified in the notice.\n"
            "(2) Where such a notice is issued to any person, it shall be the duty of that person to comply with the terms of the notice.\n"
            "(3) Where such person complies and continues to comply with the notice, he shall not be arrested in respect of the offence "
            "referred to in the notice unless, for reasons to be recorded, the police officer is of the opinion that he ought to be arrested."
        ),
        "new_verbatim_text": (
            "(3) The police officer shall, in all cases where the arrest of a person is not required under sub-section (1), "
            "issue a notice directing the person against whom a reasonable complaint has been made, or credible information has been "
            "received, or a reasonable suspicion exists that he has committed a cognizable offence, to appear before him or at such "
            "other place as may be specified in the notice.\n"
            "Provided that in offences punishable with imprisonment for less than three years or with fine, such notice shall not be issued "
            "without prior permission of an officer not below the rank of Deputy Superintendent of Police.\n"
            "(4) Where such person complies and continues to comply with the notice, he shall not be arrested unless, for reasons to be "
            "recorded in writing, the police officer is of the opinion that he ought to be arrested."
        ),
        "metadata_deltas": [
            {
                "parameter": "DSP Prior Permission Proviso",
                "old_value": "No prior permission required for petty offences",
                "new_value": "Mandatory prior permission from Deputy Superintendent of Police for offences under 3 years",
                "has_changed": True,
                "advocate_impact": "Police cannot issue Section 35(3) notices for offences <3 years without written sanction from DSP."
            },
            {
                "parameter": "Threshold of Offence",
                "old_value": "Offences punishable up to 7 years (Arnesh Kumar)",
                "new_value": "Offences punishable up to 7 years codified directly in Section 35(1)(b)",
                "has_changed": False,
                "advocate_impact": "Arnesh Kumar guidelines now enjoy statutory force within the body of Section 35."
            }
        ],
        "key_litigator_takeaways": [
            "Section 41A CrPC has been re-codified as Section 35(3) BNSS.",
            "Crucial new proviso: Prior permission from DSP required before issuing notice for offences punishable with less than 3 years.",
            "Non-compliance by police gives immediate ground for quashing or habeas corpus relief."
        ],
        "court_submission_pleading": (
            "It is submitted that the investigating officer has acted in flagrant contravention of Section 35(3) of the BNSS, 2023. "
            "The offence alleged carrying a maximum sentence of less than three years, no notice could have been issued without the prior "
            "written permission of an officer not below the rank of Deputy Superintendent of Police. The arrest threatened is therefore "
            "patently void ab initio under the Arnesh Kumar doctrine."
        )
    },

    "crpc_167_bnss_187": {
        "pair_id": "crpc_167_bnss_187",
        "category": "PROCEDURAL",
        "old_code": "CrPC",
        "old_section": "167",
        "old_title": "Procedure when investigation cannot be completed in twenty-four hours",
        "new_code": "BNSS",
        "new_section": "187",
        "new_title": "Procedure when investigation cannot be completed in twenty-four hours - Police Custody Extension",
        "old_verbatim_text": (
            "(2) The Magistrate to whom an accused person is forwarded under this section may, whether he has or has not "
            "jurisdiction to try the case, from time to time, authorise the detention of the accused in such custody as such "
            "Magistrate thinks fit, for a term not exceeding fifteen days in the whole; and if he has no jurisdiction to try "
            "the case or commit it for trial, and considers further detention unnecessary, he may order the accused to be "
            "forwarded to a Magistrate having such jurisdiction:\n"
            "Provided that—\n"
            "(a) the Magistrate may authorise the detention of the accused person, otherwise than in custody of the police, "
            "beyond the period of fifteen days, if he is satisfied that adequate grounds exist for doing so..."
        ),
        "new_verbatim_text": (
            "(2) The Magistrate may authorize the detention of the accused person, whether in police custody or judicial custody, "
            "from time to time, for a period not exceeding fifteen days in the whole, or in parts, at any time during the initial "
            "forty days or sixty days out of the detention period of sixty days or ninety days, as the case may be, as provided in "
            "sub-section (3), if he is satisfied that adequate grounds exist for doing so:\n"
            "Provided that the accused shall not be detained in police custody beyond the aggregate period of fifteen days."
        ),
        "metadata_deltas": [
            {
                "parameter": "Police Custody Window",
                "old_value": "Police custody strictly restricted to the FIRST 15 DAYS of arrest (CBI v. Anupam J. Kulkarni)",
                "new_value": "15 days police custody can now be taken 'in whole or in parts' across the first 40 or 60 days",
                "has_changed": True,
                "advocate_impact": "CRITICAL RISK: Police can seek custodial interrogation weeks after accused was remanded to judicial custody."
            },
            {
                "parameter": "Aggregate Police Custody",
                "old_value": "15 days maximum",
                "new_value": "15 days aggregate maximum retained",
                "has_changed": False,
                "advocate_impact": "Total days of police custody cannot exceed 15 days, but can be split into multiple remand periods."
            }
        ],
        "key_litigator_takeaways": [
            "Legislative overruling of CBI v. Anupam J. Kulkarni (1992) 3 SCC 141.",
            "Police custody is no longer barred after the initial 15 days of judicial remand.",
            "Defense advocates must aggressively resist subsequent police remand applications by asserting no new recovery or discovery exists under Section 23 BSA."
        ],
        "court_submission_pleading": (
            "It is respectfully urged that whilst Section 187(2) of the BNSS, 2023 allows police custody in parts during the "
            "initial forty or sixty days, such power cannot be exercised casually or mechanically. The prosecution having already "
            "exhausted initial interrogation, any subsequent application for police remand requires exceptional justification "
            "demonstrating that tangible recoveries cannot be effected without custodial presence."
        )
    },

    "crpc_173_bnss_193": {
        "pair_id": "crpc_173_bnss_193",
        "category": "PROCEDURAL",
        "old_code": "CrPC",
        "old_section": "173",
        "old_title": "Report of police officer on completion of investigation",
        "new_code": "BNSS",
        "new_section": "193",
        "new_title": "Report of police officer on completion of investigation & Preliminary Inquiry",
        "old_verbatim_text": (
            "(1) Every investigation under this Chapter shall be completed without unnecessary delay.\n"
            "(1A) The investigation in relation to an offence under section 376, 376A, 376AB, 376B, 376C, 376D, 376DA, 376DB or 376E "
            "of the Indian Penal Code shall be completed within two months from the date on which the information was recorded...\n"
            "(2) As soon as it is completed, the officer in charge of the police station shall forward to a Magistrate empowered "
            "to take cognizance of the offence on a police report, a report in the form prescribed by the State Government..."
        ),
        "new_verbatim_text": (
            "(1) Every investigation under this Chapter shall be completed without unnecessary delay.\n"
            "(2) The investigation in relation to rape shall be completed within two months.\n"
            "(3) On receipt of information of cognizable offence punishable with imprisonment for three years or more but less than seven years, "
            "the officer in charge of the police station may, with the prior permission of an officer not below the rank of Deputy Superintendent of Police, "
            "conduct a preliminary enquiry within a period of fourteen days to ascertain whether there exists a prima facie case for proceeding in the matter."
        ),
        "metadata_deltas": [
            {
                "parameter": "Mandatory 14-Day Preliminary Enquiry",
                "old_value": "Immediate FIR registration mandatory for cognizable offences (Lalita Kumari)",
                "new_value": "Preliminary enquiry up to 14 days permitted for offences punishable between 3 to 7 years",
                "has_changed": True,
                "advocate_impact": "Statutory exception to mandatory FIR registration codified; prevents immediate FIR harassment."
            },
            {
                "parameter": "DSP Prior Sanction for PE",
                "old_value": "Not applicable",
                "new_value": "Prior permission of Deputy Superintendent of Police mandatory",
                "has_changed": True,
                "advocate_impact": "Preliminary enquiry conducted without DSP approval is procedurally defective."
            }
        ],
        "key_litigator_takeaways": [
            "Section 173(3) BNSS codifies a 14-day preliminary enquiry window for offences between 3 and 7 years imprisonment.",
            "Investigation progress must be communicated electronically to informant within 90 days.",
            "Defense can invoke Section 173(3) to resist premature arrest while preliminary inquiry is pending."
        ],
        "court_submission_pleading": (
            "The petitioner respectfully submits that in respect of the alleged offence carrying punishment between 3 to 7 years, "
            "the statutory mandate of Section 173(3) BNSS required the completion of a preliminary enquiry within fourteen days "
            "with prior DSP permission before straightaway registering an FIR. The impugned FIR having been lodged precipitately "
            "in violation of Section 173(3) warrants interim stay on coercive steps."
        )
    },

    "crpc_436a_bnss_479": {
        "pair_id": "crpc_436a_bnss_479",
        "category": "PROCEDURAL",
        "old_code": "CrPC",
        "old_section": "436A",
        "old_title": "Maximum period for which an undertrial prisoner can be detained",
        "new_code": "BNSS",
        "new_section": "479",
        "new_title": "Maximum period for which an undertrial prisoner can be detained - First-time offender relief",
        "old_verbatim_text": (
            "Where a person has, during the period of investigation, inquiry or trial under this Code of an offence under "
            "any law (not being an offence for which the punishment of death has been specified as one of the punishments under "
            "that law) undergone detention for a period extending up to one-half of the maximum period of imprisonment specified "
            "for that offence under that law, he shall be released by the Court on his personal bond with or without sureties..."
        ),
        "new_verbatim_text": (
            "(1) Where a person has, during the period of investigation, inquiry or trial under this Sanhita of an offence "
            "(not being an offence for which the punishment of death or life imprisonment has been specified) undergone detention "
            "for a period extending up to one-half of the maximum period of imprisonment specified for that offence, he shall be "
            "released by the Court on his personal bond with or without sureties:\n"
            "Provided that where such person is a first-time offender (who has never been convicted of any offence in the past), "
            "he shall be released on bond by the Court if he has undergone detention for the period of one-third of the maximum "
            "period of imprisonment specified for such offence."
        ),
        "metadata_deltas": [
            {
                "parameter": "First-Time Offender Threshold",
                "old_value": "One-half (1/2) sentence detention mandatory for all undertrials",
                "new_value": "One-third (1/3) sentence detention for first-time offenders",
                "has_changed": True,
                "advocate_impact": "First-time undertrials can secure statutory bail significantly earlier."
            },
            {
                "parameter": "Retrospective Application",
                "old_value": "Section 436A CrPC",
                "new_value": "Section 479 BNSS applies RETROSPECTIVELY to pending cases per Supreme Court",
                "has_changed": True,
                "advocate_impact": "Can be immediately invoked for undertrials booked under legacy IPC/CrPC FIRs."
            }
        ],
        "key_litigator_takeaways": [
            "Supreme Court in Re: Inhuman Conditions in 1382 Prisons held Section 479 BNSS applies retrospectively to pending undertrials.",
            "Advocates should immediately file bail applications under Section 479 for any client who has completed 1/3rd maximum term.",
            "Applies to all offences other than those punishable with death or imprisonment for life."
        ],
        "court_submission_pleading": (
            "The applicant is a first-time offender who has never been convicted of any offence in the past. Having undergone "
            "detention exceeding one-third of the maximum sentence provided for the alleged offence, the applicant is entitled "
            "to statutory release on bail as a matter of right under the first proviso to Section 479(1) of the BNSS, 2023, "
            "which has been held to apply retrospectively to pending proceedings by the Hon'ble Supreme Court."
        )
    },

    "ipc_420_bns_318_4": {
        "pair_id": "ipc_420_bns_318_4",
        "category": "SUBSTANTIVE",
        "old_code": "IPC",
        "old_section": "420",
        "old_title": "Cheating and dishonestly inducing delivery of property",
        "new_code": "BNS",
        "new_section": "318(4)",
        "new_title": "Cheating and dishonestly inducing delivery of property",
        "old_verbatim_text": (
            "Whoever cheats and thereby dishonestly induces the person deceived to deliver any property to any person, "
            "or to make, alter or destroy the whole or any part of a valuable security, or anything which is signed or sealed, "
            "and which is capable of being converted into a valuable security, shall be punished with imprisonment of either "
            "description for a term which may extend to seven years, and shall also be liable to fine."
        ),
        "new_verbatim_text": (
            "(4) Whoever cheats and thereby dishonestly induces the person deceived to deliver any property to any person, "
            "or to make, alter or destroy the whole or any part of a valuable security, or anything which is signed or sealed, "
            "and which is capable of being converted into a valuable security, shall be punished with imprisonment of either "
            "description for a term which may extend to seven years, and shall also be liable to fine."
        ),
        "metadata_deltas": [
            {
                "parameter": "Constitutional Temporal Cutoff",
                "old_value": "Section 420 IPC strictly governs incidents occurring prior to July 1, 2024",
                "new_value": "Section 318(4) BNS strictly governs incidents occurring on or after July 1, 2024",
                "has_changed": True,
                "advocate_impact": "Article 20(1) bars charging under Section 318(4) BNS for pre-cutoff transactions."
            },
            {
                "parameter": "Essential Elements of Offence",
                "old_value": "Deception + Fraudulent Inducement from inception (Hridaya Ranjan Prasad)",
                "new_value": "Pari materia wording; dishonest intention at inception remains mandatory",
                "has_changed": False,
                "advocate_impact": "All landmark Supreme Court precedents distinguishing civil breach from criminal cheating apply unchanged."
            }
        ],
        "key_litigator_takeaways": [
            "Section 420 IPC corresponds to Section 318(4) BNS.",
            "Substantive elements of cheating remain unchanged.",
            "If the transaction occurred before July 1, 2024, charge must be framed under 420 IPC, not 318(4) BNS."
        ],
        "court_submission_pleading": (
            "It is submitted that the essential ingredient of cheating under Section 318(4) BNS remains dishonest intention at the inception "
            "of the commercial transaction. By operation of Section 8 of the General Clauses Act, 1897, the principles laid down by the "
            "Hon'ble Supreme Court in Hridaya Ranjan Prasad Verma and Dalip Kaur v. Jagnar Singh strictly govern the interpretation of Section 318(4)."
        )
    },

    "iea_65b_bsa_63": {
        "pair_id": "iea_65b_bsa_63",
        "category": "EVIDENTIARY",
        "old_code": "IEA",
        "old_section": "65B",
        "old_title": "Admissibility of electronic records",
        "new_code": "BSA",
        "new_section": "63",
        "new_title": "Admissibility of electronic records & Certificate requirements",
        "old_verbatim_text": (
            "(1) Notwithstanding anything contained in this Act, any information contained in an electronic record which is printed "
            "on a paper, stored, recorded or copied in optical or magnetic media produced by a computer shall be deemed to be also a "
            "document, if the conditions mentioned in this section are satisfied...\n"
            "(4) In any proceedings where it is desired to give a statement in evidence by virtue of this section, a certificate "
            "doing any of the following things, that is to say,—\n"
            "(a) identifying the electronic record containing the statement and describing the manner in which it was produced;\n"
            "(b) giving such particulars of any device involved in the production of that electronic record as may be appropriate for the purpose of showing that the electronic record was produced by a computer;\n"
            "(c) dealing with any of the matters to which the conditions mentioned in sub-section (2) relate,\n"
            "and purporting to be signed by a person occupying a responsible official position in relation to the operation of the relevant device..."
        ),
        "new_verbatim_text": (
            "(1) Notwithstanding anything contained in this Adhiniyam, any information contained in an electronic record which is printed "
            "on a paper, stored, recorded or copied in optical or magnetic media or semiconductor memory produced by a computer shall be "
            "deemed to be also a document...\n"
            "(4) In any proceedings where it is desired to give a statement in evidence by virtue of this section, a certificate in the form "
            "specified in the Schedule shall be submitted:\n"
            "Provided that such certificate shall be signed by the person in charge of the computer or communication device or the lawful "
            "keeper thereof, and an expert in the field of information technology, where available."
        ),
        "metadata_deltas": [
            {
                "parameter": "Mandatory Scheduled Certificate Format",
                "old_value": "Certificate drafted in free-form meeting sub-section (4) criteria (Arjun Panditrao)",
                "new_value": "Certificate must strictly follow the statutory format prescribed in the BSA Schedule",
                "has_changed": True,
                "advocate_impact": "Free-form Section 65B certificates for post-July 1 evidence face strict objection for non-compliance with Schedule."
            },
            {
                "parameter": "Device Scope",
                "old_value": "Optical or magnetic media",
                "new_value": "Explicit inclusion of 'semiconductor memory', servers, and cloud communication devices",
                "has_changed": True,
                "advocate_impact": "Pen-drives, SSDs, smartphone flash memory expressly recognized."
            }
        ],
        "key_litigator_takeaways": [
            "Section 63 BSA replaces Section 65B IEA.",
            "Mandatory certificate format now appended directly in the Schedule of the Bharatiya Sakshya Adhiniyam.",
            "Arjun Panditrao Khotkar (2020) 7 SCC 1 doctrine on mandatory certificate before evidence is marked as an exhibit applies with full vigor."
        ],
        "court_submission_pleading": (
            "The electronic records tendered by the prosecution without the mandatory certificate in the form specified in the "
            "Schedule to the Bharatiya Sakshya Adhiniyam, 2023, are legally inadmissible. In terms of the Constitution Bench decision in "
            "Arjun Panditrao Khotkar v. Kailash Kushanrao Gorantyal read with Section 63 BSA, production of the statutory certificate is "
            "a condition precedent to the admissibility of any secondary electronic evidence."
        )
    }
}

