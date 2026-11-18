import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Bookmark, BookOpen, FileUp, Library } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import BookmarksPage from "./BookmarksPage";
import ResearchPage from "./ResearchPage";
import FilesPage from "./FilesPage";
import { bookmarkService } from "@/services/bookmarks";
import { fileService } from "@/services/files";
import { documentService } from "@/services/document";

type VaultTab = "bookmarks" | "judgments" | "documents";

const VALID_TABS: VaultTab[] = ["bookmarks", "judgments", "documents"];

export default function VaultPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab") as VaultTab | null;
  const activeTab: VaultTab = rawTab && VALID_TABS.includes(rawTab) ? rawTab : "bookmarks";

  const [counts, setCounts] = useState<{
    bookmarks: number | null;
    judgments: number | null;
    documents: number | null;
  }>({
    bookmarks: null,
    judgments: null,
    documents: null,
  });

  // Preload live badge counts across all 3 vault collections in parallel
  useEffect(() => {
    let mounted = true;
    Promise.allSettled([
      bookmarkService.list(),
      fileService.list(),
      documentService.list(),
    ]).then(([bmRes, fileRes, docRes]) => {
      if (!mounted) return;
      setCounts({
        bookmarks: bmRes.status === "fulfilled" && Array.isArray(bmRes.value) ? bmRes.value.length : 0,
        judgments:
          fileRes.status === "fulfilled" && Array.isArray(fileRes.value?.items)
            ? fileRes.value.items.length
            : 0,
        documents: docRes.status === "fulfilled" && Array.isArray(docRes.value) ? docRes.value.length : 0,
      });
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleSelectTab = (tab: VaultTab) => {
    setSearchParams({ tab }, { replace: true });
  };

  const handleBookmarksCount = useCallback((count: number) => {
    setCounts((prev) => (prev.bookmarks === count ? prev : { ...prev, bookmarks: count }));
  }, []);

  const handleJudgmentsCount = useCallback((count: number) => {
    setCounts((prev) => (prev.judgments === count ? prev : { ...prev, judgments: count }));
  }, []);

  const handleDocumentsCount = useCallback((count: number) => {
    setCounts((prev) => (prev.documents === count ? prev : { ...prev, documents: count }));
  }, []);

  const tabs: { id: VaultTab; label: string; shortLabel: string; icon: React.ReactNode; count: number | null }[] = [
    {
      id: "bookmarks",
      label: "Bookmarked Cases",
      shortLabel: "Bookmarks",
      icon: <Bookmark size={15} />,
      count: counts.bookmarks,
    },
    {
      id: "judgments",
      label: "Saved Judgments & Briefs",
      shortLabel: "Judgments",
      icon: <BookOpen size={15} />,
      count: counts.judgments,
    },
    {
      id: "documents",
      label: "Uploaded Files & Evidence",
      shortLabel: "Documents",
      icon: <FileUp size={15} />,
      count: counts.documents,
    },
  ];

  return (
    <div className="dashboard-layout mt-4 sm:mt-8 w-full max-w-full pb-16">
      {/* ── Unified Library & Vault Header ── */}
      <div
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 mb-6 border-b"
        style={{ borderColor: "var(--hairline)" }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
            style={{
              background: "var(--brass-soft)",
              color: "var(--brass-bright)",
              borderColor: "var(--hairline)",
            }}
          >
            <Library size={20} />
          </div>
          <div>
            <h1
              className="text-2xl font-medium tracking-tight"
              style={{ color: "var(--ink)", fontFamily: "var(--font-display)" }}
            >
              Library &amp; Research Vault
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--ink-faint)" }}>
              All bookmarked case dockets, saved Kanoon judgments, research briefs, and uploaded evidence in one unified vault.
            </p>
          </div>
        </div>

        {/* ── Segmented Pill Tab Switcher ── */}
        <div
          className="inline-flex items-center p-1 rounded-xl border self-start lg:self-auto overflow-x-auto max-w-full"
          style={{
            background: "var(--surface-container)",
            borderColor: "var(--hairline)",
          }}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleSelectTab(tab.id)}
                className="relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap"
                style={{
                  color: isActive ? "var(--brass-bright)" : "var(--ink-muted)",
                  background: isActive ? "var(--surface)" : "transparent",
                  boxShadow: isActive ? "0 1px 4px rgba(0,0,0,0.18)" : "none",
                }}
              >
                <span className="shrink-0">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>
                {tab.count !== null && (
                  <span
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded-full"
                    style={{
                      background: isActive ? "var(--brass-soft)" : "var(--surface-raised)",
                      color: isActive ? "var(--brass-bright)" : "var(--ink-faint)",
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Active Tab Panel ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === "bookmarks" && (
            <BookmarksPage embedded onCountChange={handleBookmarksCount} />
          )}
          {activeTab === "judgments" && (
            <ResearchPage embedded onCountChange={handleJudgmentsCount} />
          )}
          {activeTab === "documents" && (
            <FilesPage embedded onCountChange={handleDocumentsCount} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
