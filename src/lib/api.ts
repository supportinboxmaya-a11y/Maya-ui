import { authHeaders, getEnv } from "@/lib/env";

/**
 * Minimal typed client for the OpenCode server API
 * (https://opencode.ai). Uses the v2 HTTP surface served
 * by `opencode serve`:
 *
 *   GET  /api/health
 *   GET  /api/model
 *   GET  /api/session
 *   POST /api/session
 *   POST /api/session/:id/prompt
 *   GET  /api/session/:id/message
 *   GET  /api/event  (SSE)
 */

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown) {
    super(`OpenCode API error ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

interface SessionInfo {
  id: string;
  title: string;
  model?: string;
  agent?: string;
  time: {
    created: number;
    updated: number;
    archived?: number;
  };
}

interface SessionCreateInput {
  agent?: string;
  model?: string;
}

interface PromptPayload {
  prompt: { text: string };
  delivery?: "steer" | "queue";
}

export interface SessionMessage {
  id: string;
  type: string;
  role?: "user" | "assistant";
  text?: string;
  content?: unknown;
  time?: { created: number; completed?: number };
}

export interface OpenCodeEvent {
  id: string;
  type: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  location?: unknown;
  durable?: { aggregateID: string; seq: number; version: number };
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const { apiUrl } = getEnv();
  const headers = new Headers(init.headers);
  for (const [key, value] of Object.entries(authHeaders())) {
    headers.set(key, value);
  }
  if (init.body !== undefined && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(`${apiUrl}${path}`, { ...init, headers });

  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = await response.text().catch(() => undefined);
    }
    throw new ApiError(response.status, body);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  async health(): Promise<{ healthy: boolean }> {
    const { apiUrl } = getEnv();
    const response = await fetch(`${apiUrl}/api/health`, {
      headers: authHeaders(),
    });
    if (!response.ok) throw new ApiError(response.status, await response.text());
    return (await response.json()) as { healthy: boolean };
  },

  async listSessions(): Promise<{ data: SessionInfo[] }> {
    return request("/api/session");
  },

  async createSession(input: SessionCreateInput = {}): Promise<{ data: SessionInfo }> {
    return request("/api/session", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async prompt(
    sessionID: string,
    input: PromptPayload,
  ): Promise<{ data: unknown }> {
    return request(`/api/session/${encodeURIComponent(sessionID)}/prompt`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async listMessages(
    sessionID: string,
  ): Promise<{ data: SessionMessage[] }> {
    return request(`/api/session/${encodeURIComponent(sessionID)}/message`);
  },

  async interrupt(sessionID: string): Promise<void> {
    return request(`/api/session/${encodeURIComponent(sessionID)}/interrupt`, {
      method: "POST",
    });
  },

  async listModels(): Promise<{ data: { id: string; label?: string }[] }> {
    return request("/api/model");
  },

  /**
   * Open the server's SSE event stream. The server pushes session
   * events (message parts, tool calls, lifecycle) as JSON payloads
   * under `data:` lines. Returns an abortable stream of parsed events.
   */
  async *subscribeEvents(
    signal?: AbortSignal,
  ): AsyncGenerator<OpenCodeEvent> {
    const { apiUrl } = getEnv();
    const response = await fetch(`${apiUrl}/api/event`, {
      headers: {
        ...authHeaders(),
        Accept: "text/event-stream",
      },
      signal,
    });
    if (!response.ok || !response.body) {
      throw new ApiError(response.status, await response.text().catch(() => undefined));
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        buffer = buffer.replaceAll("\r\n", "\n").replaceAll("\r", "\n");

        let boundary = buffer.indexOf("\n\n");
        while (boundary >= 0) {
          const block = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          const data = block
            .split("\n")
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.slice(5).trimStart())
            .join("\n");
          if (data) {
            try {
              yield JSON.parse(data) as OpenCodeEvent;
            } catch {
              // Ignore malformed frames; keep streaming.
            }
          }
          boundary = buffer.indexOf("\n\n");
        }
      }
    } finally {
      reader.releaseLock();
    }
  },
};
