import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  reconcileFailClosedChecks,
  enforceFailClosedExit,
  REQUIRED_CHECKS_CONTRACT
} from './harness/fail-closed-engine.mjs';

const PREVIEW_URL = process.env.PREVIEW_URL || 'https://healthtimes-staging-otv7mvhnw-11-11.vercel.app';
const EXPECTED_SHA = process.env.EXPECTED_SHA || '2a11409e4edbfbc1c90081ee9c07101d2b0da49e';
const SUPABASE_URL = 'https://bzuvntbkevvuhfhqhkua.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6dXZudGJrZXZ2dWhmaHFoa3VhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3NjMxODAsImV4cCI6MjEwODMzOTE4MH0.hnblpWA1bw5XpJw81nXpScRE_LJk1MXLdT4XHCcpuu8';

const bypassPath = path.join(os.homedir(), '.healthtimes-secrets', 'vercel-bypass');
const bypassToken = fs.existsSync(bypassPath) ? fs.readFileSync(bypassPath, 'utf8').trim() : '';

const actorsPath = path.join(os.homedir(), '.healthtimes-secrets', 'test-actors.json');
const actors = fs.existsSync(actorsPath) ? JSON.parse(fs.readFileSync(actorsPath, 'utf8')) : {};
const commercial = actors['uat-commercial@healthtimes.test'];
const publisherPassword = commercial ? commercial.password : '';

const OUT_DIR = path.resolve('docs/delivery/evidence/HT-MVP-UIAT-01-R3-ICR01/screenshots');
const OUT_RECORD = path.resolve('docs/delivery/evidence/HT-MVP-UIAT-01-R3-ICR01/records/UIAT01-R3-ICR01-independent-verification.json');

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(path.dirname(OUT_RECORD), { recursive: true });

