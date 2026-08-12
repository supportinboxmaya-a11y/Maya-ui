// The app talks to the backend through the same origin in production: Vercel
// routes /api/* through a serverless proxy function (api/[...path].ts) to the
// backend domain, so no CORS is involved and all HTTP methods work.
// VITE_API_URL is only used for local dev, where it points at the backend
// directly (or vite proxies /api, see vite.config.ts).
const DEFAULT_API_URL = "";

// The OpenCode server behind the production domain authenticates with these
// credentials. They are the production defaults so deployed builds work even
// when VITE_* env vars are not injected at build time; VITE_* still overrides.
const DEFAULT_USERNAME = "opencode";
const DEFAULT_PASSWORD = "123456";

function normalizeBaseUrl(url: string | undefined): string {
  if (!url || url.trim() === "") return DEFAULT_API_URL;
  // The bare VPS IP has no valid TLS endpoint; ignore it and fall back to
  // the production domain.
  if (url.includes("152.228.227.51")) return "https://buggumaya.duckdns.org";
  return url.replace(/\/+$/, "");
}

export interface EnvConfig {
  apiUrl: string;
  wsUrl: string | undefined;
  username: string | undefined;
  password: string | undefined;
}

export function getEnv(): EnvConfig {
  return {
    apiUrl: normalizeBaseUrl(import.meta.env.VITE_API_URL),
    wsUrl: import.meta.env.VITE_WS_URL,
    username: import.meta.env.VITE_OPENCODE_USERNAME ?? DEFAULT_USERNAME,
    password: import.meta.env.VITE_OPENCODE_PASSWORD ?? DEFAULT_PASSWORD,
  };
}

export function authHeaders(): Record<string, string> {
  const { username, password } = getEnv();
  const token = btoa(`${username ?? DEFAULT_USERNAME}:${password ?? DEFAULT_PASSWORD}`);
  return { Authorization: `Basic ${token}` };
}
