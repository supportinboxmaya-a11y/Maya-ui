import { create } from "zustand";

import { api } from "@/lib/api";
import type { OpenCodeEvent, SessionMessage } from "@/lib/api";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
}

interface ChatLogEntry {
  id: string;
  title: string;
  detail: string;
  timestamp: number;
  kind: "info" | "tool" | "error";
}

type ConnectionStatus = "idle" | "connecting" | "connected" | "error";

interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  thinking: boolean;
  connection: ConnectionStatus;
  error: string | null;
  sessionID: string | null;
  logs: ChatLogEntry[];
  connect: () => Promise<void>;
  disconnect: () => void;
  sendMessage: (text: string) => Promise<void>;
  stopGeneration: () => Promise<void>;
  pollMessages: () => Promise<void>;
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

function logFromEvent(event: OpenCodeEvent): ChatLogEntry | null {
  const { type, data } = event;
  const now = Date.now();
  const id = event.id || `${type}-${now}`;
  const sessionID = String(data.sessionID ?? "");

  switch (type) {
    case "session.next.step.started":
      return {
        id,
        title: "Step started",
        detail: `Agent ${String(data.agent ?? "?")} · ${String(data.model ?? "?")}`,
        timestamp: now,
        kind: "info",
      };
    case "session.next.step.ended":
      return {
        id,
        title: "Step completed",
        detail: `Finish: ${String(data.finish ?? "done")}`,
        timestamp: now,
        kind: "info",
      };
    case "session.next.step.failed":
      return {
        id,
        title: "Step failed",
        detail: String((data.error as { message?: unknown } | undefined)?.message ?? "Unknown error"),
        timestamp: now,
        kind: "error",
      };
    case "session.next.text.started":
      return {
        id,
        title: "Assistant message started",
        detail: `Message ${String(data.assistantMessageID ?? "")}`,
        timestamp: now,
        kind: "info",
      };
    case "session.next.text.ended":
      return {
        id,
        title: "Assistant message completed",
        detail: `Message ${String(data.assistantMessageID ?? "")}`,
        timestamp: now,
        kind: "info",
      };
    case "session.next.reasoning.started":
      return {
        id,
        title: "Reasoning started",
        detail: `Message ${String(data.assistantMessageID ?? "")}`,
        timestamp: now,
        kind: "info",
      };
    case "session.next.reasoning.ended":
      return {
        id,
        title: "Reasoning completed",
        detail: `Message ${String(data.assistantMessageID ?? "")}`,
        timestamp: now,
        kind: "info",
      };
    case "session.next.tool.input.started":
      return {
        id,
        title: "Tool call started",
        detail: `${String(data.tool ?? data.name ?? "tool")} · ${String(data.callID ?? "")}`,
        timestamp: now,
        kind: "tool",
      };
    case "session.next.tool.input.ended":
      return {
        id,
        title: "Tool call completed",
        detail: `${String(data.tool ?? data.name ?? "tool")} · ${String(data.callID ?? "")}`,
        timestamp: now,
        kind: "tool",
      };
    case "session.status": {
      const statusType = String((data.status as { type?: string })?.type ?? "unknown");
      return {
        id,
        title: "Session status",
        detail: `Status: ${statusType}`,
        timestamp: now,
        kind: "info",
      };
    }
    case "session.idle":
      return {
        id,
        title: "Session idle",
        detail: sessionID ? `Session ${sessionID}` : "Waiting for work",
        timestamp: now,
        kind: "info",
      };
    case "session.next.prompt.admitted": {
      const prompt = data.prompt as { text?: string } | undefined;
      const delivery = String(data.delivery ?? "steer");
      return {
        id,
        title: "Prompt admitted",
        detail: `${delivery}${prompt?.text ? ` · ${prompt.text}` : ""}`,
        timestamp: now,
        kind: "info",
      };
    }
    default:
      return null;
  }
}

