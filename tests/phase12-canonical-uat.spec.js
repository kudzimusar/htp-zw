const { test, expect } = require('@playwright/test');

const BASE = '/htp-zw';
const premiumArticle = BASE + '/article/source-zimbabwe-strengthens-social-contracting-as-hiv-donor-funding-shrinks';
const publicArticle = BASE + '/article/source-ahf-urges-zimbabwe-to-join-borrowers-forum-amid-debt-crisis';
const teaserEndpoint = 'https://gcdohgbmqhqwydgaxrcr.supabase.co/rest/v1/rpc/ag05_public_story_teaser_document';
const premiumReferencePath = '/2026/09/18/zimbabwe-strengthens-social-contracting-as-hiv-donor-funding-shrinks/';
const publicReferencePath = '/2026/09/18/ahf-urges-zimbabwe-to-join-borrowers-forum-amid-debt-crisis/';

function captureRuntimeFailures(page) {
  const pageErrors = [];
  const fatalConsole = [];
  page.on('pageerror', error => pageErrors.push(String(error)));
  page.on('console', message => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (/favicon|Failed to load resource.*(?:404|ERR_FAILED)/i.test(text)) return;
    fatalConsole.push(text);
  });
  return { pageErrors, fatalConsole };
}

async function assertNoFatalRuntime(failures, label) {
  expect(failures.pageErrors.filter(error => error.includes('Minified React error #418')), label + ' React #418').toEqual([]);
  expect(failures.pageErrors, label + ' pageerror').toEqual([]);
  expect(failures.fatalConsole, label + ' console errors').toEqual([]);
}

async function loadLiveTeaserAuthority(referencePath) {
  const url = String(process.env.EXPO_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
  const key = String(process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '');
  expect(url).toBe('https://gcdohgbmqhqwydgaxrcr.supabase.co');
  expect(key).toMatch(/^sb_publishable_/);
  expect(key).not.toMatch(/service_role/i);
  const response = await fetch(teaserEndpoint, {
    method: 'POST',
    headers: {
      apikey: key,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'x-healthtimes-client': 'ui-rel04-canonical-uat'
    },
    body: JSON.stringify({ p_path: referencePath })
  });
  expect(response.ok, 'live teaser authority HTTP').toBe(true);
  const payload = await response.json();
  expect(payload && typeof payload === 'object').toBeTruthy();
  expect(payload.body_html).toBeNull();
  return payload;
}

async function installValidatedTeaserAuthority(page, referencePath, payload) {
  await page.route(teaserEndpoint, async route => {
    let requested = null;
    try { requested = route.request().postDataJSON()?.p_path || null; } catch {}
    if (requested !== referencePath) {
      await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: 'null' });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify(payload)
    });
  });
}

async function assertNoHorizontalOverflow(page, label) {
  const dims = await page.evaluate(() => ({
    htmlScroll: document.documentElement.scrollWidth,
    htmlClient: document.documentElement.clientWidth,
    bodyScroll: document.body.scrollWidth
  }));
  expect(dims.htmlScroll, label + ' html overflow').toBeLessThanOrEqual(dims.htmlClient + 2);
  expect(dims.bodyScroll, label + ' body overflow').toBeLessThanOrEqual(dims.htmlClient + 2);
}

async function gotoCanonical(page, route, label) {
  const failures = captureRuntimeFailures(page);
  const response = await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 30000 });
  expect(response && response.status(), label + ' HTTP').toBe(200);
  await page.getByRole('button', { name: 'HealthTimes Home' }).waitFor({ timeout: 30000 });
  await page.waitForFunction(() => document.body && document.body.innerText.trim().length > 80, null, { timeout: 30000 });
  return failures;
}

test('exact build-info identifies the canonical Pages/apps-mobile candidate', async ({ request }) => {
  const response = await request.get(BASE + '/build-info.json');
  expect(response.status()).toBe(200);
  const info = await response.json();
  expect(info).toEqual({
    sha: process.env.EXPECTED_SHA,
    presentation: 'apps/mobile',
    service_mode: 'source-parity',
    base_path: '/htp-zw'
  });
});

test('canonical Home is responsive on phone tablet and desktop without retired root runtime', async ({ browser }) => {
  test.setTimeout(120000);
  for (const viewport of [
    { name: 'phone', width: 390, height: 844 },
    { name: 'tablet', width: 834, height: 1112 },
    { name: 'desktop', width: 1440, height: 1000 }
  ]) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    const failures = await gotoCanonical(page, '/', viewport.name + ' Home');
    await page.getByText('Top Stories', { exact: true }).first().waitFor({ timeout: 30000 });
    await assertNoHorizontalOverflow(page, viewport.name + ' Home');

    const tabs = await page.getByRole('tab').count();
    if (viewport.name === 'phone') expect(tabs, 'phone canonical bottom navigation').toBeGreaterThanOrEqual(5);
    if (viewport.name === 'desktop') expect(tabs, 'desktop mobile bottom navigation absent').toBe(0);

    const html = await page.content();
    expect(html).not.toMatch(/<script[^>]+src=["'][^"']*(?:\/|^)app\.js["']/i);
    expect(html).not.toMatch(/<script[^>]+src=["'][^"']*(?:\/|^)v21\.js["']/i);
    expect(html).not.toContain('More context. More accountability. Better health intelligence.');
    await assertNoFatalRuntime(failures, viewport.name + ' Home');
    await page.close();
  }
});

