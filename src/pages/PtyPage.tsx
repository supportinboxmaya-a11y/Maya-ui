import { useEffect, useRef, useState } from "react";
import { Terminal, Loader2, RefreshCw, Plus, X, Square } from "lucide-react";

import { Card } from "@/components/Common/Card";
import { Button } from "@/components/Common/Button";
import { api } from "@/lib/api";
import type { PtyInfo, PtyCreateInput } from "@/types";

export function PtyPage() {
  const [sessions, setSessions] = useState<PtyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newSessionTitle, setNewSessionTitle] = useState("");
  const [activeSession, setActiveSession] = useState<PtyInfo | null>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const fetchSessions = async () => {
    try {
      const { data } = await api.listPty();
      setSessions(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load PTY sessions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleCreate = async () => {
    if (!newSessionTitle.trim()) return;
    setCreating(true);
    try {
      const input: PtyCreateInput = { title: newSessionTitle.trim() };
      const { data } = await api.createPty(input);
      setNewSessionTitle("");
      setSessions((prev) => [data, ...prev]);
      setActiveSession(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create PTY session");
    } finally {
      setCreating(false);
    }
  };

  const handleConnect = async (session: PtyInfo) => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    setActiveSession(session);
    try {
      const { data } = await api.createPtyConnectToken(session.id);
      const { apiUrl } = await import("@/lib/env").then(m => m.getEnv());
      const wsUrl = apiUrl.replace(/^http/, "ws") + `/api/pty/${encodeURIComponent(session.id)}/connect?ticket=${data.ticket}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("PTY WebSocket connected");
      };

      ws.onmessage = (event) => {
        if (terminalRef.current) {
          terminalRef.current.textContent += event.data;
          terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
      };

      ws.onclose = () => {
        console.log("PTY WebSocket closed");
        setActiveSession(null);
      };

      ws.onerror = (err) => {
        console.error("PTY WebSocket error:", err);
        setError("PTY connection failed");
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect to PTY");
    }
  };

  const handleDisconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setActiveSession(null);
  };

  const handleDelete = async (sessionId: string) => {
    try {
      await api.deletePty(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSession?.id === sessionId) {
        handleDisconnect();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete PTY session");
    }
  };

  return (
    <div className="h-full space-y-4 overflow-y-auto scrollbar-hidden p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Terminal (PTY)
          </h2>
          <p className="text-xs text-foreground-muted">
            Pseudo-terminal sessions
          </p>
        </div>
        <button
          onClick={fetchSessions}
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

      <Card className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <input
            type="text"
            value={newSessionTitle}
            onChange={(e) => setNewSessionTitle(e.target.value)}
            placeholder="Session title (optional)"
            className="flex-1 rounded-xl border border-border-strong bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-foreground-faint focus:border-accent"
          />
          <Button
            onClick={handleCreate}
            disabled={creating}
            className="shrink-0"
          >
            <Plus className="size-4" />
            New Session
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="size-6 animate-spin text-accent" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8">
            <Terminal className="mx-auto size-10 text-foreground-faint mb-3" />
            <p className="text-sm font-medium text-foreground-muted">No PTY sessions</p>
            <p className="text-xs text-foreground-faint">Create a new terminal session above</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                  activeSession?.id === session.id
                    ? "border-accent/50 bg-accent-soft"
                    : "border-border-subtle hover:border-border-strong"
                }`}
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border-subtle bg-surface">
                  <Terminal className="size-5 text-accent" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{session.title || "Untitled"}</p>
                  <p className="truncate text-xs text-foreground-muted">{session.cwd}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`size-2 rounded-full ${session.status === "running" ? "bg-emerald-400" : "bg-foreground-faint"}`} />
                  <span className="text-xs text-foreground-muted capitalize">{session.status}</span>
                  {session.status === "running" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleConnect(session)}
                    >
                      Connect
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(session.id)}
                    className="text-danger hover:text-danger"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {activeSession && (
        <Card className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between p-3 border-b border-border-subtle">
            <div className="flex items-center gap-2">
              <Terminal className="size-5 text-accent" />
              <p className="text-sm font-medium text-foreground">{activeSession.title || "Untitled"}</p>
              <span className="size-2 rounded-full bg-emerald-400" />
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={handleDisconnect}>
                <Square className="size-4" />
              </Button>
            </div>
          </div>
          <div
            ref={terminalRef}
            className="flex-1 p-4 font-mono text-sm text-foreground bg-background overflow-auto"
            style={{ fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace" }}
          />
        </Card>
      )}
    </div>
  );
}