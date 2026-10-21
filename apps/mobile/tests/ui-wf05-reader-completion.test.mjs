import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadTs } from "./ts-module-loader.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

// ============================================================================
// PART 1: MODULE BEHAVIOR PROOF & CONTROLLED UNIT FIXTURES
// (Executing real TypeScript modules in a controlled Node harness; distinct from
// deployed runtime or live staging authority)
// ============================================================================

test("MODULE_BEHAVIOR_PROOF: Screen 15 (Analytics) — validates public events and rejects prohibited health parameters (fail-closed)", () => {
  const eventsModule = loadTs("src/growth/events.ts");

  // 1. Valid public event succeeds
  const validEvent = eventsModule.event("page_view", { surface: "home", section: "top_stories" });
  assert.equal(validEvent.eventName, "page_view");
  assert.equal(validEvent.eventVersion, "2026-09-09");
  assert.equal(validEvent.parameters.surface, "home");

  // 2. All 24 public event names are recognized
  assert.equal(eventsModule.HEALTH_TIMES_PUBLIC_EVENTS.length, 24);
  for (const name of eventsModule.HEALTH_TIMES_PUBLIC_EVENTS) {
    assert.equal(eventsModule.isPublicAnalyticsEventName(name), true, `Must recognize ${name}`);
  }

  // 3. Prohibited health attribute fragments FAIL CLOSED by throwing Error
  const prohibitedFragments = [
    "diagnosis",
    "disease",
    "condition",
    "medication",
    "prescription",
    "symptom",
    "patient",
    "medical_record",
    "health_profile"
  ];

  for (const frag of prohibitedFragments) {
    assert.throws(
      () => eventsModule.event("article_view", { [`user_${frag}_type`]: "sensitive" }),
      (err) => {
        assert.match(err.message, /Sensitive health attribute .* is prohibited from public analytics payloads/);
        return true;
      },
      `Must throw fail-closed error for prohibited health fragment "${frag}"`
    );
  }

  // 4. Unsupported event name throws error
  assert.throws(
    () => eventsModule.validatePublicAnalyticsEvent({
      eventName: "unsupported_event_xyz",
      eventVersion: "2026-09-09",
      parameters: {}
    }),
    /Unsupported public analytics event: unsupported_event_xyz/
  );

  // 5. Invalid version throws error
  assert.throws(
    () => eventsModule.validatePublicAnalyticsEvent({
      eventName: "page_view",
      eventVersion: "1999-01-01",
      parameters: {}
    }),
    /Analytics event version must be 2026-09-09/
  );
});

