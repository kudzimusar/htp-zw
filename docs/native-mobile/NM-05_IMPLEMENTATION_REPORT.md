# NM-05 — Growth, Advertising, Social and Premium Implementation Report

**Repository:** `kudzimusar/htp-zw`  
**Branch:** `feat/native-mobile-nm05-growth-commercial`  
**Certified runtime SHA:** `c1b4e285a5355692f3a30c0c806fc06347aa0cb6`  
**Checkpoint:** NM-05 — Growth, Advertising, Social and Premium  
**Disposition:** Safe client foundation complete; provider/account activation remains evidence-gated  
**Production systems modified:** NO

## Implemented

- versioned public analytics event catalogue (`2026-09-09`);
- validated Article/Search/Save/Share/Premium event emission;
- raw Search query redaction before analytics;
- sensitive-health analytics parameter rejection;
- attributed canonical social share URLs;
- native article deep-link helpers;
- HealthTimes-domain referral parsing;
- AdvertisingService request context and sensitive-health policy;
- default `source: none` when compliant verified mobile inventory is unavailable;
- web GA4/Search Console/AdSense continuity identities recorded separately from native configuration;
- native GA4/AdMob IDs remain unconfigured/null;
- PremiumStoreService baseline;
- storefront-driven Premium screen with no hardcoded production price;
- restore-purchases baseline;
- growth/commercial readiness screen;
- verified seller declaration exported as `ads.txt` and `app-ads.txt`;
- sensitive-health advertising / analytics / Premium safety policy.

## Evidence boundary

Verified AG-03 web continuity values are retained, including GA4 property `359235319`, Search Console property `https://healthtimes.co.zw/`, AdSense publisher `pub-8744434739998394`, and the verified Google seller declaration.

NM-05 does **not** infer or claim:

- native GA4/Firebase stream identity;
- AdMob application/ad-unit IDs;
- active mobile Google advertising;
- historical GA4/Search Console/AdSense imports;
- verified revenue history;
- App Store / Play Store product IDs or localized prices;
- server Premium entitlement authority.

AG-03 remains CP3 NOT READY and AG-05 account-level certification has not completed.

## Sensitive-health safeguards

- no diagnosis/disease/condition targeting;
- no medication/prescription targeting;
- no symptom/patient targeting;
- no article-body sensitive keyword personalization;
- no personalized delivery without appropriate consent;
- raw search text is not sent by the NM-05 public analytics path;
- Studio/Newsroom operational data is not routed to public Reader analytics;
- no verified compliant inventory means no ad is served.

See `docs/native-mobile/NM-05_GROWTH_ADS_PRIVACY_POLICY.md`.

## Certified CI evidence

- Native Mobile Foundation + Staging + Contracts + Reader + Growth run: `35445882852` — **SUCCESS**
- Validate HealthTimes 2.0 run: `35445882859` — **SUCCESS**
- Expo compatibility + strict TypeScript: **PASS**
- NM-01/NM-02 foundation tests: **PASS**
- live HealthTimes Staging smoke: **PASS**
- NM-03 content-contract tests: **PASS**
- NM-04 Reader-product tests: **PASS**
- NM-05 growth/commercial safety tests: **PASS**
- Expo web/PWA export: **PASS**
- built `ads.txt` exact seller check: **PASS**
- built `app-ads.txt` exact seller check: **PASS**
- PWA output verification: **PASS**
- artifact: `healthtimes-native-web-dist`
- artifact SHA-256: `f16acbf99507b6724bc3ebfa3834ba2fb70bb56034fa6a317912057fc57c5e26`

## Remaining blockers

1. AG-03 CP3 authoritative source package.
2. AG-05 account-level Analytics/Search Console/AdSense evidence.
3. approved native GA4/Firebase configuration.
4. approved mobile advertising provider/account IDs.
5. approved App Store / Google Play Premium products.
6. AG-06 server entitlement authority.
7. native-device deep-link/store/ad-provider certification after those integrations exist.

## Safety

- production Google configuration modified: **NO**
- production AdSense modified: **NO**
- production mobile ads activated: **NO**
- production store products modified: **NO**
- production entitlement authority modified: **NO**
- fabricated audience/revenue metrics: **NO**
