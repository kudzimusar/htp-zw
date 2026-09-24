const { test, expect } = require('@playwright/test');

const directPath = '/2026/02/12/who-should-not-take-lenacapavir-key-health-conditions-to-consider-before-the-rollout/';
const oldPath = '/2016/02/16/zim-launches-unicef-eli-lilly-initiative-to-fight-pediatric-and-adolescent-ncds/';
const legacyAliasPath = '/policy-capture-at-cop11-what-it-signals-for-global-health-governance/';
const legacyAliasTarget = '/2025/12/06/policy-capture-at-cop11-what-it-signals-for-global-health-governance/';
const premiumPath = '/2026/09/18/zimbabwe-strengthens-social-contracting-as-hiv-donor-funding-shrinks/';
const explicit404Path = '/2017/04/04/gwinji-appeals-funding-health-sector/';
const unknownPath = '/phase12-no-authoritative-healthtimes-route/';
const categoryPath = '/category/health_news/';

function capturePageErrors(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  return errors;
}

async function assertNoPageErrors(errors, label) {
  const hydration = errors.filter(error => error.includes('Minified React error #418'));
  expect(hydration, label + ' React #418').toEqual([]);
  expect(errors, label + ' page errors').toEqual([]);
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

test('canonical Home is responsive across mobile tablet and desktop and HOSPAZ stays fail-closed', async ({ browser }) => {
  for (const viewport of [
    { name: 'mobile', width: 390, height: 844 },
    { name: 'tablet', width: 834, height: 1112 },
    { name: 'desktop', width: 1440, height: 1000 }
  ]) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    const errors = capturePageErrors(page);
    const response = await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    expect(response?.status(), viewport.name + ' Home HTTP').toBe(200);
    await page.getByText('Top Stories', { exact: false }).first().waitFor({ timeout: 30000 });
    await assertNoHorizontalOverflow(page, viewport.name);

    const ad = page.locator('[aria-label="Advertising placement hospaz-header-direct"]');
    await expect(ad).toBeVisible({ timeout: 30000 });
    await expect(ad).toContainText('HOSPAZ');
    await expect(ad.locator('a')).toHaveCount(0);

    const tabs = await page.getByRole('tab').count();
    if (viewport.name === 'mobile') expect(tabs).toBeGreaterThanOrEqual(5);
    if (viewport.name === 'desktop') expect(tabs).toBe(0);

    const html = await page.content();
    expect(html).not.toContain('More context. More accountability. Better health intelligence.');
    expect(html).not.toContain('src="app.js"');
    await assertNoPageErrors(errors, viewport.name + ' Home');
    await page.close();
  }
});

test('canonical Reader routes Home Explore Search Live Watch Premium and My HealthTimes are current product surfaces', async ({ page }) => {
  const errors = capturePageErrors(page);

  let response = await page.goto('/explore', { waitUntil: 'domcontentloaded', timeout: 30000 });
  expect(response?.status()).toBe(200);
  await page.getByText('Explore', { exact: true }).first().waitFor({ timeout: 30000 });
  const exploreBody = await page.locator('body').innerText();
  for (const forbidden of ['TAXONOMY GATEWAY', 'Canonical desks', 'Legacy publication categories']) {
    expect(exploreBody).not.toContain(forbidden);
  }

  response = await page.goto('/search', { waitUntil: 'domcontentloaded', timeout: 30000 });
  expect(response?.status()).toBe(200);
  const search = page.getByRole('textbox', { name: 'Search HealthTimes' });
  await expect(search).toBeVisible();
  await search.fill('HIV');
  await search.press('Enter');
  await page.getByText('Article results', { exact: true }).first().waitFor({ timeout: 30000 });

  response = await page.goto('/live', { waitUntil: 'domcontentloaded', timeout: 30000 });
  expect(response?.status()).toBe(200);
  await page.getByText('Live is a first-class format', { exact: true }).waitFor({ timeout: 30000 });

  response = await page.goto('/watch', { waitUntil: 'domcontentloaded', timeout: 30000 });
  expect(response?.status()).toBe(200);
  await page.getByText('Watch HealthTimes interviews, explainers, investigations and health coverage.', { exact: false }).waitFor({ timeout: 30000 });

  response = await page.goto('/premium', { waitUntil: 'domcontentloaded', timeout: 30000 });
  expect(response?.status()).toBe(200);
  await page.getByText('Go Premium', { exact: true }).first().waitFor({ timeout: 30000 });
  await page.getByText('Premium access', { exact: true }).waitFor({ timeout: 30000 });
  await page.getByText('Membership options appear here only when they are available for your device and region.', { exact: false }).waitFor({ timeout: 30000 });

  response = await page.goto('/my', { waitUntil: 'domcontentloaded', timeout: 30000 });
  expect(response?.status()).toBe(200);
  await page.getByText('My HealthTimes', { exact: true }).first().waitFor({ timeout: 30000 });
  await page.getByText('HealthTimes Studio', { exact: true }).waitFor({ timeout: 30000 });

  await assertNoPageErrors(errors, 'canonical Reader routes');
});

