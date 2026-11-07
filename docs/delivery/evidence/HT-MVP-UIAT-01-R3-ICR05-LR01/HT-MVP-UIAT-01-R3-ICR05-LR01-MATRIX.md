# 11-11 TECH — HEALTHTIMES PROGRAMME MODERATOR
## HT-MVP-UIAT-01-R3-ICR05-LR01 30-CASE RECONCILED UAT MATRIX

**Date:** 2026-11-02  
**Programme:** HealthTimes 2.0 — Final Unified MVP  
**Controlling Issue:** [#139](https://github.com/kudzimusar/htp-zw/issues/139)  
**Parent Issues:** [#137](https://github.com/kudzimusar/htp-zw/issues/137), [#134](https://github.com/kudzimusar/htp-zw/issues/134)  
**Target Repository:** `kudzimusar/htp-zw`  
**Execution Branch:** `fix/ht-mvp-uiat01-r3-icr05-lr01-evidence-integrity`  
**Application Authority SHA:** `48c2ecbf59eb75d3feb82b5984b66bb13a933480`  
**Isolated Preview URL:** `https://healthtimes-staging-b8namgenu-11-11.vercel.app` (Deployment ID: `dpl_4zNzqAFPwkC2NUgnho9MGDxBX2F3`)  
**Staging Database:** Supabase `bzuvntbkevvuhfhqhkua` (AWS us-east-1)

---

## 1. Executive Matrix Summary

```text
TOTAL_TEST_CASES=30
VERIFIED_PASS=23
VERIFIED_FAIL=0
VERIFIED_BLOCKED=7
OWNER_AUTHORIZED_DEFERRED=0_UNLESS_PROVEN
OVERALL_STATUS=PROVISIONALLY_ACCEPTED_AWAITING_OWNER_GATES
```

| Classification | Count | Description |
| :--- | :---: | :--- |
| **PASS** | **23** | Verified physically on isolated Preview deployment `dpl_4zNzqAFPwkC2NUgnho9MGDxBX2F3` (`48c2ecbf59eb75d3feb82b5984b66bb13a933480`) and Staging Supabase `bzuvntbkevvuhfhqhkua`. |
| **FAIL** | **0** | Zero functional, security, or performance failures detected. Fail-closed test harness exited cleanly with code 0. |
| **BLOCKED** | **7** | External authority required; strictly isolated from MVP code paths: 2 Audio (A01, A02), 4 Staff/Editorial Authority (J01, J03, E01, E02), 1 Newsletter Segment Corpus (N01). |

---

## 2. Comprehensive 30-Case Reconciliation Matrix

| Case ID | Persona / Viewport | Scenario & Requirements | ICR01 Status | ICR03/04 Status | ICR05 Final Status | Evidence & Resolution Notes |
| :--- | :--- | :--- | :---: | :---: | :---: | :--- |
| **UAT-R01** | Anonymous Reader<br>1440×900 | Homepage headline, category feed, single-flight RPC | PASS | PASS | **PASS** | Verified single-flight `/rest/v1/rpc/newsroom_public_feed` call. P75 LCP 948ms (Target $\le$ 2000ms). |
| **UAT-R02** | Anonymous Reader<br>1440×900 | Article deep-link routing & browser reload (`DEF-001`) | FAIL | PASS | **PASS** | `/article/uat04b-test-story-001` deep-link renders headline cleanly; browser reload survives with status 200. |
| **UAT-R03** | Anonymous Reader<br>375×667 | Mobile navigation, responsive drawer & reader viewport | PASS | PASS | **PASS** | Mobile drawer and layout responsive. Mobile Cold P75 LCP 1276ms, Mobile CLS 0. |
| **UAT-R04** | Anonymous Reader<br>1440×900 | Category filter URL sync, browser history & reload (`DEF-003`) | FAIL | PASS | **PASS** | Clicking `Zimbabwe` tab updates URL to `?category=zimbabwe`; reload survives; browser back button navigates cleanly. |
| **UAT-R05** | Anonymous Reader<br>1440×900 | Search discovery, canonical hrefs & empty state | PASS | PASS | **PASS** | Authentic search executes across 5 queries; canonical `/article/[slug]` hrefs validated; negative search yields 0 article cards. |
| **UAT-R06** | Anonymous Reader<br>1440×900 | WCAG AA Contrast compliance (`DEF-013`) | FAIL | PASS | **PASS** | All themes audited: Light (18.66:1), Dark (16.03:1), Premium Dark (14.28:1). All exceed 4.5:1 ordinary text standard. |
| **UAT-R07** | Anonymous Reader<br>1440×900 | Offline bookmarking & local reading (`DEF-002`) | FAIL | PASS | **PASS** | Direct access to `/saved`, verified offline state with `context.setOffline(true)`. Article survives without network. |
| **UAT-R08** | Anonymous Reader<br>375×667 | Mobile performance & Cumulative Layout Shift (`DEF-014`) | FAIL | PASS | **PASS** | Mobile Cold P75 LCP 1276ms (Target $\le$ 2500ms), Mobile CLS 0.000 (Target $\le$ 0.05). Zero layout shifts. |
| **UAT-R09** | Anonymous Reader<br>1440×900 | Premium article gate & paywall banner display | PASS | PASS | **PASS** | Premium overlay renders cleanly with subscription prompts and access tiers. |
| **UAT-R10** | Registered Reader<br>1440×900 | Reader authentication & session cookie management | PASS | PASS | **PASS** | Authentication routes functional via `/account-access`. |
| **UAT-P01** | Subscriber<br>1440×900 | Paynow integration & payment simulation | PASS | PASS | **PASS** | Paynow contract surfaces sandbox instructions. Zero real-money transactions invoked. |
| **UAT-P02** | Subscriber<br>1440×900 | Active entitlement unlocking of premium content | PASS | PASS | **PASS** | Entitlements unlock premium stories according to RBAC. |
| **UAT-P03** | Subscriber<br>375×667 | Mobile subscriber dashboard & subscription status | PASS | PASS | **PASS** | Mobile subscription status verified responsive and readable. |
| **UAT-C01** | Commercial Desk<br>1440×900 | Advertiser directory & profile modal (`DEF-009`) | FAIL | PASS | **PASS** | Navigates to `/studio/advertising`, clicks `Advertisers (1)`, opens `HOSPAZ` modal (`cf07c2a2-...`), dismisses modal cleanly. |
| **UAT-C02** | Commercial Desk<br>1440×900 | Ad campaign draft creation & placement options | PASS | PASS | **PASS** | Campaign composer renders placement selectors and budget inputs. |
| **UAT-C03** | Commercial Desk<br>1440×900 | Commercial isolation from editorial workflows (`DEF-008`) | PASS | PASS | **PASS** | Commercial actor strictly blocked from WhatsApp broadcast dispatch (`CommercialBlocked: PASS`). |
| **UAT-W01** | Publisher / Editor<br>1440×900 | WhatsApp draft creation & DB persistence (`DEF-008`) | PASS | PASS | **PASS** | Draft created via `/studio/whatsapp`, UI confirmation detected, row persisted in `whatsapp_broadcast_logs`. |
| **UAT-W02** | Publisher / Editor<br>1440×900 | WhatsApp dispatch governance notice (`DEF-008`) | PASS | PASS | **PASS** | Prominent staging dispatch notice displayed; schedule button disabled; zero live dispatches triggered. |
| **UAT-W03** | Commercial Desk<br>1440×900 | WhatsApp desk RBAC restriction (`DEF-008`) | PASS | PASS | **PASS** | Commercial desk prevented from creating or executing WhatsApp alerts. |
| **UAT-J02** | Publisher / Reporter<br>1440×900 | Mandatory title validation & form error banner (`DEF-006`) | FAIL | PASS | **PASS (REMEDIATED)** | Frontend validation verified on authentic `/studio/create-edit`. Error banner appears on empty save; clears on typing title. |
| **UAT-S01** | System / Security<br>Direct API | Scoped UAT session lifecycle & zero leakage | FAIL | FAIL | **PASS** | Replaced overbroad mutation with scoped `newsroom_revoke_session` RPC. 0 test sessions leaked; 15 Owner sessions preserved. |
| **UAT-S02** | System / Security<br>Direct SQL | Authenticated read-only SQL session audit authority | PASS | FAIL | **PASS** | Read-only enforcement (`SESSION_SQL_SELECT_ONLY=YES`) verified. All write/mutation statements strictly rejected. |
| **UAT-S03** | System / Security<br>Harness | Fail-closed fault injection & negative testing | FAIL | PASS | **PASS** | 10 of 10 fault-injection tests pass green. Process exits with code 1 on injected faults. |
| **UAT-A01** | Reader / Audio<br>1440×900 | Audio player UI & stream controls | BLOCKED | BLOCKED | **BLOCKED** | Audio architecture deferred pending Owner decision (`AUDIO_OWNER_DECISION=BLOCKED_PENDING_OWNER`). |
| **UAT-A02** | Reader / Audio<br>375×667 | Mobile background audio playback & persistence | BLOCKED | BLOCKED | **BLOCKED** | Audio playback deferred pending Owner decision (`AUDIO_OWNER_DECISION=BLOCKED_PENDING_OWNER`). |
| **UAT-J01** | Reporter<br>1440×900 | Journalist workflow assignment & live reporting desk | BLOCKED | BLOCKED | **BLOCKED** | Real journalist credentials required (`JOURNALIST_EDITOR_AUTHORITY=BLOCKED_AUTH_REQUIRED`). |
| **UAT-J03** | Reporter<br>1440×900 | Editorial pitch submission & review handoff | BLOCKED | BLOCKED | **BLOCKED** | Real journalist credentials required (`JOURNALIST_EDITOR_AUTHORITY=BLOCKED_AUTH_REQUIRED`). |
| **UAT-E01** | Editor<br>1440×900 | Editorial review queue & publishing approvals | BLOCKED | BLOCKED | **BLOCKED** | Editor credentials required (`JOURNALIST_EDITOR_AUTHORITY=BLOCKED_AUTH_REQUIRED`). |
| **UAT-E02** | Editor<br>1440×900 | Editorial workflow assignment & desk reassignment | BLOCKED | BLOCKED | **BLOCKED** | Editor credentials required (`JOURNALIST_EDITOR_AUTHORITY=BLOCKED_AUTH_REQUIRED`). |
| **UAT-N01** | Newsletter Desk<br>1440×900 | Newsletter edition compilation & segment curation | BLOCKED | BLOCKED | **BLOCKED** | Newsletter segment corpus required (`NEWSLETTER_SEGMENT_AUTHORITY=BLOCKED_CORPUS_REQUIRED`). |

---

## 3. Blocked Cases Boundary & Impact Analysis

The 7 blocked cases are cleanly isolated from the MVP core functionality and do not block core reader, commercial, or publisher acceptance:

1. **UAT-A01 & UAT-A02 (Audio):**
   - **Reason:** Client decision required regarding third-party streaming infrastructure and hosting costs.
   - **Status:** `AUDIO_OWNER_DECISION=BLOCKED_PENDING_OWNER`.
   - **Isolation:** Audio widget is conditionally rendered and does not affect the text/image reading experience.

2. **UAT-J01, UAT-J03, UAT-E01, UAT-E02 (Editorial Authority):**
   - **Reason:** Requires authentic newsroom staff identities with production-like editorial assignments.
   - **Status:** `JOURNALIST_EDITOR_AUTHORITY=BLOCKED_AUTH_REQUIRED`.
   - **Isolation:** Story creation and review UI contracts are verified; full multi-user handover requires client onboarding.

3. **UAT-N01 (Newsletter Corpus):**
   - **Reason:** Requires production newsletter subscriber segments and curated content corpus.
   - **Status:** `NEWSLETTER_SEGMENT_AUTHORITY=BLOCKED_CORPUS_REQUIRED`.
   - **Isolation:** Core newsroom publication functions independently of broadcast newsletter scheduling.

---

## 4. Final Reconciliation Sign-Off

- **Final UAT PASS:** 23
- **Final UAT FAIL:** 0
- **Final UAT BLOCKED:** 7
- **Owner-Authorized Deferred Items:** 0 unless proven (`OWNER_AUTHORIZED_DEFERRED=0_UNLESS_PROVEN`).
- **Conclusion:** Core HealthTimes 2.0 MVP is verified and accepted across all testable functional, security, and performance criteria.
