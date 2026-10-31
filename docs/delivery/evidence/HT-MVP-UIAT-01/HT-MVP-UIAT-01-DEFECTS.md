# HT-MVP-UIAT-01 — Defect Register

Preview SHA for every defect: `126f81c65e24d30167deb21c06c598e39bf8ea10`.

## DEF-001 — Reader article deep links fail

```text
TEST_CASE_ID=UAT-R03
SEVERITY=P1
CATEGORY=PRODUCT, ENVIRONMENT
ROLE=Anonymous Reader
BROWSER_AND_VIEWPORT=Chrome, 375x667 and desktop reload
REPRODUCTION_STEPS=Open an article in-app; copy/open or reload its article URL.
EXPECTED_BEHAVIOR=Published article renders; unknown slug shows an application not-found state.
ACTUAL_BEHAVIOR=Direct article URL and reload return the generic Vercel 404; in-app Back control is a no-op.
SCREENSHOT_OR_TRACE=R03-article-phone.jpg; R03-missing-article-phone.jpg
CONSOLE_NETWORK_EVIDENCE=Visible generic Vercel 404; no stack or SQL data exposed.
USER_IMPACT=Shared links and reloads break a core Reader journey.
RECOMMENDED_SPECIALIST=Web routing / Vercel deployment specialist
```

## DEF-002 — Bookmark and offline controls do not persist

```text
TEST_CASE_ID=UAT-R04
SEVERITY=P1
CATEGORY=PRODUCT
ROLE=Anonymous Reader
BROWSER_AND_VIEWPORT=Chrome, phone and desktop
REPRODUCTION_STEPS=Open a story; use Save/Offline; revisit Saved or refresh.
EXPECTED_BEHAVIOR=Visible saved state and durable local persistence.
ACTUAL_BEHAVIOR=Controls provide no acknowledgement or durable saved/offline state.
SCREENSHOT_OR_TRACE=R03-article-phone.jpg
CONSOLE_NETWORK_EVIDENCE=No visible state transition.
USER_IMPACT=Required personal reading workflow is unusable.
RECOMMENDED_SPECIALIST=Reader/PWA specialist
```

## DEF-003 — Category state is not route-addressable or programmatically selected

```text
TEST_CASE_ID=UAT-R02
SEVERITY=P2
CATEGORY=PRODUCT, ACCESSIBILITY
ROLE=Anonymous Reader
BROWSER_AND_VIEWPORT=Chrome, 375x667
REPRODUCTION_STEPS=Open Home; choose Zimbabwe.
EXPECTED_BEHAVIOR=Content filters, URL updates, and active filter exposes selected state.
ACTUAL_BEHAVIOR=Content/filter state changes but the URL remains unchanged and no selected-state semantics are exposed.
SCREENSHOT_OR_TRACE=R02-zimbabwe-filter-phone.jpg
CONSOLE_NETWORK_EVIDENCE=Not required; UI and address bar are sufficient.
USER_IMPACT=Filtering is not linkable and is ambiguous to assistive technology.
RECOMMENDED_SPECIALIST=Reader frontend/accessibility specialist
```

## DEF-004 — Article lacks semantic content structure

```text
TEST_CASE_ID=UAT-R03
SEVERITY=P2
CATEGORY=PRODUCT, ACCESSIBILITY
ROLE=Anonymous Reader
BROWSER_AND_VIEWPORT=Chrome, 375x667
REPRODUCTION_STEPS=Open a public story in-app and inspect the accessibility tree.
EXPECTED_BEHAVIOR=Article title is a heading and prose is exposed as document paragraphs.
ACTUAL_BEHAVIOR=Title/paragraph semantics are absent; content is exposed through generic containers.
SCREENSHOT_OR_TRACE=R03-article-phone.jpg
CONSOLE_NETWORK_EVIDENCE=Accessibility-tree observation.
USER_IMPACT=Screen-reader navigation and document comprehension are degraded.
RECOMMENDED_SPECIALIST=Accessibility specialist
```

## DEF-005 — Reader fallback feed repeats identical stories

```text
TEST_CASE_ID=UAT-R01
SEVERITY=P2
CATEGORY=DATA_FIXTURE, PRODUCT
ROLE=Anonymous Reader
BROWSER_AND_VIEWPORT=Chrome, all target viewports
REPRODUCTION_STEPS=Open Home and inspect Top Stories.
EXPECTED_BEHAVIOR=Distinct ranked stories or visibly empty fallback slots.
ACTUAL_BEHAVIOR=The same Clinical Trial Resilience story repeats across multiple cards.
SCREENSHOT_OR_TRACE=R01-home-desktop-1440x900.jpg; E04-original-hero-restored-reader.jpg
CONSOLE_NETWORK_EVIDENCE=Not required.
USER_IMPACT=Home appears incoherent and low quality.
RECOMMENDED_SPECIALIST=Reader/data-fixture specialist
```

## DEF-006 — Empty required story form creates a record

```text
TEST_CASE_ID=UAT-J02
SEVERITY=P2
CATEGORY=PRODUCT
ROLE=Publisher/Owner substitute for Journalist
BROWSER_AND_VIEWPORT=Chrome desktop
REPRODUCTION_STEPS=Open create-story; submit with required title/body fields empty.
EXPECTED_BEHAVIOR=Inline validation blocks creation.
ACTUAL_BEHAVIOR=An `Untitled story` record is created.
SCREENSHOT_OR_TRACE=J02-empty-required-fields-created.jpg
CONSOLE_NETWORK_EVIDENCE=Visible created record.
USER_IMPACT=Blank records pollute editorial queues and audit history.
RECOMMENDED_SPECIALIST=Newsroom editorial frontend/API specialist
```

