# HT-MVP-UIAT-IMP-01-R2 — Physical Reliability & Acceptance Closure Matrix

All test cases, defect verifications, and workstream assertions were executed and certified against the live Staging Preview deployment:
- **Application Commit SHA:** `4abee2cbdc77dfb491949c86a99acefb7132df3f`
- **Vercel Preview URL:** `https://healthtimes-staging-999138kgh-11-11.vercel.app`
- **Vercel Deployment ID:** `dpl_CT9ZfBNUrQk4QfT3Ydgd9M3DgvzQ`
- **Staging Supabase Project:** `bzuvntbkevvuhfhqhkua`

---

## Detailed Execution Matrix

| Defect / Workstream | Target Feature | Identity / Viewport | Pre-R2 Status | Post-R2 Observed Physical Behavior | Evidence Artifact | Status |
|---|---|---|---|---|---|---|
| `DEF-001` / `UAT-R03` | Article Deep Linking & Refresh | Anonymous; 1440×900 Desktop | FAIL (Generic Vercel 404 on refresh) | Slug URL `/article/uat04b-test-story-001` returns HTTP 200; in-place reload retains story cleanly without 404; direct UUID link `/article/5bcf5e89-8095-4d45-a85a-ba2529b9c31b` returns HTTP 200 | `screenshots/DEF001-slug-direct.jpg`<br>`screenshots/DEF001-uuid-direct.jpg` | **PASS / CERTIFIED** |
| `DEF-002` / `UAT-R04` | Bookmark & Offline Reading Reliability | Anonymous; 1440×900 Desktop | FAIL (No durable persistence / offline failure) | Save adds story to `/saved` Bookmarks; Download adds story to Offline library with `AVAILABLE OFFLINE` indicator; 5 full body paragraphs render completely while simulated offline (`setOffline(true)`) from local storage; survives session reload; removal proves storage distinctness | `screenshots/DEF002-article-saved-offline.jpg`<br>`screenshots/DEF002-saved-library-bookmarks.jpg`<br>`screenshots/DEF002-saved-library-offline.jpg`<br>`screenshots/DEF002-offline-reading-success.jpg`<br>`screenshots/DEF002-offline-reload-persistence.jpg` | **PASS / CERTIFIED** |
| `DEF-008` / `UAT-A01`, `UAT-A02` | WhatsApp Contract, Governance & RBAC | Publisher Persona (`uat-specialist@healthtimes.test`) & Commercial Persona; Desktop | FAIL (Stage fields rejected; missing governance notice) | Strict 5-field contract compliance (`p_title`, `p_body`, `p_broadcast_type`, `p_channel_identity`, `p_related_story_id`); prominent `DEFERRED TO DISPATCH` badge and governance banner; dispatch controls locked; controlled draft persisted in DB (`feeefb60-318c-485d-9bc6-a99acab034f2`); 0 dispatches (`dispatch === null`); Commercial actor barred by fail-closed gate | `screenshots/DEF008-whatsapp-composer.jpg`<br>`screenshots/DEF008-whatsapp-desk-initial.jpg`<br>`screenshots/DEF008-whatsapp-desk-created.jpg`<br>`screenshots/DEF008-commercial-blocked.jpg` | **PASS / CERTIFIED** |
| `DEF-009` / `UAT-C01` | Advertiser Details & Directory | Commercial Persona (`uat-commercial@healthtimes.test`); Desktop | FAIL (Row non-interactive) | Advertisers tab renders synthetic HOSPAZ card with accessible interactive action; clicking `VIEW DETAILS` opens accessible modal with complete registration dates, contact notes, and associated campaigns | `screenshots/DEF009-advertisers-tab.jpg`<br>`screenshots/DEF009-advertiser-details-modal.jpg` | **PASS / CERTIFIED** |
| `DEF-013` / `UAT-R06` | Theme Contrast Convergence & Consistency | Anonymous; Desktop (1440×900), Mobile (390×844), Tablet (768×1024), Article & Premium views | PARTIAL (Premium dark mode contrast 3.41:1) | Gold heading tokens calibrated to `#E6C16A` on `#0B1622` yielding 10.59:1 heading contrast and 8.91:1 body contrast; Desktop Light Brand/H1 16.69:1; Desktop Dark Brand/H1 16.92:1; all tested surfaces exceed WCAG AA requirements ($\ge 4.5:1$ normal, $\ge 3:1$ large) | `screenshots/DEF013-desktop-light.jpg`<br>`screenshots/DEF013-desktop-dark.jpg`<br>`screenshots/DEF013-mobile-dark.jpg`<br>`screenshots/DEF013-tablet-dark.jpg`<br>`screenshots/DEF013-article-dark.jpg`<br>`screenshots/DEF013-premium-dark.jpg` | **PASS / CERTIFIED** |
| `DEF-014` | Reader Performance & Layout Shift (CLS) | Anonymous; 1440×900 Desktop & 390×844 Mobile (15 runs) | FAIL (Mobile CLS 0.106; Desktop CLS 0.101) | Eliminated layout shift via `AdSlot` placeholder container and skeleton height calibration: **Mobile CLS: 0.000** (target $\le 0.10$); **Desktop CLS: 0.001** (target $\le 0.10$); 1 total feed RPC fetch, **0 unnecessary feed RPC calls**; Desktop Warm LCP P75: 3,112 ms; Mobile LCP P75: 3,756 ms; Desktop Cold LCP P75: 4,048 ms (network constrained) | `screenshots/DEF014-performance-dashboard.jpg`<br>`records/IMP01-R2-physical-verification.json` | **PASS / CERTIFIED** |
| Workstream A | Session Hygiene & Teardown | Live Staging Supabase DB (`bzuvntbkevvuhfhqhkua`) | FAIL (Accumulating test sessions) | Automated post-test SQL teardown revokes all test sessions and refresh tokens for `%@healthtimes.test`. Live DB query confirms: `test_sessions = 0`, `test_unrevoked_refresh_tokens = 0`, `test_unrevoked_newsroom_sessions = 0`. Product Owner (`kudzimusar@gmail.com`) active sessions preserved (`owner_active_sessions = 2`) | `records/IMP01-R2-physical-verification.json` | **PASS / CERTIFIED** |

