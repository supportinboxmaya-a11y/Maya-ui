import { useEffect, useState } from "react";
import { History, Loader2, RefreshCw, Clock, MessageSquare, Trash2 } from "lucide-react";

import { Button } from "@/components/Common/Button";
import { Card } from "@/components/Common/Card";
import { api } from "@/lib/api";
import type { SessionInfo, OpenCodeEvent } from "@/lib/api";

export function SessionsPage() {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<SessionInfo | null>(null);
  const [history, setHistory] = useState<OpenCodeEvent[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const { data } = await api.listSessions();
      setSessions(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (sessionId: string) => {
    try {
      setHistoryLoading(true);
      setHistoryError(null);
      const { data } = await api.getHistory(sessionId, { limit: 100 });
      setHistory(data);
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : "Failed to load history");
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSelectSession = (session: SessionInfo) => {
    setSelectedSession(session);
    fetchHistory(session.id);
  };

  const handleDelete = async (sessionId: string) => {
    try {
      // Note: Backend doesn't have a delete session endpoint in the protocol
      // This would need to be added to the backend if needed
      console.log("Delete session:", sessionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete session");
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  return (
    <div className="h-full space-y-4 overflow-y-auto scrollbar-hidden p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Sessions
          </h2>
          <p className="text-xs text-foreground-muted">
            Chat session history and management
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

      <div className="flex-1 flex min-h-0">
        {/* Sessions List */}
        <div className="w-80 flex-shrink-0 border-r border-border-subtle">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="size-6 animate-spin text-accent" />
            </div>
          ) : sessions.length === 0 ? (
            <Card className="m-4 p-6 text-center">
              <History className="mx-auto size-10 text-foreground-faint mb-3" />
              <p className="text-sm font-medium text-foreground-muted">No sessions</p>
            </Card>
          ) : (
            <div className="h-full overflow-y-auto">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => handleSelectSession(session)}
                  className={`w-full p-3 text-left transition-colors rounded-xl ${
                    selectedSession?.id === session.id
                      ? "bg-accent-soft border-r-2 border-accent"
                      : "hover:bg-surface-elevated"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare className="size-4 text-accent" />
                    <p className="truncate text-sm font-medium text-foreground">{session.title}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-foreground-muted">
                    <Clock className="size-3" />
                    <span>{formatTime(session.time.created)}</span>
                    {session.model && <span>· {session.model}</span>}
                    {session.agent && <span>· {session.agent}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* History / Details */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedSession ? (
            <>
              <div className="p-4 border-b border-border-subtle">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-foreground">{selectedSession.title}</h3>
                    <p className="text-xs text-foreground-muted">
                      Created {formatTime(selectedSession.time.created)}
                      {selectedSession.model && ` · Model: ${selectedSession.model}`}
                      {selectedSession.agent && ` · Agent: ${selectedSession.agent}`}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(selectedSession.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {historyLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="size-6 animate-spin text-accent" />
                  </div>
                ) : historyError ? (
                  <p className="text-center text-xs text-danger">{historyError}</p>
                ) : history.length === 0 ? (
                  <p className="text-center text-sm text-foreground-muted">No history events</p>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {history.map((event, idx) => (
                      <Card key={`${event.id}-${idx}`} className="p-3">
                        <div className="flex items-start gap-3">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-surface">
                            <MessageSquare className="size-4 text-accent" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-foreground-muted">{event.type}</span>
                              <span className="text-xs text-foreground-faint">{new Date(Number(event.durable?.seq || idx)).toLocaleTimeString()}</span>
                            </div>
                            <pre className="mt-1 text-[10px] text-foreground-muted overflow-x-auto whitespace-pre-wrap">
                              {JSON.stringify(event.data, null, 2).slice(0, 500)}
                            </pre>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <Card className="p-6 text-center max-w-md">
                <History className="mx-auto size-12 text-foreground-faint mb-3" />
                <h3 className="text-sm font-medium text-foreground-muted mb-1">Select a session</h3>
                <p className="text-xs text-foreground-faint">Choose a session from the list to view its history</p>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}