import React, { useState } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  Sparkles,
  Loader2,
  Copy,
  Check,
  PlusCircle,
  Gavel,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import type {
  DefectItem,
  DefectSeverity,
  WeaknessRadarResponse,
} from "@/types/adversarial";

interface WeaknessRadarCardProps {
  data: WeaknessRadarResponse | null;
  loading: boolean;
  onScan: () => void;
  onInjectCureClause: (clauseHtml: string) => void;
}

export function WeaknessRadarCard({
  data,
  loading,
  onScan,
  onInjectCureClause,
}: WeaknessRadarCardProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const getSeverityStyle = (severity: DefectSeverity) => {
    switch (severity) {
      case "CRITICAL":
        return {
          bg: "rgba(239, 68, 68, 0.12)",
          border: "rgba(239, 68, 68, 0.3)",
          text: "#f87171",
          label: "CRITICAL BAR",
        };
      case "HIGH":
        return {
          bg: "rgba(245, 158, 11, 0.12)",
          border: "rgba(245, 158, 11, 0.3)",
          text: "#fbbf24",
          label: "HIGH VULNERABILITY",
        };
      case "MEDIUM":
        return {
          bg: "rgba(59, 130, 246, 0.12)",
          border: "rgba(59, 130, 246, 0.3)",
          text: "#60a5fa",
          label: "PROCEDURAL DEFICIT",
        };
      case "LOW":
      default:
        return {
          bg: "rgba(148, 163, 184, 0.12)",
          border: "rgba(148, 163, 184, 0.3)",
          text: "#94a3b8",
          label: "CLERICAL / FORMAL",
        };
    }
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case "CRITICAL":
        return { bg: "#ef4444", text: "#fff" };
      case "MODERATE":
        return { bg: "#f59e0b", text: "#000" };
      case "LOW":
        return { bg: "#3b82f6", text: "#fff" };
      case "CLEAN":
      default:
        return { bg: "#10b981", text: "#fff" };
    }
  };

  const handleCopyClause = (defect: DefectItem) => {
    if (!defect.cure_clause_template) return;
    navigator.clipboard.writeText(defect.cure_clause_template);
    setCopiedId(defect.id);
    toast.success("Cure clause copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleInjectClause = (defect: DefectItem) => {
    if (!defect.cure_clause_template) return;
    const clauseHtml = `
      <p style="text-indent: 40px; margin-bottom: 12px; text-align: justify;">
        <b>STATUTORY COMPLIANCE AVERMENT (${defect.title}):</b> ${defect.cure_clause_template}
      </p>
    `;
    onInjectCureClause(clauseHtml);
    toast.success(`Injected cure clause for ${defect.title}`);
  };

  return (
    <div className="space-y-6">
      {/* ── Summary & Score Banner ── */}
      <div
        className="p-5 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
        style={{
          background: "var(--surface-container)",
          borderColor: "var(--hairline)",
        }}
      >
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} style={{ color: "var(--brass)" }} />
            <h3 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
              Procedural & Statutory Weakness Radar
            </h3>
            {data && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded uppercase"
                style={{
                  background: getTierBadge(data.risk_tier).bg,
                  color: getTierBadge(data.risk_tier).text,
                }}
              >
                {data.risk_tier} RISK
              </span>
            )}
          </div>
          <p className="text-xs leading-relaxed" style={{ color: "var(--ink-muted)" }}>
            {data
              ? data.procedural_clearance_summary
              : "Scans active pleading for fatal statutory bars (Limitation Act, Section 12A Commercial Courts Act, Section 65B/63 BSA evidence certificates, Section 141 NI Act)."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {data && (
            <div
              className="px-4 py-2 rounded-xl border text-center"
              style={{
                background: "var(--surface-raised)",
                borderColor: "var(--hairline)",
              }}
            >
              <div className="text-[10px] uppercase font-semibold" style={{ color: "var(--ink-muted)" }}>
                Litigation Risk Index
              </div>
              <div
                className="text-lg font-bold"
                style={{
                  color:
                    data.risk_score >= 70
                      ? "#f87171"
                      : data.risk_score >= 40
                      ? "#fbbf24"
                      : "#4ade80",
                }}
              >
                {data.risk_score} <span className="text-xs font-normal text-[var(--ink-muted)]">/ 100</span>
              </div>
            </div>
          )}

          <button
            onClick={onScan}
            disabled={loading}
            className="px-4 py-2.5 rounded-lg text-xs font-semibold shrink-0 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            style={{
              background: "var(--brass)",
              color: "#000",
            }}
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            <span>{data ? "Re-Scan Pleading" : "Run Weakness Audit"}</span>
          </button>
        </div>
      </div>

      {/* ── Defect List ── */}
      {data && data.defects.length === 0 ? (
        <div
          className="p-8 rounded-xl border text-center space-y-2"
          style={{
            background: "var(--surface)",
            borderColor: "var(--hairline)",
          }}
        >
          <ShieldCheck size={32} className="mx-auto text-green-400" />
          <h4 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
            Zero Statutory Landmines Detected
          </h4>
          <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
            The pleading successfully clears all mandatory statutory checks (Limitation, Sec 12A CCA, Sec 65B/63 BSA, Sec 80 CPC, and Sec 141 NI Act).
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {data?.defects.map((defect) => {
            const style = getSeverityStyle(defect.severity);
            return (
              <div
                key={defect.id}
                className="p-4 rounded-xl border space-y-3"
                style={{
                  background: "var(--surface)",
                  borderColor: style.border,
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded border"
                      style={{
                        background: style.bg,
                        borderColor: style.border,
                        color: style.text,
                      }}
                    >
                      {style.label}
                    </span>
                    <h4 className="text-xs font-bold" style={{ color: "var(--ink)" }}>
                      {defect.title}
                    </h4>
                  </div>
                  <span className="text-[11px] font-medium" style={{ color: "var(--brass)" }}>
                    {defect.governing_rule}
                  </span>
                </div>

                <div className="text-xs leading-relaxed" style={{ color: "var(--ink-muted)" }}>
                  {defect.description}
                </div>

                <div
                  className="p-3 rounded-lg border text-xs space-y-1.5"
                  style={{
                    background: "var(--surface-container)",
                    borderColor: "var(--hairline)",
                  }}
                >
                  <div className="flex items-center gap-1.5 font-semibold text-green-400">
                    <CheckCircle2 size={13} />
                    <span>Actionable Cure:</span>
                  </div>
                  <p className="text-[11px] leading-relaxed" style={{ color: "var(--ink)" }}>
                    {defect.cure_recommendation}
                  </p>

                  {defect.cure_clause_template && (
                    <div className="pt-2 border-t border-[var(--hairline)] space-y-2">
                      <div className="text-[10px] uppercase font-semibold" style={{ color: "var(--brass)" }}>
                        Ready-to-Insert Cure Averment:
                      </div>
                      <div
                        className="p-2.5 rounded bg-[var(--surface-raised)] border border-[var(--hairline)] text-[11px] italic leading-relaxed"
                        style={{ color: "var(--ink)" }}
                      >
                        "{defect.cure_clause_template}"
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => handleCopyClause(defect)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors cursor-pointer"
                          style={{
                            background: "var(--surface-container)",
                            color: "var(--ink)",
                            border: "1px solid var(--hairline)",
                          }}
                        >
                          {copiedId === defect.id ? (
                            <Check size={12} className="text-green-400" />
                          ) : (
                            <Copy size={12} />
                          )}
                          <span>{copiedId === defect.id ? "Copied" : "Copy Clause"}</span>
                        </button>

                        <button
                          onClick={() => handleInjectClause(defect)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer"
                          style={{
                            background: "var(--brass-soft)",
                            color: "var(--brass-bright)",
                            border: "1px solid var(--hairline)",
                          }}
                        >
                          <PlusCircle size={12} />
                          <span>Insert into Active Draft</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

