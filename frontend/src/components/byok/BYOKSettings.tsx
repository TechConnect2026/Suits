import React, { useState, useEffect } from "react";
import {
  Key,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Eye,
  EyeOff,
  Trash2,
  RefreshCw,
  Zap,
  Cpu,
  X,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  apiKeysService,
  AIProvider,
  ApiKeyItem,
  TestApiKeyResult,
} from "@/services/apiKeys";

type SupportedProvider = "gemini" | "claude" | "openai" | "openrouter";

interface ProviderMeta {
  id: SupportedProvider;
  name: string;
  tagline: string;
  consoleUrl: string;
  consoleName: string;
  recommendedModel: string;
  availableModels: string[];
  keyPrefixHint: string;
  brandColor: string;
  brandBg: string;
  steps: { text: string; link?: string; linkText?: string }[];
}

const PROVIDERS: Record<SupportedProvider, ProviderMeta> = {
  gemini: {
    id: "gemini",
    name: "Google Gemini",
    tagline: "High-speed document analysis & legal reasoning",
    consoleUrl: "https://aistudio.google.com/app/apikey",
    consoleName: "Google AI Studio",
    recommendedModel: "gemini-3.1-flash-lite",
    availableModels: [
      "gemini-3.1-flash-lite",
      "gemini-3.5-flash-lite",
      "gemini-flash-latest",
      "gemini-3.1-flash-lite-preview",
      "gemini-3.1-pro-preview",
    ],
    keyPrefixHint: "Starts with AQ... or AIzaSy...",
    brandColor: "#4285F4",
    brandBg: "rgba(66, 133, 244, 0.12)",
    steps: [
      {
        text: "Open Google AI Studio with your Google account.",
        link: "https://aistudio.google.com/app/apikey",
        linkText: "Open AI Studio",
      },
      {
        text: "Click 'Create API key' (choose 'Create API key in new project' for free tier).",
      },
      {
        text: "Copy your key and paste it in the box below.",
      },
    ],
  },
  claude: {
    id: "claude",
    name: "Anthropic Claude",
    tagline: "Superior statutory interpretation & legal drafting precision",
    consoleUrl: "https://console.anthropic.com/settings/keys",
    consoleName: "Anthropic Console",
    recommendedModel: "claude-3-7-sonnet-20250219",
    availableModels: [
      "claude-3-7-sonnet-20250219",
      "claude-3-5-sonnet-20241022",
      "claude-3-5-haiku-20241022",
    ],
    keyPrefixHint: "Starts with sk-ant-api03-...",
    brandColor: "#D97706",
    brandBg: "rgba(217, 119, 6, 0.12)",
    steps: [
      {
        text: "Sign in to the Anthropic Console.",
        link: "https://console.anthropic.com/settings/keys",
        linkText: "Open Anthropic Console",
      },
      {
        text: "Click 'Create Key' and label it 'SUITS'.",
      },
      {
        text: "Copy the key and paste it in the box below.",
      },
    ],
  },
  openai: {
    id: "openai",
    name: "OpenAI",
    tagline: "GPT-4o, GPT-4o-mini & reasoning models",
    consoleUrl: "https://platform.openai.com/api-keys",
    consoleName: "OpenAI Platform",
    recommendedModel: "gpt-4o-mini",
    availableModels: ["gpt-4o-mini", "gpt-4o", "o3-mini"],
    keyPrefixHint: "Starts with sk-proj-...",
    brandColor: "#10A37F",
    brandBg: "rgba(16, 163, 127, 0.12)",
    steps: [
      {
        text: "Sign in to the OpenAI Developer Platform.",
        link: "https://platform.openai.com/api-keys",
        linkText: "Open OpenAI Platform",
      },
      {
        text: "Click '+ Create new secret key'.",
      },
      {
        text: "Copy the secret key and paste it in the box below.",
      },
    ],
  },
  openrouter: {
    id: "openrouter",
    name: "OpenRouter",
    tagline: "Access 300+ AI models using one single key",
    consoleUrl: "https://openrouter.ai/keys",
    consoleName: "OpenRouter",
    recommendedModel: "openrouter/auto",
    availableModels: [
      "openrouter/auto",
      "google/gemini-2.0-flash-001",
      "meta-llama/llama-3.3-70b-instruct",
      "anthropic/claude-3.5-haiku",
    ],
    keyPrefixHint: "Starts with sk-or-v1-...",
    brandColor: "#6366F1",
    brandBg: "rgba(99, 102, 241, 0.12)",
    steps: [
      {
        text: "Sign in to OpenRouter with your Google or GitHub account.",
        link: "https://openrouter.ai/keys",
        linkText: "Open OpenRouter Keys",
      },
      {
        text: "Click 'Create Key' and name it 'SUITS'.",
      },
      {
        text: "Copy the key and paste it in the box below.",
      },
    ],
  },
};

