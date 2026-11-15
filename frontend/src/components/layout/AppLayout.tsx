import { Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Sidebar from "./Sidebar";
import { TopSearchBar } from "./TopSearchBar";
import { MobileHeader } from "./MobileHeader";
import { CommandPalette } from "@/components/common/CommandPalette";
import { GlobalVoiceDictation } from "@/components/chat/GlobalVoiceDictation";
import { SwitchToOllamaModal } from "@/components/common/SwitchToOllamaModal";
import { useThemeStore } from "@/store/theme-store";

export default function AppLayout() {
  const { theme } = useThemeStore();
  const location = useLocation();
  const hideTopSearchBar =
    location.pathname === "/search" ||
    location.pathname.startsWith("/search") ||
    location.pathname === "/profile" ||
    location.pathname.startsWith("/profile");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <div className="app-shell">
      {/* Left sidebar with navigation: desktop fixed, mobile slide-over drawer */}
      <Sidebar />

      {/* Main column: mobile header + top search bar + page content */}
      <div className="main-column">
        {/* Mobile App Bar (< 768px only) */}
        <MobileHeader />

        {!hideTopSearchBar && (
          <div className="hidden md:block">
            <TopSearchBar />
          </div>
        )}
        <main className="main-content">
          <div className="main-inner">
            <Outlet />
          </div>
        </main>
      </div>

      <CommandPalette />
      <GlobalVoiceDictation />
      <SwitchToOllamaModal />
    </div>
  );
}
