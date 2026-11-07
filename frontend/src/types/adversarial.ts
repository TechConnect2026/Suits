/**
 * TypeScript types for Pillar 2: Strategic Adversarial Intelligence & Argument Builder.
 */

export type MatrixCategory =
  | "Jurisdiction"
  | "Limitation"
  | "Merits & Evidence"
  | "Natural Justice"
  | "Statutory Bar"
  | "General";

export interface MatrixRow {
  id: string;
  category: MatrixCategory;
  moving_party_ground: string;
  opposing_attack_vector: string;
  strategic_rebuttal: string;
  governing_citation: string;
  ratio_decidendi: string;
  strength_score: number;
}

export interface OppositionMatrixRequest {
  document_id?: string;
  raw_text?: string;
  case_title?: string;
  forum?: string;
  advocate_posture?: "petitioner" | "respondent";
  specific_concerns?: string;
}

export interface OppositionMatrixResponse {
  case_title: string;
  forum: string;
  advocate_posture: string;
  executive_summary: string;
  rows: MatrixRow[];
  overall_strength_assessment: string;
}

export interface ThreeProngItem {
  prong_name: "Prima Facie Case" | "Balance of Convenience" | "Irreparable Injury";
  moving_party_argument: string;
  opposing_counter_argument: string;
  adjudication_guidance: string;
  landmark_precedent: string;
}

export interface InterimStayRequest {
  document_id?: string;
  raw_text?: string;
  stay_relief_sought: string;
  matter_type:
    | "civil_suit"
    | "writ_petition"
    | "arbitration_s9"
    | "criminal_482_quashing"
    | "bail_application";
  advocate_side?: "seeking_stay" | "opposing_stay";
}

export interface InterimStayResponse {
  matter_type: string;
  advocate_side: string;
  stay_relief_sought: string;
  prongs: ThreeProngItem[];
  drafted_stay_clauses: string;
  vacation_grounds: string[];
}

export type DefectSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface DefectItem {
  id: string;
  severity: DefectSeverity;
  category: string;
  title: string;
  description: string;
  governing_rule: string;
  cure_recommendation: string;
  cure_clause_template?: string;
}

export interface WeaknessRadarRequest {
  document_id?: string;
  raw_text?: string;
  court_level?: string;
}

export interface WeaknessRadarResponse {
  risk_score: number;
  risk_tier: "CLEAN" | "LOW" | "MODERATE" | "CRITICAL";
  total_defects: number;
  defects: DefectItem[];
  procedural_clearance_summary: string;
}

export interface AdversarialExportRequest {
  case_title: string;
  forum: string;
  advocate_name?: string;
  matrix?: OppositionMatrixResponse;
  stay_analysis?: InterimStayResponse;
  weakness_radar?: WeaknessRadarResponse;
}

