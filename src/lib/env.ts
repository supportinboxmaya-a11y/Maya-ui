const DEFAULT_API_URL = "https://buggumaya.duckdns.org";

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
    username: import.meta.env.VITE_OPENCODE_USERNAME,
    password: import.meta.env.VITE_OPENCODE_PASSWORD,
  };
}

export function authHeaders(): Record<string, string> {
  const { username, password } = getEnv();
  if (!password) return {};
  const token = btoa(`${username ?? "opencode"}:${password}`);
  return { Authorization: `Basic ${token}` };
}
