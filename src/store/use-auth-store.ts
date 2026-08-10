import { create } from "zustand";
import { persist } from "zustand/middleware";

import { api, setAuthToken } from "@/lib/api";
import type { LoginInput, SignupInput, UserInfo } from "@/types";

interface AuthState {
  /** Persisted session token; undefined when logged out. */
  token: string | null;
  user: UserInfo | null;
  loading: boolean;
  error: string | null;
  login: (input: LoginInput) => Promise<void>;
  signup: (input: SignupInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setProfile: (user: UserInfo) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      loading: false,
      error: null,

      login: async (input) => {
        set({ loading: true, error: null });
        try {
          const result = await api.login(input);
          setAuthToken(result.token);
          set({ token: result.token, user: result.user, loading: false });
        } catch (error) {
          set({
            loading: false,
            error: error instanceof Error ? error.message : "Login failed",
          });
          throw error;
        }
      },

      signup: async (input) => {
        set({ loading: true, error: null });
        try {
          const result = await api.signup(input);
          setAuthToken(result.token);
          set({ token: result.token, user: result.user, loading: false });
        } catch (error) {
          set({
            loading: false,
            error: error instanceof Error ? error.message : "Signup failed",
          });
          throw error;
        }
      },

      logout: async () => {
        try {
          await api.logout();
        } catch {
          // Best-effort: invalidate locally even if the server call fails.
        }
        setAuthToken(undefined);
        set({ token: null, user: null, error: null });
      },

      refreshUser: async () => {
        const { token } = get();
        if (!token) return;
        try {
          const user = await api.me();
          set({ user });
        } catch {
          // Token may be expired; leave state as-is.
        }
      },

      setProfile: (user) => set({ user }),

      clearError: () => set({ error: null }),
    }),
    {
      name: "maya-auth",
      partialize: (state) => ({ token: state.token, user: state.user }),
      onRehydrateStorage: () => (state) => {
        // Sync the token into the api client on load.
        setAuthToken(state?.token ?? undefined);
      },
    },
  ),
);
