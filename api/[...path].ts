// Vercel serverless proxy: forwards every /api/* request (all HTTP methods)
// to the existing production backend.
//
// The backend (buggumaya.duckdns.org) only serves TLS correctly over IPv6:
// its IPv4 address (152.228.227.51) rejects handshakes with "tlsv1 alert
// internal error", which is why plain fetch() from Vercel (IPv4-only egress)
// fails. We force IPv6 in the http2 client and keep a retry for safety.
import http2 from "node:http2";
import type { LookupFunction } from "node:net";

const BACKEND = "https://buggumaya.duckdns.org";
const BACKEND_IPV6 = "2001:41d0:303:f333::95";

// Pin the backend to its working IPv6 address.
const lookup: LookupFunction = (_hostname, _options, callback) => {
  callback(null, [{ address: BACKEND_IPV6, family: 6 }]);
};

// HTTP/1.1 connection-specific headers that are forbidden in HTTP/2.
const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-connection",
  "transfer-encoding",
  "upgrade",
  "te",
  "trailer",
]);

async function upstreamRequestOnce(
  method: string,
  pathWithQuery: string,
  headers: Headers,
  body: ArrayBuffer | undefined,
): Promise<Response> {
  const session = http2.connect(BACKEND, { ALPNProtocols: ["h2"], lookup });
  // Without a handler, a TLS/socket error on the session crashes the process.
  session.on("error", () => {});
  try {
    const requestHeaders: Record<string, string> = { ":method": method, ":path": pathWithQuery };
    for (const [key, value] of headers.entries()) {
      const lower = key.toLowerCase();
      if (HOP_BY_HOP.has(lower) || lower.startsWith(":")) continue;
      if (value) requestHeaders[key] = value;
    }
    const req = session.request(requestHeaders);
    if (body) req.write(Buffer.from(body));
    req.end();

    const responseHeaders = new Headers();
    const status = await new Promise<number>((resolve, reject) => {
      req.on("response", (h) => {
        for (const [key, value] of Object.entries(h)) {
          if (key.startsWith(":") || HOP_BY_HOP.has(key.toLowerCase())) continue;
          responseHeaders.set(key, String(value));
        }
        resolve(h[":status"] ?? 502);
      });
      req.on("error", reject);
    });

    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    return new Response(Buffer.concat(chunks), {
      status,
      headers: responseHeaders,
    });
  } finally {
    session.close();
  }
}

async function upstreamRequest(
  method: string,
  pathWithQuery: string,
  headers: Headers,
  body: ArrayBuffer | undefined,
): Promise<Response> {
  try {
    return await upstreamRequestOnce(method, pathWithQuery, headers, body);
  } catch (err) {
    // The backend TLS is flaky; one retry with a fresh connection usually
    // succeeds. Only retry connection-level failures, not HTTP errors.
    const message = err instanceof Error ? err.message : String(err);
    if (/alert|socket|connection|ECONN|EPROTO|stream/i.test(message)) {
      return await upstreamRequestOnce(method, pathWithQuery, headers, body);
    }
    throw err;
  }
}

export default {
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const targetPath = `${url.pathname}${url.search}`;

    const headers = new Headers(req.headers);
    headers.set("host", new URL(BACKEND).host);
    headers.delete("x-vercel-id");
    headers.delete("x-vercel-forwarded-for");

    try {
      const body =
        req.method === "GET" || req.method === "HEAD"
          ? undefined
          : await req.arrayBuffer();
      return await upstreamRequest(req.method, targetPath, headers, body);
    } catch (err) {
      const detail =
        err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      return new Response(
        JSON.stringify({ proxyError: detail }),
        { status: 502, headers: { "content-type": "application/json" } },
      );
    }
  },
};
