import React, { useState, useEffect } from "react";
import {
  Gavel,
  BookOpen,
  Copy,
  Check,
  Search,
  ExternalLink,
  ShieldAlert,
  Loader2,
  Filter,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { eraTransitionService } from "@/services/eraTransition";
import type { TransitionalJurisprudenceItem } from "@/types/era_transition";

const TOPIC_OPTIONS = [
  { id: "ALL", label: "All Transition Authorities" },
  { id: "Undertrial Bail (BNSS 479)", label: "Undertrial Bail (BNSS 479)" },
  { id: "Police Custody (BNSS 187)", label: "Police Custody Beyond 15 Days (BNSS 187)" },
  { id: "Preliminary Inquiry (BNSS 173)", label: "Preliminary Inquiry 14-Day Limit (BNSS 173)" },
  { id: "Savings & Pending Petitions (BNSS 531)", label: "Savings & Quashing (BNSS 531)" },
  { id: "General Clauses Continuity", label: "Section 8 General Clauses Continuity" },
];

export function TransitionalJurisprudenceFeed({ className = "" }: { className?: string }) {
  const [items, setItems] = useState<TransitionalJurisprudenceItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedTopic, setSelectedTopic] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchAuthorities = async () => {
    setLoading(true);
    try {
      const res = await eraTransitionService.getTransitionalJurisprudence(
        selectedTopic === "ALL" ? undefined : selectedTopic,
        searchQuery || undefined
      );
      setItems(res.items);
    } catch (err: any) {
      toast.error("Failed to load transitional jurisprudence: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuthorities();
  }, [selectedTopic]);

  const handleCopyPleading = (id: string, snippet: string) => {
    navigator.clipboard.writeText(snippet);
    setCopiedId(id);
    toast.success("Copied court submission paragraph to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* ── Filter Bar ── */}
      <div
        className="p-5 rounded-2xl border space-y-4"
        style={{ background: "var(--surface)", borderColor: "var(--hairline)" }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center border"
              style={{
                background: "var(--brass-soft)",
                borderColor: "var(--brass)",
                color: "var(--brass-bright)",
              }}
            >
              <Gavel size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight" style={{ color: "var(--ink)" }}>
                Transitional Jurisprudence Live Feed
              </h3>
              <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
                Curated Supreme Court and High Court precedents resolving BNSS/BNS statutory transition ambiguities
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div
              className="flex items-center px-3 py-1.5 rounded-xl border text-xs w-full md:w-64"
              style={{ background: "var(--surface-container)", borderColor: "var(--hairline)" }}
            >
              <Search size={14} className="mr-2 opacity-50 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchAuthorities()}
                placeholder="Search precedents, topics…"
                className="bg-transparent border-none outline-none w-full text-xs"
                style={{ color: "var(--ink)" }}
              />
            </div>
            <button
              onClick={fetchAuthorities}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer hover:opacity-90"
              style={{ background: "var(--surface-raised)", borderColor: "var(--hairline)", color: "var(--ink)" }}
            >
              Filter
            </button>
          </div>
        </div>

        {/* Topic Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {TOPIC_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSelectedTopic(opt.id)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer border"
              style={{
                background: selectedTopic === opt.id ? "var(--brass-soft)" : "transparent",
                color: selectedTopic === opt.id ? "var(--brass-bright)" : "var(--ink-muted)",
                borderColor: selectedTopic === opt.id ? "var(--brass)" : "var(--hairline)",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Precedent Authority Cards ── */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 size={32} className="animate-spin text-amber-500" />
          <div className="text-xs font-medium" style={{ color: "var(--ink-muted)" }}>
            Loading transitional jurisprudence feed…
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center text-xs" style={{ color: "var(--ink-muted)" }}>
          No transitional rulings found matching the selected filter.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-2xl border space-y-3 transition-all hover:border-[var(--brass)]/50"
              style={{
                background: "var(--surface)",
                borderColor: "var(--hairline)",
              }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                      style={{ background: "var(--brass)", color: "#000" }}
                    >
                      {item.court}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-medium border"
                      style={{ background: "var(--surface-container)", borderColor: "var(--hairline)", color: "var(--ink-muted)" }}
                    >
                      {item.topic_category}
                    </span>
                    <span className="text-xs font-mono" style={{ color: "var(--ink-muted)" }}>
                      • {item.decision_date}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold tracking-tight" style={{ color: "var(--ink)" }}>
                    {item.case_title}
                  </h3>
                  <div className="text-xs font-mono font-semibold" style={{ color: "var(--brass-bright)" }}>
                    {item.citation} {item.bench_coram && `• ${item.bench_coram}`}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleCopyPleading(item.id, item.court_pleading_snippet)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer"
                    style={{
                      background: "var(--surface-container)",
                      borderColor: "var(--hairline)",
                      color: "var(--ink)",
                    }}
                    title="Copy court pleading paragraph"
                  >
                    {copiedId === item.id ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                    <span>{copiedId === item.id ? "Copied" : "Copy Court Submission"}</span>
                  </button>

                  {item.source_url && (
                    <a
                      href={item.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg border transition-colors cursor-pointer hover:bg-white/5"
                      style={{ borderColor: "var(--hairline)", color: "var(--ink-muted)" }}
                      title="View judgment"
                    >
                      <ExternalLink size={13} />
                    </a>
                  )}
                </div>
              </div>

              {/* Core Holding */}
              <div
                className="p-3.5 rounded-xl border text-xs leading-relaxed"
                style={{ background: "var(--surface-container)", borderColor: "var(--hairline)", color: "var(--ink)" }}
              >
                <span className="font-bold text-[10px] uppercase tracking-wider text-amber-400 mr-2">
                  Transition Holding:
                </span>
                {item.core_holding}
              </div>

              {/* Ratio Quote */}
              <div
                className="p-3 rounded-lg border text-xs leading-relaxed italic font-serif"
                style={{
                  background: "var(--surface-raised)",
                  borderColor: "rgba(197, 160, 89, 0.2)",
                  borderLeft: "3px solid var(--brass)",
                  color: "var(--ink)",
                }}
              >
                "{item.strategic_ratio_quote}"
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

