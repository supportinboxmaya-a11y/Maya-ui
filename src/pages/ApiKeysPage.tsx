import { useState } from "react";
import { ArrowUpRight, Eye, EyeOff, KeyRound, Plus, RefreshCw, Trash2 } from "lucide-react";

import { Button } from "@/components/Common/Button";
import { Card } from "@/components/Common/Card";
import { ConfirmDialog } from "@/components/Common/ConfirmDialog";
import { Sheet } from "@/components/Common/Sheet";
import { StatusBadge } from "@/components/Common/StatusBadge";
import { Toggle } from "@/components/Common/Toggle";
import { useOmniRouter } from "@/hooks/use-omnirouter";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { OmniKeyInfo, OmniLimit } from "@/types";

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatDate(timestamp?: number): string {
  if (!timestamp) return "Never";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}

function truncateKey(label: string): string {
  // Labels are often the raw key (e.g. sk-…abc123). Show a short form.
  if (label.startsWith("sk-")) {
    return `${label.slice(0, 12)}…${label.slice(-4)}`;
  }
  return label;
}

interface KeyFormState {
  label: string;
  limitRequests: string;
  limitTokens: string;
}

interface UsageMeterProps {
  used: number;
  limit?: number | null;
}

function UsageMeter({ used, limit }: UsageMeterProps) {
  const unlimited = limit === undefined || limit === null || limit <= 0;
  const pct = unlimited ? 0 : Math.min(100, (used / limit) * 100);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] uppercase tracking-wide text-foreground-faint">
          {formatNumber(used)}
        </span>
        <span className="text-[11px] text-foreground-faint">
          {unlimited ? "unlimited" : `of ${formatNumber(limit)}`}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-border-subtle">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            pct >= 100
              ? "bg-danger"
              : pct >= 80
                ? "bg-amber-400"
                : "bg-accent",
          )}
          style={{ width: `${Math.max(pct, used > 0 ? 2 : 0)}%` }}
        />
      </div>
    </div>
  );
}

interface KeyEditorProps {
  mode: "create" | "edit";
  initial?: OmniKeyInfo;
  onClose: () => void;
  onSaved: () => void;
}

