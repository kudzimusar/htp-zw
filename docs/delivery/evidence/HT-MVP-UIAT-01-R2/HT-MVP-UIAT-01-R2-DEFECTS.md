# HealthTimes MVP Physical UIAT Defect Log (R2 Continuation)

This register records all confirmed defects across physical browser execution for Programme: HealthTimes 2.0 — Final Unified MVP.

---

## DEF-001 — Direct article deep links and browser reloads return generic Vercel 404

```text
TEST_CASE_ID=UAT-R03, UAT-A01
SEVERITY=P1
CATEGORY=ROUTING, DEPLOYMENT_CONFIGURATION
ROLE=Anonymous Reader
BROWSER_AND_VIEWPORT=Chrome, 375×667, 1440×900
TARGET_URL=https://healthtimes-staging-czazp4yi8-11-11.vercel.app/article/uat04b-test-story-001
REPRODUCTION_STEPS:
1. Open https://healthtimes-staging-czazp4yi8-11-11.vercel.app/ in a new browser session.
2. Observe in-app navigation to an article works via client-side routing.
3. Paste direct article URL https://healthtimes-staging-czazp4yi8-11-11.vercel.app/article/uat04b-test-story-001 into address bar and press Enter.
4. Alternatively, while on an article page, trigger a browser reload (F5 / Cmd+R).
EXPECTED_BEHAVIOR:
Direct URL loads the article with full server-rendered or client-hydrated content.
ACTUAL_BEHAVIOR:
Returns generic Vercel 404 ("This page doesn’t exist... 404 NOT_FOUND, hnd1::...").
EVIDENCE_ARTIFACTS:
- DEF001-direct-article-404.jpg
- DEF001-reload-article-404.jpg
- records/P1-defects-reproduction.json
ROOT_CAUSE:
vercel.json defines a specific rewrite only for /studio/staff/:staffId -> /studio/staff/[staffId].html. It lacks a general dynamic route rewrite for /article/:id* -> /article/[id].html or fallback to index.html.
USER_IMPACT:
Readers cannot open shared links, bookmark article URLs, or refresh pages. Blocks all viral social distribution and organic search traffic.
RECOMMENDED_REMEDIATION: Work Order WO-01
```

---

## DEF-002 — Bookmark and offline persistence produce no durable state

```text
TEST_CASE_ID=UAT-R04
SEVERITY=P1
CATEGORY=CLIENT_PERSISTENCE, STORAGE
ROLE=Anonymous Reader
BROWSER_AND_VIEWPORT=Chrome, 375×667, 1440×900
TARGET_URL=https://healthtimes-staging-czazp4yi8-11-11.vercel.app/saved
REPRODUCTION_STEPS:
1. Navigate in-app to any public article.
2. Click "Save" button in the story action bar.
3. Observe live region announces "Saved" and slug is appended to localStorage['ht:nm04:reader:saved:v1'].
4. Navigate to /saved or click "Saved" in reader navigation.
5. Inspect the Reading Library.
EXPECTED_BEHAVIOR:
Saved article appears in the Saved Stories list with thumbnail, title, and offline access controls.
ACTUAL_BEHAVIOR:
The /saved page displays an empty reading library or fails to reconcile saved slugs against corpus data. Clicking "Offline" fails to download or persist the article body for offline reading.
EVIDENCE_ARTIFACTS:
- DEF002-bookmark-offline.jpg
- DEF002-saved-page.jpg
- records/P1-defects-reproduction.json
ROOT_CAUSE:
apps/mobile/app/saved.tsx relies on reading list state that fails to fetch article details when corpus hydration is deferred, and offline download workers do not cache full article content in CacheStorage/IndexedDB.
USER_IMPACT:
Readers in low-bandwidth or offline environments lose saved articles.
RECOMMENDED_REMEDIATION: Work Order WO-02
```

---

## DEF-003 — Category state is not route-addressable or programmatically selected

