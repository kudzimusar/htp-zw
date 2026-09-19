# NM-04 — Native Reader Product Hardening Report

**Repository:** `kudzimusar/htp-zw`  
**Branch:** `feat/native-mobile-nm04-reader-product`  
**Certified runtime SHA:** `79ddfb5bf4748a89c5cf20df3fb4b989257ca7e2`  
**Checkpoint:** NM-04 — Native Reader Product  
**Disposition:** Reader client hardening complete; AG-04 content-dependent acceptance remains blocked  
**Production systems modified:** NO

## Implemented

- persistent edition/preferences state;
- persistent saved articles;
- deterministic read-position capture and restore;
- bounded local reading history;
- offline article snapshots separate from bookmarks;
- explicit remove-download flow;
- Premium protected body blocked from offline cache without entitlement;
- persisted System / Light / Dark Reader theme;
- themed shared navigation, story cards, Live, Watch, Listen/audio, Article and Saved/Offline surfaces;
- article text-size control;
- 44-point shared touch targets and accessibility state/labels;
- tablet two-column and desktop three-column editorial grids;
- phone/mobile navigation preserved.

## Data integrity boundary

AG-03 still reports `CP3 NOT READY` because the authoritative private WordPress database export and complete uploads archive are missing. AG-04 has therefore not populated migrated content/media/taxonomy.

NM-04 does **not** claim:

- migrated-content rendering certification;
- long/edge-case migrated story certification;
- migrated-media certification;
- real-data search certification;
- realistic-scale staging certification.

Staging editorial-data mode remains fail-closed until AG-04 and the required public read policies are certified.

## Certified CI evidence

- runtime SHA: `79ddfb5bf4748a89c5cf20df3fb4b989257ca7e2`
- Native Mobile Foundation + Staging + Contracts + Reader run: `35445257722` — **SUCCESS**
- Validate HealthTimes 2.0 run: `35445257775` — **SUCCESS**
- Expo dependency compatibility + strict TypeScript: **PASS**
- NM-01/NM-02 foundation tests: **PASS**
- live HealthTimes Staging connectivity smoke: **PASS**
- NM-03 content-contract reconciliation tests: **PASS**
- NM-04 Reader product hardening tests: **PASS**
- static Expo web/PWA export: **PASS**
- PWA output verification: **PASS**
- artifact: `healthtimes-native-web-dist`
- artifact SHA-256: `2f4058575869f1dfa0fc79ccc3499e17099a064d6871ebe93f6f4cdcc3d583b3`

## Remaining NM-04 blockers

1. AG-03 authoritative database export.
2. AG-03 complete uploads archive.
3. AG-04 real content/media/taxonomy migration into staging.
4. Search/public-reader policies for real staging content.
5. phone/tablet native-runtime UAT over migrated content.

## Safety

- production WordPress modified: **NO**
- production database modified: **NO**
- production DNS modified: **NO**
- staging source rows inserted by NM-04: **NO**
- staging media uploaded by NM-04: **NO**
- production identity/ads/analytics modified: **NO**
