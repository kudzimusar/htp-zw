# NM-05 — Growth, Advertising, Social and Premium Safety Policy

## Status

This policy governs the HealthTimes universal Reader during NM-05.

AG-03 has verified the existing **web** Google/AdSense identities, but CP3 is not accepted and AG-05 has not completed account-level continuity certification. Native GA4/Firebase streams, AdMob application/ad-unit IDs, App Store products, Google Play products and server entitlement authority remain unverified.

## 1. Identity separation

Verified web identities may be displayed for continuity/readiness purposes:

- Google tag: `GT-PLTTGPL`
- GA4 account: `137814020`
- GA4 property: `359235319`
- GA4 web stream: `4756168788`
- GA4 web measurement ID: `G-S39LN2KX4X`
- Search Console property: `https://healthtimes.co.zw/`
- AdSense publisher: `pub-8744434739998394`
- AdSense client: `ca-pub-8744434739998394`
- known web slot: `7971959240`

These are **not** automatically valid native GA4/Firebase, AdMob, App Store or Play Store identifiers. The native app must not transpose or derive those missing identities.

## 2. Public analytics boundary

The public Reader uses the event version `2026-09-09` and only the approved event-name catalogue in `src/growth/events.ts`.

Until the approved native analytics provider is configured, the AnalyticsService validates event shape but does not transmit production analytics.

Public analytics must not include:

- passwords, tokens or authorization values;
- subscriber email/phone/name;
- staff roles or editorial drafts/notes;
- patient/medical-record identifiers;
- diagnosis, disease, condition, medication/prescription or symptom attributes.

Search queries can reveal sensitive health interests. NM-05 therefore emits result count/format with `query_redacted: true` and does not transmit raw query text.

Newsroom/Studio operational activity must not be routed into public Reader analytics.

## 3. Advertising / sensitive health targeting

Sensitive health context is ineligible for personalized advertising.

NM-05 rules:

- no diagnosis targeting;
- no disease/condition targeting;
- no medication or prescription targeting;
- no symptom targeting;
- no patient/profile targeting;
- no article-body keyword targeting for sensitive health personalization;
- no personalized delivery without appropriate consent;
- no ad provider is activated until its mobile IDs and policy are verified;
- when no verified compliant inventory exists, the placement returns `source: "none"`.

HealthTimes direct campaigns, Google inventory and house promotions remain separate sources under the AdvertisingService abstraction.

## 4. Seller authorization

The only seller declaration NM-05 publishes is the AG-03-verified line:

`google.com, pub-8744434739998394, DIRECT, f08c47fec0942fa0`

Both `ads.txt` and `app-ads.txt` in the universal app export contain only this verified line.

This does **not** assert that AdMob is configured. No AdMob application ID or ad-unit ID is claimed.

## 5. Deep links and social attribution

Native article deep links use the configured `healthtimes` app scheme/Expo Router route.

Outgoing social shares use the canonical HealthTimes web article URL plus bounded UTM attribution:

- `utm_source=healthtimes_share`
- `utm_medium=<approved share channel>`
- `utm_campaign=organic_share`

Incoming attribution is accepted only from `healthtimes.co.zw` / `www.healthtimes.co.zw`.

## 6. Premium / store boundary

Premium plan names, product identifiers and localized prices must come from App Store / Google Play configuration.

NM-05 must not:

- invent product IDs;
- hardcode production prices;
- mark a purchase complete solely from client state;
- unlock Premium full bodies from a local flag.

The storefront layer remains `configuration-required` until verified products exist. AG-06/NM-06 supplies the server entitlement authority and receipt/session security.

## 7. Production safety

- production Google configuration modified: **NO**
- production AdSense modified: **NO**
- production mobile ads activated: **NO**
- production store products created/modified: **NO**
- production Premium entitlement authority modified: **NO**
- fabricated audience/revenue metrics: **NO**
