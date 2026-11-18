import React, { useState, useRef, useEffect } from "react";
import { ArrowUp, Sparkles, Plus, Mic, MicOff, Loader2 } from "lucide-react";
import { useLegalSpeechRecognition } from "@/hooks/useLegalSpeechRecognition";
import { LegalCorrection } from "@/lib/dictation/legalCorrectionEngine";
import { LegalWaveformVisualizer } from "./LegalWaveformVisualizer";

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
    isTranscribing,
    interimText,
    audioLevel,
    startListening,
    stopListening,
    cancelListening,
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

  // Allow Escape key to cancel active inline dictation
  useEffect(() => {
    if (!isListening) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cancelListening();
      }
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [isListening, cancelListening]);

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
      {/* ── Active Inline Legal Waveform Dictation Visualizer ── */}
      <LegalWaveformVisualizer
        isListening={isListening}
        audioLevel={audioLevel}
        interimText={interimText}
        recentCorrections={appliedCorrections}
        onStop={stopListening}
        onCancel={cancelListening}
      />

      {/* ── Post-Dictation Indian Legal Lexicon Applied Pill Bar ── */}
      {!isListening && appliedCorrections.length > 0 && (
        <div
          className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl border text-xs animate-in fade-in slide-in-from-bottom-1 duration-150"
          style={{
            background: "var(--surface-container)",
            borderColor: "var(--hairline)",
          }}
        >
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
          placeholder="Ask a legal question, analyze citations, or dictate pleadings (Click Mic or Press Alt+Z)..."
          className="flex-1 max-h-[160px] min-h-[38px] py-2 px-1.5 text-xs sm:text-[13.5px] resize-none outline-none bg-transparent leading-relaxed"
          style={{ color: "var(--ink)" }}
          rows={1}
        />

        {/* Speech Dictation Mic Button */}
        {isSupported && (
          <button
            type="button"
            onClick={handleToggleMic}
            disabled={isTranscribing}
            className={`w-9 h-9 rounded-xl flex-shrink-0 transition-all cursor-pointer flex items-center justify-center self-end ${
              isListening ? "animate-pulse" : ""
            }`}
            style={{
              background: isListening
                ? "rgba(239, 68, 68, 0.2)"
                : isTranscribing
                ? "rgba(245, 158, 11, 0.15)"
                : "var(--surface-container)",
              color: isListening
                ? "#ef4444"
                : isTranscribing
                ? "#f59e0b"
                : "var(--brass)",
              border: isListening
                ? "1px solid rgba(239, 68, 68, 0.5)"
                : isTranscribing
                ? "1px solid rgba(245, 158, 11, 0.4)"
                : "1px solid transparent",
            }}
            title={
              isTranscribing
                ? "Transcribing voice with Gemini AI..."
                : isListening
                ? "Listening... Click to finish speaking or press Alt+Z"
                : "Voice Dictation: Click to speak or press Alt+Z"
            }
          >
            {isTranscribing ? (
              <Loader2 size={16} className="animate-spin text-amber-500" />
            ) : isListening ? (
              <MicOff size={16} />
            ) : (
              <Mic size={16} />
            )}
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
