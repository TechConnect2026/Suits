import React, { useState } from "react";
import {
  Scale,
  BookOpen,
  Copy,
  Check,
  ExternalLink,
  PlusCircle,
  FileText,
  AlertTriangle,
  Gavel,
  ShieldAlert,
  HelpCircle,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import type { VerdictAnatomyResponse } from "@/types/precedents";

interface VerdictAnatomyViewProps {
  data: VerdictAnatomyResponse;
  onCiteAtCursor?: (citationHtml: string) => void;
  className?: string;
}

export function VerdictAnatomyView({
  data,
  onCiteAtCursor,
  className = "",
}: VerdictAnatomyViewProps) {
  const [activeTab, setActiveTab] = useState<"ratio" | "issues" | "facts" | "obiter">("ratio");
  const [copiedRatio, setCopiedRatio] = useState(false);
  const [copiedCitation, setCopiedCitation] = useState(false);

  const handleCopyRatio = () => {
    const textToCopy = `RATIO DECIDENDI:\n"${data.ratio_decidendi.core_rule_of_law}"\n\nAUTHORITY:\n${data.case_title}, ${data.official_citation} (${data.ratio_decidendi.governing_paragraphs.join(", ")})`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedRatio(true);
    toast.success("Copied binding ratio decidendi to clipboard");
    setTimeout(() => setCopiedRatio(false), 2000);
  };

  const handleCopyCitation = () => {
    navigator.clipboard.writeText(`${data.case_title}, ${data.official_citation}`);
    setCopiedCitation(true);
    toast.success("Copied standard Indian citation string");
    setTimeout(() => setCopiedCitation(false), 2000);
  };

  const handleCiteAtCursor = () => {
    const paraStr = data.ratio_decidendi.governing_paragraphs.join(", ");
    const citationHtml = `
      <p style="text-indent: 40px; margin-bottom: 10px; text-align: justify;">
        That the binding legal proposition is settled by the Hon'ble Supreme Court in 
        <b><i>${data.case_title}</i>, ${data.official_citation}${paraStr ? ` (${paraStr})` : ""}</b>, wherein it was laid down:
      </p>
      <blockquote style="margin: 12px 40px; font-style: italic; border-left: 2.5px solid #c5a059; padding-left: 16px; color: #1e222b;">
        "${data.ratio_decidendi.core_rule_of_law}"
      </blockquote>
    `;
    if (onCiteAtCursor) {
      onCiteAtCursor(citationHtml);
      toast.success("Injected citation and ratio into active document draft");
    } else {
      navigator.clipboard.writeText(
        `${data.case_title}, ${data.official_citation} — "${data.ratio_decidendi.core_rule_of_law}"`
      );
      toast.info("Copied formatted citation to clipboard (no active editor bound)");
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* ── Case Metadata Header Banner ── */}
      <div
        className="p-5 rounded-xl border space-y-3"
        style={{
          background: "var(--surface-container)",
          borderColor: "var(--hairline)",
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                style={{
                  background: "var(--brass)",
                  color: "#000",
                }}
              >
                {data.court_name}
              </span>

              {data.bench_coram && data.bench_coram.length > 0 && (
                <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
                  Bench: <b style={{ color: "var(--ink)" }}>{data.bench_coram.join(", ")}</b>
                </span>
              )}

              {data.decision_date && (
                <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
                  • {data.decision_date}
                </span>
              )}
            </div>

            <h2 className="text-lg font-bold tracking-tight" style={{ color: "var(--ink)" }}>
              {data.case_title}
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold" style={{ color: "var(--brass-bright)" }}>
                {data.official_citation}
              </span>
              <span className="text-xs" style={{ color: "var(--ink-muted)" }}>•</span>
              <span className="text-xs font-medium text-green-400">
                {data.disposition}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {data.kanoon_url && (
              <a
                href={data.kanoon_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer"
                style={{
                  background: "var(--surface-raised)",
                  borderColor: "var(--hairline)",
                  color: "var(--ink)",
                }}
                title="View original certified judgment on Indian Kanoon"
              >
                <BookOpen size={13} style={{ color: "var(--brass)" }} />
                <span>Indian Kanoon</span>
                <ExternalLink size={11} className="opacity-70" />
              </a>
            )}

            <button
              onClick={handleCiteAtCursor}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer hover:opacity-90 active:scale-95"
              style={{
                background: "var(--brass)",
                color: "#000",
              }}
              title="Inject citation & ratio at cursor in LegalEditor"
            >
              <PlusCircle size={13} />
              <span>Cite at Cursor</span>
            </button>
          </div>
        </div>

        {/* Executive Takeaway */}
        <div
          className="p-3 rounded-lg border text-xs leading-relaxed"
          style={{
            background: "var(--surface-raised)",
            borderColor: "var(--hairline)",
            color: "var(--ink)",
          }}
        >
          <span className="font-semibold uppercase text-[10px] mr-1.5" style={{ color: "var(--brass)" }}>
            Executive Holding:
          </span>
          {data.one_line_takeaway}
        </div>
      </div>

      {/* ── 4-Module Tab Navigation ── */}
      <div className="flex items-center gap-2 border-b border-[var(--hairline)] pb-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab("ratio")}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap"
          style={{
            background: activeTab === "ratio" ? "var(--brass-soft)" : "transparent",
            color: activeTab === "ratio" ? "var(--brass-bright)" : "var(--ink-muted)",
            border: `1px solid ${activeTab === "ratio" ? "var(--brass)" : "transparent"}`,
          }}
        >
          <Gavel size={14} />
          <span>1. Ratio Decidendi & Why It Helps</span>
        </button>

        <button
          onClick={() => setActiveTab("issues")}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap"
          style={{
            background: activeTab === "issues" ? "var(--brass-soft)" : "transparent",
            color: activeTab === "issues" ? "var(--brass-bright)" : "var(--ink-muted)",
            border: `1px solid ${activeTab === "issues" ? "var(--brass)" : "transparent"}`,
          }}
        >
          <Scale size={14} />
          <span>2. Issues Framed ({data.issues_framed.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("facts")}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap"
          style={{
            background: activeTab === "facts" ? "var(--brass-soft)" : "transparent",
            color: activeTab === "facts" ? "var(--brass-bright)" : "var(--ink-muted)",
            border: `1px solid ${activeTab === "facts" ? "var(--brass)" : "transparent"}`,
          }}
        >
          <Calendar size={14} />
          <span>3. Material Facts ({data.material_facts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("obiter")}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap"
          style={{
            background: activeTab === "obiter" ? "var(--brass-soft)" : "transparent",
            color: activeTab === "obiter" ? "var(--brass-bright)" : "var(--ink-muted)",
            border: `1px solid ${activeTab === "obiter" ? "var(--brass)" : "transparent"}`,
          }}
        >
          <HelpCircle size={14} />
          <span>4. Obiter Dicta (Persuasive)</span>
        </button>
      </div>

      {/* ── Tab 1: Ratio Decidendi & Combined Why This Helps ── */}
      {activeTab === "ratio" && (
        <div className="space-y-4">
          {/* Combined "Why This Helps" & Strategic Relevance Card */}
          {data.strategic_relevance && (
            <div
              className="p-5 rounded-xl border relative space-y-3 overflow-hidden"
              style={{
                background: "linear-gradient(135deg, rgba(197, 160, 89, 0.08) 0%, rgba(20, 24, 33, 0.6) 100%)",
                borderColor: "rgba(197, 160, 89, 0.4)",
                borderLeftWidth: "4px",
                borderLeftColor: "var(--brass)",
              }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                    style={{
                      background: "var(--brass)",
                      color: "#000",
                    }}
                  >
                    <Sparkles size={11} />
                    <span>Why This Helps</span>
                  </span>

                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-semibold border"
                    style={{
                      background: "rgba(197, 160, 89, 0.12)",
                      borderColor: "rgba(197, 160, 89, 0.3)",
                      color: "var(--brass-bright)",
                    }}
                  >
                    {data.strategic_relevance.relevance_category}
                  </span>

                  {data.strategic_relevance.key_anchor_section && (
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-mono border"
                      style={{
                        background: "var(--surface-raised)",
                        borderColor: "var(--hairline)",
                        color: "var(--ink)",
                      }}
                    >
                      {data.strategic_relevance.key_anchor_section}
                    </span>
                  )}
                </div>

                <div className="text-[11px] font-medium" style={{ color: "var(--ink-muted)" }}>
                  Strategic Relevance & Utility
                </div>
              </div>

              {/* The Single-Sentence Strategic Relevance Rule */}
              <div
                className="text-sm font-medium leading-relaxed"
                style={{ color: "var(--ink)" }}
              >
                {data.strategic_relevance.why_this_helps}
              </div>

              {/* Strategic Utility Guidance */}
              {data.strategic_relevance.strategic_utility && (
                <div
                  className="p-3 rounded-lg border text-xs leading-relaxed space-y-1"
                  style={{
                    background: "var(--surface-container)",
                    borderColor: "var(--hairline)",
                  }}
                >
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--brass)" }}>
                    <ShieldAlert size={12} />
                    <span>Courtroom Deployment Strategy:</span>
                  </div>
                  <div style={{ color: "var(--ink-muted)" }}>
                    {data.strategic_relevance.strategic_utility}
                  </div>
                </div>
              )}
            </div>
          )}
          <div
            className="p-5 rounded-xl border relative space-y-4 overflow-hidden"
            style={{
              background: "var(--surface)",
              borderColor: "var(--brass)",
              borderLeftWidth: "4px",
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className="text-[10px] font-bold px-2.5 py-0.5 rounded tracking-wider uppercase"
                  style={{
                    background: "var(--brass)",
                    color: "#000",
                  }}
                >
                  {data.ratio_decidendi.precedential_weight}
                </span>

                {data.ratio_decidendi.bench_strength && (
                  <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
                    • {data.ratio_decidendi.bench_strength}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyRatio}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors cursor-pointer"
                  style={{
                    background: "var(--surface-container)",
                    border: "1px solid var(--hairline)",
                    color: "var(--ink)",
                  }}
                  title="Copy Ratio Decidendi"
                >
                  {copiedRatio ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                  <span>{copiedRatio ? "Copied" : "Copy Ratio"}</span>
                </button>
              </div>
            </div>

            {/* Core Rule of Law Quote */}
            <div
              className="p-4 rounded-lg text-sm leading-relaxed italic"
              style={{
                background: "var(--surface-raised)",
                color: "var(--ink)",
                fontFamily: "'Bookman Old Style', Georgia, serif",
                borderLeft: "2px solid var(--brass)",
              }}
            >
              "{data.ratio_decidendi.core_rule_of_law}"
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
              <div
                className="p-3 rounded-lg border space-y-1"
                style={{
                  background: "var(--surface-container)",
                  borderColor: "var(--hairline)",
                }}
              >
                <div className="text-[10px] uppercase font-semibold" style={{ color: "var(--brass)" }}>
                  Binding Proposition:
                </div>
                <div style={{ color: "var(--ink)" }}>{data.ratio_decidendi.binding_proposition}</div>
              </div>

              <div
                className="p-3 rounded-lg border space-y-1"
                style={{
                  background: "var(--surface-container)",
                  borderColor: "var(--hairline)",
                }}
              >
                <div className="text-[10px] uppercase font-semibold" style={{ color: "var(--brass)" }}>
                  Governing Paragraphs:
                </div>
                <div className="font-mono font-medium" style={{ color: "var(--brass-bright)" }}>
                  {data.ratio_decidendi.governing_paragraphs.join(", ") || "Operative Ruling"}
                </div>
              </div>
            </div>
          </div>

          {/* Statutes Interpreted Table */}
          {data.statutes_interpreted && data.statutes_interpreted.length > 0 && (
            <div
              className="p-4 rounded-xl border space-y-3"
              style={{
                background: "var(--surface)",
                borderColor: "var(--hairline)",
              }}
            >
              <div className="flex items-center gap-2">
                <Layers size={14} style={{ color: "var(--brass)" }} />
                <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ink)" }}>
                  Statutory Provisions Interpreted
                </h4>
              </div>

              <div className="divide-y divide-[var(--hairline)]">
                {data.statutes_interpreted.map((st, i) => (
                  <div key={i} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div>
                      <span className="font-semibold" style={{ color: "var(--brass-bright)" }}>
                        {st.section_article}
                      </span>
                      <span className="text-[var(--ink-muted)]"> — {st.act_name}</span>
                      <div className="text-[11px] leading-relaxed mt-0.5" style={{ color: "var(--ink)" }}>
                        {st.interpretation_summary}
                      </div>
                    </div>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded self-start sm:self-center border shrink-0"
                      style={{
                        background: "var(--surface-container)",
                        borderColor: "var(--hairline)",
                        color: "var(--brass)",
                      }}
                    >
                      {st.nature_of_interpretation}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab 2: Issues Framed & Judicial Answers ── */}
      {activeTab === "issues" && (
        <div className="space-y-3">
          {data.issues_framed.map((issue) => (
            <div
              key={issue.issue_number}
              className="p-4 rounded-xl border space-y-2.5"
              style={{
                background: "var(--surface)",
                borderColor: "var(--hairline)",
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{
                      background: "var(--brass)",
                      color: "#000",
                    }}
                  >
                    {issue.issue_number}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--brass)" }}>
                    Question of Law Framed
                  </span>
                </div>

                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded border"
                  style={{
                    background:
                      issue.answered_in_favour_of === "Petitioner / Appellant"
                        ? "rgba(34, 197, 94, 0.15)"
                        : "rgba(239, 68, 68, 0.15)",
                    borderColor:
                      issue.answered_in_favour_of === "Petitioner / Appellant"
                        ? "rgba(34, 197, 94, 0.3)"
                        : "rgba(239, 68, 68, 0.3)",
                    color:
                      issue.answered_in_favour_of === "Petitioner / Appellant"
                        ? "#4ade80"
                        : "#f87171",
                  }}
                >
                  Result: {issue.answered_in_favour_of}
                </span>
              </div>

              <div className="text-xs font-medium leading-relaxed" style={{ color: "var(--ink)" }}>
                {issue.question_of_law}
              </div>

              <div
                className="p-2.5 rounded-lg border text-xs leading-relaxed"
                style={{
                  background: "var(--surface-container)",
                  borderColor: "var(--hairline)",
                }}
              >
                <span className="font-semibold text-[10px] uppercase text-green-400 mr-1.5">
                  Court Finding:
                </span>
                <span style={{ color: "var(--ink-muted)" }}>{issue.court_finding}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Tab 3: Material Determinative Facts & Journey ── */}
      {activeTab === "facts" && (
        <div className="space-y-4">
          {/* Procedural Trajectory */}
          <div
            className="p-4 rounded-xl border space-y-1.5"
            style={{
              background: "var(--surface-container)",
              borderColor: "var(--hairline)",
            }}
          >
            <div className="text-[10px] font-semibold uppercase" style={{ color: "var(--brass)" }}>
              Procedural Trajectory (Lower Court to Superior Bench):
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "var(--ink)" }}>
              {data.procedural_journey}
            </p>
          </div>

          {/* Facts Timeline Cards */}
          <div
            className="p-4 rounded-xl border space-y-3"
            style={{
              background: "var(--surface)",
              borderColor: "var(--hairline)",
            }}
          >
            <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ink)" }}>
              Determinative Material Facts
            </div>

            <div className="space-y-2">
              {data.material_facts.map((fact, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg border text-xs flex items-start gap-3"
                  style={{
                    background: "var(--surface-raised)",
                    borderColor: "var(--hairline)",
                  }}
                >
                  <span
                    className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-mono font-bold shrink-0 mt-0.5"
                    style={{
                      background: "var(--surface-container)",
                      color: "var(--brass)",
                      border: "1px solid var(--hairline)",
                    }}
                  >
                    #{idx + 1}
                  </span>
                  <p className="leading-relaxed" style={{ color: "var(--ink)" }}>
                    {fact}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 4: Obiter Dicta & Observations (Non-Binding) ── */}
      {activeTab === "obiter" && (
        <div className="space-y-4">
          <div
            className="p-3.5 rounded-xl border flex items-center gap-2.5 text-xs text-amber-200"
            style={{
              background: "rgba(245, 158, 11, 0.08)",
              borderColor: "rgba(245, 158, 11, 0.25)",
            }}
          >
            <AlertTriangle size={15} className="text-amber-400 shrink-0" />
            <span>
              <b>Persuasive Only (Non-Binding Precedent):</b> The following observations do not constitute the operative rule of law under the Sudhansu Sekhar Misra doctrine, but provide valuable guidance for contextual argumentation.
            </span>
          </div>

          <div className="space-y-3">
            {data.obiter_dicta.map((ob, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border space-y-2"
                style={{
                  background: "var(--surface)",
                  borderColor: "var(--hairline)",
                }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded border"
                    style={{
                      background: "rgba(59, 130, 246, 0.12)",
                      borderColor: "rgba(59, 130, 246, 0.3)",
                      color: "#60a5fa",
                    }}
                  >
                    {ob.nature}
                  </span>
                  <span className="text-[10px]" style={{ color: "var(--ink-muted)" }}>
                    Context: {ob.context}
                  </span>
                </div>

                <p className="text-xs leading-relaxed italic" style={{ color: "var(--ink)" }}>
                  "{ob.observation}"
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

