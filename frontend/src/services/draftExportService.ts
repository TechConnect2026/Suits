/**
 * Draft Export Service
 * 
 * Transfers conversational AI syntheses (legal grounds, precedents, prayer clauses, 
 * quashing arguments, statutory comparisons) directly into active court drafts.
 * 
 * Supports:
 * 1. Live DOM insertion into mounted `LegalEditor` via `suits:insert-into-draft` event.
 * 2. Background synchronization with `localStorage` (`suits_legal_drafts_v1`).
 * 3. Court-formatted HTML conversion adhering to Indian High Court & Supreme Court standards.
 * 4. Creation of new drafts from synthesized AI arguments.
 */

export interface DraftItem {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
}

const STORAGE_KEY = "suits_legal_drafts_v1";

const DEFAULT_SAMPLE_DRAFT: DraftItem = {
  id: "draft-1",
  title: "Writ Petition (Civil) — High Court",
  updatedAt: new Date().toISOString(),
  content: `
    <div style="text-align: center; font-weight: bold; margin-bottom: 20px;">
      <p style="margin: 0; font-size: 1.15em; letter-spacing: 0.04em;">IN THE HIGH COURT OF DELHI AT NEW DELHI</p>
      <p style="margin: 4px 0 0 0; font-size: 0.9em; font-style: italic; font-weight: normal;">(EXTRAORDINARY ORIGINAL WRIT JURISDICTION)</p>
      <p style="margin: 12px 0 0 0; font-size: 1.05em;">WRIT PETITION (CIVIL) NO. _________ OF 2026</p>
    </div>
  `,
};

/**
 * Converts conversational Markdown into court-ready HTML
 * with Bookman Old Style typography, justified paragraphs,
 * and high-contrast court blockquote ratios.
 */
export function markdownToCourtHtml(markdown: string, sectionHeading?: string): string {
  if (!markdown || !markdown.trim()) return "<p><br></p>";

  const lines = markdown.split(/\r?\n/);
  const htmlParts: string[] = [];

  if (sectionHeading) {
    htmlParts.push(
      `<div class="court-exported-heading" style="text-align: center; font-weight: bold; font-size: 1.05em; letter-spacing: 0.05em; margin: 22px 0 12px 0; text-decoration: underline;">` +
        `${sectionHeading.toUpperCase()}` +
      `</div>`
    );
  }

  let inList = false;
  let inBlockquote = false;
  let blockquoteBuffer: string[] = [];

  const flushBlockquote = () => {
    if (inBlockquote && blockquoteBuffer.length > 0) {
      htmlParts.push(
        `<blockquote class="court-precedent-quote" style="border-left: 3.5px solid #C4A454; margin: 12px 18px; padding: 6px 14px; font-style: italic; background: rgba(196, 164, 84, 0.07); border-radius: 0 4px 4px 0; line-height: 1.6; text-align: justify;">` +
          blockquoteBuffer.join("<br/>") +
        `</blockquote>`
      );
      blockquoteBuffer = [];
      inBlockquote = false;
    }
  };

  const inlineFormat = (text: string): string => {
    return text
      // Bold **text**
      .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
      // Italic *text* or _text_
      .replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, "<i>$1</i>")
      .replace(/(?<!_)_(?!_)(.*?)(?<!_)_(?!_)/g, "<i>$1</i>")
      // Inline code `code`
      .replace(/`([^`]+)`/g, '<span style="font-family: monospace; background: rgba(0,0,0,0.06); padding: 1px 4px; border-radius: 3px;">$1</span>');
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) {
      flushBlockquote();
      if (inList) inList = false;
      continue;
    }

    // Markdown blockquote: > Quote
    if (line.startsWith(">")) {
      inBlockquote = true;
      blockquoteBuffer.push(inlineFormat(line.replace(/^>\s*/, "")));
      continue;
    } else {
      flushBlockquote();
    }

    // Headings: #, ##, ###
    if (line.startsWith("### ")) {
      htmlParts.push(
        `<div class="court-subheading" style="font-weight: bold; margin: 16px 0 8px 0; font-size: 0.98em; letter-spacing: 0.02em;">` +
          `${inlineFormat(line.replace(/^###\s*/, ""))}` +
        `</div>`
      );
    } else if (line.startsWith("## ")) {
      htmlParts.push(
        `<div class="court-heading" style="text-align: center; font-weight: bold; margin: 20px 0 10px 0; font-size: 1.05em; letter-spacing: 0.05em; text-decoration: underline;">` +
          `${inlineFormat(line.replace(/^##\s*/, "")).toUpperCase()}` +
        `</div>`
      );
    } else if (line.startsWith("# ")) {
      htmlParts.push(
        `<div class="court-main-heading" style="text-align: center; font-weight: bold; margin: 24px 0 14px 0; font-size: 1.15em; letter-spacing: 0.06em;">` +
          `${inlineFormat(line.replace(/^#\s*/, "")).toUpperCase()}` +
        `</div>`
      );
    }
    // Numbered list: 1. , (a), (i)
    else if (/^(?:\d+[\.\)]|\([a-zA-Z0-9]+\))\s+/.test(line)) {
      const match = line.match(/^((?:\d+[\.\)]|\([a-zA-Z0-9]+\)))\s+(.*)$/);
      if (match) {
        const num = match[1];
        const rest = match[2];
        htmlParts.push(
          `<p class="court-numbered-item" style="text-align: justify; text-indent: 24px; margin-bottom: 8px; line-height: 1.6;">` +
            `<b>${num}</b> ${inlineFormat(rest)}` +
          `</p>`
        );
      }
    }
    // Bullet list: - or *
    else if (/^[-*•]\s+/.test(line)) {
      const itemText = line.replace(/^[-*•]\s+/, "");
      htmlParts.push(
        `<p class="court-bullet-item" style="text-align: justify; margin-left: 28px; margin-bottom: 8px; line-height: 1.6;">` +
          `• ${inlineFormat(itemText)}` +
        `</p>`
      );
    }
    // Standard Pleading Paragraph
    else {
      htmlParts.push(
        `<p class="court-pleading-para" style="text-align: justify; text-indent: 36px; margin-bottom: 12px; line-height: 1.6;">` +
          `${inlineFormat(line)}` +
        `</p>`
      );
    }
  }

  flushBlockquote();

  return (
    `<div class="court-ai-synthesized-block my-4" data-source="suits-ai-export" style="border-top: 1px dashed rgba(196, 164, 84, 0.4); padding-top: 14px; margin-top: 18px;">` +
      htmlParts.join("\n") +
    `</div>`
  );
}

