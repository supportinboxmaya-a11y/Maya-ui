import { useChatStore } from "@/store/use-chat-store";

export function EmptyChat() {
  const connection = useChatStore((s) => s.connection);

  if (connection === "connecting") {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <div className="text-center">
          <p className="text-sm leading-relaxed text-foreground-muted">
            Connecting to Maya backend...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center px-6">
      <div className="text-center">
        <p className="text-sm leading-relaxed text-foreground-muted">
          Your conversation with Maya will appear here.
        </p>
      </div>
    </div>
  );
}
