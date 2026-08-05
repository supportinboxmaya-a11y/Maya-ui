import { useEffect, useRef, useState } from "react";

import { api } from "@/lib/api";
import type { OmniConfig, OmniStats } from "@/types";

const POLL_INTERVAL = 4000;

interface OmniState {
  stats: OmniStats | null;
  config: OmniConfig | null;
  loading: boolean;
  error: string | null;
  updatedAt: number | null;
}

interface UseOmniRouter extends OmniState {
  refresh: () => Promise<void>;
  setError: (error: string | null) => void;
}

/** Shared OmniRouter realtime data: stats + config with SSE push and
 *  polling fallback, matching how the chat store keeps in sync. */
export function useOmniRouter(): UseOmniRouter {
  const [state, setState] = useState<OmniState>({
    stats: null,
    config: null,
    loading: true,
    error: null,
    updatedAt: null,
  });
  const controllerRef = useRef<AbortController | null>(null);

  const refresh = async () => {
    try {
      const [statsRes, configRes] = await Promise.all([
        api.omniStats(),
        api.omniConfig(),
      ]);
      setState((prev) => ({
        ...prev,
        stats: statsRes.data,
        config: configRes.data,
        loading: false,
        error: null,
        updatedAt: Date.now(),
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error:
          error instanceof Error ? error.message : "Failed to load OmniRouter data",
      }));
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    controllerRef.current = controller;

    void refresh();

    // Real-time push: the server emits `omni-router.updated` whenever the
    // pool changes (add/update/remove/rotate/usage). Refresh stats on each.
    const stream = (async () => {
      try {
        for await (const event of api.subscribeEvents(controller.signal)) {
          if (event.type === "omni-router.updated") {
            void refresh();
          }
        }
      } catch {
        // Stream unavailable or aborted; polling fallback covers us.
      }
    })();

    // Polling fallback keeps numbers fresh behind proxies that buffer SSE.
    const poll = setInterval(() => {
      void refresh();
    }, POLL_INTERVAL);

    return () => {
      controller.abort();
      clearInterval(poll);
      void stream;
    };
  }, []);

  const setError = (error: string | null) =>
    setState((prev) => ({ ...prev, error }));

  return { ...state, refresh, setError };
}
