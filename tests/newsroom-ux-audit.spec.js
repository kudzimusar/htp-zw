const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const outDir = path.resolve('artifacts/newsroom-ux-audit');
fs.mkdirSync(outDir, { recursive: true });

const accounts = {
  reporter: { email: process.env.AG06_REPORTER_EMAIL, password: process.env.AG06_REPORTER_PASSWORD },
  editor: { email: process.env.AG06_EDITOR_EMAIL, password: process.env.AG06_EDITOR_PASSWORD },
  commercial: { email: process.env.AG06_COMMERCIAL_EMAIL, password: process.env.AG06_COMMERCIAL_PASSWORD },
  publisher: { email: process.env.AG06_PUBLISHER_EMAIL, password: process.env.AG06_PUBLISHER_PASSWORD }
};

const manifest = [];
function record(entry) {
  manifest.push(entry);
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
}
async function shot(page, name, meta={}) {
  await page.screenshot({ path: path.join(outDir, name), fullPage: true });
  record({ file:name, url:page.url(), viewport:page.viewportSize(), ...meta });
}
async function signIn(page, role) {
  const account = accounts[role];
  expect(account?.email, role + ' email').toBeTruthy();
  expect(account?.password, role + ' password').toBeTruthy();
  await page.goto('/newsroom.html');
  await page.locator('[data-login-form] input[name="email"]').fill(account.email);
  await page.locator('[data-login-form] input[name="password"]').fill(account.password);
  await page.locator('[data-login-form] button[type="submit"]').click();
  await expect(page.locator('[data-newsroom-app]')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('[data-login-view]')).toBeHidden();
}
async function openModule(page, id) {
  const button = page.locator('[data-newsroom-nav] [data-module="'+id+'"]');
  const viewport = page.viewportSize();
  if (viewport && viewport.width <= 980) {
    const sidebar = page.locator('[data-newsroom-sidebar]');
    if (!(await sidebar.evaluate(el => el.classList.contains('open')))) {
      const opener = page.locator('[data-sidebar-open]');
      await expect(opener).toBeVisible();
      await opener.click();
      await expect(sidebar).toHaveClass(/open/);
    }
  }
  await expect(button, 'module '+id).toBeVisible();
  await button.click();
  await expect(page.locator('[data-workspace] .nr-workspace-head')).toBeVisible();
}
async function captureNav(page, role) {
  const labels = await page.locator('[data-newsroom-nav] button').allTextContents();
  record({ role, type:'navigation', labels:labels.map(x=>x.replace(/\s+/g,' ').trim()) });
}

