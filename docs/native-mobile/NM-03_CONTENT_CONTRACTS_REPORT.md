# NM-03 — HealthTimes Content Contracts & Global Taxonomy Report

**Repository:** `kudzimusar/htp-zw`  
**Branch:** `feat/native-mobile-nm03-content-contracts`  
**Checkpoint:** NM-03 — Content Contracts and Global Taxonomy  
**Certified runtime SHA:** `c1b18a771a19b8ee946795d79777483e87c38d58`  
**Production systems modified:** NO

## 1. Live schema reconciliation

NM-03 generated TypeScript types directly from the certified HealthTimes Staging project:

- Supabase project: `gcdohgbmqhqwydgaxrcr`
- generated type file: `apps/mobile/src/generated/database.types.ts`
- generated size: approximately 56K characters
- client: `createClient<Database>()`

The app now compiles against the live staging schema rather than handwritten database guesses.

## 2. Contract domains represented

NM-03 now represents:

- Article
- Author
- Media
- Live
- Video
- taxonomy
- geography
- Premium source context
- advertising/commercial source context
- source provenance
- source reconciliation exceptions

Typed row mappers cover:

- `stories`
- `authors`
- `media_assets`
- `sections`
- `geographic_zones`
- `legacy_sources`

## 3. AG-03 source truth represented

The app models AG-03 reconciliation classifications:

- MATCH
- EXPECTED_SOURCE_DRIFT
- REQUIRES_REVIEW
- MISSING_FROM_DATABASE
- DATABASE_ONLY

It also models source exceptions including:

- unknown shortcode
- unmapped custom field
- missing media
- unresolved author
- unresolved taxonomy
- unresolved Premium history
- unresolved commerce history

Historical discovery counts are deliberately **not** encoded as current app truth.

## 4. Provenance

The Reader domain can preserve:

- source system
- source ID
- stable key
- legacy/source URL
- checksum
- capture timestamp
- WordPress post/author/featured-media/category/tag identities
- migration exceptions

Author and Media contracts can also carry source provenance.

## 5. Global taxonomy

The client geography contract is not Zimbabwe-only.

Levels:

- global
- continent
- region
- country
- subnational

The controlled taxonomy fixture uses the CP1-certified baseline:

Editorial desks:
1. Global Health
2. Africa
3. Research
4. Policy
5. Investigations
6. Public Health
7. Health Systems
8. Health Business

Geography:
1. Global
2. Africa
3. Southern Africa
4. East Africa
5. West Africa
6. Central Africa
7. North Africa
8. Zimbabwe

The contract supports additional countries/regions without redesign.

## 6. Product use

`Explore` and `Select Your Edition` now consume `TaxonomyService` instead of independent hardcoded region/desk arrays.

The product therefore shares one taxonomy contract across native and PWA surfaces.

## 7. AG-03 readiness boundary

AG-03 remains:

**CP3 NOT READY**

Authoritative dependencies still missing:

- private WordPress database export — not received/validated
- complete `wp-content/uploads/` archive — not received/validated
- content freeze — not established

System Status surfaces this blocker explicitly.

## 8. Certified automation evidence

### Native Mobile Foundation + Staging + Contracts

- workflow run: `35444834640`
- result: **SUCCESS**
- candidate SHA: `c1b18a771a19b8ee946795d79777483e87c38d58`

Passed:

1. Expo dependency compatibility — PASS
2. strict TypeScript — PASS
3. NM-01/NM-02 foundation integrity — PASS
4. live staging Auth/PostgREST/Storage smoke — PASS
5. NM-03 content contract reconciliation tests — PASS
6. Expo static web/PWA export — PASS
7. PWA output verification — PASS
8. artifact upload — PASS

Artifact:

- `healthtimes-native-web-dist`
- artifact id: `10585232202`
- SHA-256: `3d5c9fdf76c017cb876339601d607b5f4c29dd5d410a87397c95b9a9ad59120f`

### Existing HealthTimes validation

- workflow run: `35444834650`
- result: **SUCCESS**

### Vercel

- branch preview: **SUCCESS**

## 9. NM-03 decision

Implemented and certified:

- schema alignment
- source/provenance contracts
- global taxonomy model
- Reader integration of taxonomy
- contract-level exception handling

Full NM-03 acceptance remains **BLOCKED ON AG-03 AUTHORITATIVE SOURCE ARTIFACTS** because the contract cannot yet be reconciled against the missing private database/uploads snapshot.

No source completeness has been fabricated.

## 10. Downstream

NM-04 may only replace editorial fixtures when AG-04 has migrated authoritative content/media/taxonomy into staging and the required Reader access policy is certified.

Production remains untouched.
