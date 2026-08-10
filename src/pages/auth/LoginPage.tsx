import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { AuthLayout } from "@/components/Auth/AuthLayout";
import { Button } from "@/components/Common/Button";
import { useAuthStore } from "@/store/use-auth-store";

const inputClass =
  "w-full rounded-xl border border-border-strong bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-foreground-faint focus:border-accent";

export function LoginPage() {
  const navigate = useNavigate();
  const { login, error, clearError } = useAuthStore();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    clearError();
    try {
      await login({ identifier, password });
      navigate("/", { replace: true });
    } catch {
      // Error is surfaced from the store.
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to your Maya account">
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
            autoComplete="username"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="password"
            className="text-xs font-medium text-foreground-muted"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Logging in…" : "Log in"}
        </Button>
        <div className="flex items-center justify-between text-xs">
          <Link
            to="/forgot-password"
            className="text-foreground-muted transition-colors hover:text-foreground"
          >
            Forgot password?
          </Link>
          <Link
            to="/signup"
            className="text-foreground transition-colors hover:text-accent"
          >
            Create account
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
