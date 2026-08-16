import { Mic, Plus, SendHorizontal, X } from "lucide-react";
import { useState } from "react";

import { useChatStore } from "@/store/use-chat-store";
import { useUiStore } from "@/store/use-ui-store";

interface ChatInputProps {
  placeholder?: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ChatInput({
  placeholder = "Type a message...",
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const openBottomSheet = useUiStore((s) => s.openBottomSheet);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const attachments = useChatStore((s) => s.attachments);
  const addAttachments = useChatStore((s) => s.addAttachments);
  const removeAttachment = useChatStore((s) => s.removeAttachment);
  const hasValue = value.trim().length > 0;
  const hasAttachments = attachments.length > 0;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if ((!hasValue && !hasAttachments) || isStreaming) return;
    const text = value;
    setValue("");
    void sendMessage(text);
  };

  /** Paste support: attach pasted files (images, blobs) from the clipboard. */
  const handlePaste = (event: React.ClipboardEvent) => {
    const items = Array.from(event.clipboardData?.items ?? []);
    const files = items
      .filter((item) => item.kind === "file")
      .map((item) => item.getAsFile())
      .filter((f): f is File => f !== null);
    if (files.length > 0) {
      event.preventDefault();
      void addAttachments(files);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="px-3 pb-3 pt-2 safe-area-pb"
      aria-label="Message composer"
    >
      {hasAttachments && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center gap-2 rounded-xl border border-border-subtle bg-surface-elevated px-2 py-1.5"
            >
              {attachment.previewUrl ? (
                <img
                  src={attachment.previewUrl}
                  alt={attachment.name}
                  className="size-8 rounded-lg object-cover"
                />
              ) : (
                <span className="flex size-8 items-center justify-center rounded-lg bg-border-subtle text-[10px] font-medium text-foreground-muted">
                  {attachment.mime.startsWith("audio/")
                    ? "AUD"
                    : attachment.mime.includes("zip")
                      ? "ZIP"
                      : attachment.name.split(".").pop()?.slice(0, 3).toUpperCase() ?? "FILE"}
                </span>
              )}
              <span className="max-w-32 truncate text-xs text-foreground">
                {attachment.name}
              </span>
              <span className="shrink-0 text-[10px] text-foreground-faint">
                {formatSize(attachment.size)}
              </span>
              <button
                type="button"
                aria-label={`Remove ${attachment.name}`}
                onClick={() => removeAttachment(attachment.id)}
                className="flex size-5 shrink-0 items-center justify-center rounded-full text-foreground-muted transition-colors hover:bg-border-subtle hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-1.5 rounded-2xl border border-border-strong bg-surface-elevated px-1.5 py-1.5 focus-within:border-accent/60">
        <button
          type="button"
          aria-label="Attach files"
          onClick={() => openBottomSheet("attach")}
          className="flex size-9 shrink-0 items-center justify-center rounded-xl text-foreground transition-colors hover:bg-border-subtle active:bg-border-subtle"
        >
          <Plus className="size-5" />
        </button>

        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onPaste={handlePaste}
          placeholder={placeholder}
          aria-label="Message"
          className="h-9 min-w-0 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-foreground-faint"
        />

        <button
          type="button"
          aria-label="Voice input"
          className="flex size-9 shrink-0 items-center justify-center rounded-xl text-foreground transition-colors hover:bg-border-subtle active:bg-border-subtle"
        >
          <Mic className="size-5" />
        </button>

        <button
          type="submit"
          aria-label="Send message"
          disabled={!hasValue && !hasAttachments}
          className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-foreground text-black transition-opacity enabled:hover:opacity-90 enabled:active:opacity-80 disabled:opacity-25"
        >
          <SendHorizontal className="size-5" />
        </button>
      </div>
    </form>
  );
}
