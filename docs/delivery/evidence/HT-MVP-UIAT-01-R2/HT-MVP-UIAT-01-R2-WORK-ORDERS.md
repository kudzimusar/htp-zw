# HealthTimes MVP Physical UIAT Engineering Remediation Work Orders

**Programme:** HealthTimes 2.0 — Final Unified MVP  
**Continuation Unit:** HT-MVP-UIAT-01-R2  
**Authority:** Programme Moderator & Independent UIAT Specialist  
**Rule:** UIAT Specialist does not silently patch product code. Implementation specialists must execute these work orders, followed by physical UIAT re-certification against the resulting deployment SHA.

---

## WO-01: Article Dynamic Deep-Link Routing Rewrites

- **Target Defect:** `DEF-001` (Severity: P1)
- **Affected File:** `vercel.json`
- **Observed Failure:** Direct navigation or browser refresh on `/article/:slug` returns generic Vercel 404 (`404 NOT_FOUND`).
- **Proposed Scope:**
  Update `vercel.json` to include rewrites for all single-page application dynamic routes before static asset handling:
  ```json
  {
    "rewrites": [
      { "source": "/article/:slug*", "destination": "/article/[id].html" },
      { "source": "/studio/staff/:staffId*", "destination": "/studio/staff/[staffId].html" },
      { "source": "/studio/:desk*", "destination": "/studio/[module].html" },
      { "source": "/((?!api/|_next/|_expo/|assets/|favicon.ico|robots.txt|manifest.json).*)", "destination": "/index.html" }
    ]
  }
  ```
- **Verification & Acceptance Criteria:**
  1. Direct navigation to `https://<preview>/article/uat04b-test-story-001` returns HTTP 200 and loads article content.
  2. Reloading an article page in browser re-renders the article cleanly without 404.
  3. Shared social URLs open directly.

---

## WO-02: Bookmark & Reading Library Persistence Reconciliation

- **Target Defect:** `DEF-002` (Severity: P1)
- **Affected Files:**
  - `apps/mobile/app/saved.tsx`
  - `apps/mobile/src/services/reader-persistence.ts`
- **Observed Failure:** Clicking "Save" records slug in `localStorage['ht:nm04:reader:saved:v1']`, but navigating to `/saved` renders an empty list or fails to reconcile saved slugs against published articles. Offline download fails to cache article body.
- **Proposed Scope:**
  1. In `apps/mobile/app/saved.tsx`, ensure the saved articles hook resolves article metadata from both local cache and public corpus API for all saved slugs.
  2. In `reader-persistence.ts`, store full serialized article snapshots (title, standfirst, body HTML, thumbnail URL) in IndexedDB/AsyncStorage when user clicks "Offline", enabling true offline rendering.
- **Verification & Acceptance Criteria:**
  1. Save any published story; navigate to `/saved`; story appears with title and thumbnail.
  2. Reload `/saved`; story remains present.
  3. Disconnect network in browser; saved story opens and renders body text offline.

---

## WO-03: WhatsApp Broadcast Schema Contract Alignment

- **Target Defect:** `DEF-008` (Severity: P1)
- **Affected Files:**
  - `apps/mobile/src/domain/models.ts`
  - `apps/mobile/src/services/newsroom-whatsapp.ts`
  - `apps/mobile/src/ui/StudioWhatsAppDesk.tsx`
- **Observed Failure:** Submitting WhatsApp draft throws: `Unexpected field in broadcast input: message_mode`.
- **Proposed Scope:**
  Update `validateWhatsAppBroadcastCreateInput` in `apps/mobile/src/domain/models.ts:3155`:
  Expand `allowedKeys` set to permit all fields submitted by the UI:
  ```ts
  const allowedKeys = new Set([
    'title',
    'body',
    'broadcast_type',
    'channel_identity',
    'related_story_id',
    'message_mode',
    'template_name',
    'scheduled_at',
    'timezone'
  ]);
  ```
  Ensure type `NewsroomWhatsAppBroadcastCreateInput` explicitly types these optional fields:
  ```ts
  message_mode?: "custom_composer" | "approved_template";
  template_name?: string | null;
  scheduled_at?: string | null;
  timezone?: string | null;
  ```
- **Verification & Acceptance Criteria:**
  1. Open Studio WhatsApp Desk; compose update; select template; click "Save as Staging Draft".
  2. Record saves successfully without throwing contract error.
  3. Draft appears in staging queue with `DO NOT SEND` external dispatch safeguard intact.

---

## WO-04: Commercial Advertiser Row Interaction & Detail Drawer

- **Target Defect:** `DEF-009` (Severity: P1)
- **Affected Files:**
  - `apps/mobile/src/ui/StudioAdvertisingDesk.tsx`
- **Observed Failure:** Advertiser cards in directory are non-interactive `<View>` elements. Clicking HOSPAZ row does nothing.
- **Proposed Scope:**
  1. Wrap advertiser card in `Pressable` with `role="button"`, `accessibilityLabel="View advertiser details for {adv.name}"`, and `cursor: "pointer"`.
  2. Implement `handleSelectAdvertiser(advertiserId: string)` state handler.
  3. Render an Advertiser Detail modal/drawer displaying billing address, contact person, active campaigns, and placement schedule when an advertiser is selected.
- **Verification & Acceptance Criteria:**
  1. Commercial Manager navigates to `/studio/advertising` -> Advertisers.
  2. Hovering over HOSPAZ shows pointer cursor; clicking row opens detail drawer.
  3. Enter/Space key triggers detail view.

---

