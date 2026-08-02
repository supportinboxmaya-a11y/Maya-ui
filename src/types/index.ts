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
