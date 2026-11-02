import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  ChevronDown,
  Check,
  Plus,
  Copy,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  exportToActiveDraft,
  createNewDraftFromContent,
  copyFormattedCourtHtml,
  getActiveDraft,
} from "@/services/draftExportService";

interface ExportToDraftButtonProps {
  content: string;
  className?: string;
}

export const ExportToDraftButton: React.FC<ExportToDraftButtonProps> = ({
  content,
  className = "",
}) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [exportedStatus, setExportedStatus] = useState<"idle" | "success">("idle");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeDraft = getActiveDraft();

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

  const handleQuickExport = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsOpen(false);

    const result = exportToActiveDraft(content);
    if (result.success) {
      setExportedStatus("success");
      setTimeout(() => setExportedStatus("idle"), 2500);

      toast.success(`Exported to "${result.draftTitle}"`, {
        description: "Transferred into your active legal document workspace.",
        action: {
          label: "Open Draft",
          onClick: () => navigate("/document"),
        },
      });
    } else {
      toast.error("Failed to export to document workspace");
    }
  };

  const handleCreateNew = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);

    // Derive a clean title from the first line or use default
    const firstLine = content.split("\n")[0]?.replace(/^[#*\-•\s]+/, "").trim();
    const title = firstLine && firstLine.length < 50 ? firstLine : "Synthesized Legal Pleading";

    const newDraft = createNewDraftFromContent(content, title);
    setExportedStatus("success");
    setTimeout(() => setExportedStatus("idle"), 2500);

    toast.success(`Created new draft: "${newDraft.title}"`, {
      description: "Opened new legal pleading in document workspace.",
      action: {
        label: "Open Draft",
        onClick: () => navigate("/document"),
      },
    });
  };

  const handleCopyHtml = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);

    const ok = await copyFormattedCourtHtml(content);
    if (ok) {
      toast.success("Court-formatted HTML copied to clipboard");
    } else {
      toast.error("Failed to copy formatted text");
    }
  };

  return (
    <div className={`relative inline-flex items-center ${className}`} ref={dropdownRef}>
      {/* ── Main Action Button ── */}
      <button
        type="button"
        onClick={handleQuickExport}
        title={`Export directly to "${activeDraft.title}"`}
        className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-l-lg transition-all duration-150 cursor-pointer border-r"
        style={{
          background: exportedStatus === "success" ? "rgba(34, 197, 94, 0.15)" : "var(--surface-container-high)",
          color: exportedStatus === "success" ? "#22c55e" : "var(--brass)",
          borderColor: "var(--hairline)",
        }}
      >
        {exportedStatus === "success" ? (
          <>
            <Check size={12} className="text-emerald-500 animate-in zoom-in" />
            <span className="font-semibold text-emerald-400">Exported to Draft</span>
          </>
        ) : (
          <>
            <FileText size={12} style={{ color: "var(--brass)" }} />
            <span>Export to Active Draft</span>
          </>
        )}
      </button>

      {/* ── Dropdown Chevron Button ── */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        title="More drafting export options"
        className="px-1.5 py-1 text-[11px] rounded-r-lg transition-all duration-150 cursor-pointer flex items-center justify-center"
        style={{
          background: "var(--surface-container-high)",
          color: "var(--brass)",
        }}
      >
        <ChevronDown
          size={11}
          className={`transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* ── Dropdown Menu ── */}
      {isOpen && (
        <div
          className="absolute left-0 bottom-full mb-1.5 w-64 rounded-xl shadow-2xl border p-1 z-50 animate-in fade-in zoom-in-95 duration-100"
          style={{
            background: "var(--surface-raised)",
            borderColor: "var(--hairline)",
            boxShadow: "0 10px 25px -5px rgba(0,0,0,0.45), 0 0 0 1px var(--hairline)",
          }}
        >
          <div className="px-2.5 py-1.5 text-[10px] uppercase font-bold tracking-wider border-b mb-1 flex items-center justify-between" style={{ borderColor: "var(--hairline-soft)", color: "var(--ink-faint)" }}>
            <span>Court Workspace Transfer</span>
            <Sparkles size={11} style={{ color: "var(--brass)" }} />
          </div>

          {/* Option 1: Append to Active Draft */}
          <button
            type="button"
            onClick={handleQuickExport}
            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex flex-col gap-0.5 hover:bg-muted/50 transition-colors cursor-pointer group"
          >
            <div className="flex items-center justify-between font-medium" style={{ color: "var(--ink)" }}>
              <span className="flex items-center gap-1.5">
                <FileText size={12} style={{ color: "var(--brass)" }} />
                Append to Active Draft
              </span>
              <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--ink-dim)" }} />
            </div>
            <span className="text-[10px] truncate pl-4" style={{ color: "var(--ink-dim)" }}>
              {activeDraft.title}
            </span>
          </button>

          {/* Option 2: Create as New Draft */}
          <button
            type="button"
            onClick={handleCreateNew}
            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-2 hover:bg-muted/50 transition-colors cursor-pointer"
            style={{ color: "var(--ink)" }}
          >
            <Plus size={12} className="text-emerald-400" />
            <span>Create as New Pleading Draft</span>
          </button>

          {/* Option 3: Copy Formatted HTML */}
          <button
            type="button"
            onClick={handleCopyHtml}
            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-2 hover:bg-muted/50 transition-colors cursor-pointer"
            style={{ color: "var(--ink)" }}
          >
            <Copy size={12} style={{ color: "var(--ink-dim)" }} />
            <span>Copy Formatted Court HTML</span>
          </button>
        </div>
      )}
    </div>
  );
};

