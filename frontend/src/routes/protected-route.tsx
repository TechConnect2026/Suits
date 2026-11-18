import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/store/auth-store";
import { isTokenExpired } from "@/lib/axios";

export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s: { isAuthenticated: boolean }) => s.isAuthenticated);
  const token = localStorage.getItem("access_token");
  const refreshToken = localStorage.getItem("refresh_token");

  // Check if there is an active valid access token OR an unexpired refresh token that can renew it
  const hasActiveSession =
    Boolean(token && !isTokenExpired(token, 0)) ||
    Boolean(refreshToken && !isTokenExpired(refreshToken, 0));

  if (!isAuthenticated || !hasActiveSession) {
    if (isAuthenticated || token || refreshToken) {
      // Clear stale tokens & state
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      useAuthStore.getState().logout();
    }
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
