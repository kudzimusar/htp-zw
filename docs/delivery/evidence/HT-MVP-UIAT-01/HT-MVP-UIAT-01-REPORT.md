# HT-MVP-UIAT-01 — Physical UIAT Execution Report

## Disposition

`TARGETED_REMEDIATION_REQUIRED`

All 30 numbered cases were attempted through the protected Staging Preview. Fourteen passed, seven failed, and nine were blocked by missing persona identities or staging fixtures. No case was left unattempted. Four P1 product defects prevent final client acceptance: Reader deep-link routing, bookmark/offline persistence, WhatsApp draft staging, and advertiser detail access.

The specialist does not sign for the Human Owner. `HUMAN_OWNER_ACCEPTANCE=NOT_SIGNED`.

## Source and environment custody

| Authority | Verified value |
| --- | --- |
| Documentation authority | `ed1c02f3d273fe16b2318bb997bb362de220c8ab` |
| Release-governance authority | `3df501f8280ac6e983f3f640b70dc049626aa52b` |
| Application Preview SHA | `126f81c65e24d30167deb21c06c598e39bf8ea10` |
| Vercel deployment | `dpl_F17gteDKYCS2w7J5CtZfJBFihKw5` |
| Preview | `https://healthtimes-staging-czazp4yi8-11-11.vercel.app` |
| Environment | Staging, protected by Vercel SSO |
| Supabase | `bzuvntbkevvuhfhqhkua` |
| Migration tip observed | `20261030001134` (110 applied migrations) |
| Evidence branch | `docs/ht-mvp-uiat-01-physical-certification` |

The Preview `/build-info.json` identified the exact application SHA above. No Production endpoint, project, database, or alias was changed.

## Checklist result

| Metric | Count |
| --- | ---: |
| Checklist census | 30 |
| Attempted | 30 |
| Passed | 14 |
| Failed | 7 |
| Blocked | 9 |
| Not executed | 0 |
| P0 defects | 0 |
| P1 defects | 4 |
| P2 defects | 8 |
| P3 defects | 0 |

The complete case-by-case result is in [HT-MVP-UIAT-01-MATRIX.md](./HT-MVP-UIAT-01-MATRIX.md). Reproduction detail is in [HT-MVP-UIAT-01-DEFECTS.md](./HT-MVP-UIAT-01-DEFECTS.md).

## Persona outcomes

### Reader — `FAIL`

R01 and R06 passed across phone, tablet, and desktop. Category state changed but did not update the URL or expose selected-state semantics. In-app article opening and Premium teaser masking worked, but direct article URLs and reloads returned the generic Vercel 404. Bookmark/offline controls produced no durable state. No audio-capable story was available, so R05 remained blocked by fixture coverage.

### Journalist — `PARTIAL / BLOCKED_AUTH_RBAC`

No active Journalist test identity was available. Under the authorized Publisher/Owner session, a controlled synthetic draft was created, autosaved, received a valid JPEG with attribution, rejected a text-file MIME mismatch, and transitioned to `Submitted`. Required-field validation failed because an empty form created an `Untitled story`. Journalist-specific denial of publish/Finance/Commercial authority was not physically certified.

Controlled story:

- ID: `ac1d99cd-0329-46d2-901d-fbca149ac273`
- Slug: `uiat-01-synthetic-supervised-draft-20261031`
- Label: `[UIAT-01] Synthetic Supervised Draft — 2026-10-31`

### Editor — `PARTIAL / BLOCKED_AUTH_RBAC`

No active Editor test identity was available. The Publisher/Owner located the story, saved a controlled edit and formal review record, verified revision history, advanced the complete review lifecycle, staged the governed lead image, and published the story. Reader visibility was physically verified. The story was temporarily assigned as the homepage Hero, Reader presentation changed, and the original `[UAT04B] Test Story 001` Hero was restored and reverified. Editor-role-specific queue and mutation restrictions remain blocked.

### Audience — `FAIL`

WhatsApp composition reached a controlled `DO NOT SEND` draft, but save/stage failed with `Unexpected field in broadcast input: message_mode`; no broadcast record and no outbound delivery occurred. Newsletter composition was blocked by zero contact segments. Push composition succeeded as a draft only and was not approved or dispatched.

### Commercial — `FAIL / BLOCKED_AUTH_RBAC`

The advertiser directory rendered the single synthetic HOSPAZ advertiser, but its row did not open a detail view. All 16 commercial orders were visibly `CANCELLED`. Campaign/placement evidence was incomplete and the only visible placement was `BOUND_REHEARSAL`. No Commercial Manager identity was available to certify Finance denial or self-approval restrictions.

### Finance — `PASS_WITH_BOUNDARIES`

