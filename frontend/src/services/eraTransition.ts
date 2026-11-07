import api from '@/lib/axios';
import type { APIResponse } from '@/types/common';
import type {
  ConcordanceLookupResponse,
  EraTransitionCaseAnalysis,
  EraTransitionInstant,
  StatutoryVerbatimDiffResponse,
  TemporalInspectionRequest,
  TemporalInspectionResponse,
  TransitionQuestionResponse,
  TransitionalJurisprudenceResponse,
} from '@/types/era_transition';

export const eraTransitionService = {
  /**
   * Fast search across statutory concordance by section number or legal doctrine.
   */
  lookupConcordance: async (
    query: string = "",
    limit: number = 24,
    category?: string
  ): Promise<ConcordanceLookupResponse | null> => {
    try {
      let url = `/statutes/era-transition/lookup?query=${encodeURIComponent(query)}&limit=${limit}`;
      if (category && category !== "ALL") {
        url += `&category=${encodeURIComponent(category)}`;
      }
      const res = await api.get<APIResponse<ConcordanceLookupResponse>>(url);
      if (res.status === 204 || !res.data || !res.data.data) {
        return null;
      }
      return res.data.data;
    } catch {
      return null;
    }
  },

  /**
   * Zero-LLM instant concordance snapshot for a case.
   */
  getInstantConcordance: async (
    cnr: string
  ): Promise<EraTransitionInstant | null> => {
    try {
      const res = await api.get<APIResponse<EraTransitionInstant>>(
        `/cases/${cnr}/era-transition/instant`
      );
      if (res.status === 204 || !res.data || !res.data.data) {
        return null;
      }
      return res.data.data;
    } catch {
      return null;
    }
  },

  /**
   * Complete era transition analysis for a case.
   */
  getCaseEraTransition: async (
    cnr: string
  ): Promise<EraTransitionCaseAnalysis | null> => {
    try {
      const res = await api.get<APIResponse<EraTransitionCaseAnalysis>>(
        `/cases/${cnr}/era-transition`
      );
      if (res.status === 204 || !res.data || !res.data.data) {
        return null;
      }
      return res.data.data;
    } catch {
      return null;
    }
  },

  /**
   * Force regenerate criminal era transition analysis by invalidating state cache.
   */
  refreshCaseEraTransition: async (
    cnr: string
  ): Promise<EraTransitionCaseAnalysis | null> => {
    try {
      const res = await api.post<APIResponse<EraTransitionCaseAnalysis>>(
        `/cases/${cnr}/era-transition/refresh`
      );
      if (res.status === 204 || !res.data || !res.data.data) {
        return null;
      }
      return res.data.data;
    } catch {
      return null;
    }
  },

  /**
   * Ask legal transition questions to the AI transition advisor.
   */
  askTransitionQuestion: async (
    question: string,
    category?: string,
    active_era?: string
  ): Promise<TransitionQuestionResponse | null> => {
    try {
      const res = await api.post<APIResponse<TransitionQuestionResponse>>(
        `/statutes/era-transition/ask`,
        { question, category, active_era }
      );
      if (res.status === 204 || !res.data || !res.data.data) {
        return null;
      }
      return res.data.data;
    } catch {
      return null;
    }
  },

  // ── Pillar 4: Temporal Safeguard & Verbatim Diff APIs ──

  /**
   * Audits incident & FIR dates against the July 1, 2024 constitutional cutoff.
   */
  inspectTemporal: async (
    req: TemporalInspectionRequest
  ): Promise<TemporalInspectionResponse> => {
    const res = await api.post<APIResponse<TemporalInspectionResponse>>(
      `/statutes/era-transition/inspect-temporal`,
      req
    );
    if (!res.data || !res.data.data) {
      throw new Error("Failed to inspect temporal incident.");
    }
    return res.data.data;
  },

  /**
   * Fetches word-by-word statutory diff and metadata comparison for a pair.
   */
  getVerbatimDiff: async (
    pairId: string
  ): Promise<StatutoryVerbatimDiffResponse> => {
    const res = await api.get<APIResponse<StatutoryVerbatimDiffResponse>>(
      `/statutes/era-transition/verbatim-diff/${encodeURIComponent(pairId)}`
    );
    if (!res.data || !res.data.data) {
      throw new Error("Failed to fetch verbatim statutory diff.");
    }
    return res.data.data;
  },

  /**
   * Lists curated landmark authorities on criminal reform transition.
   */
  getTransitionalJurisprudence: async (
    topic?: string,
    query?: string
  ): Promise<TransitionalJurisprudenceResponse> => {
    let url = `/statutes/era-transition/transitional-jurisprudence`;
    const params: string[] = [];
    if (topic && topic !== "ALL") params.push(`topic=${encodeURIComponent(topic)}`);
    if (query && query.trim()) params.push(`query=${encodeURIComponent(query.trim())}`);
    if (params.length > 0) url += `?${params.join("&")}`;

    const res = await api.get<APIResponse<TransitionalJurisprudenceResponse>>(url);
    if (!res.data || !res.data.data) {
      throw new Error("Failed to fetch transitional jurisprudence.");
    }
    return res.data.data;
  },
};
