import React, { useState } from "react";
import {
  ShieldAlert,
  Scale,
  Sparkles,
  Loader2,
  Copy,
  Check,
  PlusCircle,
  AlertTriangle,
  FileCheck,
} from "lucide-react";
import { toast } from "sonner";
import type {
  InterimStayRequest,
  InterimStayResponse,
} from "@/types/adversarial";

interface InterimStayCardProps {
  data: InterimStayResponse | null;
  loading: boolean;
  onAnalyze: (req: InterimStayRequest) => void;
  onInjectClauses: (html: string) => void;
  initialRelief?: string;
}

export function InterimStayCard({
  data,
  loading,
  onAnalyze,
  onInjectClauses,
  initialRelief = "Stay against coercive recovery / execution of impugned order",
}: InterimStayCardProps) {
  const [stayRelief, setStayRelief] = useState(initialRelief);
  const [matterType, setMatterType] = useState<InterimStayRequest["matter_type"]>("writ_petition");
  const [advocateSide, setAdvocateSide] = useState<InterimStayRequest["advocate_side"]>("seeking_stay");
  const [copiedClauses, setCopiedClauses] = useState(false);

  const handleRunAnalysis = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stayRelief.trim()) {
      toast.error("Please specify the exact interim stay relief sought.");
      return;
    }
    onAnalyze({
      stay_relief_sought: stayRelief,
      matter_type: matterType,
      advocate_side: advocateSide,
    });
  };

  const handleCopyClauses = () => {
    if (!data?.drafted_stay_clauses) return;
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = data.drafted_stay_clauses;
    navigator.clipboard.writeText(tempDiv.textContent || tempDiv.innerText || "");
    setCopiedClauses(true);
    toast.success("Copied drafted interim averments to clipboard");
    setTimeout(() => setCopiedClauses(false), 2000);
  };

  const handleInject = () => {
    if (!data?.drafted_stay_clauses) return;
    onInjectClauses(data.drafted_stay_clauses);
    toast.success("Injected interim stay averments & prayer into editor");
  };

  return (
    <div className="space-y-6">
      {/* ── Request Configuration Card ── */}
      <form
        onSubmit={handleRunAnalysis}
        className="p-4 rounded-xl border space-y-4"
        style={{
          background: "var(--surface-container)",
          borderColor: "var(--hairline)",
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Scale size={16} style={{ color: "var(--brass)" }} />
            <h3 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
              3-Prong Judicial Injunction Assessment
            </h3>
          </div>
          <div className="flex items-center gap-1.5 p-0.5 rounded-lg border bg-[var(--surface-raised)] border-[var(--hairline)]">
            <button
              type="button"
              onClick={() => setAdvocateSide("seeking_stay")}
              className="px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer"
              style={{
                background: advocateSide === "seeking_stay" ? "var(--brass)" : "transparent",
                color: advocateSide === "seeking_stay" ? "#000" : "var(--ink-muted)",
              }}
            >
              Seeking Stay (Offensive)
            </button>
            <button
              type="button"
              onClick={() => setAdvocateSide("opposing_stay")}
              className="px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer"
              style={{
                background: advocateSide === "opposing_stay" ? "var(--brass)" : "transparent",
                color: advocateSide === "opposing_stay" ? "#000" : "var(--ink-muted)",
              }}
            >
              Opposing / Vacating Stay (Defensive)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-4 space-y-1">
            <label className="text-[11px] font-medium" style={{ color: "var(--ink-muted)" }}>
              Proceeding Category
            </label>
            <select
              value={matterType}
              onChange={(e) => setMatterType(e.target.value as any)}
              className="w-full px-3 py-2 rounded-lg text-xs border outline-none cursor-pointer"
              style={{
                background: "var(--surface)",
                borderColor: "var(--hairline)",
                color: "var(--ink)",
              }}
            >
              <option value="writ_petition">Writ Petition (Article 226 / 32)</option>
              <option value="civil_suit">Civil Suit (Order XXXIX Rules 1 & 2 CPC)</option>
              <option value="arbitration_s9">Arbitration (Section 9 A&C Act)</option>
              <option value="criminal_482_quashing">Criminal Quashing (u/s 482 / 528 BNSS)</option>
              <option value="bail_application">Bail Application (Interim Bail / Stay)</option>
            </select>
          </div>

          <div className="md:col-span-8 space-y-1">
            <label className="text-[11px] font-medium" style={{ color: "var(--ink-muted)" }}>
              Specific Ad-Interim Relief Sought
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={stayRelief}
                onChange={(e) => setStayRelief(e.target.value)}
                placeholder="e.g. Ex-parte stay on bank guarantee encashment, stay of arrest"
                className="w-full px-3 py-2 rounded-lg text-xs border outline-none"
                style={{
                  background: "var(--surface)",
                  borderColor: "var(--hairline)",
                  color: "var(--ink)",
                }}
              />
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 rounded-lg text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                style={{
                  background: "var(--brass)",
                  color: "#000",
                }}
              >
                {loading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                <span>Evaluate</span>
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* ── 3-Prong Judicial Findings ── */}
      {data && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.prongs.map((prong, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border flex flex-col justify-between space-y-3"
                style={{
                  background: "var(--surface)",
                  borderColor: "var(--hairline)",
                }}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span
                      className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                      style={{
                        background: "var(--brass-soft)",
                        color: "var(--brass-bright)",
                      }}
                    >
                      {prong.prong_name}
                    </span>
                    <span className="text-[10px]" style={{ color: "var(--ink-muted)" }}>
                      Prong #{idx + 1}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="text-[10px] font-semibold uppercase" style={{ color: "var(--brass)" }}>
                      Applicant Case:
                    </div>
                    <div className="text-xs leading-relaxed" style={{ color: "var(--ink)" }}>
                      {prong.moving_party_argument}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-[10px] font-semibold uppercase text-red-400">
                      Opposition Attack:
                    </div>
                    <div className="text-xs leading-relaxed text-red-200/80">
                      {prong.opposing_counter_argument}
                    </div>
                  </div>
                </div>

                <div
                  className="p-2.5 rounded-lg border text-[11px] space-y-1"
                  style={{
                    background: "var(--surface-container)",
                    borderColor: "var(--hairline)",
                  }}
                >
                  <div className="font-semibold" style={{ color: "var(--brass)" }}>
                    {prong.landmark_precedent}
                  </div>
                  <div className="italic text-[10px]" style={{ color: "var(--ink-muted)" }}>
                    {prong.adjudication_guidance}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Drafted Stay Clauses Preview & Actions ── */}
          <div
            className="p-4 rounded-xl border space-y-3"
            style={{
              background: "var(--surface-raised)",
              borderColor: "var(--hairline)",
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck size={16} style={{ color: "var(--brass)" }} />
                <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ink)" }}>
                  Drafted Court-Ready Stay Averments & Prayer
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyClauses}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                  style={{
                    background: "var(--surface-container)",
                    color: "var(--ink)",
                    border: "1px solid var(--hairline)",
                  }}
                >
                  {copiedClauses ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                  <span>{copiedClauses ? "Copied" : "Copy Clauses"}</span>
                </button>
                <button
                  onClick={handleInject}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  style={{
                    background: "var(--brass)",
                    color: "#000",
                  }}
                >
                  <PlusCircle size={13} />
                  <span>Insert into Editor</span>
                </button>
              </div>
            </div>

            <div
              className="p-4 rounded-lg border text-xs max-h-56 overflow-y-auto leading-relaxed prose prose-invert"
              style={{
                background: "var(--surface)",
                borderColor: "var(--hairline)",
                color: "var(--ink)",
              }}
              dangerouslySetInnerHTML={{ __html: data.drafted_stay_clauses }}
            />
          </div>

          {/* ── Vacation Grounds under Order 39 Rule 4 CPC ── */}
          {data.vacation_grounds && data.vacation_grounds.length > 0 && (
            <div
              className="p-4 rounded-xl border space-y-2"
              style={{
                background: "var(--surface-container)",
                borderColor: "var(--hairline)",
              }}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-400" />
                <h4 className="text-xs font-semibold" style={{ color: "var(--ink)" }}>
                  Grounds for Vacation of Ad-Interim Order (Order XXXIX Rule 4 CPC / Writ Vacating)
                </h4>
              </div>
              <ul className="space-y-1.5 text-xs" style={{ color: "var(--ink-muted)" }}>
                {data.vacation_grounds.map((vg, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">•</span>
                    <span>{vg}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

