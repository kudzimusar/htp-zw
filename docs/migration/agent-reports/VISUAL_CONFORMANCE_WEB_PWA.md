# VISUAL CONFORMANCE — WEB / PWA

**Programme:** HealthTimes migration  
**Checkpoint:** AG-07 visual conformance before further CP7 UAT  
**Date:** 2026-09-22  
**Audit branch:** `audit/ag07-web-pwa-visual-conformance`  
**Runtime changes:** **NONE**

## 1. Scope and decision boundary

This checkpoint temporarily pauses ordinary PRE-CP7 UAT and audits the client-facing Web/PWA visual state only.

It does **not**:

- redesign the product;
- modify either certified runtime;
- authorize CP7;
- authorize production;
- change the staging alias;
- change HOSPAZ commercial facts;
- restart migration work.

Certified technical baselines preserved:

- integrated runtime: `0112c8802d220d23e20288783536f22e85ea346d`
- COM-01 runtime: `5b6fca0fe1dceed5e167b845e023dfc456c47040`

The principal Web/PWA visual files inspected are byte-identical between those two SHAs, including root `index.html`, `app.js`, `v21.js`, root visual CSS, Native/PWA Home, shared Layout, Source Parity snapshot and Premium screen. COM-01 therefore did not introduce the visual findings recorded here.

---

## 2. Design authority

Read as governing authority:

- `docs/native-mobile/DESIGN.md`
- `docs/native-mobile/HEALTHTIMES_NATIVE_MOBILE_MASTER_PLAN.md`

`DESIGN.md` is explicit that:

- the approved wireframe is the **primary visual reference**;
- it is **not loose inspiration**;
- the product should feel like a premium international newsroom/publication rather than a generic responsive website;
- the Home hierarchy includes Header → editorial filters → Hero → Live Now → advertising → Top Stories → editorial sections → Watch → Premium/commercial content;
- the same visual system must carry across native, PWA and desktop/tablet;
- Premium, advertising, Live, Watch and My HealthTimes have deliberate visual roles;
- public Reader UI should not feel like an admin/dashboard surface.

### Wireframe custody check

Expected asset:

`docs/native-mobile/assets/HEALTHTIMES_NATIVE_WIREFRAME_V1.png`

Checked against:

- `0112c880...`
- `integration/ag07-nm07-crosslane-candidate`
- `feat/native-mobile-nm07-native-certification`
- `main`
- `5b6fca0...`
- repository code search

Result: **ABSENT**

The workstation path historically used for this repository is not mounted in the current audit environment, so an uncommitted local-only copy cannot be ruled out. No Git-custodied copy exists in the checked lineages.

**VISUAL GOVERNANCE DEFECT — APPROVED WIREFRAME IMAGE NOT UNDER REPOSITORY CUSTODY**

Because the actual PNG is absent, exact pixel/layout fidelity to the approved wireframe must be classified:

`CANNOT VERIFY — SOURCE WIREFRAME IMAGE MISSING`

The textual design contract in `DESIGN.md` remains usable for structural conformance.

---

## 3. Exact current lineage / deployments

### Integrated Web deployment

- URL: `https://healthtimes-staging-g16tpmyug-11-11.vercel.app`
- deployment ID: `dpl_DHnC2eR7JkTmA8Lm2r9HBL3MbFHc`
- Git SHA: `0112c8802d220d23e20288783536f22e85ea346d`
- branch: `integration/ag07-nm07-crosslane-candidate`
- state: **READY**

This Vercel preview is protected by Vercel SSO.

### COM-01 Web deployment

- URL: `https://healthtimes-staging-b9t0k3j4f-11-11.vercel.app`
- deployment ID: `dpl_6wR4FzNhwsBGogaCogeV6Uvszq5z`
- Git SHA: `5b6fca0fe1dceed5e167b845e023dfc456c47040`
- state: **READY**

The audited visual files are unchanged from `0112c880...` to `5b6fca0...`.

### Exact integrated universal-PWA artifact

Workflow:

`Native Mobile Foundation + Staging + Contracts + Reader + Growth + Security + Certification`

Run:

`35703008559`

Artifact:

- name: `healthtimes-native-web-dist`
- artifact ID: `10683071767`
- size: 1,252,952 bytes
- SHA-256: `e7122881de30fbda4f04a526b5f62d89ae17af17f3384cc6eb88cf75a7c5e156`
- exact head: `0112c880...`

