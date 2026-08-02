import { AnimatePresence, motion } from "framer-motion";
import {
  Camera,
  FileArchive,
  FileText,
  Folder,
  Image,
  Mic,
  ClipboardPaste,
  X,
} from "lucide-react";

import { useUiStore } from "@/store/use-ui-store";

const attachOptions = [
  { id: "camera", label: "Camera", icon: Camera },
  { id: "gallery", label: "Gallery", icon: Image },
  { id: "document", label: "Document", icon: FileText },
  { id: "folder", label: "Folder", icon: Folder },
  { id: "paste", label: "Paste", icon: ClipboardPaste },
  { id: "audio", label: "Audio", icon: Mic },
  { id: "zip", label: "ZIP", icon: FileArchive },
] as const;

export function AttachSheet({ open }: { open: boolean }) {
  const closeBottomSheet = useUiStore((s) => s.closeBottomSheet);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="absolute inset-0 z-40"
          role="dialog"
          aria-modal="true"
          aria-label="Attach"
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
            initial={{ y: 260 }}
            animate={{ y: 0 }}
            exit={{ y: 260 }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            className="absolute inset-x-0 bottom-0 rounded-t-[2rem] border-t border-border-subtle bg-surface px-5 pt-2 pb-6 safe-area-pb"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border-strong" />

            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">
                Attach
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

            <div className="grid grid-cols-4 gap-4">
              {attachOptions.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  aria-label={label}
                  onClick={closeBottomSheet}
                  className="flex flex-col items-center gap-2 transition-opacity active:opacity-70"
                >
                  <span className="flex size-12 items-center justify-center rounded-2xl border border-border-subtle bg-surface-elevated">
                    <Icon className="size-5 text-foreground" />
                  </span>
                  <span className="text-xs text-foreground-muted">{label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
