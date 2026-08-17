import { useEffect, useState } from "react";
import { Link2, Loader2, RefreshCw } from "lucide-react";

import { Card } from "@/components/Common/Card";
import { api } from "@/lib/api";
import type { ReferenceInfo } from "@/types";

export function ReferencesPage() {
  const [references, setReferences] = useState<ReferenceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReferences = async () => {
    try {
      setLoading(true);
      const { data } = await api.listReferences();
      setReferences(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load references");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferences();
  }, []);

  return (
    <div className="h-full space-y-4 overflow-y-auto scrollbar-hidden p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            References
          </h2>
          <p className="text-xs text-foreground-muted">
            Project references and links
          </p>
        </div>
        <button
          onClick={fetchReferences}
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
      ) : references.length === 0 ? (
        <Card className="p-6 text-center">
          <Link2 className="mx-auto size-10 text-foreground-faint mb-3" />
          <p className="text-sm font-medium text-foreground-muted">No references available</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {references.map((ref) => (
            <Card key={ref.id} className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border-subtle bg-surface">
                  <Link2 className="size-5 text-accent" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{ref.name}</p>
                  {ref.path && (
                    <p className="mt-0.5 truncate text-xs text-foreground-muted font-mono">{ref.path}</p>
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