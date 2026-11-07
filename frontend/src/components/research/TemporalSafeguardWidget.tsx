import React, { useState } from "react";
import {
  Calendar,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  ArrowRight,
  Loader2,
  Scale,
  Sparkles,
  RefreshCw,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { eraTransitionService } from "@/services/eraTransition";
import type {
  TemporalInspectionRequest,
  TemporalInspectionResponse,
} from "@/types/era_transition";

interface TemporalSafeguardWidgetProps {
  initialIncidentDate?: string;
  initialFirDate?: string;
  initialDraftText?: string;
  onApplyRemedy?: (original: string, replacement: string) => void;
  className?: string;
}

export function TemporalSafeguardWidget({
  initialIncidentDate = "2024-05-15",
  initialFirDate = "2024-07-20",
  initialDraftText = "Application for anticipatory bail under Section 482 BNSS for alleged offence under Section 318(4) BNS.",
  onApplyRemedy,
  className = "",
}: TemporalSafeguardWidgetProps) {
  const [incidentDate, setIncidentDate] = useState<string>(initialIncidentDate);
  const [firDate, setFirDate] = useState<string>(initialFirDate);
  const [draftText, setDraftText] = useState<string>(initialDraftText);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<TemporalInspectionResponse | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState<boolean>(false);

  const handleInspect = async () => {
    if (!incidentDate.trim()) {
      toast.error("Please enter the date of alleged offence.");
      return;
    }

    setLoading(true);
    try {
      const res = await eraTransitionService.inspectTemporal({
        incident_date: incidentDate,
        fir_date: firDate || undefined,
        draft_text_or_sections: draftText || undefined,
      });
      setResult(res);
      if (res.violations.length > 0) {
        toast.warning(`Identified ${res.violations.length} temporal statutory violation(s).`);
      } else {
        toast.success("Constitutional date audit complete. No violations detected.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to inspect dates.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopySnippet = () => {
    if (!result?.court_declaration_snippet) return;
    navigator.clipboard.writeText(result.court_declaration_snippet);
    setCopiedSnippet(true);
    toast.success("Copied statutory regime preliminary submission to clipboard");
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* ── Input Audit Form ── */}
      <div
        className="p-5 rounded-2xl border space-y-4 shadow-sm"
        style={{ background: "var(--surface)", borderColor: "var(--hairline)" }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--hairline)]">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center border"
              style={{
                background: "var(--brass-soft)",
                borderColor: "var(--brass)",
                color: "var(--brass-bright)",
              }}
            >
              <Calendar size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight" style={{ color: "var(--ink)" }}>
                Article 20(1) Temporal Incident-Date Inspector
              </h3>
              <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
                Checks offence dates against the July 1, 2024 constitutional cutoff for ex post facto violations
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border" style={{ background: "var(--surface-container)", borderColor: "var(--hairline)", color: "var(--brass-bright)" }}>
            <span>Cutoff: 01 July 2024</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Incident Date Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "var(--ink)" }}>
              <span>Date of Alleged Offence / Transaction</span>
              <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={incidentDate}
              onChange={(e) => setIncidentDate(e.target.value)}
              placeholder="e.g. 2024-05-15 or 15 May 2024"
              className="w-full px-3 py-2 rounded-xl border text-xs font-mono outline-none transition-all focus:border-[var(--brass)]"
              style={{ background: "var(--surface-container)", borderColor: "var(--hairline)", color: "var(--ink)" }}
            />
            <div className="text-[11px]" style={{ color: "var(--ink-muted)" }}>
              Determines substantive penal law (IPC vs BNS) under Article 20(1).
            </div>
          </div>

          {/* FIR Date Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "var(--ink)" }}>
              <span>Date of FIR Registration / Complaint</span>
              <span className="text-zinc-500 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={firDate}
              onChange={(e) => setFirDate(e.target.value)}
              placeholder="e.g. 2024-07-20 or 20 July 2024"
              className="w-full px-3 py-2 rounded-xl border text-xs font-mono outline-none transition-all focus:border-[var(--brass)]"
              style={{ background: "var(--surface-container)", borderColor: "var(--hairline)", color: "var(--ink)" }}
            />
            <div className="text-[11px]" style={{ color: "var(--ink-muted)" }}>
              Determines procedural law (CrPC vs BNSS) under Section 531 BNSS.
            </div>
          </div>
        </div>

        {/* Draft text or cited sections */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold" style={{ color: "var(--ink)" }}>
            Draft Pleading Text or Cited Sections to Audit
          </label>
          <textarea
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            rows={2}
            placeholder="Paste your petition title, FIR charge-sheet sections, or prayer clause to detect defective citations…"
            className="w-full p-3 rounded-xl border text-xs leading-relaxed outline-none transition-all focus:border-[var(--brass)]"
            style={{ background: "var(--surface-container)", borderColor: "var(--hairline)", color: "var(--ink)" }}
          />
        </div>

        <div className="flex justify-end pt-1">
          <button
            onClick={handleInspect}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer hover:opacity-90 active:scale-95 disabled:opacity-50"
            style={{ background: "var(--brass)", color: "#000" }}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
            <span>Audit Constitutional Compliance</span>
          </button>
        </div>
      </div>

      {/* ── Inspection Results Card ── */}
      {result && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Regime Classification Banner */}
          <div
            className="p-5 rounded-2xl border space-y-3"
            style={{
              background:
                result.statutory_regime === "HYBRID_TRANSITION_ERA"
                  ? "linear-gradient(135deg, rgba(234, 179, 8, 0.08) 0%, rgba(20, 24, 33, 0.6) 100%)"
                  : result.statutory_regime === "PURE_LEGACY_IPC"
                  ? "linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(20, 24, 33, 0.6) 100%)"
                  : "linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(20, 24, 33, 0.6) 100%)",
              borderColor:
                result.statutory_regime === "HYBRID_TRANSITION_ERA"
                  ? "rgba(234, 179, 8, 0.4)"
                  : result.statutory_regime === "PURE_LEGACY_IPC"
                  ? "rgba(59, 130, 246, 0.4)"
                  : "rgba(34, 197, 94, 0.4)",
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider"
                  style={{
                    background:
                      result.statutory_regime === "HYBRID_TRANSITION_ERA"
                        ? "#eab308"
                        : result.statutory_regime === "PURE_LEGACY_IPC"
                        ? "#3b82f6"
                        : "#22c55e",
                    color: "#000",
                  }}
                >
                  {result.statutory_regime.replace(/_/g, " ")}
                </span>
                <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
                  Resolved Offence Date: <b style={{ color: "var(--ink)" }}>{result.incident_date_resolved}</b>
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="font-mono px-2 py-0.5 rounded border" style={{ background: "var(--surface-container)", borderColor: "var(--hairline)", color: "var(--ink)" }}>
                  Substantive: <b className="text-amber-400">{result.substantive_code_required}</b>
                </span>
                <span className="font-mono px-2 py-0.5 rounded border" style={{ background: "var(--surface-container)", borderColor: "var(--hairline)", color: "var(--ink)" }}>
                  Procedure: <b className="text-blue-400">{result.procedural_code_required}</b>
                </span>
                <span className="font-mono px-2 py-0.5 rounded border" style={{ background: "var(--surface-container)", borderColor: "var(--hairline)", color: "var(--ink)" }}>
                  Evidence: <b className="text-green-400">{result.evidence_act_required}</b>
                </span>
              </div>
            </div>

            <p className="text-xs leading-relaxed" style={{ color: "var(--ink)" }}>
              {result.constitutional_assessment}
            </p>
          </div>

          {/* ── Violations & Remedies ── */}
          {result.violations.length > 0 ? (
            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                <AlertTriangle size={14} />
                <span>Detected Statutory & Constitutional Violations ({result.violations.length})</span>
              </div>

              {result.violations.map((violation, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl border space-y-2 relative overflow-hidden"
                  style={{
                    background: "rgba(239, 68, 68, 0.05)",
                    borderColor: "rgba(239, 68, 68, 0.3)",
                    borderLeftWidth: "4px",
                    borderLeftColor: "#ef4444",
                  }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-red-500/20 text-red-300">
                        {violation.violation_code}
                      </span>
                      <h4 className="text-xs font-bold text-red-300">
                        {violation.title}
                      </h4>
                    </div>

                    <div className="text-xs font-mono">
                      <span className="text-red-400 line-through mr-2">{violation.problematic_citation}</span>
                      <ArrowRight size={12} className="inline text-zinc-500 mr-2" />
                      <span className="text-green-400 font-bold">{violation.correct_statutory_reference}</span>
                    </div>
                  </div>

                  <p className="text-xs leading-relaxed" style={{ color: "var(--ink-muted)" }}>
                    {violation.description}
                  </p>
                </div>
              ))}

              {/* Remedies Action Box */}
              {result.remedies.length > 0 && (
                <div
                  className="p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  style={{ background: "var(--surface)", borderColor: "var(--hairline)" }}
                >
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold" style={{ color: "var(--ink)" }}>
                      One-Click Section Rectification
                    </div>
                    <div className="text-[11px]" style={{ color: "var(--ink-muted)" }}>
                      Automatically replace constitutionally defective citations with valid sections.
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {result.remedies.map((rem, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          if (onApplyRemedy) {
                            onApplyRemedy(rem.original_text, rem.replacement_text);
                          } else {
                            toast.success(`Substitute "${rem.original_text}" with "${rem.replacement_text}"`);
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border"
                        style={{
                          background: "var(--surface-container)",
                          borderColor: "var(--brass)",
                          color: "var(--brass-bright)",
                        }}
                      >
                        Fix: {rem.replacement_text}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div
              className="p-4 rounded-xl border flex items-center gap-3 text-xs"
              style={{ background: "rgba(34, 197, 94, 0.05)", borderColor: "rgba(34, 197, 94, 0.3)", color: "#86efac" }}
            >
              <CheckCircle2 size={16} className="text-green-400 shrink-0" />
              <span>All cited sections strictly adhere to Article 20(1) and Section 531 BNSS. No statutory violations detected.</span>
            </div>
          )}

          {/* ── Court Pleading Declaration ── */}
          <div
            className="p-4 rounded-xl border space-y-2.5"
            style={{
              background: "linear-gradient(135deg, rgba(197, 160, 89, 0.08) 0%, rgba(20, 24, 33, 0.6) 100%)",
              borderColor: "rgba(197, 160, 89, 0.3)",
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--brass-bright)" }}>
                <Scale size={14} />
                <span>Court Pleading Declaration (Preliminary Objection on Statutory Era)</span>
              </div>

              <button
                onClick={handleCopySnippet}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors cursor-pointer"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--hairline)",
                  color: "var(--ink)",
                }}
              >
                {copiedSnippet ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                <span>{copiedSnippet ? "Copied" : "Copy Declaration"}</span>
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
              "{result.court_declaration_snippet}"
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