/**
 * Retrieve all saved drafts from localStorage
 */
export function getAllDrafts(): DraftItem[] {
  if (typeof window === "undefined") return [DEFAULT_SAMPLE_DRAFT];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("Failed to load drafts from localStorage:", err);
  }
  return [DEFAULT_SAMPLE_DRAFT];
}

/**
 * Retrieve the active draft or default
 */
export function getActiveDraft(): DraftItem {
  const drafts = getAllDrafts();
  return drafts[0] || DEFAULT_SAMPLE_DRAFT;
}

/**
 * Export synthesized markdown content to the active court draft.
 * 
 * 1. Always dispatches `suits:insert-into-draft` so if a user has `LegalEditor`
 *    mounted (e.g. on `/document`), it inserts live into the document canvas.
 * 2. Updates `localStorage` `suits_legal_drafts_v1` so the content is preserved
 *    even when the user is on `/chat` and navigates to `/document` later.
 */
export function exportToActiveDraft(
  markdown: string,
  options: {
    targetDraftId?: string;
    sectionHeading?: string;
  } = {}
): {
  success: boolean;
  draftId: string;
  draftTitle: string;
} {
  const courtHtml = markdownToCourtHtml(markdown, options.sectionHeading);
  const drafts = getAllDrafts();

  const targetId = options.targetDraftId || drafts[0]?.id || "draft-1";
  const targetDraft = drafts.find((d) => d.id === targetId) || drafts[0];

  // 1. Dispatch custom DOM event for live editor if mounted
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(
        new CustomEvent("suits:insert-into-draft", {
          detail: {
            html: courtHtml,
            markdown,
            draftId: targetDraft.id,
          },
        })
      );
    } catch {
      // ignore
    }
  }

  // 2. Persist to localStorage
  try {
    const updatedDrafts = drafts.map((draft) => {
      if (draft.id === targetDraft.id) {
        return {
          ...draft,
          content: draft.content ? `${draft.content}\n${courtHtml}` : courtHtml,
          updatedAt: new Date().toISOString(),
        };
      }
      return draft;
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedDrafts));
    window.dispatchEvent(new CustomEvent("suits:drafts-updated"));
  } catch (err) {
    console.error("Failed to update draft in localStorage:", err);
    return {
      success: false,
      draftId: targetDraft.id,
      draftTitle: targetDraft.title,
    };
  }

  return {
    success: true,
    draftId: targetDraft.id,
    draftTitle: targetDraft.title,
  };
}

/**
 * Creates a brand new draft containing the synthesized legal argument.
 */
export function createNewDraftFromContent(
  markdown: string,
  suggestedTitle: string = "Synthesized Legal Grounds"
): DraftItem {
  const courtHtml = markdownToCourtHtml(markdown, suggestedTitle);
  const drafts = getAllDrafts();

  const newDraft: DraftItem = {
    id: `draft-${Date.now()}`,
    title: suggestedTitle,
    content: `
      <div style="text-align: center; font-weight: bold; margin-bottom: 20px;">
        <p style="margin: 0; font-size: 1.15em; letter-spacing: 0.04em;">IN THE HON'BLE COURT AT NEW DELHI</p>
        <p style="margin: 4px 0 0 0; font-size: 0.9em; font-style: italic;">EXTRAORDINARY JURISDICTION</p>
      </div>
      ${courtHtml}
    `,
    updatedAt: new Date().toISOString(),
  };

  try {
    const updated = [newDraft, ...drafts];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("suits:drafts-updated"));
  } catch (err) {
    console.error("Failed to save new draft:", err);
  }

  return newDraft;
}

/**
 * Copies formatted court HTML to clipboard
 */
export async function copyFormattedCourtHtml(markdown: string): Promise<boolean> {
  try {
    const courtHtml = markdownToCourtHtml(markdown);
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(courtHtml);
      return true;
    }
  } catch {
    // fallback
  }
  return false;
}

