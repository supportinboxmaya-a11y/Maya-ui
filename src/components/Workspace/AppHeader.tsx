import { motion } from "framer-motion";
import { Menu, Plus } from "lucide-react";

import { useUiStore } from "@/store/use-ui-store";

export function AppHeader() {
  const toggleDrawer = useUiStore((s) => s.toggleDrawer);
  const openBottomSheet = useUiStore((s) => s.openBottomSheet);

  return (
    <motion.header
      initial={false}
      animate={{ y: 0 }}
      className="relative z-30 flex h-14 shrink-0 items-center justify-between border-b border-border-subtle bg-background/80 px-3 backdrop-blur-xl"
    >
      <motion.button
        type="button"
        aria-label="Open menu"
        onClick={toggleDrawer}
        whileTap={{ scale: 0.9 }}
        className="flex size-10 items-center justify-center rounded-full text-foreground-muted transition-colors hover:bg-surface-elevated hover:text-foreground active:bg-surface-elevated"
      >
        <Menu className="size-5" />
      </motion.button>

      <motion.button
        type="button"
        aria-label="Open workspaces"
        onClick={() => openBottomSheet("workspace")}
        whileTap={{ scale: 0.9 }}
        className="flex size-10 items-center justify-center rounded-full bg-foreground text-black transition-opacity hover:opacity-90 active:opacity-80"
      >
        <Plus className="size-5" />
      </motion.button>
    </motion.header>
  );
}
