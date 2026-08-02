import { create } from "zustand";

import type { BottomSheetState } from "@/types";

interface UiState {
  isDrawerOpen: boolean;
  bottomSheet: BottomSheetState;
  setDrawerOpen: (open: boolean) => void;
  openBottomSheet: (state: BottomSheetState) => void;
  closeBottomSheet: () => void;
  toggleDrawer: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  isDrawerOpen: false,
  bottomSheet: "closed",
  setDrawerOpen: (open) => set({ isDrawerOpen: open }),
  openBottomSheet: (state) => set({ bottomSheet: state }),
  closeBottomSheet: () => set({ bottomSheet: "closed" }),
  toggleDrawer: () => set((s) => ({ isDrawerOpen: !s.isDrawerOpen })),
}));