## DEF-007 — Review Queue count disagrees with visible queue

```text
TEST_CASE_ID=UAT-E01
SEVERITY=P2
CATEGORY=DATA_FIXTURE, PRODUCT
ROLE=Publisher/Owner
BROWSER_AND_VIEWPORT=Chrome desktop
REPRODUCTION_STEPS=Compare Operating Room awaiting-approval count with Review Queue rows.
EXPECTED_BEHAVIOR=Counts derive from the same canonical authority.
ACTUAL_BEHAVIOR=Dashboard reported 116 while the queue displayed 4.
SCREENSHOT_OR_TRACE=E01-review-queue-owner-session.jpg
CONSOLE_NETWORK_EVIDENCE=Not captured; visible UI discrepancy.
USER_IMPACT=Editors cannot trust workload metrics.
RECOMMENDED_SPECIALIST=Newsroom data-contract specialist
```

## DEF-008 — WhatsApp draft input contract rejects the UI payload

```text
TEST_CASE_ID=UAT-A01, UAT-A02
SEVERITY=P1
CATEGORY=PRODUCT
ROLE=Publisher/Owner
BROWSER_AND_VIEWPORT=Chrome desktop
REPRODUCTION_STEPS=Compose a controlled broadcast and save/stage it.
EXPECTED_BEHAVIOR=Validated draft saves and may enter the disabled-provider staging queue.
ACTUAL_BEHAVIOR=Save fails with `Unexpected field in broadcast input: message_mode`.
SCREENSHOT_OR_TRACE=A01-whatsapp-draft-contract-error.jpg
CONSOLE_NETWORK_EVIDENCE=Exact sanitized UI error above; no payload or secret retained.
USER_IMPACT=WhatsApp composition and queue staging are unusable.
RECOMMENDED_SPECIALIST=Audience/API contract specialist
```

## DEF-009 — Advertiser row cannot open its detail view

```text
TEST_CASE_ID=UAT-C01
SEVERITY=P1
CATEGORY=PRODUCT
ROLE=Publisher/Owner
BROWSER_AND_VIEWPORT=Chrome desktop
REPRODUCTION_STEPS=Open Commercial advertiser directory; select HOSPAZ.
EXPECTED_BEHAVIOR=Authorized advertiser detail and controls open.
ACTUAL_BEHAVIOR=The row click produces no detail view or navigation.
SCREENSHOT_OR_TRACE=Commercial phase browser observation.
CONSOLE_NETWORK_EVIDENCE=No visible state or route change.
USER_IMPACT=Commercial staff cannot inspect or manage an advertiser.
RECOMMENDED_SPECIALIST=Commercial frontend specialist
```

## DEF-010 — Staff directory count is inconsistent

```text
TEST_CASE_ID=UAT-O03
SEVERITY=P2
CATEGORY=DATA_FIXTURE, PRODUCT
ROLE=Publisher/Owner
BROWSER_AND_VIEWPORT=Chrome desktop
REPRODUCTION_STEPS=Open Staff & Roles Directory.
EXPECTED_BEHAVIOR=Tab count equals the canonical result count.
ACTUAL_BEHAVIOR=Directory tab reports 200; the virtualized list reports 201 items.
SCREENSHOT_OR_TRACE=O03-staff-roles-readonly.jpg
CONSOLE_NETWORK_EVIDENCE=Visible UI discrepancy.
USER_IMPACT=Owner cannot trust staff census.
RECOMMENDED_SPECIALIST=RBAC/data-contract specialist
```

## DEF-011 — Duplicate login audit events share one session and timestamp

```text
TEST_CASE_ID=UAT-O04
SEVERITY=P2
CATEGORY=EVIDENCE_GAP, PRODUCT
ROLE=Publisher/Owner
BROWSER_AND_VIEWPORT=Chrome desktop
REPRODUCTION_STEPS=Open Active Sessions & Audit after Owner sign-in.
EXPECTED_BEHAVIOR=One canonical login event per session identity unless retries are explicitly distinguished.
ACTUAL_BEHAVIOR=Three identical `staff.login` rows show the same session identity and 2026-10-31 06:19 UTC timestamp.
SCREENSHOT_OR_TRACE=O04-security-audit.jpg
CONSOLE_NETWORK_EVIDENCE=Visible audit rows; raw tokens not captured.
USER_IMPACT=Audit evidence is noisy and may overstate login events.
RECOMMENDED_SPECIALIST=Security/audit specialist
```

## DEF-012 — Active billing-customer fixtures are duplicated

```text
TEST_CASE_ID=UAT-F02
SEVERITY=P2
CATEGORY=DATA_FIXTURE
ROLE=Publisher/Owner
BROWSER_AND_VIEWPORT=Chrome desktop
REPRODUCTION_STEPS=Open Finance Billing Customers and compare active UAT04B partner rows.
EXPECTED_BEHAVIOR=Distinct fixtures have distinct identifying data or are deduplicated.
ACTUAL_BEHAVIOR=Four active UAT04B Partner rows present as repeated fixture records.
SCREENSHOT_OR_TRACE=Finance UI observation and read-only baseline.
CONSOLE_NETWORK_EVIDENCE=Not required.
USER_IMPACT=Customer census and reconciliation are confusing in Staging.
RECOMMENDED_SPECIALIST=Finance data-fixture specialist
```

