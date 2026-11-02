import React, { useState, useRef, useEffect } from "react";
import { ArrowUp, Sparkles, Plus, Mic, MicOff, Volume2 } from "lucide-react";
import { useLegalSpeechRecognition } from "@/hooks/useLegalSpeechRecognition";
import { LegalCorrection } from "@/lib/dictation/legalCorrectionEngine";

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  onTogglePrompts?: () => void;
  isPromptsOpen?: boolean;
}

export function ChatInput({
  onSend,
  disabled,
  onTogglePrompts,
  isPromptsOpen,
}: ChatInputProps) {
  const [text, setText] = useState("");
  const [appliedCorrections, setAppliedCorrections] = useState<LegalCorrection[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize Indian Legal Speech Recognition hook
  const {
    isSupported,
    isListening,
    interimText,
    audioLevel,
    startListening,
    stopListening,
  } = useLegalSpeechRecognition({
    enableChime: true,
    onFinalTranscript: (finalText, corrections) => {
      if (finalText.trim()) {
        setText((prev) => {
          const separator = prev.trim() ? " " : "";
          return `${prev.trim()}${separator}${finalText.trim()}`;
        });
      }
      if (corrections && corrections.length > 0) {
        setAppliedCorrections((prev) => [...prev, ...corrections].slice(-6));
      }
    },
  });

  // Dynamic auto-grow from 38px to 160px
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(Math.max(scrollHeight, 38), 160)}px`;
    }
  }, [text, interimText]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isListening) {
      stopListening();
    }
    if (text.trim() && !disabled) {
      onSend(text.trim());
      setText("");
      setAppliedCorrections([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = "38px";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleToggleMic = () => {
    if (isListening) {
      stopListening();
    } else {
      setAppliedCorrections([]);
      startListening();
    }
  };

  return (
    <div className="w-full relative flex flex-col gap-1.5">
      {/* ── Active Dictation Interim Text & Corrections Banner ── */}
      {(isListening || appliedCorrections.length > 0) && (
        <div
          className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl border text-xs animate-in fade-in slide-in-from-bottom-1 duration-150"
          style={{
            background: isListening ? "rgba(196, 164, 84, 0.08)" : "var(--surface-container)",
            borderColor: isListening ? "var(--brass)" : "var(--hairline)",
          }}
        >
          {isListening ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span className="font-semibold text-[11px] shrink-0" style={{ color: "var(--brass)" }}>
                Listening (en-IN):
              </span>
              <span className="italic truncate text-[11px]" style={{ color: "var(--ink)" }}>
                {interimText || "Speak legal pleadings or citations..."}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                ⚡ Indian Lexicon Applied:
              </span>
              {appliedCorrections.map((corr, idx) => (
                <span
                  key={idx}
                  className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                  title={`Spoken: "${corr.original}" → Corrected: "${corr.corrected}"`}
                >
                  {corr.corrected}
                </span>
              ))}
            </div>
          )}

          {isListening && (
            <div className="flex items-center gap-1 text-[10px] font-mono shrink-0" style={{ color: "var(--brass)" }}>
              <Volume2 size={11} className="animate-pulse" />
              <span>{Math.round(audioLevel * 100)}%</span>
            </div>
          )}
        </div>
      )}

      {/* ── Chat Input Container ── */}
      <form
        onSubmit={handleSubmit}
        className="relative flex items-center gap-2 p-1.5 sm:p-2 rounded-2xl border transition-all duration-200 focus-within:ring-2 focus-within:ring-[var(--brass-soft)] focus-within:border-[var(--brass)]"
        style={{
          borderColor: "var(--border)",
          background: "var(--card)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        {/* Quick Prompts '+' Button */}
        {onTogglePrompts && (
          <button
            type="button"
            onClick={onTogglePrompts}
            className="w-9 h-9 rounded-xl flex-shrink-0 transition-colors cursor-pointer flex items-center justify-center self-end"
            style={{
              background: isPromptsOpen ? "var(--brass-soft)" : "var(--surface-container)",
              color: isPromptsOpen ? "var(--brass-bright)" : "var(--ink-dim)",
            }}
            title="Toggle Quick Legal Prompts"
          >
            {isPromptsOpen ? <Sparkles size={16} /> : <Plus size={16} />}
          </button>
        )}

        {/* Multi-line auto-expand textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Ask a legal question, analyze citations, or dictate pleadings (Click Mic or Hold Alt)..."
          className="flex-1 max-h-[160px] min-h-[38px] py-2 px-1.5 text-xs sm:text-[13.5px] resize-none outline-none bg-transparent leading-relaxed"
          style={{ color: "var(--ink)" }}
          rows={1}
        />

        {/* Speech Dictation Mic Button */}
        {isSupported && (
          <button
            type="button"
            onClick={handleToggleMic}
            className={`w-9 h-9 rounded-xl flex-shrink-0 transition-all cursor-pointer flex items-center justify-center self-end ${
              isListening ? "animate-pulse" : ""
            }`}
            style={{
              background: isListening ? "rgba(239, 68, 68, 0.2)" : "var(--surface-container)",
              color: isListening ? "#ef4444" : "var(--brass)",
              border: isListening ? "1px solid rgba(239, 68, 68, 0.5)" : "1px solid transparent",
            }}
            title={isListening ? "Stop Voice Dictation" : "Dictate with Indian Legal Lexicon"}
          >
            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
        )}

        {/* Submit Send Button */}
        <button
          type="submit"
          disabled={!text.trim() || disabled}
          className="w-9 h-9 rounded-xl flex-shrink-0 transition-all disabled:opacity-35 cursor-pointer flex items-center justify-center self-end active:scale-95"
          style={{ background: "var(--brass)", color: "#FFFFFF" }}
          title="Send"
        >
          <ArrowUp size={16} />
        </button>
      </form>
    </div>
  );
}
