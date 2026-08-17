/**
 * Maya UI Cloudflare Worker
 * 
 * Serves the frontend static assets and proxies /api/* requests
 * to the production backend at https://buggumaya.duckdns.org
 * using IPv6 with SNI for TLS.
 * 
 * Environment variables required:
 * - BACKEND_URL: https://buggumaya.duckdns.org
 * - BACKEND_IPV6: 2001:41d0:303:f333::95
 */

const BACKEND_URL = "https://buggumaya.duckdns.org";
const BACKEND_IPV6 = "2001:41d0:303:f333::95";

// HTTP/1.1 connection-specific headers that are forbidden in HTTP/2
const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-connection",
  "transfer-encoding",
  "upgrade",
  "te",
  "trailer",
]);

async function upstreamRequestOnce(method, pathWithQuery, headers, body) {
  // Use fetch with the IPv6 address and SNI
  const url = `https://[${BACKEND_IPV6}]${pathWithQuery}`;
  
  const requestHeaders = new Headers(headers);
  requestHeaders.set("host", new URL(BACKEND_URL).host);
  // Remove hop-by-hop headers
  for (const [key] of requestHeaders.entries()) {
    if (HOP_BY_HOP.has(key.toLowerCase()) || key.startsWith(":")) {
      requestHeaders.delete(key);
    }
  }

  const response = await fetch(url, {
    method,
    headers: requestHeaders,
    body: body ? new Uint8Array(body) : undefined,
    // Cloudflare Workers specific: allow self-signed or custom certs if needed
    // In production, the backend should have valid certs
  });

  const responseHeaders = new Headers(response.headers);
  // Remove hop-by-hop headers from response
  for (const [key] of responseHeaders.entries()) {
    if (HOP_BY_HOP.has(key.toLowerCase())) {
      responseHeaders.delete(key);
    }
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

async function upstreamRequest(method, pathWithQuery, headers, body) {
  try {
    return await upstreamRequestOnce(method, pathWithQuery, headers, body);
  } catch (err) {
    // Retry once on connection failures
    const message = err instanceof Error ? err.message : String(err);
    if (/alert|socket|connection|ECONN|EPROTO|stream|fetch failed/i.test(message)) {
      return await upstreamRequestOnce(method, pathWithQuery, headers, body);
    }
    throw err;
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Handle /api/* requests - proxy to backend
    if (url.pathname.startsWith("/api/")) {
      const targetPath = url.pathname + url.search;
      
      const headers = new Headers(request.headers);
      // Remove Cloudflare-specific headers
      headers.delete("cf-ray");
      headers.delete("cf-connecting-ip");
      headers.delete("cf-ipcountry");
      headers.delete("cf-visitor");
      headers.delete("x-forwarded-for");
      headers.delete("x-forwarded-proto");
      
      try {
        const body = request.method === "GET" || request.method === "HEAD"
          ? undefined
          : await request.arrayBuffer();
        
        return await upstreamRequest(request.method, targetPath, headers, body);
      } catch (err) {
        const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
        return new Response(
          JSON.stringify({ proxyError: detail }),
          { 
            status: 502, 
            headers: { "content-type": "application/json" } 
          }
        );
      }
    }
    
    // For non-API requests, serve from static assets
    // This requires the worker to have the assets binding configured
    try {
      return await env.ASSETS.fetch(request);
    } catch (e) {
      // Fallback for SPA routing - serve index.html
      const indexRequest = new Request(new URL("/", request.url), request);
      return await env.ASSETS.fetch(indexRequest);
    }
  },
};