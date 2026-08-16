import { create } from "zustand";

import { api, DEFAULT_MODEL_REF } from "@/lib/api";
import type { OpenCodeEvent, SessionMessage } from "@/lib/api";
import {
  attachmentToPromptFile,
  fileToAttachment,
  type PendingAttachment,
} from "@/lib/files";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  /** True once the assistant message has a server completion timestamp. */
  completed?: boolean;
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
  attachments: PendingAttachment[];
  addAttachments: (files: File[]) => Promise<void>;
  removeAttachment: (id: string) => void;
  clearAttachments: () => void;
  connect: () => Promise<void>;
  disconnect: () => void;
  sendMessage: (text: string) => Promise<void>;
  stopGeneration: () => Promise<void>;
  pollMessages: () => Promise<void>;
  reset: () => void;
}

let eventController: AbortController | null = null;

function toChatMessage(message: SessionMessage): ChatMessage | null {
  const created =
    typeof message.time?.created === "number"
      ? message.time.created
      : typeof message.time?.created === "string"
        ? Date.parse(message.time.created)
        : Date.now();
  if (message.type === "user") {
    const text = message.text ?? message.prompt?.text ?? "";
    return { id: message.id, role: "user", content: text, createdAt: created };
  }
  if (message.type === "assistant") {
    const text = Array.isArray(message.content)
      ? message.content
          .filter(
            (part: { type?: string }) =>
              part?.type === "text" || part?.type === "reasoning",
          )
          .map((part: { text?: string }) => part.text ?? "")
          .join("")
      : message.text ?? "";
    return {
      id: message.id,
      role: "assistant",
      content: text,
      createdAt: created,
      completed: typeof message.time?.completed !== "undefined",
    };
  }
  if (message.type === "synthetic" || message.type === "system") {
    return { id: message.id, role: "assistant", content: message.text ?? "", createdAt: created };
  }
  return null;
}

function eventToDelta(event: OpenCodeEvent): { messageID: string; partID: string; delta: string } | null {
  switch (event.type) {
    case "session.next.text.delta":
      return {
        messageID: String(event.data.assistantMessageID ?? ""),
        partID: `text:${String(event.data.textID ?? "")}`,
        delta: String(event.data.delta ?? ""),
      };
    case "session.next.reasoning.delta":
      return {
        messageID: String(event.data.assistantMessageID ?? ""),
        partID: `reasoning:${String(event.data.reasoningID ?? "")}`,
        delta: String(event.data.delta ?? ""),
      };
    default:
      return null;
  }
}

/** Map of partID -> accumulated text for each assistant message. */
const assistantParts = new Map<string, Map<string, string>>();

function getParts(messageID: string): Map<string, string> {
  let parts = assistantParts.get(messageID);
  if (!parts) {
    parts = new Map();
    assistantParts.set(messageID, parts);
  }
  return parts;
}

