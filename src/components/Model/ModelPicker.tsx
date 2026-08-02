import { ChevronDown, Sparkles } from "lucide-react";

export function ModelPicker() {
  return (
    <button
      type="button"
      aria-label="Change model"
      className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface px-3.5 py-2 text-sm text-foreground-muted transition-colors hover:border-border-strong hover:text-foreground"
    >
      <Sparkles className="size-4 text-accent" />
      <span className="font-medium">Maya</span>
      <ChevronDown className="size-3.5 opacity-70" />
    </button>
  );
}
