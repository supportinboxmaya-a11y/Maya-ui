import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// Proxy target for local dev. Uses VITE_API_BASE_URL (fallback VITE_API_URL),
// defaulting to localhost:4096 for local development.
const DEFAULT_BACKEND = "http://localhost:4096";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const BACKEND =
    env.VITE_API_BASE_URL || env.VITE_API_URL || DEFAULT_BACKEND;

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    // Local dev: proxy /api to the backend so the app can use
    // same-origin /api/* URLs (matching production's Cloudflare Worker rewrite) and avoid
    // CORS. VITE_API_BASE_URL, when set, takes precedence in src/lib/env.ts.
    server: {
      proxy: {
        "/api": {
          target: BACKEND,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});