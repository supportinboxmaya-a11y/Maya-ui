import type { ReactNode } from "react";

import { AppHeader } from "@/components/Workspace/AppHeader";
import { WorkspaceBottomSheet } from "@/components/Workspace/WorkspaceBottomSheet";
import { EmptyDrawer } from "@/components/Drawer/EmptyDrawer";
import { useUiStore } from "@/store/use-ui-store";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const bottomSheet = useUiStore((s) => s.bottomSheet);
  const isDrawerOpen = useUiStore((s) => s.isDrawerOpen);

  return (
    <div className="relative mx-auto flex h-dvh w-full max-w-md flex-col overflow-hidden bg-background md:border-x md:border-border-subtle">
      <AppHeader />
      <main className="relative flex-1 overflow-hidden">{children}</main>
      <EmptyDrawer open={isDrawerOpen} />
      <WorkspaceBottomSheet open={bottomSheet === "workspace"} />
    </div>
  );
}
