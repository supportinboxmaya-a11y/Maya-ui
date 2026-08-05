import { useState } from "react";
import { Save } from "lucide-react";

import { Button } from "@/components/Common/Button";
import { Card } from "@/components/Common/Card";
import { Toggle } from "@/components/Common/Toggle";
import { useOmniRouter } from "@/hooks/use-omnirouter";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { OmniRotationStrategy } from "@/types";

const STRATEGY_OPTIONS: { value: OmniRotationStrategy; label: string; hint: string }[] = [
  { value: "round-robin", label: "Round-robin", hint: "Keys cycle in order" },
  { value: "lowest-usage", label: "Lowest usage", hint: "Uses least-loaded key" },
];

const inputClass =
  "w-full rounded-xl border border-border-strong bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-foreground-faint focus:border-accent";

export function SettingsPage() {
  const { config, loading, error, refresh, setError } = useOmniRouter();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [baseURL, setBaseURL] = useState("");
  const [strategy, setStrategy] = useState<OmniRotationStrategy>("round-robin");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  // Hydrate local form once config arrives.
  const hydrated = config !== null && enabled === null;
  if (hydrated) {
    setEnabled(config.enabled);
    setBaseURL(config.baseURL);
    setStrategy(config.strategy);
  }

  const handleSave = async () => {
    if (config === null || enabled === null) return;
    setBusy(true);
    setError(null);
    try {
      const next = {
        enabled,
        baseURL: baseURL.trim() || config.baseURL,
        strategy,
      };
      await api.omniSetConfig(next);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
      void refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setBusy(false);
    }
  };

  if (loading && config === null) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-xs text-foreground-faint">Loading settings…</p>
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
          OmniRouter gateway configuration
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger">
          {error}
        </p>
      )}

      <Card className="p-4">
        <label className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">Gateway enabled</p>
            <p className="text-xs text-foreground-muted">
              Route model requests through the key pool
            </p>
          </div>
          <Toggle
            checked={enabled ?? false}
            onChange={setEnabled}
            label="Gateway enabled"
          />
        </label>

        <div className="mt-4 flex flex-col gap-1.5">
          <span className="text-xs font-medium text-foreground-muted">
            Base URL
          </span>
          <input
            className={inputClass}
            value={baseURL}
            onChange={(e) => setBaseURL(e.target.value)}
            placeholder="https://api.omnirouter.ai/v1"
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <div className="mt-4 flex flex-col gap-1.5">
          <span className="text-xs font-medium text-foreground-muted">
            Rotation strategy
          </span>
          <div className="grid grid-cols-2 gap-2">
            {STRATEGY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setStrategy(option.value)}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-left transition-colors",
                  strategy === option.value
                    ? "border-accent bg-accent-soft"
                    : "border-border-strong bg-surface hover:bg-border-subtle",
                )}
              >
                <span className="block text-sm font-medium text-foreground">
                  {option.label}
                </span>
                <span className="mt-0.5 block text-[11px] text-foreground-muted">
                  {option.hint}
                </span>
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Button
        className="w-full"
        onClick={handleSave}
        disabled={busy || config === null}
      >
        {busy ? (
          "Saving…"
        ) : (
          <>
            <Save className="size-4" />
            {saved ? "Saved" : "Save settings"}
          </>
        )}
      </Button>

      <p className="pb-2 text-center text-[11px] leading-relaxed text-foreground-faint">
        {config ? `Current gateway URL: ${config.baseURL}` : ""}
      </p>
    </div>
  );
}
