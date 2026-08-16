// Deploy Maya-ui dist/ to a Cloudflare Worker with Static Assets, using the
// same protocol as `wrangler deploy` (replicated via the Cloudflare API):
//   1. POST /workers/scripts/{name}/assets-upload-session  { manifest }
//   2. POST /workers/assets/upload/{hash}                  (raw file body)
//   3. PUT  /workers/scripts/{name}                        multipart: metadata + script
//   4. POST /workers/scripts/{name}/deployments
import { readFile, readdir } from "node:fs/promises";
import { readFileSync, existsSync } from "node:fs";
import { join, relative, sep, extname } from "node:path";
import { homedir } from "node:os";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const blake3 = require("/data/data/com.termux/files/usr/lib/node_modules/wrangler/node_modules/blake3-wasm");

function resolveToken() {
  if (process.env.CF_API_TOKEN) return process.env.CF_API_TOKEN;
  const path = join(homedir(), ".cf_api_token");
  if (existsSync(path)) return readFileSync(path, "utf8").trim();
  return undefined;
}

const TOKEN = process.env.CF_API_TOKEN ?? resolveToken();
const ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const SCRIPT = process.env.CF_SCRIPT ?? "maya-ui";
const DIST = process.env.CF_DIST_DIR
  ? new URL(process.env.CF_DIST_DIR + "/", import.meta.url).pathname
  : new URL("./dist/", import.meta.url).pathname;
const SCRIPT_MAIN = process.env.CF_SCRIPT_MAIN
  ? new URL(process.env.CF_SCRIPT_MAIN + "/", import.meta.url).pathname
  : new URL("./worker-src/index.js", import.meta.url).pathname;
const COMPAT_DATE = process.env.CF_COMPAT_DATE ?? "2026-08-16";
const API = "https://api.cloudflare.com/client/v4";

if (!TOKEN || !ACCOUNT_ID) {
  console.error("Set CF_API_TOKEN / CF_ACCOUNT_ID");
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
  const name = file.split(sep).pop() ?? "";
  if (name.endsWith(".html")) return "text/html";
  if (name.endsWith(".js")) return "application/javascript";
  if (name.endsWith(".css")) return "text/css";
  if (name.endsWith(".svg")) return "image/svg+xml";
  if (name.endsWith(".json")) return "application/json";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".ico")) return "image/x-icon";
  return "application/octet-stream";
}

async function api(path, { method = "GET", headers = {}, body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, ...headers },
    body,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 500) };
  }
  if (!res.ok || json.success === false) {
    throw new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 500)}`);
  }
  return json;
}

// 1. Build manifest { "path": { hash, size } } from dist/
// Workers Static Assets manifest hashes use wrangler's format:
// blake3(base64(content) + extension).hex.slice(0, 32)
const files = (await walk(DIST)).filter(
  (f) => !f.endsWith(sep + "_redirects")
);
function assetHash(filepath) {
  const contents = readFileSync(filepath);
  const base64Contents = contents.toString("base64");
  const ext = extname(filepath).substring(1);
  return blake3.hash(base64Contents + ext).toString("hex").slice(0, 32);
}
const manifest = {};
for (const f of files) {
  const rel = "/" + relative(DIST, f).split(sep).join("/");
  const buf = await readFile(f);
  manifest[rel] = {
    hash: assetHash(f),
    size: buf.length,
  };
}
console.log("Manifest:", JSON.stringify(manifest));

// 2. Create assets upload session
const session = (
  await api(`/accounts/${ACCOUNT_ID}/workers/scripts/${SCRIPT}/assets-upload-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ manifest }),
  })
).result;
const { jwt: assetsJwt, buckets } = session;
console.log("Upload session OK, buckets:", JSON.stringify(buckets));

// 3. Upload each asset by hash (raw body, content-type header). Each upload
// response carries a completion JWT; the last one is the asset completion token
// used in the script metadata.
let completionJwt = "";
for (const bucket of buckets) {
  for (const hash of bucket) {
    const entry = Object.entries(manifest).find(([, m]) => m.hash === hash);
    if (!entry) throw new Error(`manifest entry missing for hash ${hash}`);
    const [relPath] = entry;
    const abs = join(DIST, ...relPath.split("/").filter(Boolean));
    const buf = await readFile(abs);
    const res = await fetch(
      `${API}/accounts/${ACCOUNT_ID}/workers/assets/upload/${hash}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${assetsJwt}`,
          "Content-Type": contentType(abs),
        },
        body: buf,
        duplex: "half",
      }
    );
    const text = await res.text();
    if (!res.ok) throw new Error(`asset upload ${relPath} -> ${res.status}: ${text.slice(0, 300)}`);
    try {
      const j = JSON.parse(text);
      if (j.result?.jwt) completionJwt = j.result.jwt;
    } catch {}
    console.log(`Uploaded ${relPath}`);
  }
}
if (!completionJwt) {
  console.warn("No completion JWT from asset uploads; using session JWT");
  completionJwt = assetsJwt;
}
console.log("Completion JWT:", completionJwt.slice(0, 24) + "...");

// 4. Upload the Worker script (multipart: metadata with assets binding + main module)
const scriptBuf = await readFile(SCRIPT_MAIN);
const metadata = {
  main_module: "index.js",
  compatibility_date: COMPAT_DATE,
  bindings: [{ type: "assets", name: "ASSETS" }],
  assets: {
    jwt: completionJwt,
    config: {
      html_handling: "auto-trailing-slash",
      not_found_handling: "single-page-application",
    },
  },
};
const form = new FormData();
form.append("metadata", JSON.stringify(metadata));
form.append(
  "index.js",
  new Blob([scriptBuf], { type: "application/javascript+module" }),
  "index.js"
);
const putRes = await fetch(`${API}/accounts/${ACCOUNT_ID}/workers/scripts/${SCRIPT}`, {
  method: "PUT",
  headers: { Authorization: `Bearer ${TOKEN}` },
  body: form,
});
const putText = await putRes.text();
console.log("Script upload:", putRes.status, putText.slice(0, 400));
if (!putRes.ok) throw new Error(`script upload failed: ${putText.slice(0, 500)}`);

// 5. Create deployment (100% traffic to this version). The PUT response does
// not carry the version id; fetch the latest version after the upload.
const putJson = JSON.parse(putText);
if (putJson.result?.has_assets !== true) {
  console.warn("Warning: PUT response did not confirm assets binding");
}
const versionsRes = await api(`/accounts/${ACCOUNT_ID}/workers/scripts/${SCRIPT}/versions`);
const latestVersion = versionsRes.result?.items?.[0];
const versionId = latestVersion?.id;
if (!versionId) throw new Error(`no latest version id: ${JSON.stringify(versionsRes.result).slice(0, 300)}`);
console.log("Version ID:", versionId);
const dep = await api(`/accounts/${ACCOUNT_ID}/workers/scripts/${SCRIPT}/deployments`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    strategy: "percentage",
    versions: [{ version_id: versionId, percentage: 100 }],
  }),
});
console.log("Deployment:", JSON.stringify(dep.result).slice(0, 400));

// Worker URL: resolve the account subdomain
async function subdomain() {
  const r = await api(`/accounts/${ACCOUNT_ID}/workers/subdomain`);
  return r.result?.subdomain ?? "";
}
console.log("Worker URL: https://" + SCRIPT + "." + (await subdomain()) + ".workers.dev");
