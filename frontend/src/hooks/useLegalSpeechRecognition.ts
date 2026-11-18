import { useState, useRef, useEffect, useCallback } from "react";
import { correctLegalSpeech, LegalCorrection } from "@/lib/dictation/legalCorrectionEngine";
import { playSiriActivationChime, playSiriDeactivationChime } from "@/lib/dictation/siriChime";
import { chatService } from "@/services/chat";
import { toast } from "sonner";
import "@/types/speech.d.ts";

interface UseLegalSpeechRecognitionOptions {
  onFinalTranscript?: (text: string, corrections: LegalCorrection[]) => void;
  lang?: string;
  enableChime?: boolean;
}

export function useLegalSpeechRecognition({
  onFinalTranscript,
  lang = "en-IN",
  enableChime = true,
}: UseLegalSpeechRecognitionOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [audioLevel, setAudioLevel] = useState(0);
  const [recentCorrections, setRecentCorrections] = useState<LegalCorrection[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Check browser support: supports either Web Speech API OR MediaRecorder + getUserMedia
  const isSupported =
    typeof window !== "undefined" &&
    (!!(window.SpeechRecognition || (window as any).webkitSpeechRecognition) ||
      !!navigator?.mediaDevices?.getUserMedia);

  const recognitionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isExplicitStopRef = useRef<boolean>(false);
  const interimTextRef = useRef<string>("");
  const committedRef = useRef<boolean>(false);
  const useMediaFallbackRef = useRef<boolean>(false);
  const hasReceivedSpeechResultsRef = useRef<boolean>(false);

  // Keep interimTextRef synced
  useEffect(() => {
    interimTextRef.current = interimText;
  }, [interimText]);

  // Clean up AudioContext, MediaRecorder & MediaStream
  const cleanupAudioAnalyser = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (analyserRef.current) {
      try {
        analyserRef.current.disconnect();
      } catch {}
      analyserRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
      mediaRecorderRef.current = null;
    }
    setAudioLevel(0);
  }, []);

  // Initialize Web Audio API Analyser for real-time waveform reactivity
  const startAudioAnalyser = useCallback(async (): Promise<MediaStream | null> => {
    try {
      if (!navigator?.mediaDevices?.getUserMedia) return null;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        audioContextRef.current = ctx;

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.6;
        analyserRef.current = analyser;

        const source = ctx.createMediaStreamSource(stream);
        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const updateVolume = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);

          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const avg = sum / bufferLength;
          // Normalize to 0..1 scale with sensitivity curve
          const normalized = Math.min(Math.max((avg - 10) / 70, 0), 1);
          setAudioLevel(normalized);

          animFrameRef.current = requestAnimationFrame(updateVolume);
        };

        updateVolume();
      }
      return stream;
    } catch (err: any) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setError("Microphone permission was denied. Please allow microphone access in your browser address bar.");
        toast.error("Microphone access blocked. Please click the permissions icon in your browser address bar to allow microphone.");
      } else {
        setError(`Microphone initialization error: ${err.message || err}`);
      }
      cleanupAudioAnalyser();
      return null;
    }
  }, [cleanupAudioAnalyser]);

  const processMediaRecorderTranscription = useCallback(async () => {
    const chunks = audioChunksRef.current;
    if (chunks.length === 0) {
      cleanupAudioAnalyser();
      setIsListening(false);
      setInterimText("");
      return;
    }

    const mimeType = mediaRecorderRef.current?.mimeType || "audio/webm";
    const audioBlob = new Blob(chunks, { type: mimeType });
    audioChunksRef.current = [];

    if (audioBlob.size < 400) {
      cleanupAudioAnalyser();
      setIsListening(false);
      setInterimText("");
      return;
    }

    setIsTranscribing(true);
    setInterimText("Transcribing legal dictation with Gemini AI...");

    try {
      const rawText = await chatService.transcribeAudio(audioBlob);
      if (rawText && rawText.trim()) {
        const { correctedText, corrections } = correctLegalSpeech(rawText.trim());
        if (corrections.length > 0) {
          setRecentCorrections((prev) => [...prev, ...corrections]);
        }
        if (onFinalTranscript) {
          onFinalTranscript(correctedText, corrections);
        }
        toast.success("Voice dictation transcribed successfully");
      } else {
        toast.info("No speech detected. Please speak clearly into your microphone.");
      }
    } catch (err: any) {
      console.error("Audio transcription error:", err);
      toast.error("AI audio transcription failed. Please try again.");
    } finally {
      setIsTranscribing(false);
      setIsListening(false);
      setInterimText("");
      cleanupAudioAnalyser();
    }
  }, [cleanupAudioAnalyser, onFinalTranscript]);

  const stopListening = useCallback(() => {
    isExplicitStopRef.current = true;

    if (enableChime) {
      playSiriDeactivationChime();
    }

    // Stop MediaRecorder if running
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }

    // Stop SpeechRecognition if running
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }

    // If we were using MediaRecorder fallback OR Web Speech API produced no final transcript
    if (useMediaFallbackRef.current || (!hasReceivedSpeechResultsRef.current && audioChunksRef.current.length > 0)) {
      // Small delay to allow the last ondataavailable to fire
      setTimeout(() => {
        processMediaRecorderTranscription();
      }, 250);
      return;
    }

    // If there is uncommitted interim text from Web Speech when stopping, commit it
    const pendingInterim = interimTextRef.current.trim();
    if (pendingInterim && onFinalTranscript && !committedRef.current) {
      const { correctedText, corrections } = correctLegalSpeech(pendingInterim);
      if (corrections.length > 0) {
        setRecentCorrections((prev) => [...prev, ...corrections]);
      }
      committedRef.current = true;
      onFinalTranscript(correctedText, corrections);
      interimTextRef.current = "";
    }

    cleanupAudioAnalyser();
    setIsListening(false);
    setInterimText("");
  }, [cleanupAudioAnalyser, enableChime, onFinalTranscript, processMediaRecorderTranscription]);

  const cancelListening = useCallback(() => {
    isExplicitStopRef.current = true;
    audioChunksRef.current = [];
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    cleanupAudioAnalyser();
    setIsListening(false);
    setIsTranscribing(false);
    setInterimText("");
    setRecentCorrections([]);
  }, [cleanupAudioAnalyser]);

  const startListening = useCallback(async () => {
    if (!isSupported) {
      setError("Audio capture is not supported in this browser.");
      toast.error("Audio recording is not supported in this browser.");
      return;
    }

    setError(null);
    setRecentCorrections([]);
    isExplicitStopRef.current = false;
    interimTextRef.current = "";
    committedRef.current = false;
    useMediaFallbackRef.current = false;
    hasReceivedSpeechResultsRef.current = false;
    audioChunksRef.current = [];

    // Play Siri activation chime
    if (enableChime) {
      playSiriActivationChime();
    }

    // Start Audio Analyser & acquire microphone stream
    const stream = await startAudioAnalyser();
    if (!stream) {
      setIsListening(false);
      return;
    }

    setIsListening(true);

    // Initialize MediaRecorder for guaranteed audio recording fallback
    if (typeof MediaRecorder !== "undefined") {
      try {
        let options: MediaRecorderOptions = {};
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          options = { mimeType: "audio/webm;codecs=opus" };
        } else if (MediaRecorder.isTypeSupported("audio/webm")) {
          options = { mimeType: "audio/webm" };
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          options = { mimeType: "audio/mp4" };
        }

        const recorder = new MediaRecorder(stream, options);
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };
        recorder.start(250);
        mediaRecorderRef.current = recorder;
      } catch (recErr) {
        console.warn("MediaRecorder could not start:", recErr);
      }
    }

    // Try starting Web Speech API for real-time live preview
    const SpeechRecognitionClass = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionClass) {
      try {
        const recognition = new SpeechRecognitionClass();
        recognitionRef.current = recognition;

        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = lang;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          setIsListening(true);
          setError(null);
        };

        recognition.onresult = (event: any) => {
          hasReceivedSpeechResultsRef.current = true;
          let currentInterim = "";

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            const rawTranscript = result[0]?.transcript || "";

            if (result.isFinal) {
              if (committedRef.current) {
                committedRef.current = false;
                interimTextRef.current = "";
                continue;
              }
              const { correctedText, corrections } = correctLegalSpeech(rawTranscript);
              if (corrections.length > 0) {
                setRecentCorrections((prev) => [...prev, ...corrections]);
              }
              if (onFinalTranscript && correctedText.trim()) {
                onFinalTranscript(correctedText.trim(), corrections);
              }
              interimTextRef.current = "";
            } else {
              currentInterim += rawTranscript;
            }
          }

          if (currentInterim.trim()) {
            const { correctedText } = correctLegalSpeech(currentInterim);
            setInterimText(correctedText);
          } else {
            setInterimText("");
          }
        };

        recognition.onerror = (event: any) => {
          const errType = event.error;
          console.warn("Speech recognition notice:", errType);
          if (errType === "no-speech") {
            return;
          }
          if (errType === "network" || errType === "not-allowed" || errType === "service-not-allowed") {
            // Brave Shields or HTTP environment blocks Google speech servers.
            // DO NOT stop listening! MediaRecorder is recording audio for AI transcription.
            useMediaFallbackRef.current = true;
            setInterimText("Listening... (AI Legal Voice Dictation Active)");
            return;
          }
        };

        recognition.onend = () => {
          if (useMediaFallbackRef.current && !isExplicitStopRef.current) {
            // Keep listening via MediaRecorder!
            return;
          }
          if (!useMediaFallbackRef.current && !isExplicitStopRef.current && !hasReceivedSpeechResultsRef.current) {
            // Attempt switch to media recorder fallback
            useMediaFallbackRef.current = true;
            return;
          }
        };

        recognition.start();
      } catch (recErr) {
        console.warn("SpeechRecognition start exception, using AI audio recording fallback:", recErr);
        useMediaFallbackRef.current = true;
        setInterimText("Listening... (AI Legal Voice Dictation Active)");
      }
    } else {
      // Browser does not have Web Speech API (e.g. Firefox) -> pure AI voice recorder
      useMediaFallbackRef.current = true;
      setInterimText("Listening... (AI Legal Voice Dictation Active)");
    }
  }, [isSupported, enableChime, lang, onFinalTranscript, startAudioAnalyser]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      isExplicitStopRef.current = true;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
      cleanupAudioAnalyser();
    };
  }, [cleanupAudioAnalyser]);

  return {
    isSupported,
    isListening,
    isTranscribing,
    interimText,
    audioLevel,
    recentCorrections,
    error,
    startListening,
    stopListening,
    cancelListening,
    toggleListening,
  };
}
