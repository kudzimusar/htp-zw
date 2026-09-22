const { test, expect } = require('@playwright/test');

const viewports = [
  { name: '375', width: 375, height: 812 },
  { name: '430', width: 430, height: 932 },
  { name: '1440', width: 1440, height: 1000 }
];

for (const viewport of viewports) {
  test(`AG-05 public shell is usable at ${viewport.name}px`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/index.html');
    await expect(page.locator('body[data-page="home"]')).toBeVisible();
    await expect(page.locator('#main-content')).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(2);

    const analyticsScripts = await page.locator('script[data-healthtimes-google-tag]').count();
    expect(analyticsScripts).toBe(0);
  });
}

test('article shell carries fail-closed SEO metadata in initial HTML', async ({ request }) => {
  const response = await request.get('/article.html?id=natpharm-supply-chain');
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain('noindex,follow,max-image-preview:large');
  expect(html).toContain('data-seo-fallback');
});

test('home authority metadata is server-visible in initial HTML', async ({ request }) => {
  const response = await request.get('/');
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain('<link rel="canonical" href="https://healthtimes.co.zw/"');
  expect(html).toContain('"@type": "Organization"');
  expect(html).toContain('"@type": "WebSite"');
});

test('premium and archive surfaces render without horizontal overflow', async ({ page }) => {
  for (const path of ['/premium.html', '/archive.html']) {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(path);
    await expect(page.locator('#main-content')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(2);
  }
});

test('Newsroom does not load the public analytics adapter', async ({ page }) => {
  await page.goto('/newsroom.html');
  expect(await page.locator('script[src="analytics.js"]').count()).toBe(0);
  expect(await page.locator('script[data-healthtimes-google-tag]').count()).toBe(0);
});

test('seller authorization files are exact and plain text', async ({ request }) => {
  const expected = 'google.com, pub-8744434739998394, DIRECT, f08c47fec0942fa0';
  for (const path of ['/ads.txt', '/app-ads.txt']) {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    expect((await response.text()).trim()).toBe(expected);
  }
});
