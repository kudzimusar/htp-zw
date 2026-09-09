const { test, expect } = require('@playwright/test');

async function reset(page) {
  await page.goto('/newsroom.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

async function signIn(page, username, password) {
  await page.locator('[data-login-form] input[name="username"]').fill(username);
  await page.locator('[data-login-form] input[name="password"]').fill(password);
  await page.locator('[data-login-form] button[type="submit"]').click();
  await page.waitForLoadState('domcontentloaded');
  await expect(page.locator('[data-newsroom-app]')).toBeVisible();
}

test('Newsroom login is a gateway and authenticated session replaces it', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 950 });
  await reset(page);
  await expect(page.locator('[data-login-view]')).toBeVisible();
  await expect(page.locator('[data-newsroom-app]')).toBeHidden();
  await signIn(page, 'editor', 'HealthTimes#Editor26');
  await expect(page.locator('[data-login-view]')).toBeHidden();
  await expect(page.locator('[data-newsroom-nav] button')).toHaveCount(await page.locator('[data-newsroom-nav] button').count());
  expect(await page.locator('[data-newsroom-nav] button').count()).toBeGreaterThan(18);
  await page.reload();
  await expect(page.locator('[data-newsroom-app]')).toBeVisible();
  await expect(page.locator('[data-login-view]')).toBeHidden();
  await expect(page.locator('[data-topline]')).toContainText('Michael Gwarisa');
});

test('reporter can create autosave reopen and submit but cannot publish', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 950 });
  await reset(page);
  await signIn(page, 'reporter', 'HealthTimes#Reporter26');
  await expect(page.locator('[data-newsroom-nav] [data-module="review"]')).toHaveCount(0);
  await expect(page.locator('[data-newsroom-nav] [data-module="advertising"]')).toHaveCount(0);
  await page.locator('[data-quick-create]').first().click();
  await expect(page.locator('[data-story-modal]')).toBeVisible();
  await page.locator('[data-story-form] textarea[name="title"]').fill('Global malaria financing test story');
  await page.locator('[data-story-form] textarea[name="standfirst"]').fill('A newsroom UAT story for reporter workflow.');
  await page.locator('[data-story-form] textarea[name="body"]').fill('Working copy with evidence and reporting context.');
  await page.waitForTimeout(900);
  await expect(page.locator('[data-save-state]')).toHaveText('Saved');
  const created = await page.evaluate(() => JSON.parse(localStorage.getItem('htpNewsroomStories') || '[]').find(s => s.title === 'Global malaria financing test story'));
  expect(created).toBeTruthy();
  expect(created.owner).toBe('reporter');
  expect(created.status).toBe('Draft');
  await page.locator('[data-story-modal-close]').click();
  await page.locator('[data-module="my-stories"]').click();
  await page.getByText('Global malaria financing test story', { exact: true }).first().click();
  const row = page.locator('tr').filter({ hasText: 'Global malaria financing test story' });
  await row.getByRole('button', { name: 'Open' }).click();
  await page.locator('[data-editor-primary]').click();
  const submitted = await page.evaluate(() => JSON.parse(localStorage.getItem('htpNewsroomStories') || '[]').find(s => s.title === 'Global malaria financing test story'));
  expect(submitted.status).toBe('Submitted');
  await expect(page.locator('[data-editor-primary]')).not.toHaveText('Publish');
});

test('editor can work review queue and publish a ready story', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 950 });
  await reset(page);
  await signIn(page, 'editor', 'HealthTimes#Editor26');
  await page.locator('[data-module="review"]').click();
  await expect(page.locator('[data-workspace]')).toContainText('Review Queue');
  const ready = page.locator('.nr-queue-card').filter({ hasText: 'Medicine Supply Dashboard' });
  await expect(ready).toBeVisible();
  await ready.getByRole('button', { name: 'Publish' }).click();
  const story = await page.evaluate(() => JSON.parse(localStorage.getItem('htpNewsroomStories') || '[]').find(s => s.id === 's4'));
  expect(story.status).toBe('Published');
});

test('publisher can invite staff revoke sessions and revoke access with audit trail', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 950 });
  await reset(page);
  await signIn(page, 'publisher', 'HealthTimes#Publisher26');
  await page.locator('[data-module="staff"]').click();
  await page.locator('[data-open-invite]').click();
  await page.locator('[data-invite-form] input[name="name"]').fill('Ama Mensah');
  await page.locator('[data-invite-form] input[name="email"]').fill('ama@healthtimes.co.zw');
  await page.locator('[data-invite-form] select[name="role"]').selectOption({ label: 'Reporter / Journalist' });
  await page.locator('[data-invite-form] select[name="desk"]').selectOption({ label: 'West Africa' });
  await page.locator('[data-invite-form] button[type="submit"]').click();
  await expect(page.locator('[data-workspace]')).toContainText('Ama Mensah');
  const reporterRow = page.locator('tr').filter({ hasText: 'Kuda Pembere' });
  await reporterRow.getByRole('button', { name: 'Revoke sessions' }).click();
  await reporterRow.getByRole('button', { name: 'Revoke access' }).click();
  await expect(page.locator('[data-confirm-modal]')).toBeVisible();
  await page.locator('[data-confirm-accept]').click();
  await expect(page.locator('tr').filter({ hasText: 'Kuda Pembere' })).toContainText('Revoked');
  await page.locator('[data-module="audit"]').click();
  await expect(page.locator('[data-workspace]')).toContainText('revoked Newsroom access');
});

test('commercial workspace is operational but editorial story editing remains unavailable', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 950 });
  await reset(page);
  await signIn(page, 'commercial', 'HealthTimes#Commercial26');
  await expect(page.locator('[data-newsroom-nav] [data-module="stories"]')).toHaveCount(0);
  await expect(page.locator('[data-newsroom-nav] [data-module="advertising"]')).toBeVisible();
  await expect(page.locator('[data-workspace]')).toContainText('Commercial workspace');
  await page.locator('[data-module="advertising"]').click();
  await expect(page.locator('[data-workspace] h1')).toHaveText('Advertising Manager');
  await expect(page.locator('[data-workspace]')).toContainText('HOSPAZ');
});

test('Newsroom shell has no horizontal overflow on laptop and mobile admin widths', async ({ page }) => {
  for (const viewport of [{width:1440,height:950},{width:1024,height:768},{width:768,height:1024}]) {
    await page.setViewportSize(viewport);
    await reset(page);
    await signIn(page, 'editor', 'HealthTimes#Editor26');
    const dims = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    expect(dims.scroll).toBeLessThanOrEqual(dims.client + 2);
    await expect(page.locator('[data-workspace] h1')).toBeVisible();
  }
});
