#!/usr/bin/env node
// Media request census for an exported Reader web build (apps/mobile/dist).
//
// Purpose: measure which origins a CI-style browser pass asks for images, so the
// staging egress control (docs/cost-recovery/CI_STAGING_EGRESS_CONTROL.md) can be
// verified before and after a change.
//
// Safety: Chromium is launched with *.supabase.co made unresolvable, so every
// staging request is counted but never leaves the machine. The census therefore
// adds no load to the Free-tier staging project. Requests to other origins
// (including the Cloudflare media mirror) proceed normally. No request
// interception is used, so the browser HTTP cache behaves as in CI.
//
// Usage (from the repository root, after `npm run build:phase4:web`):
//   node scripts/ci/media-request-census.mjs [--out census.json] [--port 4174]
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(path.resolve("package.json"));
const { chromium } = require("playwright");

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const port = Number(option("--port", process.env.PORT || "4174"));
const out = option("--out", "");
const base = `http://127.0.0.1:${port}`;
const dist = path.resolve("apps/mobile/dist");
if (!fs.existsSync(path.join(dist, "index.html"))) throw new Error("Missing apps/mobile/dist/index.html; build first.");

const MIRROR_HOST = /(^|\.)healthtimes-media\.pages\.dev$/;
const VIEWPORTS = [
  { name: "phone-390", width: 390, height: 844 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1440", width: 1440, height: 900 }
];
const FIXED_ROUTES = ["/", "/explore", "/watch", "/search", "/premium"];

function classify(url) {
  let parsed;
  try { parsed = new URL(url); } catch { return "other"; }
  if (parsed.hostname.endsWith(".supabase.co")) {
    return parsed.pathname.startsWith("/storage/v1/object/") ? "supabase_storage" : "supabase_api";
  }
  if (MIRROR_HOST.test(parsed.hostname)) return "cloudflare_media";
  if (parsed.hostname.endsWith("healthtimes.co.zw") && parsed.pathname.startsWith("/wp-content/")) return "wordpress_media";
  if (parsed.origin === base) return "local_bundle";
  return "other_external";
}

function compiledMediaOrigins() {
  const found = new Set();
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".js")) {
        const text = fs.readFileSync(full, "utf8");
        for (const match of text.matchAll(/https:\/\/[a-z0-9.-]*healthtimes-media\.pages\.dev/g)) found.add(match[0]);
      }
    }
  };
  const expo = path.join(dist, "_expo");
  if (fs.existsSync(expo)) walk(expo);
  return [...found].sort();
}

async function waitForServer() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try { if ((await fetch(base + "/")).ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Static server did not start");
}

async function settle(page) {
  await page.waitForLoadState("load").catch(() => {});
  await page.waitForTimeout(2500);
  await page.evaluate(async () => {
    for (let y = 0; y <= document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    window.scrollTo(0, 0);
  }).catch(() => {});
  await page.waitForTimeout(1500);
}

async function imageState(page) {
  return page.evaluate(() => {
    const imgs = [...document.querySelectorAll("img")].filter((img) => (img.currentSrc || img.src));
    const hosts = {};
    let loaded = 0;
    let broken = 0;
    for (const img of imgs) {
      const src = img.currentSrc || img.src;
      let host = "data";
      try { host = src.startsWith("data:") ? "data" : new URL(src).hostname; } catch {}
      hosts[host] = (hosts[host] || 0) + 1;
      if (img.complete && img.naturalWidth > 0) loaded += 1;
      else if (img.complete) broken += 1;
    }
    return { total: imgs.length, loaded, broken, hosts };
  });
}

const server = spawn(process.execPath, ["scripts/ui/ui-rel04-current-static-server.cjs"], {
  env: { ...process.env, PORT: String(port) },
  stdio: "ignore"
});
const rows = [];
try {
  await waitForServer();
  const browser = await chromium.launch({ args: ["--host-resolver-rules=MAP *.supabase.co ~NOTFOUND"] });
  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, serviceWorkers: "block" });
    const page = await context.newPage();
    let current = null;
    page.on("request", (request) => {
      if (!current) return;
      const kind = classify(request.url());
      current.requests[kind] = (current.requests[kind] || 0) + 1;
      if (kind === "supabase_storage" || kind === "cloudflare_media" || kind === "wordpress_media") current.objects.add(kind + " " + request.url());
    });
    const visit = async (route) => {
      current = { viewport: viewport.name, route, requests: {}, objects: new Set() };
      await page.goto(base + route, { waitUntil: "domcontentloaded", timeout: 60000 });
      await settle(page);
      const images = await imageState(page);
      rows.push({ viewport: current.viewport, route, requests: current.requests, uniqueMediaObjects: [...current.objects].sort(), images });
      current = null;
    };
    await visit("/");
    const articleLinks = await page.evaluate(() => [...new Set([...document.querySelectorAll('a[href*="/article/"]')].map((a) => new URL(a.href).pathname))].slice(0, 2));
    for (const route of FIXED_ROUTES.slice(1)) await visit(route);
    for (const route of articleLinks) await visit(route);
    await context.close();
  }
  await browser.close();
} finally {
  server.kill();
}

const totals = { requests: {}, uniqueObjects: {}, images: { total: 0, loaded: 0, broken: 0 } };
const unique = new Set();
for (const row of rows) {
  for (const [kind, count] of Object.entries(row.requests)) totals.requests[kind] = (totals.requests[kind] || 0) + count;
  for (const object of row.uniqueMediaObjects) unique.add(object);
  totals.images.total += row.images.total;
  totals.images.loaded += row.images.loaded;
  totals.images.broken += row.images.broken;
}
for (const object of unique) {
  const kind = object.split(" ")[0];
  totals.uniqueObjects[kind] = (totals.uniqueObjects[kind] || 0) + 1;
}
const report = {
  generatedAt: new Date().toISOString(),
  buildInfo: JSON.parse(fs.readFileSync(path.join(dist, "build-info.json"), "utf8")),
  compiledMediaOrigins: compiledMediaOrigins(),
  method: "Chromium, fresh context per viewport, service workers blocked, *.supabase.co unresolvable (counted, never sent)",
  totals,
  uniqueMediaObjects: [...unique].sort(),
  rows
};
if (out) fs.writeFileSync(out, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ compiledMediaOrigins: report.compiledMediaOrigins, totals, pages: rows.length }, null, 2));
