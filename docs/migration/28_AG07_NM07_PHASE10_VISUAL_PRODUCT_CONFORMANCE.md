# AG-07 + NM-07 Phase 10 — Visual / Product Conformance

## Working status

**PHASE 10 IN PROGRESS — BASELINE VISUAL EVIDENCE CAPTURED BEFORE PRODUCT REMEDIATION**

This document is the Phase 10 gap register and will become the final conformance receipt after bounded remediation and exact-head certification.

### Released authority

- Repository: `kudzimusar/htp-zw`
- Certified executable baseline under visual review: `8fef4c2e7863afd6d0118dda7e0cf42ebf96d85b`
- Accepted Phase 9 documentation closure: `86df1f08e0b3e578348227c30248e32437687352`
- Phase 9 PR: #27 — Draft / Open / Unmerged / Mergeable
- Phase 10 branch: `integration/ag07-nm07-phase10-visual-conformance`
- Design authority: `docs/native-mobile/DESIGN.md`
- Expected wireframe: `docs/native-mobile/assets/HEALTHTIMES_NATIVE_WIREFRAME_V1.png`
- Wireframe repository custody: **ABSENT**
- Unseen wireframe reconstructed or inferred: **NO**

The visual interpretation order remains security/authorization → accessibility → Master Plan functionality → DESIGN.md → wireframe if later supplied → platform conventions → implementation judgment.

## Baseline evidence — before product changes

No Reader/product source had been modified when the baseline visual jobs checked out the released executable directly.

### Web/PWA exact-baseline capture

Workflow: `Phase 10 Visual Baseline Evidence`

Run: `35862974381`

Job: `107187477046 — Baseline Web PWA visual capture`

Result: **SUCCESS**

Exact checkout:

- EXPECTED_SHA: `8fef4c2e7863afd6d0118dda7e0cf42ebf96d85b`
- CHECKED_OUT_SHA: `8fef4c2e7863afd6d0118dda7e0cf42ebf96d85b`

Artifact:

- `phase10-baseline-web-screenshots`
- artifact ID: `10750239377`
- digest: `sha256:7e8d16722a3a370d2bc643f544f6437cccc991dff66489a1e8b577e75d85a3a7`

Required Home viewports were captured at:

- 390 × 844
- 834 × 1112
- 1440 × 1000

Additional Reader surfaces captured include Explore, Search, Live, Watch, Listen, Saved, My HealthTimes, Edition, Premium, Notifications, Onboarding and Studio.

### Native capture

iOS Simulator and Android emulator jobs are still running against the same frozen baseline. Product remediation remains paused until those baseline screenshots are recorded.

## Baseline screen-by-screen conformance register

| Surface | Baseline classification | Exact finding before remediation |
| --- | --- | --- |
| Home — Web/PWA mobile | **MATERIAL GAP** | Baseline screenshot is blank after attempted hydration. |
| Home — Web/PWA tablet | **MATERIAL GAP** | Baseline screenshot is blank after attempted hydration. |
| Home — Web/PWA desktop | **MATERIAL GAP** | Baseline screenshot is blank after attempted hydration. |
| Responsive navigation — desktop | **MATERIAL GAP** | Desktop header navigation and mobile five-tab bar render simultaneously. |
| Explore | **MATERIAL GAP** | Functional structure exists, but ordinary Reader UI exposes internal taxonomy/migration language: “TAXONOMY GATEWAY”, “CANONICAL”, “LEGACY”, “Canonical desks”, “Legacy publication categories”. |
| Intelligent Search | **CONFORMS** | Dedicated search surface, editorial filters and no chat-first/unsupported AI answer UI. |
| Article Reader | **PENDING EVIDENCE** | Initial local route capture used a server-only canonical path and returned the not-found surface; a Reader-route capture is still required. |
| Live | **CONFORMS** | No authoritative live event is fabricated; empty state is clean and Live retains red semantic accent. |
| Watch | **MINOR GAP** | First-class destination exists, but current featured visual is weak/empty-looking when media artwork/source presentation is unavailable. No replacement media may be invented. |
| Listen | **MINOR GAP** | Supported surface exists, but public copy exposes implementation language about a “certified media playback adapter”. |
| Saved / Offline | **CONFORMS** | Saved, downloaded/offline and history are visibly distinct; no Premium body persistence relaxation observed. |
| My HealthTimes | **MATERIAL GAP** | List architecture is appropriate, but unsupported/internal entries are exposed to ordinary readers, including “Payment Methods” and “Growth & Commercial Readiness”. |
| Country / Edition | **CONFORMS** | Primary Edition, followed countries/regions, interests, and separate residence/billing semantics are preserved. |
| Premium | **MATERIAL GAP** | Strong editorial identity, but primary header lacks persistent Premium discovery and page copy is implementation-facing (“platform configuration”, “AUTHORITATIVE ACCESS POLICY”, product-ID/storefront configuration language). Commerce remains correctly fail-closed. |
| Advertising / HOSPAZ | **CONFORMS WITH CURRENT AUTHORITY** | Shared direct-ad treatment is provenance-backed; current HOSPAZ destination remains null/UNKNOWN and therefore non-clickable. |
| Notifications | **MINOR GAP** | Clear filters and empty state; “Notification authority” wording is more implementation-facing than editorial. |
| Onboarding / account | **CONFORMS** | Simple editorial onboarding with edition/interests/notifications and existing-account path. |
| Studio/Admin distinction | **CONFORMS / PARTIAL** | Studio is visually and conceptually distinct from Reader; server-assigned authority remains separate. Detailed Studio module review remains part of the final matrix. |

