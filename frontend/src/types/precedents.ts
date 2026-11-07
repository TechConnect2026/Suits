/**
 * TypeScript types for Pillar 3: Precedent Research & Precedent Surfacing.
 */

export type RelevanceCategory =
  | "Direct Precedent"
  | "Procedural Shield"
  | "Statutory Interpretation"
  | "Distinguishing Precedent"
  | "Factual Analogy"
  | "General Authority";

export interface RelevanceRequest {
  query: string;
  case_title: string;
  court_name?: string;
  decision_date?: string | null;
  snippet?: string | null;
  advocate_posture?: "petitioner" | "respondent" | "general";
}

export interface RelevanceResponse {
  case_title: string;
  why_this_helps: string;
  relevance_category: RelevanceCategory;
  strategic_utility: string;
  key_anchor_section?: string | null;
}

export interface BatchRelevanceRequest {
  query: string;
  items: RelevanceRequest[];
}

export interface BatchRelevanceResponse {
  results: RelevanceResponse[];
}

export interface IssueFramedItem {
  issue_number: number;
  question_of_law: string;
  court_finding: string;
  answered_in_favour_of: "Petitioner / Appellant" | "Respondent" | "Partly" | "Remanded" | "Neutral";
}

export interface RatioDecidendiItem {
  core_rule_of_law: string;
  binding_proposition: string;
  governing_paragraphs: string[];
  bench_strength?: string | null;
  precedential_weight: "Binding Supreme Court Precedent" | "Binding High Court Precedent" | "Persuasive High Court Precedent";
}

export interface ObiterDictaItem {
  observation: string;
  context: string;
  nature: "Societal Commentary" | "Guidance to Police/Investigating Agencies" | "Legislative Reform Suggestion" | "Trial Court Direction" | "General Observation";
}

export interface StatuteInterpretedItem {
  act_name: string;
  section_article: string;
  nature_of_interpretation: "Strict" | "Purposive" | "Harmonious" | "Read Down" | "Constitutional Validity Upheld" | "General Interpretation";
  interpretation_summary: string;
}

export interface StrategicRelevanceItem {
  why_this_helps: string;
  relevance_category: string;
  strategic_utility: string;
  key_anchor_section?: string | null;
}

export interface VerdictAnatomyRequest {
  cnr?: string;
  tid?: number;
  raw_text?: string;
  case_title?: string;
  court_name?: string;
  search_query?: string;
  advocate_posture?: string;
}

export interface VerdictAnatomyResponse {
  case_title: string;
  official_citation: string;
  kanoon_tid?: number | null;
  kanoon_url?: string | null;
  court_name: string;
  decision_date?: string | null;
  bench_coram: string[];
  disposition: string;
  strategic_relevance?: StrategicRelevanceItem | null;
  issues_framed: IssueFramedItem[];
  material_facts: string[];
  procedural_journey: string;
  ratio_decidendi: RatioDecidendiItem;
  obiter_dicta: ObiterDictaItem[];
  statutes_interpreted: StatuteInterpretedItem[];
  one_line_takeaway: string;
}

export interface FormatCitationRequest {
  case_title: string;
  official_citation: string;
  ratio_summary: string;
  paragraph_number?: string | null;
  format_type?: "standard_indian" | "blockquote_pleading" | "synopsis_table";
}

export interface FormatCitationResponse {
  plain_text: string;
  html_markup: string;
}