test.describe('AG-06 / CA-01 Newsroom product UX visual audit', () => {
  test.describe.configure({ mode: 'serial', timeout: 120_000 });

  test('login + Reporter journey evidence', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/newsroom.html');
    await shot(page, '00-login-desktop.png', { role:'unauthenticated', surface:'login' });

    await signIn(page, 'reporter');
    await captureNav(page, 'reporter');
    await shot(page, '01-reporter-overview-desktop.png', { role:'reporter', surface:'overview' });

    await openModule(page, 'my-assignments');
    await shot(page, '02-reporter-my-assignments-desktop.png', { role:'reporter', surface:'my-assignments' });

    await openModule(page, 'my-stories');
    await shot(page, '03-reporter-my-stories-desktop.png', { role:'reporter', surface:'my-stories' });

    const open = page.locator('[data-workspace] [data-open-story]').first();
    if (await open.count()) {
      await open.click();
      await expect(page.locator('[data-story-modal]')).toBeVisible();
      await shot(page, '04-reporter-story-editor-desktop.png', { role:'reporter', surface:'story-editor' });
      await page.locator('[data-editor-comments]').scrollIntoViewIfNeeded();
      await shot(page, '04b-reporter-internal-comments-desktop.png', { role:'reporter', surface:'internal-comments' });
      await page.locator('[data-story-modal-title]').scrollIntoViewIfNeeded();
      await page.setViewportSize({ width: 834, height: 1112 });
      await shot(page, '05-reporter-story-editor-tablet.png', { role:'reporter', surface:'story-editor-tablet' });
      await page.locator('[data-story-modal-close]').click();
    } else {
      record({ role:'reporter', type:'evidence-gap', surface:'story-editor', reason:'No reporter-owned certification story available after live security fixture.' });
    }

    await page.setViewportSize({ width: 1440, height: 1000 });
    await openModule(page, 'inbox');
    await shot(page, '06-reporter-inbox-desktop.png', { role:'reporter', surface:'inbox' });
    await openModule(page, 'desks');
    await shot(page, '07-reporter-desks-desktop.png', { role:'reporter', surface:'desks' });
    await openModule(page, 'overview');
    await page.setViewportSize({ width: 834, height: 1112 });
    await shot(page, '08-reporter-overview-tablet.png', { role:'reporter', surface:'overview-tablet' });
  });

  test('Editor-in-Chief journey evidence', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await signIn(page, 'editor');
    await captureNav(page, 'editor');
    await shot(page, '10-editor-overview-desktop.png', { role:'editor', surface:'overview' });

    await openModule(page, 'review');
    await shot(page, '11-editor-review-queue-desktop.png', { role:'editor', surface:'review' });

    await openModule(page, 'assignments');
    await shot(page, '12-editor-assignments-desktop.png', { role:'editor', surface:'assignments' });

    await openModule(page, 'media');
    await shot(page, '13-editor-media-desktop.png', { role:'editor', surface:'media' });

    await openModule(page, 'stories');
    const open = page.locator('[data-workspace] [data-open-story]').first();
    if (await open.count()) {
      await open.click();
      await expect(page.locator('[data-story-modal]')).toBeVisible();
      await shot(page, '14-editor-story-editor-desktop.png', { role:'editor', surface:'story-editor' });
      await page.setViewportSize({ width: 834, height: 1112 });
      await shot(page, '14b-editor-story-editor-tablet.png', { role:'editor', surface:'story-editor-tablet' });
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.locator('[data-story-modal-close]').click();
    }

    await openModule(page, 'review');
    await page.setViewportSize({ width: 834, height: 1112 });
    await shot(page, '15-editor-review-queue-tablet.png', { role:'editor', surface:'review-tablet' });
  });

  test('Publisher / Owner governance and oversight evidence', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await signIn(page, 'publisher');
    await captureNav(page, 'publisher');
    await shot(page, '20-publisher-overview-desktop.png', { role:'publisher', surface:'overview' });

    for (const [id,name] of [
      ['staff','21-publisher-staff-access-desktop.png'],
      ['security','22-publisher-security-desktop.png'],
      ['audit','23-publisher-audit-desktop.png'],
      ['premium','24-publisher-premium-desktop.png'],
      ['analytics','25-publisher-analytics-desktop.png'],
      ['settings','26-publisher-settings-desktop.png']
    ]) {
      await openModule(page, id);
      await shot(page, name, { role:'publisher', surface:id });
    }

    await openModule(page, 'staff');
    await page.setViewportSize({ width: 834, height: 1112 });
    await shot(page, '27-publisher-staff-access-tablet.png', { role:'publisher', surface:'staff-tablet' });
  });

  test('Commercial Manager separation evidence', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await signIn(page, 'commercial');
    await captureNav(page, 'commercial');
    await shot(page, '30-commercial-overview-desktop.png', { role:'commercial', surface:'overview' });

    await openModule(page, 'advertising');
    await shot(page, '31-commercial-advertising-desktop.png', { role:'commercial', surface:'advertising' });

    await openModule(page, 'subscribers');
    await shot(page, '32-commercial-subscribers-desktop.png', { role:'commercial', surface:'subscribers' });

    await openModule(page, 'advertising');
    await page.setViewportSize({ width: 834, height: 1112 });
    await shot(page, '33-commercial-advertising-tablet.png', { role:'commercial', surface:'advertising-tablet' });

    expect(await page.locator('[data-newsroom-nav] [data-module="stories"]').count()).toBe(0);
    expect(await page.locator('[data-newsroom-nav] [data-module="review"]').count()).toBe(0);
  });
});
