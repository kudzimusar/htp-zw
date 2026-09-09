const { test, expect } = require('@playwright/test');

async function resetAt(page, path) {
  await page.goto('/index.html');
  await page.evaluate(() => localStorage.clear());
  await page.goto(path);
}

test('mobile article uses polished icons, compact menu and one share group', async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await resetAt(page, '/article.html?id=natpharm-supply-chain');

  const rail = page.locator('.article-rail');
  await expect(rail).toBeVisible();
  await expect(rail.locator('[data-save]')).toHaveAttribute('data-quality-icon', 'bookmark');
  await expect(rail.locator('[data-share]')).toHaveAttribute('data-quality-icon', 'share');
  await expect(rail.locator('[data-open-ai]')).toHaveAttribute('data-quality-icon', 'ai');
  await expect(rail.locator('[data-reader-toggle]')).toBeVisible();
  await expect(rail.locator('[title="Discuss on WhatsApp"]')).toBeHidden();

  const aiTab = page.locator('.mobile-bottom-nav .ai-tab');
  await expect(aiTab).toHaveAttribute('data-quality-nav', 'ai');
  await expect(aiTab.locator('svg')).toBeVisible();

  const shareBar = page.locator('[data-social-bar]');
  await expect(shareBar).toBeVisible();
  await expect(shareBar.locator('button')).toHaveCount(5);
  for (const selector of ['[data-social="whatsapp"]','[data-social="facebook"]','[data-social="x"]','[data-social="linkedin"]','[data-share]']) {
    await expect(shareBar.locator(selector).locator('svg')).toBeVisible();
  }
  await expect(page.locator('.v21-social-icons')).toHaveCount(0);

  await page.locator('.mobile-bottom-nav [data-sheet-open="more"]').click();
  const more = page.locator('[data-sheet="more"]');
  await expect(more).toBeVisible();
  const menuFont = await more.locator('.menu-links a').first().evaluate(el => parseFloat(getComputedStyle(el).fontSize));
  expect(menuFont).toBeLessThanOrEqual(15.1);
});

test('mobile public pages place visible masthead advertising after navigation', async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 932 });
  for (const path of ['/article.html?id=natpharm-supply-chain','/premium.html','/preferences.html','/about.html','/archive.html']) {
    await resetAt(page, path);
    const compact = page.locator('.v21-ad-compact');
    await expect(compact).toBeVisible();
    const relation = await compact.evaluate(el => ({
      previousId: el.previousElementSibling?.id || '',
      headerTop: document.querySelector('#app-header')?.getBoundingClientRect().top,
      adTop: el.getBoundingClientRect().top
    }));
    expect(relation.previousId, path).toBe('app-header');
    expect(relation.adTop, path).toBeGreaterThanOrEqual(relation.headerTop);
  }
});

test('desktop masthead advertising follows the primary header', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await resetAt(page, '/about.html');
  const masthead = page.locator('.v21-ad-masthead');
  await expect(masthead).toBeVisible();
  expect(await masthead.evaluate(el => el.previousElementSibling?.id || '')).toBe('app-header');
});

test('expired Premium article shows one concise preview status', async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await page.addInitScript(() => {
    localStorage.setItem('htpGuestIdV21', JSON.stringify('quality-premium-guest'));
    localStorage.setItem('htpPremiumPreviewV21:quality-premium-guest:healthcare-provision-programme', JSON.stringify(Date.now() - 31000));
  });
  await page.goto('/article.html?id=healthcare-provision-programme');

  await expect(page.locator('.article-body')).toHaveClass(/v21-premium-locked/);
  await expect(page.locator('.preview-banner[data-premium-preview]')).toBeHidden();

  const status = page.locator('[data-v21-premium-status]');
  await expect(status).toBeVisible();
  await expect(status).toContainText('Premium preview ended');
  await expect(status).toHaveAttribute('data-preview-ended', 'true');
  await expect(status.locator('[data-v21-premium-countdown]')).toBeHidden();
  await expect(page.locator('[data-v21-premium-status]')).toHaveCount(1);
});

test('homepage keeps mobile advertising inside the editorial feed', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await resetAt(page, '/index.html');
  const ad = page.locator('.v21-mobile-feed .v21-ad-compact');
  await expect(ad).toBeVisible();
  await expect(ad).toHaveClass(/v21-mobile-flow-ad/);
  await expect(page.locator('#app-header + .v21-ad-compact')).toHaveCount(0);
});
