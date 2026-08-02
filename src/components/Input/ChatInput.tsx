import { Mic, Plus, SendHorizontal } from "lucide-react";
import { useState } from "react";

import { useChatStore } from "@/store/use-chat-store";
import { useUiStore } from "@/store/use-ui-store";

interface ChatInputProps {
  placeholder?: string;
}

export function ChatInput({
  placeholder = "Type a message...",
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const openBottomSheet = useUiStore((s) => s.openBottomSheet);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const hasValue = value.trim().length > 0;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!hasValue || isStreaming) return;
    const text = value;
    setValue("");
    void sendMessage(text);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="px-3 pb-3 pt-2 safe-area-pb"
      aria-label="Message composer"
    >
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
          disabled={!hasValue}
          className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-foreground text-black transition-opacity enabled:hover:opacity-90 enabled:active:opacity-80 disabled:opacity-25"
        >
          <SendHorizontal className="size-5" />
        </button>
      </div>
    </form>
  );
}
