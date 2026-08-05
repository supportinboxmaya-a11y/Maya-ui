import { Menu, Settings } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import { useUiStore } from "@/store/use-ui-store";

const TITLES: Record<string, string> = {
  "/": "Maya",
  "/dashboard": "Dashboard",
  "/api-keys": "API Keys",
  "/settings": "Settings",
};

export function AppHeader() {
  const toggleDrawer = useUiStore((s) => s.toggleDrawer);
  const openBottomSheet = useUiStore((s) => s.openBottomSheet);
  const location = useLocation();
  const navigate = useNavigate();

  const title = TITLES[location.pathname] ?? "Maya";

  return (
    <header className="relative z-30 flex h-14 shrink-0 items-center border-b border-border-subtle bg-background px-3">
      <button
        type="button"
        aria-label="Open menu"
        onClick={toggleDrawer}
        className="flex size-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-surface-elevated active:bg-surface-elevated"
      >
        <Menu className="size-5" />
      </button>

      <h1 className="flex-1 text-center text-[15px] font-semibold tracking-tight text-foreground">
        {title}
      </h1>

      <button
        type="button"
        aria-label="Settings"
        onClick={() => (location.pathname === "/settings" ? openBottomSheet("workspace") : navigate("/settings"))}
        className="flex size-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-surface-elevated active:bg-surface-elevated"
      >
        <Settings className="size-5" />
      </button>
    </header>
  );
}
