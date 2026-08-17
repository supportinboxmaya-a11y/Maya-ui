// The app talks to the backend through the same origin in production: Vercel
// routes /api/* through a serverless proxy function (api/[...path].ts) to the
// backend domain, so no CORS is involved and all HTTP methods work.
// VITE_API_BASE_URL (fallback: VITE_API_URL) is only used for local dev, where
// it points at the backend directly (or vite proxies /api, see vite.config.ts).
// In production, the API base URL must be set via VITE_API_BASE_URL env var.
const DEFAULT_API_URL = "http://localhost:4096";

function normalizeBaseUrl(url: string | undefined): string {
  if (!url || url.trim() === "") return DEFAULT_API_URL;
  // The bare VPS IP has no valid TLS endpoint; ignore it and fall back to
  // the production tunnel URL.
  if (url.includes("152.228.227.51")) return DEFAULT_API_URL;
  return url.replace(/\/+$/, "");
}

export interface EnvConfig {
  apiUrl: string;
  wsUrl: string | undefined;
  username: string | undefined;
  password: string | undefined;
}

export function getEnv(): EnvConfig {
  const apiUrl =
    import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL;
  return {
    apiUrl: normalizeBaseUrl(apiUrl),
    wsUrl: import.meta.env.VITE_WS_URL,
    username: import.meta.env.VITE_OPENCODE_USERNAME,
    password: import.meta.env.VITE_OPENCODE_PASSWORD,
  };
}

export function authHeaders(): Record<string, string> {
  const { username, password } = getEnv();
  if (!username || !password) return {};
  const token = btoa(`${username}:${password}`);
  return { Authorization: `Basic ${token}` };
}