function upsertAssistantDelta(
  state: ChatState,
  messageID: string,
  partID: string,
  delta: string,
): Pick<ChatState, "messages" | "thinking"> {
  const parts = getParts(messageID);
  parts.set(partID, (parts.get(partID) ?? "") + delta);
  const content = Array.from(parts.values()).join("");
  const assistant = state.messages.find((m) => m.id === messageID);
  if (assistant) {
    return {
      messages: state.messages.map((m) =>
        m.id === messageID ? { ...m, content } : m,
      ),
      thinking: false,
    };
  }
  return {
    messages: [
      ...state.messages,
      { id: messageID, role: "assistant", content, createdAt: Date.now() },
    ],
    thinking: false,
  };
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

function upsertAssistantPart(
  state: ChatState,
  messageID: string,
  partID: string,
  text: string,
): Pick<ChatState, "messages" | "thinking"> {
  const parts = getParts(messageID);
  parts.set(partID, text);
  const content = Array.from(parts.values()).join("");
  const assistant = state.messages.find((m) => m.id === messageID);
  if (assistant) {
    return {
      messages: state.messages.map((m) =>
        m.id === messageID ? { ...m, content } : m,
      ),
      thinking: false,
    };
  }
  return {
    messages: [
      ...state.messages,
      { id: messageID, role: "assistant", content, createdAt: Date.now() },
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
  attachments: [],

  addAttachments: async (files: File[]) => {
    const converted: PendingAttachment[] = [];
    for (const file of files) {
      try {
        converted.push(await fileToAttachment(file));
      } catch {
        // Skip unreadable files; keep the rest.
      }
    }
    if (converted.length > 0) {
      set((state) => ({ attachments: [...state.attachments, ...converted] }));
    }
  },

  removeAttachment: (id: string) => {
    set((state) => {
      const removed = state.attachments.find((a) => a.id === id);
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return { attachments: state.attachments.filter((a) => a.id !== id) };
    });
  },

  clearAttachments: () => {
    set((state) => {
      for (const a of state.attachments) {
        if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
      }
      return { attachments: [] };
    });
  },

  connect: async () => {
    if (get().connection === "connected") return;

    set({ connection: "connecting", error: null });
    eventController = new AbortController();

    try {
      let sessionID = get().sessionID;
      if (!sessionID) {
        // Select the production NVIDIA-backed model explicitly: sessions created
        // without a model fall back to an unconfigured provider and the run
        // fails with `missing_api_key` / empty replies.
        const { data } = await api.createSession({ model: DEFAULT_MODEL_REF });
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
   *  streaming responses). Updates existing assistant messages with newer
   *  server content so text renders progressively while the model generates,
   *  and clears the working indicator once the assistant message completes. */
  pollMessages: async () => {
    const { sessionID } = get();
    if (!sessionID) return;

    const { data: messages } = await api.listMessages(sessionID);
    const rendered = messages
      .map(toChatMessage)
      .filter((m): m is ChatMessage => m !== null);

    const byId = new Map(get().messages.map((m) => [m.id, m]));
    let changed = false;
    for (const message of rendered) {
      const existing = byId.get(message.id);
      if (
        !existing ||
        existing.content !== message.content ||
        existing.completed !== message.completed
      ) {
        byId.set(message.id, message);
        changed = true;
      }
    }
    if (changed) {
      const merged = Array.from(byId.values()).sort(
        (a, b) => a.createdAt - b.createdAt,
      );
      const hasRunning = merged.some(
        (m) => m.role === "assistant" && !m.completed,
      );
      useChatStore.setState({
        messages: merged,
        isStreaming: hasRunning,
        thinking: hasRunning,
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
    const { attachments } = get();
    if (!trimmed && attachments.length === 0) return;

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
      content: trimmed || attachments.map((a) => a.name).join(", "),
      createdAt: Date.now(),
    };
    set((state) => ({
      messages: [...state.messages, pending],
      isStreaming: true,
      thinking: true,
      error: null,
    }));

    try {
      const promptFiles = attachments
        .map(attachmentToPromptFile)
        .filter((f): f is NonNullable<typeof f> => f !== null);
      await api.prompt(currentSession, {
        prompt: { text: trimmed, ...(promptFiles.length > 0 ? { files: promptFiles } : {}) },
      });
      get().clearAttachments();
      // The prompt is admitted; begin progressive timeline polling right away
      // so assistant tokens render as they are produced instead of waiting
      // for the (tunnel-buffered) SSE stream to finish.
      if (eventController && !eventController.signal.aborted) {
        void startPolling(eventController.signal);
      }
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
    // Mark any in-flight assistant message as complete so the working
    // indicator clears and the progressive poller stops.
    set((state) => ({
      messages: state.messages.map((m) =>
        m.role === "assistant" && !m.completed ? { ...m, completed: true } : m,
      ),
      isStreaming: false,
      thinking: false,
    }));
  },

  reset: () => {
    get().disconnect();
    get().clearAttachments();
    set({ messages: [], sessionID: null, error: null, logs: [] });
  },
}));

/** Begin fast message-timeline polling so assistant text renders
 *  progressively. The poll loop stops when the abort signal fires or once
 *  every assistant message on the timeline is complete. */
const activePollers = new Set<AbortSignal>();

function startPolling(signal: AbortSignal): void {
  if (activePollers.has(signal) || signal.aborted) return;
  activePollers.add(signal);
  const poll = async () => {
    if (signal.aborted) {
      activePollers.delete(signal);
      return;
    }
    try {
      const { messages, isStreaming } = useChatStore.getState();
      await useChatStore.getState().pollMessages();
      // Stop when nothing is streaming anymore and the signal is still live.
      if (!isStreaming && !useChatStore.getState().isStreaming && !messages.some((m) => m.role === "assistant" && !m.completed)) {
        activePollers.delete(signal);
        useChatStore.setState({ isStreaming: false, thinking: false });
        return;
      }
    } catch {
      // Ignore transient poll failures; retry on the next tick.
    }
    setTimeout(poll, 900);
  };
  void poll();
}

async function streamEvents(signal: AbortSignal): Promise<void> {
  let streamEndedAt = 0;
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

  // Poll the message timeline continuously so assistant text renders
  // progressively even when the SSE stream is tunnel-buffered.
  startPolling(signal);

  try {
    for await (const event of api.subscribeEvents(signal)) {
      const { type, data } = event;

      if (type === "session.next.text.delta" || type === "session.next.reasoning.delta") {
        const { messageID, partID, delta } = eventToDelta(event) ?? {
          messageID: "",
          partID: "",
          delta: "",
        };
        if (!messageID || !partID || !delta) continue;
        useChatStore.setState((state) =>
          upsertAssistantDelta(state, messageID, partID, delta),
        );
        continue;
      }

      if (type === "session.next.text.ended") {
        const messageID = String(data.assistantMessageID ?? "");
        const partID = `text:${String(data.textID ?? "")}`;
        const text = String(data.text ?? "");
        if (!messageID || !partID) continue;
        useChatStore.setState((state) =>
          upsertAssistantPart(state, messageID, partID, text),
        );
      } else if (type === "session.next.reasoning.ended") {
        const messageID = String(data.assistantMessageID ?? "");
        const partID = `reasoning:${String(data.reasoningID ?? "")}`;
        const text = String(data.text ?? "");
        if (!messageID || !partID) continue;
        useChatStore.setState((state) =>
          upsertAssistantPart(state, messageID, partID, text),
        );
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
    // Polling is started at the top of streamEvents (and on every prompt) so
    // the timeline keeps rendering regardless of how the stream ended. Just
    // make sure the working indicator is cleared once the stream is done.
    if (!signal.aborted) {
      useChatStore.setState({ isStreaming: false, thinking: false });
    }
  }
}