function KeyEditor({ mode, initial, onClose, onSaved }: KeyEditorProps) {
  const isEdit = mode === "edit";
  const [form, setForm] = useState<KeyFormState>({
    label: initial?.label ?? "",
    limitRequests: initial?.limit?.requests != null ? String(initial.limit.requests) : "",
    limitTokens: initial?.limit?.tokens != null ? String(initial.limit.tokens) : "",
  });
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);
  const [showSecret, setShowSecret] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildLimit = (): OmniLimit | undefined => {
    const requests = form.limitRequests.trim() === "" ? null : Number(form.limitRequests);
    const tokens = form.limitTokens.trim() === "" ? null : Number(form.limitTokens);
    if (requests === null && tokens === null) return undefined;
    return { requests, tokens };
  };

  const handleSubmit = async () => {
    setBusy(true);
    setError(null);
    try {
      const limit = buildLimit();
      if (isEdit && initial) {
        await api.omniUpdateKey(initial.id, {
          label: form.label.trim() || undefined,
          enabled,
          limit,
        });
      } else {
        const secret = form.label.trim(); // The secret key is pasted into the label field.
        if (!secret) {
          setError("Paste the API key to add it.");
          setBusy(false);
          return;
        }
        await api.omniAddKey({
          key: secret,
          label: undefined,
          limit,
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save key");
    } finally {
      setBusy(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-border-strong bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-foreground-faint focus:border-accent";

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger">
          {error}
        </p>
      )}

      {isEdit ? (
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-foreground-muted">Label</span>
          <input
            className={inputClass}
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            placeholder="e.g. team-prod"
          />
        </label>
      ) : (
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-foreground-muted">
            API Key
          </span>
          <div className="relative">
            <input
              className={cn(inputClass, "pr-10")}
              type={showSecret ? "text" : "password"}
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="sk-…"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="button"
              aria-label={showSecret ? "Hide key" : "Show key"}
              onClick={() => setShowSecret((v) => !v)}
              className="absolute right-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-foreground-muted hover:text-foreground"
            >
              {showSecret ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </label>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-foreground-muted">
            Request limit
          </span>
          <input
            className={inputClass}
            type="number"
            min={0}
            inputMode="numeric"
            value={form.limitRequests}
            onChange={(e) => setForm({ ...form, limitRequests: e.target.value })}
            placeholder="Unlimited"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-foreground-muted">
            Token limit
          </span>
          <input
            className={inputClass}
            type="number"
            min={0}
            inputMode="numeric"
            value={form.limitTokens}
            onChange={(e) => setForm({ ...form, limitTokens: e.target.value })}
            placeholder="Unlimited"
          />
        </label>
      </div>
      <p className="text-[11px] leading-relaxed text-foreground-faint">
        Limits apply per quota window. Leave blank for unlimited.
      </p>

      {isEdit && (
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm text-foreground">Enabled</span>
          <Toggle checked={enabled} onChange={setEnabled} label="Enabled" />
        </label>
      )}

      <Button className="w-full" onClick={handleSubmit} disabled={busy}>
        {busy ? "Saving…" : isEdit ? "Save changes" : "Add key"}
      </Button>
    </div>
  );
}

interface KeyRowProps {
  info: OmniKeyInfo;
  isCurrent: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onReset: () => void;
}

function KeyRow({ info, isCurrent, onEdit, onDelete, onReset }: KeyRowProps) {
  const [resetBusy, setResetBusy] = useState(false);

  const handleReset = async () => {
    setResetBusy(true);
    try {
      await api.omniResetUsage(info.id);
      onReset();
    } finally {
      setResetBusy(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border-subtle bg-surface">
          <KeyRound className="size-4.5 text-accent" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-foreground">
              {truncateKey(info.label)}
            </p>
            {isCurrent && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-accent/30 bg-accent-soft px-2 py-0.5 text-[10px] font-medium text-accent">
                <ArrowUpRight className="size-3" />
                In use
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-foreground-faint">
            Added {formatDate(info.created)} · Last used {formatDate(info.lastUsed)}
          </p>
          <div className="mt-3 flex flex-col gap-2.5">
            <UsageMeter
              used={info.usage.requests}
              limit={info.limit?.requests}
            />
            <UsageMeter
              used={info.usage.inputTokens + info.usage.outputTokens}
              limit={info.limit?.tokens}
            />
          </div>
        </div>
        <StatusBadge phase={info.status.phase} />
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-border-subtle pt-3">
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-full px-3 py-1.5 text-xs font-medium text-foreground-muted transition-colors hover:bg-surface-elevated hover:text-foreground"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={resetBusy}
            className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-foreground-muted transition-colors hover:bg-surface-elevated hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw className={cn("size-3", resetBusy && "animate-spin")} />
            Reset usage
          </button>
        </div>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete ${info.label}`}
          className="flex size-8 items-center justify-center rounded-full text-foreground-faint transition-colors hover:bg-danger-soft hover:text-danger"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </Card>
  );
}

export function ApiKeysPage() {
  const { stats, config, loading, error, refresh } = useOmniRouter();
  const [editor, setEditor] = useState<
    { mode: "create" } | { mode: "edit"; info: OmniKeyInfo } | null
  >(null);
  const [deleteTarget, setDeleteTarget] = useState<OmniKeyInfo | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [rotateBusy, setRotateBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2500);
  };

  const keys = stats?.keys ?? [];

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await api.omniRemoveKey(deleteTarget.id);
      setDeleteTarget(null);
      showToast("Key deleted");
      void refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete key");
    } finally {
      setDeleteBusy(false);
    }
  };

  const handleRotate = async () => {
    setRotateBusy(true);
    try {
      const { data } = await api.omniRotate({ resetUsage: false });
      showToast(
        data ? `Rotated to ${truncateKey(data.label)}` : "No active keys to rotate to",
      );
      void refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Rotation failed");
    } finally {
      setRotateBusy(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto scrollbar-hidden p-4">
        {error && (
          <p className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              API Keys
            </h2>
            <p className="text-xs text-foreground-muted">
              OmniRouter key pool · {keys.length} key{keys.length === 1 ? "" : "s"}
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setEditor({ mode: "create" })}
            className="shrink-0"
          >
            <Plus className="size-4" />
            Add key
          </Button>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleRotate}
            disabled={rotateBusy || keys.length === 0}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border-strong bg-surface-elevated px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-border-subtle active:bg-border-subtle disabled:opacity-40"
          >
            <RefreshCw className={cn("size-4", rotateBusy && "animate-spin")} />
            Rotate now
          </button>
          <button
            type="button"
            onClick={() => void refresh()}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border-strong bg-surface-elevated px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-border-subtle active:bg-border-subtle"
          >
            <RefreshCw className="size-4" />
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="py-10 text-center text-xs text-foreground-faint">
            Loading keys…
          </p>
        ) : keys.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border-strong py-12 text-center">
            <KeyRound className="mx-auto size-8 text-foreground-faint" />
            <p className="mt-3 text-sm font-medium text-foreground-muted">
              No API keys yet
            </p>
            <p className="mx-auto mt-1 max-w-[240px] text-xs leading-relaxed text-foreground-faint">
              Add an OmniRouter gateway key to start routing requests.
            </p>
          </div>
        ) : (
          keys.map((info) => (
            <KeyRow
              key={info.id}
              info={info}
              isCurrent={info.id === stats?.currentKeyID}
              onEdit={() => setEditor({ mode: "edit", info })}
              onDelete={() => setDeleteTarget(info)}
              onReset={() => void refresh()}
            />
          ))
        )}

        {config && (
          <p className="pb-2 text-center text-[11px] text-foreground-faint">
            {config.enabled ? "Gateway enabled" : "Gateway paused"} ·{" "}
            {config.strategy} · {config.baseURL}
          </p>
        )}
      </div>

      <Sheet
        open={editor !== null}
        onClose={() => setEditor(null)}
        title={editor?.mode === "edit" ? "Edit key" : "Add API key"}
      >
        {editor && (
          <KeyEditor
            mode={editor.mode}
            initial={editor.mode === "edit" ? editor.info : undefined}
            onClose={() => setEditor(null)}
            onSaved={() => {
              void refresh();
              showToast(
                editor.mode === "edit" ? "Key updated" : "Key added",
              );
            }}
          />
        )}
      </Sheet>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete API key?"
        message={`"${deleteTarget ? truncateKey(deleteTarget.label) : ""}" will be removed from the pool and can no longer receive requests.`}
        busy={deleteBusy}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />

      {toast && (
        <div className="pointer-events-none absolute inset-x-0 bottom-6 z-[70] flex justify-center px-6">
          <div className="rounded-full border border-border-strong bg-surface-elevated px-4 py-2 text-xs font-medium text-foreground shadow-lg">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
