import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Scale,
  Split,
  Columns,
  Copy,
  Check,
  AlertTriangle,
  FileText,
  Loader2,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { eraTransitionService } from "@/services/eraTransition";
import type { StatutoryVerbatimDiffResponse } from "@/types/era_transition";

interface VerbatimStatutoryDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  pairId: string;
  defaultTitle?: string;
}

export function VerbatimStatutoryDiffModal({
  isOpen,
  onClose,
  pairId,
  defaultTitle = "Statutory Verbatim Diff",
}: VerbatimStatutoryDiffModalProps) {
  const [data, setData] = useState<StatutoryVerbatimDiffResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<"inline" | "split">("inline");
  const [copiedPleading, setCopiedPleading] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen || !pairId) return;

    let isMounted = true;
    setLoading(true);

    eraTransitionService
      .getVerbatimDiff(pairId)
      .then((res) => {
        if (isMounted) setData(res);
      })
      .catch((err) => {
        if (isMounted) toast.error("Failed to load verbatim statutory diff: " + err.message);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, pairId]);

  if (!isOpen) return null;

  const handleCopyPleading = () => {
    if (!data?.court_submission_pleading) return;
    navigator.clipboard.writeText(data.court_submission_pleading);
    setCopiedPleading(true);
    toast.success("Copied statutory continuity submission to clipboard");
    setTimeout(() => setCopiedPleading(false), 2000);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
      style={{
        background: "rgba(7, 9, 13, 0.8)",
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
          className="flex items-center justify-between px-6 py-4 border-b shrink-0"
          style={{
            background: "var(--surface-container)",
            borderColor: "var(--hairline)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center border"
              style={{
                background: "var(--brass-soft)",
                borderColor: "var(--brass)",
                color: "var(--brass-bright)",
              }}
            >
              <Scale size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold tracking-tight" style={{ color: "var(--ink)" }}>
                  Verbatim Statutory Red/Green Diff
                </h3>
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-mono uppercase"
                  style={{ background: "rgba(197, 160, 89, 0.15)", color: "var(--brass-bright)" }}
                >
                  {pairId}
                </span>
              </div>
              <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
                Word-for-word legislative comparison: Deleted colonial phrases vs 2023 additions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div
              className="flex items-center p-0.5 rounded-lg border text-xs"
              style={{ background: "var(--surface)", borderColor: "var(--hairline)" }}
            >
              <button
                onClick={() => setViewMode("inline")}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                style={{
                  background: viewMode === "inline" ? "var(--brass-soft)" : "transparent",
                  color: viewMode === "inline" ? "var(--brass-bright)" : "var(--ink-muted)",
                }}
              >
                <Split size={12} />
                <span>Unified Diff</span>
              </button>
              <button
                onClick={() => setViewMode("split")}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                style={{
                  background: viewMode === "split" ? "var(--brass-soft)" : "transparent",
                  color: viewMode === "split" ? "var(--brass-bright)" : "var(--ink-muted)",
                }}
              >
                <Columns size={12} />
                <span>Side-by-Side</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg border transition-colors cursor-pointer hover:bg-white/5"
              style={{ borderColor: "var(--hairline)", color: "var(--ink-muted)" }}
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Modal Content ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 size={32} className="animate-spin text-amber-500" />
              <div className="text-xs font-medium" style={{ color: "var(--ink-muted)" }}>
                Tokenizing verbatim statutory gazettes…
              </div>
            </div>
          ) : !data ? (
            <div className="py-12 text-center text-xs" style={{ color: "var(--ink-muted)" }}>
              No verbatim statutory data found for {pairId}.
            </div>
          ) : (
            <>
              {/* Header Titles */}
              <div
                className="p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3"
                style={{ background: "var(--surface-container)", borderColor: "var(--hairline)" }}
              >
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-red-400">
                    Legacy Enactment
                  </div>
                  <div className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
                    {data.old_title_full}
                  </div>
                </div>

                <div className="hidden md:flex items-center text-amber-500">
                  <ChevronRight size={20} />
                </div>

                <div className="space-y-1 md:text-right">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-green-400">
                    2023 Criminal Enactment
                  </div>
                  <div className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
                    {data.new_title_full}
                  </div>
                </div>
              </div>

              {/* ── Diff Display ── */}
              {viewMode === "inline" ? (
                /* Unified Word-by-Word Diff */
                <div
                  className="p-5 rounded-xl border space-y-3"
                  style={{ background: "var(--surface)", borderColor: "var(--hairline)" }}
                >
                  <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: "var(--hairline)" }}>
                    <span className="text-xs font-semibold" style={{ color: "var(--ink)" }}>
                      Unified Red / Green Diff (Legend: <span className="text-red-400 line-through">Red = Deleted</span>, <span className="text-green-400 font-semibold">Green = Added</span>)
                    </span>
                    <span className="text-[11px] font-mono text-zinc-400">
                      Myers Diff Engine
                    </span>
                  </div>

                  <div
                    className="p-4 rounded-lg text-sm leading-relaxed whitespace-pre-wrap font-serif"
                    style={{
                      background: "var(--surface-container)",
                      color: "var(--ink)",
                      lineHeight: "1.8",
                    }}
                  >
                    {data.diff_chunks.map((chunk, idx) => {
                      if (chunk.type === "deleted") {
                        return (
                          <span
                            key={idx}
                            className="line-through px-1 rounded mx-0.5 text-xs sm:text-sm"
                            style={{
                              background: "rgba(239, 68, 68, 0.2)",
                              color: "#f87171",
                              textDecorationColor: "#ef4444",
                            }}
                          >
                            {chunk.text}
                          </span>
                        );
                      }
                      if (chunk.type === "added") {
                        return (
                          <span
                            key={idx}
                            className="font-semibold px-1 rounded mx-0.5 text-xs sm:text-sm"
                            style={{
                              background: "rgba(34, 197, 94, 0.2)",
                              color: "#4ade80",
                              borderBottom: "1.5px solid #22c55e",
                            }}
                          >
                            {chunk.text}
                          </span>
                        );
                      }
                      return <span key={idx}>{chunk.text}</span>;
                    })}
                  </div>
                </div>
              ) : (
                /* Side-by-Side Split View */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left: Old Code */}
                  <div
                    className="p-4 rounded-xl border space-y-2 flex flex-col"
                    style={{ background: "var(--surface)", borderColor: "rgba(239, 68, 68, 0.3)" }}
                  >
                    <div className="text-xs font-bold text-red-400 flex items-center justify-between pb-1 border-b border-red-500/20">
                      <span>{data.old_title_full}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10">Repealed</span>
                    </div>
                    <div
                      className="p-3 rounded-lg text-xs leading-relaxed whitespace-pre-wrap font-serif flex-1"
                      style={{ background: "var(--surface-container)", color: "var(--ink-muted)", lineHeight: "1.7" }}
                    >
                      {data.old_verbatim_text}
                    </div>
                  </div>

                  {/* Right: New Code */}
                  <div
                    className="p-4 rounded-xl border space-y-2 flex flex-col"
                    style={{ background: "var(--surface)", borderColor: "rgba(34, 197, 94, 0.3)" }}
                  >
                    <div className="text-xs font-bold text-green-400 flex items-center justify-between pb-1 border-b border-green-500/20">
                      <span>{data.new_title_full}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10">In Force (July 1, 2024)</span>
                    </div>
                    <div
                      className="p-3 rounded-lg text-xs leading-relaxed whitespace-pre-wrap font-serif flex-1"
                      style={{ background: "var(--surface-container)", color: "var(--ink)", lineHeight: "1.7" }}
                    >
                      {data.new_verbatim_text}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Metadata Comparison Delta Table ── */}
              {data.metadata_deltas && data.metadata_deltas.length > 0 && (
                <div
                  className="rounded-xl border overflow-hidden"
                  style={{ background: "var(--surface)", borderColor: "var(--hairline)" }}
                >
                  <div
                    className="px-4 py-2.5 border-b font-semibold text-xs flex items-center justify-between"
                    style={{ background: "var(--surface-container)", borderColor: "var(--hairline)", color: "var(--ink)" }}
                  >
                    <span>Procedural & Litigator Parameter Deltas</span>
                    <span className="text-[10px] text-zinc-400">Registry Rules & Trial Practice</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead style={{ background: "var(--surface-raised)", color: "var(--ink-muted)" }}>
                        <tr className="border-b" style={{ borderColor: "var(--hairline)" }}>
                          <th className="p-3 font-semibold">Parameter</th>
                          <th className="p-3 font-semibold text-red-400">Legacy Statute</th>
                          <th className="p-3 font-semibold text-green-400">New Enactment</th>
                          <th className="p-3 font-semibold text-amber-400">Advocate Courtroom Impact</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y" style={{ borderColor: "var(--hairline)" }}>
                        {data.metadata_deltas.map((delta, i) => (
                          <tr key={i} className="hover:bg-white/[0.02]">
                            <td className="p-3 font-semibold" style={{ color: "var(--ink)" }}>
                              {delta.parameter}
                            </td>
                            <td className="p-3 text-red-300 font-mono text-[11px]">
                              {delta.old_value}
                            </td>
                            <td className="p-3 text-green-300 font-mono text-[11px]">
                              {delta.new_value}
                            </td>
                            <td className="p-3 leading-relaxed" style={{ color: "var(--ink-muted)" }}>
                              {delta.advocate_impact}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── Court Pleading Continuity Snippet ── */}
              {data.court_submission_pleading && (
                <div
                  className="p-4 rounded-xl border space-y-2.5"
                  style={{
                    background: "linear-gradient(135deg, rgba(197, 160, 89, 0.08) 0%, rgba(20, 24, 33, 0.6) 100%)",
                    borderColor: "rgba(197, 160, 89, 0.3)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--brass-bright)" }}>
                      <FileText size={14} />
                      <span>Court-Ready Statutory Continuity Submission (Section 8 General Clauses Act)</span>
                    </div>

                    <button
                      onClick={handleCopyPleading}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors cursor-pointer"
                      style={{
                        background: "var(--surface)",
                        border: "1px solid var(--hairline)",
                        color: "var(--ink)",
                      }}
                    >
                      {copiedPleading ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                      <span>{copiedPleading ? "Copied" : "Copy Clause"}</span>
                    </button>
                  </div>

                  <p
                    className="text-xs leading-relaxed italic p-3 rounded-lg border font-serif"
                    style={{
                      background: "var(--surface)",
                      borderColor: "var(--hairline)",
                      color: "var(--ink)",
                    }}
                  >
                    "{data.court_submission_pleading}"
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

