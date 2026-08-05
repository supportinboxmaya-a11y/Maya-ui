import { cn } from "@/lib/cn";
import type { OmniStatusPhase } from "@/types";

const PHASE_STYLES: Record<OmniStatusPhase, string> = {
  active: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  exhausted: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  disabled: "border-border-subtle bg-surface text-foreground-faint",
  error: "border-danger/30 bg-danger-soft text-danger",
};

const PHASE_DOT: Record<OmniStatusPhase, string> = {
  active: "bg-emerald-400",
  exhausted: "bg-amber-400",
  disabled: "bg-border-strong",
  error: "bg-danger",
};

const PHASE_LABEL: Record<OmniStatusPhase, string> = {
  active: "Active",
  exhausted: "Exhausted",
  disabled: "Disabled",
  error: "Error",
};

interface StatusBadgeProps {
  phase: OmniStatusPhase;
  label?: string;
}

export function StatusBadge({ phase, label }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
        PHASE_STYLES[phase],
      )}
    >
      <span
        className={cn("size-1.5 rounded-full", PHASE_DOT[phase])}
        aria-hidden="true"
      />
      {label ?? PHASE_LABEL[phase]}
    </span>
  );
}
