import React, { useState } from "react";
import {
  Swords,
  Copy,
  Check,
  PlusCircle,
  Scale,
  Shield,
  AlertOctagon,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import type {
  MatrixCategory,
  MatrixRow,
  OppositionMatrixResponse,
} from "@/types/adversarial";

interface OppositionMatrixTableProps {
  data: OppositionMatrixResponse;
  onInjectRebuttal: (rebuttalText: string) => void;
}

export function OppositionMatrixTable({
  data,
  onInjectRebuttal,
}: OppositionMatrixTableProps) {
  const [selectedCategory, setSelectedCategory] = useState<MatrixCategory | "All">("All");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories: (MatrixCategory | "All")[] = [
    "All",
    "Jurisdiction",
    "Limitation",
    "Merits & Evidence",
    "Natural Justice",
    "Statutory Bar",
  ];

  const filteredRows =
    selectedCategory === "All"
      ? data.rows
      : data.rows.filter((r) => r.category === selectedCategory);

  const handleCopy = (row: MatrixRow) => {
    const textToCopy = `REBUTTAL SUBMISSION:\n${row.strategic_rebuttal}\n\nGOVERNING PRECEDENT:\n${row.governing_citation}\nRatio: ${row.ratio_decidendi}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(row.id);
    toast.success("Copied rebuttal and ratio to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleInject = (row: MatrixRow) => {
    const htmlToInsert = `
      <p style="text-indent: 40px; margin-bottom: 12px; text-align: justify;">
        <b>REBUTTAL / REJOINDER SUBMISSION:</b> ${row.strategic_rebuttal}
      </p>
      <p style="margin-left: 40px; margin-bottom: 14px; font-style: italic; color: #333;">
        [<b>Authority:</b> ${row.governing_citation} — <i>${row.ratio_decidendi}</i>]
      </p>
    `;
    onInjectRebuttal(htmlToInsert);
    toast.success("Injected rebuttal into active pleading draft");
  };

  return (
    <div className="space-y-6">
      {/* ── Executive Litigation Briefing ── */}
      <div
        className="p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
        style={{
          background: "var(--surface-container)",
          borderColor: "var(--hairline)",
        }}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded"
              style={{
                background: "var(--brass-soft)",
                color: "var(--brass-bright)",
              }}
            >
              Strategic Assessment
            </span>
            <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
              Posture: <b style={{ color: "var(--ink)" }}>{data.advocate_posture.toUpperCase()}</b>
            </span>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: "var(--ink)" }}>
            {data.executive_summary}
          </p>
        </div>

        <div
          className="px-3 py-2 rounded-lg border text-right shrink-0"
          style={{
            background: "var(--surface-raised)",
            borderColor: "var(--hairline)",
          }}
        >
          <div className="text-[10px] uppercase font-semibold" style={{ color: "var(--brass)" }}>
            Courtroom Resilience
          </div>
          <div className="text-xs font-medium" style={{ color: "var(--ink)" }}>
            {data.overall_strength_assessment}
          </div>
        </div>
      </div>

      {/* ── Category Filter Pills ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => {
          const count =
            cat === "All" ? data.rows.length : data.rows.filter((r) => r.category === cat).length;
          if (count === 0 && cat !== "All") return null;

          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              style={{
                background: isSelected ? "var(--brass)" : "var(--surface-container)",
                color: isSelected ? "#000" : "var(--ink-muted)",
                border: `1px solid ${isSelected ? "var(--brass)" : "var(--hairline)"}`,
              }}
            >
              <span>{cat}</span>
              <span
                className="text-[10px] px-1.5 py-0.2 rounded-full"
                style={{
                  background: isSelected ? "rgba(0,0,0,0.2)" : "var(--surface-raised)",
                  color: isSelected ? "#000" : "var(--brass)",
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── 4-Column Matrix Table Grid ── */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{
          background: "var(--surface)",
          borderColor: "var(--hairline)",
        }}
      >
        <div
          className="hidden lg:grid grid-cols-12 gap-3 px-4 py-3 border-b text-[11px] font-semibold uppercase tracking-wider"
          style={{
            background: "var(--surface-raised)",
            borderColor: "var(--hairline)",
            color: "var(--ink-muted)",
          }}
        >
          <div className="col-span-3 flex items-center gap-1.5">
            <Shield size={13} style={{ color: "var(--brass)" }} />
            <span>Petitioner Ground / Plea</span>
          </div>
          <div className="col-span-3 flex items-center gap-1.5">
            <AlertOctagon size={13} className="text-red-400" />
            <span>Anticipated Opposing Attack</span>
          </div>
          <div className="col-span-3 flex items-center gap-1.5">
            <Swords size={13} style={{ color: "var(--brass-bright)" }} />
            <span>Strategic Rebuttal & Counter</span>
          </div>
          <div className="col-span-3 flex items-center gap-1.5">
            <Scale size={13} style={{ color: "var(--brass)" }} />
            <span>Binding Ratio & Authority</span>
          </div>
        </div>

        <div className="divide-y divide-[var(--hairline)]">
          {filteredRows.map((row) => (
            <div
              key={row.id}
              className="p-4 lg:grid lg:grid-cols-12 lg:gap-3 transition-colors hover:bg-[var(--surface-raised)]/40"
            >
              {/* Col 1: Ground */}
              <div className="lg:col-span-3 mb-3 lg:mb-0 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] font-medium px-2 py-0.5 rounded"
                    style={{
                      background: "var(--surface-container)",
                      color: "var(--brass)",
                      border: "1px solid var(--hairline)",
                    }}
                  >
                    {row.category}
                  </span>
                  <span
                    className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                    style={{
                      background:
                        row.strength_score >= 8
                          ? "rgba(34, 197, 94, 0.15)"
                          : "rgba(234, 179, 8, 0.15)",
                      color: row.strength_score >= 8 ? "#4ade80" : "#facc15",
                    }}
                    title="Rebuttal Strength Score"
                  >
                    Score: {row.strength_score}/10
                  </span>
                </div>
                <div className="text-xs leading-relaxed" style={{ color: "var(--ink)" }}>
                  {row.moving_party_ground}
                </div>
              </div>

              {/* Col 2: Opposing Vector */}
              <div className="lg:col-span-3 mb-3 lg:mb-0 space-y-1.5">
                <div className="lg:hidden text-[10px] font-semibold uppercase text-red-400">
                  Anticipated Opposing Vector:
                </div>
                <div
                  className="text-xs leading-relaxed p-2.5 rounded-lg border text-red-200/90"
                  style={{
                    background: "rgba(239, 68, 68, 0.05)",
                    borderColor: "rgba(239, 68, 68, 0.2)",
                  }}
                >
                  {row.opposing_attack_vector}
                </div>
              </div>

              {/* Col 3: Strategic Rebuttal */}
              <div className="lg:col-span-3 mb-3 lg:mb-0 space-y-2">
                <div className="lg:hidden text-[10px] font-semibold uppercase text-amber-300">
                  Strategic Rebuttal:
                </div>
                <div
                  className="text-xs leading-relaxed p-2.5 rounded-lg border"
                  style={{
                    background: "var(--surface-container)",
                    borderColor: "var(--hairline)",
                    color: "var(--ink)",
                  }}
                >
                  {row.strategic_rebuttal}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(row)}
                    className="flex items-center gap-1 px-2 py-1 rounded text-[11px] transition-colors cursor-pointer"
                    style={{
                      background: "var(--surface-container)",
                      color: "var(--ink-muted)",
                      border: "1px solid var(--hairline)",
                    }}
                    title="Copy rebuttal"
                  >
                    {copiedId === row.id ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                    <span>{copiedId === row.id ? "Copied" : "Copy"}</span>
                  </button>
                  <button
                    onClick={() => handleInject(row)}
                    className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer"
                    style={{
                      background: "var(--brass-soft)",
                      color: "var(--brass-bright)",
                      border: "1px solid var(--hairline)",
                    }}
                    title="Insert into active pleading draft"
                  >
                    <PlusCircle size={12} />
                    <span>Insert into Draft</span>
                  </button>
                </div>
              </div>

              {/* Col 4: Precedent & Ratio */}
              <div className="lg:col-span-3 space-y-1.5">
                <div className="lg:hidden text-[10px] font-semibold uppercase" style={{ color: "var(--brass)" }}>
                  Governing Precedent:
                </div>
                <div
                  className="p-2.5 rounded-lg border text-xs space-y-1.5"
                  style={{
                    background: "var(--surface-container)",
                    borderColor: "var(--hairline)",
                  }}
                >
                  <div className="font-semibold" style={{ color: "var(--brass-bright)" }}>
                    {row.governing_citation}
                  </div>
                  <div className="text-[11px] leading-relaxed italic" style={{ color: "var(--ink-muted)" }}>
                    "{row.ratio_decidendi}"
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

