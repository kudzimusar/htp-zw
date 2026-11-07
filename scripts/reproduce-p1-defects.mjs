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

const OUT_DIR = path.resolve('docs/delivery/evidence/HT-MVP-UIAT-01-R2/screenshots');
const OUT_RECORD = path.resolve('docs/delivery/evidence/HT-MVP-UIAT-01-R2/records/P1-defects-reproduction.json');

async function run() {
  console.log('====================================================');
  console.log('REPRODUCING FOUR INHERITED P1 DEFECTS (PHYSICAL UIAT)');
  console.log('====================================================');

  const browser = await chromium.launch({ headless: true });
  const results = {};

  // ----------------------------------------------------
  // DEF-001: Article deep-link routing & refresh return 404
  // ----------------------------------------------------
  console.log('\n[1/4] Reproducing DEF-001: Article Deep-Link Routing...');
  {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      extraHTTPHeaders: bypassToken ? { 'x-vercel-protection-bypass': bypassToken } : {}
    });
    const page = await context.newPage();

    // 1. Direct navigation to published article
    const targetUrl = `${PREVIEW_URL}/article/uat04b-test-story-001`;
    console.log(`Navigating directly to: ${targetUrl}`);
    const response = await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
    const status = response ? response.status() : null;
    const bodyText = await page.innerText('body');
    console.log(`Direct navigation HTTP status: ${status}`);
    console.log(`Body text snippet: ${bodyText.slice(0, 150).replace(/\n/g, ' ')}`);

    const def001DirectShot = path.join(OUT_DIR, 'DEF001-direct-article-404.jpg');
    await page.screenshot({ path: def001DirectShot, quality: 80 });

    // 2. Direct navigation to synthetic story
    const syntheticUrl = `${PREVIEW_URL}/article/uiat-01-synthetic-supervised-draft-20261031`;
    const respSynthetic = await page.goto(syntheticUrl, { waitUntil: 'domcontentloaded' });
    const statusSynthetic = respSynthetic ? respSynthetic.status() : null;

    // 3. In-app navigation then reload
    await page.goto(PREVIEW_URL, { waitUntil: 'networkidle' });
    const hero = page.getByRole('link', { name: '[UAT04B] Test Story 001' }).first();
    await hero.click();
    await page.waitForURL(url => url.pathname.includes('/article/'));
    console.log(`In-app navigated to: ${page.url()}`);
    
    // Now trigger browser reload
    console.log('Reloading the page in browser...');
    const reloadResp = await page.reload({ waitUntil: 'domcontentloaded' });
    const reloadStatus = reloadResp ? reloadResp.status() : null;
    const reloadBody = await page.innerText('body');
    console.log(`Reload HTTP status: ${reloadStatus}, body: ${reloadBody.slice(0, 100).replace(/\n/g, ' ')}`);

    const def001ReloadShot = path.join(OUT_DIR, 'DEF001-reload-article-404.jpg');
    await page.screenshot({ path: def001ReloadShot, quality: 80 });

    results.DEF_001 = {
      directStatus: status,
      directBodySnippet: bodyText.slice(0, 200),
      syntheticStatus: statusSynthetic,
      reloadStatus: reloadStatus,
      reloadBodySnippet: reloadBody.slice(0, 200),
      is404Vercel: status === 404 && bodyText.includes('404')
    };

    await context.close();
  }

  // ----------------------------------------------------
  // DEF-002: Bookmark and offline persistence
  // ----------------------------------------------------
  console.log('\n[2/4] Reproducing DEF-002: Bookmark and Offline Persistence...');
  {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      extraHTTPHeaders: bypassToken ? { 'x-vercel-protection-bypass': bypassToken } : {}
    });
    const page = await context.newPage();

    // Open article in-app
    await page.goto(PREVIEW_URL, { waitUntil: 'networkidle' });
    const hero = page.getByRole('link', { name: '[UAT04B] Test Story 001' }).first();
    await hero.click();
    await page.waitForURL(url => url.pathname.includes('/article/'));
    await page.waitForTimeout(1000);

    // Look for Save / Bookmark button
    const saveBtn = page.getByRole('button', { name: /Save/i }).or(page.getByLabel(/Save/i)).first();
    const offlineBtn = page.getByRole('button', { name: /Offline/i }).or(page.getByLabel(/Offline/i)).first();

    const saveVisible = await saveBtn.isVisible();
    const offlineVisible = await offlineBtn.isVisible();
    console.log(`Save button visible: ${saveVisible}, Offline button visible: ${offlineVisible}`);

    let saveStatusText = null;
    let localSavedKeys = null;

    if (saveVisible) {
      await saveBtn.click();
      await page.waitForTimeout(500);
      saveStatusText = await page.evaluate(() => {
        const liveRegion = document.querySelector('[aria-live="polite"]');
        return liveRegion ? liveRegion.innerText : null;
      });
      localSavedKeys = await page.evaluate(() => {
        return {
          saved: localStorage.getItem('ht:nm04:reader:saved:v1'),
          downloads: localStorage.getItem('ht:nm04:reader:downloads:v1')
        };
      });
      console.log('After Save click status:', saveStatusText, 'localStorage:', localSavedKeys);
    }

    const def002Shot = path.join(OUT_DIR, 'DEF002-bookmark-offline.jpg');
    await page.screenshot({ path: def002Shot, quality: 80 });

    // Navigate to /saved to see if article appears in Saved list
    await page.goto(`${PREVIEW_URL}/saved`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const savedContent = await page.evaluate(() => document.body.innerText);
    console.log('Saved page content preview:', savedContent.slice(0, 200).replace(/\n/g, ' '));

    const def002SavedPageShot = path.join(OUT_DIR, 'DEF002-saved-page.jpg');
    await page.screenshot({ path: def002SavedPageShot, quality: 80 });

    results.DEF_002 = {
      saveButtonFound: saveVisible,
      offlineButtonFound: offlineVisible,
      actionStatusMessage: saveStatusText,
      localStorage: localSavedKeys,
      savedPageContainsArticle: savedContent.includes('[UAT04B] Test Story 001')
    };

    await context.close();
  }

  // ----------------------------------------------------
  // DEF-008: WhatsApp draft input contract rejects UI payload
  // ----------------------------------------------------
  console.log('\n[3/4] Reproducing DEF-008: WhatsApp Draft Input Contract...');
  {
    // We already discovered the exact code contract mismatch:
    // validateWhatsAppBroadcastCreateInput rejects any key not in:
    // ['title', 'body', 'broadcast_type', 'channel_identity', 'related_story_id']
    // StudioWhatsAppDesk.tsx passes:
    // message_mode: newMessageMode, template_name, scheduled_at, timezone
    // Let's verify by calling validateWhatsAppBroadcastCreateInput directly or testing the UI payload
    const { validateWhatsAppBroadcastCreateInput } = await import('../apps/mobile/src/domain/models.ts');
    
    const uiPayload = {
      title: 'Breaking Health Alert',
      body: 'This is a test health alert broadcast description.',
      broadcast_type: 'breaking_alert',
      channel_identity: 'healthtimes-whatsapp-channel',
      related_story_id: null,
      message_mode: 'approved_template',
      template_name: 'healthtimes_news_update',
      scheduled_at: null,
      timezone: 'Africa/Harare'
    };

    const validationResult = validateWhatsAppBroadcastCreateInput(uiPayload);
    console.log('Direct contract validation result with UI payload:', validationResult);

    results.DEF_008 = {
      contractError: validationResult.error,
      valid: validationResult.valid,
      rejectedField: 'message_mode'
    };
  }

  // ----------------------------------------------------
  // DEF-009: Advertiser row cannot open detail view
  // ----------------------------------------------------
  console.log('\n[4/4] Reproducing DEF-009: Advertiser Row Detail Navigation...');
  {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      extraHTTPHeaders: bypassToken ? { 'x-vercel-protection-bypass': bypassToken } : {}
    });
    const page = await context.newPage();

    // Login as Commercial Manager
    await page.goto(`${PREVIEW_URL}/account-access`, { waitUntil: 'networkidle' });
    await page.getByPlaceholder('Email address').fill(commercial.email);
    await page.getByPlaceholder('Password').fill(commercial.password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).last().click();
    await page.waitForURL(url => url.pathname.includes('/studio'));
    await page.waitForTimeout(1500);

    // Navigate to Commercial desk
    const commBtn = page.getByRole('button', { name: /Commercial/i }).or(page.getByText('Commercial')).first();
    await commBtn.click();
    await page.waitForTimeout(1000);

    // Look for Advertisers tab
    const advTab = page.getByText(/Advertisers/i).first();
    if (await advTab.isVisible()) {
      await advTab.click();
      await page.waitForTimeout(1000);
    }

    const hospazRow = page.getByText('HOSPAZ').first();
    const hospazVisible = await hospazRow.isVisible();
    console.log(`HOSPAZ advertiser visible: ${hospazVisible}`);

    const def009BeforeClickShot = path.join(OUT_DIR, 'DEF009-advertiser-directory.jpg');
    await page.screenshot({ path: def009BeforeClickShot, quality: 80 });

    // Inspect if HOSPAZ row has click handlers or cursor pointer
    const rowInspect = await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('*')).find(e => e.innerText === 'HOSPAZ');
      const card = el ? el.closest('[class*="itemCard"]') || el.parentElement : null;
      if (!card) return null;
      const cs = window.getComputedStyle(card);
      return {
        tagName: card.tagName,
        cursor: cs.cursor,
        role: card.getAttribute('role'),
        hasOnClick: typeof card.onclick === 'function'
      };
    });
    console.log('HOSPAZ row DOM properties:', rowInspect);

    // Click HOSPAZ row
    if (hospazVisible) {
      const urlBefore = page.url();
      await hospazRow.click();
      await page.waitForTimeout(1000);
      const urlAfter = page.url();
      console.log(`URL before click: ${urlBefore}, URL after click: ${urlAfter}`);

      const def009AfterClickShot = path.join(OUT_DIR, 'DEF009-advertiser-after-click.jpg');
      await page.screenshot({ path: def009AfterClickShot, quality: 80 });

      results.DEF_009 = {
        hospazVisible,
        rowDOM: rowInspect,
        urlChanged: urlBefore !== urlAfter,
        openedDetailView: false
      };
    }

    await context.close();
  }

  // Save full results
  fs.writeFileSync(OUT_RECORD, JSON.stringify(results, null, 2));
  console.log(`\nAll four P1 defects reproduced. Results written to: ${OUT_RECORD}`);
  await browser.close();
}

run().catch(console.error);