```text
TEST_CASE_ID=UAT-R02
SEVERITY=P2
CATEGORY=ACCESSIBILITY, ROUTING
ROLE=Anonymous Reader
BROWSER_AND_VIEWPORT=Chrome, 375×667
REPRODUCTION_STEPS:
1. Open Reader Home at https://healthtimes-staging-czazp4yi8-11-11.vercel.app/.
2. Click on category filter pill "Zimbabwe".
3. Inspect the address bar and DOM properties of the clicked pill.
EXPECTED_BEHAVIOR:
The URL updates to reflect the active filter (e.g., /?category=zimbabwe or /explore?category=zimbabwe), and the active button exposes aria-selected="true" or aria-current="page".
ACTUAL_BEHAVIOR:
Content filters in client memory, but the URL remains unchanged at / and the button exposes role=null, aria-selected=null, aria-current=null.
EVIDENCE_ARTIFACTS:
- R02-zimbabwe-filter-phone-r2.jpg
- records/remaining-cases-report.json
ROOT_CAUSE:
Category filter buttons in apps/mobile/app/(reader)/index.tsx mutate local component state without syncing with Expo Router search params, and use unstyled Pressable wrappers lacking accessibility state props.
USER_IMPACT:
Filtered feeds cannot be shared, bookmarked, or navigated by screen-reader users.
RECOMMENDED_REMEDIATION: Work Order WO-08
```

---

## DEF-004 — Article lacks semantic document heading and paragraph structure

```text
TEST_CASE_ID=UAT-R03
SEVERITY=P2
CATEGORY=ACCESSIBILITY, SEO
ROLE=Anonymous Reader
BROWSER_AND_VIEWPORT=Chrome, 375×667
REPRODUCTION_STEPS:
1. Open an article in-app and inspect the accessibility tree via Chrome DevTools.
2. Inspect the headline and body prose elements.
EXPECTED_BEHAVIOR:
Story title is exposed as an <h1> or aria-level="1" heading; body prose consists of semantic <p> elements.
ACTUAL_BEHAVIOR:
Headline and body are rendered as generic <div> containers with dir="auto", lacking semantic heading levels.
EVIDENCE_ARTIFACTS:
- UIAT-01 R03 evidence; DOM inspection logs
ROOT_CAUSE:
React Native Web Text components without accessibilityRole="header" or role="heading" default to generic <div> tags.
USER_IMPACT:
Assistive technology users cannot navigate articles by headings; SEO indexing is degraded.
RECOMMENDED_REMEDIATION: Work Order WO-08
```

---

## DEF-005 — Reader fallback feed repeats identical stories across multiple cards

```text
TEST_CASE_ID=UAT-R01
SEVERITY=P2
CATEGORY=DATA_FIXTURE, PRESENTATION
ROLE=Anonymous Reader
BROWSER_AND_VIEWPORT=Chrome, 1440×900
REPRODUCTION_STEPS:
1. Open Reader Home and scroll to Top Stories / Latest grid.
2. Inspect the story titles across adjacent cards.
EXPECTED_BEHAVIOR:
Cards display distinct editorial stories or empty slots if insufficient stories are published.
ACTUAL_BEHAVIOR:
The same story ("Inside Zimbabwe's Oncology Crisis...") repeats across 3 separate card positions.
EVIDENCE_ARTIFACTS:
- R01-home-desktop-1440x900.jpg
ROOT_CAUSE:
Fallback corpus generator in apps/mobile/src/services/migrated-corpus.ts pads empty layout slots with duplicate references to the same article when corpus length < required grid count.
USER_IMPACT:
Damages editorial credibility and gives the impression of broken content delivery.
RECOMMENDED_REMEDIATION: Data fixture remediation order
```

---

## DEF-006 — Empty required story form bypasses validation creating `Untitled story`

```text
TEST_CASE_ID=UAT-J02
SEVERITY=P2
CATEGORY=DATA_INTEGRITY, EDITORIAL_VALIDATION
ROLE=Journalist / Reporter
BROWSER_AND_VIEWPORT=Chrome, 1440×900
REPRODUCTION_STEPS:
1. Open Story Workspace at /studio/stories.
2. Click "+ New Story".
3. Leave Title and Body blank.
4. Click "Save Draft".
EXPECTED_BEHAVIOR:
Client validation displays inline error: "Story title is required" and blocks submission.
ACTUAL_BEHAVIOR:
System sets title: title || "Untitled story" and creates an Untitled story record on the server.
EVIDENCE_ARTIFACTS:
- J02-empty-required-fields-created.jpg
- Source: apps/mobile/src/ui/StudioStoryWorkspace.tsx:361
ROOT_CAUSE:
StudioStoryWorkspace.tsx handleSave handler explicitly defaults title: title || "Untitled story" without enforcing required field validation before calling services.newsroomStories.createStory().
USER_IMPACT:
Pollutes the newsroom editorial database and review queue with blank draft records.
RECOMMENDED_REMEDIATION: Work Order WO-07
```

