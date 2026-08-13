const BACKEND = "https://buggumaya.duckdns.org";

export default {
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const target = `${BACKEND}${url.pathname}${url.search}`;

    const headers = new Headers(req.headers);
    headers.delete("host");
    headers.delete("x-vercel-id");
    headers.delete("x-vercel-forwarded-for");

    // Diagnostic: try to reach the backend and report what happens.
    try {
      const upstream = await fetch(target, {
        method: req.method,
        headers,
        body: req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer(),
        redirect: "manual",
      });
      const responseHeaders = new Headers(upstream.headers);
      return new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: responseHeaders,
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ proxyError: String(err) }),
        { status: 502, headers: { "content-type": "application/json" } },
      );
    }
  },
};
