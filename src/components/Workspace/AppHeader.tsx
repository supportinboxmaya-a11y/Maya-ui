import { Menu, Settings } from "lucide-react";

import { useUiStore } from "@/store/use-ui-store";

export function AppHeader() {
  const toggleDrawer = useUiStore((s) => s.toggleDrawer);

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
        Maya
      </h1>

      <button
        type="button"
        aria-label="Settings"
        className="flex size-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-surface-elevated active:bg-surface-elevated"
      >
        <Settings className="size-5" />
      </button>
    </header>
  );
}
