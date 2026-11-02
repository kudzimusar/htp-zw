# HT-MVP-UIAT-IMP-01-R3-R3 — Execution Verification Matrix

## 1. Traceability & Invariant Matrix

| Check / Defect ID | Feature / Invariant | Verification Procedure | Measured Value / Physical Observation | Target / Contract Threshold | Status | Evidence Artifact |
|---|---|---|---|---|---|---|
| **0. Exact-SHA Custody** | Deployment source provenance | Read `/build-info.json` from live Preview | Status: 200, SHA: `2a11409e4edbfbc1c90081ee9c07101d2b0da49e`, Presentation: `apps/mobile`, Service Mode: `staging` | Exact SHA match (`2a11409e...`) | **PASS** | `IMP01-R3-R3-physical-verification.json` |
| **DEF-001** | Slug navigation | Load `/article/uat04b-test-story-001` | Status 200, renders headline, no 404 | HTTP 200, title rendered | **PASS** | `screenshots/DEF001-slug-direct.jpg` |
| **DEF-001** | Browser refresh | Execute `page.reload()` on article URL | Status 200, renders headline, no 404 | Retains title without error | **PASS** | `screenshots/DEF001-slug-refresh.jpg` |
| **DEF-001** | UUID navigation | Load `/article/5bcf5e89-8095-4d45-a85a-ba2529b9c31b` | Status 200, renders headline, no 404 | HTTP 200, title rendered | **PASS** | `screenshots/DEF001-uuid-direct.jpg` |
| **DEF-013** | Desktop Light Theme | Measure contrast ratios on `/` | Brand: 16.69:1, Heading: 16.69:1, Body: 5.76:1 | Ordinary text $\ge 4.5:1$ | **PASS** | `screenshots/DEF013-desktop-light.jpg` |
| **DEF-013** | Desktop Dark Theme | Measure contrast ratios on `/` | Brand: 16.92:1, Heading: 16.92:1, Body: 8.91:1 | Ordinary text $\ge 4.5:1$ | **PASS** | `screenshots/DEF013-desktop-dark.jpg` |
| **DEF-013** | Mobile Dark Theme | Measure contrast ratios on `/` (390px) | Brand: 16.92:1, Heading: 16.92:1, Body: 8.91:1 | Ordinary text $\ge 4.5:1$ | **PASS** | `screenshots/DEF013-mobile-dark.jpg` |
| **DEF-013** | Tablet Dark Theme | Measure contrast ratios on `/` (768px) | Brand: 16.92:1, Heading: 16.92:1, Body: 8.91:1 | Ordinary text $\ge 4.5:1$ | **PASS** | `screenshots/DEF013-tablet-dark.jpg` |
| **DEF-013** | Article Dark Theme | Measure contrast on `/article/...` | Brand: 16.92:1, Heading: 16.92:1, Body: 8.91:1 | Ordinary text $\ge 4.5:1$ | **PASS** | `screenshots/DEF013-article-dark.jpg` |
| **DEF-013** | Premium Dark Theme | Measure contrast on `/premium` | Heading: 10.59:1, Body: 8.91:1 | Ordinary text $\ge 4.5:1$ | **PASS** | `screenshots/DEF013-premium-dark.jpg` |
| **DEF-002** | Save article (bookmark) | Click bookmark button on story | Item appears in `/saved` bookmarks list | Saved item present | **PASS** | `screenshots/DEF002-saved-library-bookmarks.jpg` |
| **DEF-002** | Download offline copy | Click download for offline reading | Item appears in `/saved` offline list | Offline item present | **PASS** | `screenshots/DEF002-article-saved-offline.jpg` |
| **DEF-002** | Offline reading | Set `context.setOffline(true)`, open article | 5 full body paragraphs rendered without network | Body rendered offline | **PASS** | `screenshots/DEF002-offline-reading-success.jpg` |
| **DEF-002** | Restart persistence | Reload article after offline storage | `ht:nm04:reader:downloads:v1` retains story | Survives reload in storage | **PASS** | `screenshots/DEF002-offline-reload-persistence.jpg` |
| **DEF-002** | Storage distinctness | Check bookmark and download keys | `ht:nm04:reader:saved:v1` and `ht:nm04:reader:downloads:v1` distinct | Independent storage keys | **PASS** | `screenshots/DEF002-saved-library-offline.jpg` |
| **DEF-008 / Corr. E** | WhatsApp create modal | Publisher opens New Broadcast in `/studio/whatsapp` | Modal opens; title/body inputs available | Form accessible | **PASS** | `screenshots/DEF008-whatsapp-composer.jpg` |
| **DEF-008 / Corr. E** | Deferred notice & schedule disable | Check dispatch banner and schedule input | `DEFERRED TO DISPATCH` banner visible; schedule input uneditable (`scheduleDisabled: true`) | Fail-closed UI notice | **PASS** | `screenshots/DEF008-whatsapp-composer.jpg` |
| **DEF-008 / Corr. E** | UI confirmation banner | Submit draft broadcast with event-driven wait | Rendered: `"Broadcast draft created successfully."` (`draftCreatedSuccess = true`) | Success banner displayed | **PASS** | `screenshots/DEF008-whatsapp-desk-created.jpg` |
| **DEF-008 / Corr. E** | Database persistence | Query `newsroom_list_whatsapp_broadcasts` via token | Stored: ID `18afed61...`, `status = 'draft'`, `broadcast_type = 'health_alert'` | DB row valid | **PASS** | `IMP01-R3-R3-physical-verification.json` |
| **DEF-008 / Corr. E** | Zero dispatches | Inspect dispatch field on stored draft | `dispatch === null` (0 external API dispatches) | External dispatches $== 0$ | **PASS** | `IMP01-R3-R3-physical-verification.json` |
| **DEF-008 / Corr. E** | Commercial actor gate | Commercial persona navigates to `/studio/whatsapp` | Access restricted notice displayed; creation blocked with server authority refusal | Fail-closed role gate | **PASS** | `screenshots/DEF008-commercial-blocked.jpg` |
| **DEF-009** | Advertisers directory | Commercial actor views `/studio/advertising` | Advertisers tab renders HOSPAZ organization card | Tab rendered | **PASS** | `screenshots/DEF009-advertisers-tab.jpg` |
| **DEF-009** | Detail modal | Click `VIEW DETAILS` on advertiser card | Modal displays Associated Campaigns, Registration, Campaign Metrics | Sections present | **PASS** | `screenshots/DEF009-advertiser-details-modal.jpg` |
| **Correction B** | Discovery 51–200 card truth | Search "Cervical", locate card with `getByRole('link')` | Article card discovered; click-through navigates to article path | Exact card locator & nav | **PASS** | `screenshots/R3R3-search-discovery-51-200.jpg` |
| **Correction B** | Public legacy discovery | Search "Lenacapavir", click card with `getByRole('link')` | Navigates to article; 65 full paragraphs render; 0 paywall | Full text readable | **PASS** | `screenshots/R3R3-search-public-legacy.jpg` |
| **Correction B** | Negative search query | Search `xyznonexistentquery999` | 0 article cards rendered; empty state message visible | Empty state displayed | **PASS** | `screenshots/R3R3-search-negative-query.jpg` |
| **Correction C** | Search response latency | Measure search submit-to-render duration | **2,231 ms** | Target $\le 2,500$ ms | **PASS** | `IMP01-R3-R3-physical-verification.json` |
| **Correction A** | Anonymous RPC access | POST `ag05_public_feed_documents` with anon key | HTTP 200, returned 122 rows | HTTP 200 | **PASS** | `IMP01-R3-R3-physical-verification.json` |
| **Correction A** | Future publication exclusion | Evaluate `published_at <= now()` for all rows | **0 future exposures** (`futureExposure === 0`) | Target $== 0$ | **PASS** | `IMP01-R3-R3-physical-verification.json` |
| **Correction A** | Premium content masking | Inspect `body_html` for premium stories | **0 leaks** (`body_html is null` for all `premium_marker_review`) | 0 body leaks | **PASS** | `IMP01-R3-R3-physical-verification.json` |
| **Correction A** | Draft story exclusion | Probe draft story IDs in search and feed | **0 draft exposures** | 0 draft exposures | **PASS** | `IMP01-R3-R3-physical-verification.json` |
| **Correction D** | Fail-Closed Contract Completeness | Run 8 negative test fixtures in harness test suite | 8/8 tests pass, validating non-zero exit on schema breaches | Strict exit 1 on defect | **PASS** | `tests/harness/fail-closed-harness.test.mjs` |
| **DEF-014** | Desktop Cold LCP (P75) | 5 cold browser runs on homepage | **2,144 ms** (Cold connection spike Run 1: 3,572ms; Runs 2–5: 1,796–2,144ms) | Target $\le 2,500$ ms | **PASS** | `screenshots/DEF014-performance-dashboard.jpg` |
| **DEF-014** | Desktop Warm LCP (P75) | 5 warm browser runs on homepage | **1,112 ms** | Target $\le 2,500$ ms | **PASS** | `screenshots/DEF014-performance-dashboard.jpg` |
| **DEF-014** | Mobile LCP (P75) | 5 mobile browser runs on homepage (390px) | **2,084 ms** | Target $\le 2,500$ ms | **PASS** | `screenshots/DEF014-performance-dashboard.jpg` |
| **DEF-014** | Desktop CLS (Max) | 5 cold + 5 warm runs layout shift | **0.001** | Target $\le 0.100$ | **PASS** | `screenshots/DEF014-performance-dashboard.jpg` |
| **DEF-014** | Mobile CLS (Max) | 5 mobile runs layout shift | **0.000** | Target $\le 0.100$ | **PASS** | `screenshots/DEF014-performance-dashboard.jpg` |
| **DEF-014** | Total Initial Feed RPCs | Network requests on homepage ingress | **1** | Target $== 1$ | **PASS** | `IMP01-R3-R3-physical-verification.json` |
| **DEF-014** | Duplicate Feed RPCs | Deduplication of inflight promises | **0** | Target $== 0$ | **PASS** | `IMP01-R3-R3-physical-verification.json` |
| **Migration Audit** | Source Parity | SHA-256 of `20261101210000_ht_mvp_r3_public_feed_documents.sql` | `97f6262b7626a003f57d37cb882074bc35d8838bea18a88354ac0fd447410c0a` | SHA-256 matches manifest | **PASS** | `records/migration-provenance-audit.json` |
| **Migration Audit** | Ledger Parity | Staging schema ledger query | Version `20261101210000`, 112 migrations total | Entry present in ledger | **PASS** | `records/migration-provenance-audit.json` |
| **Migration Audit** | Execution Provenance | Staging DB schema check | Function `ag05_public_feed_documents` exists with `SECURITY DEFINER` | Reconciled schema | **RECONCILED** | `records/migration-provenance-audit.json` |
| **Migration Audit** | Actor Authorization | Recorded `created_by` in ledger | Attributed to `kudzimusar@gmail.com`; no CI runner signature exists | Transparently disclosed | **DISCLOSED** | `records/migration-provenance-audit.json` |
| **Migration Audit** | Production Plan Safety | Manifest immutability & exclusion check | 109 production plan migrations; 2 quarantined staging UAT migrations strictly barred; 11/11 governor tests passed | Strict exclusion enforced | **PASS** | `tests/migration/migration-governor.test.mjs` |
| **Session Hygiene** | Test user session revocation | Staging DB query for test sessions | **0** active sessions for `@healthtimes.test` | Target $== 0$ | **PASS** | Staging Supabase DB |
| **Session Hygiene** | Test refresh token revocation | Staging DB query for refresh tokens | **0** unrevoked tokens for `@healthtimes.test` | Target $== 0$ | **PASS** | Staging Supabase DB |
| **Session Hygiene** | Owner session safeguard | Staging DB query for `kudzimusar@gmail.com` | **15** active sessions preserved | Owner safeguarded | **PASS** | Staging Supabase DB |

---

## 2. Telemetry Summary

```text
DESKTOP_COLD_LCP_P75_MS=2144
DESKTOP_WARM_LCP_P75_MS=1112
MOBILE_LCP_P75_MS=2084
DESKTOP_CLS_MAX=0.001
MOBILE_CLS_MAX=0.000
INITIAL_FEED_RPC_COUNT=1
UNNECESSARY_DUPLICATE_RPCS=0
SEARCH_LATENCY_MS=2231
FUTURE_EXPOSURE_COUNT=0
PREMIUM_BODY_LEAKS=0
DRAFT_EXPOSURES=0
ACTIVE_TEST_SESSIONS=0
ACTIVE_OWNER_SESSIONS=15
FAIL_CLOSED_FAILURES=0
FAIL_CLOSED_EXIT_CODE=0
```
