import { AnimatePresence, motion } from "framer-motion";
import { Maximize, Square, X } from "lucide-react";

import { api } from "@/lib/api";
import { useChatStore } from "@/store/use-chat-store";
import { useUiStore } from "@/store/use-ui-store";
import { cn } from "@/lib/cn";
import type { WorkspaceSize, WorkspaceTab } from "@/types";

const TAB_LIST: { id: WorkspaceTab; label: string }[] = [
  { id: "logs", label: "Logs" },
  { id: "files", label: "Files" },
  { id: "terminal", label: "Terminal" },
  { id: "preview", label: "Preview" },
];

const SIZE_HEIGHT: Record<WorkspaceSize, number> = {
  compact: 248,
  medium: 420,
  full: 600,
};

const SIZE_LABEL: Record<WorkspaceSize, string> = {
  compact: "30%",
  medium: "60%",
  full: "100%",
};

const SIZE_ORDER: WorkspaceSize[] = ["compact", "medium", "full"];

function nextSize(current: WorkspaceSize): WorkspaceSize {
  const index = SIZE_ORDER.indexOf(current);
  return SIZE_ORDER[(index + 1) % SIZE_ORDER.length];
}

export function WorkspaceBottomSheet({ open }: { open: boolean }) {
  const closeBottomSheet = useUiStore((s) => s.closeBottomSheet);
  const workspaceTab = useUiStore((s) => s.workspaceTab);
  const setWorkspaceTab = useUiStore((s) => s.setWorkspaceTab);
  const workspaceSize = useUiStore((s) => s.workspaceSize);
  const setWorkspaceSize = useUiStore((s) => s.setWorkspaceSize);
  const sessionID = useChatStore((s) => s.sessionID);
  const isStreaming = useChatStore((s) => s.isStreaming);

  const handleStop = async () => {
    if (!sessionID) return;
    try {
      await api.interrupt(sessionID);
    } catch {
      // Ignore interrupt errors; session may already be idle.
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="absolute inset-0 z-40"
          role="dialog"
          aria-modal="true"
          aria-label="Workspace"
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
            initial={{ y: 600 }}
            animate={{ y: 0 }}
            exit={{ y: 600 }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            className="absolute inset-x-0 bottom-0 flex flex-col overflow-hidden rounded-t-[2rem] border-t border-border-subtle bg-surface pb-5 safe-area-pb"
            style={{ height: SIZE_HEIGHT[workspaceSize] }}
          >
            <div className="flex items-center justify-between px-5 pt-3">
              <h2 className="text-base font-semibold text-foreground">
                Workspace
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

            <div className="mt-3 flex gap-1 border-b border-border-subtle px-4">
              {TAB_LIST.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setWorkspaceTab(id)}
                  className={cn(
                    "-mb-px border-b-2 px-4 pb-2.5 text-sm transition-colors",
                    workspaceTab === id
                      ? "border-accent text-foreground"
                      : "border-transparent text-foreground-muted hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-hidden p-4">
              {workspaceTab === "logs" ? (
                <div className="flex h-full flex-col gap-3">
                  <p className="text-xs text-foreground-muted">
                    {isStreaming ? "Maya is working…" : "Session idle"}
                  </p>
                  <div className="flex flex-1 flex-col gap-2 overflow-y-auto scrollbar-hidden">
                    {[0, 1, 2, 3].map((i) => (
                      <span
                        key={i}
                        className="flex h-3 items-center gap-2"
                        aria-hidden="true"
                      >
                        <span className="size-1.5 rounded-full bg-accent/70" />
                        <span
                          className="h-2 rounded-full bg-border-subtle"
                          style={{ width: `${86 - i * 14}%` }}
                        />
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-xs text-foreground-faint">
                    {TAB_LIST.find((t) => t.id === workspaceTab)?.label} not
                    available yet
                  </p>
                </div>
              )}
            </div>

            <div className="mt-3 flex items-center gap-3 px-5">
              <button
                type="button"
                aria-label="Expand workspace"
                onClick={() => setWorkspaceSize(nextSize(workspaceSize))}
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-border-strong bg-surface-elevated text-sm text-foreground transition-colors hover:bg-border-subtle active:bg-border-subtle"
              >
                <Maximize className="size-4" />
                {SIZE_LABEL[workspaceSize]}
              </button>

              <button
                type="button"
                onClick={handleStop}
                disabled={!isStreaming}
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-foreground text-sm font-medium text-black transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-25"
              >
                <Square className="size-4" />
                Stop Task
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
