import api from "@/lib/axios";
import type { APIResponse } from "@/types/common";
import type {
  AdversarialExportRequest,
  InterimStayRequest,
  InterimStayResponse,
  OppositionMatrixRequest,
  OppositionMatrixResponse,
  WeaknessRadarRequest,
  WeaknessRadarResponse,
} from "@/types/adversarial";

export const adversarialService = {
  /**
   * Generates the 4-column bilateral opposition strategy matrix.
   */
  generateMatrix: async (
    req: OppositionMatrixRequest
  ): Promise<OppositionMatrixResponse> => {
    const res = await api.post<APIResponse<OppositionMatrixResponse>>(
      "/adversarial/matrix",
      req
    );
    if (!res.data.data) {
      throw new Error(res.data.message || "Failed to generate opposition strategy matrix.");
    }
    return res.data.data;
  },

  /**
   * Analyzes urgent interim stay / injunction under the 3-prong judicial standard.
   */
  analyzeInterimStay: async (
    req: InterimStayRequest
  ): Promise<InterimStayResponse> => {
    const res = await api.post<APIResponse<InterimStayResponse>>(
      "/adversarial/interim-stay",
      req
    );
    if (!res.data.data) {
      throw new Error(res.data.message || "Failed to evaluate interim stay.");
    }
    return res.data.data;
  },

  /**
   * Scans a pleading for procedural defects, statutory bars, and evidentiary deficits.
   */
  scanWeaknessRadar: async (
    req: WeaknessRadarRequest
  ): Promise<WeaknessRadarResponse> => {
    const res = await api.post<APIResponse<WeaknessRadarResponse>>(
      "/adversarial/weakness-radar",
      req
    );
    if (!res.data.data) {
      throw new Error(res.data.message || "Failed to scan procedural weaknesses.");
    }
    return res.data.data;
  },

  /**
   * Exports the complete court-ready Adversarial Strategy Brief into a .docx paper-book.
   */
  exportBriefDocx: async (req: AdversarialExportRequest): Promise<void> => {
    const response = await api.post("/adversarial/export-brief", req, {
      responseType: "blob",
    });

    const blob = new Blob([response.data], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const safeTitle = (req.case_title || "Adversarial_Brief").replace(/[^a-zA-Z0-9_-]/g, "_");
    link.setAttribute("download", `${safeTitle}_Strategy_PaperBook.docx`);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};