The integration branch did not deploy this exact artifact to GitHub Pages because the Pages workflow deploy condition is restricted to its configured Pages branches. It is therefore exact build evidence, not a claim that the public Pages URL currently serves `0112c880...`.

---

## 4. Screenshot evidence and limitation

Evidence manifest:

`docs/migration/agent-reports/visual-conformance/web/README.md`

The exact PWA export was captured at desktop/tablet/mobile viewports.

Required inventory captured locally:

- Desktop Home — above fold
- Desktop Home — full initial render
- Tablet Home
- Mobile Home
- Article
- Premium
- Explore
- Search
- Watch
- My HealthTimes
- Studio landing

Local evidence pack:

`AG07_WEB_PWA_VISUAL_EVIDENCE_0112.zip`

SHA-256:

`23bf2873b18e533a0e062f45e48c3eecf218daba4719250261b0eb02d8d72cd9`

### Evidence limitation

The exact Vercel URL is SSO-protected and the managed Chromium execution policy blocks ordinary URL navigation in this audit environment. Hydrating the PWA from a null-origin synthetic document fails on browser-origin/router constraints.

Therefore:

- Premium / Explore / Search / Watch / My HealthTimes / Studio have useful exact static-export render evidence;
- Home and Article screenshots show the **real pre-hydration initial render**, including the loading skeleton;
- they are **not** represented as proof of the final hydrated Home or Article;
- no mock “final” screenshot was manufactured.

Exact-SHA Chromium UAT provides runtime/rendered behavior evidence for the root web line, but its Playwright report artifact contains no screenshot attachments.

The available GitHub connector can write UTF-8 repository files but exposes no local binary-file handoff for committing the generated PNG/JPEG bytes. The screenshot manifest is therefore in Git custody; the binary screenshot pack is captured and hashed but not yet repository-custodied.

**BINARY SCREENSHOT REPOSITORY CUSTODY: INCOMPLETE**

This is an evidence-delivery limitation, not a product runtime change.

---

## 5. Current product has two materially different visual surfaces

The audit found an important visual-governance split.

### A. Root Web shell

Root files such as:

- `index.html`
- `app.js`
- `v21.js`
- `styles.css`
- `v21.css`
- `quality-pass.css`

provide a separate publication experience.

Its Home has:

- editorial hero;
- latest grid;
- trending rail;
- newsletter card;
- Premium promo;
- topic hubs;
- opinion/analysis;
- trust/transparency explanatory content;
- reader/audience explanatory content.

Its desktop primary navigation contains:

- Home
- Latest
- Zimbabwe
- Africa
- Research
- Policy
- Premium

### B. Universal PWA / Reader

The PWA in `apps/mobile` uses the approved five-tab model:

- Home
- Explore
- Live
- Watch
- My HT

Its Home source contains:

- For You / Latest / Edition / World / Health filters;
- hero;
- conditional Live Now;
- declared ad slot;
- Top Stories;
- multiple editorial sections;
- Watch;
- Premium Intelligence;
- Opportunities;
- Edition / further coverage / most-read areas.

### Audit disposition

The PWA architecture is structurally closer to the approved `DESIGN.md` hierarchy.

The root Web shell is a different content/navigation system and has substantially more explanatory/product/institutional content.

**Classification: PARTIAL / CROSS-SURFACE DESIGN DRIFT**

A single approved Web/PWA visual system is not yet clearly authoritative.

---

## 6. Premium CTA audit

### Desktop root Web

Observed implementation:

- `Premium` is a top-level desktop navigation item.
- Home has a dedicated Premium promo after Latest.
- Home has Premium analysis links.
- Premium page has an explicit membership hero.
- the root static implementation contains an activation/subscription sheet.

Structural discoverability: **GOOD**, although the current root Web pricing/activation fixture is not accepted as verified production commerce truth.

### Mobile root Web

Observed implementation:

- first mobile header is brand/menu/search;
- Premium is inside the mobile menu;
- a Premium block appears deeper in the mobile Home feed;
- Premium story lock can open the subscription surface.

First-screen Premium visibility: **WEAK / PARTIAL**

### Universal PWA desktop/tablet/mobile

Header:

- brand;
- Edition;
- Search;
- Alerts;
- desktop public navigation;
- mobile five-tab navigation.

There is **no Premium CTA in the PWA header**.

Home:

