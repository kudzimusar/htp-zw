import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const PREVIEW_URL = 'https://healthtimes-staging-czazp4yi8-11-11.vercel.app';
const bypassPath = path.join(os.homedir(), '.healthtimes-secrets', 'vercel-bypass');
const bypassToken = fs.existsSync(bypassPath) ? fs.readFileSync(bypassPath, 'utf8').trim() : '';

const actorsPath = path.join(os.homedir(), '.healthtimes-secrets', 'test-actors.json');
const actors = fs.existsSync(actorsPath) ? JSON.parse(fs.readFileSync(actorsPath, 'utf8')) : {};
const commercial = actors['uat-commercial@healthtimes.test'];

const OUT_RECORD = path.resolve('docs/delivery/evidence/HT-MVP-UIAT-01-R2/records/DEF014-performance-report.json');

async function measureNavigationMetrics(page) {
  return await page.evaluate(() => {
    return new Promise((resolve) => {
      const navEntries = performance.getEntriesByType('navigation');
      const nav = navEntries.length > 0 ? navEntries[0] : null;

      let lcpValue = null;
      let clsValue = 0;

      try {
        const poLcp = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          if (entries.length > 0) {
            lcpValue = entries[entries.length - 1].startTime;
          }
        });
        poLcp.observe({ type: 'largest-contentful-paint', buffered: true });

        const poCls = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          }
        });
        poCls.observe({ type: 'layout-shift', buffered: true });
      } catch (e) {}

      setTimeout(() => {
        const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
        
        const resources = performance.getEntriesByType('resource').map(r => ({
          name: r.name.split('?')[0].split('/').slice(-2).join('/'),
          duration: Math.round(r.duration),
          size: r.transferSize || 0,
          initiatorType: r.initiatorType
        }));

        const totalTransfer = resources.reduce((acc, r) => acc + r.size, 0);

        resolve({
          ttfb: nav ? Math.round(nav.responseStart - nav.requestStart) : null,
          domContentLoaded: nav ? Math.round(nav.domContentLoadedEventEnd - nav.startTime) : null,
          loadComplete: nav ? Math.round(nav.loadEventEnd - nav.startTime) : null,
          fcp: fcpEntry ? Math.round(fcpEntry.startTime) : null,
          lcp: lcpValue ? Math.round(lcpValue) : null,
          cls: Math.round(clsValue * 1000) / 1000,
          resourceCount: resources.length,
          totalTransferBytes: totalTransfer,
          slowestResources: resources.sort((a, b) => b.duration - a.duration).slice(0, 5)
        });
      }, 1000);
    });
  });
}