The protected Finance UI displayed the 13-account balanced Trial Balance, 12 synthetic invoices, two synthetic bank-transfer payments totalling USD 3,000, 12 synthetic expenses, the GL list, Balance Sheet, and Profit & Loss. Trial Balance debits and credits each displayed USD 31,300. Balance Sheet Assets USD 10,500 equalled Liabilities USD 0 plus Equity USD 10,500. P&L showed a synthetic USD 10,500 surplus. No Finance record was created, posted, deleted, paid, refunded, or reconciled. The unbalanced-journal guard used the accepted prior database/security evidence permitted by UAT-F03 rather than a new posting attempt.

### Publisher / Owner — `PASS_WITH_DATA_QUALITY_FINDINGS`

The signed-in Owner was visibly `Publisher / Owner`, assigned to the Executive desk, with full authority and 76 capabilities. The seven operating domains were physically traversed across the run. Staff, role collections, and security audit records were visible without changing permissions or sessions. The directory count was inconsistent (`200` tab label versus `201` virtualized rows), and three identical `staff.login` events were shown for one session and timestamp.

## Responsive and accessibility coverage

| Viewport | Result | Evidence |
| --- | --- | --- |
| 375 × 667 phone | `PASS_WITH_DEFECTS` | `R01-home-phone-375x667.jpg`, category, article, Premium and dark-mode captures |
| 768 × 1024 tablet | `PASS_WITH_DEFECTS` | `R01-home-tablet-768x1024.jpg` |
| 1440 × 900 desktop | `PASS_WITH_DEFECTS` | `R01-home-desktop-1440x900.jpg` |

No critical horizontal overflow was observed in the three target sizes. Accessibility weaknesses include missing semantic article headings/body structure, generic focusable containers for several Studio controls, and no programmatic selected state on Reader category filters.

## Authentication, RBAC, and session hygiene

- Owner authentication and `Publisher / Owner` authority were physically verified.
- Server-bound capability labels and the role catalogue were visible.
- Journalist, Editor, Audience, Commercial, and Finance persona-specific sessions were unavailable during this run; those cross-role denial checks are recorded as blocked where the case depended on the identity.
- No genuine Owner session was revoked or logged out.
- No specialist-controlled persona remained signed in at completion.
- Previously accepted synthetic Commercial/Finance session cleanup remained visible in the audit trail; it was not mutated during this unit.

## Financial and synthetic-data boundary

Read-only staging baseline:

```text
STAGING_INVOICES=12
ISSUED_INVOICES=3
PAID_INVOICES=2
VOID_INVOICES=7
VOID_INVOICE_TOTAL_USD=8050
STAGING_COMMERCIAL_ORDERS=16
UNCANCELLED_ORDERS=0
POSTED_JOURNAL_DEBITS_USD=22400
POSTED_JOURNAL_CREDITS_USD=22400
REVERSAL_INCLUSIVE_DEBITS_USD=31300
REVERSAL_INCLUSIVE_CREDITS_USD=31300
REALIZED_PRODUCTION_REVENUE_USD=0
```

All visible finance/commercial rows were treated as synthetic staging data. No business conclusion was drawn from them as realized revenue.

## Paynow and external-send boundary

The Premium page visibly reported `Membership options aren't available here yet` and `Online subscription enrolment is not open right now`. Public checkout therefore remained unavailable. No payment was initiated or simulated under this unit.

No WhatsApp, email, newsletter, push notification, or social post was externally sent. The controlled Push item remained a draft. The WhatsApp draft failed before a queue record was created.

## Controlled mutations and restoration

- Created one synthetic story and advanced it through controlled staging editorial review.
- Uploaded one JPEG test artifact, rejected one invalid text-file upload, and promoted the JPEG through the governed public-media gate.
- Published the synthetic story after explicit Owner authorization and verified Reader visibility.
- Temporarily replaced the existing synthetic Hero with the UIAT story, verified Reader presentation, then restored the original `[UAT04B] Test Story 001` Hero and reloaded Reader to verify restoration.
- Did not alter staff roles, sessions, Finance data, commercial orders, external providers, Production, or deployment aliases.

The synthetic story remains a clearly labelled staging artifact because the Published workflow exposed no safe unpublish/archive action during the supervised run. Its ID is retained above for a separately confirmed cleanup unit.

## Recommendation

`TARGETED_REMEDIATION_REQUIRED`

Acceptance should remain unsigned until the four P1 defects are remediated and retested, and appropriate Journalist, Editor, Audience, Commercial, and Finance identities are available for the blocked role-specific checks. A focused remediation unit should address Reader routing/persistence, WhatsApp input parity, and advertiser detail navigation, followed by a bounded physical retest of the failed and blocked cases.

