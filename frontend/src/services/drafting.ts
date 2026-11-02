import api from "@/lib/axios";
import type { APIResponse } from "@/types/common";
import type {
  DraftingTemplateItem,
  GeneratePleadingRequest,
  GeneratePleadingResponse,
  DocxExportRequest,
  DeficitItem,
} from "@/types/drafting";

export const draftingService = {
  getTemplates: async (): Promise<DraftingTemplateItem[]> => {
    const res = await api.get<APIResponse<DraftingTemplateItem[]>>("/drafting/templates");
    return res.data.data || [];
  },

  generatePleading: async (req: GeneratePleadingRequest): Promise<GeneratePleadingResponse> => {
    const res = await api.post<APIResponse<GeneratePleadingResponse>>("/drafting/generate", req);
    if (!res.data.data) {
      throw new Error(res.data.message || "Failed to generate court pleading.");
    }
    return res.data.data;
  },

  auditDeficits: async (
    templateId: string,
    textOrHtml: string
  ): Promise<{ deficits: DeficitItem[]; cleanRatio: number }> => {
    const res = await api.post<APIResponse<{ deficits: DeficitItem[]; clean_ratio: number }>>(
      "/drafting/audit-deficits",
      { template_id: templateId, text_or_html: textOrHtml }
    );
    const data = res.data.data;
    return {
      deficits: data?.deficits || [],
      cleanRatio: data?.clean_ratio ?? 1.0,
    };
  },

  exportDocx: async (req: DocxExportRequest): Promise<void> => {
    const response = await api.post("/drafting/export-docx", req, {
      responseType: "blob",
    });

    // Create a blob URL and trigger browser download
    const blob = new Blob([response.data], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const cleanTitle = (req.document_title || "Court_Paper_Book").replace(/[^a-zA-Z0-9_\-]/g, "_");
    link.download = `${cleanTitle}.docx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};

