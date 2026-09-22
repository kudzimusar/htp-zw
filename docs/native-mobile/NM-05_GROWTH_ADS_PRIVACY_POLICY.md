# NM-05 — Growth, Advertising, Social and Premium Safety Policy

## Status

This policy governs the HealthTimes universal Reader during the NM-05 provider-readiness checkpoint.

The repository contains verified **web continuity** identities, but native analytics, native advertising and native storefront activation remain evidence-gated. NM-05 must not transpose a web identity into a native provider identity or infer commercial readiness from seller declarations alone.

## 1. Provider identity separation

The existing web continuity record includes:

- Google tag: `GT-PLTTGPL`
- GA4 account: `137814020`
- GA4 property: `359235319`
- GA4 web stream: `4756168788`
- GA4 web measurement ID: `G-S39LN2KX4X`
- Search Console property: `https://healthtimes.co.zw/`
- AdSense publisher: `pub-8744434739998394`
- AdSense client: `ca-pub-8744434739998394`
- known web slot: `7971959240`

These values remain web continuity evidence only. Native GA4/Firebase stream identity, AdMob application/ad-unit IDs, App Store product IDs and Google Play product IDs remain unresolved.

## 2. Public analytics boundary

The public Reader uses event version `2026-09-09` and the approved event catalogue in `src/growth/events.ts`.

Analytics has three explicit provider boundaries:

- development/test: in-memory sink;
- PWA web: the existing web measurement identity may emit only on canonical `healthtimes.co.zw` hosts when the web transport is initialized;
- native: `configuration-required` until AG-05 supplies approved native provider evidence.

GitHub Pages, localhost and native builds do not inherit the web stream.

The public event validator is allowlist-based. Reader analytics must not include:

- raw health search text;
- passwords, tokens or authorization values;
- subscriber email/phone/name;
- draft bodies, protected Premium bodies, editorial notes or newsroom/Studio fields;
- staff roles, capabilities or permissions;
- patient/medical-record identifiers;
- diagnosis, disease, condition, medication/prescription, symptom or inferred health-interest attributes.

Search emits bounded result/filter metadata with `query_redacted: true`.

Analytics/provider failure is non-blocking and must never break reading, saving, sharing or playback.

## 3. Media analytics

`listen_started` follows an actual successful player transition to playing.

`listen_completed` follows the actual ended transition for the same started item.

Button impressions do not count as playback. Native background/lock-screen playback analytics is not claimed.

## 4. Advertising provider and placement policy

`AdvertisingService` distinguishes:

- `unconfigured`;
- `blocked-by-policy`;
- `eligible-no-inventory`;
- `available`;
- `error`.

No verified inventory means no ad.

Reader placements are registered in `src/growth/ad-placements.ts`. Arbitrary insertion is not accepted. Registered surfaces include Home, article after intro, article mid-body, article end, Live and Watch.

Article placements are sensitive-health blocked. Home/Live/Watch placements are non-personalized-only when otherwise policy-eligible. No diagnosis, medication, condition, symptom, raw query, article-body sensitive keyword or inferred health-interest targeting is allowed.

Ad impression/click analytics is emitted only after an `available` provider decision. Ad destinations must be HTTPS.

## 5. Seller authorization

Web and native seller evidence are separate:

- `ads.txt`: contains the recorded web seller declaration `google.com, pub-8744434739998394, DIRECT, f08c47fec0942fa0`;
- `app-ads.txt`: intentionally declaration-free until AG-05 supplies certified native app seller evidence;
- native advertising provider configuration: `configuration-required`.

No `ca-app-pub-*` value is invented. A web seller declaration is not proof of active AdMob configuration.

## 6. Deep links and social attribution

Native article deep links use the configured HealthTimes scheme and bounded article identifiers.

Canonical web article links resolve by the HealthTimes slug. Inbound `ht_article_id` is attribution metadata only and is never trusted as the destination identifier.

Outgoing shares use canonical HealthTimes URLs plus bounded attribution:

- `utm_source=healthtimes_share`;
- `utm_medium=<approved share channel>`;
- `utm_campaign=organic_share`.

Referral parsing accepts HTTPS HealthTimes hosts only and normalizes UTM values.

## 7. Premium storefront and entitlement boundary

The storefront abstraction supports:

- `configuration-required`;
- `loading`;
- `available`;
- `unavailable`;
- `error`.

Offers, product IDs, localized prices and currencies must originate from the platform storefront response.

A client purchase or restore result is never an entitlement. Successful store activity remains `pending-server-entitlement` / `restored-pending-server-entitlement` until NM-06 / AG-06 confirms authoritative server entitlement.

No purchase path may populate or unlock a protected Premium body directly.

## 8. Production safety

- production Google configuration modified: **NO**
- production AdSense modified: **NO**
- production mobile ads activated: **NO**
- production store products created/modified: **NO**
- production Premium entitlement authority modified: **NO**
- fabricated audience/revenue metrics: **NO**
