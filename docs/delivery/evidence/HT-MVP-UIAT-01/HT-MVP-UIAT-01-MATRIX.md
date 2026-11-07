# HT-MVP-UIAT-01 — 30-Case Physical Test Matrix

All rows were attempted against Preview SHA `126f81c65e24d30167deb21c06c598e39bf8ea10`. `Owner observed` means the run occurred in the supervised Owner session; it is not Owner acceptance or signature.

| ID | Status | Identity / viewport | Expected | Observed | Evidence | Owner review |
| --- | --- | --- | --- | --- | --- | --- |
| UAT-R01 | PASS | Anonymous; 375×667, 768×1024, 1440×900 | Home feed, hero, latest and publication visibility | Home loaded at all target sizes; published and synthetic boundaries visible | `R01-home-*.jpg` | Observed; not signed |
| UAT-R02 | FAIL | Anonymous; 375×667 | Category filter with clean route and active state | Zimbabwe filter changed content/state, but URL did not change and selected semantics were absent | `R02-zimbabwe-filter-phone.jpg`; DEF-003 | Observed; not signed |
| UAT-R03 | FAIL | Anonymous; 375×667 | Article body/teaser and clean not-found | In-app article and Premium teaser worked; direct URL/reload returned generic Vercel 404; semantic title/body absent | `R03-*.jpg`; DEF-001, DEF-004 | Observed; not signed |
| UAT-R04 | FAIL | Anonymous; phone/desktop | Bookmark and Saved persistence | Save/offline controls produced no durable state or acknowledgement; direct reload was also blocked by routing | DEF-002 | Observed; not signed |
| UAT-R05 | BLOCKED | Anonymous; 375×667 | Audio playback, pause and seek | No audio-capable story/fixture was available; playback could not be certified | `R05-audio-after-play-phone.jpg` | Observed; not signed |
| UAT-R06 | PASS | Anonymous; 375×667 | Dark theme and persistence | Dark theme applied, remained legible, and persisted during the tested navigation cycle | `R06-dark-theme-phone.jpg` | Observed; not signed |
| UAT-J01 | BLOCKED | Publisher/Owner substitute; desktop | Journalist sign-in and desk restrictions | No Journalist test identity was available; Owner perspective simulation explicitly did not alter server RBAC | O01 evidence | Observed; not signed |
| UAT-J02 | FAIL | Publisher/Owner substitute; desktop | Validated draft, counters and autosave | Empty required form created `Untitled story`; controlled story then autosaved with counters | `J02-empty-required-fields-created.jpg`; DEF-006 | Observed; not signed |
| UAT-J03 | PASS | Publisher/Owner substitute; desktop | Valid image/attribution and MIME rejection | JPEG saved with attribution; `.txt` upload rejected with the required image-type message | `J03-upload-success.jpg`, `J03-invalid-mime-rejected.jpg` | Observed; not signed |
| UAT-J04 | BLOCKED | Publisher/Owner substitute; desktop | Journalist submission without publish authority | Controlled story transitioned to `Submitted`; Journalist-specific denial could not be proven without that identity | `J04-submitted-for-review.jpg` | Observed; not signed |
| UAT-E01 | BLOCKED | Publisher/Owner substitute; desktop | Editor queue and role restriction | Controlled draft located; queue showed 4 visible items while dashboard reported 116; Editor identity unavailable | `E01-review-queue-owner-session.jpg`; DEF-007 | Observed; not signed |
| UAT-E02 | BLOCKED | Publisher/Owner substitute; desktop | Edit, note and immutable revision | Controlled edit, formal review and revision history succeeded; Editor attribution/RBAC could not be certified | `E02-*.jpg` | Observed; not signed |
| UAT-E03 | PASS | Publisher/Owner; desktop | Publish and Reader visibility | Full review lifecycle completed, media promoted, status became Published, and Reader displayed the story | `E03-story-published.jpg`, `E03-reader-visible.jpg` | Explicitly authorized; not signed |
| UAT-E04 | PASS | Publisher/Owner; desktop | Hero update and restricted curation | UIAT story temporarily became Hero and changed Reader; original UAT04B Hero was restored and reverified | `E04-*.jpg` | Explicitly authorized; not signed |
| UAT-A01 | FAIL | Publisher/Owner; desktop | WhatsApp composition and preview | Controlled `DO NOT SEND` content composed, but save rejected `message_mode` | `A01-whatsapp-draft-contract-error.jpg`; DEF-008 | Observed; not signed |
| UAT-A02 | FAIL | Publisher/Owner; desktop | Staging queue without delivery | Same contract error prevented creation of a staged dispatch; no external send occurred | `A01-whatsapp-draft-contract-error.jpg`; DEF-008 | Observed; not signed |
| UAT-A03 | BLOCKED | Publisher/Owner; desktop | Responsive newsletter preview | Zero contact segments; Create Campaign disabled; preview could not be produced | `A03-newsletter-no-segments-block.jpg` | Observed; not signed |
| UAT-A04 | PASS | Publisher/Owner; desktop | Push draft, targeting and confirmation | Controlled push saved as DRAFT with topic/all devices/strict opt-in; not approved or dispatched | `A04-push-draft-created-no-send.jpg` | Observed; not signed |
| UAT-C01 | FAIL | Publisher/Owner; desktop | Advertiser directory and detail | HOSPAZ listed, but its only row did not open a detail view | DEF-009 | Observed; not signed |
| UAT-C02 | BLOCKED | Publisher/Owner; desktop | Orders and self-approval boundary | All 16 orders visibly Cancelled and detail panel worked; Commercial Manager restriction not physically testable | Commercial UI observation | Observed; not signed |
| UAT-C03 | BLOCKED | Publisher/Owner; desktop | Campaign, placement, asset and zone | HOSPAZ campaign continuity visible; only `BOUND_REHEARSAL` placement, incomplete schedule/creative/zone proof | `C03-ad-placement-synthetic-boundary.jpg` | Observed; not signed |
| UAT-C04 | BLOCKED | Publisher/Owner; desktop | Telemetry and test-persona logout | No Commercial Manager session; Owner session was intentionally preserved | Audit/session evidence | Observed; not signed |
| UAT-F01 | PASS | Publisher/Owner + accepted RBAC evidence; desktop | 13-account balanced Trial Balance and denial boundary | UI displayed balanced USD 31,300 debits/credits; prior accepted denial evidence preserved | `F01-trial-balance.jpg` | Observed; not signed |
| UAT-F02 | PASS | Publisher/Owner; desktop | Invoices, payments and synthetic classification | 12 invoices, two USD 1,500 bank-transfer payments and 23 synthetic customers displayed | Finance UI + baseline | Observed; not signed |
| UAT-F03 | PASS | Publisher/Owner + accepted guard evidence; desktop | Expense state and unbalanced guard | 12 synthetic expenses and GL viewed; no new posting; accepted trigger/security evidence used as allowed | Finance UI + governing UAT pack | Observed; not signed |
| UAT-F04 | PASS | Publisher/Owner; desktop | Balance Sheet and P&L | Assets USD 10,500 = liabilities USD 0 + equity USD 10,500; P&L surplus USD 10,500 | `F04-balance-sheet.jpg`, `F04-profit-loss.jpg` | Observed; not signed |
| UAT-O01 | PASS | Publisher/Owner; desktop | Owner session and Publisher role | Active Publisher/Owner, Executive desk, MFA enforced, 76 capabilities visible | `O01-owner-session.jpg` | Owner session observed; not signed |
| UAT-O02 | PASS | Publisher/Owner; desktop | Access all seven desks | My Work, Editorial, Audience, Commercial, Finance, Publisher and Administration physically traversed | Cross-phase browser evidence | Owner session observed; not signed |
| UAT-O03 | PASS | Publisher/Owner; desktop | Staff directory and roles | Full-authority directory and 19-role catalogue visible; no permissions changed | `O03-staff-roles-readonly.jpg`; DEF-010 | Owner session observed; not signed |
| UAT-O04 | PASS | Publisher/Owner; desktop | Ordered immutable audit visibility | Reverse-chronological security events visible with no edit/delete controls; duplicate login events noted | `O04-security-audit.jpg`; DEF-011 | Owner session observed; not signed |

## Totals

```text
TOTAL=30
ATTEMPTED=30
PASSED=14
FAILED=7
BLOCKED=9
NOT_EXECUTED=0
```

