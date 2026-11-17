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
  Gavel,
  CheckCircle2,
  AlertTriangle,
  CheckSquare,
  Square,
  Copy,
  Check,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { adversarialService } from "@/services/adversarial";
import { defenseService } from "@/services/defenseService";
import { documentService } from "@/services/document";
import { OppositionMatrixTable } from "./OppositionMatrixTable";
import { InterimStayCard } from "./InterimStayCard";
import { WeaknessRadarCard } from "./WeaknessRadarCard";
import type {
  InterimStayRequest,
  InterimStayResponse,
  OppositionMatrixResponse,
  WeaknessRadarResponse,
} from "@/types/adversarial";
import type {
  AnalyzePlaintResponse,
  DefenseStrategy,
  StatutoryBar,
  WrittenStatementResponse,
} from "@/types/defense";
import type { UserDocument } from "@/types/document";

export type DefenseSuiteTab = "matrix" | "interim_stay" | "weakness_radar" | "written_statement";

interface AdversarialDefenseSuiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeDraftTitle?: string;
  activeDraftContent?: string;
  preselectedDocId?: string;
  initialTab?: DefenseSuiteTab;
  onInjectContent?: (injectedHtml: string) => void;
  onOpenInEditor?: (draft: { title: string; content: string }) => void;
}

const SAMPLE_COMMERCIAL_PLAINT = `IN THE COURT OF THE DISTRICT JUDGE (COMMERCIAL), DELHI
CS (COMM) NO. 412 OF 2026

IN THE MATTER OF:
ALPHA TECH ENTERPRISES PVT. LTD.
...PLAINTIFF
VERSUS
BETA INDUSTRIAL SOLUTIONS LLP
...DEFENDANT

COMMERCIAL SUIT FOR RECOVERY OF RS. 45,00,000/- ALONG WITH INTEREST

MOST RESPECTFULLY SHEWETH:
1. That the Plaintiff is a private limited company incorporated under the Companies Act, 2013 having its registered office at Connaught Place, New Delhi.
2. That the Defendant is a limited liability partnership firm having its office at Okhla Industrial Area, New Delhi.
3. That in the month of March 2020, the Plaintiff supplied industrial hardware to the Defendant pursuant to Purchase Order No. 441.
4. That the Defendant failed to make payment of Invoice No. 892 dated 14.04.2020 amounting to Rs. 45,00,000/- despite repeated demands and reminders.
5. That the Defendant has breached the contractual terms and committed deliberate default, thereby causing substantial financial loss to the Plaintiff.
6. That the cause of action firstly arose on 14.04.2020 when the invoice was raised and continues to subsist.
7. That this Hon'ble Court has territorial and pecuniary jurisdiction to try the present commercial suit.
8. That the suit is valued at Rs. 45,00,000/- and requisite court fees have been paid.

PRAYER:
Wherefore it is prayed that a decree for Rs. 45,00,000/- be passed in favour of Plaintiff and against Defendant.`;

