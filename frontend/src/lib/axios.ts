import axios from "axios";
import { useAIModeStore } from "@/store/ai-mode-store";
import { useAuthStore } from "@/store/auth-store";

const BASE_API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

// Main Axios instance with base URL and default headers
const api = axios.create({
  baseURL: BASE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Dedicated un-intercepted axios client for token refresh operations
const authClient = axios.create({
  baseURL: BASE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Decodes the expiration timestamp (in milliseconds) from a JWT token.
 * Returns null if the token is invalid or missing the 'exp' claim.
 */
export function parseJwtExpiry(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const payload = JSON.parse(jsonPayload);
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

/**
 * Checks whether a JWT is expired or will expire within bufferMs (default 30s).
 */
export function isTokenExpired(token: string, bufferMs = 30000): boolean {
  const expiry = parseJwtExpiry(token);
  if (!expiry) return true;
  return Date.now() + bufferMs >= expiry;
}

/**
 * Clears authentication tokens and safely redirects to /login.
 */
export function handleAuthLogout(): void {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  delete api.defaults.headers.common["Authorization"];

  try {
    useAuthStore.getState().logout();
  } catch {
    // Store might not be mounted yet
  }

  window.dispatchEvent(new Event("auth:logout"));

  const currentPath = window.location.pathname;
  if (currentPath !== "/login" && currentPath !== "/" && currentPath !== "/register") {
    window.location.href = "/login";
  }
}

// In-flight singleton refresh promise to deduplicate parallel requests
let refreshPromise: Promise<string | null> | null = null;

/**
 * Proactively ensures a fresh access token is available.
 * If the current access token is about to expire or has expired, it automatically
 * refreshes it using the refresh token before any network call is dispatched.
 */
export async function getOrRefreshToken(): Promise<string | null> {
  const accessToken = localStorage.getItem("access_token");
  const refreshToken = localStorage.getItem("refresh_token");

  // 1. If access token is still valid (not expiring within 30s), use it immediately
  if (accessToken && !isTokenExpired(accessToken, 30000)) {
    return accessToken;
  }

  // 2. If no refresh token exists or the refresh token itself has expired (> 7 days)
  if (!refreshToken || isTokenExpired(refreshToken, 0)) {
    if (accessToken) {
      handleAuthLogout();
    }
    return null;
  }

  // 3. If a refresh is already in flight, reuse the singleton promise (concurrency deduplication)
  if (refreshPromise) {
    return refreshPromise;
  }

  // 4. Initiate token refresh exchange
  refreshPromise = (async () => {
    try {
      const res = await authClient.post("/auth/refresh", {
        refresh_token: refreshToken,
      });

      const newAccessToken = res.data?.data?.access_token;
      const newRefreshToken = res.data?.data?.refresh_token;

      if (newAccessToken) {
        localStorage.setItem("access_token", newAccessToken);
        if (newRefreshToken) {
          localStorage.setItem("refresh_token", newRefreshToken);
        }
        api.defaults.headers.common["Authorization"] = `Bearer ${newAccessToken}`;
        return newAccessToken;
      }

      throw new Error("Invalid token refresh payload.");
    } catch (err) {
      handleAuthLogout();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function isPublicAuthEndpoint(url?: string): boolean {
  if (!url) return false;
  return (
    url.includes("/auth/login") ||
    url.includes("/auth/register") ||
    url.includes("/auth/refresh") ||
    url.includes("/auth/verify-otp") ||
    url.includes("/auth/resend-otp") ||
    url.includes("/auth/google")
  );
}

// ── Request Interceptor ────────────────────────────────────────────────────────
api.interceptors.request.use(
  async (config) => {
    // Proactively verify and renew token before sending protected requests
    if (!isPublicAuthEndpoint(config.url)) {
      const token = await getOrRefreshToken();
      if (token && config.headers) {
        if (typeof config.headers.set === "function") {
          config.headers.set("Authorization", `Bearer ${token}`);
        } else {
          config.headers["Authorization"] = `Bearer ${token}`;
        }
      }
    }

    // When sending FormData, delete default Content-Type so Axios & browser generate multipart/form-data with proper boundary
    if (config.data instanceof FormData && config.headers) {
      if (typeof config.headers.delete === "function") {
        config.headers.delete("Content-Type");
      } else {
        delete config.headers["Content-Type"];
      }
    }

    // Attach active AI provider header
    try {
      const effective = useAIModeStore.getState().getEffectiveProvider();
      if (effective === "local" && config.headers) {
        config.headers["X-AI-Provider"] = "ollama";
      }
    } catch {
      // Store may not be initialized yet
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ── Response Interceptor ───────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Handle Online AI rate limits / quota exhaustion
    const isAiLimitError =
      error.response?.status === 429 ||
      error.response?.data?.error_code === "ONLINE_AI_LIMIT_REACHED" ||
      error.response?.data?.can_switch_to_ollama ||
      (typeof error.response?.data?.message === "string" &&
        /quota|rate limit|credits depleted|resource_exhausted/i.test(
          error.response.data.message
        ));

    if (isAiLimitError && !originalRequest._aiRetry) {
      originalRequest._aiRetry = true;
      const message =
        error.response?.data?.message ||
        "Online AI rate limit or quota reached. Would you like to switch to Local Ollama (Qwen 7B)?";
      useAIModeStore.getState().triggerLimitModal(message, () => {
        if (originalRequest.headers) {
          originalRequest.headers["X-AI-Provider"] = "ollama";
        }
        return api(originalRequest);
      });
      return Promise.reject(error);
    }

    // Fallback reactive 401 retry if an unexpected 401 occurred (e.g. key rotation)
    if (
      error.response?.status === 401 &&
      !isPublicAuthEndpoint(originalRequest.url) &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      const freshToken = await getOrRefreshToken();
      if (freshToken) {
        if (originalRequest.headers) {
          if (typeof originalRequest.headers.set === "function") {
            originalRequest.headers.set("Authorization", `Bearer ${freshToken}`);
          } else {
            originalRequest.headers["Authorization"] = `Bearer ${freshToken}`;
          }
        }
        return api(originalRequest);
      }
      handleAuthLogout();
    }

    return Promise.reject(error);
  }
);

export default api;
