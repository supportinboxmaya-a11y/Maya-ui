import { useChatStore } from "@/store/use-chat-store";
import { useUiStore } from "@/store/use-ui-store";

export function ChatStatusBar() {
  const openBottomSheet = useUiStore((s) => s.openBottomSheet);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const connection = useChatStore((s) => s.connection);
  const error = useChatStore((s) => s.error);

  if (connection === "error") {
    return (
      <button
        type="button"
        onClick={() => void useChatStore.getState().connect()}
        className="flex w-full items-center gap-2 border-t border-border-subtle bg-surface px-4 py-2.5 text-left transition-colors active:bg-surface-elevated"
      >
        <span className="flex size-5 items-center justify-center">
          <span className="size-2 rounded-full bg-danger" />
        </span>
        <span className="text-sm text-foreground">
          {error ?? "Backend unavailable"}
          <span className="text-foreground-faint"> — tap to retry</span>
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => openBottomSheet("workspace")}
      className="flex w-full items-center gap-2 border-t border-border-subtle bg-surface px-4 py-2.5 text-left transition-colors active:bg-surface-elevated"
    >
      <span className="flex size-5 items-center justify-center">
        <span
          className={
            isStreaming
              ? "size-2 animate-pulse-soft rounded-full bg-accent"
              : "size-2 rounded-full bg-border-strong"
          }
        />
      </span>
      <span className="text-sm text-foreground">
        {isStreaming ? (
          <>
            Maya is working
            <span className="inline-flex animate-pulse-soft">...</span>
          </>
        ) : (
          "Maya is ready"
        )}
      </span>
    </button>
  );
}
