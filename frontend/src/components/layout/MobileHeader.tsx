import { Link } from "react-router-dom";
import { Menu, Sun, Moon } from "lucide-react";
import { useSidebarStore } from "@/store/sidebar-store";
import { useThemeStore } from "@/store/theme-store";

function ScalesIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className="w-5 h-5 text-[var(--brass)] flex-shrink-0"
    >
      <path d="M12 3v18M5 7l-3 6a3.5 3.5 0 007 0l-3-6zM19 7l-3 6a3.5 3.5 0 007 0l-3-6zM5 7h14M8 21h8" />
    </svg>
  );
}

export function MobileHeader() {
  const { openMobile } = useSidebarStore();
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === "dark";

  return (
    <header className="mobile-header md:hidden">
      {/* Left: Hamburger menu toggle */}
      <button
        type="button"
        onClick={openMobile}
        className="mobile-header-btn"
        aria-label="Open navigation menu"
      >
        <Menu size={20} />
      </button>

      {/* Center: Brand Wordmark */}
      <Link to="/dashboard" className="mobile-header-brand">
        <ScalesIcon />
        <span className="mobile-header-title">SUITS</span>
      </Link>

      {/* Right: Quick Theme toggle */}
      <button
        type="button"
        onClick={toggleTheme}
        className="mobile-header-btn"
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </header>
  );
}
