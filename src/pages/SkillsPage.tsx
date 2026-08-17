import { useEffect, useState } from "react";
import { BookOpen, Loader2, RefreshCw } from "lucide-react";

import { Card } from "@/components/Common/Card";
import { api } from "@/lib/api";
import type { SkillInfo } from "@/types";

export function SkillsPage() {
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSkills = async () => {
    try {
      setLoading(true);
      const { data } = await api.listSkills();
      setSkills(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load skills");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, []);

  return (
    <div className="h-full space-y-4 overflow-y-auto scrollbar-hidden p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Skills
          </h2>
          <p className="text-xs text-foreground-muted">
            Available skills and capabilities
          </p>
        </div>
        <button
          onClick={fetchSkills}
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
      ) : skills.length === 0 ? (
        <Card className="p-6 text-center">
          <BookOpen className="mx-auto size-10 text-foreground-faint mb-3" />
          <p className="text-sm font-medium text-foreground-muted">No skills available</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {skills.map((skill) => (
            <Card key={skill.id} className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border-subtle bg-surface">
                  <BookOpen className="size-5 text-accent" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{skill.name}</p>
                  {skill.description && (
                    <p className="mt-0.5 truncate text-xs text-foreground-muted">{skill.description}</p>
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