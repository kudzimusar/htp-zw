const { test, expect } = require('@playwright/test');

const viewports = [
  { name: 'phone-375', width: 375, height: 812, mobile: true },
  { name: 'phone-430', width: 430, height: 932, mobile: true },
  { name: 'tablet-768', width: 768, height: 1024, mobile: true },
  { name: 'small-1024', width: 1024, height: 768, mobile: false },
  { name: 'desktop-1440', width: 1440, height: 1000, mobile: false },
  { name: 'wide-1920', width: 1920, height: 1080, mobile: false }
];

async function clearState(page) {
  await page.goto('/index.html');
  await page.evaluate(() => localStorage.clear());
}

async function assertNoHorizontalOverflow(page) {
  const dims = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
    body: document.body.scrollWidth
  }));
  expect(dims.scroll, JSON.stringify(dims)).toBeLessThanOrEqual(dims.client + 2);
  expect(dims.body, JSON.stringify(dims)).toBeLessThanOrEqual(dims.client + 2);
}

async function assertStoryTextDoesNotOverlap(page, mobile) {
  const violations = await page.evaluate(({ mobile }) => {
    const cards = mobile ? [...document.querySelectorAll('.v21-mobile-story')] : [...document.querySelectorAll('.story-card')];
    const overlaps = [];
    const rect = el => el && el.getBoundingClientRect();
    cards.forEach((card, index) => {
      const h = card.querySelector('h3');
      const meta = card.querySelector('.story-meta');
      const p = card.querySelector('p');
      const hr = rect(h), pr = rect(p), mr = rect(meta);
      const badlyOverlaps = (a,b) => a && b && a.width > 0 && b.width > 0 && a.bottom > b.top + 3 && a.top < b.top;
      if (badlyOverlaps(hr, pr)) overlaps.push(`card ${index} heading/summary`);
      if (badlyOverlaps(hr, mr)) overlaps.push(`card ${index} heading/meta`);
      if (badlyOverlaps(pr, mr)) overlaps.push(`card ${index} summary/meta`);
    });
    if (!mobile) {
      const hero = document.querySelector('.hero-lead');
      const h = hero?.querySelector('h1')?.getBoundingClientRect();
      const p = hero?.querySelector('p')?.getBoundingClientRect();
      const meta = hero?.querySelector('.story-meta')?.getBoundingClientRect();
      if (h && p && h.bottom > p.top + 3) overlaps.push('hero heading/summary');
      if (p && meta && p.bottom > meta.top + 3) overlaps.push('hero summary/meta');
    }
    return overlaps;
  }, { mobile });
  expect(violations).toEqual([]);
}

