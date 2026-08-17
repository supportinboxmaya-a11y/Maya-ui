import { useState, useEffect } from "react";
import { Save, Loader2 } from "lucide-react";

import { Button } from "@/components/Common/Button";
import { Card } from "@/components/Common/Card";
import { api } from "@/lib/api";

export function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [models, setModels] = useState<{ id: string; name: string; providerID: string; enabled: boolean }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const { data } = await api.listModels();
        setModels(data.filter((m) => m.enabled));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load models");
      } finally {
        setLoading(false);
      }
    };
    fetchModels();
  }, []);

  const handleSave = async () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <Loader2 className="size-4 animate-spin text-accent" />
        <p className="ml-2 text-xs text-foreground-faint">Loading settings…</p>
      </div>
    );
  }

  return (
    <div className="h-full space-y-4 overflow-y-auto scrollbar-hidden p-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Settings
        </h2>
        <p className="text-xs text-foreground-muted">
          Model and application settings
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger">
          {error}
        </p>
      )}

      <Card className="p-4">
        <p className="text-sm font-medium text-foreground mb-3">Available Models</p>
        {models.length === 0 ? (
          <p className="text-sm text-foreground-muted">No models available</p>
        ) : (
          <ul className="space-y-2">
            {models.map((model) => (
              <li key={model.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{model.name}</p>
                  <p className="text-xs text-foreground-muted">{model.providerID}</p>
                </div>
                <span className={`size-2 rounded-full ${model.enabled ? "bg-emerald-400" : "bg-foreground-faint"}`} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Button className="w-full" onClick={handleSave} disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Saving…
          </>
        ) : (
          <>
            <Save className="size-4" />
            {saved ? "Saved" : "Save settings"}
          </>
        )}
      </Button>
    </div>
  );
}