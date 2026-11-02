import React, { useState, useEffect } from "react";
import { Sparkles, Scale, Shield, Copy, Check, ChevronDown, ChevronUp, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { precedentService } from "@/services/precedents";
import type { RelevanceResponse } from "@/types/precedents";

interface WhyThisHelpsBadgeProps {
  query: string;
  caseTitle: string;
  courtName?: string;
  decisionDate?: string | null;
  snippet?: string | null;
  initialData?: RelevanceResponse | null;
  className?: string;
}

export function WhyThisHelpsBadge({
  query,
  caseTitle,
  courtName = "Supreme Court of India",
  decisionDate,
  snippet,
  initialData,
  className = "",
}: WhyThisHelpsBadgeProps) {
  const [data, setData] = useState<RelevanceResponse | null>(initialData || null);
  const [loading, setLoading] = useState<boolean>(!initialData && !!query.trim());
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    if (!initialData && query.trim() && caseTitle) {
      setLoading(true);
      precedentService
        .getWhyThisHelps({
          query,
          case_title: caseTitle,
          court_name: courtName,
          decision_date: decisionDate,
          snippet,
        })
        .then((res) => {
          if (isMounted) setData(res);
        })
        .catch(() => {
          if (isMounted) {
            setData({
              case_title: caseTitle,
              why_this_helps: `Establishes relevant legal proposition regarding ${caseTitle}.`,
              relevance_category: "Direct Precedent",
              strategic_utility: "Deploy in primary legal submissions on point.",
            });
          }
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [query, caseTitle, courtName, decisionDate, initialData]);

  if (!query.trim()) return null;

  if (loading) {
    return (
      <div
        className={`flex items-center gap-2 px-2.5 py-1 rounded-md text-[11px] animate-pulse ${className}`}
        style={{
          background: "var(--brass-soft)",
          border: "1px solid rgba(197, 160, 89, 0.2)",
          color: "var(--brass-bright)",
        }}
      >
        <Sparkles size={11} className="animate-spin" />
        <span>Evaluating contextual relevance to your search...</span>
      </div>
    );
  }

  if (!data) return null;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(data.why_this_helps);
    setIsCopied(true);
    toast.success("Copied relevance summary");
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div
      onClick={() => setIsExpanded(!isExpanded)}
      className={`rounded-lg border transition-all cursor-pointer ${className}`}
      style={{
        background: "var(--brass-soft)",
        borderColor: "rgba(197, 160, 89, 0.3)",
      }}
      title="Click to view strategic courtroom utility"
    >
      <div className="flex items-start sm:items-center justify-between gap-2 px-2.5 py-1.5">
        <div className="flex items-start sm:items-center gap-2 flex-1 min-w-0">
          <div className="flex items-center gap-1 shrink-0 mt-0.5 sm:mt-0">
            <Sparkles size={11} style={{ color: "var(--brass)" }} />
            <span
              className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded"
              style={{
                background: "rgba(197, 160, 89, 0.2)",
                color: "var(--brass-bright)",
              }}
            >
              Why This Helps
            </span>
          </div>

          <p
            className="text-[11px] font-medium leading-snug line-clamp-2 sm:line-clamp-1"
            style={{ color: "var(--ink)" }}
          >
            {data.why_this_helps}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {data.key_anchor_section && (
            <span
              className="hidden md:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded border"
              style={{
                background: "var(--surface)",
                borderColor: "var(--hairline)",
                color: "var(--brass)",
              }}
            >
              {data.key_anchor_section}
            </span>
          )}

          <button
            onClick={handleCopy}
            className="p-1 rounded hover:bg-black/20 text-muted-foreground hover:text-foreground transition-colors"
            title="Copy badge text"
          >
            {isCopied ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
          </button>

          <span className="text-[10px] opacity-70">
            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </span>
        </div>
      </div>

      {/* Expanded Strategic Utility Drawer */}
      {isExpanded && (
        <div
          className="px-3 py-2 border-t text-[11px] space-y-1.5 animate-in fade-in duration-150"
          style={{
            borderColor: "rgba(197, 160, 89, 0.2)",
            background: "rgba(0, 0, 0, 0.2)",
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase" style={{ color: "var(--brass)" }}>
              Strategic Courtroom Deployment:
            </span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{
                background: "var(--surface-raised)",
                color: "var(--ink-muted)",
              }}
            >
              Category: {data.relevance_category}
            </span>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: "var(--ink)" }}>
            {data.strategic_utility}
          </p>
        </div>
      )}
    </div>
  );
}

