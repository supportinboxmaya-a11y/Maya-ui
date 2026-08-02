import { create } from "zustand";

import type { BottomSheetState, WorkspaceSize, WorkspaceTab } from "@/types";

interface UiState {
  isDrawerOpen: boolean;
  bottomSheet: BottomSheetState;
  workspaceTab: WorkspaceTab;
  workspaceSize: WorkspaceSize;
  setDrawerOpen: (open: boolean) => void;
  toggleDrawer: () => void;
  openBottomSheet: (state: BottomSheetState) => void;
  closeBottomSheet: () => void;
  setWorkspaceTab: (tab: WorkspaceTab) => void;
  setWorkspaceSize: (size: WorkspaceSize) => void;
}

export const useUiStore = create<UiState>((set) => ({
  isDrawerOpen: false,
  bottomSheet: "closed",
  workspaceTab: "logs",
  workspaceSize: "compact",
  setDrawerOpen: (open) => set({ isDrawerOpen: open }),
  toggleDrawer: () => set((s) => ({ isDrawerOpen: !s.isDrawerOpen })),
  openBottomSheet: (state) => set({ bottomSheet: state }),
  closeBottomSheet: () => set({ bottomSheet: "closed" }),
  setWorkspaceTab: (tab) => set({ workspaceTab: tab }),
  setWorkspaceSize: (size) => set({ workspaceSize: size }),
}));