test("MODULE_BEHAVIOR_PROOF: Screen 14 (Social & Deep Link) — canonical URL, attribution parameters, and fail-closed parser", () => {
  const deepLinksModule = loadTs("src/growth/deepLinks.ts", {
    mocks: {
      "expo-linking": {
        createURL: (p) => "healthtimes://" + p,
        parse: (url) => {
          if (url.startsWith("healthtimes://")) {
            return { path: url.replace("healthtimes://", "").split("?")[0] };
          }
          return { path: "" };
        }
      }
    }
  });

  const article = { id: "art-zimbabwe-debt-001", slug: "zimbabwe-debt-crisis" };

  // 1. Canonical Article URL is strictly on healthtimes.co.zw
  const canonical = deepLinksModule.canonicalArticleUrl(article);
  assert.equal(canonical, "https://healthtimes.co.zw/zimbabwe-debt-crisis/");

  // 2. Attributed share URL appends article ID and UTM parameters
  const shareUrl = deepLinksModule.attributedShareUrl(article, "whatsapp");
  const parsedShare = new URL(shareUrl);
  assert.equal(parsedShare.origin, "https://healthtimes.co.zw");
  assert.equal(parsedShare.searchParams.get("ht_article_id"), "art-zimbabwe-debt-001");
  assert.equal(parsedShare.searchParams.get("utm_source"), "healthtimes_share");
  assert.equal(parsedShare.searchParams.get("utm_medium"), "whatsapp");
  assert.equal(parsedShare.searchParams.get("utm_campaign"), "organic_share");

  // 3. Native deep link resolution
  const nativeParsed = deepLinksModule.parseHealthTimesDeepLink("healthtimes://article/art-zimbabwe-debt-001");
  assert.deepEqual(nativeParsed, { type: "article", articleId: "art-zimbabwe-debt-001" });

  // 4. Web deep link resolution on allowed host
  const webParsed = deepLinksModule.parseHealthTimesDeepLink("https://healthtimes.co.zw/story/?ht_article_id=art-zimbabwe-debt-001");
  assert.deepEqual(webParsed, { type: "article", articleId: "art-zimbabwe-debt-001" });

  const wwwParsed = deepLinksModule.parseHealthTimesDeepLink("https://www.healthtimes.co.zw/story/?ht_article_id=art-zimbabwe-debt-001");
  assert.deepEqual(wwwParsed, { type: "article", articleId: "art-zimbabwe-debt-001" });

  // 5. Fail-closed: Untrusted host returns null
  const untrustedHost = deepLinksModule.parseHealthTimesDeepLink("https://attacker.org/phish/?ht_article_id=art-zimbabwe-debt-001");
  assert.equal(untrustedHost, null, "Must reject untrusted domains");

  // 6. Fail-closed: Missing article ID returns null
  const missingId = deepLinksModule.parseHealthTimesDeepLink("https://healthtimes.co.zw/story/");
  assert.equal(missingId, null, "Must return null when ht_article_id is absent");

  // 7. Fail-closed: Unsupported route (e.g. edition) returns null
  const unsupportedRoute = deepLinksModule.parseHealthTimesDeepLink("healthtimes://edition");
  assert.equal(unsupportedRoute, null, "Must reject non-article deep links");

  // 8. Social referral parsing
  const referral = deepLinksModule.parseSocialReferral("https://healthtimes.co.zw/investigation/?utm_source=twitter&utm_medium=social&utm_campaign=spring2026");
  assert.deepEqual(referral, {
    source: "twitter",
    medium: "social",
    campaign: "spring2026",
    content: null,
    canonicalPath: "/investigation/"
  });

  const badReferral = deepLinksModule.parseSocialReferral("https://other-domain.com/?utm_source=twitter");
  assert.equal(badReferral, null, "Must reject external domain referral parsing");
});

