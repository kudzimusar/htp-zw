# NM-05 — Growth & Commercial Provider Integration Readiness Closure

**Repository:** `kudzimusar/htp-zw`  
**Starting SHA:** `964f0bf02e42a9ea2ff29b35a71754ed189fd476`  
**Branch:** `feat/native-mobile-nm05-growth-provider-readiness`  
**Pre-closure certified runtime SHA:** `b53faa3e6790463f91894a9db4122820b81852c3`  
**Checkpoint:** NM-05 — Growth & Commercial Provider Integration Readiness  
**Disposition:** provider-ready architecture complete; native commercial activation remains evidence-gated  
**Production systems modified:** **NO**

## Implemented

### Analytics

- `AnalyticsService` is backed by explicit adapters rather than validate-and-discard behavior.
- Development/test uses an in-memory sink.
- Canonical HealthTimes PWA may use the recorded web GA4 measurement identity; GitHub Pages and other hosts are blocked from that web stream.
- Native analytics remains `configuration-required`; mobile GA4 stream and measurement IDs remain null.
- Public analytics uses an allowlist-based behavioral schema and rejects raw health queries, protected Premium/editorial bodies, Newsroom/Studio fields, staff capability/permission data and sensitive health attributes.
- All 24 approved public event names have executable valid-payload coverage.
- Analytics failures remain non-blocking to Reader behavior.

### Reader media

- `listen_started` is emitted only after successful playback transition.
- `listen_completed` is emitted only after the matching player reaches ended.
- Native background playback analytics is not claimed.

### Advertising

- provider readiness states: `unconfigured`, `blocked-by-policy`, `eligible-no-inventory`, `available`, `error`;
- typed placement registry includes Home, article-after-intro, article-mid-body, article-end, Live and Watch surfaces;
- arbitrary ad placement keys are rejected;
- article sensitive-health placements fail closed;
- no verified provider/inventory returns no ad;
- impression/click events require actual `available` inventory;
- ad destinations must be HTTPS.

### Seller evidence

- `ads.txt`: recorded web seller declaration retained;
- `app-ads.txt`: empty by design until certified native app seller evidence exists;
- no `ca-app-pub-*` identity exists in the NM-05 evidence boundary;
- native advertising provider configuration remains separate and `configuration-required`.

### Premium

- storefront states: `configuration-required`, `loading`, `available`, `unavailable`, `error`;
- storefront offers must be returned by the provider and include provider product identity and localized display data;
- no production price/currency is hardcoded;
- client purchase success maps to `pending-server-entitlement`;
- restore success maps to `restored-pending-server-entitlement`;
- NM-06 / AG-06 remains the server entitlement authority;
- protected Premium bodies remain fail closed.

### Social/deep links

- canonical HealthTimes outgoing URLs;
- bounded WhatsApp/Facebook/X/LinkedIn/system/copy attribution;
- HTTPS HealthTimes-host-only referral parsing;
- normalized UTM values;
- inbound `ht_article_id` is never trusted as the article destination;
- canonical web article slug is resolved through the existing ArticleRepository boundary;
- malformed and hostile URLs fail closed.

## Pre-closure exact-head certification evidence

Runtime SHA `b53faa3e6790463f91894a9db4122820b81852c3` passed:

- Validate HealthTimes 2.0 — run `35687480489` — SUCCESS;
- Native Mobile Foundation + Staging + Contracts + Reader + Growth + Security + Certification — run `35687480474` — SUCCESS;
- Deploy HealthTimes Universal PWA Preview — run `35687480424` — SUCCESS;
- Native Binary Certification — run `35687480415` — SUCCESS;
- strict TypeScript / Expo compatibility — PASS;
- NM-01/NM-02 foundation — PASS;
- live staging fail-closed connectivity smoke — PASS;
- NM-03 + AG-04 contracts — PASS;
- NM-04 Reader product/fidelity/offline/media — PASS;
- Source Parity — PASS;
- NM-05 combined behavior/integration gate — **39/39 PASS**;
- NM-06 identity/security — PASS;
- NM-07 readiness — PASS;
- PWA export — PASS;
- exact-head Pages verification — PASS;
- Android debug binary — PASS;
- iOS Simulator binary — PASS.

Pages deployed SHA: `b53faa3e6790463f91894a9db4122820b81852c3`.

Pre-closure artifacts:

- `healthtimes-native-web-dist` — artifact `10676899135` — GitHub artifact SHA-256 `082665afded3328db9d55923305c6b3a5ab88cb9913ff71e8fa21eb0483d0b8b`;
- `github-pages` — artifact `10677223697` — GitHub artifact SHA-256 `3bf2ca8ea1e7028f0ffbeb67ab53dd42f9d6e16590e3f6ea5b992d8a201af92e`;
- `healthtimes-native-config-matrix` — artifact `10677188730` — GitHub artifact SHA-256 `9e85bac79ecf6d91cdfe89ff486bedbfa3dd126348ecf4b7278d1e3aa61af87b`;
- `healthtimes-android-debug-apk` — artifact `10678325513` — GitHub artifact SHA-256 `a7eea2942d9b04007dc61e8882562028c12bb278e80fb6e3cd7cb85f9eb054cd`;
- `healthtimes-ios-simulator-app` — artifact `10677970559` — GitHub artifact SHA-256 `07648073b1beb5559ccfabd15e8eb5c039a9bcb01947f90d288aba95073bc7fb`.

The final closure commit adds direct SHA-256 logging for the APK and iOS Simulator archive; the final exact-head workflow receipt supersedes these pre-closure artifact references for closure reporting.

## AG-05 blockers

NM-05 still requires certified AG-05 evidence before activating:

1. approved native GA4/Firebase stream/provider configuration;
2. AdMob/native advertising account, application and ad-unit configuration;
3. certified native `app-ads.txt` seller declarations;
4. approved App Store monthly/yearly product identifiers;
5. approved Google Play monthly/yearly product identifiers;
6. account-level GA4/Search Console/AdSense continuity and historical analytics/revenue evidence;
7. approved direct-ad inventory/campaign evidence where applicable.

## AG-06 / NM-06 handoff

Server authority is still required for:

- purchase receipt/result verification;
- restore reconciliation;
- idempotent transaction processing;
- entitlement grant/revocation;
- account/store identity binding;
- protected Premium-body authorization.

A client storefront success must never be treated as authoritative entitlement.

## Remaining physical/store UAT

- physical iOS and Android deep-link validation;
- physical-device foreground media validation;
- native analytics provider validation after approved configuration exists;
- compliant ad-provider inventory validation after approved configuration exists;
- App Store / Play sandbox purchase and restore tests after product IDs exist;
- server entitlement round-trip UAT after AG-06/NM-06 integration exists;
- native background/lock-screen playback remains outside the claimed checkpoint.

## Safety

- native GA4 active: **NO**
- AdMob active: **NO**
- App Store Premium products active: **NO**
- Play Store Premium products active: **NO**
- Premium purchasing active: **NO**
- revenue continuity claimed: **NO**
- production systems modified: **NO**
