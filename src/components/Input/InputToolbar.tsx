import { Image, Mic, Sparkles, Video } from "lucide-react";

const tools = [
  { id: "sparkles", label: "Modes", icon: Sparkles },
  { id: "image", label: "Images", icon: Image },
  { id: "video", label: "Videos", icon: Video },
  { id: "mic", label: "Voice", icon: Mic },
] as const;

export function InputToolbar() {
  return (
    <div className="flex items-center justify-between px-4">
      {tools.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          aria-label={label}
          className="flex flex-col items-center gap-1.5 text-foreground-muted transition-colors hover:text-foreground"
        >
          <span className="flex size-11 items-center justify-center rounded-full border border-border-subtle bg-surface transition-colors hover:border-border-strong">
            <Icon className="size-5" />
          </span>
        </button>
      ))}
    </div>
  );
}
