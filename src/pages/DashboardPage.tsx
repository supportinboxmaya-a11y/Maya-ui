import { useEffect, useRef, useState } from "react";
import { Activity, KeyRound, RefreshCw, Zap } from "lucide-react";

import { Card } from "@/components/Common/Card";
import { StatusBadge } from "@/components/Common/StatusBadge";
import { useOmniRouter } from "@/hooks/use-omnirouter";
import { cn } from "@/lib/cn";
import type { OmniKeyInfo, OmniUsage } from "@/types";

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatCompact(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatRelative(timestamp: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

interface StatTileProps {
  label: string;
  value: string;
  sub?: string;
  icon: "requests" | "tokens" | "active" | "exhausted";
}

const ICON_STYLES = {
  requests: "text-accent",
  tokens: "text-accent",
  active: "text-emerald-400",
  exhausted: "text-amber-400",
} as const;

function StatTile({ label, value, sub, icon }: StatTileProps) {
  return (
    <Card className="p-3.5">
      <div className="flex items-center gap-2">
        {icon === "requests" ? (
          <Zap className={cn("size-3.5", ICON_STYLES[icon])} />
        ) : icon === "tokens" ? (
          <Activity className={cn("size-3.5", ICON_STYLES[icon])} />
        ) : (
          <KeyRound className={cn("size-3.5", ICON_STYLES[icon])} />
        )}
        <span className="text-[11px] uppercase tracking-wide text-foreground-faint">
          {label}
        </span>
      </div>
      <p className="mt-1.5 text-xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[11px] text-foreground-faint">{sub}</p>}
    </Card>
  );
}

interface BarSegment {
  keyID: string;
  label: string;
  value: number;
}

function usageBars(keys: OmniKeyInfo[]): BarSegment[] {
  return keys.map((key) => ({
    keyID: key.id,
    label: key.label,
    value: key.usage.requests,
  }));
}

interface KeyRowProps {
  info: OmniKeyInfo;
  isCurrent: boolean;
}

function KeyUsageRow({ info, isCurrent }: KeyRowProps) {
  const pct = Math.min(
    100,
    info.limit?.requests && info.limit.requests > 0
      ? (info.usage.requests / info.limit.requests) * 100
      : 0,
  );
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm text-foreground">{info.label}</p>
          {isCurrent && (
            <span className="size-1.5 shrink-0 rounded-full bg-emerald-400" />
          )}
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-border-subtle">
          <div
            className={cn(
              "h-full rounded-full",
              pct >= 100 ? "bg-danger" : pct >= 80 ? "bg-amber-400" : "bg-accent",
            )}
            style={{ width: `${Math.max(pct, info.usage.requests > 0 ? 2 : 0)}%` }}
          />
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-medium tabular-nums text-foreground">
          {formatNumber(info.usage.requests)}
        </p>
        <p className="text-[11px] text-foreground-faint">requests</p>
      </div>
    </div>
  );
}

interface HistoryPoint {
  t: number;
  requests: number;
  tokens: number;
}

/** Samples the aggregated pool usage on a timer to draw a lightweight
 *  live sparkline of request/token activity since the page loaded. */
function useUsageHistory(keys: OmniKeyInfo[], updatedAt: number | null) {
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const lastTotal = useRef<OmniUsage | null>(null);

  useEffect(() => {
    if (!keys.length || updatedAt === null) return;
    const total: OmniUsage = keys.reduce(
      (acc, key) => ({
        requests: acc.requests + key.usage.requests,
        inputTokens: acc.inputTokens + key.usage.inputTokens,
        outputTokens: acc.outputTokens + key.usage.outputTokens,
      }),
      { requests: 0, inputTokens: 0, outputTokens: 0 },
    );
    const previous = lastTotal.current;
    lastTotal.current = total;

    setHistory((prev) => {
      const next = [...prev];
      if (previous) {
        next.push({
          t: Date.now(),
          requests: Math.max(0, total.requests - previous.requests),
          tokens: Math.max(
            0,
            total.inputTokens + total.outputTokens - (previous.inputTokens + previous.outputTokens),
          ),
        });
      } else {
        next.push({ t: Date.now(), requests: 0, tokens: 0 });
      }
      return next.slice(-40);
    });
  }, [updatedAt, keys]);

  return history;
}

interface SparklineProps {
  points: number[];
}

