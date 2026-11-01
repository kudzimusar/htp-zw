# HT-MVP-UIAT-IMP-01-R3 — Physical Reliability & Acceptance Closure Matrix

All test cases, performance benchmarks, nonregression validations, and session hygiene assertions were physically executed and certified against the live Staging Preview deployment:
- **Application Commit SHA:** `4e94db70ebc352fabbea7249b4e92b34e738a750`
- **Vercel Preview URL:** `https://healthtimes-staging-3stgbw3jh-11-11.vercel.app`
- **Vercel Deployment ID:** `dpl_9uitjNdW9qd85Pnoy1twhJQwpLFy`
- **Staging Supabase Project Ref:** `bzuvntbkevvuhfhqhkua` (AWS us-east-1)

---

## Detailed Execution Matrix

| Defect / Workstream | Target Feature | Identity / Viewport | Pre-R3 Status | Post-R3 Observed Physical Behavior | Evidence Artifact | Status |
|---|---|---|---|---|---|---|
| `DEF-001` / `UAT-R03` | Article Deep Linking & Refresh | Anonymous; 1440×900 Desktop | PASS in R2 (Retest required) | Slug URL `/article/uat04b-test-story-001` returns HTTP 200; in-place reload retains story cleanly without 404; direct UUID link `/article/5bcf5e89-8095-4d45-a85a-ba2529b9c31b` returns HTTP 200 | `screenshots/DEF001-slug-direct.jpg`<br>`screenshots/DEF001-uuid-direct.jpg` | **PASS / CERTIFIED** |
| `DEF-002` / `UAT-R04` | Bookmark & Offline Reading Reliability | Anonymous; 1440×900 Desktop | PASS in R2 (Retest required) | Save adds story to `/saved` Bookmarks; Download adds story to Offline library with `AVAILABLE OFFLINE` indicator; 5 full body paragraphs render completely while simulated offline (`setOffline(true)`) from local storage; survives session reload; removal proves storage distinctness | `screenshots/DEF002-article-saved-offline.jpg`<br>`screenshots/DEF002-saved-library-bookmarks.jpg`<br>`screenshots/DEF002-saved-library-offline.jpg`<br>`screenshots/DEF002-offline-reading-success.jpg`<br>`screenshots/DEF002-offline-reload-persistence.jpg` | **PASS / CERTIFIED** |
| `DEF-008` / `UAT-A01`, `UAT-A02` | WhatsApp Contract, Governance & RBAC | Publisher Persona (`uat-specialist@healthtimes.test`) & Commercial Persona; Desktop | PASS in R2 (Retest required) | Strict 5-field contract compliance (`p_title`, `p_body`, `p_broadcast_type`, `p_channel_identity`, `p_related_story_id`); prominent `DEFERRED TO DISPATCH` badge and governance banner; dispatch controls locked; controlled draft persisted in DB (`e69be5a9-b18c-4688-a2fa-31b1b8baa3d3`); 0 dispatches (`dispatch === null`); Commercial actor barred by fail-closed gate | `screenshots/DEF008-whatsapp-composer.jpg`<br>`screenshots/DEF008-whatsapp-desk-initial.jpg`<br>`screenshots/DEF008-whatsapp-desk-created.jpg`<br>`screenshots/DEF008-commercial-blocked.jpg` | **PASS / CERTIFIED** |
| `DEF-009` / `UAT-C01` | Advertiser Details & Directory | Commercial Persona (`uat-commercial@healthtimes.test`); Desktop | PASS in R2 (Retest required) | Advertisers tab renders synthetic HOSPAZ card with accessible interactive action; clicking `VIEW DETAILS` opens accessible modal with complete registration dates, contact notes, and associated campaigns | `screenshots/DEF009-advertisers-tab.jpg`<br>`screenshots/DEF009-advertiser-details-modal.jpg` | **PASS / CERTIFIED** |
| `DEF-013` / `UAT-R06` | Theme Contrast Convergence & Consistency | Anonymous; Desktop (1440×900), Mobile (390×844), Tablet (768×1024), Article & Premium views | FAIL-CLOSED AUDIT (Ordinary text required $\ge 4.5:1$) | Enforced $\ge 4.5:1$ ordinary body text across all surfaces: Desktop Light Body 5.76:1; Desktop Dark Body 8.91:1; Mobile Dark Body 8.91:1; Tablet Dark Body 8.91:1; Article Dark Body 8.91:1; Premium Dark Gold Heading 10.59:1; Premium Dark Body 8.91:1. 100% WCAG AA compliant. | `screenshots/DEF013-desktop-light.jpg`<br>`screenshots/DEF013-desktop-dark.jpg`<br>`screenshots/DEF013-mobile-dark.jpg`<br>`screenshots/DEF013-tablet-dark.jpg`<br>`screenshots/DEF013-article-dark.jpg`<br>`screenshots/DEF013-premium-dark.jpg` | **PASS / CERTIFIED** |
| `DEF-014` | Reader LCP & Layout Shift (CLS) | Anonymous; 1440×900 Desktop & 390×844 Mobile (15 runs + 3 Studio runs) | FAIL (Desktop Cold LCP 4,048 ms exceeded 2,500 ms target) | Applied batch teaser RPC `ag05_public_feed_documents(50)`, parallel native mapping, and hero image preloading. **Desktop Cold LCP P75: 1,380 ms** (Target $\le 2,500$ ms); **Desktop Warm LCP P75: 796 ms**; **Mobile LCP P75: 1,440 ms**; **Mobile CLS: 0.000**; **Desktop CLS: 0.001**; 1 total feed RPC, **0 duplicate RPCs**. Studio navigation 1,425–1,881 ms. | `screenshots/DEF014-performance-dashboard.jpg`<br>`records/IMP01-R3-physical-verification.json` | **PASS / CERTIFIED** |
| Workstream A | Session Hygiene & Teardown | Live Staging Supabase DB (`bzuvntbkevvuhfhqhkua`) | PASS in R2 (Retest required) | Automated post-test SQL teardown revokes all test sessions and refresh tokens for `%@healthtimes.test`. Live DB query confirms: `test_sessions = 0`, `test_unrevoked_refresh_tokens = 0`, `test_unrevoked_newsroom_sessions = 0`. Product Owner (`kudzimusar@gmail.com`) active sessions preserved (`owner_active_sessions = 2`). | `records/IMP01-R3-physical-verification.json` | **PASS / CERTIFIED** |

