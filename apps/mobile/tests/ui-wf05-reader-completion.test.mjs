import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

test("Screen 11 (Premium): enforces editorial value proposition, benefits, and fails closed without fabricated prices", () => {
  const premium = read("app/premium.tsx");

  assert.match(premium, /HEALTHTIMES PREMIUM/);
  assert.match(premium, /Deeper reporting for readers who want the full health story/);
  assert.match(premium, /testID="premium-member-access-card"/);
  assert.match(premium, /title="From HealthTimes Premium"/);
  assert.match(premium, /title="Premium benefits"/);
  assert.match(premium, /services\.premiumStore\.getState\(\)/);
  assert.match(premium, /services\.premiumCommerce\.getAuthority\(\)/);
  assert.match(premium, /services\.premium\.hasEntitlement\(\)/);
  assert.match(premium, /restorePurchases/);

  // Must not contain fabricated illustrative pricing or marketing tropes
  assert.doesNotMatch(premium, /\$4\.99|\$9\.99|7-day trial|20% OFF|MOST POPULAR/i);
});

test("Screen 12 (Advertising): respects sensitive health context, zero-space unfulfilled inventory, and verified destinations", () => {
  const cards = read("src/ui/Cards.tsx");
  const models = read("src/domain/models.ts");
  const corpus = read("src/services/migrated-corpus.ts");

  assert.match(cards, /export function AdSlot/);
  assert.match(cards, /sensitiveHealthContext = true/);
  assert.match(cards, /if\(!adDecision \|\| adDecision\.source === "none" \|\| !adDecision\.creativeUrl\) return null;/);
  assert.match(cards, /ad_impression/);
  assert.match(cards, /ad_click/);
  assert.match(cards, /\/\^https:\\\/\\\//i);

  assert.match(models, /"hospaz-header-direct"/);
  assert.match(corpus, /hospaz-header-direct/);
});

test("Screen 13 (Notifications & Settings): category filtering, read/unread states, and persistent reader choice", () => {
  const notifs = read("app/notifications.tsx");
  const settings = read("app/notification-settings.tsx");

  assert.match(notifs, /title="Notifications"/);
  for (const cat of ["breaking", "live", "topic", "premium", "system"]) {
    assert.match(notifs, new RegExp(cat));
  }
  assert.match(notifs, /new Date\(item\.createdAt\)\.toLocaleString\(\)/);
  assert.match(notifs, /No notifications/);

  assert.match(settings, /title="Notification Settings"/);
  assert.match(settings, /getNotificationPreferences/);
  assert.match(settings, /saveNotificationPreferences/);
  assert.match(settings, /Enable native push/);
  assert.match(settings, /AG-06 supplies a server registration and revocation endpoint/);
});

test("Screen 14 (Social & Deep Link): canonical attributed URLs, host validation, and deep-link parsing", () => {
  const deepLinks = read("src/growth/deepLinks.ts");
  const layout = read("app/_layout.tsx");

  assert.match(deepLinks, /new Set\(\["healthtimes\.co\.zw", "www\.healthtimes\.co\.zw"\]\)/);
  assert.match(deepLinks, /export function canonicalArticleUrl/);
  assert.match(deepLinks, /export function attributedShareUrl/);
  assert.match(deepLinks, /utm_source/);
  assert.match(deepLinks, /utm_medium/);
  assert.match(deepLinks, /export function parseHealthTimesDeepLink/);
  assert.match(deepLinks, /export function parseSocialReferral/);

  assert.match(layout, /DeepLinkBridge/);
  assert.match(layout, /Linking\.getInitialURL/);
  assert.match(layout, /Linking\.addEventListener\("url"/);
});

test("Screen 15 (Analytics & Safety Boundary): prohibits sensitive health attributes and exposes real diagnostic status", () => {
  const events = read("src/growth/events.ts");
  const growth = read("app/growth-status.tsx");
  const system = read("app/system-status.tsx");

  for (const frag of [
    "diagnosis",
    "disease",
    "condition",
    "medication",
    "prescription",
    "symptom",
    "patient",
    "medical_record",
    "health_profile"
  ]) {
    assert.match(events, new RegExp(frag));
  }
  assert.match(events, /Sensitive health attribute .* is prohibited from public analytics payloads/);

  assert.match(growth, /title="Growth & Commercial Readiness"/);
  assert.match(growth, /VERIFIED WEB CONTINUITY/);
  assert.match(growth, /NATIVE ACTIVATION GATES/);

  assert.match(system, /title="System Status"/);
  assert.match(system, /APP ENVIRONMENT/);
  assert.match(system, /EDITORIAL DATA/);
});

test("Screen 18 (Onboarding): clean entry experience with minimal chrome, step sequence, and preference persistence", () => {
  const onboarding = read("app/onboarding.tsx");

  assert.match(onboarding, /Page chrome=\{false\}/);
  assert.match(onboarding, /GLOBAL HEALTH JOURNALISM/);
  assert.match(onboarding, /Welcome to HealthTimes/);
  assert.match(onboarding, /Select your edition/);
  assert.match(onboarding, /Choose interests/);
  assert.match(onboarding, /Notifications/);
  assert.match(onboarding, /Existing account\? Sign in/);
  assert.match(onboarding, /services\.reader\.savePreferences/);
  assert.match(onboarding, /services\.deviceSecurity\.saveNotificationPreferences/);
});

test("Cross-Product Journey 1 (Premium): full acquisition, paywall, commerce, entitlement, and member state", () => {
  const home = read("app/(reader)/index.tsx");
  const article = read("app/article/[id].tsx");
  const premium = read("app/premium.tsx");
  const my = read("app/(reader)/my.tsx");

  assert.match(home, /story\.accessPolicy==="premium"/);
  assert.match(home, /Premium Intelligence/);
  assert.match(home, /router\.push\("\/premium" as never\)/);
  assert.match(article, /story\.accessPolicy==="premium"/);
  assert.match(article, /services\.premium\.hasEntitlement/);
  assert.match(article, /setPremiumPromptVisible/);
  assert.match(article, /services\.premiumCommerce\.startCheckout/);
  assert.match(premium, /services\.premium\.hasEntitlement/);
  assert.match(my, /membership==="premium" \? "Premium member"/);
  assert.match(my, /path:"\/premium"/);
});

test("Cross-Product Journey 2 (Notification): settings change, persistence, and categorized notifications", () => {
  const my = read("app/(reader)/my.tsx");
  const settings = read("app/notification-settings.tsx");
  const notifs = read("app/notifications.tsx");

  assert.match(my, /path:"\/notifications"/);
  assert.match(my, /path:"\/notification-settings"/);
  assert.match(settings, /saveNotificationPreferences/);
  assert.match(notifs, /services\.notifications\.list/);
  assert.match(notifs, /item\.destination/);
});

test("Cross-Product Journey 3 (Share / Deep Link): canonical attributed URL generation and deep-link routing", () => {
  const article = read("app/article/[id].tsx");
  const deepLinks = read("src/growth/deepLinks.ts");
  const layout = read("app/_layout.tsx");

  assert.match(article, /services\.social\.buildAttributedShareUrl/);
  assert.match(deepLinks, /parseHealthTimesDeepLink/);
  assert.match(layout, /DeepLinkBridge/);
  assert.match(layout, /router\.push\(\("\/article\/" \+ encodeURIComponent\(destination\.articleId\)\) as never\)/);
});

test("Cross-Product Journey 4 (Advertising): inventory placements, direct HOSPAZ authority, and zero-space unfilled", () => {
  const home = read("app/(reader)/index.tsx");
  const article = read("app/article/[id].tsx");
  const watch = read("app/(reader)/watch.tsx");
  const live = read("app/(reader)/live.tsx");
  const cards = read("src/ui/Cards.tsx");

  assert.match(home, /AdSlot placement="hospaz-header-direct"/);
  assert.match(article, /AdSlot placement="article_after_intro"/);
  assert.match(article, /AdSlot placement="article_end"/);
  assert.match(watch, /AdSlot placement="watch_feed"/);
  assert.match(live, /AdSlot placement="live_feed"/);
  assert.match(cards, /if\(!adDecision \|\| adDecision\.source === "none" \|\| !adDecision\.creativeUrl\) return null;/);
});

test("Cross-Product Journey 5 (Onboarding): entry, step progression, preferences persistence, and Home entry", () => {
  const onboarding = read("app/onboarding.tsx");

  assert.match(onboarding, /router\.replace\("\/" as never\)/);
  assert.match(onboarding, /router\.push\("\/account-access" as never\)/);
  assert.match(onboarding, /services\.reader\.savePreferences/);
  assert.match(onboarding, /services\.deviceSecurity\.saveNotificationPreferences/);
});

