const { test, expect } = require('@playwright/test');

const viewports = [
  { name: 'phone-375', width: 375, height: 812, mobile: true },
  { name: 'phone-430', width: 430, height: 932, mobile: true },
  { name: 'tablet-768', width: 768, height: 1024, mobile: true },
  { name: 'desktop-1440', width: 1440, height: 1000, mobile: false },
  { name: 'wide-1920', width: 1920, height: 1080, mobile: false }
];

async function clearState(page) {
  await page.goto('/index.html');
  await page.evaluate(() => localStorage.clear());
}

async function seedPremiumGuest(page, guestId, elapsedMs) {
  await page.goto('/index.html');
  await page.evaluate(({ guestId, elapsedMs }) => {
    localStorage.clear();
    localStorage.setItem('htpGuestIdV21', JSON.stringify(guestId));
    localStorage.setItem(`htpPremiumPreviewV21:${guestId}:healthcare-provision-programme`, JSON.stringify(Date.now() - elapsedMs));
  }, { guestId, elapsedMs });
}

for (const vp of viewports) {
  test(`public homepage layout integrity — ${vp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await clearState(page);
    await page.goto('/index.html');
    await expect(page.locator('html')).toHaveClass(/v21-ready/);
    const dims = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth, body: document.body.scrollWidth }));
    expect(dims.scroll).toBeLessThanOrEqual(dims.client + 2);
    expect(dims.body).toBeLessThanOrEqual(dims.client + 2);
    if (vp.mobile) {
      await expect(page.locator('.v21-mobile-home')).toBeVisible();
      await expect(page.locator('.mobile-topbar')).toBeVisible();
      await expect(page.locator('.site-header')).toBeHidden();
      await expect(page.locator('.site-footer')).toBeHidden();
      await expect(page.locator('.mobile-bottom-nav')).toBeVisible();
    } else {
      await expect(page.locator('.site-header')).toBeVisible();
      await expect(page.locator('.site-footer')).toBeVisible();
    }
  });
}

test('mobile sheets remain open until explicitly dismissed', async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await clearState(page);
  await page.goto('/index.html');
  await page.locator('.mobile-topbar > button:first-child').click();
  const more = page.locator('[data-sheet="more"]');
  await expect(more).toBeVisible();
  await page.waitForTimeout(450);
  await expect(more).toBeVisible();
  await more.locator('[data-sheet-close]').click();
  await expect(more).toBeHidden();
});

test('Premium story locks after allowance and prompt opens automatically', async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await seedPremiumGuest(page, 'uat-premium-lock', 31000);
  await page.goto('/article.html?id=healthcare-provision-programme');
  await expect(page.locator('.article-body')).toHaveClass(/v21-premium-locked/);
  await expect(page.locator('[data-v21-paywall]')).toBeVisible();
  await expect(page.locator('[data-sheet="subscribe"]')).toBeVisible();
  await expect(page.locator('[data-v21-premium-status]')).toBeVisible();
});

test('Premium refresh does not reset allowance', async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await seedPremiumGuest(page, 'uat-premium-refresh', 31000);
  await page.goto('/article.html?id=healthcare-provision-programme');
  const before = await page.evaluate(() => localStorage.getItem('htpPremiumPreviewV21:uat-premium-refresh:healthcare-provision-programme'));
  await page.reload();
  const after = await page.evaluate(() => localStorage.getItem('htpPremiumPreviewV21:uat-premium-refresh:healthcare-provision-programme'));
  expect(after).toBe(before);
  await expect(page.locator('[data-v21-paywall]')).toBeVisible();
});

test('Premium reader bypasses gate and citation remains available', async ({ page }) => {
  await page.addInitScript(() => {
    const account = { id:'reader-001', name:'HealthTimes Reader', email:'reader@healthtimes.co.zw', password:'HealthTimes#Reader26', premium:true };
    localStorage.setItem('htpReaderAccountsV21', JSON.stringify([account]));
    localStorage.setItem('htpActiveReaderV21', JSON.stringify('reader-001'));
  });
  await page.goto('/article.html?id=healthcare-provision-programme');
  await expect(page.locator('[data-v21-paywall]')).toBeHidden();
  await expect(page.locator('[data-v21-cite]')).toBeVisible();
});

test('paid HOSPAZ creative keeps correct desktop and mobile hierarchy', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await clearState(page);
  await page.goto('/index.html');
  await expect(page.locator('.v21-ad-masthead')).toBeVisible();
  await expect(page.locator('.v21-ad-masthead')).toContainText('HOSPAZ');
  await page.setViewportSize({ width: 430, height: 932 });
  await page.reload();
  await expect(page.locator('.v21-ad-masthead')).toBeHidden();
  await expect(page.locator('.v21-ad-compact')).toBeVisible();
});

test('source archive preserves original HealthTimes product taxonomy', async ({ page }) => {
  await page.goto('/archive.html');
  for (const label of ['Breaking News','Feature','Epidemics','Abortion Compendium','Academic & Research','Global Health','Community Development','Communicable Diseases','Noncommunicable Diseases','HIV/AIDS','Policy','Public Health','Jobs','Opinion & Analysis','Fellowships & Grants','Research & Findings','BARAZA E-PAPER','HealthTimes Premium']) {
    await expect(page.locator('.v21-section-directory')).toContainText(label);
  }
});

test('PWA manifest and service worker remain reachable', async ({ request }) => {
  const manifest = await request.get('/site.webmanifest');
  expect(manifest.ok()).toBeTruthy();
  const json = await manifest.json();
  expect(json.display).toBe('standalone');
  expect(json.name).toContain('HealthTimes');
  const sw = await request.get('/sw.js');
  expect(sw.ok()).toBeTruthy();
});