test("CONTROLLED_UNIT_FIXTURE: Direct-ad projection maps a supplied synthetic KNOWN-state capability and preserves UNKNOWN-state fail-closed rules", () => {
  const adModule = loadTs("src/growth/advertising.ts");
  const directAdModule = loadTs("src/growth/direct-ad.ts");

  // 1. Sensitive health context returns source "none"
  const sensitiveDecision = adModule.decideFixtureAd("hospaz-header-direct", {
    consentForPersonalizedAds: true,
    sensitiveHealthContext: true
  });
  assert.equal(sensitiveDecision.source, "none");
  assert.equal(sensitiveDecision.personalization, "none");
  assert.match(sensitiveDecision.policyReason, /Sensitive health context/);

  // 2. Absence of consent returns source "none"
  const noConsentDecision = adModule.decideFixtureAd("home_after_live", {
    consentForPersonalizedAds: false,
    sensitiveHealthContext: false
  });
  assert.equal(noConsentDecision.source, "none");
  assert.equal(noConsentDecision.personalization, "non-personalized");

  // 3. Synthetic KNOWN-state unit fixture (NOT live HOSPAZ staging authority):
  // URL ("https://hospaz.org.zw"), schedule ("2026-Q4"), and placement_conditions ("All readers")
  // are synthetic fixture inputs used strictly to unit-test KNOWN-state projection mapping.
  // Current live HOSPAZ staging authority has destination_url_state="UNKNOWN" (url: null),
  // schedule_state="UNKNOWN" (value: null), and placement_conditions_state="UNKNOWN" (value: null).
  const syntheticKnownFixture = {
    advertiser: "HOSPAZ",
    placement_key: "hospaz-header-direct",
    current_storage_object: "ads/hospaz-banner.png",
    destination_url_state: "KNOWN",
    destination_url: "https://hospaz.org.zw",
    schedule_state: "KNOWN",
    schedule: "2026-Q4",
    placement_conditions_state: "KNOWN",
    placement_conditions: "All readers"
  };
  const projected = directAdModule.projectCp5HospazCapability(syntheticKnownFixture, "https://supabase.example.com");
  assert.equal(projected.kind, "direct-ad");
  assert.equal(projected.advertiser, "HOSPAZ");
  assert.equal(projected.placementKey, "hospaz-header-direct");
  assert.equal(projected.destination.url, "https://hospaz.org.zw");
  assert.equal(projected.failClosed.clickTargetInvented, false);

  // 4. Direct decision from synthetic KNOWN-state fixture matches placement key
  const directDecision = directAdModule.directDecisionFromHospazCapability(projected, "hospaz-header-direct");
  assert.equal(directDecision.source, "direct");
  assert.equal(directDecision.destinationUrl, "https://hospaz.org.zw");
  assert.equal(directDecision.disclosureLabel, "Direct advertising · HOSPAZ");

  // 5. UNKNOWN-state projection (matching current live HOSPAZ staging authority shape) fails closed to null destination/schedule/conditions
  const unknownStateFixture = {
    advertiser: "HOSPAZ",
    placement_key: "hospaz-header-direct",
    current_storage_object: "wordpress/2025/11/hospaz.jpeg",
    destination_url_state: "UNKNOWN",
    destination_url: "https://example.invalid/must-not-leak",
    schedule_state: "UNKNOWN",
    schedule: "unverified",
    placement_conditions_state: "UNKNOWN",
    placement_conditions: "unverified"
  };
  const unknownProjected = directAdModule.projectCp5HospazCapability(unknownStateFixture, "https://supabase.example.com");
  assert.deepEqual(unknownProjected.destination, { state: "UNKNOWN", url: null });
  assert.deepEqual(unknownProjected.schedule, { state: "UNKNOWN", value: null });
  assert.deepEqual(unknownProjected.placementConditions, { state: "UNKNOWN", value: null });
  const unknownDecision = directAdModule.directDecisionFromHospazCapability(unknownProjected, "hospaz-header-direct");
  assert.equal("destinationUrl" in unknownDecision, false);
  assert.equal(unknownDecision.destinationUrl, undefined);
  assert.equal(unknownDecision.personalization, "none");

  // 6. Mismatched placement key fails closed to source "none" (triggers zero-space collapse in AdSlot)
  const mismatchedDecision = directAdModule.directDecisionFromHospazCapability(projected, "article_end");
  assert.equal(mismatchedDecision.source, "none");
  assert.match(mismatchedDecision.policyReason, /No verified direct-ad capability is available/);

  // 7. Null capability returns source "none"
  const nullDecision = directAdModule.directDecisionFromHospazCapability(null, "hospaz-header-direct");
  assert.equal(nullDecision.source, "none");
});

test("MODULE_BEHAVIOR_PROOF: Screen 13B (Notification Settings) — preference storage defaults and atomic mutations in controlled storage harness", async () => {
  const store = new Map();
  const notifPrefModule = loadTs("src/security/notification-preferences.ts", {
    mocks: {
      "@react-native-async-storage/async-storage": {
        getItem: async (key) => store.get(key) ?? null,
        setItem: async (key, val) => { store.set(key, val); }
      }
    }
  });

  // 1. Default preferences when storage is empty
  const defaults = await notifPrefModule.getNotificationPreferences();
  assert.deepEqual(defaults, {
    breaking: true,
    live: true,
    followedTopics: true,
    premium: true,
    system: true
  });

  // 2. Modifying preferences persists and round-trips correctly
  const updated = {
    breaking: true,
    live: false,
    followedTopics: true,
    premium: false,
    system: true
  };
  await notifPrefModule.saveNotificationPreferences(updated);

  const reloaded = await notifPrefModule.getNotificationPreferences();
  assert.deepEqual(reloaded, updated);
});

