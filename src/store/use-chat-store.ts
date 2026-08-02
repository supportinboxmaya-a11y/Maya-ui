import { create } from "zustand";

import { api } from "@/lib/api";
import type { OpenCodeEvent, SessionMessage } from "@/lib/api";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
}

type ConnectionStatus = "idle" | "connecting" | "connected" | "error";

interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  connection: ConnectionStatus;
  error: string | null;
  sessionID: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  sendMessage: (text: string) => Promise<void>;
  reset: () => void;
}

let eventController: AbortController | null = null;

function toChatMessage(message: SessionMessage): ChatMessage | null {
  const created = message.time?.created ?? Date.now();
  if (message.type === "user") {
    return {
      id: message.id,
      role: "user",
      content: message.text ?? "",
      createdAt: created,
    };
  }
  if (message.type === "assistant") {
    const text =
      Array.isArray(message.content)
        ? message.content
            .filter((part: { type?: string }) => part?.type === "text")
            .map((part: { text?: string }) => part.text ?? "")
            .join("")
        : message.text ?? "";
    return {
      id: message.id,
      role: "assistant",
      content: text,
      createdAt: created,
    };
  }
  return null;
}

function eventToDelta(event: OpenCodeEvent): { messageID: string; delta: string } | null {
  switch (event.type) {
    case "session.next.text.delta":
    case "session.next.reasoning.delta":
      return {
        messageID: String(event.data.assistantMessageID ?? ""),
        delta: String(event.data.delta ?? ""),
      };
    default:
      return null;
  }
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isStreaming: false,
  connection: "idle",
  error: null,
  sessionID: null,

  connect: async () => {
    if (get().connection === "connected") return;

    set({ connection: "connecting", error: null });
    eventController = new AbortController();

    try {
      let sessionID = get().sessionID;
      if (!sessionID) {
        const { data } = await api.createSession();
        sessionID = data.id;
        set({ sessionID });
      }

      const { data: messages } = await api.listMessages(sessionID);
      const rendered = messages
        .map(toChatMessage)
        .filter((m): m is ChatMessage => m !== null);
      set({ messages: rendered, connection: "connected" });

      void streamEvents(eventController.signal);
    } catch (error) {
      set({
        connection: "error",
        error: error instanceof Error ? error.message : "Failed to connect",
      });
    }
  },

  disconnect: () => {
    eventController?.abort();
    eventController = null;
    set({ connection: "idle", isStreaming: false });
  },

  sendMessage: async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const { sessionID, connection } = get();
    if (!sessionID || connection !== "connected") {
      await get().connect();
    }
    const currentSession = get().sessionID;
    if (!currentSession) {
      set({ error: "No active session" });
      return;
    }

    const pending: ChatMessage = {
      id: `local-${Date.now()}`,
      role: "user",
      content: trimmed,
      createdAt: Date.now(),
    };
    set((state) => ({
      messages: [...state.messages, pending],
      isStreaming: true,
      error: null,
    }));

    try {
      await api.prompt(currentSession, { prompt: { text: trimmed } });
    } catch (error) {
      set({
        isStreaming: false,
        error: error instanceof Error ? error.message : "Failed to send message",
      });
    }
  },

  reset: () => {
    get().disconnect();
    set({ messages: [], sessionID: null, error: null });
  },
}));

async function streamEvents(signal: AbortSignal): Promise<void> {
  try {
    for await (const event of api.subscribeEvents(signal)) {
      const { type, data } = event;

      if (type === "session.next.text.delta" || type === "session.next.reasoning.delta") {
        const { messageID, delta } = eventToDelta(event) ?? { messageID: "", delta: "" };
        if (!messageID || !delta) continue;

        useChatStore.setState((state) => {
          const assistant = state.messages.find((m) => m.id === messageID);
          if (assistant) {
            return {
              messages: state.messages.map((m) =>
                m.id === messageID
                  ? { ...m, content: m.content + delta }
                  : m,
              ),
            };
          }
          return {
            messages: [
              ...state.messages,
              {
                id: messageID,
                role: "assistant",
                content: delta,
                createdAt: Date.now(),
              },
            ],
          };
        });
        continue;
      }

      if (type === "session.next.text.ended") {
        const messageID = String(data.assistantMessageID ?? "");
        const text = String(data.text ?? "");
        useChatStore.setState((state) => ({
          messages: state.messages.map((m) =>
            m.id === messageID ? { ...m, content: text } : m,
          ),
        }));
        continue;
      }

      if (type === "session.next.step.ended" || type === "session.next.step.failed") {
        useChatStore.setState({ isStreaming: false });
        continue;
      }

      if (type === "session.next.step.started") {
        useChatStore.setState({ isStreaming: true });
      }
    }
  } catch (error) {
    if (signal.aborted) return;
    useChatStore.setState({
      connection: "error",
      error: error instanceof Error ? error.message : "Stream disconnected",
    });
  }
}