async function runBenchmark() {
  console.log('====================================================');
  console.log('STARTING DEF-014 PERFORMANCE & LATENCY BENCHMARK');
  console.log('====================================================');

  const browser = await chromium.launch({ headless: true });
  const results = {
    timestamp: new Date().toISOString(),
    environment: {
      previewUrl: PREVIEW_URL,
      expectedSha: '126f81c65e24d30167deb21c06c598e39bf8ea10'
    },
    benchmarks: {}
  };

  const iterations = 3;

  // 1. Desktop Cold & Warm Homepage
  console.log('\n[1/7] Benchmarking Homepage Navigation (Desktop 1440x900)...');
  const desktopHomeCold = [];
  const desktopHomeWarm = [];

  for (let i = 0; i < iterations; i++) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      extraHTTPHeaders: bypassToken ? { 'x-vercel-protection-bypass': bypassToken } : {}
    });
    const page = await context.newPage();
    const t0 = Date.now();
    await page.goto(PREVIEW_URL, { waitUntil: 'networkidle', timeout: 45000 });
    const wallTimeCold = Date.now() - t0;
    const metricsCold = await measureNavigationMetrics(page);
    desktopHomeCold.push({ iteration: i + 1, wallTimeMs: wallTimeCold, ...metricsCold });

    // Warm reload
    const tWarm0 = Date.now();
    await page.reload({ waitUntil: 'networkidle', timeout: 45000 });
    const wallTimeWarm = Date.now() - tWarm0;
    const metricsWarm = await measureNavigationMetrics(page);
    desktopHomeWarm.push({ iteration: i + 1, wallTimeMs: wallTimeWarm, ...metricsWarm });

    await context.close();
  }

  results.benchmarks.desktopHomeCold = desktopHomeCold;
  results.benchmarks.desktopHomeWarm = desktopHomeWarm;
  console.log('Desktop Home Cold TTFB/LCP:', desktopHomeCold.map(m => `TTFB: ${m.ttfb}ms, LCP: ${m.lcp}ms, Total: ${m.wallTimeMs}ms`));
  console.log('Desktop Home Warm TTFB/LCP:', desktopHomeWarm.map(m => `TTFB: ${m.ttfb}ms, LCP: ${m.lcp}ms, Total: ${m.wallTimeMs}ms`));

  // 2. Mobile Cold & Warm Homepage
  console.log('\n[2/7] Benchmarking Homepage Navigation (Mobile 375x667)...');
  const mobileHomeCold = [];
  for (let i = 0; i < iterations; i++) {
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
      extraHTTPHeaders: bypassToken ? { 'x-vercel-protection-bypass': bypassToken } : {}
    });
    const page = await context.newPage();
    const t0 = Date.now();
    await page.goto(PREVIEW_URL, { waitUntil: 'networkidle', timeout: 45000 });
    const wallTime = Date.now() - t0;
    const metrics = await measureNavigationMetrics(page);
    mobileHomeCold.push({ iteration: i + 1, wallTimeMs: wallTime, ...metrics });
    await context.close();
  }
  results.benchmarks.mobileHomeCold = mobileHomeCold;
  console.log('Mobile Home Cold:', mobileHomeCold.map(m => `TTFB: ${m.ttfb}ms, LCP: ${m.lcp}ms, Total: ${m.wallTimeMs}ms`));

  // 3. In-App Navigation: Article Opening from Home, and Back Navigation
  console.log('\n[3/7] Benchmarking Article Opening & Back Navigation...');
  const inAppNavContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    extraHTTPHeaders: bypassToken ? { 'x-vercel-protection-bypass': bypassToken } : {}
  });
  const inAppPage = await inAppNavContext.newPage();
  await inAppPage.goto(PREVIEW_URL, { waitUntil: 'networkidle' });

  const heroLink = inAppPage.getByRole('link', { name: '[UAT04B] Test Story 001' }).first();
  const articleOpenTimes = [];
  const backNavTimes = [];

  for (let i = 0; i < iterations; i++) {
    if (i > 0) {
      await inAppPage.goto(PREVIEW_URL, { waitUntil: 'networkidle' });
    }
    await heroLink.waitFor({ state: 'visible', timeout: 15000 });
    
    // Measure click to article render
    const tClick = Date.now();
    await heroLink.click();
    await inAppPage.waitForURL(url => url.pathname.includes('/article/'), { timeout: 20000 });
    await inAppPage.waitForTimeout(1000);
    const openDuration = Date.now() - tClick;
    articleOpenTimes.push({ iteration: i + 1, durationMs: openDuration });

    // Measure Back button click
    const backBtn = inAppPage.getByLabel('Back to previous screen').or(inAppPage.getByRole('button', { name: /Back/i })).first();
    const tBack = Date.now();
    if (await backBtn.isVisible()) {
      await backBtn.click();
      await inAppPage.waitForTimeout(1000);
      const backDuration = Date.now() - tBack;
      backNavTimes.push({ iteration: i + 1, durationMs: backDuration, urlAfterBack: inAppPage.url() });
    } else {
      backNavTimes.push({ iteration: i + 1, durationMs: null, note: 'Back button not found' });
    }
  }
  results.benchmarks.articleOpenInApp = articleOpenTimes;
  results.benchmarks.articleBackInApp = backNavTimes;
  console.log('Article Open in-app times:', articleOpenTimes.map(t => `${t.durationMs}ms`));
  console.log('Article Back times:', backNavTimes.map(t => `${t.durationMs}ms`));
  await inAppNavContext.close();

  // 4. Category Filter Switching Latency
  console.log('\n[4/7] Benchmarking Category Filter Switching Latency...');
  const catContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    extraHTTPHeaders: bypassToken ? { 'x-vercel-protection-bypass': bypassToken } : {}
  });
  const catPage = await catContext.newPage();
  await catPage.goto(PREVIEW_URL, { waitUntil: 'networkidle' });

  const categories = ['Latest', 'Zimbabwe', 'World', 'For You'];
  const catSwitchResults = [];

  for (const cat of categories) {
    const btn = catPage.getByRole('button', { name: new RegExp(cat, 'i') }).first();
    if (await btn.isVisible()) {
      const t0 = Date.now();
      await btn.click();
      await catPage.waitForTimeout(400);
      const duration = Date.now() - t0;
      catSwitchResults.push({ category: cat, durationMs: duration });
    }
  }
  results.benchmarks.categorySwitch = catSwitchResults;
  console.log('Category Switch times:', catSwitchResults);
  await catContext.close();

  // 5. Search Interaction Latency
  console.log('\n[5/7] Benchmarking Search Interaction Latency...');
  const searchContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    extraHTTPHeaders: bypassToken ? { 'x-vercel-protection-bypass': bypassToken } : {}
  });
  const searchPage = await searchContext.newPage();
  const tSearchNav = Date.now();
  await searchPage.goto(`${PREVIEW_URL}/search`, { waitUntil: 'networkidle' });
  const searchNavDuration = Date.now() - tSearchNav;

  const searchInput = searchPage.getByPlaceholder(/Search/i).first();
  const searchTypingResults = [];
  if (await searchInput.isVisible()) {
    const tType = Date.now();
    await searchInput.fill('health');
    await searchPage.waitForTimeout(600);
    const searchDuration = Date.now() - tType;
    searchTypingResults.push({ query: 'health', durationMs: searchDuration });
  }
  results.benchmarks.search = {
    navigationMs: searchNavDuration,
    typingQuery: searchTypingResults
  };
  console.log('Search nav:', searchNavDuration, 'ms, typing duration:', searchTypingResults);
  await searchContext.close();

  // 6. Login & Studio Initial Loading
  console.log('\n[6/7] Benchmarking Login & Studio Desk Navigation...');
  const studioResults = {};
  if (commercial && commercial.email && commercial.password) {
    const studioContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      extraHTTPHeaders: bypassToken ? { 'x-vercel-protection-bypass': bypassToken } : {}
    });
    const studioPage = await studioContext.newPage();

    const tAcc0 = Date.now();
    await studioPage.goto(`${PREVIEW_URL}/account-access`, { waitUntil: 'networkidle' });
    const accNavDuration = Date.now() - tAcc0;

    const emailInput = studioPage.getByPlaceholder('Email address');
    const passwordInput = studioPage.getByPlaceholder('Password');
    const signInBtn = studioPage.getByRole('button', { name: 'Sign in', exact: true }).last();

    if (await emailInput.isVisible() && await passwordInput.isVisible()) {
      await emailInput.fill(commercial.email);
      await passwordInput.fill(commercial.password);
      
      const tSubmit = Date.now();
      await signInBtn.click();
      await studioPage.waitForURL(url => url.pathname.includes('/studio'), { timeout: 25000 });
      await studioPage.waitForTimeout(1500);
      const loginAndStudioLoadMs = Date.now() - tSubmit;
      console.log(`Login -> /studio initial render duration: ${loginAndStudioLoadMs}ms`);

      // Switching Studio desks: Commercial, Editorial, Finance
      const desks = ['Commercial', 'Editorial', 'Finance'];
      const deskSwitchTimes = [];
      for (const desk of desks) {
        const deskBtn = studioPage.getByRole('button', { name: new RegExp(desk, 'i') }).or(studioPage.getByText(desk)).first();
        if (await deskBtn.isVisible()) {
          const tDesk = Date.now();
          await deskBtn.click();
          await studioPage.waitForTimeout(500);
          deskSwitchTimes.push({ desk, durationMs: Date.now() - tDesk });
        }
      }

      studioResults.accountAccessNavMs = accNavDuration;
      studioResults.loginToStudioMs = loginAndStudioLoadMs;
      studioResults.deskSwitchTimes = deskSwitchTimes;
    }
    await studioContext.close();
  }
  results.benchmarks.studio = studioResults;

  // 7. Theme Switching Latency
  console.log('\n[7/7] Benchmarking Theme Switching Latency...');
  const themeContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    extraHTTPHeaders: bypassToken ? { 'x-vercel-protection-bypass': bypassToken } : {}
  });
  const themePage = await themeContext.newPage();
  await themePage.goto(`${PREVIEW_URL}/appearance`, { waitUntil: 'networkidle' });
  const themeSwitchTimes = [];
  const lightBtn = themePage.getByRole('button', { name: 'Light', exact: true });
  const darkBtn = themePage.getByRole('button', { name: 'Dark', exact: true });

  if (await lightBtn.isVisible() && await darkBtn.isVisible()) {
    const tDark = Date.now();
    await darkBtn.click();
    await themePage.waitForTimeout(200);
    themeSwitchTimes.push({ theme: 'dark', durationMs: Date.now() - tDark });

    const tLight = Date.now();
    await lightBtn.click();
    await themePage.waitForTimeout(200);
    themeSwitchTimes.push({ theme: 'light', durationMs: Date.now() - tLight });
  }
  results.benchmarks.themeSwitch = themeSwitchTimes;
  await themeContext.close();

  // Save report
  fs.writeFileSync(OUT_RECORD, JSON.stringify(results, null, 2));
  console.log(`\nAll benchmarks completed. Report saved to: ${OUT_RECORD}`);
  await browser.close();
}

runBenchmark().catch(console.error);
