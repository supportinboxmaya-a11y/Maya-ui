import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const BACKEND = "https://buggumaya.duckdns.org";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Local dev: proxy /api to the production backend so the app can use
  // same-origin /api/* URLs (matching production's Vercel rewrite) and avoid
  // CORS. VITE_API_URL, when set, takes precedence in src/lib/env.ts.
  server: {
    proxy: {
      "/api": {
        target: BACKEND,
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
