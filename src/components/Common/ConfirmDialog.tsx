import { AnimatePresence, motion } from "framer-motion";

import { Button } from "@/components/Common/Button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  busy = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="absolute inset-0 z-[60] flex items-end justify-center p-4"
          role="alertdialog"
          aria-modal="true"
          aria-label={title}
        >
          <motion.button
            type="button"
            aria-label="Close"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 size-full cursor-default bg-black/70 backdrop-blur-[2px]"
          />

          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            className="relative z-10 w-full max-w-md rounded-2xl border border-border-subtle bg-surface-elevated p-5"
          >
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-foreground-muted">
              {message}
            </p>
            <div className="mt-5 flex gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={onClose}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-danger text-white hover:opacity-90"
                onClick={onConfirm}
                disabled={busy}
              >
                {busy ? "Deleting…" : confirmLabel}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
