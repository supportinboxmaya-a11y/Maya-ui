import { useState, type FormEvent } from "react";
import { Camera, Save } from "lucide-react";

import { Button } from "@/components/Common/Button";
import { Card } from "@/components/Common/Card";
import { useAuthStore } from "@/store/use-auth-store";
import { api } from "@/lib/api";

const inputClass =
  "w-full rounded-xl border border-border-strong bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-foreground-faint focus:border-accent";

function Avatar({ user }: { user: NonNullable<ReturnType<typeof useAuthStore.getState>["user"]> }) {
  const initial = (user.name ?? user.username).charAt(0).toUpperCase();
  return (
    <div className="flex size-16 items-center justify-center rounded-full bg-foreground/10 text-2xl font-semibold text-foreground">
      {initial}
    </div>
  );
}

export function ProfilePage() {
  const { user, setProfile, refreshUser } = useAuthStore();
  const [name, setName] = useState(user?.name ?? "");
  const [avatar, setAvatar] = useState(user?.avatar ?? "");
  const [busyProfile, setBusyProfile] = useState(false);
  const [savedProfile, setSavedProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busyPassword, setBusyPassword] = useState(false);
  const [savedPassword, setSavedPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  if (!user) return null;

  const handleProfile = async (event: FormEvent) => {
    event.preventDefault();
    setBusyProfile(true);
    setProfileError(null);
    try {
      const updated = await api.updateProfile({
        name: name.trim() || undefined,
        avatar: avatar.trim() || undefined,
      });
      setProfile(updated);
      setSavedProfile(true);
      window.setTimeout(() => setSavedProfile(false), 2000);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setBusyProfile(false);
    }
  };

  const handlePassword = async (event: FormEvent) => {
    event.preventDefault();
    setPasswordError(null);
    if (next !== confirm) {
      setPasswordError("New passwords do not match");
      return;
    }
    if (next.length < 8) {
      setPasswordError("New password must be at least 8 characters");
      return;
    }
    setBusyPassword(true);
    try {
      await api.changePassword({ current, next });
      setCurrent("");
      setNext("");
      setConfirm("");
      setSavedPassword(true);
      window.setTimeout(() => setSavedPassword(false), 2000);
      void refreshUser();
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setBusyPassword(false);
    }
  };

  return (
    <div className="h-full space-y-4 overflow-y-auto scrollbar-hidden p-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Profile
        </h2>
        <p className="text-xs text-foreground-muted">
          Manage your account details
        </p>
      </div>

      <Card className="flex items-center gap-4 p-4">
        <Avatar user={user} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {user.name ?? user.username}
          </p>
          <p className="truncate text-xs text-foreground-muted">{user.email}</p>
          <p className="mt-0.5 text-[11px] text-foreground-faint">
            @{user.username}
          </p>
        </div>
      </Card>

      <Card className="p-4">
        <p className="text-sm font-medium text-foreground">Account details</p>
        <form onSubmit={handleProfile} className="mt-3 space-y-3">
          {profileError && (
            <p className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger">
              {profileError}
            </p>
          )}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-foreground-muted">
              Name
            </span>
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-foreground-muted">
              Avatar URL
            </span>
            <div className="flex items-center gap-2">
              <input
                className={inputClass}
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                placeholder="https://…/avatar.png"
              />
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border-subtle text-foreground-faint">
                <Camera className="size-4" />
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-foreground-muted">
              Username
            </span>
            <input className={inputClass} value={user.username} disabled />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-foreground-muted">
              Email
            </span>
            <input className={inputClass} value={user.email} disabled />
          </div>
          <Button
            type="submit"
            variant="secondary"
            className="w-full"
            disabled={busyProfile}
          >
            {busyProfile ? (
              "Saving…"
            ) : (
              <>
                <Save className="size-4" />
                {savedProfile ? "Saved" : "Save profile"}
              </>
            )}
          </Button>
        </form>
      </Card>

      <Card className="p-4">
        <p className="text-sm font-medium text-foreground">Change password</p>
        <form onSubmit={handlePassword} className="mt-3 space-y-3">
          {passwordError && (
            <p className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger">
              {passwordError}
            </p>
          )}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-foreground-muted">
              Current password
            </span>
            <input
              type="password"
              className={inputClass}
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-foreground-muted">
              New password
            </span>
            <input
              type="password"
              className={inputClass}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-foreground-muted">
              Confirm new password
            </span>
            <input
              type="password"
              className={inputClass}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          <Button
            type="submit"
            variant="secondary"
            className="w-full"
            disabled={busyPassword}
          >
            {busyPassword ? "Updating…" : savedPassword ? "Password updated" : "Update password"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
