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
    // pool changes (add/update/remove/rotate/usage). The current backend
    // event schema doesn't include that type yet, so we refresh on ANY
    // live event as a lightweight real-time signal, and polling covers
    // every other change.
    const stream = (async () => {
      try {
        // Consume the stream; any live event is a real-time signal.
        // The event payload itself is unused (stats are re-fetched on each).
        const iterator = api.subscribeEvents(controller.signal)[Symbol.asyncIterator]();
        while (!(await iterator.next()).done) {
          void refresh();
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
