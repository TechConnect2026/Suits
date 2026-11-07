/**
 * Indian Legal Vocabulary & Phonetic Auto-Correction Engine
 * 
 * Post-processes transcribed speech chunks from the Web Speech API (`en-IN`)
 * to resolve common phonetic misinterpretations of:
 * 1. Indian court & procedural vernacular (Urdu/Persian/Hindi court terminology: Vakalatnama, Roznamcha, Panchnama, etc.)
 * 2. Latin legal maxims & constitutional doctrines (In pari materia, Coram, Ex-parte, Res judicata, etc.)
 * 3. Statutory citations, Acts, and Sections (BNSS, BNS, BSA, CrPC, CPC, IPC, Section 138, Section 482, etc.)
 * 4. Pleading types & procedural applications (Quashing, SLP, Anticipatory Bail, Caveat, Order VII Rule 11, etc.)
 * 5. Spoken punctuation commands ("comma", "full stop", "question mark", "new line")
 */

export interface LegalCorrection {
  original: string;
  corrected: string;
}

export interface CorrectionResult {
  correctedText: string;
  corrections: LegalCorrection[];
}

interface ReplacementRule {
  pattern: RegExp;
  replacement: string | ((match: string, ...args: any[]) => string);
  correctedLabel?: string;
}

/**
 * Pre-compiled rules array ordered by specificity (higher specificity first).
 */