- Premium exists as a `Premium Intelligence` section;
- it comes after Hero, conditional Live, Top Stories, many editorial sections and Watch;
- it is not an immediate first-viewport membership proposition.

Article:

- Premium badge is shown for a Premium story;
- protected Premium article has a `View Premium` CTA.

Premium screen:

- clear `Go Premium` heading;
- clear value proposition;
- Premium stories region;
- membership options region;
- benefits;
- restore/sign-in;
- but provider/store products remain fail-closed.

My HealthTimes:

- explicit `Go Premium` CTA beside the profile/membership state.

### First-screen question

> Can a new reader tell from the first screen that HealthTimes has a paid Premium product and immediately understand how to join?

**Universal PWA: NO.**

The product can be discovered through My HealthTimes, the Premium screen, Premium stories and deeper Home content, but it is not prominent in the first-screen PWA/header experience.

**Root Web desktop: PARTIAL YES** because `Premium` is in top navigation, but this is not consistent across the mobile/PWA system.

Overall disposition:

**P2 — Premium product discovery is inconsistent and materially weaker in the approved universal-PWA visual system than the client expectation.**

---

## 7. HOSPAZ visual continuity audit

### Accepted source truth

Accepted migration/source reconciliation establishes HOSPAZ campaign/creative provenance but leaves commercial fields such as destination, schedule and placement conditions unresolved unless separately verified.

Those unknowns must not be invented.

### Universal PWA / Native advertising service

`apps/mobile/src/source-parity/snapshot.ts` carries a HOSPAZ advertising reference:

- campaign reference: **present**
- HOSPAZ AGM source article reference: **present**
- exact advertising creative verified for rendering: **NO**
- `creativeVerified: false`
- policy note explicitly says the exact approved creative and destination are not rendered until source-verified.

The current Source Parity advertising service returns `source: "none"`.

`AdSlot` returns no UI when advertising source is `none`.

Therefore on the universal PWA at this certified baseline:

| HOSPAZ check | Result |
| --- | --- |
| Campaign/data reference present | **YES** |
| Render-approved creative present in PWA ad service | **NO** |
| Home rendered HOSPAZ | **NO** |
| Article rendered HOSPAZ | **NO** |
| Masthead rendered HOSPAZ | **NO** |
| Reason | fail-closed Source Parity advertising; creative/destination not source-verified for this service |

This is truthful behavior technically, but does not satisfy the client's expected visible direct-ad continuity.

### Root Web HOSPAZ implementation

The root Web line contains:

- HOSPAZ image URL;
- default campaign object;
- masthead;
- Home in-feed;
- article placements.

Exact-SHA Chromium UAT run `35703008495` passed:

- mobile public-page advertising placement;
- desktop masthead advertising placement;
- mobile Home in-feed advertising;
- `paid HOSPAZ creative keeps correct desktop and mobile hierarchy`.

However root `v21.js` also hardcodes:

- a generic HealthTimes destination;
- campaign start/end dates;
- `Active` status;
- `Approved` review state.

Those commercial fields are not accepted as authoritative by the later HOSPAZ source reconciliation.

### HOSPAZ disposition

There is no current integrated visual surface that simultaneously provides:

1. the client's expected visible HOSPAZ placement; **and**
2. the later accepted fail-closed commercial truth.

**P2 — HOSPAZ visual continuity and authoritative commercial provenance are split between two implementations.**

Do not solve this by copying the root Web's unverified destination/schedule/status into the PWA.

---

## 8. Screen-by-screen textual-wireframe conformance

Because the source wireframe PNG is missing, the final column for exact visual fidelity remains:

`CANNOT VERIFY — SOURCE WIREFRAME IMAGE MISSING`

