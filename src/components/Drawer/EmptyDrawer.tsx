import { AnimatePresence, motion } from "framer-motion";
import { History, Search, X } from "lucide-react";

import { useUiStore } from "@/store/use-ui-store";

export function EmptyDrawer({ open }: { open: boolean }) {
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
            className="absolute inset-y-0 left-0 w-[290px] max-w-[82%] border-r border-border-subtle bg-surface px-4 pt-4 pb-6"
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Menu</h2>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setDrawerOpen(false)}
                className="flex size-8 items-center justify-center rounded-full text-foreground-muted transition-colors hover:bg-surface-elevated hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="relative mb-6">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-foreground-faint" />
              <input
                type="search"
                placeholder="Search"
                aria-label="Search"
                className="h-10 w-full rounded-xl border border-border-subtle bg-surface-elevated pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-foreground-faint focus:border-accent/60"
              />
            </div>

            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <span className="flex size-12 items-center justify-center rounded-full border border-border-subtle bg-surface-elevated">
                <History className="size-5 text-foreground-muted" />
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Nothing here yet
                </p>
                <p className="mt-1 max-w-[180px] text-xs leading-relaxed text-foreground-faint">
                  Your recent chats will appear here.
                </p>
              </div>
            </div>

            <div className="mt-auto flex items-center gap-2 border-t border-border-subtle pt-4">
              <span className="flex size-8 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-black">
                A
              </span>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-foreground">Maya</p>
                <p className="text-[11px] text-foreground-faint">Local preview</p>
              </div>
              <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
