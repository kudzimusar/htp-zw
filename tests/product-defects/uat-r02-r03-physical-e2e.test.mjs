import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const DIST_DIR = path.resolve('apps/mobile/dist');

// Lightweight static HTTP server with fallback for client routing
function createTestServer() {
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png'
  };

  const server = http.createServer((req, res) => {
    const parsedUrl = new URL(req.url, 'http://127.0.0.1');
    let filePath = path.join(DIST_DIR, parsedUrl.pathname);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    if (!fs.existsSync(filePath) && !path.extname(filePath)) {
      if (fs.existsSync(filePath + '.html')) {
        filePath = filePath + '.html';
      }
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath);
      const mime = mimeTypes[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': mime });
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    // Fallback to index.html for SPA routing
    const fallback = path.join(DIST_DIR, 'index.html');
    if (fs.existsSync(fallback)) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      fs.createReadStream(fallback).pipe(res);
      return;
    }

    res.writeHead(404);
    res.end('Not found');
  });

  return server;
}

test('Physical E2E: DEF-003 category routing, URL sync, reload, and back/forward navigation', async () => {
  const server = createTestServer();
  await new Promise((resolve) => server.listen(45678, '127.0.0.1', resolve));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    const baseUrl = 'http://127.0.0.1:45678';
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });

    // 1. Verify initial active filter is for-you
    const forYouTab = page.locator('[role="tab"][aria-label="For You"], [role="tab"]:has-text("For You")').first();
    await forYouTab.waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await forYouTab.getAttribute('aria-selected'), 'true');
    assert.equal(page.url(), `${baseUrl}/`);

    // 2. Select Zimbabwe filter pill
    const zimTab = page.locator('[role="tab"][aria-label="Zimbabwe"], [role="tab"]:has-text("Zimbabwe")').first();
    await zimTab.click();
    await page.waitForTimeout(300);

    // Verify URL updated to ?category=zimbabwe
    const currentUrl = new URL(page.url());
    assert.equal(currentUrl.searchParams.get('category'), 'zimbabwe', 'URL must contain category=zimbabwe');
    assert.equal(await zimTab.getAttribute('aria-selected'), 'true', 'Zimbabwe tab must be aria-selected=true');
    assert.equal(await forYouTab.getAttribute('aria-selected'), 'false', 'For You tab must be aria-selected=false');

    // 3. Reload page and assert category survives
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);
    const reloadedZimTab = page.locator('[role="tab"][aria-label="Zimbabwe"], [role="tab"]:has-text("Zimbabwe")').first();
    await reloadedZimTab.waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await reloadedZimTab.getAttribute('aria-selected'), 'true', 'Category must survive browser reload');
    const reloadedUrl = new URL(page.url());
    assert.equal(reloadedUrl.searchParams.get('category'), 'zimbabwe');

    // 4. Select World filter pill
    const worldTab = page.locator('[role="tab"][aria-label="World"], [role="tab"]:has-text("World")').first();
    await worldTab.click();
    await page.waitForTimeout(300);
    assert.equal(new URL(page.url()).searchParams.get('category'), 'world');
    assert.equal(await worldTab.getAttribute('aria-selected'), 'true');

    // 5. Browser Back button returns to Zimbabwe
    await page.goBack();
    await page.waitForTimeout(300);
    assert.equal(new URL(page.url()).searchParams.get('category'), 'zimbabwe', 'Back button must return to Zimbabwe');
    assert.equal(await reloadedZimTab.getAttribute('aria-selected'), 'true');

    // 6. Browser Back button returns to For You root
    await page.goBack();
    await page.waitForTimeout(300);
    assert.equal(new URL(page.url()).searchParams.get('category'), null, 'Back button must return to root without category query');
    const rootForYouTab = page.locator('[role="tab"][aria-label="For You"], [role="tab"]:has-text("For You")').first();
    assert.equal(await rootForYouTab.getAttribute('aria-selected'), 'true');

    // 7. Verify cross-device responsive viewports (375 mobile, 768 tablet, 1440 desktop)
    for (const vp of [{ width: 375, height: 667 }, { width: 390, height: 844 }, { width: 768, height: 1024 }]) {
      await page.setViewportSize(vp);
      await page.goto(`${baseUrl}/?category=zimbabwe`, { waitUntil: 'domcontentloaded' });
      const vpZimTab = page.locator('[role="tab"][aria-label="Zimbabwe"], [role="tab"]:has-text("Zimbabwe")').first();
      await vpZimTab.waitFor({ state: 'visible', timeout: 5000 });
      assert.equal(await vpZimTab.getAttribute('aria-selected'), 'true', `Viewport ${vp.width}x${vp.height} must preserve selected tab`);
    }

  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});

test('Physical E2E: DEF-006 Studio empty title form error and client validation blockage', async () => {
  const server = createTestServer();
  await new Promise((resolve) => server.listen(45679, '127.0.0.1', resolve));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    const studioUrl = 'http://127.0.0.1:45679/owner-preview/studio/create-edit';
    await page.goto(studioUrl, { waitUntil: 'domcontentloaded' });

    // 1. Verify title input exists
    const titleInput = page.locator('[data-testid="story-title-input"], input[placeholder*="headline" i]').first();
    await titleInput.waitFor({ state: 'visible', timeout: 10000 });

    // 2. Clear title and attempt save with empty headline
    await titleInput.fill('');
    await page.waitForTimeout(200);

    const saveButton = page.locator('[data-testid="save-story-button"], [role="button"]:has-text("Save Story")').first();
    await saveButton.click();
    await page.waitForTimeout(300);

    // 3. Verify accessible error alert appears and announces requirement
    const errorAlert = page.locator('[data-testid="story-title-error"], [role="alert"]').first();
    await errorAlert.waitFor({ state: 'visible', timeout: 5000 });
    const errorText = await errorAlert.textContent();
    assert.ok(
      errorText.includes('Story title is required'),
      `Error banner must announce requirement, got: "${errorText}"`
    );
    assert.equal(await errorAlert.getAttribute('role'), 'alert');

    // 4. Type non-empty headline and verify error clears
    await titleInput.fill('Historic Health Sector Accord Signed in Harare');
    await page.waitForTimeout(200);
    const errorAfterTyping = page.locator('[data-testid="story-title-error"]');
    assert.equal(await errorAfterTyping.count(), 0, 'Error banner must clear when user types headline');

  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
