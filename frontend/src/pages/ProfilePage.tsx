import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Shield,
  Save,
  KeyRound,
  Loader2,
  LogOut,
  Sliders,
  Sun,
  Moon,
  Bell,
  Database,
  Key,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import { useThemeStore } from "@/store/theme-store";
import { authService } from "@/services/auth";
import BYOKSettings from "@/components/byok/BYOKSettings";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, setUser, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === "dark";

  // Profile Form State
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);

  // Preferences State
  const [compactView, setCompactView] = useState(false);
  const [caseUpdates, setCaseUpdates] = useState(true);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      const updated = await authService.updateProfile({ full_name: fullName });
      setUser(updated);
      toast.success("Profile updated successfully.");
    } catch {
      toast.error("Failed to update profile.");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdLoading(true);
    try {
      await authService.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      toast.success("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to change password.");
    } finally {
      setPwdLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully.");
    navigate("/login");
  };

  const handleSavePreferences = () => {
    toast.success("Workspace preferences saved.");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16 pt-2">
      {/* ── Page Header ── */}
      <div>
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}
        >
          Profile & Settings
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Manage your account profile, personal AI keys, and workspace preferences.
        </p>
      </div>

      {/* ── Section 1: Profile & Account Details ── */}
      <div
        className="card-float p-6 sm:p-8 space-y-8"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
        }}
      >
        {/* Personal Details */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h3
              className="text-base font-semibold flex items-center gap-2.5"
              style={{ color: "var(--text-primary)" }}
            >
              <User size={18} style={{ color: "var(--primary)" }} /> Personal Information
            </h3>
            <span
              className="text-xs px-2.5 py-0.5 rounded-full font-medium"
              style={{
                background: "var(--surface-container)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border)",
              }}
            >
              Advocate
            </span>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  className="block text-xs font-semibold mb-1.5 uppercase tracking-wider"
                  style={{ color: "var(--text-muted)" }}
                >
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border outline-none transition-colors"
                  style={{
                    background: "var(--surface-container)",
                    borderColor: "var(--border)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>

              <div>
                <label
                  className="block text-xs font-semibold mb-1.5 uppercase tracking-wider"
                  style={{ color: "var(--text-muted)" }}
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: "var(--text-muted)" }}
                  />
                  <input
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border outline-none cursor-not-allowed opacity-75"
                    style={{
                      background: "var(--surface-container)",
                      borderColor: "var(--border)",
                      color: "var(--text-secondary)",
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="pt-1 flex justify-start">
              <button
                type="submit"
                disabled={profileLoading || fullName === user?.full_name}
                className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: "var(--primary)",
                  color: "var(--on-primary)",
                }}
              >
                {profileLoading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                <span>Save Profile Changes</span>
              </button>
            </div>
          </form>
        </section>

        <hr style={{ borderColor: "var(--border)" }} />

        {/* Password & Security */}
        <section>
          <h3
            className="text-base font-semibold mb-5 flex items-center gap-2.5"
            style={{ color: "var(--text-primary)" }}
          >
            <Shield size={18} style={{ color: "var(--primary)" }} /> Security & Password
          </h3>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  className="block text-xs font-semibold mb-1.5 uppercase tracking-wider"
                  style={{ color: "var(--text-muted)" }}
                >
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border outline-none transition-colors"
                  style={{
                    background: "var(--surface-container)",
                    borderColor: "var(--border)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>

              <div>
                <label
                  className="block text-xs font-semibold mb-1.5 uppercase tracking-wider"
                  style={{ color: "var(--text-muted)" }}
                >
                  New Password
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border outline-none transition-colors"
                  style={{
                    background: "var(--surface-container)",
                    borderColor: "var(--border)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
              <button
                type="submit"
                disabled={pwdLoading || !currentPassword || !newPassword}
                className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: "var(--surface-container-high)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border)",
                }}
              >
                {pwdLoading ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                <span>Update Password</span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-2 cursor-pointer transition-all"
                style={{
                  background: "rgba(192, 57, 43, 0.08)",
                  color: "var(--danger)",
                  border: "1px solid rgba(192, 57, 43, 0.25)",
                }}
              >
                <LogOut size={14} />
                <span>Log Out of Account</span>
              </button>
            </div>
          </form>
        </section>
      </div>

      {/* ── Section 2: AI & Custom API Keys (BYOK) ── */}
      <div
        className="card-float p-6 sm:p-8 space-y-6"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3
              className="text-base font-semibold flex items-center gap-2.5"
              style={{ color: "var(--text-primary)" }}
            >
              <Key size={18} style={{ color: "var(--primary)" }} /> AI Engine & API Keys (BYOK)
            </h3>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
              Connect your personal AI key to run searches, predictions, and case summaries on your own account.
            </p>
          </div>
        </div>

        <BYOKSettings />
      </div>

      {/* ── Section 3: Workspace Preferences ── */}
      <div
        className="card-float p-6 sm:p-8 space-y-6"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
        }}
      >
        <h3
          className="text-base font-semibold flex items-center gap-2.5"
          style={{ color: "var(--text-primary)" }}
        >
          <Sliders size={18} style={{ color: "var(--primary)" }} /> Workspace Preferences
        </h3>

        {/* Display & Layout */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                Compact View
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Reduce spacing and padding in case lists and data tables.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={compactView}
                onChange={(e) => setCompactView(e.target.checked)}
                className="sr-only peer"
              />
              <div
                className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"
                style={{
                  background: compactView ? "var(--primary)" : "var(--border-strong)",
                }}
              />
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                Theme Appearance
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Toggle between Light and Dark interface appearance.
              </p>
            </div>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-all"
              style={{
                background: "var(--surface-container)",
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
              }}
            >
              {isDark ? (
                <>
                  <Sun size={14} className="animate-icon-swap" /> Light Mode
                </>
              ) : (
                <>
                  <Moon size={14} className="animate-icon-swap" /> Dark Mode
                </>
              )}
            </button>
          </div>
        </div>

        <hr style={{ borderColor: "var(--border)" }} />

        {/* Notifications */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                <Bell size={14} style={{ color: "var(--text-muted)" }} /> Case Updates & Alerts
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Receive updates when bookmarked matters have newly listed court orders.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={caseUpdates}
                onChange={(e) => setCaseUpdates(e.target.checked)}
                className="sr-only peer"
              />
              <div
                className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"
                style={{
                  background: caseUpdates ? "var(--primary)" : "var(--border-strong)",
                }}
              />
            </label>
          </div>
        </div>

        <hr style={{ borderColor: "var(--border)" }} />

        {/* Data Management */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
              <Database size={14} style={{ color: "var(--text-muted)" }} /> Export Workspace Data
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Download your bookmarked cases, search history, and research notes as JSON.
            </p>
          </div>
          <button
            onClick={() => toast.success("Export initiated.")}
            className="px-3.5 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-all self-start sm:self-auto"
            style={{
              background: "var(--surface-container)",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
            }}
          >
            Export JSON
          </button>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={handleSavePreferences}
            className="px-5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all shadow-sm"
            style={{
              background: "var(--primary)",
              color: "var(--on-primary)",
            }}
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}