---

## DEF-007 — Review Queue count disagrees with visible review queue rows

```text
TEST_CASE_ID=UAT-E01
SEVERITY=P2
CATEGORY=DATA_INTEGRITY, METRICS
ROLE=Editor-in-Chief
BROWSER_AND_VIEWPORT=Chrome, 1440×900
REPRODUCTION_STEPS:
1. Open Studio Review Queue at /studio/review-queue.
2. Observe dashboard badge counter vs. visible table rows.
EXPECTED_BEHAVIOR:
Dashboard counter exactly matches the number of pending review records.
ACTUAL_BEHAVIOR:
Dashboard displays 116 pending items while the visible list contains only 4 items.
EVIDENCE_ARTIFACTS:
- E01-review-queue-owner-session.jpg
ROOT_CAUSE:
Dashboard query aggregates all historical unarchived drafts across all workflow states, whereas Review Queue table filters strictly for workflow_status = 'submitted_for_review'.
USER_IMPACT:
Confuses editorial leadership regarding actual pending workload.
RECOMMENDED_REMEDIATION: Editorial query alignment order
```

---

## DEF-008 — WhatsApp broadcast draft payload contract error (`message_mode`)

```text
TEST_CASE_ID=UAT-A01, UAT-A02
SEVERITY=P1
CATEGORY=API_CONTRACT, AUDIENCE_DISTRIBUTION
ROLE=Audience Engagement Specialist / Owner
BROWSER_AND_VIEWPORT=Chrome, 1440×900
TARGET_URL=https://healthtimes-staging-czazp4yi8-11-11.vercel.app/studio/whatsapp
REPRODUCTION_STEPS:
1. Open Studio WhatsApp Desk at /studio/whatsapp.
2. Fill Title, Message Body, and Broadcast Channel.
3. Select "Standard News Update" template.
4. Click "Save as Staging Draft".
EXPECTED_BEHAVIOR:
Draft is validated and saved to the staging queue with DO NOT SEND flag.
ACTUAL_BEHAVIOR:
Validation fails immediately with client exception:
"Unexpected field in broadcast input: message_mode"
EVIDENCE_ARTIFACTS:
- A01-whatsapp-draft-contract-error.jpg
- records/P1-defects-reproduction.json
ROOT_CAUSE:
apps/mobile/src/ui/StudioWhatsAppDesk.tsx:228-234 submits message_mode, template_name, scheduled_at, timezone.
apps/mobile/src/domain/models.ts:3155 validateWhatsAppBroadcastCreateInput enforces a strict whitelist:
allowedKeys = new Set(['title', 'body', 'broadcast_type', 'channel_identity', 'related_story_id']) and throws an error on any extra key.
USER_IMPACT:
Audience team cannot compose, stage, preview, or schedule WhatsApp broadcasts.
RECOMMENDED_REMEDIATION: Work Order WO-03
```

---

## DEF-009 — Commercial advertiser directory row is non-interactive

```text
TEST_CASE_ID=UAT-C01
SEVERITY=P1
CATEGORY=COMMERCIAL_OPERATIONS, UI_INTERACTION
ROLE=Commercial Manager
BROWSER_AND_VIEWPORT=Chrome, 1440×900
TARGET_URL=https://healthtimes-staging-czazp4yi8-11-11.vercel.app/studio/advertising
REPRODUCTION_STEPS:
1. Authenticate as Commercial Manager (uat-commercial@healthtimes.test).
2. Open Advertising Desk at /studio/advertising.
3. Click "Advertisers" tab.
4. Locate "HOSPAZ" advertiser card/row.
5. Click on HOSPAZ row with mouse or attempt keyboard Enter/Space activation.
EXPECTED_BEHAVIOR:
Clicking the advertiser opens an Advertiser Detail drawer/modal showing billing info, contracts, and campaigns.
ACTUAL_BEHAVIOR:
Row is rendered as a plain non-interactive <div> (cursor: auto, role: null, tabindex: null, onclick: null). Clicking does nothing.
EVIDENCE_ARTIFACTS:
- C01-advertiser-directory-r2.jpg
- C01-hospaz-after-click-r2.jpg
- records/remaining-cases-report.json
ROOT_CAUSE:
apps/mobile/src/ui/StudioAdvertisingDesk.tsx:505-520 renders advertiser cards using <View style={styles.itemCard}> instead of an interactive <Pressable onPress={() => handleSelectAdvertiser(adv.id)}>.
USER_IMPACT:
Commercial team cannot inspect advertiser details, contracts, or placement history.
RECOMMENDED_REMEDIATION: Work Order WO-04
```

