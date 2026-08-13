// Vercel serverless proxy: forwards every /api/* request (all HTTP methods)
// to the existing production backend.
//
// The backend TLS only negotiates cleanly over HTTP/2 (Node's undici fetch
// and HTTP/1.1 clients get a "tlsv1 alert internal error" from the server),
// so we use the node:http2 client to relay requests.
import http2 from "node:http2";

const BACKEND = "https://buggumaya.duckdns.org";

// Single shared client: HTTP/2 multiplexes requests over one connection.
let client: http2.ClientHttp2Session | undefined;

function getClient(): http2.ClientHttp2Session {
  if (!client || client.closed || client.destroyed) {
    client = http2.connect(BACKEND, { ALPNProtocols: ["h2"] });
    client.on("error", () => {
      // The session may have died; the next request reconnects.
    });
  }
  return client;
}

async function upstreamRequest(
  method: string,
  pathWithQuery: string,
  headers: Headers,
  body: ArrayBuffer | undefined,
): Promise<Response> {
  const session = getClient();
  const req = session.request({
    ":method": method,
    ":path": pathWithQuery,
    ...Object.fromEntries(headers.entries()),
  });
  if (body) req.write(Buffer.from(body));
  req.end();

  const responseHeaders = new Headers();
  const status = await new Promise<number>((resolve, reject) => {
    req.on("response", (h) => {
      for (const [key, value] of Object.entries(h)) {
        if (key.startsWith(":")) continue;
        responseHeaders.set(key, String(value));
      }
      resolve(h[":status"] ?? 502);
    });
    req.on("error", reject);
  });

  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const responseBody = Buffer.concat(chunks);

  return new Response(responseBody, {
    status,
    headers: responseHeaders,
  });
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
