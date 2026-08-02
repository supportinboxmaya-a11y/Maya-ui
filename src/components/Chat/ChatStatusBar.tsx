import { useUiStore } from "@/store/use-ui-store";

export function ChatStatusBar() {
  const openBottomSheet = useUiStore((s) => s.openBottomSheet);

  return (
    <button
      type="button"
      onClick={() => openBottomSheet("workspace")}
      className="flex w-full items-center gap-2 border-t border-border-subtle bg-surface px-4 py-2.5 text-left transition-colors active:bg-surface-elevated"
    >
      <span className="flex size-5 items-center justify-center">
        <span className="size-2 animate-pulse-soft rounded-full bg-accent" />
      </span>
      <span className="text-sm text-foreground">
        Maya is working
        <span className="inline-flex animate-pulse-soft">...</span>
      </span>
    </button>
  );
}