---

## DEF-010 — Staff & Roles directory edit controls absent or read-only

```text
TEST_CASE_ID=UAT-O03
SEVERITY=P2
CATEGORY=ADMINISTRATION, RBAC
ROLE=Publisher / Owner
BROWSER_AND_VIEWPORT=Chrome, 1440×900
REPRODUCTION_STEPS:
1. Open /studio/staff-roles as Publisher/Owner.
2. Select any staff member profile.
3. Attempt to update role assignment or capabilities.
EXPECTED_BEHAVIOR:
Admin controls allow reassigning roles or updating capability overrides.
ACTUAL_BEHAVIOR:
Directory displays staff members and 19-role catalogue in read-only mode; edit buttons are absent.
EVIDENCE_ARTIFACTS:
- O03-staff-roles-readonly.jpg
ROOT_CAUSE:
Staff role modification requires manual SQL migration or superadmin endpoint not wired to Studio UI.
USER_IMPACT:
Requires database administrator intervention to onboard or change staff roles.
RECOMMENDED_REMEDIATION: Administration enhancement order
```

---

## DEF-011 — Security audit log records duplicate login events

```text
TEST_CASE_ID=UAT-O04
SEVERITY=P2
CATEGORY=AUDIT_TELEMETRY, SECURITY
ROLE=Publisher / Owner
BROWSER_AND_VIEWPORT=Chrome, 1440×900
REPRODUCTION_STEPS:
1. Open /studio/security-audit after logging in.
2. Review recent audit log entries.
EXPECTED_BEHAVIOR:
A single login event is recorded per authentication transaction.
ACTUAL_BEHAVIOR:
Twin identical login events with identical timestamps are written to newsroom_audit_events.
EVIDENCE_ARTIFACTS:
- O04-security-audit.jpg
ROOT_CAUSE:
Both supabase.auth.onAuthStateChange listener and account-access.tsx sign-in callback emit audit events.
USER_IMPACT:
Inflates security telemetry logs by 2x.
RECOMMENDED_REMEDIATION: Telemetry deduplication order
```

---

## DEF-012 — Paynow public checkout gateway mock/configuration blocker

```text
TEST_CASE_ID=Owner Acceptance Verification (RPC 19)
SEVERITY=P2
CATEGORY=COMMERCIAL, PAYMENTS
ROLE=Anonymous Reader / Subscriber
REPRODUCTION_STEPS:
1. Execute node scripts/release/owner-acceptance-demonstration.mjs.
2. Inspect check 19: Paynow Public Checkout.
EXPECTED_BEHAVIOR:
Staging Paynow test merchant credentials initiate public test checkout.
ACTUAL_BEHAVIOR:
Checkout initiation is blocked due to missing staging Paynow merchant credentials.
EVIDENCE_ARTIFACTS:
- owner-acceptance-demonstration.mjs console output (18 passed, 0 failed, 1 blocked)
ROOT_CAUSE:
Paynow staging merchant ID and secret keys are not configured in staging environment.
USER_IMPACT:
End-to-end subscriber Paynow mobile money checkout cannot be certified on staging.
RECOMMENDED_REMEDIATION: Payments configuration order
```

---

## DEF-013 — Reader Light/Dark theme contrast and hydration desynchronization

