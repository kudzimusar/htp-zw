# HT-MVP-G3-LOCAL-FIRST-UAT-LR03 — Physical Acceptance, CI Classification & Client-Readiness Closure

**Programme:** `HT-MVP-PUBLIC-LAUNCH-01`  
**Controlling Issues:** [#147](https://github.com/kudzimusar/htp-zw/issues/147) (Programme), [#152](https://github.com/kudzimusar/htp-zw/issues/152) (G2 Operational Authority), [#154](https://github.com/kudzimusar/htp-zw/issues/154) (G3 Application / Client-Readiness Authority)  
**Repository:** [kudzimusar/htp-zw](https://github.com/kudzimusar/htp-zw)  
**Controlling PR:** [#159](https://github.com/kudzimusar/htp-zw/pull/159) (`fix/ht-mvp-owner-uat-p0-launch-rc1` — Draft / open / unmerged)  
**Approved Source SHA:** `4dae91fafc059f46b4fb8692ca7ad97654ba31af` (Formal Review `#5988167688` — `APPROVED` under recorded Owner governance exception)  
**Prior Evidence:** [LR02 Receipt](https://github.com/kudzimusar/htp-zw/issues/154#issuecomment-7033249432) | [Moderator Review](https://github.com/kudzimusar/htp-zw/issues/154#issuecomment-7033314466)  
**Programme Progress Metric:** `NOT_BASELINED`  
**Proposed Final Outcome:** `READY_FOR_OWNER_PHYSICAL_SIGNOFF`  
**Sanitization Statement:** Sanitized for public Issue #154 archival. Zero `.env.local` contents, credentials, tokens, Staging project hostnames/secrets, or private personal/network identifiers are disclosed.

## 1. Runtime & Source Custody (Verified)

- **Exact Source SHA:** `4dae91fafc059f46b4fb8692ca7ad97654ba31af` (`fix(g3,b2): reject conflicting WordPress author IDs and guard unresolved byline routes (HT-MVP-G3G5-R7)`). Zero unapproved commits pushed to [PR #159](https://github.com/kudzimusar/htp-zw/pull/159); parallel Draft [PR #160](https://github.com/kudzimusar/htp-zw/pull/160) and [PR #161](https://github.com/kudzimusar/htp-zw/pull/161) remain untouched.
- **Active Local Server Custody:** Single Expo Web Node process actively listening on wildcard `*:8091` (`LISTEN`), serving `http://localhost:8091` and trusted local LAN `http://<LOCAL_LAN_IP>:8091`. Preserved undisturbed; not exposed publicly.
- **Runtime Mode:** `APP_ENV=development`, `EXPO_PUBLIC_HEALTHTIMES_SERVICE_MODE=source-parity`, `hasStagingConfig === false`, Cloudflare media mirror `https://healthtimes-media.pages.dev` active.

## 2. Six-Width & Multi-Route UAT Matrix (Honest Custody)

Agent-sandboxed Playwright Chromium (`chromium_headless_shell-1187`) remains `BLOCKED_LOCAL_SANDBOX` under macOS Seatbelt (`SIGSEGV` / `kill EPERM`). Rather than fabricating browser results, a deterministic Owner-Terminal runner has been authored at `docs/owner-uat/run-lr03-six-width-uat.mjs` to execute real unsandboxed Chromium across all 6 widths (`279`, `360`, `390`, `768`, `1280`, `1920`) and all 13 Reader routes/surfaces, capturing screenshots, horizontal overflow, console/CSP/402 errors, accessibility alt-text checks, Share control presence, and Cloudflare image rendering.

| Route / Surface | Path | 279px | 360px | 390px | 768px | 1280px | 1920px | Static / Code Verification |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Home | `/` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | Verified live on `localhost:8091` by Owner (`DEVELOPMENT`, `SOURCE-PARITY`, 0x 402) |
| Explore | `/explore` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | Route present (`app/(reader)/explore.tsx`), included in LR03 runner |
| Public Article & Share | `/article/source-ahf-urges-zimbabwe-to-join-borrowers-forum-amid-debt-crisis` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | Cloudflare hero + Share control asserted in LR03 runner |
| Premium Article Boundary | `/article/source-zimbabwe-strengthens-social-contracting-as-hiv-donor-funding-shrinks` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | Fail-closed `bodyHtml: null` + PremiumPaywall verified by offline tests & LR03 runner |
| Authors Directory | `/authors` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | 6 verified writers (`R7-B2` 14/14 tests PASS), included in LR03 runner |
| Author Profile | `/author/michael-gwarisa` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | Unresolved byline route guard verified (`4dae91fa`), included in LR03 runner |
| Search | `/search` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | Route present (`app/(reader)/search.tsx`), included in LR03 runner |
| Live | `/live` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | Route present (`app/(reader)/live.tsx`), included in LR03 runner |
| Watch | `/watch` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | Route present (`app/(reader)/watch.tsx`), included in LR03 runner |
| Saved | `/saved?tab=saved` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | Verified in `app/saved.tsx`, included in LR03 runner |
| History | `/saved?tab=history` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | Verified in `app/saved.tsx` (`active === "history"`), included in LR03 runner |
| Premium Landing | `/premium` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | Configuration-required fail-closed storefront verified, included in LR03 runner |
| My HealthTimes & Nav | `/my` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | `BLOCKED_LOCAL_SANDBOX` | Links to Saved, Downloads, History, Edition, Appearance, Premium verified |

### Deterministic Owner-Terminal Execution Command

Run from repository root while `http://localhost:8091` is running:

```bash
node docs/owner-uat/run-lr03-six-width-uat.mjs
```

Outputs full-page PNGs to `docs/owner-uat/lr03-screenshots/` and machine-readable JSON to `docs/owner-uat/lr03-results.json`.

## 3. Physical-Device LAN UAT Matrix (Honest Custody)

Real hardware is tracked strictly separately from desktop browser emulation and emulators. Untested devices are **never** marked `PASS`.

| Device Category | Test Mode | Status | Required Owner Verification over Trusted LAN (`http://<LOCAL_LAN_IP>:8091`) |
| :--- | :--- | :--- | :--- |
| Physical iPhone (Safari) | Real Device (LAN) | `PENDING_OWNER_DEVICE_EXECUTION` | Home, Public/Premium Articles, Share sheet, Authors, Search, Saved/History, zero horizontal overflow, zero 402 |
| Physical Android Phone (Chrome) | Real Device (LAN) | `PENDING_OWNER_DEVICE_EXECUTION` | Same route/overflow/media/402 checklist on real Android viewport |
| Physical Tablet (iPad / Android) | Real Device (LAN) | `PENDING_OWNER_DEVICE_EXECUTION` | Tablet breakpoint (`~768px–1024px`) navigation, cards, typography, media rendering |
| Desktop Browser Emulation (Playwright) | Automated Emulation | `READY_IN_OWNER_TERMINAL` | Run `node docs/owner-uat/run-lr03-six-width-uat.mjs` across `279/360/390/768/1280/1920px` |

## 4. Cloudflare Media & CSP Verification

- **CSP Audit (`vercel.json`):** `Content-Security-Policy` explicitly permits `https://healthtimes-media.pages.dev` across `img-src`, `media-src`, and `connect-src`, with a `301` redirect from `/wp-content/uploads/:path*` to `https://healthtimes-media.pages.dev/wordpress/:path*`. Zero CSP blocks for Cloudflare media.
- **7 Approved Archival Mappings (Checked by `run-lr03-six-width-uat.mjs` via live `HEAD` + DOM `naturalWidth > 0`):**
  1. `wordpress/2026/09/zimbabwe-social-contracting-hiv-financing-dialogue.jpg` (`image/jpeg`, Premium)
  2. `wordpress/2026/09/enerst-chikwati-ahf-zimbabwe-country-director.jpeg` (`image/jpeg`, Public)
  3. `wordpress/2026/01/enhanced_1200x665.jpg` (`image/jpeg`, Public)
  4. `wordpress/2026/09/dr-neddy-makonza-zimbabwe-fourth-female-orthopaedic-surgeon.png` (`image/png`, Public)
  5. `wordpress/2026/09/Chief-Nyamaropa.jpeg` (`image/jpeg`, Public)
  6. `wordpress/2026/09/aids-2026-protest-hiv-indigenous-people-fiji-creative-commons-https-creativecommons-org-licenses-by-sa-4-0.jpg.png` (`image/png`, Public)
  7. `wordpress/2026/09/zimbabwe-parliamentarians-not-in-my-constituency-teenage-pregnancy.jpg` (`image/jpeg`, Public)
- **3 Unapproved Editorial Leads (`HT-FB-002` — Preserved Unlinked):** `doctor-playing-with-child-cleft-lip-zimbabwe-medical-mission.jpg`, `Africa-led-SUPPRESS-LA-trial-to-prevent-mother-to-child-HIV-transmission.png`, and `datcitizen-backpack-walk-women-girls-harare-zimbabwe.jpg.jpg` remain unwired pending explicit Publisher/Owner confirmation; the LR03 runner asserts zero accidental leakage into the rendered DOM.
- **Live HTTP/MIME Execution Note:** Direct network `HEAD` probes from the agent sandbox are blocked by policy; executing `node docs/owner-uat/run-lr03-six-width-uat.mjs` in Owner Terminal captures live HTTP status, MIME type, byte length, and rendered DOM proof for all 7 objects.

## 5. CI Failure Classification Register (All 14 Exact-Head Failed Workflows)

Every failing workflow at `4dae91fafc059f46b4fb8692ca7ad97654ba31af` has been traced to source code and workflow definitions. **Zero `PRODUCT` or `SECURITY` regressions were found.**

### Deep-Dive on the Three Specific Investigations

1. **`apps/mobile/tests/source-parity-media-integrity.test.mjs` (`ENVIRONMENT` + `HARNESS`):**
   - `MEDIA_PROVENANCE_REGISTER` hardcodes `expectedMirrorPath` to `<STAGING_SUPABASE_HOST>/storage/v1/object/public/migrated-media/wordpress/...` and executes live `fetch(url, { method: "HEAD" })` asserting HTTP `200`.
   - Even with Cloudflare media enabled, this test still queries the Staging Supabase storage origin, which returns **HTTP 402** due to billing/quota hold.
2. **HOSPAZ RPC Failure — `apps/mobile/tests/premium-hospaz-convergence.test.mjs` (`ENVIRONMENT`):**
   - Reads `EXPO_PUBLIC_SUPABASE_URL` from `apps/mobile/eas.json` (`build.staging.env`) and calls live POST `rpc("ag05_hospaz_direct_ad_preview", {})` (Test 2) and `rpc("ag05_public_story_document", ...)` (Test 6).
   - Both fail solely on Staging Supabase HTTP 402. All offline product/security assertions (Tests 1, 3–5, 7–12: portable CP5 projection, fail-closed non-clickable AdSlot, Premium paywall, offline rejection, configuration-required storefront, non-personalized analytics) PASS.
3. **Android Maestro `"Top Stories"` Assertion — `apps/mobile/e2e/phase10-android-visual.yaml` & `.github/workflows/phase10-visual-conformance.yml` (`ENVIRONMENT` + `HARNESS`):**
   - In `phase10-visual-conformance.yml`, `candidate-ios` runs in `APP_ENV=development` + `source-parity`, whereas `candidate-android` sets `EXPO_PUBLIC_HEALTHTIMES_SERVICE_MODE: staging` (inheriting top-level Staging Supabase config).
   - On launch, `app/(reader)/index.tsx` calls `services.articles.getHome()` against Staging Supabase, receives **HTTP 402**, and renders `z.error.message` instead of `<SectionHeader title="Top Stories" />`, causing Maestro's `extendedWaitUntil: { visible: "Top Stories", timeout: 240000 }` to time out.

### Full 14-Workflow Classification Matrix

| # | Workflow File | Classification | Root Cause Summary |
| :--- | :--- | :--- | :--- |
| 1 | `ag05-nm07-phase7-premium-hospaz.yml` | `ENVIRONMENT` | Live Staging Supabase RPCs (`ag05_hospaz_direct_ad_preview`, `ag05_public_story_document`) return HTTP 402. |
| 2 | `native-reader-product.yml` | `ENVIRONMENT` + `HARNESS` | Calls `test:source-parity` (hardcoded Supabase Storage HEAD 402), `test:premium-hospaz` (RPC 402), `test:migrated-corpus` (402), `test:nm05-premium-live` (402). |
| 3 | `native-mobile.yml` | `ENVIRONMENT` | Runs live Staging connectivity (`test:staging`) against Staging Supabase HTTP 402. |
| 4 | `native-certification.yml` | `ENVIRONMENT` + `PHYSICAL_UAT` | Staging Supabase 402 + native binary/emulator Maestro dependency. |
| 5 | `nm07-phase6-migrated-corpus.yml` | `ENVIRONMENT` | Live migrated-corpus queries against Staging Supabase return HTTP 402. |
| 6 | `phase10-visual-conformance.yml` | `ENVIRONMENT` + `HARNESS` | Staging HOSPAZ web step + Android Maestro `staging` APK hit Staging Supabase 402 → Home renders error instead of `"Top Stories"`. |
| 7 | `phase10-visual-evidence.yml` | `ENVIRONMENT` | Staging-backed web visual capture fails on Staging Supabase HTTP 402. |
| 8 | `uat.yml` | `ENVIRONMENT` | Chromium UAT targets Staging Supabase corpus/RPCs returning HTTP 402. |
| 9 | `ui-wf01b-r2-owner-home-evidence.yml` | `ENVIRONMENT` | Staging-backed Owner Home evidence job hits Staging Supabase HTTP 402. |
| 10 | `ui01-phase3-discovery.yml` | `ENVIRONMENT` | Discovery conformance suite queries Staging Supabase returning HTTP 402. |
| 11 | `ui01-phase4-media.yml` | `ENVIRONMENT` + `HARNESS` | Media conformance triggers `source-parity-media-integrity.test.mjs` / Staging Supabase Storage HTTP 402. |
| 12 | `ui03-commercial-reader-conformance.yml` | `ENVIRONMENT` | Commercial reader live HOSPAZ/Premium checks hit Staging Supabase HTTP 402. |
| 13 | `ui04-phase5-reader-ownership.yml` | `ENVIRONMENT` | Reader ownership / edition conformance hits Staging Supabase HTTP 402. |
| 14 | `ui05-phase6b-accessibility-states-responsive.yml` / `ui06-phase6c-final-cross-device-certification.yml` | `ENVIRONMENT` | Responsive/cross-device suites invoke Staging-backed corpus/media checks hitting HTTP 402. |

*(Passing offline exact-head baseline remains verified: `ht-mvp-g5-web-foundation.yml` G5 Foundation CI, `tsc --noEmit` 0 errors, `201/201` offline mobile tests, `100%` offline root G5/CI/harness tests, and `npm run build:phase4:web` with 153 static routes.)*

## 6. Editorial & Source Truth (Preserved)

- **Archival Label:** `SOURCE_PARITY_VERIFIED_AT = "2026-09-21T00:00:00Z"` (21 stories dated `2026-07-23` to `2026-09-18`: `17` Public, `4` Premium) remains honestly labeled as archival — never relabeled as live journalism.
- **Author & Premium Integrity:** 6 verified writers (`Michael Gwarisa`, `Kudakwashe Pembere`, `Ntokozo Gudu`, `Patson Gumbo`, `Rukudzo Gota`, `Staff Reporter`), `R7-B2` WP author ID conflict (`13 vs 12`) verified fixed (`14/14` tests PASS), Premium stories remain fail-closed (`bodyHtml: null`, offline download rejected).
- **Unresolved External Authorities:**
  1. **Publisher/Owner Authority (`HT-FB-001`):** Required to supply `HT_P0_EDITORIAL_CLASSIFICATION_FILE` for post-Sept-21 public journalism.
  2. **Publisher/Owner Media Confirmation (`HT-FB-002`):** Required before wiring the 3 candidate Cloudflare archive leads.
  3. **Staging Supabase Billing/Quota Authority (G2 [#152](https://github.com/kudzimusar/htp-zw/issues/152)):** Required to clear HTTP 402 on Staging and apply the 2 pending migrations (`20261102160000`, `20261107130000`).

## 7. Readiness Distinction, Acceptance Recommendation & Next Dependency-Safe Action

- **Internally Usable Local Reader:** **YES** — working cleanly at `http://localhost:8091` (`source-parity`, Cloudflare media, zero 402s, zero reproduced `PRODUCT` defects).
- **Complete G3 Certification:** **PENDING** — requires Owner execution of `node docs/owner-uat/run-lr03-six-width-uat.mjs` (real unsandboxed Chromium across `279–1920px` + live Cloudflare HTTP/MIME proof) and physical iPhone/Android/tablet LAN verification.
- **Production-Equivalent Protected Client Preview:** **HELD** — requires completed G3 local sign-off + separate Owner authorization for `healthtimes-client-preview` (with SSO & read-only barrier); all G2–G6 release gates remain **HELD**.
- **Proposed Final Outcome:** **`READY_FOR_OWNER_PHYSICAL_SIGNOFF`**
- **Next Dependency-Safe Actions:**
  1. Run `node docs/owner-uat/run-lr03-six-width-uat.mjs` in Owner Terminal while port `8091` is active.
  2. Complete physical iPhone / Android / tablet check at `http://<LOCAL_LAN_IP>:8091`.
  3. Publish this sanitized LR03 receipt (and the resulting `lr03-results.json` summary) to [Issue #154](https://github.com/kudzimusar/htp-zw/issues/154) without pushing unapproved commits to [PR #159](https://github.com/kudzimusar/htp-zw/pull/159).
