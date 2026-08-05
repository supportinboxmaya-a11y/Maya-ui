import { cn } from "@/lib/cn";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-7 w-12 shrink-0 rounded-full border transition-colors",
        checked
          ? "border-accent-strong bg-accent"
          : "border-border-strong bg-surface-elevated",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span
        className={cn(
          "absolute top-1/2 size-5 -translate-y-1/2 rounded-full bg-foreground transition-all",
          checked ? "left-[calc(100%-1.5rem)]" : "left-1",
        )}
      />
    </button>
  );
}