```text
TEST_CASE_ID=UAT-R06 (Challenged by Owner Evidence)
SEVERITY=P1
CATEGORY=ACCESSIBILITY, THEMING, HYDRATION
ROLE=Anonymous Reader
BROWSER_AND_VIEWPORT=Chrome / Safari, Phone (375×667), Tablet (768×1024), Desktop (1440×900)
TARGET_URL=https://healthtimes-staging-czazp4yi8-11-11.vercel.app/
REPRODUCTION_STEPS:
1. Configure browser / OS system color scheme to "dark" (prefers-color-scheme: dark).
2. Clear localStorage / cookies to ensure fresh application load.
3. Open https://healthtimes-staging-czazp4yi8-11-11.vercel.app/.
4. Inspect the homepage, hero, story titles, and category navigation.
5. Measure computed color and backgroundColor across text elements.
6. Toggle appearance setting between Light and Dark.
7. Inspect article page and premium screen.
EXPECTED_BEHAVIOR:
All text elements maintain WCAG AA contrast (≥ 4.5:1 for normal text, ≥ 3:1 for large text). When dark scheme is active, container backgrounds render in dark palette (#0B1622) and text renders in light ink (#F3F7FA).
ACTUAL_BEHAVIOR:
On fresh dark-system load, 44 out of 60 text elements fail WCAG AA contrast.
Hero headline renders with color: rgb(243, 247, 250) (#F3F7FA) against backgroundColor: rgb(255, 255, 255), producing an illegible contrast ratio of 1.08:1!
Category navigation text renders with 1.34:1 contrast.
HealthTimes brand logo hardcodes color: #102A43, producing 1.24:1 contrast when dark theme paper is applied.
EVIDENCE_ARTIFACTS:
- DEF013-dark-system-home.jpg
- DEF013-desktop-fresh-load.jpg
- DEF013-phone-dark-home.jpg
- DEF013-tablet-light-home.jpg
- records/DEF013-full-matrix.json (60 elements measured across 3 viewports and 2 color schemes)
- records/DEF013-theme-report.json
ROOT_CAUSE:
1. SSR Hydration Desynchronization: Expo web export pre-renders static HTML with Light theme inline styles (background-color: rgba(255,255,255,1.00) on Page/ScrollView/SafeAreaView). On client hydration in dark mode, React Native Web updates child Text node colors to dark ink (#F3F7FA), but does NOT update the SSR container inline background style, leaving near-white text on white paper.
2. Hardcoded Ink: apps/mobile/src/ui/Brand.tsx:42 hardcodes color: "#102A43". In dark mode (#0B1622 paper), contrast drops to 1.24:1.
3. Missing CSS Variable Bridge: No CSS custom properties or data-theme attributes exist on <html> or <body>.
USER_IMPACT:
Primary news content is completely unreadable for any user with a dark system preference. Severely violates WCAG 2.1 AA accessibility standards.
RECOMMENDED_REMEDIATION: Work Order WO-05
```

---

## DEF-014 — Persistent Reader / Studio latency and layout instability

```text
TEST_CASE_ID=New Owner Finding 2 (Performance Investigation)
SEVERITY=P2 / ACCEPTANCE_BLOCKER
CATEGORY=PERFORMANCE, CORE_WEB_VITALS
ROLE=Anonymous Reader & Newsroom Staff
BROWSER_AND_VIEWPORT=Chrome Desktop (1440×900) & Mobile (375×667)
TARGET_URL=https://healthtimes-staging-czazp4yi8-11-11.vercel.app/
MEASURED_METRICS:
- Cold Desktop Home LCP: 2,956ms – 5,256ms (Median: 3,416ms) [POOR, fails 2.5s CWV threshold]
- Warm Desktop Home LCP: 1,672ms – 2,108ms (Median: 1,884ms)
- Mobile Home LCP: 2,388ms – 2,972ms (Median: 2,632ms) [NEEDS IMPROVEMENT]
- Cumulative Layout Shift (CLS): 0.274 [POOR, exceeds 0.10 CWV threshold]
- In-App Article Open: 1,030ms – 1,077ms (Median: 1,040ms)
- In-App Back Navigation: 1,034ms – 1,043ms (Median: 1,034ms)
- Category Switching: 429ms – 434ms (Median: 430ms)
- Search Input Debounce & Query: 612ms
- Studio Initial Load: 3,191ms
- Studio Desk Switch: 522ms – 534ms
- Theme Toggle: 224ms – 226ms
EVIDENCE_ARTIFACTS:
- records/DEF014-performance-report.json
ROOT_CAUSE:
1. Duplicate Parallel RPC Fetches: On homepage mount, ag05_public_feed_rows is invoked twice simultaneously over network (taking 2,386ms - 2,389ms on cold network).
2. Layout Shift: CLS 0.274 is caused by late resolution of 4 parallel Supabase RPCs before hero/card layout dimensions settle, shifting content downward by >250px.
3. Uncompressed Asset Transfer: Cold load initiates 250 requests transferring 1.26MB of unbundled JS and assets.
USER_IMPACT:
Noticeably sluggish cold load experience, layout jumping during reading, and failed Core Web Vitals for SEO.
RECOMMENDED_REMEDIATION: Work Order WO-06
```
