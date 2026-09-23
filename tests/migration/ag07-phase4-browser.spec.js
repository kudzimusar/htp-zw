const { test, expect } = require('@playwright/test');

const readerRoutes = ['/', '/explore', '/live', '/watch', '/search', '/premium', '/my'];

for (const viewport of [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 1000 }
]) {
  test('Phase 4 universal Reader smoke — ' + viewport.name, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    for (const route of readerRoutes) {
      const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect(response && response.status(), route).toBe(200);
      await expect(page.locator('body')).toContainText('HealthTimes');
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(page.locator('body')).toContainText('HealthTimes');
    }

    const article = await page.goto('/2026/02/12/phase4-representative-story/', { waitUntil: 'domcontentloaded' });
    expect(article && article.status()).toBe(200);
    await expect(page.getByText('Phase 4 representative migrated story', { exact: true })).toBeVisible();
    await expect(page.getByText('Verified Phase 4 Reader body.', { exact: false })).toBeVisible();
    expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toBe('https://healthtimes.co.zw/2026/02/12/phase4-representative-story/');
    expect(await page.title()).toContain('Phase 4 representative migrated story');

    const context = await page.goto('/category/health_news/', { waitUntil: 'domcontentloaded' });
    expect(context && context.status()).toBe(200);
    await expect(page.getByText('Coverage archive', { exact: true })).toBeVisible();

    const missing = await page.goto('/phase4-definitely-unknown-route/', { waitUntil: 'domcontentloaded' });
    expect(missing && missing.status()).toBe(404);
    await expect(page.getByText('Page not found', { exact: true })).toBeVisible();
  });
}