function stripHtmlToPlainText(html: string): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function AdversarialDefenseSuiteModal({
  isOpen,
  onClose,
  activeDraftTitle = "Legal Pleading",
  activeDraftContent = "",
  preselectedDocId,
  initialTab,
  onInjectContent,
  onOpenInEditor,
}: AdversarialDefenseSuiteModalProps) {
  const [activeTab, setActiveTab] = useState<DefenseSuiteTab>(
    initialTab || (preselectedDocId ? "written_statement" : "matrix")
  );
  const [showIntakePanel, setShowIntakePanel] = useState<boolean>(false);

  // Shared Single-Source Intake State
  const [sharedText, setSharedText] = useState<string>(() => {
    const plain = stripHtmlToPlainText(activeDraftContent);
    return plain.length >= 40 ? plain : SAMPLE_COMMERCIAL_PLAINT;
  });
  const [vaultDocs, setVaultDocs] = useState<UserDocument[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>(preselectedDocId || "");

  // Tab 1–3: Adversarial Intelligence State
  const [loadingMatrix, setLoadingMatrix] = useState(false);
  const [loadingStay, setLoadingStay] = useState(false);
  const [loadingRadar, setLoadingRadar] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [matrixData, setMatrixData] = useState<OppositionMatrixResponse | null>(null);
  const [stayData, setStayData] = useState<InterimStayResponse | null>(null);
  const [radarData, setRadarData] = useState<WeaknessRadarResponse | null>(null);

  // Tab 4: Written Statement (Order VIII CPC) State
  const [wsLoading, setWsLoading] = useState(false);
  const [wsStep, setWsStep] = useState<1 | 2 | 3>(1);
  const [analysis, setAnalysis] = useState<AnalyzePlaintResponse | null>(null);
  const [courtName, setCourtName] = useState("");
  const [suitNumber, setSuitNumber] = useState("");
  const [plaintiff, setPlaintiff] = useState("");
  const [defendant, setDefendant] = useState("");
  const [bars, setBars] = useState<StatutoryBar[]>([]);
  const [strategy, setStrategy] = useState<DefenseStrategy>("aggressive_denial");
  const [advocateNotes, setAdvocateNotes] = useState(
    "Goods delivered were severely defective and rejected within 48 hours vide written communication."
  );
  const [generatedWs, setGeneratedWs] = useState<WrittenStatementResponse | null>(null);
  const [wsSubTab, setWsSubTab] = useState<"full" | "traversals" | "objections">("full");
  const [isCopied, setIsCopied] = useState(false);

  // Sync draft content & vault documents when opened
  useEffect(() => {
    if (!isOpen) return;
    if (initialTab) {
      setActiveTab(initialTab);
    } else if (preselectedDocId) {
      setActiveTab("written_statement");
    }

    if (preselectedDocId) {
      setSelectedDocId(preselectedDocId);
    }

    const plain = stripHtmlToPlainText(activeDraftContent);
    if (plain.length >= 40) {
      setSharedText(plain);
    }

    documentService
      .list()
      .then((docs) => setVaultDocs(docs))
      .catch(() => {});
  }, [isOpen, activeDraftContent, preselectedDocId, initialTab]);

  // Auto-generate matrix on first open if matrix tab is active and text is present
  useEffect(() => {
    if (isOpen && activeTab === "matrix" && !matrixData && !loadingMatrix && sharedText.trim()) {
      handleGenerateMatrix();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const effectiveSourceText = sharedText.trim() || stripHtmlToPlainText(activeDraftContent);

  // ── Adversarial War Room Handlers ────────────────────────────────────────
  const handleGenerateMatrix = async () => {
    if (!effectiveSourceText) {
      toast.error("Please paste a plaint or open an active draft first.");
      setShowIntakePanel(true);
      return;
    }
    setLoadingMatrix(true);
    try {
      const res = await adversarialService.generateMatrix({
        case_title: activeDraftTitle,
        raw_text: effectiveSourceText,
        forum: "High Court",
        advocate_posture: "respondent",
      });
      setMatrixData(res);
      toast.success("4-Column Adversarial Opposition Matrix generated");
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
        raw_text: effectiveSourceText || req.raw_text,
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
    if (!effectiveSourceText) {
      toast.error("Please provide pleading text to scan.");
      setShowIntakePanel(true);
      return;
    }
    setLoadingRadar(true);
    try {
      const res = await adversarialService.scanWeaknessRadar({
        raw_text: effectiveSourceText,
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
    } else if (onOpenInEditor) {
      onOpenInEditor({ title: `${activeDraftTitle} — Defense Clause`, content: html });
      onClose();
    } else {
      const temp = document.createElement("div");
      temp.innerHTML = html;
      navigator.clipboard.writeText(temp.textContent || temp.innerText || "");
      toast.info("Copied clause to clipboard");
    }
  };

  // ── Counter-Pleading (Order VIII CPC) Handlers ───────────────────────────
  const handleAnalyzePlaint = async () => {
    if (!effectiveSourceText && !selectedDocId) {
      toast.error("Please paste plaint text or select a vault document.");
      setShowIntakePanel(true);
      return;
    }

    setWsLoading(true);
    try {
      const res = await defenseService.analyzePlaint({
        document_id: selectedDocId || undefined,
        raw_text: selectedDocId ? undefined : effectiveSourceText,
      });

      setAnalysis(res);
      setCourtName(res.court_name);
      setSuitNumber(res.suit_number);
      setPlaintiff(res.plaintiff);
      setDefendant(res.defendant);
      setBars(res.detected_bars);
      setWsStep(2);
      toast.success(
        `Parsed ${res.total_paragraphs} paragraphs & identified ${res.detected_bars.length} threshold statutory bars.`
      );
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to analyze plaint.");
    } finally {
      setWsLoading(false);
    }
  };

  const handleGenerateWrittenStatement = async () => {
    if (!analysis) return;
    setWsLoading(true);
    try {
      const res = await defenseService.generateWrittenStatement({
        court_name: courtName || analysis.court_name,
        suit_number: suitNumber || analysis.suit_number,
        plaintiff: plaintiff || analysis.plaintiff,
        defendant: defendant || analysis.defendant,
        selected_bars: bars,
        paragraphs: analysis.paragraphs,
        defense_strategy: strategy,
        advocate_notes: advocateNotes || undefined,
      });

      setGeneratedWs(res);
      setWsStep(3);
      toast.success("Court-ready Written Statement (Order VIII CPC) synthesized!");
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to generate Written Statement.");
    } finally {
      setWsLoading(false);
    }
  };

  const toggleBar = (barId: string) => {
    setBars((prev) =>
      prev.map((b) => (b.bar_id === barId ? { ...b, is_selected: !b.is_selected } : b))
    );
  };

  const handleCopyWsDraft = () => {
    if (!generatedWs) return;
    const cleanText = stripHtmlToPlainText(generatedWs.full_draft_html);
    navigator.clipboard.writeText(cleanText);
    setIsCopied(true);
    toast.success("Written Statement copied to clipboard.");
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleInsertWsToEditor = () => {
    if (!generatedWs) return;
    if (onOpenInEditor) {
      onOpenInEditor({
        title: generatedWs.title || "Written Statement (Order VIII CPC)",
        content: generatedWs.full_draft_html,
      });
    } else if (onInjectContent) {
      onInjectContent(generatedWs.full_draft_html);
    }
    toast.success("Written Statement loaded into Legal Editor!");
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100005] flex items-center justify-center p-3 sm:p-5"
      style={{
        background: "rgba(7, 9, 13, 0.80)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div
        className="w-full max-w-6xl max-h-[93vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        style={{
          background: "var(--surface)",
          borderColor: "var(--hairline)",
          color: "var(--ink)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
        }}
      >
        {/* ── Modal Header ── */}
        <div
          className="px-6 py-4 border-b flex items-center justify-between gap-4 shrink-0"
          style={{
            background: "var(--surface-raised)",
            borderColor: "var(--hairline)",
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="p-2.5 rounded-xl border flex items-center justify-center shrink-0"
              style={{
                background: "var(--brass-soft)",
                borderColor: "var(--brass)",
                color: "var(--brass-bright)",
              }}
            >
              <Swords size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold tracking-tight truncate" style={{ color: "var(--ink)" }}>
                Adversarial Defense Suite &amp; War Room
              </h2>
              <p className="text-xs truncate" style={{ color: "var(--ink-muted)" }}>
                Single Plaint Intake • Opposition Matrix • Interim Stay • Weakness Radar • Order VIII Written Statement
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowIntakePanel((v) => !v)}
              className="px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              style={{
                background: showIntakePanel ? "var(--brass-soft)" : "var(--surface-container)",
                borderColor: showIntakePanel ? "var(--brass)" : "var(--hairline)",
                color: showIntakePanel ? "var(--brass-bright)" : "var(--ink)",
              }}
            >
              <FileText size={13} />
              <span>{showIntakePanel ? "Hide Source Plaint" : "Edit / Swap Source Plaint"}</span>
              {showIntakePanel ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg border text-xs transition-colors hover:text-white cursor-pointer"
              style={{
                background: "var(--surface-container)",
                borderColor: "var(--hairline)",
                color: "var(--ink-muted)",
              }}
              title="Close Defense Suite"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Collapsible Single-Source Plaint / Document Intake Drawer ── */}
        {showIntakePanel && (
          <div
            className="px-6 py-4 border-b space-y-3 shrink-0"
            style={{ background: "var(--surface-container)", borderColor: "var(--hairline)" }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ink-dim)" }}>
                Shared Opposing Plaint / Active Pleading Source (Used Across All 4 Tabs)
              </label>
              <div className="flex items-center gap-2">
                {vaultDocs.length > 0 && (
                  <select
                    value={selectedDocId}
                    onChange={(e) => setSelectedDocId(e.target.value)}
                    className="px-2.5 py-1 rounded-lg border text-xs outline-none"
                    style={{
                      background: "var(--surface)",
                      borderColor: "var(--hairline)",
                      color: "var(--ink)",
                    }}
                  >
                    <option value="">Use Pasted / Editor Text</option>
                    {vaultDocs.map((d) => (
                      <option key={d.id} value={d.id}>
                        Vault Doc: {d.original_filename}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDocId("");
                    setSharedText(SAMPLE_COMMERCIAL_PLAINT);
                    toast.info("Loaded sample Commercial Suit plaint.");
                  }}
                  className="px-2.5 py-1 rounded-lg border text-xs cursor-pointer"
                  style={{ borderColor: "var(--hairline)", color: "var(--ink-muted)" }}
                >
                  Load Sample Plaint
                </button>
              </div>
            </div>
            {!selectedDocId && (
              <textarea
                value={sharedText}
                onChange={(e) => setSharedText(e.target.value)}
                rows={4}
                placeholder="Paste opponent's Plaint, Petition, or your active draft here once — all 4 Defense Suite modules will analyze it..."
                className="w-full rounded-xl border p-3 text-xs font-mono outline-none resize-y"
                style={{
                  background: "var(--surface)",
                  borderColor: "var(--hairline)",
                  color: "var(--ink)",
                }}
              />
            )}
          </div>
        )}

        {/* ── Unified 4-Tab Bar ── */}
        <div
          className="px-6 py-2.5 border-b flex items-center gap-2 shrink-0 overflow-x-auto scrollbar-none"
          style={{
            background: "var(--surface)",
            borderColor: "var(--hairline)",
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("matrix")}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap"
            style={{
              background: activeTab === "matrix" ? "var(--brass-soft)" : "transparent",
              color: activeTab === "matrix" ? "var(--brass-bright)" : "var(--ink-muted)",
              border: `1px solid ${activeTab === "matrix" ? "var(--brass)" : "transparent"}`,
            }}
          >
            <Swords size={14} />
            <span>1. Opposition Matrix</span>
            {matrixData && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-[var(--brass)]/20 text-[var(--brass-bright)]">
                {matrixData.rows.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("interim_stay")}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap"
            style={{
              background: activeTab === "interim_stay" ? "var(--brass-soft)" : "transparent",
              color: activeTab === "interim_stay" ? "var(--brass-bright)" : "var(--ink-muted)",
              border: `1px solid ${activeTab === "interim_stay" ? "var(--brass)" : "transparent"}`,
            }}
          >
            <Scale size={14} />
            <span>2. Interim Stay Analyzer</span>
            {stayData && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-400">
                Ready
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("weakness_radar");
              if (!radarData && !loadingRadar && effectiveSourceText) handleScanRadar();
            }}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap"
            style={{
              background: activeTab === "weakness_radar" ? "var(--brass-soft)" : "transparent",
              color: activeTab === "weakness_radar" ? "var(--brass-bright)" : "var(--ink-muted)",
              border: `1px solid ${activeTab === "weakness_radar" ? "var(--brass)" : "transparent"}`,
            }}
          >
            <ShieldAlert size={14} />
            <span>3. Weakness Radar</span>
            {radarData && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                style={{
                  background: radarData.risk_score >= 40 ? "rgba(239, 68, 68, 0.2)" : "rgba(34, 197, 94, 0.2)",
                  color: radarData.risk_score >= 40 ? "#f87171" : "#4ade80",
                }}
              >
                {radarData.defects.length} Flags
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("written_statement")}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap"
            style={{
              background: activeTab === "written_statement" ? "var(--brass-soft)" : "transparent",
              color: activeTab === "written_statement" ? "var(--brass-bright)" : "var(--ink-muted)",
              border: `1px solid ${activeTab === "written_statement" ? "var(--brass)" : "transparent"}`,
            }}
          >
            <Gavel size={14} />
            <span>4. Written Statement (Order VIII CPC)</span>
            {generatedWs && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-400">
                Draft Ready
              </span>
            )}
          </button>
        </div>

        {/* ── Main Content Area ── */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {/* TAB 1: OPPOSITION MATRIX */}
          {activeTab === "matrix" && (
            <div>
              {loadingMatrix ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-3">
                  <Loader2 size={32} className="animate-spin text-[var(--brass)]" />
                  <p className="text-xs font-medium" style={{ color: "var(--ink-muted)" }}>
                    Synthesizing 4-column adversarial opposition matrix &amp; cross-examining citations...
                  </p>
                </div>
              ) : matrixData ? (
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleGenerateMatrix}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer"
                      style={{ background: "var(--surface-container)", borderColor: "var(--hairline)", color: "var(--ink-dim)" }}
                    >
                      <RefreshCw size={12} /> Re-Run Matrix
                    </button>
                  </div>
                  <OppositionMatrixTable data={matrixData} onInjectRebuttal={handleInjectContent} />
                </div>
              ) : (
                <div className="py-16 text-center space-y-3">
                  <Swords size={32} className="mx-auto" style={{ color: "var(--ink-muted)" }} />
                  <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
                    Generate a 4-column opposition strategy matrix from your shared plaint source.
                  </p>
                  <button
                    type="button"
                    onClick={handleGenerateMatrix}
                    className="px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                    style={{ background: "var(--brass)", color: "#000" }}
                  >
                    Generate Opposition Matrix
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: INTERIM STAY ANALYZER */}
          {activeTab === "interim_stay" && (
            <InterimStayCard
              data={stayData}
              loading={loadingStay}
              onAnalyze={handleAnalyzeStay}
              onInjectClauses={handleInjectContent}
            />
          )}

          {/* TAB 3: PROCEDURAL WEAKNESS RADAR */}
          {activeTab === "weakness_radar" && (
            <WeaknessRadarCard
              data={radarData}
              loading={loadingRadar}
              onScan={handleScanRadar}
              onInjectCureClause={handleInjectContent}
            />
          )}

          {/* TAB 4: ORDER VIII WRITTEN STATEMENT GENERATOR */}
          {activeTab === "written_statement" && (
            <div className="space-y-5">
              {/* Step Indicator */}
              <div className="flex items-center gap-3 text-xs">
                {[
                  { num: 1, label: "1. Parse Plaint & Bars" },
                  { num: 2, label: "2. Configure Defense & Bars" },
                  { num: 3, label: "3. Order VIII Draft" },
                ].map((s) => (
                  <button
                    key={s.num}
                    type="button"
                    disabled={(s.num === 2 && !analysis) || (s.num === 3 && !generatedWs)}
                    onClick={() => setWsStep(s.num as 1 | 2 | 3)}
                    className="px-3 py-1.5 rounded-lg border font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: wsStep === s.num ? "var(--brass-soft)" : "var(--surface-container)",
                      borderColor: wsStep === s.num ? "var(--brass)" : "var(--hairline)",
                      color: wsStep === s.num ? "var(--brass-bright)" : "var(--ink-muted)",
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* STEP 1: Parse Shared Plaint */}
              {wsStep === 1 && (
                <div
                  className="p-6 rounded-2xl border space-y-4"
                  style={{ background: "var(--surface-raised)", borderColor: "var(--hairline)" }}
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--ink)" }}>
                        <Shield size={16} style={{ color: "var(--brass)" }} />
                        Order VIII Rules 3–5 CPC Plaint Parser &amp; Statutory Bar Detector
                      </h3>
                      <p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>
                        Uses the shared plaint source above to chunk numbered paragraphs and detect Order VII Rule 11, Limitation Act, and Section 12A Commercial Courts Act bars.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowIntakePanel(true)}
                      className="text-xs underline cursor-pointer"
                      style={{ color: "var(--brass-bright)" }}
                    >
                      Edit Source Plaint
                    </button>
                  </div>

                  <div
                    className="p-3.5 rounded-xl border text-xs font-mono max-h-48 overflow-y-auto whitespace-pre-wrap"
                    style={{ background: "var(--surface)", borderColor: "var(--hairline)", color: "var(--ink-dim)" }}
                  >
                    {selectedDocId
                      ? `Selected Vault Document ID: ${selectedDocId}`
                      : effectiveSourceText.slice(0, 1400) + (effectiveSourceText.length > 1400 ? "\n..." : "")}
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleAnalyzePlaint}
                      disabled={wsLoading}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      style={{ background: "var(--brass)", color: "#000" }}
                    >
                      {wsLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                      <span>{wsLoading ? "Analyzing Plaint..." : "Analyze Plaint & Detect Statutory Bars"}</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: Review Bars & Configure Defense */}
              {wsStep === 2 && analysis && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold uppercase" style={{ color: "var(--ink-muted)" }}>
                        Court Name
                      </label>
                      <input
                        value={courtName}
                        onChange={(e) => setCourtName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border text-xs outline-none"
                        style={{ background: "var(--surface-raised)", borderColor: "var(--hairline)", color: "var(--ink)" }}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold uppercase" style={{ color: "var(--ink-muted)" }}>
                        Suit / Case Number
                      </label>
                      <input
                        value={suitNumber}
                        onChange={(e) => setSuitNumber(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border text-xs outline-none"
                        style={{ background: "var(--surface-raised)", borderColor: "var(--hairline)", color: "var(--ink)" }}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold uppercase" style={{ color: "var(--ink-muted)" }}>
                        Plaintiff / Petitioner
                      </label>
                      <input
                        value={plaintiff}
                        onChange={(e) => setPlaintiff(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border text-xs outline-none"
                        style={{ background: "var(--surface-raised)", borderColor: "var(--hairline)", color: "var(--ink)" }}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold uppercase" style={{ color: "var(--ink-muted)" }}>
                        Defendant / Respondent
                      </label>
                      <input
                        value={defendant}
                        onChange={(e) => setDefendant(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border text-xs outline-none"
                        style={{ background: "var(--surface-raised)", borderColor: "var(--hairline)", color: "var(--ink)" }}
                      />
                    </div>
                  </div>

                  {/* Detected Statutory Bars */}
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: "var(--ink)" }}>
                      <AlertTriangle size={14} className="text-amber-400" />
                      Detected Threshold Statutory Bars ({bars.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {bars.map((bar) => (
                        <button
                          key={bar.bar_id}
                          type="button"
                          onClick={() => toggleBar(bar.bar_id)}
                          className="p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer"
                          style={{
                            background: bar.is_selected ? "var(--brass-soft)" : "var(--surface-raised)",
                            borderColor: bar.is_selected ? "var(--brass)" : "var(--hairline)",
                          }}
                        >
                          {bar.is_selected ? (
                            <CheckSquare size={15} className="shrink-0 mt-0.5 text-[var(--brass-bright)]" />
                          ) : (
                            <Square size={15} className="shrink-0 mt-0.5 text-[var(--ink-muted)]" />
                          )}
                          <div className="min-w-0">
                            <div className="text-xs font-bold" style={{ color: "var(--ink)" }}>
                              {bar.title}
                            </div>
                            <div className="text-[11px] mt-0.5" style={{ color: "var(--ink-muted)" }}>
                              {bar.statute} — {bar.description}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Defense Strategy & Advocate Factual Notes */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {(
                      [
                        { id: "aggressive_denial", label: "Aggressive Denial (Order VIII R. 3–5)" },
                        { id: "demurrer", label: "Demurrer / Order VII Rule 11 Focus" },
                        { id: "counter_claim", label: "Denial + Counter-Claim / Set-Off" },
                      ] as { id: DefenseStrategy; label: string }[]
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setStrategy(opt.id)}
                        className="p-3 rounded-xl border text-xs font-semibold cursor-pointer"
                        style={{
                          background: strategy === opt.id ? "var(--brass-soft)" : "var(--surface-raised)",
                          borderColor: strategy === opt.id ? "var(--brass)" : "var(--hairline)",
                          color: strategy === opt.id ? "var(--brass-bright)" : "var(--ink)",
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase" style={{ color: "var(--ink-muted)" }}>
                      Advocate Factual Defense Instructions
                    </label>
                    <textarea
                      value={advocateNotes}
                      onChange={(e) => setAdvocateNotes(e.target.value)}
                      rows={3}
                      className="w-full p-3 rounded-xl border text-xs outline-none"
                      style={{ background: "var(--surface-raised)", borderColor: "var(--hairline)", color: "var(--ink)" }}
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleGenerateWrittenStatement}
                      disabled={wsLoading}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      style={{ background: "var(--brass)", color: "#000" }}
                    >
                      {wsLoading ? <Loader2 size={14} className="animate-spin" /> : <Gavel size={14} />}
                      <span>{wsLoading ? "Drafting Written Statement..." : "Generate Order VIII Written Statement"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Generated Written Statement Preview & Editor Injection */}
              {wsStep === 3 && generatedWs && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {(
                        [
                          { id: "full", label: "Full Draft Preview" },
                          { id: "objections", label: "Preliminary Objections" },
                          { id: "traversals", label: `Para Traversals (${generatedWs.traversals.length})` },
                        ] as const
                      ).map((sub) => (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => setWsSubTab(sub.id)}
                          className="px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer"
                          style={{
                            background: wsSubTab === sub.id ? "var(--brass-soft)" : "var(--surface-raised)",
                            borderColor: wsSubTab === sub.id ? "var(--brass)" : "var(--hairline)",
                            color: wsSubTab === sub.id ? "var(--brass-bright)" : "var(--ink-dim)",
                          }}
                        >
                          {sub.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopyWsDraft}
                        className="px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                        style={{ borderColor: "var(--hairline)", color: "var(--ink)" }}
                      >
                        {isCopied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                        <span>{isCopied ? "Copied" : "Copy Text"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleInsertWsToEditor}
                        className="px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        style={{ background: "var(--brass)", color: "#000" }}
                      >
                        <BookOpen size={13} />
                        <span>Insert into Legal Editor</span>
                      </button>
                    </div>
                  </div>

                  {wsSubTab === "full" && (
                    <div
                      className="p-6 rounded-xl border bg-white text-black prose prose-sm max-w-none max-h-[420px] overflow-y-auto"
                      dangerouslySetInnerHTML={{ __html: generatedWs.full_draft_html }}
                    />
                  )}

                  {wsSubTab === "objections" && (
                    <div
                      className="p-6 rounded-xl border bg-white text-black prose prose-sm max-w-none max-h-[420px] overflow-y-auto"
                      dangerouslySetInnerHTML={{
                        __html:
                          generatedWs.preliminary_objections_html ||
                          "<p>No preliminary objections selected.</p>",
                      }}
                    />
                  )}

                  {wsSubTab === "traversals" && (
                    <div className="space-y-3">
                      {generatedWs.traversals.map((tr) => (
                        <div
                          key={tr.para_number}
                          className="p-4 rounded-xl border text-xs space-y-1.5"
                          style={{ background: "var(--surface-raised)", borderColor: "var(--hairline)" }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold flex items-center gap-1.5" style={{ color: "var(--brass-bright)" }}>
                              <CheckCircle2 size={13} />
                              Reply to Paragraph {tr.para_number}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full border" style={{ borderColor: "var(--hairline)" }}>
                              {tr.is_ai_generated ? "Substantive AI Traverse" : "Formal Standard Denial"}
                            </span>
                          </div>
                          {tr.allegation_summary && (
                            <p className="text-[11px] italic" style={{ color: "var(--ink-muted)" }}>
                              Plaint Allegation: {tr.allegation_summary}
                            </p>
                          )}
                          <p style={{ color: "var(--ink)" }}>{tr.traverse_text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
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
              type="button"
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
              {isExporting ? (
                <Loader2 size={13} className="animate-spin text-[var(--brass)]" />
              ) : (
                <Download size={13} style={{ color: "var(--brass)" }} />
              )}
              <span>Export Adversarial Brief (.docx)</span>
            </button>
            <span className="text-[11px] hidden sm:inline" style={{ color: "var(--ink-muted)" }}>
              Registry-formatted (1.75&quot; Binding Gutter Margin, A4)
            </span>
          </div>

          <button
            type="button"
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
