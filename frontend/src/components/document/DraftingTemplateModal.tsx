import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  FileText,
  Scale,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldAlert,
  Gavel,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { draftingService } from "@/services/drafting";
import type {
  DraftingTemplateItem,
  DraftingTemplateId,
  TemplateCategory,
  GeneratePleadingResponse,
} from "@/types/drafting";

interface DraftingTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenInEditor: (draft: { title: string; content: string }) => void;
}

export const DraftingTemplateModal: React.FC<DraftingTemplateModalProps> = ({
  isOpen,
  onClose,
  onOpenInEditor,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [templates, setTemplates] = useState<DraftingTemplateItem[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<"all" | TemplateCategory>("all");
  const [selectedTemplate, setSelectedTemplate] = useState<DraftingTemplateItem | null>(null);

  // Form State
  const [courtName, setCourtName] = useState("");
  const [caseNumber, setCaseNumber] = useState("");
  const [applicantName, setApplicantName] = useState("");
  const [applicantDetails, setApplicantDetails] = useState("");
  const [respondentName, setRespondentName] = useState("");
  const [respondentDetails, setRespondentDetails] = useState("");
  const [firNumber, setFirNumber] = useState("");
  const [policeStation, setPoliceStation] = useState("");
  const [sectionsAlleged, setSectionsAlleged] = useState("");
  const [factualNarrative, setFactualNarrative] = useState("");
  const [groundsNotes, setGroundsNotes] = useState("");
  const [mainPrayers, setMainPrayers] = useState("");

  // Generation State
  const [generating, setGenerating] = useState(false);
  const [generatedDraft, setGeneratedDraft] = useState<GeneratePleadingResponse | null>(null);

  // Load templates on open
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setGeneratedDraft(null);
      setLoadingTemplates(true);
      draftingService
        .getTemplates()
        .then((data) => {
          setTemplates(data);
          if (data.length > 0 && !selectedTemplate) {
            setSelectedTemplate(data[0]);
          }
        })
        .catch((err) => {
          toast.error("Failed to load drafting templates catalog.");
        })
        .finally(() => {
          setLoadingTemplates(false);
        });
    }
  }, [isOpen]);

  // Set default values when a template is picked
  const handleSelectTemplate = (tmpl: DraftingTemplateItem) => {
    setSelectedTemplate(tmpl);
    setCourtName(tmpl.sample_cause_title || "");
    setCaseNumber("CRL. / CIVIL MISC. NO. ______ OF 2026");

    // Pre-fill typical defaults
    if (tmpl.category === "criminal") {
      setRespondentName("State (NCT of Delhi) through SHO");
      setRespondentDetails("Police Station " + (policeStation || "[Name]"));
    } else {
      setRespondentName("Union of India & Ors.");
      setRespondentDetails("Through Secretary, Ministry of Home Affairs / Competent Authority");
    }

    setStep(2);
  };

  const handleGenerate = async () => {
    if (!selectedTemplate) return;
    if (!courtName.trim()) {
      toast.error("Please enter the Court Name.");
      return;
    }
    if (!applicantName.trim()) {
      toast.error("Please enter the Applicant / Petitioner Name.");
      return;
    }
    if (!factualNarrative.trim() || factualNarrative.length < 20) {
      toast.error("Please provide the factual chronology (at least 20 characters).");
      return;
    }

    setGenerating(true);
    try {
      const resp = await draftingService.generatePleading({
        template_id: selectedTemplate.id,
        court_name: courtName,
        case_number: caseNumber,
        applicant_name: applicantName,
        applicant_details: applicantDetails,
        respondent_name: respondentName,
        respondent_details: respondentDetails,
        fir_number: firNumber,
        police_station: policeStation,
        sections_alleged: sectionsAlleged,
        factual_narrative: factualNarrative,
        grounds_notes: groundsNotes,
        main_prayers: mainPrayers,
      });

      setGeneratedDraft(resp);
      setStep(3);
      toast.success("Court-ready draft synthesized successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate pleading.");
    } finally {
      setGenerating(false);
    }
  };

  const handleOpenInEditor = () => {
    if (!generatedDraft) return;
    onOpenInEditor({
      title: generatedDraft.title,
      content: generatedDraft.html_content,
    });
    onClose();
    toast.success("Pleading loaded into Legal Editor.");
  };

  if (!isOpen) return null;

  const filteredTemplates = templates.filter((t) => {
    if (selectedCategory === "all") return true;
    return t.category === selectedCategory;
  });

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-4xl h-[90vh] rounded-2xl flex flex-col overflow-hidden border shadow-2xl"
        style={{
          borderColor: "var(--hairline)",
          background: "var(--surface)",
        }}
      >
        {/* ── Header ── */}
        <div
          className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0"
          style={{ borderColor: "var(--hairline)", background: "var(--surface-raised)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--brass-soft)", color: "var(--brass-bright)" }}
            >
              <FileText size={18} />
            </div>
            <div>
              <h3 className="font-serif text-lg font-semibold" style={{ color: "var(--ink)" }}>
                Court Pleading Generator
              </h3>
              <p className="text-xs" style={{ color: "var(--ink-faint)" }}>
                Procedural Indian Court Templates • Anti-Hallucination Deficit Guard • Paper-Book Layout
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Step Indicators */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono mr-2">
              <span
                className={`px-2 py-0.5 rounded-full ${
                  step === 1 ? "bg-[var(--brass)] text-[var(--on-primary)] font-bold" : "text-[var(--ink-faint)]"
                }`}
              >
                1. Template
              </span>
              <span className="text-[var(--ink-faint)]">→</span>
              <span
                className={`px-2 py-0.5 rounded-full ${
                  step === 2 ? "bg-[var(--brass)] text-[var(--on-primary)] font-bold" : "text-[var(--ink-faint)]"
                }`}
              >
                2. Case Particulars
              </span>
              <span className="text-[var(--ink-faint)]">→</span>
              <span
                className={`px-2 py-0.5 rounded-full ${
                  step === 3 ? "bg-[var(--brass)] text-[var(--on-primary)] font-bold" : "text-[var(--ink-faint)]"
                }`}
              >
                3. Verification
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-colors hover:bg-[var(--surface-container)] text-[var(--ink-faint)] hover:text-[var(--ink)] cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* STEP 1: TEMPLATE SELECTOR */}
          {step === 1 && (
            <div className="space-y-5">
              {/* Category Pills */}
              <div className="flex items-center gap-2 p-1 rounded-xl border border-[var(--hairline)] bg-[var(--surface-raised)] w-fit">
                {[
                  { id: "all", label: "All Formats" },
                  { id: "criminal", label: "Criminal (BNS / CrPC)" },
                  { id: "constitutional", label: "Constitutional (Writs / SLP)" },
                  { id: "civil", label: "Civil & Commercial (CPC)" },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      selectedCategory === cat.id
                        ? "bg-[var(--brass)] text-[var(--on-primary)] shadow-sm font-semibold"
                        : "text-[var(--ink-faint)] hover:text-[var(--ink)]"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Template Cards Grid */}
              {loadingTemplates ? (
                <div className="flex items-center justify-center py-24 text-[var(--ink-faint)] gap-2 text-sm">
                  <Loader2 size={18} className="animate-spin text-[var(--brass)]" />
                  <span>Loading Indian court templates...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {filteredTemplates.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => handleSelectTemplate(t)}
                      className="group p-4 rounded-xl border border-[var(--hairline)] hover:border-[var(--brass)] cursor-pointer transition-all duration-200 flex flex-col justify-between"
                      style={{ background: "var(--surface-raised)" }}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span
                            className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-full"
                            style={{ background: "var(--surface-container)", color: "var(--ink-faint)" }}
                          >
                            {t.category}
                          </span>
                          <span
                            className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md"
                            style={{ background: "var(--brass-soft)", color: "var(--brass-bright)" }}
                          >
                            {t.provisions[0]?.split("(")[0] || "Statutory"}
                          </span>
                        </div>
                        <h4 className="font-semibold text-sm group-hover:text-[var(--brass-bright)] transition-colors text-[var(--ink)]">
                          {t.title}
                        </h4>
                        <p className="text-xs text-[var(--ink-faint)] mt-1.5 leading-relaxed line-clamp-2">
                          {t.description}
                        </p>
                      </div>

                      <div className="mt-4 pt-2.5 border-t border-[var(--hairline)] flex items-center justify-between text-[11px]">
                        <span className="text-[var(--ink-faint)] italic truncate max-w-[180px]">
                          {t.court_jurisdiction}
                        </span>
                        <span className="text-[var(--brass)] font-medium flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                          Select <ArrowRight size={12} />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: INTAKE FORM */}
          {step === 2 && selectedTemplate && (
            <div className="space-y-5 max-w-3xl mx-auto">
              {/* Selected Template Badge Banner */}
              <div
                className="p-3.5 rounded-xl border border-[var(--hairline)] flex items-center justify-between"
                style={{ background: "var(--surface-raised)" }}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--brass-soft)] text-[var(--brass-bright)]">
                    <Scale size={16} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-[var(--ink)]">{selectedTemplate.title}</h4>
                    <p className="text-xs text-[var(--ink-faint)]">
                      {selectedTemplate.provisions.join(" • ")} • {selectedTemplate.court_jurisdiction}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setStep(1)}
                  className="text-xs text-[var(--brass)] hover:underline cursor-pointer"
                >
                  Change Template
                </button>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-[var(--ink)] block mb-1">
                    Court Jurisdiction & Name *
                  </label>
                  <input
                    type="text"
                    value={courtName}
                    onChange={(e) => setCourtName(e.target.value)}
                    placeholder="e.g. IN THE HIGH COURT OF DELHI AT NEW DELHI"
                    className="w-full text-xs p-2.5 rounded-lg border border-[var(--hairline)] bg-[var(--surface-raised)] text-[var(--ink)] outline-none focus:border-[var(--brass)] font-serif"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-[var(--ink)] block mb-1">
                    Applicant / Petitioner Name *
                  </label>
                  <input
                    type="text"
                    value={applicantName}
                    onChange={(e) => setApplicantName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full text-xs p-2.5 rounded-lg border border-[var(--hairline)] bg-[var(--surface-raised)] text-[var(--ink)] outline-none focus:border-[var(--brass)]"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-[var(--ink)] block mb-1">
                    Applicant Address / Age Details
                  </label>
                  <input
                    type="text"
                    value={applicantDetails}
                    onChange={(e) => setApplicantDetails(e.target.value)}
                    placeholder="e.g. S/o Late Shri..., Aged 48, R/o Hauz Khas"
                    className="w-full text-xs p-2.5 rounded-lg border border-[var(--hairline)] bg-[var(--surface-raised)] text-[var(--ink)] outline-none focus:border-[var(--brass)]"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-[var(--ink)] block mb-1">
                    Respondent / Opposite Party *
                  </label>
                  <input
                    type="text"
                    value={respondentName}
                    onChange={(e) => setRespondentName(e.target.value)}
                    placeholder="e.g. State of NCT of Delhi / M/s ABC Corp"
                    className="w-full text-xs p-2.5 rounded-lg border border-[var(--hairline)] bg-[var(--surface-raised)] text-[var(--ink)] outline-none focus:border-[var(--brass)]"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-[var(--ink)] block mb-1">
                    Case / Petition Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={caseNumber}
                    onChange={(e) => setCaseNumber(e.target.value)}
                    placeholder="e.g. BAIL APPLN. NO. ______ OF 2026"
                    className="w-full text-xs p-2.5 rounded-lg border border-[var(--hairline)] bg-[var(--surface-raised)] text-[var(--ink)] outline-none focus:border-[var(--brass)]"
                  />
                </div>

                {selectedTemplate.category === "criminal" && (
                  <>
                    <div>
                      <label className="text-xs font-medium text-[var(--ink)] block mb-1">
                        FIR / Complaint Number
                      </label>
                      <input
                        type="text"
                        value={firNumber}
                        onChange={(e) => setFirNumber(e.target.value)}
                        placeholder="e.g. FIR No. 124/2026"
                        className="w-full text-xs p-2.5 rounded-lg border border-[var(--hairline)] bg-[var(--surface-raised)] text-[var(--ink)] outline-none focus:border-[var(--brass)]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[var(--ink)] block mb-1">
                        Police Station
                      </label>
                      <input
                        type="text"
                        value={policeStation}
                        onChange={(e) => setPoliceStation(e.target.value)}
                        placeholder="e.g. P.S. Connaught Place, New Delhi"
                        className="w-full text-xs p-2.5 rounded-lg border border-[var(--hairline)] bg-[var(--surface-raised)] text-[var(--ink)] outline-none focus:border-[var(--brass)]"
                      />
                    </div>
                  </>
                )}

                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-[var(--ink)] block mb-1">
                    Factual Narrative & Chronology of Events *
                  </label>
                  <textarea
                    rows={6}
                    value={factualNarrative}
                    onChange={(e) => setFactualNarrative(e.target.value)}
                    placeholder="Enter the core factual narrative. If specific dates, notice numbers, or amounts are missing, the Deficit Guard will safely flag them as [REQUIRED: ...] rather than hallucinating details."
                    className="w-full text-xs p-2.5 rounded-lg border border-[var(--hairline)] bg-[var(--surface-raised)] text-[var(--ink)] outline-none focus:border-[var(--brass)] font-sans leading-relaxed"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-[var(--ink)] block mb-1">
                    Specific Legal Grounds / Advocate Notes (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={groundsNotes}
                    onChange={(e) => setGroundsNotes(e.target.value)}
                    placeholder="e.g. Parity with co-accused who was granted bail on 10.02.2026; no custodial interrogation needed as documents already seized."
                    className="w-full text-xs p-2.5 rounded-lg border border-[var(--hairline)] bg-[var(--surface-raised)] text-[var(--ink)] outline-none focus:border-[var(--brass)] font-sans leading-relaxed"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: PREVIEW & DEFICIT AUDIT */}
          {step === 3 && generatedDraft && (
            <div className="space-y-5 max-w-3xl mx-auto">
              {/* Deficit Banner */}
              <div
                className="p-4 rounded-xl border flex items-start gap-3"
                style={{
                  background:
                    generatedDraft.deficits_found.length > 0 ? "rgba(212, 136, 6, 0.08)" : "rgba(39, 174, 96, 0.08)",
                  borderColor:
                    generatedDraft.deficits_found.length > 0 ? "rgba(212, 136, 6, 0.3)" : "rgba(39, 174, 96, 0.3)",
                }}
              >
                {generatedDraft.deficits_found.length > 0 ? (
                  <AlertCircle size={20} className="text-amber-500 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 size={20} className="text-emerald-500 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm text-[var(--ink)]">
                      {generatedDraft.deficits_found.length > 0
                        ? `Deficit Guard: ${generatedDraft.deficits_found.length} Missing Variable(s) Flagged`
                        : "Deficit Guard: 100% Complete — Zero Missing Variables"}
                    </h4>
                    <span className="text-xs font-mono text-[var(--ink-faint)]">
                      ~{generatedDraft.word_count} words • {generatedDraft.estimated_pages} pages
                    </span>
                  </div>
                  <p className="text-xs text-[var(--ink-faint)] mt-1">
                    {generatedDraft.deficits_found.length > 0
                      ? "The AI halted factual invention and inserted highlighted [REQUIRED: ...] placeholders to protect your filing from registry defects."
                      : "All mandatory statutory averments, cause titles, and verification affidavits are verified."}
                  </p>

                  {generatedDraft.deficits_found.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {generatedDraft.deficits_found.map((def, idx) => (
                        <span
                          key={idx}
                          className="text-[11px] font-mono px-2 py-0.5 rounded-md border"
                          style={{
                            background: "rgba(212, 136, 6, 0.15)",
                            borderColor: "rgba(212, 136, 6, 0.4)",
                            color: "#d48806",
                          }}
                        >
                          {def.placeholder}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Draft HTML Preview Card */}
              <div
                className="p-5 rounded-xl border border-[var(--hairline)] max-h-[46vh] overflow-y-auto"
                style={{ background: "#FBF9F1", color: "#1A1915" }}
              >
                <div
                  className="font-serif text-[13px] leading-relaxed space-y-3"
                  dangerouslySetInnerHTML={{ __html: generatedDraft.html_content }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div
          className="px-6 py-3.5 border-t flex items-center justify-between flex-shrink-0"
          style={{ borderColor: "var(--hairline)", background: "var(--surface-raised)" }}
        >
          {step > 1 ? (
            <button
              onClick={() => setStep((s) => (s - 1) as any)}
              disabled={generating}
              className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors hover:bg-[var(--surface-container)] text-[var(--ink-faint)] hover:text-[var(--ink)] cursor-pointer"
            >
              <ArrowLeft size={13} /> Back
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-[var(--surface-container)] text-[var(--ink-faint)] hover:text-[var(--ink)] cursor-pointer"
            >
              Cancel
            </button>

            {step === 2 && (
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer shadow-md"
                style={{
                  background: "var(--brass)",
                  color: "var(--on-primary)",
                  boxShadow: "0 2px 10px rgba(197, 160, 89, 0.25)",
                }}
              >
                {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                <span>{generating ? "Synthesizing Court Pleading..." : "Generate Court-Ready Draft"}</span>
              </button>
            )}

            {step === 3 && (
              <button
                onClick={handleOpenInEditor}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer shadow-md"
                style={{
                  background: "var(--brass)",
                  color: "var(--on-primary)",
                  boxShadow: "0 2px 10px rgba(197, 160, 89, 0.25)",
                }}
              >
                <Sparkles size={14} />
                <span>Open in Legal Editor</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

