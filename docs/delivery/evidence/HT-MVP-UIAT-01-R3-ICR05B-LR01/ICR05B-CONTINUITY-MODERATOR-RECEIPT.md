# HT-MVP-UIAT-01-R3-ICR05B-LR01 — Moderator continuity and release holds

**Controlling issue:** [#143](https://github.com/kudzimusar/htp-zw/issues/143). **Parent issue:** #141. Frozen R3 ICR05A SHA `e5f2fd7730317ae8edc63f71bb90349a53fd868c`. Branch `fix/ht-mvp-uiat01-r3-icr05b-final-ci-session-evidence`. Correct new **Draft PR #144**, based on frozen ICR05A branch. PR #136 is an unrelated older Draft head, not ICR05B review authority. All source changes are stacked on ICR05A and remain unmerged.

### Canonical acceptance census (historical baseline, NOT final cert)
```
ORIGINAL_30_CASE_IDS_AND_NAMES_UNCHANGED=YES
CASE_NAME_DRIFT=0
ORIGINAL_30_PASS=23
ORIGINAL_30_FAIL=0
ORIGINAL_30_BLOCKED=7
BLOCKED_CASE_IDS=UAT-R05,UAT-J01,UAT-J02,UAT-J04,UAT-E01,UAT-E02,UAT-A03
SUPPLEMENTAL_CASES=14_SEPARATE
OWNER_AUTHORIZED_DEFERRED=0
AUDIO=BLOCKED_PENDING_OWNER
STORY_TITLE_MIGRATION_STAGING=NOT_APPLIED
PUBLIC_PAYNOW=UNCHANGED
```

The preserved Staging application Preview [b8namgenu](https://healthtimes-staging-b8namgenu-11-11.vercel.app) remains SHA `48c2ecbf59eb75d3feb82b5984b66bb13a933480`, not the ICR05A evidence head nor any new ICR05B application commit. R5B changes the actual Reader app source, so a **new isolated exact-candidate Preview** must be obtained before asserting physically deployed product conformance.

### Governance
- Corrected portable ICR05A historical copies are stored alongside this file: REPORT, MATRIX, CORRIGENDUM. They preserve archive content and replace unportable `file:///` paths with immutable GitHub source links.
- ICR05A source executor uses **privileged Management API with fixed allowlisted queries**, not database read-only role.
- 23/0/7 historical acceptance remains in place; do not silently promote seven blocked prerequisites or alter 14 supplementary checks.
- Separate final exact-head CI for canonical Chromium, Native Reader and dedicated session/evidence is mandatory; failed mandatory workflow is explicitly recorded as FAILED/BLOCKED.
- Genuine nonimplementing independent reviewer must be appointed and actually submit findings on PR #144. An implementer-produced narrative is NOT an independent certification.

**No Production, merge, Paynow, unapproved Staging DDL, staff/Auth changes, external dispatches or Owner-authorized deferral.** Current run work is only bounded code/evidence commits and GitHub Actions/isolated Preview. Do not initiate further live UAT sessions without Owner-approved actor credentials and proper teardown.
