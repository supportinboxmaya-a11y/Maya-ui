import { AnimatePresence, motion } from "framer-motion";
import { Folder, MessageSquare, X } from "lucide-react";

import { Button } from "@/components/Common/Button";
import { useUiStore } from "@/store/use-ui-store";

const SHEET_HEIGHT = 320;

const sheetAnimation = {
  initial: { y: SHEET_HEIGHT },
  animate: { y: 0 },
  exit: { y: SHEET_HEIGHT },
} as const;

export function WorkspaceBottomSheet({ open }: { open: boolean }) {
  const closeBottomSheet = useUiStore((s) => s.closeBottomSheet);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="absolute inset-0 z-40"
          role="dialog"
          aria-modal="true"
          aria-label="Workspaces"
        >
          <motion.button
            type="button"
            aria-label="Close"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeBottomSheet}
            className="absolute inset-0 size-full cursor-default bg-black/60 backdrop-blur-[2px]"
          />

          <motion.div
            initial="initial"
            animate="animate"
            exit="exit"
            variants={sheetAnimation}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            className="absolute inset-x-0 bottom-0 rounded-t-[2rem] border-t border-border-subtle bg-surface px-5 pt-2 pb-6 safe-area-pb"
            style={{ height: SHEET_HEIGHT }}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border-strong" />

            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">
                Workspaces
              </h2>
              <button
                type="button"
                aria-label="Close"
                onClick={closeBottomSheet}
                className="flex size-8 items-center justify-center rounded-full text-foreground-muted transition-colors hover:bg-surface-elevated hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex flex-col items-center gap-3 pb-2 text-center">
              <span className="flex size-14 items-center justify-center rounded-2xl border border-border-subtle bg-surface-elevated">
                <Folder className="size-6 text-foreground-muted" />
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">
                  No workspaces yet
                </p>
                <p className="mt-1 max-w-[220px] text-xs leading-relaxed text-foreground-faint">
                  Create a workspace to organize your chats and projects.
                </p>
              </div>
              <Button
                size="sm"
                className="mt-1 gap-1.5"
                onClick={closeBottomSheet}
              >
                <MessageSquare className="size-3.5" />
                New workspace
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