function Sparkline({ points }: SparklineProps) {
  const width = 320;
  const height = 64;
  const max = Math.max(1, ...points);
  const step = points.length > 1 ? width / (points.length - 1) : width;
  const path = points
    .map((value, index) => {
      const x = index * step;
      const y = height - (value / max) * (height - 8) - 4;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const area = `${path} L${width},${height} L0,${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="h-16 w-full"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spark-fill)" />
      <path
        d={path}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DashboardPage() {
  const { stats, config, loading, error, refresh } = useOmniRouter();
  const keys = stats?.keys ?? [];
  const history = useUsageHistory(keys, stats?.updated ?? null);
  const requestPoints = history.map((p) => p.requests);
  const tokenPoints = history.map((p) => p.tokens);

  const handleRefresh = () => void refresh();

  if (loading && stats === null) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-xs text-foreground-faint">Loading dashboard…</p>
      </div>
    );
  }

  return (
    <div className="h-full space-y-4 overflow-y-auto scrollbar-hidden p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Dashboard
          </h2>
          <p className="text-xs text-foreground-muted">
            Live OmniRouter usage{stats ? ` · ${formatRelative(stats.updated)}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          aria-label="Refresh"
          className="flex size-9 items-center justify-center rounded-full border border-border-subtle text-foreground-muted transition-colors hover:bg-surface-elevated hover:text-foreground"
        >
          <RefreshCw className="size-4" />
        </button>
      </div>

      {error && (
        <p className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        <StatTile
          label="Requests"
          value={stats ? formatNumber(stats.total.requests) : "—"}
          sub={config?.enabled ? "Gateway on" : "Gateway paused"}
          icon="requests"
        />
        <StatTile
          label="Tokens"
          value={stats ? formatCompact(stats.total.inputTokens + stats.total.outputTokens) : "—"}
          sub={
            stats
              ? `${formatCompact(stats.total.inputTokens)} in · ${formatCompact(stats.total.outputTokens)} out`
              : undefined
          }
          icon="tokens"
        />
        <StatTile
          label="Active"
          value={stats ? String(stats.activeKeys) : "—"}
          sub={`of ${stats?.keys.length ?? 0} keys`}
          icon="active"
        />
        <StatTile
          label="Exhausted"
          value={stats ? String(stats.exhaustedKeys) : "—"}
          sub="limit reached"
          icon="exhausted"
        />
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">Live activity</p>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-foreground-muted">
            <span className="size-1.5 animate-pulse-soft rounded-full bg-emerald-400" />
            realtime
          </span>
        </div>
        <div className="mt-3">
          <Sparkline points={requestPoints.length > 1 ? requestPoints : [0, 0]} />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-lg bg-surface px-2 py-1.5">
            <p className="text-sm font-medium tabular-nums text-foreground">
              {formatNumber(requestPoints.reduce((a, b) => a + b, 0))}
            </p>
            <p className="text-[11px] text-foreground-faint">requests</p>
          </div>
          <div className="rounded-lg bg-surface px-2 py-1.5">
            <p className="text-sm font-medium tabular-nums text-foreground">
              {formatNumber(tokenPoints.reduce((a, b) => a + b, 0))}
            </p>
            <p className="text-[11px] text-foreground-faint">tokens</p>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <p className="text-sm font-medium text-foreground">Key usage</p>
        {keys.length === 0 ? (
          <p className="py-6 text-center text-xs text-foreground-faint">
            No keys in the pool yet
          </p>
        ) : (
          <div className="mt-1 divide-y divide-border-subtle">
            {keys.map((info) => (
              <KeyUsageRow
                key={info.id}
                info={info}
                isCurrent={info.id === stats?.currentKeyID}
              />
            ))}
          </div>
        )}
      </Card>

      {keys.length > 0 && (
        <Card className="p-4">
          <p className="text-sm font-medium text-foreground">Pool status</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {keys.map((info) => (
              <div
                key={info.id}
                className="flex items-center gap-2 rounded-xl border border-border-subtle bg-surface px-3 py-2"
              >
                <span className="max-w-[120px] truncate text-xs text-foreground-muted">
                  {info.label}
                </span>
                <StatusBadge phase={info.status.phase} />
              </div>
            ))}
          </div>
          {stats?.totalLimit && (
            <p className="mt-3 text-[11px] text-foreground-faint">
              Pool limit:{" "}
              {stats.totalLimit.requests != null
                ? `${formatNumber(stats.totalLimit.requests)} requests`
                : ""}
              {stats.totalLimit.tokens != null
                ? ` · ${formatNumber(stats.totalLimit.tokens)} tokens`
                : ""}
            </p>
          )}
        </Card>
      )}

      {usageBars(keys).length === 0 && config && (
        <p className="pb-2 text-center text-[11px] text-foreground-faint">
          {config.baseURL}
        </p>
      )}
    </div>
  );
}
