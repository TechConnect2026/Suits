import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Swords,
  Shield,
  ShieldAlert,
  Scale,
  Download,
  Loader2,
  RefreshCw,
  FileText,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { adversarialService } from "@/services/adversarial";
import { OppositionMatrixTable } from "./OppositionMatrixTable";
import { InterimStayCard } from "./InterimStayCard";
import { WeaknessRadarCard } from "./WeaknessRadarCard";
import type {
  InterimStayRequest,
  InterimStayResponse,
  OppositionMatrixRequest,
  OppositionMatrixResponse,
  WeaknessRadarResponse,
} from "@/types/adversarial";

interface AdversarialStrategyModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeDraftTitle?: string;
  activeDraftContent?: string;
  onInjectContent?: (injectedHtml: string) => void;
}

export function AdversarialStrategyModal({
  isOpen,
  onClose,
  activeDraftTitle = "Legal Pleading",
  activeDraftContent = "",
  onInjectContent,
}: AdversarialStrategyModalProps) {
  const [activeTab, setActiveTab] = useState<"matrix" | "interim_stay" | "weakness_radar">("matrix");
  const [loadingMatrix, setLoadingMatrix] = useState(false);
  const [loadingStay, setLoadingStay] = useState(false);
  const [loadingRadar, setLoadingRadar] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [matrixData, setMatrixData] = useState<OppositionMatrixResponse | null>(null);
  const [stayData, setStayData] = useState<InterimStayResponse | null>(null);
  const [radarData, setRadarData] = useState<WeaknessRadarResponse | null>(null);

  // Auto-generate matrix on first open if empty
  useEffect(() => {
    if (isOpen && !matrixData && activeDraftContent) {
      handleGenerateMatrix();
    }
  }, [isOpen, activeDraftContent]);

  if (!isOpen) return null;

  const handleGenerateMatrix = async () => {
    setLoadingMatrix(true);
    try {
      const res = await adversarialService.generateMatrix({
        case_title: activeDraftTitle,
        raw_text: activeDraftContent,
        forum: "High Court",
        advocate_posture: "petitioner",
      });
      setMatrixData(res);
      toast.success("Adversarial opposition matrix generated");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate opposition strategy matrix.");
    } finally {
      setLoadingMatrix(false);
    }
  };

  const handleAnalyzeStay = async (req: InterimStayRequest) => {
    setLoadingStay(true);
    try {
      const res = await adversarialService.analyzeInterimStay({
        ...req,
        raw_text: activeDraftContent || req.raw_text,
      });
      setStayData(res);
      toast.success("3-Prong interim stay assessment ready");
    } catch (err: any) {
      toast.error(err.message || "Failed to evaluate interim stay.");
    } finally {
      setLoadingStay(false);
    }
  };

  const handleScanRadar = async () => {
    setLoadingRadar(true);
    try {
      const res = await adversarialService.scanWeaknessRadar({
        raw_text: activeDraftContent,
        court_level: "High Court",
      });
      setRadarData(res);
      toast.success("Procedural weakness radar scan completed");
    } catch (err: any) {
      toast.error(err.message || "Failed to scan procedural weaknesses.");
    } finally {
      setLoadingRadar(false);
    }
  };

  const handleExportBrief = async () => {
    setIsExporting(true);
    try {
      await adversarialService.exportBriefDocx({
        case_title: activeDraftTitle,
        forum: "High Court",
        matrix: matrixData || undefined,
        stay_analysis: stayData || undefined,
        weakness_radar: radarData || undefined,
      });
      toast.success("Adversarial Strategy Brief (.docx) downloaded successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to export brief.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleInjectContent = (html: string) => {
    if (onInjectContent) {
      onInjectContent(html);
    } else {
      // Fallback copy to clipboard
      const temp = document.createElement("div");
      temp.innerHTML = html;
      navigator.clipboard.writeText(temp.textContent || temp.innerText || "");
      toast.info("Copied to clipboard (active editor not bound)");
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
      style={{
        background: "rgba(7, 9, 13, 0.78)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div
        className="w-full max-w-6xl max-h-[92vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
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
              <Swords size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight" style={{ color: "var(--ink)" }}>
                Strategic Adversarial Intelligence & Argument Builder
              </h2>
              <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
                {activeDraftTitle} • Bilateral Opposition Strategy & 3-Prong Judicial Scrutiny
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateMatrix}
              disabled={loadingMatrix}
              className="p-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
              style={{
                background: "var(--surface-container)",
                borderColor: "var(--hairline)",
                color: "var(--ink-muted)",
              }}
              title="Re-run opposition analysis"
            >
              <RefreshCw size={14} className={loadingMatrix ? "animate-spin text-[var(--brass)]" : ""} />
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

        {/* ── Tab Navigation Bar ── */}
        <div
          className="px-6 py-2 border-b flex items-center gap-2 shrink-0 overflow-x-auto scrollbar-none"
          style={{
            background: "var(--surface)",
            borderColor: "var(--hairline)",
          }}
        >
          <button
            onClick={() => setActiveTab("matrix")}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer"
            style={{
              background: activeTab === "matrix" ? "var(--brass-soft)" : "transparent",
              color: activeTab === "matrix" ? "var(--brass-bright)" : "var(--ink-muted)",
              border: `1px solid ${activeTab === "matrix" ? "var(--brass)" : "transparent"}`,
            }}
          >
            <Swords size={14} />
            <span>4-Column Opposition Matrix</span>
            {matrixData && (
              <span
                className="text-[10px] px-1.5 py-0.2 rounded-full font-bold"
                style={{
                  background: activeTab === "matrix" ? "var(--brass)" : "var(--surface-container)",
                  color: activeTab === "matrix" ? "#000" : "var(--ink)",
                }}
              >
                {matrixData.rows.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("interim_stay")}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer"
            style={{
              background: activeTab === "interim_stay" ? "var(--brass-soft)" : "transparent",
              color: activeTab === "interim_stay" ? "var(--brass-bright)" : "var(--ink-muted)",
              border: `1px solid ${activeTab === "interim_stay" ? "var(--brass)" : "transparent"}`,
            }}
          >
            <Scale size={14} />
            <span>3-Prong Interim Stay Analyzer</span>
            {stayData && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-green-500/20 text-green-400">
                Ready
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab("weakness_radar");
              if (!radarData && !loadingRadar) handleScanRadar();
            }}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer"
            style={{
              background: activeTab === "weakness_radar" ? "var(--brass-soft)" : "transparent",
              color: activeTab === "weakness_radar" ? "var(--brass-bright)" : "var(--ink-muted)",
              border: `1px solid ${activeTab === "weakness_radar" ? "var(--brass)" : "transparent"}`,
            }}
          >
            <ShieldAlert size={14} />
            <span>Procedural Weakness Radar</span>
            {radarData && (
              <span
                className="text-[10px] px-1.5 py-0.2 rounded-full font-bold"
                style={{
                  background: radarData.risk_score >= 40 ? "rgba(239, 68, 68, 0.2)" : "rgba(34, 197, 94, 0.2)",
                  color: radarData.risk_score >= 40 ? "#f87171" : "#4ade80",
                }}
              >
                {radarData.defects.length} Flags
              </span>
            )}
          </button>
        </div>

        {/* ── Tab Content Area ── */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {activeTab === "matrix" && (
            <div>
              {loadingMatrix ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-3">
                  <Loader2 size={32} className="animate-spin text-[var(--brass)]" />
                  <p className="text-xs font-medium" style={{ color: "var(--ink-muted)" }}>
                    Synthesizing bilateral adversarial matrix & cross-examining citations...
                  </p>
                </div>
              ) : matrixData ? (
                <OppositionMatrixTable
                  data={matrixData}
                  onInjectRebuttal={handleInjectContent}
                />
              ) : (
                <div className="py-16 text-center space-y-3">
                  <Swords size={32} className="mx-auto text-[var(--ink-muted)]" />
                  <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
                    No opposition matrix generated yet.
                  </p>
                  <button
                    onClick={handleGenerateMatrix}
                    className="px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer"
                    style={{ background: "var(--brass)", color: "#000" }}
                  >
                    Generate Opposition Matrix
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === "interim_stay" && (
            <InterimStayCard
              data={stayData}
              loading={loadingStay}
              onAnalyze={handleAnalyzeStay}
              onInjectClauses={handleInjectContent}
            />
          )}

          {activeTab === "weakness_radar" && (
            <WeaknessRadarCard
              data={radarData}
              loading={loadingRadar}
              onScan={handleScanRadar}
              onInjectCureClause={handleInjectContent}
            />
          )}
        </div>

        {/* ── Modal Footer ── */}
        <div
          className="px-6 py-3.5 border-t flex items-center justify-between shrink-0"
          style={{
            background: "var(--surface-raised)",
            borderColor: "var(--hairline)",
          }}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportBrief}
              disabled={isExporting}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
              style={{
                background: "var(--surface-container)",
                color: "var(--ink)",
                border: "1px solid var(--hairline)",
              }}
              title="Download editable .docx Adversarial Strategy Paper-Book (1.75in Gutter)"
            >
              {isExporting ? <Loader2 size={13} className="animate-spin text-[var(--brass)]" /> : <Download size={13} style={{ color: "var(--brass)" }} />}
              <span>Export Adversarial Brief (.docx)</span>
            </button>
            <span className="text-[11px] hidden sm:inline" style={{ color: "var(--ink-muted)" }}>
              Registry-formatted (1.75" Binding Gutter Margin, A4)
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
            style={{
              background: "var(--brass)",
              color: "#000",
            }}
          >
            Done / Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

