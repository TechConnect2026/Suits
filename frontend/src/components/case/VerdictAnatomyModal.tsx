import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Scale, Loader2, Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { precedentService } from "@/services/precedents";
import { VerdictAnatomyView } from "./VerdictAnatomyView";
import type { VerdictAnatomyResponse } from "@/types/precedents";

interface VerdictAnatomyModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseTitle?: string;
  courtName?: string;
  cnr?: string;
  tid?: number;
  rawText?: string;
  searchQuery?: string;
  initialData?: VerdictAnatomyResponse | null;
  onCiteAtCursor?: (citationHtml: string) => void;
}

export function VerdictAnatomyModal({
  isOpen,
  onClose,
  caseTitle = "Judicial Precedent",
  courtName = "Supreme Court of India",
  cnr,
  tid,
  rawText,
  searchQuery,
  initialData,
  onCiteAtCursor,
}: VerdictAnatomyModalProps) {
  const [data, setData] = useState<VerdictAnatomyResponse | null>(initialData || null);
  const [loading, setLoading] = useState<boolean>(!initialData && isOpen);

  const loadAnatomy = async () => {
    setLoading(true);
    try {
      const res = await precedentService.getVerdictAnatomy({
        cnr,
        tid,
        raw_text: rawText,
        case_title: caseTitle,
        court_name: courtName,
        search_query: searchQuery,
      });
      setData(res);
    } catch (err: any) {
      toast.error(err.message || "Failed to extract verdict anatomy.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !initialData) {
      loadAnatomy();
    } else if (initialData) {
      setData(initialData);
    }
  }, [isOpen, caseTitle, tid, cnr, searchQuery, initialData]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
      style={{
        background: "rgba(7, 9, 13, 0.78)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div
        className="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        style={{
          background: "var(--surface)",
          borderColor: "var(--hairline)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
        }}
      >
        {/* ── Modal Header ── */}
        <div
          className="px-6 py-4 border-b flex items-center justify-between shrink-0"
          style={{
            background: "var(--surface-raised)",
            borderColor: "var(--hairline)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="p-2.5 rounded-xl border flex items-center justify-center"
              style={{
                background: "var(--brass-soft)",
                borderColor: "var(--brass)",
                color: "var(--brass-bright)",
              }}
            >
              <Scale size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight" style={{ color: "var(--ink)" }}>
                Verdict Anatomy & Ratio Decidendi Extraction
              </h2>
              <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
                {caseTitle} • Sudhansu Sekhar Misra Doctrine (Ratio vs Obiter Separation)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadAnatomy}
              disabled={loading}
              className="p-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
              style={{
                background: "var(--surface-container)",
                borderColor: "var(--hairline)",
                color: "var(--ink-muted)",
              }}
              title="Re-extract verdict anatomy"
            >
              <RefreshCw size={14} className={loading ? "animate-spin text-[var(--brass)]" : ""} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg border text-xs transition-colors hover:text-white cursor-pointer"
              style={{
                background: "var(--surface-container)",
                borderColor: "var(--hairline)",
                color: "var(--ink-muted)",
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Modal Content ── */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-3">
              <Loader2 size={32} className="animate-spin text-[var(--brass)]" />
              <p className="text-xs font-medium" style={{ color: "var(--ink-muted)" }}>
                Isolating binding ratio decidendi and framing legal questions...
              </p>
            </div>
          ) : data ? (
            <VerdictAnatomyView data={data} onCiteAtCursor={onCiteAtCursor} />
          ) : (
            <div className="py-20 text-center text-xs text-[var(--ink-muted)]">
              No judgment text available to deconstruct.
            </div>
          )}
        </div>

        {/* ── Modal Footer ── */}
        <div
          className="px-6 py-3 border-t flex items-center justify-between shrink-0"
          style={{
            background: "var(--surface-raised)",
            borderColor: "var(--hairline)",
          }}
        >
          <span className="text-[11px]" style={{ color: "var(--ink-muted)" }}>
            Verified Indian Legal Jurisprudence • Certified Binding Ratio
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
            style={{
              background: "var(--brass)",
              color: "#000",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

