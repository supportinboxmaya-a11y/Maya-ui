// Deploy Maya-ui dist/ to Cloudflare Pages using the direct-upload deployment
// flow that matches the working production deployment: upload assets to the
// project asset store, verify persistence with retries, then create the
// deployment referencing the uploaded hashes.
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { readFileSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { homedir } from "node:os";

// Prefer the stored deploy token (~/.cf_api_token), then the env var. The
// token in ~/.cf_api_token is the one with Pages asset-write permission; an
// ad-hoc env token may pass deployment creation but fails the assets API with
// 9106 "Authentication failed".
function resolveToken() {
  if (process.env.CF_API_TOKEN) return process.env.CF_API_TOKEN;
  const path = join(homedir(), ".cf_api_token");
  if (existsSync(path)) return readFileSync(path, "utf8").trim();
  return undefined;
}

const TOKEN = resolveToken();
const ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const PROJECT = process.env.CF_PROJECT ?? "maya-ui";
const DIST = process.env.CF_DIST_DIR
  ? new URL(process.env.CF_DIST_DIR + "/", import.meta.url).pathname
  : new URL("./dist/", import.meta.url).pathname;
const API = "https://api.cloudflare.com/client/v4";

if (!TOKEN || !ACCOUNT_ID) {
  console.error("Set CF_API_TOKEN / CF_ACCOUNT_ID or ~/.cf_api_token");
  process.exit(1);
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

function contentType(file) {
  if (file.endsWith(".html")) return "text/html";
  if (file.endsWith(".js")) return "application/javascript";
  if (file.endsWith(".css")) return "text/css";
  if (file.endsWith(".svg")) return "image/svg+xml";
  if (file.endsWith(".json")) return "application/json";
  if (file.endsWith(".png")) return "image/png";
  if (file.endsWith(".ico")) return "image/x-icon";
  if (file.endsWith(".txt") || file.endsWith("_redirects")) return "text/plain";
  return "application/octet-stream";
}

// Build the manifest: { "/path": "sha256hex" }
const files = await walk(DIST);
const manifest = {};
for (const f of files) {
  const rel = "/" + relative(DIST, f).split(sep).join("/");
  if (rel === "/_redirects") continue;
  manifest[rel] = createHash("sha256").update(await readFile(f)).digest("hex");
}
console.log("Manifest:", JSON.stringify(manifest));

// Get a fresh upload JWT (retry on transient failures).
async function getJwt() {
  for (let i = 0; i < 10; i++) {
    try {
      const r = await fetch(`${API}/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT}/upload-token`, {
        headers: { Authorization: `Bearer ${TOKEN}` },
      });
      const j = await r.json();
      if (j.success && j.result?.jwt) return j.result.jwt;
    } catch {}
    await wait(1500);
  }
  throw new Error("failed to obtain upload JWT");
}

let jwt = await getJwt();
console.log("Got upload JWT");

/** Run an assets-API call with JWT refresh on auth failure (matches the
 *  wrangler deploy flow: UNAUTHORIZED / expired JWT triggers a refetch). */
async function assetsCall(path, body) {
  let lastErr = "";
  for (let attempt = 0; attempt < 10; attempt++) {
    const res = await fetch(`${API}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
      body: JSON.stringify(body),
    });
    const j = await res.json();
    lastErr = `${res.status} ${JSON.stringify(j.errors ?? j).slice(0, 160)}`;
    const isAuthFail =
      !j.success &&
      (j.errors ?? []).some(
        (e) => e.code === 8000013 || /auth/i.test(e.message ?? ""),
      );
    if (isAuthFail) {
      // JWT was rejected/expired: refetch and retry.
      jwt = await getJwt();
      await wait(1000);
      continue;
    }
    if (res.ok && j.success !== false) return j;
    if (attempt === 9) return j; // surface the final response
    await wait(1000 * (attempt + 1));
  }
  throw new Error(`assets call failed: ${path} (${lastErr})`);
}

// Upload any missing assets with retries, then verify persistence.
const hashes = Object.values(manifest);
const toUpload = files.filter((f) => manifest["/" + relative(DIST, f).split(sep).join("/")] !== undefined);

for (let attempt = 0; attempt < 10; attempt++) {
  let missing;
  try {
    const cj = await assetsCall(`/pages/assets/check-missing`, { hashes });
    missing = new Set(cj.success ? cj.result ?? [] : hashes);
  } catch {
    missing = new Set(hashes);
  }
  console.log(`attempt ${attempt + 1}: ${missing.size} missing`);
  if (missing.size === 0) break;

  const payload = await Promise.all(
    toUpload.map(async (f) => {
      const rel = "/" + relative(DIST, f).split(sep).join("/");
      return {
        key: manifest[rel],
        value: (await readFile(f)).toString("base64"),
        metadata: { contentType: contentType(f) },
      };
    })
  );
  const uj = await assetsCall(`/pages/assets/upload`, payload);
  console.log("upload:", uj.success ? "OK" : JSON.stringify(uj.errors ?? uj).slice(0, 200));
  // Register the uploaded hashes so Pages can serve them (matches the wrangler
  // `pages deploy` sequence: check-missing -> upload -> upsert-hashes).
  const uj2 = await assetsCall(`/pages/assets/upsert-hashes`, { hashes });
  console.log("upsert-hashes:", uj2.success ? "OK" : JSON.stringify(uj2.errors ?? uj2).slice(0, 200));
  await wait(3000);
}

// Final verification: nothing may be missing.
for (let i = 0; i < 30; i++) {
  const cj = await assetsCall(`/pages/assets/check-missing`, { hashes });
  const missing = new Set(cj.success ? cj.result ?? [] : hashes);
  if (missing.size === 0) {
    console.log("All assets verified present");
    break;
  }
  if (i === 29) throw new Error(`assets still missing: ${JSON.stringify([...missing]).slice(0, 500)}`);
  await wait(2000);
}

// Create the deployment.
const form = new FormData();
form.append("manifest", JSON.stringify(manifest));
form.append("branch", process.env.CF_BRANCH ?? "main");
const depRes = await fetch(`${API}/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT}/deployments`, {
  method: "POST",
  headers: { Authorization: `Bearer ${TOKEN}` },
  body: form,
});
const depJson = await depRes.json();
if (!depRes.ok || depJson.success === false) {
  throw new Error(`deployment failed: ${JSON.stringify(depJson).slice(0, 800)}`);
}
const d = depJson.result;
console.log("Deployment created:", d.id, d.url, d.latest_stage?.status);
