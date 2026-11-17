import { Link, useLocation, useNavigate } from "react-router-dom";
import { Sun, Moon, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuthStore } from "@/store/auth-store";
import { useThemeStore } from "@/store/theme-store";
import { useSidebarStore } from "@/store/sidebar-store";

// SVG icons matching the reference design (stroke-based, 18×18)
function WorkspaceIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}
function VaultIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
      <path d="M8 7h8M8 11h6" />
    </svg>
  );
}
function HistoryIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}
function AnalyticsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M4 19h16M7 15v4M12 9v10M17 5v14" />
    </svg>
  );
}
function TransitionIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 17H4M4 17l4-4M4 17l4 4M4 7h16M20 7l-4-4M20 7l4 4" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
      <path d="M10 9H8" />
    </svg>
  );
}

function ChatbotIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function ScalesIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M12 3v18M5 7l-3 6a3.5 3.5 0 007 0l-3-6zM19 7l-3 6a3.5 3.5 0 007 0l-3-6zM5 7h14M8 21h8" />
    </svg>
  );
}

const navItems = [
  { path: "/dashboard",  label: "Workspace",  Icon: WorkspaceIcon },
  { path: "/vault",      label: "Vault",      Icon: VaultIcon },
  { path: "/document",   label: "Document",   Icon: DocumentIcon },
  { path: "/chat",       label: "Chatbot",    Icon: ChatbotIcon },
  { path: "/transition", label: "Transition", Icon: TransitionIcon },
  { path: "/analytics",  label: "Analytics",  Icon: AnalyticsIcon },
  { path: "/history",    label: "History",    Icon: HistoryIcon },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { isMobileOpen, closeMobile } = useSidebarStore();
  const isDark = theme === "dark";

  const renderNavItems = (isMobile = false) => {
    const items = isMobile
      ? navItems.filter((item) => item.path !== "/document")
      : navItems;

    return (
      <div className="flex flex-col gap-1">
        {items.map(({ path, label, Icon }) => {
          const isActive =
            location.pathname === path ||
            (path !== "/dashboard" && location.pathname.startsWith(path));
          return (
            <Link
              key={path}
              to={path}
              onClick={() => {
                if (isMobile) closeMobile();
              }}
              className={`nav-item${isActive ? " active" : ""}`}
              title={label}
            >
              {isActive && !isMobile && (
                <motion.div
                  layoutId="sidebar-active-pill"
                  className="nav-item-active-pill"
                  transition={{
                    type: "spring",
                    stiffness: 380,
                    damping: 28,
                    mass: 0.7,
                  }}
                />
              )}
              {isActive && isMobile && (
                <div className="nav-item-active-pill" />
              )}
              <span className="nav-item-inner">
                <Icon />
                <span className="nav-label">{label}</span>
              </span>
            </Link>
          );
        })}
      </div>
    );
  };

  const renderFooter = (isMobile = false) => (
    <div className="sidebar-foot">
      <div className="sidebar-foot-row">
        {/* Clicking anywhere on the pill goes to /profile */}
        <button
          onClick={() => {
            if (isMobile) closeMobile();
            navigate("/profile");
          }}
          className="sidebar-profile-btn"
          aria-label="Go to profile"
          title={user?.full_name || "Profile"}
        >
          <div className="sidebar-avatar">
            {user?.full_name?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{user?.full_name || "User"}</span>
            <span className="sidebar-user-role">Advocate</span>
          </div>
        </button>

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleTheme}
          className="sidebar-theme-btn"
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          title={isDark ? "Light mode" : "Dark mode"}
        >
          {isDark ? (
            <Sun size={17} key="sun" className="animate-icon-swap" />
          ) : (
            <Moon size={17} key="moon" className="animate-icon-swap" />
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* ── DESKTOP SIDEBAR (≥ 768px): 100% untouched layout & design ── */}
      <aside className="sidebar hidden md:flex">
        <div className="sidebar-top">
          <div className="wordmark">
            <ScalesIcon />
            <span className="mark">SUIT</span>
          </div>

          <nav className="sidebar-nav">
            {renderNavItems(false)}
          </nav>
        </div>

        {renderFooter(false)}
      </aside>

      {/* ── MOBILE OFF-CANVAS SLIDE-OVER DRAWER (< 768px) ── */}
      <AnimatePresence>
        {isMobileOpen && (
          <div className="mobile-drawer-portal md:hidden">
            {/* Backdrop blur overlay */}
            <motion.div
              className="mobile-drawer-backdrop"
              onClick={closeMobile}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />

            {/* Sliding off-canvas panel */}
            <motion.aside
              className="sidebar-mobile-drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 360, damping: 32 }}
            >
              <div className="sidebar-top">
                <div className="wordmark justify-between">
                  <div className="flex items-center gap-2.5">
                    <ScalesIcon />
                    <span className="mark">SUIT</span>
                  </div>
                  <button
                    type="button"
                    onClick={closeMobile}
                    className="p-1 rounded-full text-[var(--ink-faint)] hover:text-[var(--ink)]"
                    aria-label="Close navigation"
                  >
                    <X size={18} />
                  </button>
                </div>

                <nav className="sidebar-nav">
                  {renderNavItems(true)}
                </nav>
              </div>

              {renderFooter(true)}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
