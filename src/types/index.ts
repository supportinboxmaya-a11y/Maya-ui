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
/* OmniRouter (API key gateway)                                        */
/* ------------------------------------------------------------------ */

export interface OmniUsage {
  requests: number;
  inputTokens: number;
  outputTokens: number;
}

export interface OmniLimit {
  /** Max requests per window. `null` = unlimited. */
  requests: number | null;
  /** Max tokens (input + output) per window. `null` = unlimited. */
  tokens: number | null;
}

export type OmniStatusPhase = "active" | "exhausted" | "disabled" | "error";

export interface OmniStatus {
  phase: OmniStatusPhase;
  message?: string;
}

export interface OmniKeyInfo {
  id: string;
  label: string;
  created: number;
  lastUsed?: number;
  enabled: boolean;
  usage: OmniUsage;
  limit?: OmniLimit;
  status: OmniStatus;
}

export type OmniRotationStrategy = "round-robin" | "lowest-usage";

export interface OmniConfig {
  enabled: boolean;
  baseURL: string;
  strategy: OmniRotationStrategy;
}

export interface OmniStats {
  keys: OmniKeyInfo[];
  total: OmniUsage;
  activeKeys: number;
  exhaustedKeys: number;
  totalLimit?: OmniLimit;
  currentKeyID?: string;
  strategy: OmniRotationStrategy;
  updated: number;
}

export interface OmniCreateInput {
  key: string;
  label?: string;
  limit?: OmniLimit;
}

export interface OmniUpdateInput {
  label?: string;
  enabled?: boolean;
  limit?: OmniLimit;
}

/* ------------------------------------------------------------------ */
/* Multi-user auth                                                     */
/* ------------------------------------------------------------------ */

export interface UserInfo {
  id: string;
  username: string;
  email: string;
  name?: string;
  avatar?: string;
  settings: Record<string, unknown>;
  time: {
    created: number;
    updated: number;
  };
}

export interface AuthResult {
  token: string;
  user: UserInfo;
}

export interface SignupInput {
  username: string;
  email: string;
  password: string;
  name?: string;
}

export interface LoginInput {
  identifier: string;
  password: string;
}

export interface ProfileInput {
  name?: string;
  avatar?: string;
}

export interface PasswordChangeInput {
  current: string;
  next: string;
}