const CORRECTION_RULES: ReplacementRule[] = [
  // ─── Spoken Punctuation & Formatting ───
  { pattern: /\b(?:comma)\b/gi, replacement: "," },
  { pattern: /\b(?:full\s*stop|period)\b/gi, replacement: "." },
  { pattern: /\b(?:question\s*mark)\b/gi, replacement: "?" },
  { pattern: /\b(?:colon)\b/gi, replacement: ":" },
  { pattern: /\b(?:semi\s*colon|semicolon)\b/gi, replacement: ";" },
  { pattern: /\b(?:new\s*line|next\s*line)\b/gi, replacement: "\n" },
  { pattern: /\b(?:open\s*bracket|open\s*parenthesis)\b/gi, replacement: "(" },
  { pattern: /\b(?:close\s*bracket|close\s*parenthesis)\b/gi, replacement: ")" },

  // ─── High-Priority Pleading & Court Vernacular ───
  // Vakalatnama
  {
    pattern: /\b(?:whack\s*alert\s*nama|whack\s*a\s*lot\s*nama|vocal\s*at\s*nama|vocat\s*nama|vakalat\s*nama|vakeelat\s*nama|wakalatnama|wakalat\s*nama|vakalatnamah)\b/gi,
    replacement: "Vakalatnama",
    correctedLabel: "Vakalatnama",
  },
  // Quashing of FIR / Quashing petition
  {
    pattern: /\b(?:washment\s*of\s*fir|crashing\s*of\s*fir|cashing\s*of\s*fir|crashing\s*the\s*fir|washment\s*of\s*the\s*fir)\b/gi,
    replacement: "quashing of FIR",
    correctedLabel: "quashing of FIR",
  },
  {
    pattern: /\b(?:crashing\s*petition|cashing\s*petition|washment\s*petition|quashment\s*petition)\b/gi,
    replacement: "quashing petition",
    correctedLabel: "quashing petition",
  },
  {
    pattern: /\b(?:quashment|washment)\b/gi,
    replacement: "quashing",
    correctedLabel: "quashing",
  },
  // Special Leave Petition / SLP
  {
    pattern: /\b(?:s\.\s*l\.\s*p\.?|s\s+l\s+p|slp|see\s*l\s*p)\b/gi,
    replacement: "SLP",
    correctedLabel: "SLP",
  },
  {
    pattern: /\bspecial\s+leave\s+petition\b/gi,
    replacement: "Special Leave Petition (SLP)",
    correctedLabel: "Special Leave Petition (SLP)",
  },
  // Caveat
  {
    pattern: /\b(?:caviat\s*petition|kaveat\s*petition|caveat\s*application)\b/gi,
    replacement: "caveat petition",
    correctedLabel: "caveat petition",
  },
  {
    pattern: /\b(?:caviat|kaveat)\b/gi,
    replacement: "caveat",
    correctedLabel: "caveat",
  },
  // Coram
  {
    pattern: /\b(before\s+the\s+|the\s+)?(?:co\s*rum|co\s*ram|koram|quorum)\s+bench\b/gi,
    replacement: (_m, prefix) => `${prefix || ""}Coram Bench`,
    correctedLabel: "Coram Bench",
  },
  {
    pattern: /\b(before\s+the|by\s+the|division|full|constitution)\s+(?:co\s*rum|co\s*ram|koram)\b/gi,
    replacement: (_m, prefix) => `${prefix} Coram`,
    correctedLabel: "Coram",
  },
  {
    pattern: /\b(?:co\s*rum|co\s*ram|koram)\b(?=\s*[:\-–]|\s+comprising|\s+consisting|\s+of\s+Hon)/gi,
    replacement: "CORAM",
    correctedLabel: "CORAM",
  },

  // ─── Latin Maxims & Constitutional Doctrines ───
  // In pari materia
  {
    pattern: /\b(?:in\s+curry\s+materia|in\s+party\s+materia|in\s+perry\s+materia|in\s+pari\s+material|perry\s+materia|party\s+materia)\b/gi,
    replacement: "in pari materia",
    correctedLabel: "in pari materia",
  },
  // Ex parte
  {
    pattern: /\b(?:x\s*party|ex\s*party|exparty|x-party|x\s*parte|ex-parte)\b/gi,
    replacement: "ex-parte",
    correctedLabel: "ex-parte",
  },
  // Res judicata
  {
    pattern: /\b(?:race\s*judicata|rest\s*judicata|resjudicata|race\s*judicature)\b/gi,
    replacement: "res judicata",
    correctedLabel: "res judicata",
  },
  // Certiorari
  {
    pattern: /\b(?:sir\s*sheer\s*rare\s*e|search\s*your\s*rare\s*e|sartiorari|certio\s*rari|searchio\s*rari|sir\s*show\s*rari|certio\s*rare\s*e)\b/gi,
    replacement: "certiorari",
    correctedLabel: "certiorari",
  },
  // Suo motu
  {
    pattern: /\b(?:suo\s*moto|suo\s*motto|sumoto|suomoto|so\s*moto)\b/gi,
    replacement: "suo motu",
    correctedLabel: "suo motu",
  },
  // De hors
  {
    pattern: /\b(?:de\s*horse|day\s*horse|the\s*horse|d\s*horse)\b(?=\s+the\s+record|\s+the\s+pleadings|\b)/gi,
    replacement: "de hors",
    correctedLabel: "de hors",
  },
  // Stay & Injunctions
  {
    pattern: /\b(?:in\s*the\s*rim\s*stay|in\s*term\s*stay|interim\s*state)\b/gi,
    replacement: "interim stay",
    correctedLabel: "interim stay",
  },
  {
    pattern: /\b(?:add\s*interim|ad-interim)\b/gi,
    replacement: "ad-interim",
    correctedLabel: "ad-interim",
  },
  // Writs
  {
    pattern: /\b(?:heavy\s*as\s*corpus|heaviest\s*corpus|have\s*yes\s*corpus)\b/gi,
    replacement: "habeas corpus",
    correctedLabel: "habeas corpus",
  },
  {
    pattern: /\b(?:man\s*damus|men\s*damus|mandamas)\b/gi,
    replacement: "mandamus",
    correctedLabel: "mandamus",
  },
  {
    pattern: /\b(?:co\s*warranto|quowarranto)\b/gi,
    replacement: "quo warranto",
    correctedLabel: "quo warranto",
  },
  // Locus standi
  {
    pattern: /\b(?:locus\s*standard|locus\s*standee|locus\s*candy)\b/gi,
    replacement: "locus standi",
    correctedLabel: "locus standi",
  },
  // Prima facie
  {
    pattern: /\b(?:primary\s*facie|prima\s*fashi|prima\s*facia|prime\s*a\s*facie)\b/gi,
    replacement: "prima facie",
    correctedLabel: "prima facie",
  },
  // Pendente lite
  {
    pattern: /\b(?:pendent\s*elite|pendant\s*light|pendant\s*lite)\b/gi,
    replacement: "pendente lite",
    correctedLabel: "pendente lite",
  },
  // Sub judice
  {
    pattern: /\b(?:sub\s*juice|sub\s*judise|subjudice)\b/gi,
    replacement: "sub judice",
    correctedLabel: "sub judice",
  },
  // Stare decisis
  {
    pattern: /\b(?:stari\s*decisis|stair\s*decisis)\b/gi,
    replacement: "stare decisis",
    correctedLabel: "stare decisis",
  },
  // Ratio decidendi
  {
    pattern: /\b(?:ratio\s*decision\s*die|ratio\s*decidandi|ratio\s*decisi)\b/gi,
    replacement: "ratio decidendi",
    correctedLabel: "ratio decidendi",
  },
  // Obiter dictum
  {
    pattern: /\b(?:orbiter\s*dictum|obiter\s*dicta|orbiter\s*dicta)\b/gi,
    replacement: "obiter dictum",
    correctedLabel: "obiter dictum",
  },
  // Audi alteram partem
  {
    pattern: /\b(?:audio\s*ultra\s*partum|audi\s*alteram\s*partum|audi\s*altram\s*partem|audi\s*ultra\s*partum)\b/gi,
    replacement: "audi alteram partem",
    correctedLabel: "audi alteram partem",
  },
  // Nemo judex in causa sua
  {
    pattern: /\b(?:nemo\s*judex\s*in\s*cause\s*sua|nemo\s*judex\s*in\s*causa)\b/gi,
    replacement: "nemo judex in causa sua",
    correctedLabel: "nemo judex in causa sua",
  },
  // Vires
  {
    pattern: /\b(?:ultra\s*virus|ultra\s*viral)\b/gi,
    replacement: "ultra vires",
    correctedLabel: "ultra vires",
  },
  {
    pattern: /\b(?:intra\s*virus)\b/gi,
    replacement: "intra vires",
    correctedLabel: "intra vires",
  },
  // Amicus curiae
  {
    pattern: /\b(?:amicus\s*cure\s*e|amicus\s*curry|amicus\s*curi)\b/gi,
    replacement: "amicus curiae",
    correctedLabel: "amicus curiae",
  },
  // Mutatis mutandis
  {
    pattern: /\b(?:mutatis\s*mutant\s*is|mutatus\s*mutandis)\b/gi,
    replacement: "mutatis mutandis",
    correctedLabel: "mutatis mutandis",
  },
  // In limine
  {
    pattern: /\b(?:in\s*lemon\s*y|in\s*lemine|in\s*liminy)\b/gi,
    replacement: "in limine",
    correctedLabel: "in limine",
  },
  // Non obstante clause
  {
    pattern: /\b(?:non\s*obstacle\s*clause|non-obstante\s*clause)\b/gi,
    replacement: "non-obstante clause",
    correctedLabel: "non-obstante clause",
  },
  // Lis pendens
  {
    pattern: /\b(?:lease\s*pendens|list\s*pendens)\b/gi,
    replacement: "lis pendens",
    correctedLabel: "lis pendens",
  },
  // Per incuriam
  {
    pattern: /\b(?:per\s*in\s*curium|per\s*incurium)\b/gi,
    replacement: "per incuriam",
    correctedLabel: "per incuriam",
  },
  // Ejusdem generis
  {
    pattern: /\b(?:ajusdem\s*generis|ejusdem\s*generous)\b/gi,
    replacement: "ejusdem generis",
    correctedLabel: "ejusdem generis",
  },
  // Noscitur a sociis
  {
    pattern: /\b(?:nosciter\s*a\s*sociis|noscitur\s*a\s*socios)\b/gi,
    replacement: "noscitur a sociis",
    correctedLabel: "noscitur a sociis",
  },
  // Status quo
  {
    pattern: /\b(?:statues\s*quo|status\s*queue)\b/gi,
    replacement: "status quo",
    correctedLabel: "status quo",
  },
  // Ipso facto
  {
    pattern: /\b(?:if\s*so\s*facto)\b/gi,
    replacement: "ipso facto",
    correctedLabel: "ipso facto",
  },
  // Res integra
  {
    pattern: /\b(?:res\s*integrate|race\s*integra)\b/gi,
    replacement: "res integra",
    correctedLabel: "res integra",
  },

  // ─── Indian Court Vocabulary & Vernacular Terms ───
  {
    pattern: /\b(?:punch\s*nama|panch\s*nama|punch-nama)\b/gi,
    replacement: "panchnama",
    correctedLabel: "panchnama",
  },
  {
    pattern: /\b(?:mudda\s*mal|mudamal)\b/gi,
    replacement: "muddamal",
    correctedLabel: "muddamal",
  },
  {
    pattern: /\b(?:rojnamcha|roj\s*namcha|roz\s*namcha)\b/gi,
    replacement: "roznamcha",
    correctedLabel: "roznamcha",
  },
  {
    pattern: /\b(?:dusty\s*notice|dusty\s*service|dasti\s*service)\b/gi,
    replacement: "dasti notice",
    correctedLabel: "dasti notice",
  },
  {
    pattern: /\b(?:anticipatery\s*bail|anticipated\s*bail)\b/gi,
    replacement: "anticipatory bail",
    correctedLabel: "anticipatory bail",
  },
  {
    pattern: /\b(?:transit\s*anticipated\s*bail|transit\s*anticipatery\s*bail)\b/gi,
    replacement: "transit anticipatory bail",
    correctedLabel: "transit anticipatory bail",
  },
  {
    pattern: /\b(?:in\s*damnity\s*bond)\b/gi,
    replacement: "indemnity bond",
    correctedLabel: "indemnity bond",
  },
  {
    pattern: /\b(?:calendra|calandra)\b/gi,
    replacement: "kalandra",
    correctedLabel: "kalandra",
  },
  {
    pattern: /\b(?:mal\s*khana)\b/gi,
    replacement: "malkhana",
    correctedLabel: "malkhana",
  },
  {
    pattern: /\b(?:charge\s*sheet|charge-sheet)\b/gi,
    replacement: "chargesheet",
    correctedLabel: "chargesheet",
  },
  {
    pattern: /\b(?:fard-e-maqboozi|fard\s*e\s*maqboozi)\b/gi,
    replacement: "fard-e-maqboozi",
    correctedLabel: "fard-e-maqboozi",
  },
  {
    pattern: /\b(?:satta\s*khat)\b/gi,
    replacement: "sattakhat",
    correctedLabel: "sattakhat",
  },
  {
    pattern: /\b(?:jama\s*bandi)\b/gi,
    replacement: "jamabandi",
    correctedLabel: "jamabandi",
  },
  {
    pattern: /\b(?:khatawni|khata\s*uni)\b/gi,
    replacement: "khatauni",
    correctedLabel: "khatauni",
  },
  {
    pattern: /\b(?:tehsil\s*dar|tahsildar)\b/gi,
    replacement: "Tehsildar",
    correctedLabel: "Tehsildar",
  },
  {
    pattern: /\b(?:patta\s*dar)\b/gi,
    replacement: "pattadar",
    correctedLabel: "pattadar",
  },
  {
    pattern: /\b(?:nikah\s*nama)\b/gi,
    replacement: "Nikahnama",
    correctedLabel: "Nikahnama",
  },
  {
    pattern: /\b(?:talaq\s*nama)\b/gi,
    replacement: "Talaqnama",
    correctedLabel: "Talaqnama",
  },
  {
    pattern: /\b(?:non\s*bailable\s*warrant|n\s*\.?\s*b\s*\.?\s*w)\b/gi,
    replacement: "Non-Bailable Warrant (NBW)",
    correctedLabel: "NBW",
  },
  {
    pattern: /\b(?:bailable\s*warrant|b\s*\.?\s*w)\b/gi,
    replacement: "Bailable Warrant",
    correctedLabel: "Bailable Warrant",
  },

  // ─── Indian Statutory Acts & Sanhitas ───
  { pattern: /\b(?:c\.\s*r\.\s*p\.\s*c\.?|c\s+r\s+p\s+c|crpc|see\s*r\s*p\s*c)\b/gi, replacement: "CrPC", correctedLabel: "CrPC" },
  { pattern: /\b(?:c\.\s*p\.\s*c\.?|c\s+p\s+c|cpc|see\s*p\s*c)\b/gi, replacement: "CPC", correctedLabel: "CPC" },
  { pattern: /\b(?:i\.\s*p\.\s*c\.?|i\s+p\s+c|ipc|eye\s*p\s*c)\b/gi, replacement: "IPC", correctedLabel: "IPC" },
  { pattern: /\b(?:b\.\s*n\.\s*s\.\s*s\.?|b\s+n\s+s\s+s|bnss|bharatiya\s*nagarik\s*suraksha\s*sanhita)\b/gi, replacement: "BNSS", correctedLabel: "BNSS" },
  { pattern: /\b(?:b\.\s*n\.\s*s\.?|b\s+n\s+s|bns|bharatiya\s*nyaya\s*sanhita)\b/gi, replacement: "BNS", correctedLabel: "BNS" },
  { pattern: /\b(?:b\.\s*s\.\s*a\.?|b\s+s\s+a|bsa|bharatiya\s*sakshya\s*adhiniyam)\b/gi, replacement: "BSA", correctedLabel: "BSA" },
  { pattern: /\b(?:n\.\s*i\.\s*act|n\s+i\s+act|and\s*i\s*act|negotiable\s*instruments\s*act)\b/gi, replacement: "NI Act", correctedLabel: "NI Act" },
  { pattern: /\b(?:p\s*o\s*c\s*s\s*o|pock\s*so)\s*(?:act)?\b/gi, replacement: "POCSO Act", correctedLabel: "POCSO Act" },
  { pattern: /\b(?:p\s*m\s*l\s*a|p\.?\s*m\.?\s*l\.?\s*a\.?)\b/gi, replacement: "PMLA", correctedLabel: "PMLA" },
  { pattern: /\b(?:u\s*a\s*p\s*a|u\.?\s*a\.?\s*p\.?\s*a\.?)\b/gi, replacement: "UAPA", correctedLabel: "UAPA" },
  { pattern: /\b(?:s\s*a\s*r\s*f\s*a\s*e\s*s\s*i|sarfesi|surface\s*e\s*act)\b/gi, replacement: "SARFAESI Act", correctedLabel: "SARFAESI Act" },
  { pattern: /\b(?:n\s*d\s*p\s*s|ndps\s*act)\b/gi, replacement: "NDPS Act", correctedLabel: "NDPS Act" },
  { pattern: /\b(?:i\s*b\s*c|insolvency\s*and\s*bankruptcy\s*code)\b/gi, replacement: "IBC", correctedLabel: "IBC" },
  { pattern: /\b(?:f\s*i\s*r|f\.?\s*i\.?\s*r\.?|eff\s*i\s*r)\b/gi, replacement: "FIR", correctedLabel: "FIR" },

  // ─── Procedural CPC Orders & Rules ───
  // Order 7 Rule 11
  {
    pattern: /\border\s+(?:seven|7)\s+rules?\s+(?:eleven|11)(?:\s+(?:c\s*p\s*c|cpc))?\b/gi,
    replacement: "Order VII Rule 11 CPC",
    correctedLabel: "Order VII Rule 11 CPC",
  },
  // Order 39 Rules 1 & 2
  {
    pattern: /\border\s+(?:thirty\s+nine|39)\s+rules?\s+(?:one\s+and\s+two|1\s*(?:and|&)\s*2)(?:\s+(?:c\s*p\s*c|cpc))?\b/gi,
    replacement: "Order XXXIX Rules 1 & 2 CPC",
    correctedLabel: "Order XXXIX Rules 1 & 2 CPC",
  },
  // Order 8 Rule 1
  {
    pattern: /\border\s+(?:eight|8)\s+rules?\s+(?:one|1)(?:\s+(?:c\s*p\s*c|cpc))?\b/gi,
    replacement: "Order VIII Rule 1 CPC",
    correctedLabel: "Order VIII Rule 1 CPC",
  },

  // ─── Spoken Statutory Sections with Spoken Word Numbers ───
  // Section 138 (NI Act)
  {
    pattern: /\b(under\s+section|u\/s|sec(?:tion)?)\s+(?:one\s+thirty\s+eight|one\s+three\s+eight|1\s*3\s*8|138)\s*(?:of\s+the\s+)?(?:n\s*i\s*act|ni\s*act|negotiable\s*instruments\s*act)?\b/gi,
    replacement: (_m, prefix) => prefix?.toLowerCase().includes("under") ? "under Section 138 NI Act" : "Section 138 NI Act",
    correctedLabel: "Section 138 NI Act",
  },
  // Section 482 CrPC / Section 528 BNSS (Inherent Powers)
  {
    pattern: /\b(under\s+section|u\/s|sec(?:tion)?)\s+(?:four\s+eighty\s+two|4\s*8\s*2|482)\s*(?:of\s+the\s+)?(?:c\s*r\s*p\s*c|crpc)?\b/gi,
    replacement: (_m, prefix) => prefix?.toLowerCase().includes("under") ? "under Section 482 CrPC" : "Section 482 CrPC",
    correctedLabel: "Section 482 CrPC",
  },
  {
    pattern: /\b(under\s+section|u\/s|sec(?:tion)?)\s+(?:five\s+twenty\s+eight|5\s*2\s*8|528)\s*(?:of\s+the\s+)?(?:b\s*n\s*s\s*s|bnss)?\b/gi,
    replacement: (_m, prefix) => prefix?.toLowerCase().includes("under") ? "under Section 528 BNSS" : "Section 528 BNSS",
    correctedLabel: "Section 528 BNSS",
  },
  // Section 438 CrPC / Section 482 BNSS (Anticipatory Bail)
  {
    pattern: /\b(under\s+section|u\/s|sec(?:tion)?)\s+(?:four\s+thirty\s+eight|4\s*3\s*8|438)\s*(?:of\s+the\s+)?(?:c\s*r\s*p\s*c|crpc)?\b/gi,
    replacement: (_m, prefix) => prefix?.toLowerCase().includes("under") ? "under Section 438 CrPC" : "Section 438 CrPC",
    correctedLabel: "Section 438 CrPC",
  },
  // Section 439 CrPC / Section 483 BNSS (Regular Bail)
  {
    pattern: /\b(under\s+section|u\/s|sec(?:tion)?)\s+(?:four\s+thirty\s+nine|4\s*3\s*9|439)\s*(?:of\s+the\s+)?(?:c\s*r\s*p\s*c|crpc)?\b/gi,
    replacement: (_m, prefix) => prefix?.toLowerCase().includes("under") ? "under Section 439 CrPC" : "Section 439 CrPC",
    correctedLabel: "Section 439 CrPC",
  },
  // Section 302 IPC / Section 103 BNS (Murder)
  {
    pattern: /\b(under\s+section|u\/s|sec(?:tion)?)\s+(?:three\s+zero\s+two|3\s*0\s*2|302)\b/gi,
    replacement: (_m, prefix) => prefix?.toLowerCase().includes("under") ? "under Section 302" : "Section 302",
    correctedLabel: "Section 302",
  },
  // Section 307 IPC / Section 109 BNS (Attempt to Murder)
  {
    pattern: /\b(under\s+section|u\/s|sec(?:tion)?)\s+(?:three\s+zero\s+seven|3\s*0\s*7|307)\b/gi,
    replacement: (_m, prefix) => prefix?.toLowerCase().includes("under") ? "under Section 307" : "Section 307",
    correctedLabel: "Section 307",
  },
  // Section 376 IPC / Section 64 BNS (Rape)
  {
    pattern: /\b(under\s+section|u\/s|sec(?:tion)?)\s+(?:three\s+seventy\s+six|3\s*7\s*6|376)\b/gi,
    replacement: (_m, prefix) => prefix?.toLowerCase().includes("under") ? "under Section 376" : "Section 376",
    correctedLabel: "Section 376",
  },
  // Section 420 IPC / Section 318(4) BNS (Cheating)
  {
    pattern: /\b(under\s+section|u\/s|sec(?:tion)?)\s+(?:four\s+twenty|4\s*2\s*0|420)\b/gi,
    replacement: (_m, prefix) => prefix?.toLowerCase().includes("under") ? "under Section 420" : "Section 420",
    correctedLabel: "Section 420",
  },
  // Section 120B IPC / Section 61(2) BNS (Criminal Conspiracy)
  {
    pattern: /\b(under\s+section|u\/s|sec(?:tion)?)\s+(?:one\s+twenty\s+b|120\s*b|1\s*2\s*0\s*b)\b/gi,
    replacement: (_m, prefix) => prefix?.toLowerCase().includes("under") ? "under Section 120B" : "Section 120B",
    correctedLabel: "Section 120B",
  },
  // Section 34 IPC / Section 3(5) BNS (Common Intention)
  {
    pattern: /\b(under\s+section|u\/s|sec(?:tion)?)\s+(?:thirty\s+four|3\s*4|34)\b/gi,
    replacement: (_m, prefix) => prefix?.toLowerCase().includes("under") ? "under Section 34" : "Section 34",
    correctedLabel: "Section 34",
  },
  // Section 156(3) CrPC / Section 175(3) BNSS
  {
    pattern: /\b(under\s+section|u\/s|sec(?:tion)?)\s+(?:one\s+fifty\s+six\s*(?:bracket\s*3|\(3\)|3)|156\s*\(3\)|156\s*3)\b/gi,
    replacement: (_m, prefix) => prefix?.toLowerCase().includes("under") ? "under Section 156(3)" : "Section 156(3)",
    correctedLabel: "Section 156(3)",
  },
  // Section 65B Evidence Act / Section 63 BSA
  {
    pattern: /\b(under\s+section|u\/s|sec(?:tion)?)\s+(?:sixty\s+five\s+b|65\s*b|65-b)\b/gi,
    replacement: (_m, prefix) => prefix?.toLowerCase().includes("under") ? "under Section 65B" : "Section 65B",
    correctedLabel: "Section 65B",
  },
  {
    pattern: /\b(under\s+section|u\/s|sec(?:tion)?)\s+(?:sixty\s+three|63)\s*(?:of\s+the\s+)?(?:b\s*s\s*a|bsa)\b/gi,
    replacement: (_m, prefix) => prefix?.toLowerCase().includes("under") ? "under Section 63 BSA" : "Section 63 BSA",
    correctedLabel: "Section 63 BSA",
  },
  // Generic Section <number>
  {
    pattern: /\b(under\s+section|u\/s|sec(?:tion)?)\s+(\d+[A-Za-z]?)\b/gi,
    replacement: (_match, prefix, num) => prefix?.toLowerCase().includes("under") ? `under Section ${num}` : `Section ${num}`,
  },

  // ─── Constitutional Articles ───
  // Article 226
  {
    pattern: /\b(under\s+)?(?:art(?:icle)?)\s+(?:two\s+twenty\s+six|2\s*2\s*6|226)\b/gi,
    replacement: (_m, under) => `${under ? "under " : ""}Article 226`,
    correctedLabel: "Article 226",
  },
  // Article 32
  {
    pattern: /\b(under\s+)?(?:art(?:icle)?)\s+(?:thirty\s+two|3\s*2|32)\b/gi,
    replacement: (_m, under) => `${under ? "under " : ""}Article 32`,
    correctedLabel: "Article 32",
  },
  // Article 136
  {
    pattern: /\b(under\s+)?(?:art(?:icle)?)\s+(?:one\s+thirty\s+six|1\s*3\s*6|136)\b/gi,
    replacement: (_m, under) => `${under ? "under " : ""}Article 136`,
    correctedLabel: "Article 136",
  },
  // Article 20(1) (Ex-post facto protection)
  {
    pattern: /\b(under\s+)?(?:art(?:icle)?)\s+(?:twenty\s+(?:bracket\s*one|\(1\)|one)|20\s*\(1\)|20\s*1)\b/gi,
    replacement: (_m, under) => `${under ? "under " : ""}Article 20(1)`,
    correctedLabel: "Article 20(1)",
  },
  // Article 21
  {
    pattern: /\b(under\s+)?(?:art(?:icle)?)\s+(?:twenty\s+one|2\s*1|21)\b/gi,
    replacement: (_m, under) => `${under ? "under " : ""}Article 21`,
    correctedLabel: "Article 21",
  },
  // Article 14
  {
    pattern: /\b(under\s+)?(?:art(?:icle)?)\s+(?:fourteen|1\s*4|14)\b/gi,
    replacement: (_m, under) => `${under ? "under " : ""}Article 14`,
    correctedLabel: "Article 14",
  },
  // Generic Article <number>
  {
    pattern: /\b(under\s+)?(?:art(?:icle)?)\s+(\d+(?:\([0-9A-Za-z]+\))?[A-Za-z]?)\b/gi,
    replacement: (_match, under, num) => `${under ? "under " : ""}Article ${num}`,
  },
];

