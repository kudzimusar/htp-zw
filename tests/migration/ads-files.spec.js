const { test, expect } = require('@playwright/test');

const adsLine = 'google.com, pub-8744434739998394, DIRECT, f08c47fec0942fa0';

test('ads.txt preserves confirmed HealthTimes AdSense seller identity', async ({ request }) => {
  const response = await request.get('/ads.txt');
  expect(response.status()).toBe(200);
  expect((await response.text()).trim()).toBe(adsLine);
});

test('app-ads.txt is present for future app monetization', async ({ request }) => {
  const response = await request.get('/app-ads.txt');
  expect(response.status()).toBe(200);
  expect((await response.text()).trim()).toBe(adsLine);
});