test('current primary Reader routes resolve through apps/mobile output', async ({ browser }) => {
  test.setTimeout(150000);
  const routes = [
    ['Explore', '/explore', async page => page.getByText('Explore by topic', { exact: true }).first().waitFor({ timeout: 30000 })],
    ['Search', '/search', async page => page.getByRole('textbox', { name: 'Search HealthTimes' }).waitFor({ timeout: 30000 })],
    ['Live', '/live', async page => page.getByText('No live coverage right now', { exact: true }).waitFor({ timeout: 30000 })],
    ['Watch', '/watch', async page => page.getByText('Featured video', { exact: true }).waitFor({ timeout: 30000 })],
    ['Premium', '/premium', async page => page.getByText('HEALTHTIMES PREMIUM', { exact: true }).waitFor({ timeout: 30000 })],
    ['My HealthTimes', '/my', async page => page.getByText('My HealthTimes', { exact: true }).first().waitFor({ timeout: 30000 })]
  ];

  for (const [label, route, assertSurface] of routes) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const failures = await gotoCanonical(page, route, label);
    await assertSurface(page);
    await assertNoFatalRuntime(failures, label);
    await page.close();
  }
});

test('Zimbabwe Premium article remains anonymous fail-closed with visible Premium access', async ({ page }) => {
  test.setTimeout(90000);
  const authority = await loadLiveTeaserAuthority(premiumReferencePath);
  expect(String(authority.source_id)).toBe('33190');
  expect(authority.access_policy).toBe('premium_marker_review');
  await installValidatedTeaserAuthority(page, premiumReferencePath, authority);
  const failures = captureRuntimeFailures(page);
  const response = await page.goto(premiumArticle, { waitUntil: 'domcontentloaded', timeout: 30000 });
  expect(response && response.status()).toBe(200);
  await page.getByRole('button', { name: 'HealthTimes Home' }).waitFor({ timeout: 30000 });
  await page.getByText('PREMIUM', { exact: true }).first().waitFor({ timeout: 30000 });

  const preview = page.getByTestId('premium-preview-notice');
  const paywall = page.getByText('Continue reading with HealthTimes Premium', { exact: true });
  await expect(preview.or(paywall)).toBeVisible({ timeout: 30000 });

  const teaserCount = await page.getByTestId('premium-teaser-paragraph').count();
  expect(teaserCount).toBeLessThanOrEqual(1);
  await expect(page.getByText('Premium member access is active', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'HealthTimes Premium' })).toBeVisible();
  await assertNoFatalRuntime(failures, 'Zimbabwe Premium article');
});

test('current public comparator renders Reader actions without Premium lock', async ({ page }) => {
  test.setTimeout(90000);
  const authority = await loadLiveTeaserAuthority(publicReferencePath);
  expect(String(authority.source_id)).not.toBe('33190');
  expect(String(authority.access_policy).toLowerCase()).toBe('public');
  await installValidatedTeaserAuthority(page, publicReferencePath, authority);
  const failures = captureRuntimeFailures(page);
  const response = await page.goto(publicArticle, { waitUntil: 'domcontentloaded', timeout: 30000 });
  expect(response && response.status()).toBe(200);
  await page.getByRole('button', { name: 'Save article' }).waitFor({ timeout: 30000 });
  await page.getByRole('button', { name: 'Download article for offline reading' }).waitFor({ timeout: 30000 });
  await expect(page.getByText('Continue reading with HealthTimes Premium', { exact: true })).toHaveCount(0);
  await expect(page.getByTestId('premium-preview-notice')).toHaveCount(0);
  await expect(page.getByText('Article not found.', { exact: true })).toHaveCount(0);
  await assertNoFatalRuntime(failures, 'current public comparator');
});

test('Premium landing exposes access truth without fabricated commerce success', async ({ page }) => {
  const failures = await gotoCanonical(page, '/premium', 'Premium landing');
  await page.getByText('HEALTHTIMES PREMIUM', { exact: true }).waitFor({ timeout: 30000 });
  await expect(page.getByText('Your membership', { exact: true })).toBeVisible();
  const body = await page.locator('body').innerText();
  expect(body).not.toContain('Payment successful');
  expect(body).not.toContain('Purchase complete');
  expect(body).not.toContain('Premium member access is active');
  await assertNoFatalRuntime(failures, 'Premium landing');
});

test('PWA contract is Pages-subpath safe and retired root runtime is non-serving', async ({ request }) => {
  const manifestResponse = await request.get(BASE + '/manifest.json');
  expect(manifestResponse.status()).toBe(200);
  const manifest = await manifestResponse.json();
  expect(manifest.start_url).toBe('./');
  expect(manifest.scope).toBe('./');
  expect(manifest.id).toBe('./');
  expect(manifest.display).toBe('standalone');

  const swResponse = await request.get(BASE + '/sw.js');
  expect(swResponse.status()).toBe(200);
  const sw = await swResponse.text();
  expect(sw).toContain('self.registration.scope');

  expect((await request.get(BASE + '/healthtimes-icon.svg')).status()).toBe(200);
  expect((await request.get(BASE + '/app.js')).status()).toBe(404);
  expect((await request.get(BASE + '/v21.js')).status()).toBe(404);

  const home = await request.get(BASE + '/');
  const html = await home.text();
  expect(html).not.toMatch(/<script[^>]+src=["'][^"']*(?:\/|^)app\.js["']/i);
  expect(html).not.toMatch(/<script[^>]+src=["'][^"']*(?:\/|^)v21\.js["']/i);
});
