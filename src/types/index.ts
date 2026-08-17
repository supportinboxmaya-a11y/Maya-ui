export type MessageRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}

export type WorkspaceId = string;

export interface Workspace {
  id: WorkspaceId;
  title: string;
  updatedAt: string;
}

export type WorkspaceTab = "logs" | "files" | "terminal" | "preview";

export type WorkspaceSize = "compact" | "medium" | "full";

export type BottomSheetState = "closed" | "workspace" | "attach";

export type DrawerSide = "left" | "right";

/* ------------------------------------------------------------------ */
/* Models                                                              */
/* ------------------------------------------------------------------ */

export interface ModelInfo {
  id: string;
  providerID: string;
  family?: string;
  name: string;
  capabilities: {
    tools: boolean;
    input: string[];
    output: string[];
  };
  request: {
    headers: Record<string, string>;
    body: Record<string, unknown>;
    variant?: string;
  };
  variants: Array<{
    id: string;
    headers: Record<string, string>;
    body: Record<string, unknown>;
    variant?: string;
  }>;
  time: {
    released: number;
  };
  cost: Array<{
    tier?: { type: "context"; size: number };
    input: number;
    output: number;
    cache: { read: number; write: number };
  }>;
  status: "alpha" | "beta" | "deprecated" | "active";
  enabled: boolean;
  limit: {
    context: number;
    input?: number;
    output: number;
  };
}

export type ModelRefInput = {
  id: string;
  providerID: string;
  variant?: string;
};

/* ------------------------------------------------------------------ */
/* Agents, Providers, Skills, Commands, References, Integrations      */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/* PTY                                                                */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/* Session Events                                                     */
/* ------------------------------------------------------------------ */

export type StatusPhase = "active" | "warning" | "inactive" | "error";

/* ------------------------------------------------------------------ */
/* Session                                                            */
/* ------------------------------------------------------------------ */

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

export interface OpenCodeEvent {
  id: string;
  type: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  location?: unknown;
  durable?: { aggregateID: string; seq: number; version: number };
}