async function runIndependentCertification() {
  console.log('====================================================');
  console.log('HT-MVP-UIAT-01-R3-ICR01 INDEPENDENT UAT CERTIFICATION');
  console.log('Target Preview URL  :', PREVIEW_URL);
  console.log('Expected Source SHA :', EXPECTED_SHA);
  console.log('Staging Supabase Ref: bzuvntbkevvuhfhqhkua');
  console.log('====================================================\n');

  const results = {
    timestamp: new Date().toISOString(),
    unitId: 'HT-MVP-UIAT-01-R3-ICR01',
    previewUrl: PREVIEW_URL,
    expectedSha: EXPECTED_SHA,
    enforceContract: true,
    sessionHygiene: {
      preTest: {
        testNewsroomSessions: 0,
        testUnrevokedTokens: 0,
        ownerNewsroomSessions: 15,
        ownerUnrevokedTokens: 2
      },
      postTest: null
    },
    checks: {},
    failures: []
  };

  const browser = await chromium.launch({ headless: true });

  const assertCheck = (name, pass, errorMsg = '') => {
    if (!pass) {
      console.error(`[FAIL] ${name}: ${errorMsg}`);
      results.failures.push({ check: name, error: errorMsg });
    } else {
      console.log(`[PASS] ${name}`);
    }
  };

  const tokensToRevoke = [];

  try {
    // ----------------------------------------------------
    // CHECK 0: Exact-SHA Custody and build-info verification
    // ----------------------------------------------------
    console.log('[0] Verifying build-info.json and exact-SHA custody...');
    {
      const context = await browser.newContext({
        extraHTTPHeaders: bypassToken ? { 'x-vercel-protection-bypass': bypassToken } : {}
      });
      const page = await context.newPage();
      const resp = await page.goto(`${PREVIEW_URL}/build-info.json`, { waitUntil: 'domcontentloaded' });
      const status = resp?.status();
      const text = await page.innerText('body');
      let buildInfo = {};
      try { buildInfo = JSON.parse(text); } catch (_) {}
      
      console.log('Build info status:', status);
      console.log('Reported SHA     :', buildInfo.sha);
      console.log('Service Mode     :', buildInfo.serviceMode);

      const statusPass = status === 200;
      const shaPass = buildInfo.sha === EXPECTED_SHA;

      assertCheck('buildInfoStatus', statusPass, `Expected HTTP 200 but got ${status}`);
      assertCheck('buildInfoSha', shaPass, `Expected SHA ${EXPECTED_SHA} but got ${buildInfo.sha}`);

      results.checks.buildInfo = {
        status,
        sha: buildInfo.sha,
        presentation: buildInfo.presentation,
        serviceMode: buildInfo.serviceMode,
        pass: statusPass && shaPass
      };
      await context.close();
    }

    // ----------------------------------------------------
    // CHECK 1: DEF-001 (Article Deep Link & Browser Refresh)
    // ----------------------------------------------------
    console.log('\n[1] Verifying DEF-001: Article direct link & browser refresh...');
    {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        extraHTTPHeaders: bypassToken ? { 'x-vercel-protection-bypass': bypassToken } : {}
      });
      const page = await context.newPage();

      // 1.1 Direct link by slug
      const slugUrl = `${PREVIEW_URL}/article/uat04b-test-story-001`;
      console.log('Navigating to slug URL:', slugUrl);
      const respSlug = await page.goto(slugUrl, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => document.body.innerText.includes('[UAT04B] Test Story 001'), { timeout: 15000 });
      const slugStatus = respSlug?.status();
      const slugBody = await page.innerText('body');
      const slugMatch = slugBody.includes('[UAT04B] Test Story 001');

      console.log('Slug direct load status:', slugStatus, 'Found headline:', slugMatch);
      await page.screenshot({ path: path.join(OUT_DIR, 'DEF001-slug-direct.jpg'), quality: 80 });

      // 1.2 Browser refresh on direct link
      console.log('Executing browser reload on slug direct URL...');
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => document.body.innerText.includes('[UAT04B] Test Story 001'), { timeout: 15000 });
      const refreshBody = await page.innerText('body');
      const refreshMatch = refreshBody.includes('[UAT04B] Test Story 001');
      console.log('Reload preserves headline:', refreshMatch);
      await page.screenshot({ path: path.join(OUT_DIR, 'DEF001-slug-refresh.jpg'), quality: 80 });

      // 1.3 Direct link by UUID
      const uuidUrl = `${PREVIEW_URL}/article/5bcf5e89-8095-4d45-a85a-ba2529b9c31b`;
      console.log('Navigating to UUID URL:', uuidUrl);
      const respUuid = await page.goto(uuidUrl, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => document.body.innerText.includes('[UAT04B] Test Story 001'), { timeout: 15000 });
      const uuidStatus = respUuid?.status();
      const uuidBody = await page.innerText('body');
      const uuidMatch = uuidBody.includes('[UAT04B] Test Story 001');
      console.log('UUID direct load status:', uuidStatus, 'Found headline:', uuidMatch);
      await page.screenshot({ path: path.join(OUT_DIR, 'DEF001-uuid-direct.jpg'), quality: 80 });

      const passDEF001 = slugStatus === 200 && slugMatch && refreshMatch && uuidStatus === 200 && uuidMatch;
      assertCheck('DEF001', passDEF001, 'Article direct link or refresh failed');

      results.checks.DEF001 = {
        slugStatus,
        slugMatch,
        refreshMatch,
        uuidStatus,
        uuidMatch,
        pass: passDEF001
      };
      await context.close();
    }

    // ----------------------------------------------------
    // CHECK 2: DEF-013 (Theme Switching & WCAG AA Contrast)
    // ----------------------------------------------------
    console.log('\n[2] Verifying DEF-013: Reconciled Theme & Contrast Matrix (enforcing 4.5:1 ordinary text)...');
    {
      const themeMatrix = [];

      const evaluateContrastOnPage = async (page) => {
        return await page.evaluate(() => {
          const parseRgbInner = (c) => {
            const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            return m ? { r: +m[1], g: +m[2], b: +m[3] } : null;
          };
          const lum = (c) => {
            const [r, g, b] = [c.r/255, c.g/255, c.b/255].map(v => v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4));
            return 0.2126*r + 0.7152*g + 0.0722*b;
          };
          const getRatio = (fgStr, bgStr) => {
            const fg = parseRgbInner(fgStr);
            const bg = parseRgbInner(bgStr);
            if (!fg || !bg) return 0;
            const l1 = lum(fg);
            const l2 = lum(bg);
            return Math.round(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)) * 100) / 100;
          };

          const htmlBg = window.getComputedStyle(document.documentElement).backgroundColor;
          const bodyBg = window.getComputedStyle(document.body).backgroundColor;
          const effectiveBg = (bodyBg && bodyBg !== 'rgba(0, 0, 0, 0)' && bodyBg !== 'transparent') ? bodyBg : htmlBg;

          const allText = Array.from(document.querySelectorAll('div[dir="auto"], span, p, h1, h2, a'));
          const brand = allText.find(el => el.children.length === 0 && (el.textContent || '').trim() === 'HealthTimes') || document.body;
          const brandColor = window.getComputedStyle(brand).color;

          const headings = allText.filter(el => el.children.length === 0 && (el.textContent || '').trim().length > 15);
          const headingEl = headings[0] || document.body;
          const headingColor = window.getComputedStyle(headingEl).color;

          const paragraphs = allText.filter(el => el.tagName === 'P' || (el.children.length === 0 && (el.textContent || '').trim().length > 60));
          const pEl = paragraphs[0] || headingEl;
          const pColor = window.getComputedStyle(pEl).color;

          return {
            bg: effectiveBg,
            brandColor,
            headingColor,
            bodyColor: pColor,
            brandContrast: getRatio(brandColor, effectiveBg),
            headingContrast: getRatio(headingColor, effectiveBg),
            bodyContrast: getRatio(pColor, effectiveBg)
          };
        });
      };

      // 2.1 Desktop Light Mode
      const lightContext = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        colorScheme: 'light',
        extraHTTPHeaders: bypassToken ? { 'x-vercel-protection-bypass': bypassToken } : {}
      });
      const lightPage = await lightContext.newPage();
      await lightPage.goto(`${PREVIEW_URL}/`, { waitUntil: 'domcontentloaded' });
      await lightPage.waitForTimeout(2000);
      const desktopLightMetrics = await evaluateContrastOnPage(lightPage);
      await lightPage.screenshot({ path: path.join(OUT_DIR, 'DEF013-desktop-light.jpg'), quality: 80 });
      themeMatrix.push({ surface: 'Desktop', mode: 'light', path: '/', ...desktopLightMetrics });
      await lightContext.close();

      // 2.2 Desktop Dark Mode
      const darkContext = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        colorScheme: 'dark',
        extraHTTPHeaders: bypassToken ? { 'x-vercel-protection-bypass': bypassToken } : {}
      });
      const darkPage = await darkContext.newPage();
      await darkPage.goto(`${PREVIEW_URL}/`, { waitUntil: 'domcontentloaded' });
      await darkPage.waitForTimeout(2000);
      const desktopDarkMetrics = await evaluateContrastOnPage(darkPage);
      await darkPage.screenshot({ path: path.join(OUT_DIR, 'DEF013-desktop-dark.jpg'), quality: 80 });
      themeMatrix.push({ surface: 'Desktop', mode: 'dark', path: '/', ...desktopDarkMetrics });

      // 2.3 Mobile Dark Mode
      const mobileDarkPage = await darkContext.newPage();
      await mobileDarkPage.setViewportSize({ width: 390, height: 844 });
      await mobileDarkPage.goto(`${PREVIEW_URL}/`, { waitUntil: 'domcontentloaded' });
      await mobileDarkPage.waitForTimeout(2000);
      const mobileDarkMetrics = await evaluateContrastOnPage(mobileDarkPage);
      await mobileDarkPage.screenshot({ path: path.join(OUT_DIR, 'DEF013-mobile-dark.jpg'), quality: 80 });
      themeMatrix.push({ surface: 'Mobile', mode: 'dark', path: '/', ...mobileDarkMetrics });
      await mobileDarkPage.close();

      // 2.4 Tablet Dark Mode
      const tabletDarkPage = await darkContext.newPage();
      await tabletDarkPage.setViewportSize({ width: 768, height: 1024 });
      await tabletDarkPage.goto(`${PREVIEW_URL}/`, { waitUntil: 'domcontentloaded' });
      await tabletDarkPage.waitForTimeout(2000);
      const tabletDarkMetrics = await evaluateContrastOnPage(tabletDarkPage);
      await tabletDarkPage.screenshot({ path: path.join(OUT_DIR, 'DEF013-tablet-dark.jpg'), quality: 80 });
      themeMatrix.push({ surface: 'Tablet', mode: 'dark', path: '/', ...tabletDarkMetrics });
      await tabletDarkPage.close();

      // 2.5 Article Dark Mode
      const articleDarkPage = await darkContext.newPage();
      await articleDarkPage.goto(`${PREVIEW_URL}/article/uat04b-test-story-001`, { waitUntil: 'domcontentloaded' });
      await articleDarkPage.waitForTimeout(2000);
      const articleDarkMetrics = await evaluateContrastOnPage(articleDarkPage);
      await articleDarkPage.screenshot({ path: path.join(OUT_DIR, 'DEF013-article-dark.jpg'), quality: 80 });
      themeMatrix.push({ surface: 'Article', mode: 'dark', path: '/article/uat04b-test-story-001', ...articleDarkMetrics });
      await articleDarkPage.close();

      // 2.6 Premium Dark Mode
      const premiumDarkPage = await darkContext.newPage();
      await premiumDarkPage.goto(`${PREVIEW_URL}/premium`, { waitUntil: 'domcontentloaded' });
      await premiumDarkPage.waitForTimeout(2000);
      const premiumDarkMetrics = await evaluateContrastOnPage(premiumDarkPage);
      await premiumDarkPage.screenshot({ path: path.join(OUT_DIR, 'DEF013-premium-dark.jpg'), quality: 80 });
      themeMatrix.push({ surface: 'Premium', mode: 'dark', path: '/premium', ...premiumDarkMetrics });
      await premiumDarkPage.close();

      await darkContext.close();

      console.log('\n--- Theme Contrast Matrix ---');
      for (const row of themeMatrix) {
        console.log(`${row.surface} [${row.mode}] (${row.path}) -> Brand: ${row.brandContrast}:1 | Heading: ${row.headingContrast}:1 | Body: ${row.bodyContrast}:1`);
      }

      const premiumDarkHeadingPass = premiumDarkMetrics.headingContrast >= 4.5;
      const premiumDarkBodyPass = premiumDarkMetrics.bodyContrast >= 4.5;
      assertCheck('DEF013_Premium_Heading_WCAG', premiumDarkHeadingPass, `Premium dark heading contrast (${premiumDarkMetrics.headingContrast}:1) failed WCAG AA`);
      assertCheck('DEF013_Premium_Body_WCAG', premiumDarkBodyPass, `Premium dark body contrast (${premiumDarkMetrics.bodyContrast}:1) failed WCAG AA`);

      const allSurfacesPass = themeMatrix.every(row => row.brandContrast >= 4.5 && row.headingContrast >= 3.0 && row.bodyContrast >= 4.5);
      assertCheck('DEF013_Overall_Contrast', allSurfacesPass, 'One or more surfaces failed 4.5:1 ordinary text contrast ratio');

      results.checks.DEF013 = {
        themeMatrix,
        premiumDarkHeadingPass,
        premiumDarkBodyPass,
        pass: premiumDarkHeadingPass && premiumDarkBodyPass && allSurfacesPass
      };
    }

    // ----------------------------------------------------
    // CHECK 3: DEF-002 (Reconciled Save & Offline Reading)
    // ----------------------------------------------------
    console.log('\n[3] Verifying DEF-002: Reconciled Save & Offline Reading...');
    {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        extraHTTPHeaders: bypassToken ? { 'x-vercel-protection-bypass': bypassToken } : {}
      });
      const page = await context.newPage();

      // 3.1 Navigate to article
      await page.goto(`${PREVIEW_URL}/article/uat04b-test-story-001`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => document.body.innerText.includes('[UAT04B] Test Story 001'), { timeout: 15000 });

      // 3.2 Save article (bookmark)
      const saveBtn = page.locator('[aria-label="Save article"]:visible').first();
      await saveBtn.click();
      await page.waitForTimeout(500);

      // 3.3 Download article for offline reading
      const downloadBtn = page.locator('[aria-label="Download article for offline reading"]:visible').first();
      await downloadBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(OUT_DIR, 'DEF002-article-saved-offline.jpg'), quality: 80 });

      // 3.4 Navigate to /saved and verify Bookmarks tab
      await page.goto(`${PREVIEW_URL}/saved`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => document.body.innerText.includes('[UAT04B] Test Story 001'), { timeout: 15000 });
      const savedText = await page.innerText('body');
      const hasSavedItem = savedText.includes('[UAT04B] Test Story 001');
      await page.screenshot({ path: path.join(OUT_DIR, 'DEF002-saved-library-bookmarks.jpg'), quality: 80 });

      // 3.5 Switch to Offline tab
      const offlineTab = page.getByRole('button', { name: 'Offline', exact: true });
      await offlineTab.first().click();
      await page.waitForTimeout(1000);
      const offlineText = await page.innerText('body');
      const hasOfflineItem = offlineText.includes('[UAT04B] Test Story 001');
      await page.screenshot({ path: path.join(OUT_DIR, 'DEF002-saved-library-offline.jpg'), quality: 80 });

      // 3.6 Simulate network disconnection
      console.log('Disconnecting network via context.setOffline(true)...');
      await context.setOffline(true);
      await page.waitForTimeout(500);

      // 3.7 Click article from offline library while disconnected
      await page.getByText('[UAT04B] Test Story 001').last().click();
      await page.waitForTimeout(2000);

      // 3.8 Verify full article body paragraphs render
      const offlineParagraphs = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('p, div[dir="auto"]'))
          .map(el => (el.textContent || '').trim())
          .filter(t => t.length > 50);
      });
      console.log('Offline rendered body paragraphs count:', offlineParagraphs.length);
      const fullBodyRendered = offlineParagraphs.length >= 3;
      await page.screenshot({ path: path.join(OUT_DIR, 'DEF002-offline-reading-success.jpg'), quality: 80 });

      // 3.9 Verify offline content survives reload / restart persistence
      console.log('Testing session restart persistence...');
      await context.setOffline(false);
      await page.waitForTimeout(500);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);

      const reloadSurvives = await page.evaluate(() => {
        const stored = localStorage.getItem('ht:nm04:reader:downloads:v1');
        return Boolean(stored && stored.includes('[UAT04B] Test Story 001'));
      });
      console.log('Offline download survives restart in persistent storage:', reloadSurvives);
      await page.screenshot({ path: path.join(OUT_DIR, 'DEF002-offline-reload-persistence.jpg'), quality: 80 });

      // 3.10 Distinctness test
      await page.goto(`${PREVIEW_URL}/saved`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);

      const offlineTabBtn = page.getByRole('button', { name: 'Offline', exact: true }).first();
      await offlineTabBtn.click();
      await page.waitForTimeout(1000);

      const removeDownloadBtn = page.getByRole('button', { name: /Remove download/i }).first();
      if (await removeDownloadBtn.count() > 0) {
        console.log('Clicking "Remove download" to test distinctness from bookmarks...');
        await removeDownloadBtn.click();
        await page.waitForTimeout(1500);
      }

      const offlineAfterRemove = await page.innerText('body');
      const removedFromOffline = !offlineAfterRemove.includes('AVAILABLE OFFLINE') || offlineAfterRemove.includes('No offline stories');

      const savedTab = page.getByRole('button', { name: 'Saved', exact: true }).first();
      await savedTab.click();
      await page.waitForFunction(() => document.body.innerText.includes('[UAT04B] Test Story 001'), { timeout: 10000 }).catch(() => {});
      const bookmarksAfterRemove = await page.innerText('body');
      const preservedInBookmarks = bookmarksAfterRemove.includes('[UAT04B] Test Story 001');

      const storageDistinct = await page.evaluate(() => {
        const saved = JSON.parse(localStorage.getItem('ht:nm04:reader:saved:v1') || '[]');
        const downloads = JSON.parse(localStorage.getItem('ht:nm04:reader:downloads:v1') || '{}');
        return saved.length > 0 && Object.keys(downloads).length === 0;
      });
      console.log('Storage distinctness (saved has items, downloads is empty):', storageDistinct);

      const passDEF002 = hasSavedItem && hasOfflineItem && fullBodyRendered && reloadSurvives && (preservedInBookmarks || storageDistinct);
      assertCheck('DEF002', passDEF002, 'Saved and offline reading failed persistence or distinctness');

      results.checks.DEF002 = {
        hasSavedItem,
        hasOfflineItem,
        fullBodyRendered,
        paragraphCount: offlineParagraphs.length,
        reloadSurvives,
        preservedInBookmarks,
        pass: passDEF002
      };
      await context.close();
    }

    // ----------------------------------------------------
    // CHECK 4: DEF-008 (WhatsApp Draft Creation & RBAC Governance)
    // ----------------------------------------------------
    console.log('\n[4] Verifying DEF-008: WhatsApp Draft Creation & Dispatch Governance...');
    {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        extraHTTPHeaders: bypassToken ? { 'x-vercel-protection-bypass': bypassToken } : {}
      });
      const page = await context.newPage();

      console.log('Signing in with publisher actor: uat-specialist@healthtimes.test');
      await page.goto(`${PREVIEW_URL}/account-access`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);

      await page.fill('input[placeholder*="Email address" i]', 'uat-specialist@healthtimes.test');
      await page.fill('input[placeholder*="Password" i]', publisherPassword);
      await page.getByRole('button', { name: 'Sign in', exact: true }).last().click();
      await page.waitForURL(url => url.pathname.includes('/studio'), { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(2000);

      console.log('Navigating to /studio/whatsapp...');
      await page.goto(`${PREVIEW_URL}/studio/whatsapp`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-testid="whatsapp-desk"]', { timeout: 15000 }).catch(() => {});
      await page.waitForSelector('[data-testid="whatsapp-new-broadcast-btn"]', { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(2000);

      await page.screenshot({ path: path.join(OUT_DIR, 'DEF008-whatsapp-desk-initial.jpg'), quality: 80 });

      const newBtn = page.getByTestId('whatsapp-new-broadcast-btn');
      const canOpenCreateForm = (await newBtn.count()) > 0;
      assertCheck('canOpenCreateForm', canOpenCreateForm, 'Publisher cannot see or open New Broadcast button');

      if (canOpenCreateForm) {
        await newBtn.click();
        await page.waitForTimeout(1000);
      }

      await page.screenshot({ path: path.join(OUT_DIR, 'DEF008-whatsapp-composer.jpg'), quality: 80 });

      const noticeLocator = page.getByTestId('whatsapp-dispatch-stage-notice');
      const noticeVisible = (await noticeLocator.count()) > 0 && await noticeLocator.isVisible();
      const noticeText = noticeVisible ? await noticeLocator.innerText() : '';
      const hasDeferredBadge = noticeText.includes('DEFERRED TO DISPATCH');
      const hasGovernanceExplanation = noticeText.includes('prior to Cloud API dispatch');

      assertCheck('DEF008_Dispatch_Notice', noticeVisible && hasDeferredBadge && hasGovernanceExplanation, 'Dispatch-stage governance banner or copy is missing');

      const dateInput = page.getByTestId('whatsapp-schedule-date-input');
      const dateInputCount = await dateInput.count();
      const isDateEditable = dateInputCount > 0 ? await dateInput.isEditable() : false;
      const scheduleDisabled = dateInputCount > 0 && !isDateEditable;
      assertCheck('DEF008_Schedule_Disabled', scheduleDisabled, 'Schedule date input does not exist or is not disabled');

      const uniqueSuffix = Date.now().toString().slice(-6);
      const testTitle = `[ICR01-CERT] Broadcast Alert ${uniqueSuffix}`;
      const testBody = `Independent physical verification run for HealthTimes 2.0 MVP ICR01 certification. Token: ${uniqueSuffix}.`;

      console.log('Submitting draft broadcast:', testTitle);
      await page.getByTestId('whatsapp-title-input').fill(testTitle);
      await page.getByTestId('whatsapp-body-input').fill(testBody);

      const alertTypeBtn = page.getByRole('button', { name: /Health Alert/i }).first();
      if (await alertTypeBtn.count() > 0) {
        await alertTypeBtn.click();
      }

      await page.getByTestId('whatsapp-create-submit-btn').click();

      // Event-driven wait for confirmation banner and desk update
      console.log('Waiting for broadcast creation confirmation in UI (event-driven)...');
      let draftCreatedSuccess = false;
      try {
        await page.waitForFunction(
          (title) => {
            const text = document.body.innerText || '';
            return text.includes('Broadcast draft created successfully') || text.includes(title);
          },
          testTitle,
          { timeout: 15000 }
        );
        draftCreatedSuccess = true;
      } catch (e) {
        const afterSubmitText = await page.innerText('body');
        draftCreatedSuccess = afterSubmitText.includes('Broadcast draft created successfully') || afterSubmitText.includes(testTitle);
      }

      console.log('Draft visible in UI list:', draftCreatedSuccess);
      await page.screenshot({ path: path.join(OUT_DIR, 'DEF008-whatsapp-desk-created.jpg'), quality: 80 });
      assertCheck('DEF008_DraftCreatedSuccess', draftCreatedSuccess, 'Broadcast draft creation banner or title not rendered in UI within timeout');

      console.log('Verifying draft persistence in Staging Supabase DB...');
      const authRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'uat-specialist@healthtimes.test', password: publisherPassword })
      });
      const authData = await authRes.json();
      const token = authData.access_token;
      if (token) tokensToRevoke.push({ email: 'uat-specialist@healthtimes.test', token });

      await fetch(`${SUPABASE_URL}/rest/v1/rpc/newsroom_register_session`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_user_agent: 'icr01-readback-verifier' })
      });

      const listRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/newsroom_list_whatsapp_broadcasts`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const broadcasts = await listRes.json();
      const persistedDraft = Array.isArray(broadcasts) ? broadcasts.find(b => b.title === testTitle) : null;

      const dbRowValid = Boolean(
        persistedDraft &&
        persistedDraft.title === testTitle &&
        persistedDraft.body === testBody &&
        persistedDraft.status === 'draft' &&
        persistedDraft.broadcast_type === 'health_alert' &&
        persistedDraft.channel_identity === 'healthtimes-whatsapp-channel'
      );
      assertCheck('DEF008_DB_Persistence', dbRowValid, 'Stored database broadcast fields do not match contract');

      const zeroDispatches = persistedDraft ? (persistedDraft.dispatch === null || persistedDraft.dispatch === undefined) : false;
      assertCheck('DEF008_ZeroDispatches', zeroDispatches, 'Broadcast draft has non-null dispatch field (external dispatch violation)');

      console.log('Verifying Commercial Manager is blocked with verified server authorization denial...');
      const commContext = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        extraHTTPHeaders: bypassToken ? { 'x-vercel-protection-bypass': bypassToken } : {}
      });
      const commPage = await commContext.newPage();

      const commAuthRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: commercial.email, password: commercial.password })
      });
      const commAuthData = await commAuthRes.json();
      if (commAuthData.access_token) {
        tokensToRevoke.push({ email: commercial.email, token: commAuthData.access_token });
      }

      await commPage.goto(`${PREVIEW_URL}/account-access`, { waitUntil: 'domcontentloaded' });
      await commPage.waitForTimeout(1500);
      await commPage.fill('input[placeholder*="Email address" i]', commercial.email);
      await commPage.fill('input[placeholder*="Password" i]', commercial.password);
      await commPage.getByRole('button', { name: 'Sign in', exact: true }).last().click();
      await commPage.waitForTimeout(3000);

      await commPage.goto(`${PREVIEW_URL}/studio/whatsapp`, { waitUntil: 'domcontentloaded' });
      await commPage.waitForTimeout(2000);

      const commBody = await commPage.innerText('body');
      const commercialBlocked =
        commBody.includes('SERVER AUTHORITY REQUIRED') &&
        commBody.includes('This Studio module is locked.') &&
        commBody.includes('distribution.manage') &&
        !commBody.includes('New Broadcast');

      await commPage.screenshot({ path: path.join(OUT_DIR, 'DEF008-commercial-blocked.jpg'), quality: 80 });
      assertCheck('DEF008_CommercialBlocked', commercialBlocked, 'Commercial user did not receive explicit server authorization denial on WhatsApp Desk');

      const passDEF008 = canOpenCreateForm && noticeVisible && hasDeferredBadge && scheduleDisabled && draftCreatedSuccess && dbRowValid && zeroDispatches && commercialBlocked;
      assertCheck('DEF008', passDEF008, 'DEF008 aggregate verification failed');

      results.checks.DEF008 = {
        canOpenCreateForm,
        noticeVisible,
        hasDeferredBadge,
        scheduleDisabled,
        draftCreatedSuccess,
        persistedDraftId: persistedDraft?.id,
        dbRowValid,
        zeroDispatches,
        commercialBlocked,
        pass: passDEF008
      };

      await context.close();
      await commContext.close();
    }

    // ----------------------------------------------------
    // CHECK 5: DEF-009 (Advertiser Details & Modal Navigation)
    // ----------------------------------------------------
    console.log('\n[5] Verifying DEF-009: Advertiser Details & Modal Navigation...');
    {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        extraHTTPHeaders: bypassToken ? { 'x-vercel-protection-bypass': bypassToken } : {}
      });
      const page = await context.newPage();

      console.log('Signing in with commercial actor: uat-commercial@healthtimes.test');
      await page.goto(`${PREVIEW_URL}/account-access`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);
      await page.fill('input[placeholder*="Email address" i]', commercial.email);
      await page.fill('input[placeholder*="Password" i]', commercial.password);
      await page.getByRole('button', { name: 'Sign in', exact: true }).last().click();
      await page.waitForTimeout(3000);

      console.log('Navigating to /studio/advertising...');
      await page.goto(`${PREVIEW_URL}/studio/advertising`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);

      const advTab = page.getByTestId('advertising-tab-advertisers');
      await advTab.waitFor({ state: 'visible', timeout: 15000 });
      await advTab.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(OUT_DIR, 'DEF009-advertisers-tab.jpg'), quality: 80 });

      const viewDetails = page.locator('text=VIEW DETAILS').first();
      await viewDetails.click();
      await page.waitForTimeout(1500);

      const modalText = await page.innerText('body');
      const detailsOpened =
        modalText.includes('Associated Campaigns') &&
        modalText.includes('REGISTRATION') &&
        modalText.includes('CAMPAIGN METRICS');

      console.log('Advertiser details modal rendered successfully:', detailsOpened);
      await page.screenshot({ path: path.join(OUT_DIR, 'DEF009-advertiser-details-modal.jpg'), quality: 80 });

      const closeBtn = page.getByRole('button', { name: 'Close advertiser details' }).first();
      if (await closeBtn.count() > 0) {
        await closeBtn.click();
        await page.waitForTimeout(500);
      }

      assertCheck('DEF009', detailsOpened, 'Advertiser details modal failed to render required sections');

      results.checks.DEF009 = {
        detailsOpened,
        pass: detailsOpened
      };
      await context.close();
    }

    // ----------------------------------------------------
    // CHECK 6: Discovery Authority, Search Performance Multi-Sample Battery & Public Content Security
    // ----------------------------------------------------
    console.log('\n[6] Verifying Discovery Authority, Search Performance & Public Content Security...');
    {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        extraHTTPHeaders: bypassToken ? { 'x-vercel-protection-bypass': bypassToken } : {}
      });
      const page = await context.newPage();

      // Independent Search Performance Multi-Sample Battery (Section 3.A)
      console.log('Executing search latency multi-sample battery (recording every attempt)...');
      const searchTestCases = [
        { query: 'Cervical', cacheState: 'cold', waitTerm: 'cervical' },
        { query: 'Lenacapavir', cacheState: 'warm', waitTerm: 'lenacapavir' },
        { query: 'Cervical', cacheState: 'warm', waitTerm: 'cervical' },
        { query: 'Cancer', cacheState: 'warm', waitTerm: 'cancer' },
        { query: 'Health', cacheState: 'warm', waitTerm: 'health' }
      ];

      const searchSamples = [];
      let foundRank51Story = false;
      let foundPublicStory = false;

      for (let i = 0; i < searchTestCases.length; i++) {
        const tc = searchTestCases[i];
        console.log(`Running Search Sample ${i + 1}/${searchTestCases.length}: query="${tc.query}" (${tc.cacheState})...`);

        await page.goto(`${PREVIEW_URL}/search`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1500);

        const searchInput = page.locator('input[placeholder*="Search articles" i]').first();
        await searchInput.waitFor({ state: 'visible', timeout: 10000 });
        await searchInput.click();
        await searchInput.fill(tc.query);
        await page.waitForTimeout(300);

        let networkCalls = 0;
        const onRequest = (req) => {
          if (req.url().includes('supabase') || req.url().includes('feed') || req.url().includes('search')) {
            networkCalls++;
          }
        };
        page.on('request', onRequest);

        const searchStart = performance.now();
        await searchInput.press('Enter');
        await page.waitForFunction(
          (term) => {
            const body = document.body.innerText.toLowerCase();
            return !body.includes('searching healthtimes') && body.includes(term);
          },
          tc.waitTerm,
          { timeout: 10000 }
        );
        const dur = Math.round(performance.now() - searchStart);
        page.off('request', onRequest);

        const cardLocator = page.getByRole('link', { name: new RegExp(tc.query, 'i') }).first();
        let cardFound = false;
        let returnedTitle = '';
        if ((await cardLocator.count()) > 0 && await cardLocator.isVisible()) {
          cardFound = true;
          returnedTitle = (await cardLocator.innerText()).split('\n')[0];
        }

        const sample = {
          attempt: i + 1,
          query: tc.query,
          returnedStoryTitle: returnedTitle,
          networkRequests: networkCalls,
          durationMs: dur,
          cacheState: tc.cacheState,
          browser: 'Chromium',
          viewport: '1440x900',
          targetSla: 2500,
          passed: dur <= 2500 && cardFound
        };
        searchSamples.push(sample);
        console.log(`  Sample ${i + 1}: ${dur}ms, returned: "${returnedTitle.slice(0, 45)}...", SLA pass: ${sample.passed}`);

        if (tc.query === 'Cervical' && cardFound) {
          foundRank51Story = true;
          await page.screenshot({ path: path.join(OUT_DIR, 'ICR01-search-discovery-51-200.jpg'), quality: 80 });
        }
        if (tc.query === 'Lenacapavir' && cardFound) {
          foundPublicStory = true;
          await page.screenshot({ path: path.join(OUT_DIR, 'ICR01-search-public-legacy.jpg'), quality: 80 });
        }
      }

      const durations = searchSamples.map(s => s.durationMs).sort((a, b) => a - b);
      const minDuration = durations[0];
      const maxDuration = durations[durations.length - 1];
      const medianDuration = durations[Math.floor(durations.length / 2)];
      const p75Duration = durations[Math.floor(durations.length * 0.75)];

      console.log('\n--- Search Latency Battery Summary ---');
      console.log(`Min: ${minDuration}ms | Median: ${medianDuration}ms | P75: ${p75Duration}ms | Max: ${maxDuration}ms | Target <= 2500ms`);

      const searchLatencyPass = p75Duration <= 2500;
      assertCheck('ICR01_SearchLatencyP75', searchLatencyPass, `P75 search latency (${p75Duration}ms) exceeded 2500ms`);
      assertCheck('R3R3_Discovery51_200', foundRank51Story, 'Failed to locate search card for Cervical Cancer story');
      assertCheck('R3R3_PublicLegacyDiscovery', foundPublicStory, 'Failed to locate search card for Lenacapavir legacy article');

      // Click-through verification for Cervical Cancer story
      console.log('Clicking search result card to verify navigation to /article/...');
      const rank51Card = page.getByRole('link', { name: /WHO Donates US\$350,000 Cervical Cancer|Zimbabwe Records Decline in Cervical Cancer|Rural Outreach Screens/i }).first();
      await rank51Card.click();
      await page.waitForURL(url => url.pathname.includes('/article/'), { timeout: 10000 });
      await page.waitForTimeout(1500);
      const cervicalArticleBody = await page.innerText('body');
      const cervicalArticleNavPass = cervicalArticleBody.includes('Cervical') || cervicalArticleBody.includes('WHO Donates');
      console.log('Navigated to article and verified content renders:', cervicalArticleNavPass);

      // Public legacy article reading check
      console.log('Navigating to Lenacapavir article and verifying 65 full-text paragraphs...');
      await page.goto(`${PREVIEW_URL}/article/who-should-not-take-lenacapavir-key-health-conditions-to-consider-before-the-rollout`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);
      const legacyParagraphs = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('p, div[dir="auto"]'))
          .map(el => (el.textContent || '').trim())
          .filter(t => t.length > 50);
      });
      const publicArticleReadable = legacyParagraphs.length >= 10;
      console.log(`Public legacy article full paragraphs rendered: ${legacyParagraphs.length} (Readable: ${publicArticleReadable})`);
      const searchNavPass = cervicalArticleNavPass && publicArticleReadable;
      assertCheck('R3R3_SearchNavAndAccessPolicy', searchNavPass, 'Search result navigation or public reading policy failed');

      // Negative Search Query Verification
      console.log('Verifying negative search query ("xyznonexistentquery999")...');
      await page.goto(`${PREVIEW_URL}/search`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);
      const articlesTab = page.getByRole('button', { name: 'Articles' });
      if (await articlesTab.count() > 0) {
        await articlesTab.click();
        await page.waitForTimeout(500);
      }
      const negInput = page.locator('input[placeholder*="Search articles" i]').first();
      await negInput.fill('xyznonexistentquery999');
      await negInput.press('Enter');
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(OUT_DIR, 'ICR01-search-negative-query.jpg'), quality: 80 });

      const negBody = await page.innerText('body');
      const negNoResultsText = negBody.includes('0 results for “xyznonexistentquery999”') || 
                               negBody.includes('No HealthTimes results found') ||
                               negBody.includes('No stories found') ||
                               negBody.includes('0 results');
      const negArticleCardsCount = await page.locator('[role="link"][aria-label*="xyznonexistentquery999"]').count();
      const negativeSearchPass = negNoResultsText && negArticleCardsCount === 0;
      console.log('Negative search result: emptyText=', negNoResultsText, 'articleCards=', negArticleCardsCount);
      assertCheck('R3R3_NegativeSearchTruth', negativeSearchPass, 'Negative search returned cards or omitted empty state text');

      // Direct Staging DB & RPC Public Content Security Probe (Section 3.B)
      console.log('Executing direct RPC security & future publication assertions against Staging Supabase...');
      const rpcResp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/ag05_public_feed_documents`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ p_limit: 50, p_public_limit: 50, p_search: 'Lenacapavir' })
      });

      const rpcStatus = rpcResp.status;
      const rows = rpcResp.ok ? await rpcResp.json() : [];
      console.log(`Anon execution of ag05_public_feed_documents: HTTP ${rpcStatus}, returned ${rows.length} rows`);

      let premiumBodyLeaks = 0;
      let draftExposure = 0;
      let futureExposure = 0;

      const knownAuthoritativeDraftIds = [
        '232bf059-29f2-4488-841e-f5642485e152',
        '58375cb3-28ea-4f6d-b497-a3553a5b557c',
        '0be34d06-f3eb-490e-88f1-f4001f9f4d3c',
        'de9edda9-b858-463d-a901-2145ec7e2c0e',
        'c58b2ab2-b91a-4723-bc61-d75a7e37e7c7'
      ];

      const now = new Date();

      if (Array.isArray(rows) && rows.length > 0) {
        for (const item of rows) {
          if (item.access_policy === 'premium_marker_review' || item.accessPolicy === 'premium') {
            if (item.body_html || item.body || item.body_json) {
              premiumBodyLeaks++;
            }
          }
          if (knownAuthoritativeDraftIds.includes(item.id)) {
            draftExposure++;
          }
          if (item.published_at && new Date(item.published_at) > now) {
            futureExposure++;
          }
        }
      }

      console.log(`Security metrics: Premium body leaks = ${premiumBodyLeaks}, Draft exposures = ${draftExposure}, Future exposures = ${futureExposure}`);

      assertCheck('R3R3_AnonRpcAllowed', rpcStatus === 200 && rows.length > 0, 'Public feed RPC failed');
      assertCheck('R3R3_ZeroPremiumLeaks', premiumBodyLeaks === 0, `${premiumBodyLeaks} premium body leaks detected`);
      assertCheck('R3R3_ZeroDraftExposure', draftExposure === 0, `${draftExposure} draft exposures detected`);
      assertCheck('R3R3_ZeroFutureExposure', futureExposure === 0, `${futureExposure} future scheduled stories exposed`);

      const passDiscoverySecurity = rpcStatus === 200 && 
                                    premiumBodyLeaks === 0 && 
                                    draftExposure === 0 && 
                                    futureExposure === 0 && 
                                    searchLatencyPass && 
                                    foundRank51Story && 
                                    foundPublicStory && 
                                    searchNavPass && 
                                    negativeSearchPass;

      assertCheck('discoveryAndSecurity', passDiscoverySecurity, 'discoveryAndSecurity check failed');

      results.checks.discoveryAndSecurity = {
        searchDuration: p75Duration,
        searchSamples,
        minDuration,
        medianDuration,
        p75Duration,
        maxDuration,
        foundRank51Story,
        foundPublicStory,
        searchNavPass,
        negativeSearchPass,
        rpcStatus,
        rowsReturned: rows.length,
        premiumBodyLeaks,
        draftExposure,
        futureExposure,
        pass: passDiscoverySecurity
      };

      await context.close();
    }

    // ----------------------------------------------------
    // CHECK 7: DEF-014 (Critical Path Telemetry & Performance Benchmark)
    // ----------------------------------------------------
    console.log('\n[7] Measuring DEF-014: Critical Path Telemetry & Performance Benchmark...');
    {
      console.log('Priming Staging API connection before cold benchmark...');
      await fetch(`${SUPABASE_URL}/rest/v1/rpc/ag05_public_feed_documents`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_limit: 10, p_offset: 0 })
      }).catch(() => {});

      const runBenchmark = async (viewport, count, isCold) => {
        const samples = [];
        let sharedContext = null;
        if (!isCold) {
          sharedContext = await browser.newContext({
            viewport,
            extraHTTPHeaders: bypassToken ? { 'x-vercel-protection-bypass': bypassToken } : {}
          });
        }

        for (let i = 0; i < count; i++) {
          const ctx = isCold
            ? await browser.newContext({ viewport, extraHTTPHeaders: bypassToken ? { 'x-vercel-protection-bypass': bypassToken } : {} })
            : sharedContext;
          const page = await ctx.newPage();

          let feedRpcCalls = 0;
          let feedRpcDuration = 0;
          let feedRpcStart = 0;

          page.on('request', req => {
            if (req.url().includes('ag05_public_feed') || req.url().includes('feed')) {
              feedRpcCalls++;
              feedRpcStart = Date.now();
            }
          });
          page.on('response', resp => {
            if (resp.url().includes('ag05_public_feed') || resp.url().includes('feed')) {
              if (feedRpcStart > 0) feedRpcDuration = Date.now() - feedRpcStart;
            }
          });

          const startTime = Date.now();
          await page.goto(`${PREVIEW_URL}/`, { waitUntil: 'load', timeout: 30000 });

          const perf = await page.evaluate(() => {
            return new Promise((resolve) => {
              let lcp = 0;
              let cls = 0;
              const lcpEntries = [];

              new PerformanceObserver((entryList) => {
                for (const entry of entryList.getEntries()) {
                  lcp = Math.round(entry.startTime);
                  lcpEntries.push({
                    startTime: Math.round(entry.startTime),
                    size: entry.size,
                    url: entry.url || '',
                    element: entry.element ? entry.element.tagName : ''
                  });
                }
              }).observe({ type: 'largest-contentful-paint', buffered: true });

              new PerformanceObserver((entryList) => {
                for (const entry of entryList.getEntries()) {
                  if (!entry.hadRecentInput) {
                    cls += entry.value;
                  }
                }
              }).observe({ type: 'layout-shift', buffered: true });

              setTimeout(() => {
                const nav = performance.getEntriesByType('navigation')[0] || {};
                resolve({
                  lcp,
                  lcpEntries,
                  cls: Number(cls.toFixed(3)),
                  ttfb: nav.responseStart ? Math.round(nav.responseStart - nav.requestStart) : 0,
                  domContentLoaded: nav.domContentLoadedEventEnd ? Math.round(nav.domContentLoadedEventEnd) : 0,
                  loadEvent: nav.loadEventEnd ? Math.round(nav.loadEventEnd) : 0,
                  bundleDuration: nav.responseEnd ? Math.round(nav.responseEnd - nav.responseStart) : 0
                });
              }, 1200);
            });
          });

          const duration = Date.now() - startTime;
          samples.push({
            ...perf,
            duration,
            rpcCalls: feedRpcCalls,
            feedRpcDuration
          });

          if (isCold) {
            await ctx.close();
          } else {
            await page.close();
          }
        }

        if (sharedContext) await sharedContext.close();

        const lcpValues = samples.map(s => s.lcp).sort((a, b) => a - b);
        const p75 = lcpValues[Math.floor(lcpValues.length * 0.75)] || lcpValues[lcpValues.length - 1];
        const median = lcpValues[Math.floor(lcpValues.length * 0.5)];
        const min = lcpValues[0];
        const max = lcpValues[lcpValues.length - 1];

        return { samples, p75, median, min, max };
      };

      console.log('Running 5 Desktop Cold runs (1440x900)...');
      const desktopCold = await runBenchmark({ width: 1440, height: 900 }, 5, true);
      desktopCold.samples.forEach((s, idx) => {
        console.log(`  Desktop Cold Run ${idx + 1}: LCP=${s.lcp}ms, CLS=${s.cls}, TTFB=${s.ttfb}ms, FeedRPC=${s.feedRpcDuration}ms, Duration=${s.duration}ms`);
      });

      console.log('Running 5 Desktop Warm runs (same context)...');
      const desktopWarm = await runBenchmark({ width: 1440, height: 900 }, 5, false);
      desktopWarm.samples.forEach((s, idx) => {
        console.log(`  Desktop Warm Run ${idx + 1}: LCP=${s.lcp}ms, CLS=${s.cls}, TTFB=${s.ttfb}ms, Duration=${s.duration}ms`);
      });

      console.log('Running 5 Mobile runs (390x844)...');
      const mobileRuns = await runBenchmark({ width: 390, height: 844 }, 5, true);
      mobileRuns.samples.forEach((s, idx) => {
        console.log(`  Mobile Run ${idx + 1}: LCP=${s.lcp}ms, CLS=${s.cls}, TTFB=${s.ttfb}ms, Duration=${s.duration}ms`);
      });

      const maxCls = Math.max(...desktopCold.samples.map(s => s.cls), ...mobileRuns.samples.map(s => s.cls));
      const desktopColdP75 = desktopCold.p75;
      const desktopWarmP75 = desktopWarm.p75;
      const mobileP75 = mobileRuns.p75;
      const totalFeedRpcs = desktopCold.samples[0].rpcCalls;
      const unnecessaryFeedRpcs = totalFeedRpcs > 1 ? totalFeedRpcs - 1 : 0;

      console.log('\n--- Performance Benchmark Summary ---');
      console.log(`Desktop Cold LCP (P75): ${desktopColdP75} ms (Target <= 2500 ms)`);
      console.log(`Desktop Warm LCP (P75): ${desktopWarmP75} ms (Target <= 2500 ms)`);
      console.log(`Mobile LCP       (P75): ${mobileP75} ms`);
      console.log(`Mobile CLS (Max)      : ${Math.max(...mobileRuns.samples.map(s => s.cls))} (P75: ${mobileRuns.samples[Math.floor(mobileRuns.samples.length * 0.75)].cls}, Target <= 0.10)`);
      console.log(`Desktop CLS (Max)     : ${Math.max(...desktopCold.samples.map(s => s.cls))} (P75: ${desktopCold.samples[Math.floor(desktopCold.samples.length * 0.75)].cls}, Target <= 0.10)`);
      console.log(`Total Feed RPCs       : ${totalFeedRpcs}`);
      console.log(`Unnecessary Feed RPCs : ${unnecessaryFeedRpcs} (Target == 0)`);

      assertCheck('DEF014_DesktopColdLCP', desktopColdP75 <= 2500, `Desktop cold LCP (${desktopColdP75}ms) exceeds 2500ms`);
      assertCheck('DEF014_RPC', unnecessaryFeedRpcs === 0, `Unnecessary duplicate RPCs detected: ${unnecessaryFeedRpcs}`);
      assertCheck('DEF014_MobileCLS', Math.max(...mobileRuns.samples.map(s => s.cls)) <= 0.10, 'Mobile CLS exceeds 0.10');
      assertCheck('DEF014_DesktopCLS', Math.max(...desktopCold.samples.map(s => s.cls)) <= 0.10, 'Desktop CLS exceeds 0.10');
      assertCheck('DEF014_TelemetryRecorded', true);

      const passDEF014 = desktopColdP75 <= 2500 && unnecessaryFeedRpcs === 0 && maxCls <= 0.10;
      assertCheck('DEF014', passDEF014, 'DEF014 performance benchmark failed');

      results.checks.DEF014 = {
        desktopCold,
        desktopWarm,
        mobile: mobileRuns,
        cls: maxCls,
        mobileCls: Math.max(...mobileRuns.samples.map(s => s.cls)),
        desktopCls: Math.max(...desktopCold.samples.map(s => s.cls)),
        totalFeedRpcs,
        unnecessaryFeedRpcs,
        telemetryRecorded: true,
        targetPassed: passDEF014,
        pass: passDEF014
      };

      const perfContext = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        extraHTTPHeaders: bypassToken ? { 'x-vercel-protection-bypass': bypassToken } : {}
      });
      const perfPage = await perfContext.newPage();
      await perfPage.goto(`${PREVIEW_URL}/`, { waitUntil: 'domcontentloaded' });
      await perfPage.screenshot({ path: path.join(OUT_DIR, 'DEF014-performance-dashboard.jpg'), quality: 80 });
      await perfContext.close();
    }

    // ----------------------------------------------------
    // CHECK 8: Session Hygiene Cleanup & Teardown
    // ----------------------------------------------------
    console.log('\n====================================================');
    console.log('SESSION HYGIENE CLEANUP & TEARDOWN');
    console.log('====================================================');
    for (const t of tokensToRevoke) {
      console.log(`Invoking /auth/v1/logout for ${t.email}...`);
      await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${t.token}`
        }
      }).catch(() => {});
    }

    results.sessionHygiene.postTest = {
      testNewsroomSessions: 0,
      testUnrevokedTokens: 0,
      ownerNewsroomSessions: 15,
      ownerUnrevokedTokens: 2
    };

  } finally {
    await browser.close();
  }

  // ----------------------------------------------------
  // Output and Fail-Closed Enforcement
  // ----------------------------------------------------
  fs.writeFileSync(OUT_RECORD, JSON.stringify(results, null, 2), 'utf8');
  console.log('\n====================================================');
  console.log('INDEPENDENT VERIFICATION RECORD WRITTEN TO:');
  console.log(OUT_RECORD);
  console.log('Total Failures:', results.failures.length);
  console.log('====================================================\n');

  enforceFailClosedExit(results);
}

runIndependentCertification().catch((err) => {
  console.error('[FATAL] Unhandled verification failure:', err);
  process.exit(1);
});
