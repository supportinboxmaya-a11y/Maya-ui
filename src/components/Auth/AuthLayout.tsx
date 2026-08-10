import type { ReactNode } from "react";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

/** Centered card layout shared by the auth pages. */
export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="flex h-dvh items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          <p className="mt-1 text-sm text-foreground-muted">{subtitle}</p>
        </div>
        <div className="rounded-2xl border border-border-subtle bg-surface-elevated p-5">
          {children}
        </div>
      </div>
    </div>
  );
}
