interface TypingIndicatorProps {
  label?: string;
}

export function TypingIndicator({
  label = "Maya is typing…",
}: TypingIndicatorProps) {
  return (
    <div className="flex items-center gap-2 px-1 py-2" aria-label={label}>
      <span className="flex items-center gap-1" aria-hidden="true">
        <span className="size-1.5 animate-pulse-soft rounded-full bg-foreground-muted" />
        <span className="size-1.5 animate-pulse-soft rounded-full bg-foreground-muted [animation-delay:150ms]" />
        <span className="size-1.5 animate-pulse-soft rounded-full bg-foreground-muted [animation-delay:300ms]" />
      </span>
      <span className="text-xs text-foreground-faint">{label}</span>
    </div>
  );
}
