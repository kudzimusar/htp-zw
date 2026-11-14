// G2G4G6-PARALLEL-CLOSE-01 Workstream A: legacy WordPress URL preservation through the
// real public edge handler (api/public.js) and vercel.json. Offline: the Supabase resolver
// is stubbed with a faithful port of ag05_resolve_public_path over the pilot redirect
// manifest. No network, no secrets.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const vercel = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"));
const manifest = JSON.parse(fs.readFileSync(path.join(here, "fixtures/redirect-manifest-pilot.json"), "utf8"));
const handler = require("../../api/public.js");
const SHELL = '<!DOCTYPE html><html><head><title data-rh="true"></title></head><body><div id="root"></div></body></html>';

const norm = (p) => { let x = p.replace(/\/{2,}/g, "/").toLowerCase(); return x.endsWith("/") ? x : x + "/"; };
const mappings = new Map(manifest.map((m) => [norm(m.sourcePath), m]));
const slugIndex = new Map();
for (const m of manifest) {
  const slug = norm(m.targetPath).replace(/^.*\/([^/]+)\/$/, "$1");
  slugIndex.set(slug, [...(slugIndex.get(slug) ?? []), m]);
}

// Port of supabase/migrations/20260922003722_ag05_url_resolution_ledger.sql (direct
// mapping, then unique-slug alias, otherwise an explicit 404; never the homepage).
function resolve(p) {
  const v = norm(p);
  if (v === "/") return { resolution: "homepage", http_status: 200, target_path: "/" };
  const direct = mappings.get(v);
  if (direct) return { resolution: "preserved_direct", http_status: 200, requested_path: v, target_path: norm(direct.targetPath) };
  const slug = v.replace(/^.*\/([^/]+)\/$/, "$1");
  const hits = slugIndex.get(slug) ?? [];
  if (hits.length === 1) return { resolution: "alias_redirect", http_status: 301, requested_path: v, target_path: norm(hits[0].targetPath) };
  return { resolution: "explicit_404_exception", http_status: 404, target_path: null };
}

async function invoke(htpPath) {
  const saved = { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_PUBLISHABLE_KEY };
  process.env.SUPABASE_URL = "https://stub-project.supabase.co";
  process.env.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_stub";
  handler._internals.setShellLoader(() => SHELL);
  const original = globalThis.fetch;
  const rpcs = [];
  globalThis.fetch = async (input, init = {}) => {
    const name = String(input).match(/\/rpc\/([a-z0-9_]+)$/)?.[1];
    const args = init.body ? JSON.parse(init.body) : {};
    rpcs.push(name);
    let json = null;
    if (name === "ag05_resolve_public_path") json = resolve(args.p_path);
    if (name === "ag05_public_story_document") json = { title: "Story", story_title: "Story", access_policy: "public", canonical_url: "https://healthtimes.co.zw" + norm(args.p_path), body_html: "<p>x</p>" };
    if (name === "ag05_public_context_document") json = /^\/category\/(news|health)\/$/.test(norm(args.p_path)) ? { kind: "category", slug: "news", name: "News" } : null;
    // PostgREST answers a function returning NULL with HTTP 200 and a JSON null body.
    return new Response(JSON.stringify(json), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  const res = { statusCode: 200, headers: {}, body: "", setHeader(k, v) { this.headers[k.toLowerCase()] = String(v); }, getHeader(k) { return this.headers[k.toLowerCase()]; }, end(c) { this.body = c == null ? "" : String(c); } };
  try {
    await handler({ method: "GET", url: "/api/public?kind=page&htpPath=" + encodeURIComponent(htpPath), headers: { host: "healthtimes.co.zw" } }, res);
  } finally {
    globalThis.fetch = original;
    handler._internals.setShellLoader(null);
    for (const [k, v] of [["SUPABASE_URL", saved.url], ["SUPABASE_PUBLISHABLE_KEY", saved.key]]) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  }
  return { status: res.statusCode, location: res.headers.location, page: res.headers["x-htp-page"], rpcs };
}

// Compiled form of the final vercel.json rewrite (see tests/g5-web-edge.test.mjs).
const reachesRenderer = (p) => /^(?:\/((?!api\/|_expo\/|_htp\/|assets\/)[^.]*))$/.test(p);

test("the pilot manifest is internally consistent: 149 unique preserved paths", () => {
  assert.equal(manifest.length, 149);
  assert.equal(mappings.size, 149);
  assert.ok(manifest.every((m) => m.status === "preserve"));
});

test("every preserved legacy article and page URL serves 200 at its original path", async () => {
  const failures = [];
  for (const m of manifest) {
    if (m.sourcePath === "/") continue; // the root is served by the Reader home, not the renderer
    assert.ok(reachesRenderer(m.sourcePath), m.sourcePath);
    const r = await invoke(m.sourcePath);
    if (r.status !== 200 || r.page !== "story") failures.push(`${m.sourcePath} -> ${r.status} ${r.page}`);
  }
  assert.deepEqual(failures, []);
});

test("a date-style or nested legacy permalink 301s to the unique canonical article", async () => {
  const target = manifest.find((m) => m.sourcePath !== "/").targetPath;
  const slug = target.replace(/^\/|\/$/g, "");
  const r = await invoke(`/2026/09/15/${slug}/`);
  assert.equal(r.status, 301);
  assert.equal(r.location, norm(target));
});

test("unknown legacy paths are an explicit 404, never a homepage redirect", async () => {
  const r = await invoke("/this-story-never-existed/");
  assert.equal(r.status, 404);
  assert.equal(r.location, undefined);
});

test("WordPress category archives render as context pages; unknown ones 404", async () => {
  assert.equal((await invoke("/category/news/")).page, "context");
  assert.equal((await invoke("/category/does-not-exist/")).status, 404);
});

test("WordPress admin and API surfaces never reach the resolver", async () => {
  for (const p of ["/wp-admin/", "/wp-login/", "/wp-json/wp/v2/posts/", "/xmlrpc/"]) {
    const r = await invoke(p);
    assert.equal(r.status, 404, p);
    assert.equal(r.rpcs.length, 0, p + " must not query the database");
  }
});

test("vercel.json keeps the legacy uploads redirect, feed and author routes", () => {
  const uploads = vercel.redirects.find((r) => r.source === "/wp-content/uploads/:path*");
  assert.equal(uploads.statusCode, 301);
  assert.match(uploads.destination, /^https:\/\/healthtimes-media\.pages\.dev\/wordpress\/:path\*$/);
  const rewrites = Object.fromEntries(vercel.rewrites.map((r) => [r.source, r.destination]));
  assert.equal(rewrites["/feed"], "/api/public?kind=feed");
  assert.equal(rewrites["/feed/"], "/api/public?kind=feed");
  assert.equal(rewrites["/author/:slug*"], "/author/fallback");
});

// Known gap, recorded rather than fixed here: WordPress shortlinks (/?p=<id>, the post
// GUID in old RSS items and share links) arrive at "/" with a query string. Nothing maps
// them to the article, so they land on the Reader home. See the package doc, gap A-3.
test("GAP A-3: /?p=<id> shortlinks are not preserved by any current route", () => {
  const routed = [...(vercel.redirects ?? []), ...vercel.rewrites].some((r) => (r.has ?? []).some((h) => h.type === "query" && h.key === "p"));
  assert.equal(routed, false, "if this fails, a shortlink route was added: update gap A-3 and replace this test");
});