const PROVIDER_ORDER: SupportedProvider[] = ["gemini", "claude", "openai", "openrouter"];

export default function BYOKSettings() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [activeModalProvider, setActiveModalProvider] = useState<SupportedProvider | null>(null);
  const [inputKey, setInputKey] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [showKeyText, setShowKeyText] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestApiKeyResult | null>(null);

  const fetchKeys = async () => {
    try {
      setIsLoading(true);
      const data = await apiKeysService.listKeys();
      setKeys(data);
    } catch (err: any) {
      console.error("Failed to load API keys:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  // Listen to Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && activeModalProvider) {
        handleCloseModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeModalProvider]);

  const activeKey = keys.find((k) => k.is_active);

  const handleOpenModal = (providerId: SupportedProvider) => {
    const pMeta = PROVIDERS[providerId];
    const existing = keys.find((k) => k.provider === providerId);
    setActiveModalProvider(providerId);
    setSelectedModel(existing?.model_preference || pMeta.recommendedModel);
    setInputKey("");
    setShowKeyText(false);
    setTestResult(null);
  };

  const handleCloseModal = () => {
    setActiveModalProvider(null);
    setInputKey("");
    setTestResult(null);
  };

  // Test connection in modal
  const handleTestKey = async () => {
    if (!activeModalProvider) return;
    if (!inputKey.trim()) {
      toast.error("Please paste an API key to test.");
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await apiKeysService.testKey({
        provider: activeModalProvider as AIProvider,
        api_key: inputKey.trim(),
        model: selectedModel,
      });
      setTestResult(res);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Test failed.";
      setTestResult({
        success: false,
        message: msg,
        provider: activeModalProvider,
      });
      toast.error(msg);
    } finally {
      setIsTesting(false);
    }
  };

  // Save key from modal
  const handleSaveKey = async (setActive = true) => {
    if (!activeModalProvider) return;
    if (!inputKey.trim()) {
      toast.error("Please paste an API key first.");
      return;
    }
    setIsSaving(true);
    try {
      await apiKeysService.addKey({
        provider: activeModalProvider as AIProvider,
        api_key: inputKey.trim(),
        model_preference: selectedModel,
        set_active: setActive,
      });
      toast.success(
        `${PROVIDERS[activeModalProvider].name} key saved ${setActive ? "& activated" : ""}.`
      );
      handleCloseModal();
      await fetchKeys();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to save key.";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Activate existing key
  const handleActivate = async (keyId: string, providerName: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await apiKeysService.activateKey(keyId);
      toast.success(`Active AI switched to ${providerName}.`);
      await fetchKeys();
    } catch (err: any) {
      toast.error("Failed to activate key.");
    }
  };

  // Switch to Platform Default AI
  const handleDeactivateAll = async () => {
    try {
      await apiKeysService.deactivateAll();
      toast.success("Switched to SUITS Platform AI (Default).");
      await fetchKeys();
    } catch (err: any) {
      toast.error("Failed to switch to Platform AI.");
    }
  };

  // Delete key
  const handleDelete = async (keyId: string, providerName: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!confirm(`Are you sure you want to remove your ${providerName} API key?`)) {
      return;
    }
    try {
      await apiKeysService.deleteKey(keyId);
      toast.success(`${providerName} key removed.`);
      if (activeModalProvider) {
        handleCloseModal();
      }
      await fetchKeys();
    } catch (err: any) {
      toast.error("Failed to delete key.");
    }
  };

  const modalMeta = activeModalProvider ? PROVIDERS[activeModalProvider] : null;
  const modalExistingKey = activeModalProvider ? keys.find((k) => k.provider === activeModalProvider) : null;

  return (
    <div className="space-y-6">
      {/* ── Active Status Top Banner ── */}
      <div
        className="p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all"
        style={{
          background: activeKey
            ? "linear-gradient(135deg, rgba(62, 124, 166, 0.12) 0%, rgba(62, 124, 166, 0.04) 100%)"
            : "var(--surface-container)",
          border: "1px solid var(--border)",
        }}
      >
        <div className="flex items-center gap-3.5">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: activeKey ? "var(--primary)" : "var(--border-strong)",
              color: "#FFFFFF",
            }}
          >
            {activeKey ? <Zap size={20} /> : <Cpu size={20} />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-semibold" style={{ color: "var(--text-muted)" }}>
                Current Engine:
              </span>
              <span
                className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                style={{
                  background: activeKey ? "var(--primary)" : "var(--border)",
                  color: activeKey ? "var(--on-primary)" : "var(--text-secondary)",
                }}
              >
                {activeKey
                  ? `Custom · ${PROVIDERS[activeKey.provider as SupportedProvider]?.name || activeKey.provider}`
                  : "SUITS Platform AI (Default)"}
              </span>
            </div>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
              {activeKey
                ? `Using ${activeKey.model_preference || "recommended model"} on your personal account. Click any provider below to change.`
                : "Using default SUITS platform rotation. Connect your own API key below for dedicated access and zero quotas."}
            </p>
          </div>
        </div>

        {activeKey && (
          <button
            onClick={handleDeactivateAll}
            className="text-xs font-medium px-3.5 py-2 rounded-xl cursor-pointer shrink-0 transition-colors"
            style={{
              background: "var(--surface)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
            }}
          >
            Switch to Platform AI
          </button>
        )}
      </div>

      {/* ── Section Title ── */}
      <div>
        <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <Key size={16} style={{ color: "var(--primary)" }} /> Connect Your AI Key
        </h3>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          Click on any provider to open instructions and paste your API key.
        </p>
      </div>

      {/* ── Vertical Providers List ── */}
      <div className="space-y-3">
        {PROVIDER_ORDER.map((provId) => {
          const prov = PROVIDERS[provId];
          const existing = keys.find((k) => k.provider === provId);
          const isActive = existing?.is_active ?? false;

          return (
            <div
              key={provId}
              onClick={() => handleOpenModal(provId)}
              className="group p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer transition-all"
              style={{
                background: isActive ? "var(--surface)" : "var(--surface-container)",
                border: isActive ? "1.5px solid var(--primary)" : "1px solid var(--border)",
                boxShadow: isActive ? "0 4px 14px rgba(62, 124, 166, 0.12)" : "none",
              }}
            >
              {/* Left: Brand info & description */}
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm"
                  style={{
                    background: prov.brandBg,
                    color: prov.brandColor,
                    border: `1px solid ${prov.brandColor}33`,
                  }}
                >
                  {prov.name.slice(0, 2).toUpperCase()}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      {prov.name}
                    </span>

                    {isActive && (
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                        style={{
                          background: "rgba(63, 122, 84, 0.15)",
                          color: "var(--seal-disposed)",
                        }}
                      >
                        Active
                      </span>
                    )}

                    {existing && !isActive && (
                      <span
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                        style={{
                          background: "var(--border)",
                          color: "var(--text-secondary)",
                        }}
                      >
                        Configured
                      </span>
                    )}
                  </div>

                  <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-secondary)" }}>
                    {prov.tagline}
                  </p>

                  {existing && (
                    <div className="flex items-center gap-2 text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                      <code
                        className="px-1.5 py-0.5 rounded font-mono text-[11px]"
                        style={{ background: "var(--surface-container-high)" }}
                      >
                        {existing.key_hint}
                      </code>
                      {existing.model_preference && <span>• {existing.model_preference}</span>}
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0" onClick={(e) => e.stopPropagation()}>
                {existing && !isActive && (
                  <button
                    onClick={(e) => handleActivate(existing.id, prov.name, e)}
                    className="text-xs px-3 py-1.5 rounded-xl font-medium cursor-pointer transition-all"
                    style={{
                      background: "var(--primary)",
                      color: "var(--on-primary)",
                    }}
                  >
                    Set Active
                  </button>
                )}

                <button
                  onClick={() => handleOpenModal(provId)}
                  className="text-xs px-3.5 py-1.5 rounded-xl font-medium cursor-pointer transition-all flex items-center gap-1.5"
                  style={{
                    background: existing ? "var(--surface-container-high)" : "var(--primary)",
                    color: existing ? "var(--text-primary)" : "var(--on-primary)",
                    border: existing ? "1px solid var(--border)" : "none",
                  }}
                >
                  <span>{existing ? "Edit Key" : "Connect Key"}</span>
                  <ChevronRight size={14} />
                </button>

                {existing && (
                  <button
                    onClick={(e) => handleDelete(existing.id, prov.name, e)}
                    className="p-1.5 rounded-xl text-xs cursor-pointer transition-all"
                    style={{
                      color: "var(--danger)",
                      background: "rgba(192, 57, 43, 0.08)",
                    }}
                    title="Remove Key"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Modal Pop-up ── */}
      {activeModalProvider && modalMeta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className="w-full max-w-lg rounded-2xl p-6 sm:p-7 space-y-6 shadow-2xl relative"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 pb-4" style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm"
                  style={{
                    background: modalMeta.brandBg,
                    color: modalMeta.brandColor,
                    border: `1px solid ${modalMeta.brandColor}33`,
                  }}
                >
                  {modalMeta.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                    Connect {modalMeta.name}
                  </h3>
                  <a
                    href={modalMeta.consoleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium hover:underline mt-0.5"
                    style={{ color: "var(--primary)" }}
                  >
                    <span>Get Key from {modalMeta.consoleName}</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>

              <button
                onClick={handleCloseModal}
                className="p-1.5 rounded-xl cursor-pointer transition-colors"
                style={{ color: "var(--text-muted)", background: "var(--surface-container)" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Step-by-Step Guide */}
            <div className="space-y-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                Quick Instructions
              </span>
              <div className="space-y-2">
                {modalMeta.steps.map((st, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl flex items-center gap-3 text-xs"
                    style={{ background: "var(--surface-container)" }}
                  >
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold"
                      style={{
                        background: "var(--primary)",
                        color: "var(--on-primary)",
                      }}
                    >
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <span style={{ color: "var(--text-primary)" }}>{st.text}</span>
                      {st.link && (
                        <a
                          href={st.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 ml-2 font-medium hover:underline"
                          style={{ color: "var(--primary)" }}
                        >
                          {st.linkText} <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Inputs: API Key & Preferred Model */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                  API Key
                </label>
                <div className="relative">
                  <input
                    type={showKeyText ? "text" : "password"}
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    placeholder={modalExistingKey ? `Current: ${modalExistingKey.key_hint} (paste new key to update)` : modalMeta.keyPrefixHint}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs font-mono pr-10 focus:outline-none transition-all"
                    style={{
                      background: "var(--surface-container)",
                      border: "1px solid var(--border)",
                      color: "var(--text-primary)",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKeyText(!showKeyText)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer transition-colors"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {showKeyText ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                  Preferred Model
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-xs font-mono focus:outline-none transition-all cursor-pointer"
                  style={{
                    background: "var(--surface-container)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                  }}
                >
                  {modalMeta.availableModels.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Test Connection Output */}
            {testResult && (
              <div
                className="p-3.5 rounded-xl text-xs flex items-start gap-2.5"
                style={{
                  background: testResult.success ? "rgba(63, 122, 84, 0.08)" : "rgba(192, 57, 43, 0.08)",
                  border: testResult.success ? "1px solid rgba(63, 122, 84, 0.25)" : "1px solid rgba(192, 57, 43, 0.25)",
                  color: testResult.success ? "var(--seal-disposed)" : "var(--danger)",
                }}
              >
                {testResult.success ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" /> : <XCircle size={16} className="shrink-0 mt-0.5" />}
                <div>
                  <p className="font-semibold">{testResult.success ? "Connection Verified" : "Connection Failed"}</p>
                  <p className="text-[11px] mt-0.5 leading-relaxed">{testResult.message}</p>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleTestKey}
                disabled={isTesting || !inputKey.trim()}
                className="px-3.5 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: "var(--surface-container)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border)",
                }}
              >
                {isTesting ? <RefreshCw size={13} className="animate-spin" /> : <Zap size={13} style={{ color: "var(--primary)" }} />}
                <span>{isTesting ? "Testing..." : "Test Connection"}</span>
              </button>

              <div className="flex items-center gap-2">
                {modalExistingKey && (
                  <button
                    type="button"
                    onClick={(e) => handleDelete(modalExistingKey.id, modalMeta.name, e)}
                    className="px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all"
                    style={{
                      color: "var(--danger)",
                      background: "rgba(192, 57, 43, 0.08)",
                    }}
                  >
                    Delete Key
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleSaveKey(false)}
                  disabled={isSaving || !inputKey.trim()}
                  className="px-3.5 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: "var(--surface-container)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border)",
                  }}
                >
                  Save
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveKey(true)}
                  disabled={isSaving || !inputKey.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: "var(--primary)",
                    color: "var(--on-primary)",
                  }}
                >
                  {isSaving ? "Saving..." : "Save & Activate"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
