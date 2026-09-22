const { test, expect } = require('@playwright/test');

const live = Boolean(
  process.env.AG06_STAGING_BASE_URL &&
  process.env.AG06_REPORTER_EMAIL && process.env.AG06_REPORTER_PASSWORD &&
  process.env.AG06_EDITOR_EMAIL && process.env.AG06_EDITOR_PASSWORD &&
  process.env.AG06_COMMERCIAL_EMAIL && process.env.AG06_COMMERCIAL_PASSWORD &&
  process.env.AG06_PUBLISHER_EMAIL && process.env.AG06_PUBLISHER_PASSWORD
);

const accounts = {
  reporter: { email: process.env.AG06_REPORTER_EMAIL, password: process.env.AG06_REPORTER_PASSWORD },
  editor: { email: process.env.AG06_EDITOR_EMAIL, password: process.env.AG06_EDITOR_PASSWORD },
  commercial: { email: process.env.AG06_COMMERCIAL_EMAIL, password: process.env.AG06_COMMERCIAL_PASSWORD },
  publisher: { email: process.env.AG06_PUBLISHER_EMAIL, password: process.env.AG06_PUBLISHER_PASSWORD }
};

async function signIn(page, kind) {
  const account = accounts[kind];
  await page.goto('/newsroom.html');
  await page.locator('[data-login-form] input[name="email"]').fill(account.email);
  await page.locator('[data-login-form] input[name="password"]').fill(account.password);
  await page.locator('[data-login-form] button[type="submit"]').click();
  await expect(page.locator('[data-newsroom-app]')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('[data-login-view]')).toBeHidden();
}

test('Newsroom gateway stays closed without a provider session', async ({ page }) => {
  await page.context().clearCookies();
  await page.goto('/newsroom.html');
  await expect(page.locator('[data-login-view]')).toBeVisible();
  await expect(page.locator('[data-newsroom-app]')).toBeHidden();
  await expect(page.locator('[data-login-form] input[name="email"]')).toBeVisible();
  await expect(page.locator('[data-recover-account]')).toBeVisible();
});

test.describe('AG-06 live server-backed Newsroom journeys', () => {
  test.describe.configure({ mode: 'serial' });
  test.skip(!live, 'Live Newsroom journeys require staging-only role credentials.');

  let reporterStoryTitle = '';

  test('Reporter saves, reloads, resumes and submits without browser-local authority', async ({ page }) => {
    page.on('pageerror', error => console.log('AG06_UI_PAGEERROR', error.message));
    page.on('console', msg => {
      if (['error','warning'].includes(msg.type())) console.log('AG06_UI_CONSOLE', msg.type(), msg.text());
    });
    await signIn(page, 'reporter');
    await expect(page.locator('[data-newsroom-nav] [data-module="review"]')).toHaveCount(0);
    await expect(page.locator('[data-newsroom-nav] [data-module="advertising"]')).toHaveCount(0);

    reporterStoryTitle = `AG06 UI Autosave ${Date.now()}`;
    await page.locator('[data-quick-create]').first().click();
    try {
      await expect(page.locator('[data-story-modal]')).toBeVisible();
    } catch (error) {
      console.log('AG06_UI_TOAST', await page.locator('[data-newsroom-toast]').textContent().catch(()=>'')); 
      throw error;
    }
    await page.locator('[data-story-form] textarea[name="title"]').fill(reporterStoryTitle);
    await page.locator('[data-story-form] textarea[name="standfirst"]').fill('Server-backed Newsroom UAT draft.');
    await page.locator('[data-story-form] textarea[name="body"]').fill('This copy must survive a browser refresh because Supabase is authoritative.');
    await expect(page.locator('[data-save-state]')).toHaveText('Saved', { timeout: 15_000 });
    await page.locator('[data-story-modal-close]').click();

    await page.reload();
    await expect(page.locator('[data-newsroom-app]')).toBeVisible();
    await page.locator('[data-module="my-stories"]').click();
    const row = page.locator('tr').filter({ hasText: reporterStoryTitle });
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Open' }).click();
    await expect(page.locator('[data-story-form] textarea[name="body"]')).toHaveValue(/survive a browser refresh/);
    await expect(page.locator('[data-editor-primary]')).toHaveText('Submit for review');
    await page.locator('[data-editor-primary]').click();
    await expect(page.locator('[data-editor-state]')).toHaveText('Submitted', { timeout: 15_000 });
    await expect(page.locator('[data-editor-primary]')).not.toHaveText('Publish');
  });

  test('Editor receives review authority and the Reporter submission', async ({ page }) => {
    await signIn(page, 'editor');
    await page.locator('[data-module="review"]').click();
    await expect(page.locator('[data-workspace]')).toContainText('Review Queue');
    if (reporterStoryTitle) {
      await expect(page.locator('[data-workspace]')).toContainText(reporterStoryTitle);
    }
    await expect(page.locator('[data-newsroom-nav] [data-module="staff"]')).toBeVisible();
  });

  test('Commercial sees commercial operations but no editorial story workspace', async ({ page }) => {
    await signIn(page, 'commercial');
    await expect(page.locator('[data-newsroom-nav] [data-module="stories"]')).toHaveCount(0);
    await expect(page.locator('[data-newsroom-nav] [data-module="advertising"]')).toBeVisible();
    await page.locator('[data-module="advertising"]').click();
    await expect(page.locator('[data-workspace] h1')).toHaveText('Advertising');
  });

  test('Publisher/Admin can inspect staff, sessions and durable audit', async ({ page }) => {
    await signIn(page, 'publisher');
    await page.locator('[data-module="staff"]').click();
    await expect(page.locator('[data-workspace]')).toContainText('Staff');
    await page.locator('[data-module="security"]').click();
    await expect(page.locator('[data-workspace]')).toContainText('Sessions');
    await page.locator('[data-module="audit"]').click();
    await expect(page.locator('[data-workspace]')).toContainText('Audit');
  });

  test('Newsroom shell remains usable at laptop and tablet admin widths', async ({ page }) => {
    await signIn(page, 'editor');
    for (const viewport of [{width:1440,height:950},{width:1024,height:768},{width:768,height:1024}]) {
      await page.setViewportSize(viewport);
      const dims = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth
      }));
      expect(dims.scroll).toBeLessThanOrEqual(dims.client + 2);
      await expect(page.locator('[data-workspace] h1')).toBeVisible();
    }
  });
});
