export interface PrecedentSummary {
  title: string;
  citation: string;
  court: string;
  ratio: string;
}

export interface StatutoryDelta {
  provision_name: string;
  delta_type:
    | 'SUBSTANTIAL_CHANGE'
    | 'NEW_PROVISO_ADDED'
    | 'PROCEDURE_MODIFIED'
    | 'PENALTY_ENHANCED'
    | 'DIRECT_SUBSTITUTION';
  details: string;
  litigator_warning: string;
}

export interface StatuteConcordancePair {
  id: string;
  old_code: 'CrPC' | 'IPC' | 'IEA';
  old_section: string;
  old_title: string;
  new_code: 'BNSS' | 'BNS' | 'BSA';
  new_section: string;
  new_title: string;
  category: 'PROCEDURAL' | 'SUBSTANTIVE' | 'EVIDENTIARY';
  concept_doctrine: string;
  doctrine_summary: string;
  landmark_precedents: PrecedentSummary[];
  statutory_deltas: StatutoryDelta[];
  similarity_score?: number | null;
}

export interface PrecedentTranspositionItem {
  precedent_title: string;
  citation: string;
  historic_section_cited: string;
  transposed_section: string;
  governing_doctrine: string;
  court_pleading_paragraph: string;
  statutory_continuity_basis: string;
  persuasion_ratio: string;
}

export interface EraTransitionCaseAnalysis {
  target_cnr: string;
  active_era: 'NEW_BNS_ERA' | 'LEGACY_IPC_ERA' | 'HYBRID_TRANSITION_ERA';
  era_explanation: string;
  concordance_mappings: StatuteConcordancePair[];
  statutory_deltas: StatutoryDelta[];
  transposed_precedents: PrecedentTranspositionItem[];
  procedural_risks: string[];
  model_attribution: string;
  generated_at: string;
}

export interface ConcordanceLookupResponse {
  query: string;
  match_count: number;
  pairs: StatuteConcordancePair[];
}

/**
 * Zero-LLM instant concordance snapshot — served from static Python dictionary.
 * This is what's loaded on every criminal case page mount (0 tokens consumed).
 */
export interface EraTransitionInstant {
  target_cnr: string;
  active_era: 'NEW_BNS_ERA' | 'LEGACY_IPC_ERA' | 'HYBRID_TRANSITION_ERA';
  era_explanation: string;
  concordance_mappings: StatuteConcordancePair[];
  statutory_deltas: StatutoryDelta[];
  procedural_risks: string[];
  /** Always 'STATIC_CONCORDANCE_DICT' — confirms no LLM was called */
  source: string;
}

export interface TransitionQuestionResponse {
  question: string;
  answer: string;
  key_sections: StatuteConcordancePair[];
  governing_principles: string[];
  procedural_warnings: string[];
  draft_pleading_snippet?: string | null;
  confidence: number;
}

// ── Pillar 4: Temporal Safeguard & Verbatim Diff Types ──

export interface TemporalViolationItem {
  violation_code:
    | 'EX_POST_FACTO_PENAL_VIOLATION'
    | 'REPEALED_SUBSTANTIVE_LAW_CITED'
    | 'PROCEDURAL_CONTINUITY_MISMATCH'
    | 'EVIDENTIARY_CERTIFICATE_AMBIGUITY';
  title: string;
  description: string;
  problematic_citation: string;
  correct_statutory_reference: string;
  severity: 'CRITICAL' | 'HIGH' | 'WARNING';
}

export interface AutoRemedyItem {
  original_text: string;
  replacement_text: string;
  statute_type: 'SUBSTANTIVE' | 'PROCEDURAL' | 'EVIDENTIARY';
  rationale: string;
}

export interface TemporalInspectionRequest {
  incident_date: string;
  fir_date?: string | null;
  draft_text_or_sections?: string | null;
  case_type?: 'Bail' | 'Quashing' | 'Trial' | 'Appeal' | 'Demand Notice' | 'General';
}

export interface TemporalInspectionResponse {
  incident_date_resolved: string;
  fir_date_resolved?: string | null;
  is_pre_cutoff_incident: boolean;
  is_pre_cutoff_fir: boolean;
  statutory_regime: 'PURE_LEGACY_IPC' | 'HYBRID_TRANSITION_ERA' | 'PURE_NEW_BNS';
  substantive_code_required: 'IPC' | 'BNS';
  procedural_code_required: 'CrPC' | 'BNSS';
  evidence_act_required: 'IEA' | 'BSA';
  constitutional_assessment: string;
  violations: TemporalViolationItem[];
  remedies: AutoRemedyItem[];
  court_declaration_snippet: string;
}

export interface WordDiffChunk {
  text: string;
  type: 'unchanged' | 'added' | 'deleted';
}

export interface MetadataDelta {
  parameter: string;
  old_value: string;
  new_value: string;
  has_changed: boolean;
  advocate_impact: string;
}

export interface StatutoryVerbatimDiffResponse {
  pair_id: string;
  old_title_full: string;
  new_title_full: string;
  old_verbatim_text: string;
  new_verbatim_text: string;
  diff_chunks: WordDiffChunk[];
  metadata_deltas: MetadataDelta[];
  key_litigator_takeaways: string[];
  court_submission_pleading: string;
}

export interface TransitionalJurisprudenceItem {
  id: string;
  case_title: string;
  citation: string;
  court: string;
  bench_coram: string;
  decision_date: string;
  topic_category:
    | 'Undertrial Bail (BNSS 479)'
    | 'Police Custody (BNSS 187)'
    | 'Preliminary Inquiry (BNSS 173)'
    | 'Mandatory Videography (BNSS 105)'
    | 'Savings & Pending Petitions (BNSS 531)'
    | 'Electronic Evidence (BSA 63)'
    | 'General Clauses Continuity';
  core_holding: string;
  strategic_ratio_quote: string;
  court_pleading_snippet: string;
  source_url?: string | null;
}

export interface TransitionalJurisprudenceResponse {
  total_count: number;
  items: TransitionalJurisprudenceItem[];
}
