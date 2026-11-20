#!/usr/bin/env node
/**
 * HT-MVP-G3-LOCAL-FIRST-UAT-LR03 — Deterministic Owner-Terminal Six-Width, Route & Cloudflare Media UAT Runner
 *
 * Usage (from repository root while Expo Web is running on port 8091):
 *   node docs/owner-uat/run-lr03-six-width-uat.mjs
 *
 * Optional overrides:
 *   UAT_BASE_URL=http://localhost:8091 node docs/owner-uat/run-lr03-six-width-uat.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("@playwright/test");

const BASE_URL = (process.env.UAT_BASE_URL || "http://localhost:8091").replace(/\/+$/, "");
const MEDIA_BASE = "https://healthtimes-media.pages.dev";
const OUT_DIR = path.resolve("docs/owner-uat/lr03-screenshots");
const RESULTS_FILE = path.resolve("docs/owner-uat/lr03-results.json");

const VIEWPORTS = [
  { name: "279px", width: 279, height: 640, class: "ultra-compact-mobile" },
  { name: "360px", width: 360, height: 800, class: "android-mobile" },
  { name: "390px", width: 390, height: 844, class: "ios-mobile" },
  { name: "768px", width: 768, height: 1024, class: "tablet-portrait" },
  { name: "1280px", width: 1280, height: 800, class: "laptop-desktop" },
  { name: "1920px", width: 1920, height: 1080, class: "full-hd-desktop" }
];

const APPROVED_CLOUDFLARE_MEDIA = [
  {
    id: "media-1",
    slug: "zimbabwe-strengthens-social-contracting-as-hiv-donor-funding-shrinks",
    objectPath: "wordpress/2026/09/zimbabwe-social-contracting-hiv-financing-dialogue.jpg",
    expectedMimePrefix: "image/jpeg",
    accessPolicy: "premium"
  },
  {
    id: "media-2",
    slug: "ahf-urges-zimbabwe-to-join-borrowers-forum-amid-debt-crisis",
    objectPath: "wordpress/2026/09/enerst-chikwati-ahf-zimbabwe-country-director.jpeg",
    expectedMimePrefix: "image/jpeg",
    accessPolicy: "public"
  },
  {
    id: "media-3",
    slug: "africa-cdc-ebola-contact-tracing-community-deaths-drc",
    objectPath: "wordpress/2026/01/enhanced_1200x665.jpg",
    expectedMimePrefix: "image/jpeg",
    accessPolicy: "public"
  },
  {
    id: "media-4",
    slug: "meet-dr-neddy-zimbabwes-fourth-female-orthopaedic-surgeon",
    objectPath: "wordpress/2026/09/dr-neddy-makonza-zimbabwe-fourth-female-orthopaedic-surgeon.png",
    expectedMimePrefix: "image/png",
    accessPolicy: "public"
  },
  {
    id: "media-5",
    slug: "chief-nyamaropa-orders-woman-to-pay-cow-over-alleged-hiv-transmission",
    objectPath: "wordpress/2026/09/Chief-Nyamaropa.jpeg",
    expectedMimePrefix: "image/jpeg",
    accessPolicy: "public"
  },
  {
    id: "media-6",
    slug: "fiji-hiv-emergency-epidemic-spreads-beyond-drug-users",
    objectPath: "wordpress/2026/09/aids-2026-protest-hiv-indigenous-people-fiji-creative-commons-https-creativecommons-org-licenses-by-sa-4-0.jpg.png",
    expectedMimePrefix: "image/png",
    accessPolicy: "public"
  },
  {
    id: "media-7",
    slug: "not-in-my-constituency-zimbabwe-teenage-pregnancy-tags",
    objectPath: "wordpress/2026/09/zimbabwe-parliamentarians-not-in-my-constituency-teenage-pregnancy.jpg",
    expectedMimePrefix: "image/jpeg",
    accessPolicy: "public"
  }
];

const UNAPPROVED_MEDIA_LEADS = [
  "doctor-playing-with-child-cleft-lip-zimbabwe-medical-mission.jpg",
  "Africa-led-SUPPRESS-LA-trial-to-prevent-mother-to-child-HIV-transmission.png",
  "datcitizen-backpack-walk-women-girls-harare-zimbabwe.jpg.jpg"
];

const ROUTES = [
  { key: "home", path: "/", expectText: "Top Stories" },
  { key: "explore", path: "/explore", expectText: "Explore" },
  {
    key: "article-public",
    path: "/article/source-ahf-urges-zimbabwe-to-join-borrowers-forum-amid-debt-crisis",
    expectText: "Zimbabwe urged to join Borrowers Forum",
    expectShareControl: true,
    expectCloudflareImg: true
  },
  {
    key: "article-premium",
    path: "/article/source-zimbabwe-strengthens-social-contracting-as-hiv-donor-funding-shrinks",
    expectText: "Continue reading with HealthTimes Premium",
    expectCloudflareImg: true
  },
  { key: "authors", path: "/authors", expectText: "Michael Gwarisa" },
  { key: "author-profile", path: "/author/michael-gwarisa", expectText: "Michael Gwarisa" },
  { key: "search", path: "/search", expectText: "Search" },
  { key: "live", path: "/live", expectText: "Live" },
  { key: "watch", path: "/watch", expectText: "Watch" },
  { key: "saved", path: "/saved?tab=saved", expectText: "Saved & Offline" },
  { key: "history", path: "/saved?tab=history", expectText: "Reading history" },
  { key: "premium", path: "/premium", expectText: "HEALTHTIMES PREMIUM" },
  { key: "my", path: "/my", expectText: "My HealthTimes" }
];

async function verifyCloudflareMedia() {
  const results = [];
  for (const item of APPROVED_CLOUDFLARE_MEDIA) {
    const url = `${MEDIA_BASE}/${item.objectPath}`;
    try {
      const res = await fetch(url, { method: "HEAD" });
      const contentType = res.headers.get("content-type") || "";
      const contentLength = Number(res.headers.get("content-length") || 0);
      const ok = res.status === 200 && contentType.startsWith(item.expectedMimePrefix) && contentLength > 1000;
      results.push({
        id: item.id,
        slug: item.slug,
        url,
        status: res.status,
        contentType,
        contentLength,
        result: ok ? "PASS" : "FAIL"
      });
    } catch (err) {
      results.push({
        id: item.id,
        slug: item.slug,
        url,
        status: null,
        contentType: null,
        contentLength: 0,
        error: String(err),
        result: "FAIL"
      });
    }
  }
  return results;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log(`\n[LR03] Checking local server at ${BASE_URL} ...`);
  const probe = await fetch(BASE_URL);
  if (!probe.ok) {
    throw new Error(`Local Reader server at ${BASE_URL} returned HTTP ${probe.status}`);
  }
  console.log(`[LR03] Local server reachable (HTTP ${probe.status}).`);

  console.log(`[LR03] Verifying 7 approved Cloudflare media objects on ${MEDIA_BASE} ...`);
  const cloudflareMedia = await verifyCloudflareMedia();

  const browser = await chromium.launch({ headless: true });
  const matrix = [];

  for (const vp of VIEWPORTS) {
    console.log(`\n[LR03] Running viewport ${vp.name} (${vp.width}x${vp.height}) ...`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1
    });

    for (const route of ROUTES) {
      const page = await context.newPage();
      const pageErrors = [];
      const consoleErrors = [];
      const http402Urls = [];
      const failedRequests = [];
      const cspViolations = [];

      await page.addInitScript(() => {
        window.__lr03CspViolations = [];
        window.addEventListener("securitypolicyviolation", (e) => {
          window.__lr03CspViolations.push(`${e.violatedDirective}: ${e.blockedURI}`);
        });
      });

      page.on("pageerror", (e) => pageErrors.push(e.message));
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });
      page.on("response", (res) => {
        if (res.status() === 402) http402Urls.push(res.url());
      });
      page.on("requestfailed", (req) => {
        failedRequests.push(`${req.url()} (${req.failure()?.errorText || "failed"})`);
      });

      let httpStatus = null;
      let loadError = null;
      try {
        const resp = await page.goto(`${BASE_URL}${route.path}`, {
          waitUntil: "domcontentloaded",
          timeout: 30000
        });
        httpStatus = resp?.status() ?? null;
        await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(1000);
      } catch (err) {
        loadError = String(err);
      }

      const domAudit = await page.evaluate((unapproved) => {
        const bodyText = document.body?.innerText || "";
        const scrollWidth = document.documentElement.scrollWidth;
        const innerWidth = window.innerWidth;
        const overflowPx = Math.max(0, scrollWidth - innerWidth);
        const imgs = Array.from(document.images);
        const brokenImgs = imgs.filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.src);
        const cloudflareImgs = imgs
          .filter((i) => i.src.includes("healthtimes-media.pages.dev") && i.complete && i.naturalWidth > 0)
          .map((i) => i.src);
        const leakedUnapprovedLeads = imgs
          .map((i) => i.src)
          .filter((src) => unapproved.some((lead) => src.includes(lead)));
        const missingAltCount = imgs.filter((i) => !i.hasAttribute("alt")).length;
        const sharePresent = Boolean(
          document.querySelector('[aria-label*="Share" i]') ||
          Array.from(document.querySelectorAll('button, [role="button"]')).some((el) =>
            /share/i.test(el.textContent || el.getAttribute("aria-label") || "")
          )
        );
        return {
          bodyTextSample: bodyText.slice(0, 400),
          bodyTextFullLength: bodyText.length,
          hasExpectedText: false,
          overflowPx,
          totalImgs: imgs.length,
          brokenImgs,
          cloudflareImgs,
          leakedUnapprovedLeads,
          missingAltCount,
          sharePresent,
          cspViolations: window.__lr03CspViolations || []
        };
      }, UNAPPROVED_MEDIA_LEADS);

      const fullBodyText = await page.locator("body").innerText().catch(() => "");
      const hasExpectedText = fullBodyText.toLowerCase().includes(route.expectText.toLowerCase());
      cspViolations.push(...domAudit.cspViolations);

      const screenshotPath = path.join(OUT_DIR, `${vp.width}px-${route.key}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});

      const passed =
        !loadError &&
        httpStatus === 200 &&
        hasExpectedText &&
        domAudit.overflowPx <= 1 &&
        pageErrors.length === 0 &&
        http402Urls.length === 0 &&
        cspViolations.length === 0 &&
        domAudit.brokenImgs.length === 0 &&
        domAudit.leakedUnapprovedLeads.length === 0 &&
        (!route.expectShareControl || domAudit.sharePresent) &&
        (!route.expectCloudflareImg || domAudit.cloudflareImgs.length > 0);

      const entry = {
        viewport: vp.name,
        width: vp.width,
        routeKey: route.key,
        routePath: route.path,
        httpStatus,
        hasExpectedText,
        overflowPx: domAudit.overflowPx,
        totalImgs: domAudit.totalImgs,
        cloudflareLoadedCount: domAudit.cloudflareImgs.length,
        brokenImgsCount: domAudit.brokenImgs.length,
        leakedUnapprovedLeadsCount: domAudit.leakedUnapprovedLeads.length,
        sharePresent: domAudit.sharePresent,
        missingAltCount: domAudit.missingAltCount,
        http402Count: http402Urls.length,
        cspViolationsCount: cspViolations.length,
        pageErrorsCount: pageErrors.length,
        consoleErrorsCount: consoleErrors.length,
        failedRequestsCount: failedRequests.length,
        screenshot: path.relative(process.cwd(), screenshotPath),
        result: passed ? "PASS" : "FAIL",
        diagnostics: {
          loadError,
          pageErrors,
          consoleErrors,
          http402Urls,
          cspViolations,
          brokenImgs: domAudit.brokenImgs,
          failedRequests
        }
      };

      matrix.push(entry);
      console.log(
        `  [${entry.result}] ${vp.name.padEnd(6)} ${route.key.padEnd(16)} overflow=${entry.overflowPx}px imgs=${entry.totalImgs} cf=${entry.cloudflareLoadedCount} broken=${entry.brokenImgsCount} 402=${entry.http402Count} csp=${entry.cspViolationsCount} errs=${entry.pageErrorsCount}`
      );
      await page.close();
    }
    await context.close();
  }

  await browser.close();

  const summary = {
    executedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    mediaBase: MEDIA_BASE,
    cloudflareMedia,
    totals: {
      cloudflarePass: cloudflareMedia.filter((m) => m.result === "PASS").length,
      cloudflareTotal: cloudflareMedia.length,
      matrixPass: matrix.filter((m) => m.result === "PASS").length,
      matrixFail: matrix.filter((m) => m.result === "FAIL").length,
      matrixTotal: matrix.length
    },
    matrix
  };

  fs.writeFileSync(RESULTS_FILE, JSON.stringify(summary, null, 2));
  console.log(`\n[LR03] Wrote results to ${path.relative(process.cwd(), RESULTS_FILE)}`);
  console.log(
    `[LR03] Summary: Cloudflare Media ${summary.totals.cloudflarePass}/${summary.totals.cloudflareTotal} PASS | Six-Width Matrix ${summary.totals.matrixPass}/${summary.totals.matrixTotal} PASS (${summary.totals.matrixFail} FAIL)`
  );
  if (summary.totals.cloudflarePass < summary.totals.cloudflareTotal || summary.totals.matrixFail > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("[LR03] Fatal runner error:", err);
  process.exit(1);
});
