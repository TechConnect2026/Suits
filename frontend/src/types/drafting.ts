export type DraftingTemplateId =
  | "CRIMINAL_ANTICIPATORY_BAIL"
  | "CRIMINAL_REGULAR_BAIL"
  | "CRIMINAL_QUASHING_482"
  | "CRIMINAL_SECTION_138_NI"
  | "CIVIL_WRIT_PETITION"
  | "CIVIL_CRIMINAL_SLP"
  | "CIVIL_PLAINT_WS"
  | "COURT_VAKALATNAMA"
  | "CIVIL_LEGAL_NOTICE";

export type TemplateCategory = "criminal" | "civil" | "constitutional";

export interface TemplateFieldRequirement {
  key: string;
  label: string;
  required: boolean;
  field_type: string;
  placeholder: string;
  default_value?: string;
}

export interface DraftingTemplateItem {
  id: DraftingTemplateId;
  category: TemplateCategory;
  title: string;
  short_title: string;
  provisions: string[];
  court_jurisdiction: string;
  description: string;
  fields: TemplateFieldRequirement[];
  sample_cause_title: string;
}

export interface DeficitItem {
  placeholder: string;
  variable_key: string;
  field_label: string;
  severity: "CRITICAL" | "RECOMMENDED";
  description: string;
}

export interface GeneratePleadingRequest {
  template_id: DraftingTemplateId;
  court_name: string;
  case_number?: string;
  applicant_name: string;
  applicant_details?: string;
  respondent_name: string;
  respondent_details?: string;
  fir_number?: string;
  police_station?: string;
  sections_alleged?: string;
  factual_narrative: string;
  grounds_notes?: string;
  interim_prayers?: string;
  main_prayers?: string;
  cnr?: string;
  document_id?: string;
}

export interface GeneratePleadingResponse {
  template_id: DraftingTemplateId;
  title: string;
  html_content: string;
  deficits_found: DeficitItem[];
  mandatory_sections: string[];
  word_count: number;
  estimated_pages: number;
}

export interface DocxExportRequest {
  html_content: string;
  document_title: string;
  font_family?: string;
  font_size_pt?: number;
  line_spacing?: number;
  left_margin_inches?: number;
  top_margin_inches?: number;
  right_margin_inches?: number;
  bottom_margin_inches?: number;
}
