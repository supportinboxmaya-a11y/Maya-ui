import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import { AuthLayout } from "@/components/Auth/AuthLayout";
import { Button } from "@/components/Common/Button";
import { api } from "@/lib/api";

const inputClass =
  "w-full rounded-xl border border-border-strong bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-foreground-faint focus:border-accent";

export function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await api.requestPasswordReset(identifier.trim());
      // In this local deployment the reset token is returned directly so the
      // user can complete the flow without email infrastructure.
      setToken(result.token);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset request failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Reset password" subtitle="We'll send you a reset link">
      {done ? (
        <div className="space-y-4">
          <p className="text-sm text-foreground-muted">
            A reset token was generated. Use it on the reset page to set a new
            password.
          </p>
          {token && (
            <div className="break-all rounded-xl border border-border-subtle bg-surface px-3.5 py-2.5 text-xs text-foreground">
              {token}
            </div>
          )}
          <Link
            to={`/reset-password?token=${encodeURIComponent(token ?? "")}`}
            className="block text-center text-xs text-foreground transition-colors hover:text-accent"
          >
            Continue to reset
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger">
              {error}
            </p>
          )}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="identifier"
              className="text-xs font-medium text-foreground-muted"
            >
              Username or email
            </label>
            <input
              id="identifier"
              className={inputClass}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Requesting…" : "Request reset"}
          </Button>
          <p className="text-center text-xs text-foreground-muted">
            Remembered it?{" "}
            <Link
              to="/login"
              className="text-foreground transition-colors hover:text-accent"
            >
              Log in
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
