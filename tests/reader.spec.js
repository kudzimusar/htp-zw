const { test, expect } = require('@playwright/test');

async function stubSpeech(page) {
  await page.addInitScript(() => {
    class FakeUtterance {
      constructor(text) {
        this.text = text;
        this.rate = 1;
        this.pitch = 1;
        this.volume = 1;
        this.lang = 'en-GB';
        this.voice = null;
        this.onend = null;
        this.onerror = null;
      }
    }
    const synth = {
      speaking: false,
      paused: false,
      _utterance: null,
      getVoices: () => [
        { name: 'eSpeak English', lang: 'en-GB', localService: true },
        { name: 'Microsoft Sonia Online (Natural)', lang: 'en-GB', localService: false },
        { name: 'Generic English', lang: 'en-US', localService: true }
      ],
      speak(utterance) { this._utterance = utterance; this.speaking = true; this.paused = false; },
      cancel() { this.speaking = false; this.paused = false; this._utterance = null; },
      pause() { this.paused = true; this.speaking = false; },
      resume() { this.paused = false; this.speaking = true; }
    };
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: FakeUtterance });
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: synth });
  });
}

test('article uses one compact speaker icon for play pause and resume', async ({ page }) => {
  await stubSpeech(page);
  await page.setViewportSize({ width: 430, height: 932 });
  await page.goto('/article.html?id=natpharm-supply-chain');

  const listen = page.locator('.article-rail [data-reader-toggle]');
  await expect(listen).toBeVisible();
  await expect(page.locator('[data-news-reader]')).toHaveCount(0);
  await expect(page.locator('[data-reader-rate]')).toHaveCount(0);
  await expect(listen).toHaveAttribute('aria-label', 'Listen to this story');

  await listen.click();
  await expect(listen).toHaveAttribute('aria-label', 'Pause article audio');
  await expect(listen).toHaveClass(/is-speaking/);
  expect(await page.evaluate(() => window.speechSynthesis.speaking)).toBe(true);

  const selectedVoice = await page.evaluate(() => window.speechSynthesis._utterance?.voice?.name);
  expect(selectedVoice).toBe('Microsoft Sonia Online (Natural)');

  await listen.click();
  await expect(listen).toHaveAttribute('aria-label', 'Resume article audio');
  expect(await page.evaluate(() => window.speechSynthesis.paused)).toBe(true);

  await listen.click();
  await expect(listen).toHaveAttribute('aria-label', 'Pause article audio');
  expect(await page.evaluate(() => window.speechSynthesis.speaking)).toBe(true);
});

test('expired Premium story cannot be narrated past the paywall', async ({ page }) => {
  await stubSpeech(page);
  await page.setViewportSize({ width: 430, height: 932 });
  await page.addInitScript(() => {
    localStorage.setItem('htpGuestIdV21', JSON.stringify('listen-premium-guest'));
    localStorage.setItem('htpPremiumPreviewV21:listen-premium-guest:healthcare-provision-programme', JSON.stringify(Date.now() - 31000));
  });
  await page.goto('/article.html?id=healthcare-provision-programme');

  await expect(page.locator('.article-body')).toHaveClass(/v21-premium-locked/);
  const listen = page.locator('.article-rail [data-reader-toggle]');
  const subscribe = page.locator('[data-sheet="subscribe"]');
  await expect(listen).toBeVisible();
  await expect(listen).toHaveAttribute('aria-label', /Premium preview ended/);
  expect(await page.evaluate(() => window.speechSynthesis.speaking)).toBe(false);

  // Expiry correctly auto-opens the membership sheet. Close it first so the
  // locked audio control itself can be exercised rather than clicking behind it.
  await expect(subscribe).toBeVisible();
  await subscribe.getByRole('button', { name: 'Not now' }).click();
  await expect(subscribe).toBeHidden();

  await listen.click();
  expect(await page.evaluate(() => window.speechSynthesis.speaking)).toBe(false);
  await expect(subscribe).toBeVisible();
});

test('Premium lock cancels narration when preview expires during listening', async ({ page }) => {
  await stubSpeech(page);
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.addInitScript(() => {
    localStorage.setItem('htpGuestIdV21', JSON.stringify('listen-boundary-guest'));
    localStorage.setItem('htpPremiumPreviewV21:listen-boundary-guest:healthcare-provision-programme', JSON.stringify(Date.now() - 9000));
  });
  await page.goto('/article.html?id=healthcare-provision-programme');

  const listen = page.locator('.article-rail [data-reader-toggle]');
  await listen.click();
  expect(await page.evaluate(() => window.speechSynthesis.speaking)).toBe(true);

  await page.locator('.article-body').evaluate(el => el.classList.add('v21-premium-locked'));
  await page.locator('.gated-blur').evaluate(el => el.classList.add('is-locked'));
  await expect(listen).toHaveAttribute('aria-label', /Premium preview ended/);
  expect(await page.evaluate(() => window.speechSynthesis.speaking)).toBe(false);
});
