import { useEffect, useRef } from "react";

import { EmptyChat } from "@/components/Chat/EmptyChat";
import { ChatStatusBar } from "@/components/Chat/ChatStatusBar";
import { useChatStore } from "@/store/use-chat-store";

export function ChatConversation() {
  const messages = useChatStore((s) => s.messages);
  const connection = useChatStore((s) => s.connection);
  const connect = useChatStore((s) => s.connect);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (connection === "idle") void connect();
  }, [connection, connect]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto scrollbar-hidden">
        {messages.length === 0 ? (
          <EmptyChat />
        ) : (
          <div className="flex flex-col gap-4 px-4 py-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={
                  message.role === "user"
                    ? "flex justify-end"
                    : "flex justify-start"
                }
              >
                <div
                  className={
                    message.role === "user"
                      ? "max-w-[85%] rounded-2xl rounded-br-md bg-foreground px-3.5 py-2.5 text-sm text-black"
                      : "max-w-[85%] rounded-2xl rounded-bl-md border border-border-subtle bg-surface px-3.5 py-2.5 text-sm text-foreground"
                  }
                >
                  {message.content || "\u200b"}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
        )}
      </div>
      <ChatStatusBar />
    </div>
  );
}
