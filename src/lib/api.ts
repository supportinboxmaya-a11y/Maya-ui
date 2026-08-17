import { authHeaders, getEnv } from "@/lib/env";
import type { ModelInfo, ModelRefInput } from "@/types";

/**
 * Minimal typed client for the OpenCode server API
 * (https://opencode.ai). Uses the v2 HTTP surface served
 * by `opencode serve`:
 *
 *   GET  /api/health
 *   GET  /api/model
 *   GET  /api/agent
 *   GET  /api/provider
 *   GET  /api/skill
 *   GET  /api/command
 *   GET  /api/reference
 *   GET  /api/integration
 *   GET  /api/location
 *   GET  /api/fs/list
 *   GET  /api/fs/find
 *   GET  /api/session
 *   POST /api/session
 *   POST /api/session/:id/prompt
 *   GET  /api/session/:id/message
 *   POST /api/session/:id/model
 *   POST /api/session/:id/agent
 *   POST /api/session/:id/interrupt
 *   GET  /api/session/:id/context
 *   GET  /api/session/:id/history
 *   GET  /api/session/:id/event
 *   POST /api/session/:id/compact
 *   POST /api/session/:id/wait
 *   POST /api/session/:id/revert/stage
 *   POST /api/session/:id/revert/clear
 *   POST /api/session/:id/revert/commit
 *   GET  /api/pty
 *   POST /api/pty
 *   GET  /api/pty/:ptyID
 *   PUT  /api/pty/:ptyID
 *   DELETE /api/pty/:ptyID
 *   POST /api/pty/:ptyID/connect-token
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

export interface SessionInfo {
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
  model?: ModelRefInput;
}

interface PromptPayload {
  prompt: { text: string };
  delivery?: "steer" | "queue";
}

/** Attachment sent with a prompt. `uri` is a data: URI carrying the file
 *  bytes; the OpenCode backend decodes it and hands it to the model. */
export interface PromptFileAttachment {
  uri: string;
  mime: string;
  name?: string;
}

export interface SessionMessage {
  id: string;
  type: string;
  text?: string;
  prompt?: { text: string };
  content?: unknown;
  time?: { created: number | string; completed?: number | string };
}

export interface OpenCodeEvent {
  id: string;
  type: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  location?: unknown;
  durable?: { aggregateID: string; seq: number; version: number };
}

// Additional types for backend API
export interface AgentInfo {
  id: string;
  name: string;
  description?: string;
}

export interface ProviderInfo {
  id: string;
  name: string;
  models: string[];
  status?: string;
}

export interface SkillInfo {
  id: string;
  name: string;
  description?: string;
}

export interface CommandInfo {
  id: string;
  name: string;
  description?: string;
}

export interface ReferenceInfo {
  id: string;
  name: string;
  path?: string;
}

export interface IntegrationInfo {
  id: string;
  name: string;
  description?: string;
  methods?: Array<{ id: string; name: string }>;
}

export interface LocationInfo {
  directory?: string;
  workspace?: string;
  project?: string;
}

export interface PtyInfo {
  id: string;
  title: string;
  cwd: string;
  status: "running" | "exited";
  exitCode?: number;
  cols: number;
  rows: number;
}

export interface PtyCreateInput {
  cwd?: string;
  cols?: number;
  rows?: number;
  title?: string;
}

export interface PtyUpdateInput {
  title?: string;
  cols?: number;
  rows?: number;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const { apiUrl } = getEnv();
  const headers = new Headers(init.headers);
  // OpenCode server routes authenticate with Basic credentials.
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

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) query.set(key, String(value));
  }
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return suffix;
}

