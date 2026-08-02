import { AnimatePresence, motion } from "framer-motion";
import {
  FolderKanban,
  History,
  KeyRound,
  MessageSquarePlus,
  Settings,
  Sparkles,
} from "lucide-react";

import { useUiStore } from "@/store/use-ui-store";

const drawerItems = [
  { id: "new-chat", label: "New Chat", icon: MessageSquarePlus },
  { id: "history", label: "History", icon: History },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "models", label: "Models", icon: Sparkles },
  { id: "api-keys", label: "API Keys", icon: KeyRound },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

export function AppDrawer({ open }: { open: boolean }) {
  const setDrawerOpen = useUiStore((s) => s.setDrawerOpen);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="absolute inset-0 z-50"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
        >
          <motion.button
            type="button"
            aria-label="Close"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 size-full cursor-default bg-black/60 backdrop-blur-[2px]"
          />

          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            className="absolute inset-y-0 left-0 w-[290px] max-w-[82%] border-r border-border-subtle bg-surface px-3 py-4"
          >
            <nav aria-label="Main menu">
              <ul className="flex flex-col gap-1">
                {drawerItems.map(({ id, label, icon: Icon }) => (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => setDrawerOpen(false)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-foreground transition-colors hover:bg-surface-elevated active:bg-surface-elevated"
                    >
                      <Icon className="size-5 text-foreground-muted" />
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
