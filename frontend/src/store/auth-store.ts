import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types/auth";
import { authService } from "@/services/auth";
import { safeStorage } from "@/lib/storage";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: true }),
      logout: () => {
        const rt = safeStorage.getItem("refresh_token");
        authService.logout(rt).catch(() => {});
        safeStorage.removeItem("access_token");
        safeStorage.removeItem("refresh_token");
        set({ user: null, isAuthenticated: false });
      },
    }),
    { name: "suits-auth" }
  )
);
