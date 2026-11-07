import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const PREVIEW_URL = 'https://healthtimes-staging-czazp4yi8-11-11.vercel.app';
const bypassPath = path.join(os.homedir(), '.healthtimes-secrets', 'vercel-bypass');
const bypassToken = fs.existsSync(bypassPath) ? fs.readFileSync(bypassPath, 'utf8').trim() : '';

const OUT_DIR = path.resolve('docs/delivery/evidence/HT-MVP-UIAT-01-R2/screenshots');

function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function parseRgb(colorStr) {
  if (!colorStr) return null;
  const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (match) {
    return {
      r: parseInt(match[1], 10),
      g: parseInt(match[2], 10),
      b: parseInt(match[3], 10),
      a: match[4] !== undefined ? parseFloat(match[4]) : 1.0
    };
  }
  return null;
}

function calculateContrast(fgStr, bgStr) {
  const fg = parseRgb(fgStr);
  const bg = parseRgb(bgStr);
  if (!fg || !bg) return { ratio: 0, text: 'unknown' };
  const l1 = getLuminance(fg.r, fg.g, fg.b);
  const l2 = getLuminance(bg.r, bg.g, bg.b);
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  return {
    ratio: Math.round(ratio * 100) / 100,
    fg,
    bg
  };
}

async function inspectPageText(page, label) {
  const data = await page.evaluate(() => {
    const nodes = document.querySelectorAll('h1, h2, h3, p, a, div[dir="auto"], span');
    const items = [];
    for (const el of Array.from(nodes)) {
      const text = el.innerText?.trim();
      if (!text || text.length < 2 || text.length > 70) continue;
      // Skip if contains newlines
      if (text.includes('\n')) continue;
      const style = window.getComputedStyle(el);
      let parent = el.parentElement;
      let bg = style.backgroundColor;
      while (parent && (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent')) {
        bg = window.getComputedStyle(parent).backgroundColor;
        parent = parent.parentElement;
      }
      if (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') {
        bg = 'rgb(255, 255, 255)';
      }
      items.push({
        text,
        color: style.color,
        bg,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight
      });
    }
    return items;
  });

  const analyzed = [];
  const seenTexts = new Set();
  for (const item of data) {
    if (seenTexts.has(item.text)) continue;
    seenTexts.add(item.text);
    const contrast = calculateContrast(item.color, item.bg);
    analyzed.push({
      ...item,
      contrast: contrast.ratio,
      passAA: contrast.ratio >= 4.5,
      passAALarge: contrast.ratio >= 3.0
    });
  }
  return analyzed;
}

async function run() {
  const browser = await chromium.launch({ headless: true });

  const testRuns = [
    { name: 'light-system', colorScheme: 'light', vp: { width: 1440, height: 900 } },
    { name: 'dark-system', colorScheme: 'dark', vp: { width: 1440, height: 900 } },
    { name: 'phone-light', colorScheme: 'light', vp: { width: 375, height: 667 } },
    { name: 'phone-dark', colorScheme: 'dark', vp: { width: 375, height: 667 } },
    { name: 'tablet-light', colorScheme: 'light', vp: { width: 768, height: 1024 } }
  ];

  const fullReport = {};

  for (const runCfg of testRuns) {
    console.log(`\n=== Running: ${runCfg.name} ===`);
    const context = await browser.newContext({
      viewport: runCfg.vp,
      colorScheme: runCfg.colorScheme,
      extraHTTPHeaders: bypassToken ? { 'x-vercel-protection-bypass': bypassToken } : {}
    });

    const page = await context.newPage();

    // 1. Load Homepage
    await page.goto(PREVIEW_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const homeShot = path.join(OUT_DIR, `DEF013-${runCfg.name}-home.jpg`);
    await page.screenshot({ path: homeShot, quality: 80 });

    const homeItems = await inspectPageText(page, 'home');
    const lowContrastHome = homeItems.filter(i => !i.passAA);
    console.log(`Home low contrast items (<4.5:1) count: ${lowContrastHome.length} / ${homeItems.length}`);
    if (lowContrastHome.length > 0) {
      console.log('Sample low contrast on Home:', lowContrastHome.slice(0, 5));
    }

    // 2. Open /appearance and toggle
    await page.goto(`${PREVIEW_URL}/appearance`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    
    // Check buttons: System, Light, Dark
    const lightBtn = page.getByRole('button', { name: 'Light', exact: true });
    const darkBtn = page.getByRole('button', { name: 'Dark', exact: true });

    if (await lightBtn.isVisible()) {
      console.log('Clicking Light theme button...');
      await lightBtn.click();
      await page.waitForTimeout(1000);
      const afterLightShot = path.join(OUT_DIR, `DEF013-${runCfg.name}-explicit-light.jpg`);
      await page.screenshot({ path: afterLightShot, quality: 80 });
      
      // Navigate to Home in explicit Light mode
      await page.goto(PREVIEW_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);
      const homeExplicitLightShot = path.join(OUT_DIR, `DEF013-${runCfg.name}-home-after-light-toggle.jpg`);
      await page.screenshot({ path: homeExplicitLightShot, quality: 80 });

      const explicitLightItems = await inspectPageText(page, 'home-explicit-light');
      const lowExplicit = explicitLightItems.filter(i => !i.passAA);
      console.log(`Home explicit light low contrast: ${lowExplicit.length} / ${explicitLightItems.length}`);
      if (lowExplicit.length > 0) {
        console.log('Low contrast samples under explicit light:', lowExplicit.slice(0, 8));
      }

      // Check article page under explicit light
      await page.goto(`${PREVIEW_URL}/article/uat04b-test-story-001`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);
      const articleShot = path.join(OUT_DIR, `DEF013-${runCfg.name}-article-light.jpg`);
      await page.screenshot({ path: articleShot, quality: 80 });
      const articleItems = await inspectPageText(page, 'article-light');
      const lowArticle = articleItems.filter(i => !i.passAA);
      console.log(`Article low contrast: ${lowArticle.length} / ${articleItems.length}`);
      if (lowArticle.length > 0) {
        console.log('Article low contrast samples:', lowArticle.slice(0, 5));
      }

      // Check premium page
      await page.goto(`${PREVIEW_URL}/premium`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);
      const premiumShot = path.join(OUT_DIR, `DEF013-${runCfg.name}-premium-light.jpg`);
      await page.screenshot({ path: premiumShot, quality: 80 });
    }

    // Now test Dark button
    await page.goto(`${PREVIEW_URL}/appearance`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    if (await darkBtn.isVisible()) {
      console.log('Clicking Dark theme button...');
      await darkBtn.click();
      await page.waitForTimeout(1000);
      const darkShot = path.join(OUT_DIR, `DEF013-${runCfg.name}-explicit-dark.jpg`);
      await page.screenshot({ path: darkShot, quality: 80 });

      // Navigate to Home in explicit Dark mode
      await page.goto(PREVIEW_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);
      const homeDarkShot = path.join(OUT_DIR, `DEF013-${runCfg.name}-home-after-dark-toggle.jpg`);
      await page.screenshot({ path: homeDarkShot, quality: 80 });

      const darkItems = await inspectPageText(page, 'home-explicit-dark');
      const lowDark = darkItems.filter(i => !i.passAA);
      console.log(`Home explicit dark low contrast: ${lowDark.length} / ${darkItems.length}`);
      if (lowDark.length > 0) {
        console.log('Low contrast samples under explicit dark:', lowDark.slice(0, 5));
      }
    }

    fullReport[runCfg.name] = {
      homeLowContrast: lowContrastHome
    };

    await context.close();
  }

  fs.writeFileSync('docs/delivery/evidence/HT-MVP-UIAT-01-R2/records/DEF013-full-matrix.json', JSON.stringify(fullReport, null, 2));
  console.log('\nFull matrix completed. Saved records/DEF013-full-matrix.json');
  await browser.close();
}

run().catch(console.error);
