// Vercel serverless proxy: forwards every /api/* request (all HTTP methods)
// to the existing production backend. Vercel's external *rewrites* only
// forward GET/HEAD/OPTIONS (POST/PATCH/DELETE return 405), so auth calls
// (signup/login are POST) must go through a function instead.
//
// The frontend calls same-origin /api/* (see src/lib/env.ts DEFAULT_API_URL
// and vercel.json), which lands here and is relayed to the backend with the
// original method, headers and body. This keeps the browser request
// same-origin (no CORS) and works with the existing backend unchanged.
const BACKEND = "https://buggumaya.duckdns.org";

export default {
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const target = `${BACKEND}${url.pathname}${url.search}`;

    const headers = new Headers(req.headers);
    // Host is a forbidden header in the Fetch spec; fetch() sets it from the
    // target URL automatically.
    headers.delete("host");
    // Don't forward hop-by-hop / vercel-specific headers.
    headers.delete("x-vercel-id");
    headers.delete("x-vercel-forwarded-for");

    const init: RequestInit = {
      method: req.method,
      headers,
      redirect: "manual",
    };
    if (req.method !== "GET" && req.method !== "HEAD") {
      init.body = await req.arrayBuffer();
    }

    const upstream = await fetch(target, init);

    const responseHeaders = new Headers(upstream.headers);
    // The browser request is same-origin, so no CORS headers are needed.
    // Don't reflect arbitrary origins (that would allow any site to call
    // the backend through this proxy).

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  },
};
