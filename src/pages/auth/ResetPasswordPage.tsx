import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { AuthLayout } from "@/components/Auth/AuthLayout";
import { Button } from "@/components/Common/Button";
import { api } from "@/lib/api";

const inputClass =
  "w-full rounded-xl border border-border-strong bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-foreground-faint focus:border-accent";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialToken = params.get("token") ?? "";
  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setBusy(true);
    try {
      await api.confirmPasswordReset(token.trim(), password);
      setDone(true);
      window.setTimeout(() => navigate("/login", { replace: true }), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Set a new password" subtitle="Choose a strong password">
      {done ? (
        <div className="space-y-4 text-center">
          <p className="text-sm text-foreground-muted">
            Password updated. Redirecting to login…
          </p>
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
              htmlFor="token"
              className="text-xs font-medium text-foreground-muted"
            >
              Reset token
            </label>
            <input
              id="token"
              className={inputClass}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste the token from the reset request"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="text-xs font-medium text-foreground-muted"
            >
              New password
            </label>
            <input
              id="password"
              type="password"
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="confirm"
              className="text-xs font-medium text-foreground-muted"
            >
              Confirm new password
            </label>
            <input
              id="confirm"
              type="password"
              className={inputClass}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat your password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Resetting…" : "Reset password"}
          </Button>
          <p className="text-center text-xs text-foreground-muted">
            <Link
              to="/login"
              className="text-foreground transition-colors hover:text-accent"
            >
              Back to login
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
