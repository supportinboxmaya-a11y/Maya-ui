import { ChatConversation } from "@/components/Chat/ChatConversation";
import { ChatInput } from "@/components/Input/ChatInput";

export function ChatPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-hidden">
        <ChatConversation />
      </div>
      <ChatInput />
    </div>
  );
}