function upsertAssistantDelta(
  state: ChatState,
  messageID: string,
  delta: string,
): Pick<ChatState, "messages" | "thinking"> {
  const assistant = state.messages.find((m) => m.id === messageID);
  if (assistant) {
    return {
      messages: state.messages.map((m) =>
        m.id === messageID ? { ...m, content: m.content + delta } : m,
      ),
      thinking: false,
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
    thinking: false,
  };
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isStreaming: false,
  thinking: false,
  connection: "idle",
  error: null,
  sessionID: null,
  logs: [],

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

  /** Poll the message timeline to pick up new activity. Used when the
   *  live SSE stream is unavailable (e.g. behind a proxy that buffers
   *  streaming responses). Merges messages without duplicating. */
  pollMessages: async () => {
    const { sessionID } = get();
    if (!sessionID) return;

    const { data: messages } = await api.listMessages(sessionID);
    const rendered = messages
      .map(toChatMessage)
      .filter((m): m is ChatMessage => m !== null);

    const existing = new Map(get().messages.map((m) => [m.id, m]));
    let changed = false;
    for (const message of rendered) {
      if (!existing.has(message.id)) {
        existing.set(message.id, message);
        changed = true;
      }
    }
    if (changed) {
      const merged = Array.from(existing.values()).sort(
        (a, b) => a.createdAt - b.createdAt,
      );
      useChatStore.setState({
        messages: merged,
        isStreaming: merged.some((m) => m.role === "assistant" && m.content === ""),
        thinking: false,
      });
    }
  },

  disconnect: () => {
    eventController?.abort();
    eventController = null;
    set({ connection: "idle", isStreaming: false, thinking: false });
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
      thinking: true,
      error: null,
    }));

    try {
      await api.prompt(currentSession, { prompt: { text: trimmed } });
    } catch (error) {
      set({
        isStreaming: false,
        thinking: false,
        error: error instanceof Error ? error.message : "Failed to send message",
      });
    }
  },

  stopGeneration: async () => {
    const { sessionID } = get();
    if (!sessionID) return;
    try {
      await api.interrupt(sessionID);
    } catch {
      // Ignore interrupt errors; session may already be idle.
    }
    set({ isStreaming: false, thinking: false });
  },

  reset: () => {
    get().disconnect();
    set({ messages: [], sessionID: null, error: null, logs: [] });
  },
}));

async function streamEvents(signal: AbortSignal): Promise<void> {
  let streamEndedAt = 0;
  let receivedAnyEvent = false;
  const endStream = () => {
    if (streamEndedAt === 0) streamEndedAt = Date.now();
  };
  const idleTimer = setInterval(() => {
    if (streamEndedAt === 0) return;
    if (Date.now() - streamEndedAt >= 2000) {
      clearInterval(idleTimer);
      useChatStore.setState({ isStreaming: false, thinking: false });
    }
  }, 1000);

  // If the SSE stream is unusable (proxies/edge tunnels that buffer or drop
  // streaming responses), fall back to polling the message timeline so the
  // chat still works. Polling stops once the abort signal fires.
  let pollingStarted = false;
  const startPolling = () => {
    if (pollingStarted || signal.aborted) return;
    pollingStarted = true;
    const poll = async () => {
      if (signal.aborted) return;
      try {
        await useChatStore.getState().pollMessages();
      } catch {
        // Ignore transient poll failures; retry on the next tick.
      }
      setTimeout(poll, 2500);
    };
    void poll();
  };

  try {
    for await (const event of api.subscribeEvents(signal)) {
      receivedAnyEvent = true;
      const { type, data } = event;

      if (type === "session.next.text.delta" || type === "session.next.reasoning.delta") {
        const { messageID, delta } = eventToDelta(event) ?? { messageID: "", delta: "" };
        if (!messageID || !delta) continue;
        useChatStore.setState((state) => upsertAssistantDelta(state, messageID, delta));
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
      } else if (type === "session.next.step.ended" || type === "session.next.step.failed") {
        useChatStore.setState({ isStreaming: false, thinking: false });
        endStream();
      } else if (type === "session.next.step.started") {
        useChatStore.setState({ isStreaming: true, thinking: false });
        streamEndedAt = 0;
      } else if (type === "session.status") {
        // The server emits `session.status` with { type: "idle" } when a run
        // finishes OR is cancelled (Stop Generation), so treat idle as the
        // authoritative "streaming done" signal.
        const status = (data.status as { type?: string } | undefined)?.type;
        if (status === "idle") {
          useChatStore.setState({ isStreaming: false, thinking: false });
          endStream();
        }
      }

      const entry = logFromEvent(event);
      if (entry) {
        useChatStore.setState((state) => ({
          logs: [...state.logs.slice(-49), entry],
        }));
      }
    }
  } catch (error) {
    if (signal.aborted) return;
    useChatStore.setState({
      connection: "error",
      isStreaming: false,
      thinking: false,
      error: error instanceof Error ? error.message : "Stream disconnected",
    });
  } finally {
    clearInterval(idleTimer);
    // The stream closed without delivering any event: treat the live stream
    // as unavailable and keep the chat usable via message polling.
    if (!receivedAnyEvent && !signal.aborted) {
      startPolling();
    }
  }
}
