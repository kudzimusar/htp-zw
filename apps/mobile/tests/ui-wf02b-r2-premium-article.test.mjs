import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");

test("UI-WF-02B R2 PremiumPaywall aligns to the 760px Article column and uses publication-quality continuation copy", () => {
  const paywall = read("src/ui/PremiumPaywall.tsx");
  assert.match(paywall, /maxWidth:\s*layout\.articleMax/);
  assert.match(paywall, /backgroundColor:\s*palette\.paperMuted/);
  assert.match(paywall, /borderTopColor:\s*palette\.premium/);
  assert.match(paywall, /HEALTHTIMES PREMIUM/);
  assert.match(paywall, /MEMBER JOURNALISM/);
  assert.match(paywall, /Continue reading with HealthTimes Premium/);
  assert.match(paywall, /Go to HealthTimes Premium/);
  assert.match(paywall, /Sign in as an existing member/);
  assert.match(paywall, /actionFocused:\s*\{\s*borderWidth:\s*2\s*\}/);
  assert.doesNotMatch(paywall, /owner-policy|protected payload|entitlement authority|configuration-required|source parity/i);
  assert.doesNotMatch(paywall, /US\$|USD|ZWL|Most Popular|Best Value|discount|free trial/i);
});

test("UI-WF-02B R2 PremiumSubscriptionPrompt preserves phone bottom-sheet and tablet/desktop modal semantics with dark-mode accents", () => {
  const prompt = read("src/ui/PremiumSubscriptionPrompt.tsx");
  assert.match(prompt, /borderTopColor:\s*palette\.premium/);
  assert.match(prompt, /sheetHandle/);
  assert.match(prompt, /phone \? styles\.backdropPhone : styles\.backdropCentered/);
  assert.match(prompt, /maxWidth:\s*600/);
  assert.match(prompt, /maxHeight:\s*"88%"/);
  assert.match(prompt, /commerceAvailable \? "Become Premium" : "Explore Premium"/);
  assert.match(prompt, /Member sign in/);
  assert.match(prompt, /Not now/);
  assert.match(prompt, /actionFocused:\s*\{\s*borderWidth:\s*2\s*\}/);
  assert.doesNotMatch(prompt, /owner-policy|protected payload|entitlement authority|configuration-required|source parity/i);
  assert.doesNotMatch(prompt, /US\$|USD|ZWL|Most Popular|Best Value|discount|free trial/i);
});

test("UI-WF-02B R2 evidence script captures initial, warning, prompt, and expired paywall states with visible-node locators", () => {
  const evidence = read("tests/ui03-commercial-reader-evidence.mjs");
  assert.match(evidence, /premium-preview-initial\.png/);
  assert.match(evidence, /premium-preview-warning\.png/);
  assert.match(evidence, /premium-subscription-prompt\.png/);
  assert.match(evidence, /premium-paywall-expired\.png/);
  assert.match(evidence, /public-article-regression\.png/);
  assert.match(evidence, /\[data-testid="premium-teaser-paragraph"\]:visible/);
  assert.match(evidence, /\[data-testid="premium-preview-notice"\]:visible/);
  assert.match(evidence, /\[data-testid="premium-subscription-prompt"\]:visible/);
  assert.match(evidence, /Your Premium preview is ending soon/);
});
