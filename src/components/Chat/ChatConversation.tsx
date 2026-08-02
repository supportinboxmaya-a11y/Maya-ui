import { EmptyChat } from "@/components/Chat/EmptyChat";
import { ChatStatusBar } from "@/components/Chat/ChatStatusBar";

export function ChatConversation() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto scrollbar-hidden">
        <EmptyChat />
      </div>
      <ChatStatusBar />
    </div>
  );
}
