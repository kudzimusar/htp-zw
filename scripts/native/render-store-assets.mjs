#!/usr/bin/env node
// HT-MVP-PUBLIC-LAUNCH-01-G6: renders DRAFT store/icon assets from the existing brand
// mark (apps/mobile/public/healthtimes-icon.svg) for HealthTimes brand review.
// Not wired into app.config.ts; nothing is submitted. Usage:
//   node scripts/native/render-store-assets.mjs <output-dir>
import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const out = path.resolve(process.argv[2] || "store-assets-draft");
const svg = fs.readFileSync(path.join(process.cwd(), "apps/mobile/public/healthtimes-icon.svg"), "utf8");
// The mark without its own rounded tile, for adaptive-icon foregrounds and splash.
const mark = svg.replace(/<rect[^>]*\/>/, "");
const NAVY = "#092b3a";

const ASSETS = [
  { file: "ios-app-icon-1024.png", w: 1024, h: 1024, body: `<div style="width:1024px;height:1024px;background:${NAVY}">${mark.replace("<svg", '<svg width="1024" height="1024"')}</div>`, opaque: true },
  { file: "play-store-icon-512.png", w: 512, h: 512, body: `<div style="width:512px;height:512px;background:${NAVY}">${mark.replace("<svg", '<svg width="512" height="512"')}</div>`, opaque: true },
  // Android adaptive icon: 108dp canvas, keep the mark inside the central 66dp safe zone.
  { file: "android-adaptive-foreground-1024.png", w: 1024, h: 1024, body: `<div style="width:1024px;height:1024px;display:flex;align-items:center;justify-content:center">${mark.replace("<svg", '<svg width="626" height="626"')}</div>`, opaque: false },
  { file: "android-adaptive-background-1024.png", w: 1024, h: 1024, body: `<div style="width:1024px;height:1024px;background:${NAVY}"></div>`, opaque: true },
  { file: "splash-icon-1024.png", w: 1024, h: 1024, body: `<div style="width:1024px;height:1024px;display:flex;align-items:center;justify-content:center">${mark.replace("<svg", '<svg width="512" height="512"')}</div>`, opaque: false },
  {
    file: "play-feature-graphic-1024x500.png", w: 1024, h: 500, opaque: true,
    body: `<div style="width:1024px;height:500px;background:${NAVY};display:flex;align-items:center;gap:48px;padding:0 96px;box-sizing:border-box;font-family:Helvetica,Arial,sans-serif;color:#fff">
      ${mark.replace("<svg", '<svg width="260" height="260"')}
      <div><div style="font-size:72px;font-weight:800;letter-spacing:-1px">HealthTimes</div>
      <div style="font-size:30px;opacity:.85;margin-top:12px">Health news from Zimbabwe</div></div></div>`
  }
];

fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const manifest = [];
for (const asset of ASSETS) {
  const page = await browser.newPage({ viewport: { width: asset.w, height: asset.h }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html><body style="margin:0;background:transparent">${asset.body}</body></html>`);
  const file = path.join(out, asset.file);
  await page.screenshot({ path: file, omitBackground: !asset.opaque, clip: { x: 0, y: 0, width: asset.w, height: asset.h } });
  await page.close();
  manifest.push({ file: asset.file, width: asset.w, height: asset.h, opaqueBackground: asset.opaque, status: "DRAFT_FOR_BRAND_REVIEW" });
}
await browser.close();
fs.writeFileSync(path.join(out, "assets-manifest.json"), JSON.stringify({ source: "apps/mobile/public/healthtimes-icon.svg", assets: manifest }, null, 2) + "\n");
console.log(JSON.stringify(manifest.map(m => m.file + " " + m.width + "x" + m.height)));
