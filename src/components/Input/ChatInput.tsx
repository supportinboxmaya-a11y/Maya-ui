import { Paperclip, Send, Sparkles } from "lucide-react";
import { useState } from "react";

import { useUiStore } from "@/store/use-ui-store";

interface ChatInputProps {
  placeholder?: string;
}

export function ChatInput({
  placeholder = "Ask Maya anything…",
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const openBottomSheet = useUiStore((s) => s.openBottomSheet);
  const hasValue = value.trim().length > 0;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setValue("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="px-3 pb-4 safe-area-pb"
      aria-label="Message composer"
    >
      <div className="flex items-end gap-2 rounded-[1.75rem] border border-border-strong bg-surface-elevated px-3 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.6)] focus-within:border-accent/60">
        <button
          type="button"
          aria-label="Attach files"
          onClick={() => openBottomSheet("drawer")}
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-foreground-muted transition-colors hover:bg-border-subtle hover:text-foreground"
        >
          <Paperclip className="size-5" />
        </button>

        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          rows={1}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (hasValue) {
                setValue("");
              }
            }
          }}
          className="max-h-32 min-h-9 flex-1 resize-none bg-transparent py-2 text-[15px] leading-5 text-foreground outline-none placeholder:text-foreground-faint"
        />

        <button
          type="submit"
          aria-label="Send message"
          disabled={!hasValue}
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground text-black transition-opacity enabled:hover:opacity-90 enabled:active:opacity-80 disabled:opacity-30 disabled:active:scale-95"
        >
          <Send className="size-4 -translate-x-px translate-y-px" />
        </button>
      </div>

      <div className="mt-3 flex items-center justify-center gap-1.5">
        <Sparkles className="size-3.5 text-accent" />
        <p className="text-xs text-foreground-faint">
          Maya can make mistakes. Check important info.
        </p>
      </div>
    </form>
  );
}