export const api = {
  async health(): Promise<{ healthy: boolean }> {
    const { apiUrl } = getEnv();
    const headers = new Headers(authHeaders());
    const response = await fetch(`${apiUrl}/api/health`, { headers });
    if (!response.ok) throw new ApiError(response.status, await response.text());
    return (await response.json()) as { healthy: boolean };
  },

  // Models
  async listModels(): Promise<{ data: ModelInfo[] }> {
    return request("/api/model");
  },

  // Agents
  async listAgents(): Promise<{ data: AgentInfo[] }> {
    return request("/api/agent");
  },

  // Providers
  async listProviders(): Promise<{ data: ProviderInfo[] }> {
    return request("/api/provider");
  },

  // Skills
  async listSkills(): Promise<{ data: SkillInfo[] }> {
    return request("/api/skill");
  },

  // Commands
  async listCommands(): Promise<{ data: CommandInfo[] }> {
    return request("/api/command");
  },

  // References
  async listReferences(): Promise<{ data: ReferenceInfo[] }> {
    return request("/api/reference");
  },

  // Integrations
  async listIntegrations(): Promise<{ data: IntegrationInfo[] }> {
    return request("/api/integration");
  },

  // Location
  async getLocation(): Promise<{ data: LocationInfo }> {
    return request("/api/location");
  },

  // Filesystem
  /** List directory entries. `path` is resolved against the server's
   *  runtime context (the Location pinned to the request). */
  async fsList(path?: string): Promise<{ data: unknown }> {
    return request(`/api/fs/list${buildQuery({ path })}`);
  },

  /** Find files matching a query. */
  async fsFind(query: {
    query: string;
    type?: "file" | "directory";
    limit?: number;
  }): Promise<{ data: unknown }> {
    return request(`/api/fs/find${buildQuery(query)}`);
  },

  // Sessions
  async listSessions(): Promise<{ data: SessionInfo[] }> {
    return request("/api/session");
  },

  async createSession(input: SessionCreateInput = {}): Promise<{ data: SessionInfo }> {
    return request("/api/session", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async getSession(sessionID: string): Promise<{ data: SessionInfo }> {
    return request(`/api/session/${encodeURIComponent(sessionID)}`);
  },

  async switchAgent(sessionID: string, agent: string): Promise<void> {
    return request(`/api/session/${encodeURIComponent(sessionID)}/agent`, {
      method: "POST",
      body: JSON.stringify({ agent }),
    });
  },

  async switchModel(sessionID: string, model: ModelRefInput): Promise<void> {
    return request(`/api/session/${encodeURIComponent(sessionID)}/model`, {
      method: "POST",
      body: JSON.stringify({ model }),
    });
  },

  async prompt(
    sessionID: string,
    input: PromptPayload & { prompt?: { text: string; files?: PromptFileAttachment[] } },
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

  async getContext(sessionID: string): Promise<{ data: SessionMessage[] }> {
    return request(`/api/session/${encodeURIComponent(sessionID)}/context`);
  },

  async getHistory(
    sessionID: string,
    params: { limit?: number; after?: number } = {}
  ): Promise<{ data: OpenCodeEvent[]; hasMore: boolean }> {
    return request(`/api/session/${encodeURIComponent(sessionID)}/history${buildQuery(params)}`);
  },

  async *subscribeSessionEvents(
    sessionID: string,
    signal?: AbortSignal,
    after?: number
  ): AsyncGenerator<OpenCodeEvent> {
    const { apiUrl } = getEnv();
    const query = after ? `?after=${after}` : "";
    const headers = new Headers({
      ...authHeaders(),
      Accept: "text/event-stream",
    });
    const response = await fetch(`${apiUrl}/api/session/${encodeURIComponent(sessionID)}/event${query}`, {
      headers,
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

  async compact(sessionID: string): Promise<void> {
    return request(`/api/session/${encodeURIComponent(sessionID)}/compact`, {
      method: "POST",
    });
  },

  async wait(sessionID: string): Promise<void> {
    return request(`/api/session/${encodeURIComponent(sessionID)}/wait`, {
      method: "POST",
    });
  },

  async stageRevert(sessionID: string, messageID: string, files?: boolean): Promise<{ data: unknown }> {
    return request(`/api/session/${encodeURIComponent(sessionID)}/revert/stage`, {
      method: "POST",
      body: JSON.stringify({ messageID, files }),
    });
  },

  async clearRevert(sessionID: string): Promise<void> {
    return request(`/api/session/${encodeURIComponent(sessionID)}/revert/clear`, {
      method: "POST",
    });
  },

  async commitRevert(sessionID: string): Promise<void> {
    return request(`/api/session/${encodeURIComponent(sessionID)}/revert/commit`, {
      method: "POST",
    });
  },

  async interrupt(sessionID: string): Promise<void> {
    return request(`/api/session/${encodeURIComponent(sessionID)}/interrupt`, {
      method: "POST",
    });
  },

  // PTY
  async listPty(): Promise<{ data: PtyInfo[] }> {
    return request("/api/pty");
  },

  async createPty(input: PtyCreateInput = {}): Promise<{ data: PtyInfo }> {
    return request("/api/pty", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async getPty(ptyID: string): Promise<{ data: PtyInfo }> {
    return request(`/api/pty/${encodeURIComponent(ptyID)}`);
  },

  async updatePty(ptyID: string, input: PtyUpdateInput): Promise<{ data: PtyInfo }> {
    return request(`/api/pty/${encodeURIComponent(ptyID)}`, {
      method: "PUT",
      body: JSON.stringify(input),
    });
  },

  async deletePty(ptyID: string): Promise<void> {
    return request(`/api/pty/${encodeURIComponent(ptyID)}`, {
      method: "DELETE",
    });
  },

  async createPtyConnectToken(ptyID: string): Promise<{ data: { ticket: string } }> {
    return request(`/api/pty/${encodeURIComponent(ptyID)}/connect-token`, {
      method: "POST",
    });
  },

  // Global event stream
  /**
   * Open the server's SSE event stream. The server pushes session
   * events (message parts, tool calls, lifecycle) as JSON payloads
   * under `data:` lines. Returns an abortable stream of parsed events.
   */
  async *subscribeEvents(
    signal?: AbortSignal,
  ): AsyncGenerator<OpenCodeEvent> {
    const { apiUrl } = getEnv();
    const headers = new Headers({
      ...authHeaders(),
      Accept: "text/event-stream",
    });
    const response = await fetch(`${apiUrl}/api/event`, {
      headers,
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