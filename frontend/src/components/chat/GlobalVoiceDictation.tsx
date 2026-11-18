import { useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useLegalSpeechRecognition } from "@/hooks/useLegalSpeechRecognition";
import { SiriLegalVisualizer } from "./SiriLegalVisualizer";
import { useDictationStore } from "@/store/dictation-store";
import { LegalCorrection } from "@/lib/dictation/legalCorrectionEngine";

export function GlobalVoiceDictation() {
  const location = useLocation();
  const navigate = useNavigate();

  const {
    caseQueryHandler,
    setPendingFullScreenPrompt,
    setIsDictating,
    setAudioLevel: setStoreAudioLevel,
    setInterimText: setStoreInterimText,
    addRecentCorrections,
  } = useDictationStore();

  const locationRef = useRef(location);

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  // Handle finalized transcription
  const handleFinalTranscript = useCallback(
    (text: string, corrections: LegalCorrection[]) => {
      const query = text.trim();
      if (!query) return;

      if (corrections.length > 0) {
        addRecentCorrections(corrections);
      }

      const currentPath = locationRef.current.pathname;

      // Scenario A: User is currently on an open case dashboard (/case/:cnr)
      if (currentPath.startsWith("/case/")) {
        const handler = useDictationStore.getState().caseQueryHandler;
        if (handler) {
          // Open mini-form chatbot and stream AI response immediately
          handler(query);
          return;
        }
      }

      // Scenario B: User has not opened any case (/dashboard, /search, /research, etc.)
      // Navigate to full-screen legal chat and stream AI response immediately
      setPendingFullScreenPrompt(query);
      navigate("/chat", { state: { autoPrompt: query } });
    },
    [addRecentCorrections, navigate, setPendingFullScreenPrompt]
  );

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
    onFinalTranscript: handleFinalTranscript,
    enableChime: true,
  });

  const setIsTranscribing = useDictationStore((s) => s.setIsTranscribing);

  useEffect(() => {
    setIsTranscribing(isTranscribing);
  }, [isTranscribing, setIsTranscribing]);

  // Sync state to store
  useEffect(() => {
    setIsDictating(isListening);
  }, [isListening, setIsDictating]);

  useEffect(() => {
    setStoreAudioLevel(audioLevel);
  }, [audioLevel, setStoreAudioLevel]);

  useEffect(() => {
    setStoreInterimText(interimText);
  }, [interimText, setStoreInterimText]);

  // Global Alt+Z toggle listener (Esc to cancel) across entire application
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key.toLowerCase() === "z" || e.code === "KeyZ")) {
        e.preventDefault();
        if (e.repeat) return;

        if (!isSupported) return;
        if (isListening) {
          stopListening();
        } else {
          startListening();
        }
        return;
      }

      if (e.key === "Escape" && isListening) {
        e.preventDefault();
        cancelListening();
      }
    };

    const handleWindowBlur = () => {
      if (isListening) {
        cancelListening();
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [isListening, isSupported, startListening, stopListening, cancelListening]);

  return (
    <SiriLegalVisualizer
      isListening={isListening}
      audioLevel={audioLevel}
      interimText={interimText}
    />
  );
}
