import { useEffect, useState } from "react";
import { Plug, Loader2, RefreshCw, Key } from "lucide-react";

import { Card } from "@/components/Common/Card";
import { api } from "@/lib/api";
import type { IntegrationInfo } from "@/types";

export function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<IntegrationInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIntegrations = async () => {
    try {
      setLoading(true);
      const { data } = await api.listIntegrations();
      setIntegrations(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load integrations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  return (
    <div className="h-full space-y-4 overflow-y-auto scrollbar-hidden p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Integrations
          </h2>
          <p className="text-xs text-foreground-muted">
            Connected services and authentication
          </p>
        </div>
        <button
          onClick={fetchIntegrations}
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
      ) : integrations.length === 0 ? (
        <Card className="p-6 text-center">
          <Plug className="mx-auto size-10 text-foreground-faint mb-3" />
          <p className="text-sm font-medium text-foreground-muted">No integrations configured</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {integrations.map((integration) => (
            <Card key={integration.id} className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border-subtle bg-surface">
                  <Plug className="size-5 text-accent" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{integration.name} ({integration.id})</p>
                  {integration.description && (
                    <p className="mt-0.5 truncate text-xs text-foreground-muted">{integration.description}</p>
                  )}
                  {integration.methods && integration.methods.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {integration.methods.map((method) => (
                        <span key={method.id} className="inline-flex items-center gap-1 rounded-full border border-border-subtle bg-surface px-2 py-0.5 text-[10px] font-medium text-foreground-muted">
                          <Key className="size-3" />
                          {method.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}