| Screen / element | Current PWA/Web observation | Classification |
| --- | --- | --- |
| Header / HealthTimes identity | strong HealthTimes brand; Edition/Search/Alerts supported | **MATCHES** structurally |
| Five Reader tabs | Home / Explore / Live / Watch / My HT | **MATCHES** |
| Desktop Reader nav | same Reader destinations exposed on desktop source | **MATCHES** structurally |
| Editorial filters | For You / Latest / Edition / World / Health | **MATCHES** |
| Home Hero | implemented in hydrated PWA source | **MATCHES** structurally; screenshot final state not captured |
| Live Now | conditional and collapses when source has no live items | **MATCHES** design rule; current source-parity Home has no Live rail |
| Advertising | slots declared, but PWA returns no HOSPAZ creative | **MISSING** current commercial continuity |
| Top Stories | implemented immediately after upper Home region | **MATCHES** |
| Editorial sections | multiple content sections before commercial utility content | **MATCHES** |
| Watch | dedicated Home section and first-class Watch screen | **MATCHES** |
| Premium on Home | dedicated section but deep in Home | **PARTIAL** |
| Premium in header | absent from universal PWA header | **MISSING** relative to client prominence expectation |
| Opportunities/commercial | current Home includes jobs/grants/training/research/e-paper where source-backed | **MATCHES / PARTIAL** |
| Explore | taxonomy gateway, not just another feed | **MATCHES** |
| Search | dedicated product with filters/explanatory copy | **MATCHES** |
| Article | headline/byline/hero/body/actions/ads/related/Premium lock implemented | **MATCHES** structurally |
| Article taxonomy language | exposes `Canonical desk` and `Legacy source taxonomy` to Reader | **EXTRA / DESIGN DRIFT** |
| Premium screen | correct basic hierarchy, but provider/config text displaces membership product UX | **PARTIAL** |
| My HealthTimes | clean list + membership state + Go Premium | **MATCHES** core |
| My HealthTimes internal readiness items | `System Status`, `Growth & Commercial Readiness`, environment labels visible to Reader | **EXTRA / DESIGN DRIFT** |
| Watch | tabs, featured/latest model and Live handoff | **MATCHES / PARTIAL** depending live inventory |
| Studio | operational/status-driven, but current landing uses horizontal module buttons rather than the approved dark left-nav workspace | **PARTIAL / DESIGN DRIFT** |
| Root Web Home hierarchy | hero/latest/premium/topics/analysis/trust/audience; Live/Watch hierarchy not equivalent to PWA design | **PARTIAL / DESIGN DRIFT** |
| Root Web explanatory sections | trust/product/audience explanation consumes substantial Home space | **EXTRA / DESIGN DRIFT** relative to desired editorial density |

Exact pixel fidelity for every row:

**CANNOT VERIFY — SOURCE WIREFRAME IMAGE MISSING**

---

## 9. Publication hierarchy and editorial density

### Universal PWA

Source hierarchy is fundamentally editorial:

- Hero;
- Top Stories;
- multiple desks/categories;
- Watch;
- Premium;
- Opportunities.

This is materially closer to the approved editorial product direction than a generic institutional site.

However:

- Premium is too deep;
- advertising is visually absent;
- migration/development labels and taxonomy-governance language leak into the public Reader experience;
- current static initial Home evidence displays an environment banner and loading state before hydration.

### Root Web

The root Web starts editorially with Hero and Latest, but after that it devotes substantial vertical space to:

- Premium product explanation;
- topic explanation;
- trust/transparency explanation;
- briefing/WhatsApp/archive explanation.

This is useful content but shifts the Home toward explaining the product/institution rather than sustaining newsroom headline density.

**Disposition: PARTIAL / DESIGN DRIFT**

---

## 10. Devex reference-pattern comparison

Reference inspected on 2026-09-22:

- `https://www.devex.com/`
- `https://www.devex.com/membership/individuals`

This audit uses Devex only as a product-pattern reference. No Devex branding, exact layout, typography or proprietary components are proposed for copying.

| DEVEX PATTERN | HEALTHTIMES CURRENT | GAP |
| --- | --- | --- |
| Dense headline-led homepage with lead stories followed immediately by many current headlines | Universal PWA source is editorially dense after hydration; root Web becomes more explanatory after Latest | keep journalism density dominant; reduce product/institution explanation on core Home |
| Subscription is a top-level product: `Subscribe` and `Try Devex Pro` are directly discoverable | root desktop Web has Premium nav; universal PWA header does not | PWA Premium needs a clearer first-screen entry point |
| Paid product has clear plan/value/product destination | PWA Premium page has value proposition but shows configuration-required copy and no verified offer | preserve fail-closed commerce while making the member proposition visually complete |
| Jobs and Funding are top-level professional products but do not replace the news hierarchy | HealthTimes Opportunities are deep in PWA; root Web lacks equivalent clear commercial product architecture | commercial/opportunity hierarchy can be clearer without dominating journalism |
| Sponsored content is visibly labeled inside a professional editorial ecosystem | PWA HOSPAZ is absent; root Web renders HOSPAZ but with unverified commercial metadata | reconcile truthful HOSPAZ inventory with a real labeled placement |
| Publication feels like a working professional newsroom with live/current content as the primary visual payload | PWA structure supports this; root Web includes more institutional/product explanation | choose one authoritative visual system and keep public Home journalism-first |