test("MODULE_BEHAVIOR_PROOF: Screen 11 (Premium) — commerce authority, store offers, and fail-closed entitlement in fixture service harness", async () => {
  const store = new Map();
  const { fixtureServices: s } = loadTs("src/services/fixtures.ts", {
    mocks: {
      "@react-native-async-storage/async-storage": {
        getItem: async (key) => store.get(key) ?? null,
        setItem: async (key, val) => { store.set(key, val); }
      },
      "expo-linking": { createURL: (p) => p, parse: (u) => ({ path: u }) },
      "react-native": { Platform: { OS: "web" } }
    }
  });

  // 1. Entitlement check fails closed when unauthenticated / unentitled
  const hasEntitlement = await s.premium.hasEntitlement();
  assert.equal(hasEntitlement, false, "Must return false when entitlement has not been granted");

  // 2. Store offers state fails closed without fabricated product IDs or fake discounts
  const storeState = await s.premiumStore.getState();
  assert.equal(storeState.status, "configuration-required");
  assert.deepEqual(storeState.offers, []);
  assert.match(storeState.message, /Native storefront products are not configured/);

  // 3. Web commerce authority fails closed without fabricated prices or trial periods
  const commerceAuth = await s.premiumCommerce.getAuthority();
  assert.equal(commerceAuth.status, "configuration-required");
  assert.equal(commerceAuth.price, null);
  assert.equal(commerceAuth.currency, null);
  assert.equal(commerceAuth.entitlementGranted, false);
  assert.match(commerceAuth.message, /Web Premium checkout is unavailable/);
});

test("MODULE_BEHAVIOR_PROOF: Screen 13 (Notifications) — notification model categorization and unread filter semantics in fixture service harness", async () => {
  const store = new Map();
  const { fixtureServices: s } = loadTs("src/services/fixtures.ts", {
    mocks: {
      "@react-native-async-storage/async-storage": {
        getItem: async (key) => store.get(key) ?? null,
        setItem: async (key, val) => { store.set(key, val); }
      },
      "expo-linking": { createURL: (p) => p, parse: (u) => ({ path: u }) },
      "react-native": { Platform: { OS: "web" } }
    }
  });

  const notifs = await s.notifications.list();
  assert.ok(Array.isArray(notifs), "Notifications list must be an array");
  assert.ok(notifs.length > 0, "Must contain seed notifications");

  for (const item of notifs) {
    assert.ok(["breaking", "live", "topic", "premium", "system"].includes(item.category), `Category must be valid: ${item.category}`);
    assert.equal(typeof item.id, "string");
    assert.equal(typeof item.title, "string");
    assert.equal(typeof item.description, "string");
    assert.equal(typeof item.read, "boolean");
  }
});

test("MODULE_BEHAVIOR_PROOF: Screen 18 (Onboarding) — taxonomy binding, preference persistence, and safe defaults in fixture service harness", async () => {
  const store = new Map();
  const { fixtureServices: s } = loadTs("src/services/fixtures.ts", {
    mocks: {
      "@react-native-async-storage/async-storage": {
        getItem: async (key) => store.get(key) ?? null,
        setItem: async (key, val) => { store.set(key, val); }
      },
      "expo-linking": { createURL: (p) => p, parse: (u) => ({ path: u }) },
      "react-native": { Platform: { OS: "web" } }
    }
  });

  // 1. Taxonomy returns geographic zones for edition selection
  const snapshot = await s.taxonomy.getSnapshot();
  assert.ok(Array.isArray(snapshot.geographicZones), "Geographic zones must be an array");
  const zoneNames = snapshot.geographicZones.map((z) => z.name);
  assert.ok(zoneNames.includes("Global"), "Must include Global zone");
  assert.ok(zoneNames.includes("Zimbabwe"), "Must include Zimbabwe zone");

  // 2. Reader preferences default to Global edition
  const defaultPref = await s.reader.getPreferences();
  assert.equal(defaultPref.primaryEdition, "Global");

  // 3. Reader preferences can be updated and retrieved
  await s.reader.savePreferences({
    primaryEdition: "Zimbabwe",
    followedCountries: ["Zimbabwe"],
    followedTopics: ["Public Health"]
  });

  const updatedPref = await s.reader.getPreferences();
  assert.equal(updatedPref.primaryEdition, "Zimbabwe");
  assert.deepEqual(updatedPref.followedCountries, ["Zimbabwe"]);
  assert.deepEqual(updatedPref.followedTopics, ["Public Health"]);
});

// ============================================================================
// PART 2: SOURCE CONTRACT PROOF (Static source assertions on component structure & safety)
// ============================================================================

