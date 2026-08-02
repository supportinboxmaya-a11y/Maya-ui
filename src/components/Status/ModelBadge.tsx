interface ModelBadgeProps {
  model?: string;
}

export function ModelBadge({ model = "Maya" }: ModelBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface px-2.5 py-1 text-[11px] font-medium text-foreground-muted">
      <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
      {model}
    </span>
  );
}
