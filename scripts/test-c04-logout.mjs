import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const PREVIEW_URL = 'https://healthtimes-staging-czazp4yi8-11-11.vercel.app';
const OUT_DIR = '/Users/shadreckmusarurwa/Project AI/htp-zw/docs/delivery/evidence/HT-MVP-UIAT-01-R2/screenshots';
const OUT_RECORD = '/Users/shadreckmusarurwa/Project AI/htp-zw/docs/delivery/evidence/HT-MVP-UIAT-01-R2/records/remaining-cases-report.json';

const bypassToken = fs.readFileSync(path.join(process.env.HOME, '.healthtimes-secrets', 'vercel-bypass'), 'utf8').trim();
const testActors = JSON.parse(fs.readFileSync(path.join(process.env.HOME, '.healthtimes-secrets', 'test-actors.json'), 'utf8'));
const commercial = testActors['uat-commercial@healthtimes.test'];

async function run() {
  const browser = await chromium.launch({ headless: true });
  const commContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    extraHTTPHeaders: bypassToken ? { 'x-vercel-protection-bypass': bypassToken } : {}
  });
  const page = await commContext.newPage();

  console.log('\n--- Authenticating as uat-commercial@healthtimes.test for UAT-C04 ---');
  await page.goto(`${PREVIEW_URL}/account-access`, { waitUntil: 'networkidle' });
  await page.getByPlaceholder('Email address').fill(commercial.email);
  await page.getByPlaceholder('Password').fill(commercial.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).last().click();
  await page.waitForURL(url => url.pathname.includes('/studio'), { timeout: 15000 });
  await page.waitForTimeout(1500);

  // Click the caret icon or user avatar to open Account Menu Popover
  console.log('Opening Account Menu Popover via caret/avatar...');
  const avatarOrCaret = page.getByText('▾').first();
  await avatarOrCaret.click();
  await page.waitForTimeout(500);

  const popoverShot = path.join(OUT_DIR, 'C04-account-menu-popover.jpg');
  await page.screenshot({ path: popoverShot, quality: 80 });

  // Look for Sign Out in popover
  const signOutBtn = page.getByText('Sign Out').first();
  const signOutVisible = await signOutBtn.isVisible();
  console.log(`Sign Out visible in popover: ${signOutVisible}`);

  let loggedOut = false;
  let urlAfterLogout = null;

  if (signOutVisible) {
    await signOutBtn.click();
    await page.waitForTimeout(2000);
    urlAfterLogout = page.url();
    console.log(`URL after Sign Out: ${urlAfterLogout}`);
    loggedOut = !urlAfterLogout.includes('/studio');

    const afterLogoutShot = path.join(OUT_DIR, 'C04-commercial-after-logout-r2.jpg');
    await page.screenshot({ path: afterLogoutShot, quality: 80 });
  }

  // Update existing remaining-cases-report.json
  const existingReport = JSON.parse(fs.readFileSync(OUT_RECORD, 'utf8'));
  existingReport.UAT_C04 = {
    signOutVisible,
    urlAfterLogout,
    loggedOut,
    result: loggedOut ? 'PASS' : 'FAIL'
  };

  fs.writeFileSync(OUT_RECORD, JSON.stringify(existingReport, null, 2));
  console.log('Updated remaining-cases-report.json with UAT_C04:', existingReport.UAT_C04);

  await commContext.close();
  await browser.close();
}

run().catch(console.error);