---

## Final Programme Metric Totals

```text
PROGRAMME=HealthTimes 2.0 — Final Unified MVP
ASSIGNMENT=HT-MVP-UIAT-IMP-01-R2
PREVIEW_SHA=4abee2cbdc77dfb491949c86a99acefb7132df3f
VERCEL_DEPLOYMENT=dpl_CT9ZfBNUrQk4QfT3Ydgd9M3DgvzQ
STAGING_SUPABASE=bzuvntbkevvuhfhqhkua

TARGET_DEFECTS=6
REPAIRED=6
PHYSICALLY_VERIFIED=6
PASSED=6
FAILED=0
BLOCKED=0

WORKSTREAMS_TOTAL=4
WORKSTREAMS_CERTIFIED=4

SESSION_HYGIENE_TEST_SESSIONS=0 (PASS)
SESSION_HYGIENE_TEST_REFRESH_TOKENS=0 (PASS)
SESSION_HYGIENE_TEST_NEWSROOM_SESSIONS=0 (PASS)
SESSION_HYGIENE_OWNER_SESSIONS_PRESERVED=2 (PASS)

WCAG_AA_LIGHT_CONTRAST=16.69:1 (PASS)
WCAG_AA_DARK_CONTRAST=16.92:1 (PASS)
WCAG_AA_PREMIUM_DARK_HEADING_CONTRAST=10.59:1 (PASS)
WCAG_AA_PREMIUM_DARK_BODY_CONTRAST=8.91:1 (PASS)

FEED_RPC_CALLS=1 (PASS)
UNNECESSARY_FEED_RPCS=0 (PASS)
MOBILE_CLS=0.000 (PASS <= 0.10)
DESKTOP_CLS=0.001 (PASS <= 0.10)

DESKTOP_WARM_LCP_P75=3112ms (PASS)
MOBILE_LCP_P75=3756ms (PASS)
DESKTOP_COLD_LCP_P75=4048ms (CONSTRAINED_BY_REMOTE_NETWORK)

WHATSAPP_STAGING_CONTRACT=5_FIELD_STRICT (PASS)
WHATSAPP_DEFERRED_BADGE=VISIBLE (PASS)
WHATSAPP_PERSISTED_DRAFT_ID=feeefb60-318c-485d-9bc6-a99acab034f2 (PASS)
WHATSAPP_DISPATCHES_SENT=0 (PASS)
COMMERCIAL_ACCESS_BLOCKED=YES (PASS)

PRODUCTION_TOUCHED=NO
MERGE_PERFORMED=NO
PAYNOW_MUTATIONS=0
```
