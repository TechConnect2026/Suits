import React, { useState, useEffect } from "react";
import {
  Scale,
  Split,
  Columns,
  Copy,
  Check,
  ChevronRight,
  FileText,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { eraTransitionService } from "@/services/eraTransition";
import type { StatutoryVerbatimDiffResponse } from "@/types/era_transition";

interface EmbeddedVerbatimDiffProps {
  pairId: string;
}

export function EmbeddedVerbatimDiff({ pairId }: EmbeddedVerbatimDiffProps) {
  const [data, setData] = useState<StatutoryVerbatimDiffResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<"inline" | "split">("inline");
  const [copiedPleading, setCopiedPleading] = useState<boolean>(false);

  useEffect(() => {
    if (!pairId) return;

    let isMounted = true;
    setLoading(true);

    eraTransitionService
      .getVerbatimDiff(pairId)
      .then((res) => {
        if (isMounted) setData(res);
      })
      .catch((err) => {
        if (isMounted) toast.error("Failed to load verbatim diff: " + err.message);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [pairId]);

  const handleCopyPleading = () => {
    if (!data?.court_submission_pleading) return;
    navigator.clipboard.writeText(data.court_submission_pleading);
    setCopiedPleading(true);
    toast.success("Copied statutory continuity submission to clipboard");
    setTimeout(() => setCopiedPleading(false), 2000);
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <Loader2 size={32} className="animate-spin text-amber-500" />
        <div className="text-xs font-medium" style={{ color: "var(--ink-muted)" }}>
          Tokenizing statutory gazettes for {pairId}…
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-12 text-center text-xs" style={{ color: "var(--ink-muted)" }}>
        No verbatim statutory text found for {pairId}.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title & View Switcher Bar */}
      <div
        className="p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3"
        style={{ background: "var(--surface)", borderColor: "var(--hairline)" }}
      >
        <div className="flex items-center gap-3">
          <div className="space-y-0.5">
            <div className="text-xs font-bold" style={{ color: "var(--ink)" }}>
              {data.old_title_full} <span className="text-zinc-500 font-normal">→</span> {data.new_title_full}
            </div>
            <div className="text-[11px]" style={{ color: "var(--ink-muted)" }}>
              Myers Word-Level Diff Algorithm • Red: Deleted colonial terms • Green: 2023 additions
            </div>
          </div>
        </div>

        <div
          className="flex items-center p-0.5 rounded-lg border text-xs self-start md:self-auto"
          style={{ background: "var(--surface-container)", borderColor: "var(--hairline)" }}
        >
          <button
            onClick={() => setViewMode("inline")}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors cursor-pointer"
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
            className="flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors cursor-pointer"
            style={{
              background: viewMode === "split" ? "var(--brass-soft)" : "transparent",
              color: viewMode === "split" ? "var(--brass-bright)" : "var(--ink-muted)",
            }}
          >
            <Columns size={12} />
            <span>Side-by-Side</span>
          </button>
        </div>
      </div>

      {/* ── Diff Display ── */}
      {viewMode === "inline" ? (
        <div
          className="p-5 rounded-2xl border space-y-3"
          style={{ background: "var(--surface)", borderColor: "var(--hairline)" }}
        >
          <div
            className="p-4 rounded-xl text-sm leading-relaxed whitespace-pre-wrap font-serif"
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
          className="rounded-2xl border overflow-hidden"
          style={{ background: "var(--surface)", borderColor: "var(--hairline)" }}
        >
          <div
            className="px-5 py-3 border-b font-semibold text-xs flex items-center justify-between"
            style={{ background: "var(--surface-container)", borderColor: "var(--hairline)", color: "var(--ink)" }}
          >
            <span>Procedural & Litigator Parameter Deltas</span>
            <span className="text-[10px] text-zinc-400 font-mono">Registry Rules & Trial Practice</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead style={{ background: "var(--surface-raised)", color: "var(--ink-muted)" }}>
                <tr className="border-b" style={{ borderColor: "var(--hairline)" }}>
                  <th className="p-3.5 font-semibold">Parameter</th>
                  <th className="p-3.5 font-semibold text-red-400">Legacy Statute</th>
                  <th className="p-3.5 font-semibold text-green-400">New Enactment</th>
                  <th className="p-3.5 font-semibold text-amber-400">Advocate Courtroom Impact</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--hairline)" }}>
                {data.metadata_deltas.map((delta, i) => (
                  <tr key={i} className="hover:bg-white/[0.02]">
                    <td className="p-3.5 font-semibold" style={{ color: "var(--ink)" }}>
                      {delta.parameter}
                    </td>
                    <td className="p-3.5 text-red-300 font-mono text-[11px]">
                      {delta.old_value}
                    </td>
                    <td className="p-3.5 text-green-300 font-mono text-[11px]">
                      {delta.new_value}
                    </td>
                    <td className="p-3.5 leading-relaxed" style={{ color: "var(--ink-muted)" }}>
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
    </div>
  );
}

