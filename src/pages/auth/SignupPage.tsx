import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { AuthLayout } from "@/components/Auth/AuthLayout";
import { Button } from "@/components/Common/Button";
import { useAuthStore } from "@/store/use-auth-store";

const inputClass =
  "w-full rounded-xl border border-border-strong bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-foreground-faint focus:border-accent";

export function SignupPage() {
  const navigate = useNavigate();
  const { signup, error, clearError } = useAuthStore();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLocalError(null);
    if (password !== confirm) {
      setLocalError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setLocalError("Password must be at least 8 characters");
      return;
    }
    setBusy(true);
    clearError();
    try {
      await signup({
        username: username.trim(),
        email: email.trim(),
        password,
        name: name.trim() || undefined,
      });
      navigate("/", { replace: true });
    } catch {
      // Error is surfaced from the store.
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Create your account" subtitle="Set up your Maya workspace">
      <form onSubmit={handleSubmit} className="space-y-4">
        {(error ?? localError) && (
          <p className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger">
            {error ?? localError}
          </p>
        )}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="name"
            className="text-xs font-medium text-foreground-muted"
          >
            Name <span className="text-foreground-faint">(optional)</span>
          </label>
          <input
            id="name"
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ada Lovelace"
            autoComplete="name"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="username"
            className="text-xs font-medium text-foreground-muted"
          >
            Username
          </label>
          <input
            id="username"
            className={inputClass}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="ada"
            autoComplete="username"
            minLength={3}
            maxLength={32}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="email"
            className="text-xs font-medium text-foreground-muted"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
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
            Confirm password
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
          {busy ? "Creating account…" : "Sign up"}
        </Button>
        <p className="text-center text-xs text-foreground-muted">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-foreground transition-colors hover:text-accent"
          >
            Log in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