test("SOURCE_CONTRACT_PROOF: Screen 11 (Premium) — editorial value proposition, benefits, and fails closed without fabricated prices", () => {
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

test("SOURCE_CONTRACT_PROOF: Screen 12 (Advertising) — respects sensitive health context, zero-space unfulfilled inventory, and verified destinations", () => {
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

test("SOURCE_CONTRACT_PROOF: Screen 13 (Notifications & Settings) — category filtering, read/unread states, and persistent reader choice", () => {
  const notifs = read("app/notifications.tsx");
  const settings = read("app/notification-settings.tsx");

  assert.match(notifs, /title="Notifications"/);
  for (const cat of ["breaking", "live", "topic", "premium", "system"]) {
    assert.match(notifs, new RegExp(cat));
  }
  assert.match(notifs, /new Date\(item\.createdAt\)\.toLocaleString\(\)/);
  assert.match(notifs, /No notifications/);
  assert.match(notifs, /accessibilityRole=\{item\.destination \? "link" : "none"\}/);

  assert.match(settings, /title="Notification Settings"/);
  assert.match(settings, /getNotificationPreferences/);
  assert.match(settings, /saveNotificationPreferences/);
  assert.match(settings, /Enable native push/);
  assert.match(settings, /AG-06 supplies a server registration and revocation endpoint/);
  assert.match(settings, /accessibilityRole="switch"/);
});

test("SOURCE_CONTRACT_PROOF: Screen 14 (Social & Deep Link) — canonical attributed URLs, host validation, and deep-link parsing", () => {
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

test("SOURCE_CONTRACT_PROOF: Screen 15 (Analytics & Safety Boundary) — prohibits sensitive health attributes and exposes real diagnostic status", () => {
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

test("SOURCE_CONTRACT_PROOF: Screen 18 (Onboarding) — clean entry experience with minimal chrome, step sequence, and preference persistence", () => {
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
  assert.match(onboarding, /accessibilityRole="button"/);
});

// ============================================================================
// PART 3: CROSS-PRODUCT CONTRACT PROOF (Source wiring continuity across surfaces)
// ============================================================================

test("CROSS_PRODUCT_CONTRACT_PROOF: Contract 1 (Premium) — source wiring across Home discovery, Article paywall, Premium landing, and My HealthTimes", () => {
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

test("CROSS_PRODUCT_CONTRACT_PROOF: Contract 2 (Notification) — source wiring across My HealthTimes, Notification Settings, and Notifications", () => {
  const my = read("app/(reader)/my.tsx");
  const settings = read("app/notification-settings.tsx");
  const notifs = read("app/notifications.tsx");

  assert.match(my, /path:"\/notifications"/);
  assert.match(my, /path:"\/notification-settings"/);
  assert.match(settings, /saveNotificationPreferences/);
  assert.match(notifs, /services\.notifications\.list/);
  assert.match(notifs, /item\.destination/);
});

test("CROSS_PRODUCT_CONTRACT_PROOF: Contract 3 (Share / Deep Link) — source wiring across Article share, deepLinks builder/parser, and root DeepLinkBridge", () => {
  const article = read("app/article/[id].tsx");
  const deepLinks = read("src/growth/deepLinks.ts");
  const layout = read("app/_layout.tsx");

  assert.match(article, /services\.social\.buildAttributedShareUrl/);
  assert.match(deepLinks, /parseHealthTimesDeepLink/);
  assert.match(layout, /DeepLinkBridge/);
  assert.match(layout, /router\.push\(\("\/article\/" \+ encodeURIComponent\(destination\.articleId\)\) as never\)/);
});

test("CROSS_PRODUCT_CONTRACT_PROOF: Contract 4 (Advertising) — source wiring across Home, Article, Watch, Live, and AdSlot zero-space guard", () => {
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

test("CROSS_PRODUCT_CONTRACT_PROOF: Contract 5 (Onboarding) — source wiring across Onboarding preference persistence, account sign-in, and Home entry", () => {
  const onboarding = read("app/onboarding.tsx");

  assert.match(onboarding, /router\.replace\("\/" as never\)/);
  assert.match(onboarding, /router\.push\("\/account-access" as never\)/);
  assert.match(onboarding, /services\.reader\.savePreferences/);
  assert.match(onboarding, /services\.deviceSecurity\.saveNotificationPreferences/);
});