test('recent and older migrated stories render through the canonical apps/mobile Reader', async ({ page }) => {
  const errors = capturePageErrors(page);
  for (const [label, path] of [['recent', directPath], ['older', oldPath]]) {
    const response = await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 30000 });
    expect(response?.status(), label + ' migrated HTTP').toBe(200);
    await page.getByRole('button', { name: 'Save article' }).waitFor({ timeout: 30000 });
    await page.getByRole('button', { name: 'Download article for offline reading' }).waitFor({ timeout: 30000 });
    await page.getByRole('button', { name: 'Listen to article' }).waitFor({ timeout: 30000 });
    await page.getByRole('button', { name: 'Share article' }).waitFor({ timeout: 30000 });
    await page.getByText('Original publication', { exact: true }).waitFor({ timeout: 30000 });
    await expect(page.getByText('Article not found.', { exact: true })).toHaveCount(0);
  }
  await assertNoPageErrors(errors, 'migrated stories');
});

test('Premium migrated article remains visibly protected and never becomes a public full-body Reader', async ({ page }) => {
  const errors = capturePageErrors(page);
  const response = await page.goto(premiumPath, { waitUntil: 'domcontentloaded', timeout: 30000 });
  expect(response?.status()).toBe(200);
  await page.getByText('Premium member access', { exact: true }).waitFor({ timeout: 30000 });
  await page.getByText('HealthTimes must verify member entitlement before protected body content can be requested.', { exact: false }).waitFor({ timeout: 30000 });
  await page.getByRole('button', { name: 'View Premium access' }).waitFor({ timeout: 30000 });
  await assertNoPageErrors(errors, 'Premium protected article');
});

test('routing authority preserves one-hop alias context path and explicit 404 behavior', async ({ request }) => {
  const alias = await request.get(legacyAliasPath, { maxRedirects: 0 });
  expect(alias.status()).toBe(301);
  expect(alias.headers().location).toBe(legacyAliasTarget);

  const context = await request.get(categoryPath);
  expect(context.status()).toBe(200);
  const contextBody = await context.text();
  expect(contextBody).toContain('name="robots" content="noindex,follow"');
  expect(contextBody).toContain('window.__HTP_PHASE4_CAPABILITY__');

  const explicit = await request.get(explicit404Path);
  expect(explicit.status()).toBe(404);

  const unknown = await request.get(unknownPath);
  expect(unknown.status()).toBe(404);
});

test('PWA manifest and service worker expose the canonical offline/failure shell contract', async ({ request }) => {
  const manifestResponse = await request.get('/manifest.json');
  expect(manifestResponse.status()).toBe(200);
  const manifest = await manifestResponse.json();
  expect(manifest.display).toBe('standalone');
  expect(manifest.name).toContain('HealthTimes');

  const swResponse = await request.get('/sw.js');
  expect(swResponse.status()).toBe(200);
  const sw = await swResponse.text();
  expect(sw).toContain('self.addEventListener("fetch"');
  expect(sw).toContain('request.mode === "navigate"');
  expect(sw).toContain('caches.match(scopedPath())');
});