/**
 * Clean up punctuation spacing and capitalizes sentence beginnings
 */
function polishPunctuationAndSpacing(text: string): string {
  return text
    // Remove space before punctuation: "word ," -> "word,"
    .replace(/\s+([,.:;?!])/g, "$1")
    // Ensure space after punctuation if followed by word: "word,another" -> "word, another"
    .replace(/([,.:;?!])([A-Za-z0-9])/g, "$1 $2")
    // Multiple spaces into single space
    .replace(/[ \t]+/g, " ")
    // Trim extra spaces around newlines
    .replace(/ *\n */g, "\n")
    // Sentence capitalization after full stop, question mark, or newline
    .replace(/(?:^|[.?!]\s+|\n+)([a-z])/g, (_match, char) => _match.toUpperCase());
}

/**
 * Post-processes transcribed text using the Indian legal vocabulary dictionary.
 * Returns the polished text and an array of unique corrections applied.
 */
export function correctLegalSpeech(rawText: string): CorrectionResult {
  if (!rawText || !rawText.trim()) {
    return { correctedText: rawText, corrections: [] };
  }

  let text = rawText;
  const correctionsMap = new Map<string, string>();

  for (const rule of CORRECTION_RULES) {
    text = text.replace(rule.pattern, (match, ...args) => {
      let replacementStr: string;
      if (typeof rule.replacement === "function") {
        replacementStr = rule.replacement(match, ...args);
      } else {
        replacementStr = rule.replacement;
      }

      if (rule.correctedLabel && match.trim().toLowerCase() !== replacementStr.trim().toLowerCase()) {
        correctionsMap.set(match.trim(), rule.correctedLabel);
      }
      return replacementStr;
    });
  }

  const polishedText = polishPunctuationAndSpacing(text);

  const corrections: LegalCorrection[] = Array.from(correctionsMap.entries()).map(
    ([original, corrected]) => ({ original, corrected })
  );

  return {
    correctedText: polishedText,
    corrections,
  };
}
