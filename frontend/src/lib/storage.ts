/**
 * Safe localStorage wrapper with try-catch guards against QuotaExceededError
 * and browser private/incognito mode restrictions.
 */

export const safeStorage = {
  getItem(key: string): string | null {
    try {
      return typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
    } catch {
      return null;
    }
  },

  setItem(key: string, value: string): boolean {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, value);
        return true;
      }
      return false;
    } catch (e) {
      console.warn(`[safeStorage] Failed to set item for key "${key}":`, e);
      return false;
    }
  },

  removeItem(key: string): boolean {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(key);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  getJSON<T>(key: string, fallback: T): T {
    try {
      if (typeof window === "undefined") return fallback;
      const val = window.localStorage.getItem(key);
      return val ? (JSON.parse(val) as T) : fallback;
    } catch {
      return fallback;
    }
  },

  setJSON<T>(key: string, value: T): boolean {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(value));
        return true;
      }
      return false;
    } catch (e) {
      console.warn(`[safeStorage] Failed to set JSON for key "${key}":`, e);
      return false;
    }
  },
};
