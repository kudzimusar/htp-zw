# HealthTimes MVP Physical UIAT Census Matrix (R2 Continuation)

| Test ID | Status | Persona / Viewport | Scope / Capability | Observed Physical Behavior | Evidence Artifacts | Certification Disposition |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **UAT-R01** | **PASS** | Anonymous Reader<br>375×667, 768×1024, 1440×900 | Home feed, hero, latest and publication visibility | Home feed loaded across all target viewports; verified Hero story `[UAT04B] Test Story 001` intact and synthetic boundary intact. | `R01-home-*.jpg`<br>(UIAT-01 inherited, verified intact) | Observed; Not signed |
| **UAT-R02** | **FAIL** | Anonymous Reader<br>375×667 (Mobile) | Category filter with clean route and active state | Clicking "Zimbabwe" filter changes content, but URL remains `https://healthtimes-staging-czazp4yi8-11-11.vercel.app/` without query params or path updates. No `aria-selected` or `aria-current` attributes are exposed. | `R02-zimbabwe-filter-phone-r2.jpg`<br>`DEF-003`<br>`remaining-cases-report.json` | Failed; Defect active |
| **UAT-R03** | **FAIL** | Anonymous Reader<br>375×667 (Mobile) | Article body/teaser and clean not-found | In-app navigation to article succeeds, but direct navigation or browser reload on `/article/uat04b-test-story-001` returns generic Vercel 404 (`404 NOT_FOUND`, `hnd1::...`). Article lacks semantic HTML heading and paragraph tags. | `DEF001-direct-article-404.jpg`<br>`DEF001-reload-article-404.jpg`<br>`DEF-001`, `DEF-004` | Failed; P1 Defect active |
| **UAT-R04** | **FAIL** | Anonymous Reader<br>375×667, 1440×900 | Bookmark and Saved persistence | Save button writes article slug to `localStorage['ht:nm04:reader:saved:v1']`, but navigating to `/saved` does not render durable saved article list, and offline download fails to store article body offline. | `DEF002-bookmark-offline.jpg`<br>`DEF002-saved-page.jpg`<br>`DEF-002` | Failed; P1 Defect active |
| **UAT-R05** | **BLOCKED** | Anonymous Reader<br>375×667 (Mobile) | Audio playback, pause and seek | Feature absence in MVP: `/listen` screen and `AudioCard` component explicitly render "Playback unavailable" and accessibilityLabel `"Audio playback unavailable"`. No playback controls or audio engine exist. | `Cards.tsx:426`<br>`listen.tsx:67` | Blocked; Feature not implemented |
| **UAT-R06** | **FAIL** | Anonymous Reader<br>375×667, 768×1024, 1440×900 | Dark theme, light theme, contrast & persistence | **Challenged by Owner Evidence & Re-evaluated**: On dark-scheme fresh load, 44/60 text elements fail WCAG AA contrast (1.08:1 to 2.05:1). Near-white text (`#F3F7FA`) renders on un-hydrated white background (`#FFFFFF`). `HealthTimesBrand` has hardcoded `#102A43` failing on dark paper (1.24:1). | `DEF013-*.jpg` (24 captures)<br>`DEF013-full-matrix.json`<br>`DEF-013` | Failed; P1 Defect active |
| **UAT-J01** | **BLOCKED** | Journalist / Reporter<br>1440×900 (Desktop) | Journalist sign-in and desk restrictions | No active Journalist staging identity exists in Supabase `auth.users` or `staff_profiles` (`status = 'active'`). All previous ephemeral reporter accounts are revoked. Publisher session simulation not permitted. | Supabase DB Attestation<br>`staff_profiles` query | Blocked; Test identity missing |
| **UAT-J02** | **FAIL** | Publisher/Owner substitute<br>1440×900 (Desktop) | Validated draft, counters and autosave | Required field validation is missing: Submitting or saving an empty story in `StudioStoryWorkspace.tsx` defaults `title: title \|\| "Untitled story"` and creates an `Untitled story` record on the server. | `StudioStoryWorkspace.tsx:361`<br>`DEF-006` | Failed; Defect active |
| **UAT-J03** | **PASS** | Publisher/Owner substitute<br>1440×900 (Desktop) | Valid image/attribution and MIME rejection | JPEG saved with attribution; `.txt` upload rejected with the required image-type message. | `J03-upload-success.jpg`<br>`J03-invalid-mime-rejected.jpg` | Observed; Not signed |
| **UAT-J04** | **BLOCKED** | Journalist / Reporter<br>1440×900 (Desktop) | Journalist submission without publish authority | No active Journalist test identity exists to test server-side role denial and workflow submission transition without publish permissions. | Supabase DB Attestation | Blocked; Test identity missing |
| **UAT-E01** | **BLOCKED** | Editor-in-Chief<br>1440×900 (Desktop) | Editor queue and role restriction | No active Editor-in-Chief test identity exists (`status = 'active'`). Furthermore, Review Queue row count (4 visible) disagrees with dashboard counter (116). | `DEF-007`<br>Supabase DB Attestation | Blocked; Test identity missing |
| **UAT-E02** | **BLOCKED** | Editor-in-Chief<br>1440×900 (Desktop) | Edit, note and immutable revision | Controlled edit and revision history work under Owner session, but genuine Editor RBAC attribution and isolation cannot be certified without an active Editor account. | Supabase DB Attestation | Blocked; Test identity missing |
| **UAT-E03** | **PASS** | Publisher/Owner<br>1440×900 (Desktop) | Publish and Reader visibility | Full review lifecycle completed, media promoted, status became Published, and Reader displayed the story. Test story `ac1d99cd-0329-46d2-901d-fbca149ac273` verified intact. | `E03-story-published.jpg`<br>`E03-reader-visible.jpg` | Explicitly authorized; Not signed |
| **UAT-E04** | **PASS** | Publisher/Owner<br>1440×900 (Desktop) | Hero update and restricted curation | UIAT story temporarily became Hero; original Hero story `5bcf5e89-8095-4d45-a85a-ba2529b9c31b` (`[UAT04B] Test Story 001`) restored and verified at placement rank 1. | `E04-*.jpg`<br>Supabase DB Attestation | Explicitly authorized; Not signed |
| **UAT-A01** | **FAIL** | Publisher/Owner<br>1440×900 (Desktop) | WhatsApp composition and preview | Controlled `DO NOT SEND` content composed, but backend contract validation rejects payload: `Unexpected field in broadcast input: message_mode`. | `A01-whatsapp-draft-contract-error.jpg`<br>`DEF-008` | Failed; P1 Defect active |
| **UAT-A02** | **FAIL** | Publisher/Owner<br>1440×900 (Desktop) | Staging queue without delivery | Same contract rejection (`message_mode`) blocks broadcast draft from being saved to the staging queue. | `DEF-008`<br>`P1-defects-reproduction.json` | Failed; P1 Defect active |
| **UAT-A03** | **BLOCKED** | Publisher/Owner<br>1440×900 (Desktop) | Responsive newsletter preview | Staging database table `contact_segments` contains 0 rows (`count = 0`). The UI intentionally enforces fail-closed behavior (`disabled={segments.length === 0}`), blocking campaign creation. | `StudioNewsletterDesk.tsx:1014`<br>SQL count check | Blocked; Staging fixture missing |
| **UAT-A04** | **PASS** | Publisher/Owner<br>1440×900 (Desktop) | Push draft, targeting and confirmation | Controlled push saved as DRAFT with topic/all devices/strict opt-in; fail-closed dispatch enforced. | `A04-push-draft-created-no-send.jpg` | Observed; Not signed |
| **UAT-C01** | **FAIL** | Commercial Manager<br>1440×900 (Desktop) | Advertiser directory and detail | HOSPAZ is visible in the directory, but the row is rendered as a non-interactive `<div>` with `cursor: auto`, no `role`, no `tabindex`, and no click handler. Clicking does not open detail view. | `C01-advertiser-directory-r2.jpg`<br>`C01-hospaz-after-click-r2.jpg`<br>`DEF-009` | Failed; P1 Defect active |
| **UAT-C02** | **PASS** | Commercial Manager<br>1440×900 (Desktop) | Orders and self-approval boundary | **UNBLOCKED IN R2**: Authenticated as `uat-commercial@healthtimes.test`. Verified operational Commercial Orders workspace ($3,000 revenue collected) and verified role boundaries (no self-approval controls exposed). | `C02-commercial-orders-r2.jpg`<br>`remaining-cases-report.json` | Observed; Not signed |
| **UAT-C03** | **PASS** | Commercial Manager<br>1440×900 (Desktop) | Campaign, placement, asset and zone | **UNBLOCKED IN R2**: Authenticated as `uat-commercial@healthtimes.test`. Verified Advertising Manager workspace, campaign listings, HOSPAZ campaign continuity, and inventory placements. | `C03-campaigns-placements-r2.jpg`<br>`remaining-cases-report.json` | Observed; Not signed |
| **UAT-C04** | **PASS** | Commercial Manager<br>1440×900 (Desktop) | Telemetry and test-persona logout | **UNBLOCKED IN R2**: Authenticated as `uat-commercial@healthtimes.test`. Verified user profile, station telemetry, and performed clean session logout via Account Menu popover, redirecting to `/`. | `C04-account-menu-popover.jpg`<br>`C04-commercial-after-logout-r2.jpg` | Observed; Not signed |
| **UAT-F01** | **PASS** | Publisher/Owner + accepted RBAC; desktop | 13-account balanced Trial Balance | UI displayed balanced USD 31,300 debits/credits; prior accepted denial evidence preserved. | `F01-trial-balance.jpg` | Observed; Not signed |
| **UAT-F02** | **PASS** | Publisher/Owner; desktop | Invoices, payments and synthetic classification | 12 invoices, two USD 1,500 bank-transfer payments and 23 synthetic customers displayed. | Finance UI + baseline | Observed; Not signed |
| **UAT-F03** | **PASS** | Publisher/Owner + accepted guard; desktop | Expense state and unbalanced guard | 12 synthetic expenses and GL viewed; no new posting; accepted trigger/security evidence used as allowed. | Finance UI + governing UAT pack | Observed; Not signed |
| **UAT-F04** | **PASS** | Publisher/Owner; desktop | Balance Sheet and P&L | Assets USD 10,500 = liabilities USD 0 + equity USD 10,500; P&L surplus USD 10,500. | `F04-balance-sheet.jpg`<br>`F04-profit-loss.jpg` | Observed; Not signed |
| **UAT-O01** | **PASS** | Publisher/Owner; desktop | Owner session and Publisher role | Active Publisher/Owner, Executive desk, MFA enforced, 76 capabilities visible. | `O01-owner-session.jpg` | Owner session observed; Not signed |
| **UAT-O02** | **PASS** | Publisher/Owner; desktop | Access all seven desks | My Work, Editorial, Audience, Commercial, Finance, Publisher and Administration physically traversed. | Cross-phase browser evidence | Owner session observed; Not signed |
| **UAT-O03** | **PASS** | Publisher/Owner; desktop | Staff directory and roles | Full-authority directory and 19-role catalogue visible; no permissions changed. | `O03-staff-roles-readonly.jpg`<br>`DEF-010` | Owner session observed; Not signed |
| **UAT-O04** | **PASS** | Publisher/Owner; desktop | Ordered immutable audit visibility | Reverse-chronological security events visible with no edit/delete controls; duplicate login events noted. | `O04-security-audit.jpg`<br>`DEF-011` | Owner session observed; Not signed |

---

## Census Summary Table

```text
TOTAL_CASES=30
PASSED=16
FAILED=8
BLOCKED=6
NOT_EXECUTED=0

P0_DEFECTS=0
P1_DEFECTS=5
P2_DEFECTS=9
P3_DEFECTS=0

HUMAN_OWNER_ACCEPTANCE=NOT_SIGNED
PRODUCTION_TOUCHED=NO
MERGE_PERFORMED=NO
```
