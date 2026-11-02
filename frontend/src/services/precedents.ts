import api from "@/lib/axios";
import type { APIResponse } from "@/types/common";
import type {
  BatchRelevanceRequest,
  BatchRelevanceResponse,
  FormatCitationRequest,
  FormatCitationResponse,
  RelevanceRequest,
  RelevanceResponse,
  VerdictAnatomyRequest,
  VerdictAnatomyResponse,
} from "@/types/precedents";

export const precedentService = {
  /**
   * Generates a single-sentence "Why This Helps" relevance badge.
   */
  getWhyThisHelps: async (req: RelevanceRequest): Promise<RelevanceResponse> => {
    const res = await api.post<APIResponse<RelevanceResponse>>(
      "/precedents/why-this-helps",
      req
    );
    if (!res.data.data) {
      throw new Error(res.data.message || "Failed to generate relevance badge.");
    }
    return res.data.data;
  },

  /**
   * Evaluates relevance badges for multiple search results in parallel.
   */
  getBatchRelevance: async (
    req: BatchRelevanceRequest
  ): Promise<BatchRelevanceResponse> => {
    const res = await api.post<APIResponse<BatchRelevanceResponse>>(
      "/precedents/batch-relevance",
      req
    );
    if (!res.data.data) {
      throw new Error(res.data.message || "Failed to evaluate batch relevance.");
    }
    return res.data.data;
  },

  /**
   * Deconstructs a judgment into the 4-part Verdict Anatomy.
   */
  getVerdictAnatomy: async (
    req: VerdictAnatomyRequest
  ): Promise<VerdictAnatomyResponse> => {
    const res = await api.post<APIResponse<VerdictAnatomyResponse>>(
      "/precedents/verdict-anatomy",
      req
    );
    if (!res.data.data) {
      throw new Error(res.data.message || "Failed to extract verdict anatomy.");
    }
    return res.data.data;
  },

  /**
   * Formats an Indian court citation and quote for insertion into pleadings.
   */
  formatCitation: async (
    req: FormatCitationRequest
  ): Promise<FormatCitationResponse> => {
    const res = await api.post<APIResponse<FormatCitationResponse>>(
      "/precedents/format-citation",
      req
    );
    if (!res.data.data) {
      throw new Error(res.data.message || "Failed to format citation.");
    }
    return res.data.data;
  },
};