for (const vp of viewports) {
  test(`homepage layout integrity — ${vp.name}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await clearState(page);
    await page.goto('/index.html');
    await expect(page.locator('html')).toHaveClass(/v21-ready/);
    await assertNoHorizontalOverflow(page);

    if (vp.mobile) {
      await expect(page.locator('.v21-mobile-home')).toBeVisible();
      await expect(page.locator('.mobile-topbar')).toBeVisible();
      await expect(page.locator('.site-header')).toBeHidden();
      await expect(page.locator('.site-footer')).toBeHidden();
      await expect(page.locator('.mobile-bottom-nav')).toBeVisible();
    } else {
      await expect(page.locator('.v21-mobile-home')).toBeHidden();
      await expect(page.locator('.site-header')).toBeVisible();
      await expect(page.locator('.site-footer')).toBeVisible();
    }

    await assertStoryTextDoesNotOverlap(page, vp.mobile);
    await testInfo.attach(`home-${vp.name}.png`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
  });
}

test('mobile menu, search and saved sheets remain open until dismissed', async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await clearState(page);
  await page.goto('/index.html');

  await page.locator('.mobile-topbar > button:first-child').click();
  const more = page.locator('[data-sheet="more"]');
  await expect(more).toBeVisible();
  await page.waitForTimeout(500);
  await expect(more).toBeVisible();
  await more.locator('[data-sheet-close]').click();
  await expect(more).toBeHidden();

  await page.locator('.v21-mobile-actions [data-sheet-open="search"]').click();
  const search = page.locator('[data-sheet="search"]');
  await expect(search).toBeVisible();
  await page.waitForTimeout(500);
  await expect(search).toBeVisible();
  await search.locator('[data-search-input]').fill('HIV');
  await expect(search.locator('.search-result').first()).toBeVisible();
  await search.locator('[data-sheet-close]').click();

  await page.locator('.mobile-bottom-nav [data-sheet-open="saved"]').click();
  const saved = page.locator('[data-sheet="saved"]');
  await expect(saved).toBeVisible();
  await page.waitForTimeout(500);
  await expect(saved).toBeVisible();
  await saved.locator('[data-sheet-close]').click();
});

test('reader can create account, reopen profile and persist dark theme', async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await clearState(page);
  await page.goto('/index.html');
  await page.locator('.v21-mobile-actions [data-v21-account]').click();
  await page.locator('[data-v21-auth-tab="signup"]').click();
  const email = `uat-${Date.now()}@example.com`;
  await page.locator('[data-v21-signup] input[name="name"]').fill('UAT Reader');
  await page.locator('[data-v21-signup] input[name="email"]').fill(email);
  await page.locator('[data-v21-signup] input[name="password"]').fill('HealthTimes#UAT26');
  await Promise.all([
    page.waitForLoadState('domcontentloaded'),
    page.locator('[data-v21-signup] button[type="submit"]').click()
  ]);
  await expect(page.locator('.v21-mobile-actions [data-v21-account]')).toBeVisible();
  await page.locator('.v21-mobile-actions [data-v21-account]').click();
  await expect(page.locator('[data-v21-account-body]')).toContainText(email);
  await page.locator('[data-v21-theme-option="dark"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('Premium story shows early notice and stronger warning without blocking navigation', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('htpGuestIdV21', JSON.stringify('uat-guest'));
    localStorage.setItem('htpPremiumPreviewV21:uat-guest:healthcare-provision-programme', JSON.stringify(Date.now() - 9000));
  });
  await page.goto('/article.html?id=healthcare-provision-programme');
  await expect(page.locator('[data-v21-premium-status]')).toBeVisible();
  await expect(page.locator('[data-v21-premium-copy]')).toContainText('Premium');
  await expect(page.locator('[data-v21-paywall]')).toBeHidden();

  await page.evaluate(() => localStorage.setItem('htpPremiumPreviewV21:uat-guest:healthcare-provision-programme', JSON.stringify(Date.now() - 22000)));
  await page.reload();
  await expect(page.locator('[data-v21-premium-status]')).toHaveClass(/is-warning/);
  await expect(page.locator('[data-v21-premium-copy]')).toContainText('ending soon');
  await expect(page.locator('.site-header')).toBeVisible();
});

test('Premium story auto-locks and automatically opens subscription prompt after allowance', async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('htpGuestIdV21', JSON.stringify('uat-guest'));
    localStorage.setItem('htpPremiumPreviewV21:uat-guest:healthcare-provision-programme', JSON.stringify(Date.now() - 31000));
  });
  await page.goto('/article.html?id=healthcare-provision-programme');
  await expect(page.locator('.article-body')).toHaveClass(/v21-premium-locked/);
  await expect(page.locator('[data-v21-paywall]')).toBeVisible();
  const subscribe = page.locator('[data-sheet="subscribe"]');
  await expect(subscribe).toBeVisible();
  await subscribe.locator('[data-sheet-close]').click();
  await expect(subscribe).toBeHidden();
  await expect(page.locator('[data-v21-paywall]')).toBeVisible();
  await expect(page.locator('.mobile-bottom-nav')).toBeVisible();
});

test('refresh does not reset Premium article allowance', async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('htpGuestIdV21', JSON.stringify('refresh-guest'));
    localStorage.setItem('htpPremiumPreviewV21:refresh-guest:healthcare-provision-programme', JSON.stringify(Date.now() - 31000));
  });
  await page.goto('/article.html?id=healthcare-provision-programme');
  await expect(page.locator('[data-v21-paywall]')).toBeVisible();
  await page.reload();
  await expect(page.locator('[data-v21-paywall]')).toBeVisible();
});

test('Premium reader bypasses gate and can copy citation', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.addInitScript(() => {
    const account={id:'reader-001',name:'HealthTimes Reader',email:'reader@healthtimes.co.zw',password:'HealthTimes#Reader26',premium:true};
    localStorage.setItem('htpReaderAccountsV21', JSON.stringify([account]));
    localStorage.setItem('htpActiveReaderV21', JSON.stringify('reader-001'));
  });
  await page.goto('/article.html?id=healthcare-provision-programme');
  await expect(page.locator('[data-v21-paywall]')).toBeHidden();
  await expect(page.locator('.article-body')).not.toHaveClass(/v21-premium-locked/);
  await expect(page.locator('[data-v21-cite]')).toBeVisible();
});

test('HOSPAZ paid campaign renders with disclosure on desktop and mobile', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await clearState(page);
  await page.goto('/index.html');
  await expect(page.locator('.v21-ad-masthead')).toBeVisible();
  await expect(page.locator('.v21-ad-masthead')).toContainText('HOSPAZ');
  await expect(page.locator('.v21-ad-masthead')).toContainText('Paid placement');

  await page.setViewportSize({ width: 430, height: 932 });
  await page.reload();
  await expect(page.locator('.v21-ad-compact')).toBeVisible();
  await expect(page.locator('.v21-ad-masthead')).toBeHidden();
});

test('editor can control Premium state and open Advertising Manager', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() => localStorage.setItem('htpNewsroomSession', JSON.stringify({ username: 'editor' })));
  await page.goto('/newsroom.html');
  await expect(page.locator('[data-newsroom-app]')).toBeVisible();
  await expect(page.locator('[data-v21-module="ads"]')).toBeVisible();
  await page.locator('[data-v21-module="ads"]').click();
  await expect(page.locator('[data-workspace] h1')).toHaveText('Advertising Manager');
  await expect(page.locator('[data-workspace]')).toContainText('HOSPAZ');

  await page.locator('[data-module="premium"]').click();
  await expect(page.locator('[data-v21-premium-admin]')).toBeVisible();
  const toggle=page.locator('[data-v21-premium-toggle="s1"]');
  const before=await toggle.textContent();
  await toggle.click();
  await expect(toggle).not.toHaveText(before);
  const override=await page.evaluate(() => JSON.parse(localStorage.getItem('htpStoryOverrides')||'{}')['natpharm-supply-chain']);
  expect(typeof override.premium).toBe('boolean');
});

test('commercial role sees Advertising but not editorial Stories module', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('htpNewsroomSession', JSON.stringify({ username: 'commercial' })));
  await page.goto('/newsroom.html');
  await expect(page.locator('[data-v21-module="ads"]')).toBeVisible();
  await expect(page.locator('[data-module="stories"]')).toHaveCount(0);
});

test('archive preserves original HealthTimes section products', async ({ page }) => {
  await page.goto('/archive.html');
  for (const label of ['Breaking News','Feature','Epidemics','Abortion Compendium','Academic & Research','Global Health','Community Development','Communicable Diseases','Noncommunicable Diseases','HIV/AIDS','Policy','Public Health','Jobs','Opinion & Analysis','Fellowships & Grants','Research & Findings','BARAZA E-PAPER','HealthTimes Premium']) {
    await expect(page.locator('.v21-section-directory')).toContainText(label);
  }
  await expect(page.locator('.v21-source-story')).toHaveCount(23);
});

test('PWA manifest and service worker are reachable', async ({ request }) => {
  const manifest=await request.get('/site.webmanifest');
  expect(manifest.ok()).toBeTruthy();
  const json=await manifest.json();
  expect(json.display).toBe('standalone');
  expect(json.name).toContain('HealthTimes');
  const sw=await request.get('/sw.js');
  expect(sw.ok()).toBeTruthy();
  expect(await sw.text()).toContain('healthtimes-shell-v21');
});