## Gap register

### P1 / material — VIS10-001: Home hydration produces a blank Reader

**Evidence:** exact-baseline Home screenshots are blank at mobile, tablet and desktop.

**Source diagnosis:** `apps/mobile/app/(reader)/index.tsx` conditionally returns for loading/error before a later `useMemo`, changing Hooks order when Home data resolves.

**Required bounded remediation:** make Hooks order unconditional without changing article/data authority or Home information architecture.

### P1 / material — VIS10-002: desktop duplicates mobile and desktop navigation

**Evidence:** exact desktop screenshots show the full desktop masthead navigation and the five-item mobile tab bar at the same time.

**Required bounded remediation:** keep the approved five-destination information architecture, but suppress the mobile tab bar at desktop width without altering mobile/native tabs.

### P1 / material — VIS10-003: Premium discovery and public copy do not read as finished publication product

**Evidence:** desktop header has Home / Explore / Live / Watch / My HealthTimes plus Search/Alerts but no persistent Premium entry. The Premium screen leads with truthful but implementation-facing store/configuration copy.

**Authority freeze:** storefront remains `configuration-required`, offers remain `[]`, subscriber/entitlement counts remain zero, and no price/product identifier/payment state may be invented.

**Required bounded remediation:** improve Premium discovery and publication-facing unavailable/member-access copy while keeping all commerce truth fail-closed.

### P1 / material — VIS10-004: Explore exposes implementation taxonomy vocabulary

**Evidence:** exact screenshot visibly labels “TAXONOMY GATEWAY”, “CANONICAL”, “LEGACY”, “Canonical desks”, and “Legacy publication categories”.

**Required bounded remediation:** retain accepted taxonomy data but present it as reader-facing desks/topics/categories, not migration/domain terminology.

### P1 / material — VIS10-005: My HealthTimes exposes unsupported/internal controls

**Evidence/source:** ordinary Reader list includes “Payment Methods” despite no configured payment surface and “Growth & Commercial Readiness”, an internal readiness concept.

**Required bounded remediation:** keep the approved personal control-center list but remove unsupported/internal Reader entries. Do not add payment methods, subscription state, devices or sessions that are not authoritative.

### P2 / minor — VIS10-006: secondary public copy exposes implementation details

Listen and Notifications contain implementation/authority terminology that weakens the premium-publication character. Remediation should be copy-only and must not imply unavailable playback or notification capabilities.

### Accepted / deferred product gaps

- Missing approved wireframe PNG: repository-custody gap; no reconstruction authorized.
- No authoritative Live inventory: acceptable; rail/state must collapse cleanly.
- Media artwork/playback that is not source-authoritative: do not fabricate.
- Storefront product IDs/prices/payment state: remain unavailable until authoritative configuration exists.
- HOSPAZ destination/schedule/placement conditions: remain UNKNOWN/null.
- Physical-device owner UAT and production/store release remain outside Phase 10.

## Safety / mutation receipt so far

- Product runtime changed before baseline capture: **NO**
- Production deployment: **NO**
- Primary staging alias movement: **NO**
- Database mutation: **NO**
- Migration replay/reset/ledger mutation: **NO**
- Storage cleanup: **NO**
- DNS/MX change: **NO**
- Provider activation: **NO**
- App Store / Play Store submission: **NO**
- PR merge: **NO**
- Phase 11 release: **NO**