## WO-05: Theme Hydration Synchronization & Contrast Hardening

- **Target Defect:** `DEF-013` (Severity: P1)
- **Affected Files:**
  - `apps/mobile/src/theme/AppearanceProvider.tsx`
  - `apps/mobile/app/+html.tsx`
  - `apps/mobile/src/ui/Brand.tsx`
  - `apps/mobile/src/ui/Layout.tsx`
- **Observed Failure:** 44/60 elements fail WCAG AA contrast (1.08:1) on dark OS scheme load because SSR inline styles on container DOM nodes retain white background while client hydrated Text nodes render light ink (`#F3F7FA`). Brand mark hardcodes `#102A43`.
- **Proposed Scope:**
  1. In `apps/mobile/app/+html.tsx`, add an inline head script to detect `prefers-color-scheme: dark` or stored theme before hydration, setting `<html data-theme="dark" style="background-color: #0B1622;">`.
  2. In `AppearanceProvider.tsx`, synchronize CSS custom variables `--ht-paper` and `--ht-ink` on `:root`.
  3. In `apps/mobile/src/ui/Brand.tsx:42`, replace hardcoded `color: "#102A43"` with dynamic `color: palette.brandInk` (`#FFFFFF` in dark mode, `#102A43` in light mode).
  4. In `apps/mobile/src/ui/Layout.tsx`, ensure `Page` and `SafeAreaView` containers dynamically apply `backgroundColor: palette.paper` on both SSR and client hydration.
- **Verification & Acceptance Criteria:**
  1. Open fresh browser with dark system scheme; verify background is `#0B1622` and text is `#F3F7FA` (contrast ≥ 14:1).
  2. Verify all 60 text elements achieve WCAG AA contrast (≥ 4.5:1 for normal, ≥ 3:1 for large text).
  3. Brand mark text achieves ≥ 7:1 contrast on both light and dark paper.

---

## WO-06: RPC Request Deduplication & Cumulative Layout Shift (CLS) Mitigation

- **Target Defect:** `DEF-014` (Severity: P2 / Acceptance Blocker)
- **Affected Files:**
  - `apps/mobile/src/services/migrated-corpus.ts`
  - `apps/mobile/app/(reader)/index.tsx`
  - `apps/mobile/src/ui/Cards.tsx`
- **Observed Failure:** Homepage executes duplicate parallel network requests for `ag05_public_feed_rows` (2.4s cold network latency), and late resolution induces a CLS of 0.274.
- **Proposed Scope:**
  1. In `migrated-corpus.ts` / feed service, implement in-memory request deduplication: cache inflight `Promise<PublicFeedRow[]>` so parallel callers share the single network execution.
  2. In `apps/mobile/app/(reader)/index.tsx`, provide reserved min-height skeleton containers for the Hero and Top Stories sections (e.g., `minHeight: 380px` for Hero, `minHeight: 450px` for grid) to prevent content downward jumps when RPCs resolve.
  3. Add `stale-while-revalidate` caching headers on API/Vercel edge functions for public feeds.
- **Verification & Acceptance Criteria:**
  1. Cold desktop LCP drops from >3.4s to <2.2s.
  2. CLS drops from 0.274 to <0.08 (passing Google Core Web Vitals).
  3. Network waterfall shows exactly one `ag05_public_feed_rows` request during initial load.

---

## WO-07: Story Workspace Required Field Validation Guard

- **Target Defect:** `DEF-006` (Severity: P2)
- **Affected Files:**
  - `apps/mobile/src/ui/StudioStoryWorkspace.tsx`
- **Observed Failure:** Blank form submission defaults `title: title || "Untitled story"` and creates `Untitled story` record on the server.
- **Proposed Scope:**
  In `apps/mobile/src/ui/StudioStoryWorkspace.tsx:351` (`handleSave`):
  Add pre-save validation guard:
  ```ts
  if (!title || !title.trim()) {
    setStatusMessage("Story title is required before saving.");
    setSaveStatus("idle");
    return;
  }
  ```
  Display visible inline error banner when title is missing.
- **Verification & Acceptance Criteria:**
  1. In Story Workspace, click "Save Draft" with empty title.
  2. Save is blocked; error banner "Story title is required" appears.
  3. No `Untitled story` record is created in database or review queue.

---

## WO-08: Category Filter URL Addressability & Accessibility Attributes

- **Target Defect:** `DEF-003`, `DEF-004` (Severity: P2)
- **Affected Files:**
  - `apps/mobile/app/(reader)/index.tsx`
  - `apps/mobile/src/ui/Cards.tsx`
- **Observed Failure:** Category selection does not update URL or expose `aria-selected` semantics. Article titles lack heading roles.
- **Proposed Scope:**
  1. In `apps/mobile/app/(reader)/index.tsx`, sync category filter selection with URL query params via `router.setParams({ category: selectedCategory })`.
  2. Add `accessibilityRole="tab"` or `accessibilityRole="button"`, `accessibilityState={{ selected: activeCategory === cat }}`, and `aria-selected={activeCategory === cat}` to filter pills.
  3. In `Cards.tsx` and article detail view, add `accessibilityRole="header"` or `role="heading"` with `aria-level={1}` for headlines and `accessibilityRole="text"` for prose paragraphs.
- **Verification & Acceptance Criteria:**
  1. Clicking "Zimbabwe" updates URL to `/?category=zimbabwe`.
  2. Active pill exposes `aria-selected="true"`.
  3. Direct load of `/?category=zimbabwe` opens with Zimbabwe filter pre-applied.
  4. Screen readers identify headlines as Level 1 headings.
