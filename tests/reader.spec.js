const { test, expect } = require('@playwright/test');

async function stubSpeech(page) {
  await page.addInitScript(() => {
    class FakeUtterance {
      constructor(text) { this.text = text; this.rate = 1; this.lang = 'en-GB'; this.voice = null; this.onend = null; this.onerror = null; }
    }
    const synth = {
      speaking: false,
      paused: false,
      _utterance: null,
      getVoices: () => [{ name: 'HealthTimes Test Voice', lang: 'en-GB' }],
      speak(utterance) { this._utterance = utterance; this.speaking = true; },
      cancel() { this.speaking = false; this.paused = false; this._utterance = null; },
      pause() { this.paused = true; this.speaking = false; },
      resume() { this.paused = false; this.speaking = true; }
    };
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: FakeUtterance });
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: synth });
  });
}

test('article exposes a compact Listen player with speed controls', async ({ page }) => {
  await stubSpeech(page);
  await page.setViewportSize({ width: 430, height: 932 });
  await page.goto('/article.html?id=natpharm-supply-chain');

  const player = page.locator('[data-news-reader]');
  await expect(player).toBeVisible();
  await expect(player).toContainText('Listen to this story');
  await expect(player.locator('[data-reader-rate]')).toBeVisible();
  await expect(player.locator('[data-reader-toggle]')).toContainText('Listen');

  await player.locator('[data-reader-toggle]').click();
  await expect(player.locator('[data-reader-status]')).toContainText('Listening');
  await expect(player.locator('[data-reader-toggle]')).toContainText('Pause');

  await player.locator('[data-reader-rate]').selectOption('1.25');
  expect(await page.evaluate(() => localStorage.getItem('htpNewsReaderRate'))).toBe('1.25');
});

test('expired Premium story cannot be narrated past the paywall', async ({ page }) => {
  await stubSpeech(page);
  await page.setViewportSize({ width: 430, height: 932 });
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('htpGuestIdV21', JSON.stringify('listen-premium-guest'));
    localStorage.setItem('htpPremiumPreviewV21:listen-premium-guest:healthcare-provision-programme', JSON.stringify(Date.now() - 31000));
  });
  await page.goto('/article.html?id=healthcare-provision-programme');

  await expect(page.locator('.article-body')).toHaveClass(/v21-premium-locked/);
  const player = page.locator('[data-news-reader]');
  await expect(player).toBeVisible();
  await expect(player.locator('[data-reader-status]')).toContainText('Premium preview ended');
  await expect(player.locator('[data-reader-subscribe]')).toBeVisible();
  const speaking = await page.evaluate(() => window.speechSynthesis.speaking);
  expect(speaking).toBe(false);
});

test('Premium lock cancels narration when preview expires during listening', async ({ page }) => {
  await stubSpeech(page);
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('htpGuestIdV21', JSON.stringify('listen-boundary-guest'));
    localStorage.setItem('htpPremiumPreviewV21:listen-boundary-guest:healthcare-provision-programme', JSON.stringify(Date.now() - 9000));
  });
  await page.goto('/article.html?id=healthcare-provision-programme');
  const player = page.locator('[data-news-reader]');
  await player.locator('[data-reader-toggle]').click();
  expect(await page.evaluate(() => window.speechSynthesis.speaking)).toBe(true);

  await page.locator('.article-body').evaluate(el => el.classList.add('v21-premium-locked'));
  await page.locator('.gated-blur').evaluate(el => el.classList.add('is-locked'));
  await expect(player.locator('[data-reader-status]')).toContainText('Premium preview ended');
  expect(await page.evaluate(() => window.speechSynthesis.speaking)).toBe(false);
});