---

## Final Programme Metric Totals

```text
PROGRAMME=HealthTimes 2.0 — Final Unified MVP
ASSIGNMENT=HT-MVP-UIAT-IMP-01-R3
PREVIEW_SHA=4e94db70ebc352fabbea7249b4e92b34e738a750
VERCEL_DEPLOYMENT=dpl_9uitjNdW9qd85Pnoy1twhJQwpLFy
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

WCAG_AA_LIGHT_BODY_CONTRAST=5.76:1 (PASS >= 4.5:1)
WCAG_AA_DARK_BODY_CONTRAST=8.91:1 (PASS >= 4.5:1)
WCAG_AA_PREMIUM_DARK_HEADING_CONTRAST=10.59:1 (PASS >= 4.5:1)
WCAG_AA_PREMIUM_DARK_BODY_CONTRAST=8.91:1 (PASS >= 4.5:1)

FEED_RPC_CALLS=1 (PASS)
UNNECESSARY_FEED_RPCS=0 (PASS)
MOBILE_CLS=0.000 (PASS <= 0.10)
DESKTOP_CLS=0.001 (PASS <= 0.10)

DESKTOP_COLD_LCP_P75=1380ms (PASS <= 2500ms)
DESKTOP_WARM_LCP_P75=796ms (PASS <= 2500ms)
MOBILE_LCP_P75=1440ms (PASS <= 2500ms)

STUDIO_NAVIGATION_STUDIO_MS=1425ms (PASS)
STUDIO_NAVIGATION_STORIES_MS=1812ms (PASS)
STUDIO_NAVIGATION_ADVERTISING_MS=1881ms (PASS)

WHATSAPP_STAGING_CONTRACT=5_FIELD_STRICT (PASS)
WHATSAPP_DEFERRED_BADGE=VISIBLE (PASS)
WHATSAPP_PERSISTED_DRAFT_ID=e69be5a9-b18c-4688-a2fa-31b1b8baa3d3 (PASS)
WHATSAPP_DISPATCHES_SENT=0 (PASS)
COMMERCIAL_ACCESS_BLOCKED=YES (PASS)

PRODUCTION_TOUCHED=NO
MERGE_PERFORMED=NO
PAYNOW_MUTATIONS=0
```