### Devex pattern conclusion

HealthTimes should not become a Devex clone.

The relevant lesson is hierarchy:

**journalism first → subscription clearly discoverable → professional/commercial products clearly organized → explanatory marketing subordinate to current reporting.**

The universal PWA is structurally closer to that ordering than the root Web shell, but currently underserves Premium visibility and real advertising continuity.

---

## 11. Defect register

### P0 — 0

No visual finding constitutes a security/data-loss/cutover-impossible defect.

### P1 — 0

No visual-only finding is classified as a critical editorial workflow failure at this checkpoint.

### P2 — 6

**VIS-P2-001 — approved wireframe image is not under Git repository custody**

Exact finding:

`VISUAL GOVERNANCE DEFECT — APPROVED WIREFRAME IMAGE NOT UNDER REPOSITORY CUSTODY`

Impact: exact client-approved pixel/layout baseline cannot be independently certified.

**VIS-P2-002 — universal PWA Premium first-screen discovery is weak**

No Premium CTA in PWA header; Home Premium section is deep. A new Reader cannot immediately see the paid product and joining path from the PWA first screen.

**VIS-P2-003 — HOSPAZ continuity is visually absent from universal PWA**

Campaign reference exists but `creativeVerified:false`; advertising fails closed and no HOSPAZ Home/article/masthead creative renders.

**VIS-P2-004 — HOSPAZ truth and rendering are split across two implementations**

Root Web renders HOSPAZ but hardcodes destination/schedule/status that later source reconciliation leaves unknown. PWA preserves truth but renders nothing.

**VIS-P2-005 — root Web and universal PWA do not share one authoritative visual hierarchy**

Navigation, Home hierarchy, Premium treatment and advertising behavior materially differ.

**VIS-P2-006 — current Studio layout does not match the approved left-nav workspace composition**

The approved design calls for a dark navy left navigation with a light dense workspace. Current Studio landing presents a horizontal module strip and large card workspace.

### P3 — 3

**VIS-P3-001 — development/migration-state messaging is visually prominent in public Reader surfaces**

Examples include the full-width development/source-parity banner and `Anonymous Membership · Development`.

**VIS-P3-002 — implementation/configuration language leaks into consumer Premium UX**

Examples include storefront configuration and provider verification copy. The fail-closed rule is correct; the normal Reader should not have to read internal implementation language as the primary membership experience.

**VIS-P3-003 — migration/governance/internal readiness concepts leak into Reader surfaces**

Examples include `Canonical desk`, `Legacy source taxonomy`, `System Status`, and `Growth & Commercial Readiness`.

### P4 — 0

No enhancement-only item was separately recorded; this checkpoint is limited to conformance gaps.

### Counts

- P0: **0**
- P1: **0**
- P2: **6**
- P3: **3**
- P4: **0**

---

## 12. Recommended bounded remediation — NOT AUTHORIZED YET

No fix is performed in this checkpoint.

If moderator/owner authorizes remediation, keep it bounded:

1. recover and commit the actual approved wireframe PNG before claiming exact visual conformance;
2. designate one Reader visual system as authoritative across web/PWA rather than maintaining materially different public hierarchies;
3. add a clear Premium entry point in the universal PWA first-screen/header experience without turning Home into a sales page;
4. reconcile HOSPAZ against source-approved creative identity while continuing to leave destination/schedule/conditions blank or fail-closed until verified;
5. restore a visible, labeled ad slot from truthful data;
6. keep Home headline-led and move nonessential product/institution explanations down or into dedicated pages;
7. remove migration/development/internal readiness language from normal Reader surfaces while preserving it in Studio/status tooling;
8. bring Studio navigation/layout back to the approved visual composition if that textual specification remains authoritative.

Do not use the root Web hardcoded HOSPAZ commercial values as the solution.

---

## 13. Checkpoint disposition

The current visual evidence is sufficient to identify genuine design/governance gaps but **not sufficient to certify exact wireframe conformance**, because:

1. the approved wireframe PNG is absent from repository custody; and
2. hydrated protected-deployment screenshots are not available in this execution environment.

Ordinary CP7 UAT remains paused pending moderator visual review.

No runtime file changed.

No production system changed.

**Production systems modified: NO**
