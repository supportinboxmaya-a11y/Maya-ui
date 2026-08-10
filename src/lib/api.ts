import { authHeaders, getEnv } from "@/lib/env";
import type {
  AuthResult,
  LoginInput,
  OmniConfig,
  OmniCreateInput,
  OmniKeyInfo,
  OmniStats,
  OmniUpdateInput,
  PasswordChangeInput,
  ProfileInput,
  SignupInput,
  UserInfo,
} from "@/types";

/**
 * Holds the current session token. Set by the auth store after login/signup;
 * read by `request()` to attach `Authorization: Bearer <token>`.
 */
let authToken: string | undefined;

export function setAuthToken(token: string | undefined) {
  authToken = token;
}

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

/** Paths served by the multi-user auth API. These require a Bearer
 *  session token issued by signup/login, and never Basic credentials. */
function isUserAuthPath(path: string): boolean {
  return path.startsWith("/api/auth/") || path.startsWith("/api/user");
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const { apiUrl } = getEnv();
  const headers = new Headers(init.headers);
  if (isUserAuthPath(path)) {
    if (authToken) headers.set("Authorization", `Bearer ${authToken}`);
  } else {
    // OpenCode server routes authenticate with Basic credentials.
    for (const [key, value] of Object.entries(authHeaders())) {
      headers.set(key, value);
    }
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
    const headers = new Headers(authHeaders());
    const response = await fetch(`${apiUrl}/api/health`, { headers });
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

  /** List directory entries. `path` is resolved against the server's
   *  runtime context (the Location pinned to the request). */
  async fsList(path?: string): Promise<{ data: unknown }> {
    const query = new URLSearchParams();
    if (path) query.set("path", path);
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return request(`/api/fs/list${suffix}`);
  },

  /** Find files matching a query. */
  async fsFind(query: {
    query: string;
    type?: "file" | "directory";
    limit?: number;
  }): Promise<{ data: unknown }> {
    const params = new URLSearchParams({ query: query.query });
    if (query.type) params.set("type", query.type);
    if (query.limit) params.set("limit", String(query.limit));
    return request(`/api/fs/find?${params.toString()}`);
  },

  async listModels(): Promise<{ data: { id: string; label?: string }[] }> {
    return request("/api/model");
  },

  /* ---------------------------- OmniRouter --------------------------- */

  /** Current runtime config (enabled, base URL, rotation strategy). */
  async omniConfig(): Promise<{ data: OmniConfig }> {
    return request("/api/omni-router/config");
  },

  /** Update OmniRouter config. */
  async omniSetConfig(
    input: Partial<Pick<OmniConfig, "enabled" | "baseURL" | "strategy">>,
  ): Promise<void> {
    return request("/api/omni-router/config", {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },

  /** List every stored key with live usage and status. */
  async omniListKeys(): Promise<{ data: OmniKeyInfo[] }> {
    return request("/api/omni-router/key");
  },

  /** Add a new API key to the pool. */
  async omniAddKey(input: OmniCreateInput): Promise<{ data: OmniKeyInfo }> {
    return request("/api/omni-router/key", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  /** Update a stored key (label, enabled, limit). */
  async omniUpdateKey(
    keyID: string,
    input: OmniUpdateInput,
  ): Promise<{ data: OmniKeyInfo | undefined }> {
    return request(`/api/omni-router/key/${encodeURIComponent(keyID)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },

  /** Remove a key from the pool. */
  async omniRemoveKey(keyID: string): Promise<void> {
    return request(`/api/omni-router/key/${encodeURIComponent(keyID)}`, {
      method: "DELETE",
    });
  },

  /** Rotate to the next usable key. Returns the key now in use. */
  async omniRotate(
    input: { resetUsage?: boolean; prioritize?: boolean } = {},
  ): Promise<{ data: OmniKeyInfo | undefined }> {
    return request("/api/omni-router/rotate", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  /** Reset a key's usage counters. */
  async omniResetUsage(keyID: string): Promise<void> {
    return request(
      `/api/omni-router/key/${encodeURIComponent(keyID)}/reset-usage`,
      { method: "POST" },
    );
  },

  /** Aggregate usage stats across the key pool. */
  async omniStats(): Promise<{ data: OmniStats }> {
    return request("/api/omni-router/stats");
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

  /* ----------------------------- Auth ------------------------------ */

  async signup(input: SignupInput): Promise<AuthResult> {
    return request("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async login(input: LoginInput): Promise<AuthResult> {
    return request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async logout(): Promise<void> {
    return request("/api/auth/logout", {
      method: "POST",
      body: JSON.stringify({}),
    });
  },

  async requestPasswordReset(identifier: string): Promise<{ token: string }> {
    return request("/api/auth/reset-password/request", {
      method: "POST",
      body: JSON.stringify({ identifier }),
    });
  },

  async confirmPasswordReset(token: string, password: string): Promise<void> {
    return request("/api/auth/reset-password/confirm", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    });
  },

  async me(): Promise<UserInfo> {
    return request("/api/user");
  },

  async updateProfile(input: ProfileInput): Promise<UserInfo> {
    return request("/api/user", {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },

  async updateSettings(settings: Record<string, unknown>): Promise<UserInfo> {
    return request("/api/user/settings", {
      method: "PUT",
      body: JSON.stringify(settings),
    });
  },

  async changePassword(input: PasswordChangeInput): Promise<void> {
    return request("/api/user/password", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
};
