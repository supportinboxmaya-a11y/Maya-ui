import { useEffect, useState } from "react";
import { Bot, Loader2, RefreshCw } from "lucide-react";

import { Card } from "@/components/Common/Card";
import { api } from "@/lib/api";
import type { AgentInfo } from "@/types";

export function AgentsPage() {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const { data } = await api.listAgents();
      setAgents(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load agents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  return (
    <div className="h-full space-y-4 overflow-y-auto scrollbar-hidden p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Agents
          </h2>
          <p className="text-xs text-foreground-muted">
            Available AI agents
          </p>
        </div>
        <button
          onClick={fetchAgents}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-border-strong bg-surface-elevated px-3 py-2 text-sm text-foreground transition-colors hover:bg-border-subtle active:bg-border-subtle disabled:opacity-50"
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <p className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="size-6 animate-spin text-accent" />
        </div>
      ) : agents.length === 0 ? (
        <Card className="p-6 text-center">
          <Bot className="mx-auto size-10 text-foreground-faint mb-3" />
          <p className="text-sm font-medium text-foreground-muted">No agents available</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {agents.map((agent) => (
            <Card key={agent.id} className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border-subtle bg-surface">
                  <Bot className="size-5 text-accent" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{agent.name}</p>
                  {agent.description && (
                    <p className="mt-0.5 truncate text-xs text-foreground-muted">{agent.description}</p>
                  )}
                </div>
                <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
                  <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                  Active
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}