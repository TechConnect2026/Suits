import React from "react";
import { Bookmark, RefreshCw, Share2 } from "lucide-react";
import type { CaseDetails } from "@/types/case";
import { StatusBadge } from "@/components/common/StatusBadge";
import { toast } from "sonner";

interface CaseHeaderProps {
  caseData: CaseDetails;
  isBookmarked: boolean;
  onBookmarkToggle: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export function CaseHeader({
  caseData,
  isBookmarked,
  onBookmarkToggle,
  onRefresh,
  isRefreshing = false,
}: CaseHeaderProps) {
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Case link copied to clipboard.");
  };

  return (
    <div className="card-float p-4 sm:p-8 space-y-5 sm:space-y-6 relative overflow-hidden min-w-0 max-w-full break-words" style={{ borderRadius: "var(--radius-md)" }}>
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 sm:gap-6 relative z-10 min-w-0">
        <div className="space-y-3 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={caseData.case_status} label={caseData.case_status_label} />
            {caseData.case_type_label && (
              <span
                className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded"
                style={{
                  background: "var(--surface-container)",
                  color: "var(--ink-faint)",
                  fontFamily: "var(--font-mono)",
                  border: "1px solid var(--hairline-soft)",
                }}
              >
                {caseData.case_type_label}
              </span>
            )}
          </div>

          <h1
            className="text-2xl sm:text-3xl md:text-4xl font-medium tracking-tight break-words"
            style={{ color: "var(--ink)", fontFamily: "var(--font-display)" }}
          >
            {caseData.case_title}
          </h1>
        </div>

        {/* Clean icon-only action buttons (no text clutter) */}
        <div className="flex items-center gap-2 flex-shrink-0 self-start">
          <button
            onClick={onBookmarkToggle}
            className="p-2 sm:p-2.5 rounded-lg transition-colors cursor-pointer"
            style={{
              color: isBookmarked ? "var(--brass)" : "var(--ink-faint)",
              background: isBookmarked ? "var(--brass-soft)" : "transparent",
              border: "1px solid var(--hairline)",
            }}
            title={isBookmarked ? "Saved" : "Save Case"}
            aria-label={isBookmarked ? "Saved" : "Save Case"}
          >
            <Bookmark size={16} fill={isBookmarked ? "currentColor" : "none"} />
          </button>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 sm:p-2.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            style={{
              color: "var(--ink-faint)",
              background: "transparent",
              border: "1px solid var(--hairline)",
            }}
            title="Refresh case data"
            aria-label="Refresh case data"
          >
            <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
          </button>

          <button
            onClick={handleCopyLink}
            className="p-2 sm:p-2.5 rounded-lg transition-colors cursor-pointer"
            style={{
              color: "var(--ink-faint)",
              background: "transparent",
              border: "1px solid var(--hairline)",
            }}
            title="Copy Case Link"
            aria-label="Copy Case Link"
          >
            <Share2 size={16} />
          </button>
        </div>
      </div>

      <div
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 pt-5 sm:pt-6 border-t relative z-10 min-w-0"
        style={{ borderColor: "var(--hairline-soft)" }}
      >
        <div className="min-w-0">
          <span
            className="block text-[11px] font-semibold uppercase tracking-wider mb-1"
            style={{ color: "var(--ink-faint)", fontFamily: "var(--font-mono)" }}
          >
            Court
          </span>
          <span className="text-sm font-medium block break-words" style={{ color: "var(--ink)" }}>
            {caseData.court.court_name || "Unknown"}
          </span>
        </div>
        <div className="min-w-0">
          <span
            className="block text-[11px] font-semibold uppercase tracking-wider mb-1"
            style={{ color: "var(--ink-faint)", fontFamily: "var(--font-mono)" }}
          >
            Case Number
          </span>
          <span className="text-sm font-medium font-mono block break-all" style={{ color: "var(--ink)" }}>
            {caseData.case_number || caseData.cnr || "Unknown"}
          </span>
        </div>
        <div className="min-w-0">
          <span
            className="block text-[11px] font-semibold uppercase tracking-wider mb-1"
            style={{ color: "var(--ink-faint)", fontFamily: "var(--font-mono)" }}
          >
            Next Hearing
          </span>
          <span className="text-sm font-medium block" style={{ color: "var(--ink)" }}>
            {caseData.next_hearing_date || "N/A"}
          </span>
        </div>
        <div className="min-w-0">
          <span
            className="block text-[11px] font-semibold uppercase tracking-wider mb-1"
            style={{ color: "var(--ink-faint)", fontFamily: "var(--font-mono)" }}
          >
            Case Duration
          </span>
          <span className="text-sm font-medium block" style={{ color: "var(--ink)" }}>
            {caseData.case_duration || "N/A"}
          </span>
        </div>
      </div>
    </div>
  );
}
