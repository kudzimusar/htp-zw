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

async function runInvestigation() {
  console.log('Launching browser to investigate DEF-013 (Theme and Contrast)...');
  const browser = await chromium.launch({ headless: true });
  
  const viewports = [
    { name: 'phone', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1440, height: 900 }
  ];

  const results = {};

  for (const vp of viewports) {
    console.log(`\n--- Testing Viewport: ${vp.name} (${vp.width}x${vp.height}) ---`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      extraHTTPHeaders: bypassToken ? { 'x-vercel-protection-bypass': bypassToken } : {}
    });

    const page = await context.newPage();

    // 1. Fresh load with no stored theme preference
    await page.goto(PREVIEW_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    const freshScreenshotPath = path.join(OUT_DIR, `DEF013-${vp.name}-fresh-load.jpg`);
    await page.screenshot({ path: freshScreenshotPath, quality: 80 });
    console.log(`Saved screenshot: ${freshScreenshotPath}`);

    // Inspect styles of text elements on the page
    const elementsReport = await page.evaluate(() => {
      const report = [];
      const selectors = [
        'h1', 'h2', 'h3',
        '[data-testid="home-hero-media"]',
        'nav',
        'header',
        'div[dir="auto"]'
      ];

      const allTextNodes = document.querySelectorAll('div[dir="auto"], span, p, h1, h2, h3, a');
      const sampled = [];

      for (const el of Array.from(allTextNodes).slice(0, 50)) {
        const text = el.innerText?.trim();
        if (!text || text.length < 3 || text.length > 80) continue;
        const style = window.getComputedStyle(el);
        let parent = el.parentElement;
        let bg = style.backgroundColor;
        while (parent && (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent')) {
          bg = window.getComputedStyle(parent).backgroundColor;
          parent = parent.parentElement;
        }
        if (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') {
          bg = 'rgb(255, 255, 255)'; // default fallback
        }
        sampled.push({
          text: text.slice(0, 50),
          tagName: el.tagName,
          color: style.color,
          backgroundColor: bg,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight
        });
      }
      return sampled;
    });

    // Check localStorage / theme state
    const storageState = await page.evaluate(() => {
      return {
        localStorage: { ...localStorage },
        cookies: document.cookie,
        bodyBg: window.getComputedStyle(document.body).backgroundColor,
        htmlBg: window.getComputedStyle(document.documentElement).backgroundColor
      };
    });

    console.log(`Storage & Body styles for ${vp.name}:`, JSON.stringify(storageState, null, 2));

    // Calculate contrast for sampled items
    const contrastSamples = elementsReport.slice(0, 15).map(item => {
      const contrast = calculateContrast(item.color, item.backgroundColor);
      return {
        ...item,
        contrastRatio: contrast.ratio,
        wcagNormalPass: contrast.ratio >= 4.5,
        wcagLargePass: contrast.ratio >= 3.0
      };
    });

    console.log(`Contrast samples for ${vp.name} (first 8):`);
    console.table(contrastSamples.slice(0, 8).map(s => ({
      text: s.text,
      color: s.color,
      bg: s.backgroundColor,
      ratio: s.contrastRatio,
      passAA: s.wcagNormalPass
    })));

    results[vp.name] = {
      storageState,
      contrastSamples
    };

    // 2. Explicit theme toggle / appearance check
    // Let's see if there is an appearance setting button or navigation item
    console.log('Checking navigation and theme toggle controls...');
    const buttons = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('div[role="button"], button, a')).map(b => ({
        text: b.innerText?.trim(),
        role: b.getAttribute('role'),
        href: b.getAttribute('href')
      })).filter(b => b.text || b.href);
    });
    console.log(`Found ${buttons.length} interactive controls on ${vp.name}`);

    await context.close();
  }

  // Next: Test explicitly navigating to appearance page or toggling theme
  console.log('\n--- Testing /appearance route directly ---');
  const contextTheme = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    extraHTTPHeaders: bypassToken ? { 'x-vercel-protection-bypass': bypassToken } : {}
  });
  const themePage = await contextTheme.newPage();
  await themePage.goto(`${PREVIEW_URL}/appearance`, { waitUntil: 'networkidle', timeout: 30000 });
  await themePage.waitForTimeout(2000);
  const appearanceScreenshot = path.join(OUT_DIR, 'DEF013-appearance-screen.jpg');
  await themePage.screenshot({ path: appearanceScreenshot, quality: 80 });
  console.log(`Saved appearance screen screenshot: ${appearanceScreenshot}`);

  const appearanceOptions = await themePage.evaluate(() => {
    return Array.from(document.querySelectorAll('div[role="button"], button, div[dir="auto"]')).map(el => ({
      text: el.innerText?.trim(),
      role: el.getAttribute('role'),
      tag: el.tagName
    })).filter(x => x.text && x.text.length < 50);
  });
  console.log('Appearance options:', appearanceOptions);

  await contextTheme.close();
  await browser.close();

  fs.writeFileSync('docs/delivery/evidence/HT-MVP-UIAT-01-R2/records/DEF013-theme-report.json', JSON.stringify(results, null, 2));
  console.log('Investigation finished. Report saved.');
}

runInvestigation().catch(console.error);
