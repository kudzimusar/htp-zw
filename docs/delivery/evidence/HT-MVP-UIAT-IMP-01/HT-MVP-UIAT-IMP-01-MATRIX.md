# HT-MVP-UIAT-IMP-01 — Physical Remediation & Verification Matrix

All test cases and defect verifications were executed against Staging Preview SHA `74447c33fe12955636aa693610a6213790809810` on deployment `https://healthtimes-staging-8egptawhj-11-11.vercel.app`.

| Defect / Case ID | Target Feature | Identity / Viewport | Pre-Fix Status | Post-Fix Observed Behavior | Evidence Artifact | Operational Result |
|---|---|---|---|---|---|---|
| `DEF-001` / `UAT-R03` | Article Deep Linking & Refresh | Anonymous; 1440×900 Desktop | FAIL (Generic Vercel 404) | Slug URL `/article/uat04b-test-story-001` loads with HTTP 200; in-place reload retains story; UUID direct link `/article/5bcf5e89-8095-4d45-a85a-ba2529b9c31b` renders immediately | `DEF001-slug-direct.jpg`, `DEF001-uuid-direct.jpg` | **PASS / CERTIFIED** |
| `DEF-002` / `UAT-R04` | Bookmark & Offline Reading | Anonymous; 1440×900 Desktop | FAIL (No durable persistence) | Save adds story to `/saved` Bookmarks; Download adds story to Offline library with `AVAILABLE OFFLINE` indicator; full story renders completely while simulated offline from local repository | `DEF002-article-saved-offline.jpg`, `DEF002-saved-library-bookmarks.jpg`, `DEF002-saved-library-offline.jpg`, `DEF002-offline-reading-success.jpg` | **PASS / CERTIFIED** |
| `DEF-008` / `UAT-A01`, `UAT-A02` | WhatsApp Broadcast Draft Contract | Commercial Persona + Owner Preview; Desktop | FAIL (`message_mode` rejected) | Composition form accepts title, body, template name, and schedule; Commercial actor accessing `/studio/whatsapp` is barred with `SERVER AUTHORITY REQUIRED` fail-closed gate; 15 unit tests pass | `DEF008-whatsapp-desk-form.jpg`, `DEF008-whatsapp-desk-result.jpg` | **PASS / CERTIFIED** |
| `DEF-009` / `UAT-C01` | Advertiser Details & Directory | Commercial Persona (`uat-commercial@healthtimes.test`); Desktop | FAIL (Row non-interactive) | Advertisers tab renders HOSPAZ row with interactive button; clicking `VIEW DETAILS` opens accessible modal with registration date, contact notes, and associated campaigns | `DEF009-advertisers-tab.jpg`, `DEF009-advertiser-details-modal.jpg` | **PASS / CERTIFIED** |
| `DEF-013` / `UAT-R06` | Theme Contrast & State Consistency | Anonymous; Desktop (1440×900), Mobile (390×844), Tablet (768×1024) | FAIL (Unreadable pale headings / contrast mismatch) | Synchronous theme initialization eliminates hydration flash; Brand and H1 achieve 16.69:1 contrast in light mode and 16.92:1 contrast in dark mode (WCAG AA requirement >= 4.5:1); persists across reloads | `DEF013-light-mode-desktop.jpg`, `DEF013-dark-mode-desktop.jpg`, `DEF013-dark-mode-mobile.jpg`, `DEF013-light-mode-tablet.jpg` | **PASS / CERTIFIED** |
| `DEF-014` | Latency, CLS & Performance | Anonymous; 1440×900 Desktop | UNMEASURED / POOR | Deduplicated feed RPC calls (2 total); HomeSkeleton reserves layout space; Total Load: 3,310ms; TTFB: 30ms; DOMContentLoaded: 308ms; CLS: 0.000 (target <= 0.10) | `IMP01-physical-verification.json` | **PASS / CERTIFIED** |

---

## Metric Totals

```text
TARGET_DEFECTS=6
ATTEMPTED=6
REPAIRED=6
PHYSICALLY_VERIFIED=6
PASSED=6
FAILED=0
BLOCKED=0

WCAG_AA_CONTRAST_LIGHT=16.69:1 (PASS)
WCAG_AA_CONTRAST_DARK=16.92:1 (PASS)
CLS_MEASURED=0.000 (PASS)
TTFB_MEASURED=30ms (PASS)
FEED_RPC_CALLS=2 (PASS)

PRODUCTION_TOUCHED=NO
MERGE_PERFORMED=NO
```
