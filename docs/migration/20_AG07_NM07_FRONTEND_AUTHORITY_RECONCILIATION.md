# AG-07 + NM-07 — Phase 2 Frontend Authority Reconciliation

**Repository:** `kudzimusar/htp-zw`  
**Programme controller:** AG-07  
**Supporting authority:** NM-07 — Universal Reader  
**Phase:** 2 — Frontend Authority Reconciliation  
**Starting SHA:** `b47e6e91b400b7087c8b59ad01bfb01445631926`  
**Phase 0 safety freeze:** `5ebca46044d9a973f34bf0a25f0ed48652ab8f68`  
**Phase 1 custody closure:** `b47e6e91b400b7087c8b59ad01bfb01445631926`  
**Accepted CP5 runtime:** `0ba7240d018efa2472a00f56453e9aa8be34e1c5`  
**Frozen integrated runtime:** `0112c8802d220d23e20288783536f22e85ea346d`  
**Runtime changes authorized:** NO  
**Database/storage/deployment changes authorized:** NO

## 1. Phase 2 decision

Independent repository-history inspection supports the expected proposition.

**Frontend product/design authority is frozen as follows:**

> `apps/mobile` is the canonical HealthTimes universal Reader implementation for Web/PWA, iOS, Android, and responsive desktop/tablet Reader surfaces.

The repository-root public frontend built around `index.html`, `app.js`, `v21.js`, `styles.css`, `v21.css` and related root public presentation files is an earlier product lineage. It is preserved as convergence evidence under the Phase 0 freeze, but it is **legacy/superseded for public Reader presentation authority**.

This decision does **not** make GitHub Pages a production authority and does **not** make the current Vercel deployment a design authority.

Three authorities are deliberately separated:

1. **Product/design authority** — what HealthTimes Reader is supposed to be and which implementation owns its presentation.
2. **Hosting/deployment authority** — where a particular build is currently deployed.
3. **Routing/SEO/platform capability authority** — accepted behavior that must survive regardless of which presentation renders it.

Phase 2 changes no runtime and performs no convergence implementation.

## 2. Commit-evidence chronology

### 2.1 Legacy root public frontend predates the native/universal programme

The root public presentation history at the integrated runtime shows:

| File | Relevant history | Date |
| --- | --- | --- |
| `index.html` | `ab948504...` — add modern HealthTimes homepage shell | 2026-09-08 |
| `index.html` | `b657920...` — HealthTimes 2.0 publication/newsroom/audience platform | 2026-09-09 |
| `index.html` | `36b2a9fe...` — HealthTimes 2.1 public experience | 2026-09-09 |
| `index.html` | `74d25ad1...` — mobile masthead/ad adjustment | 2026-09-09 |
| `index.html` | `a3eecdc6...` — mobile quality pass | 2026-09-09 |
| `v21.js` | `1a066f3c...` — premium/identity/ads/themes/mobile controller | 2026-09-09 |

The root frontend therefore existed roughly ten days before the approved native/universal Reader design lineage.

Deployment age or continued file presence does not confer current design authority.

### 2.2 Product/design authority was established later and linearly

The inspected history contains a direct governance-to-implementation sequence:

`4f6a69b594091d414a8388d47e592cb682128107`  
→ `b523ce22d77ed1926bf044a4ca935430d539f930`  
→ `91bdd18c98ea9f1fb1811eec92c7dd07d4685844`

Evidence:

1. `4f6a69b...` — **docs(mobile): add native mobile master plan for owner review**
   - adds `docs/native-mobile/HEALTHTIMES_NATIVE_MOBILE_MASTER_PLAN.md`
   - parent: `a4f1211...`

2. `b523ce22...` — **docs(mobile): add approved wireframe design specification**
   - adds `docs/native-mobile/DESIGN.md`
   - parent: exactly `4f6a69b...`

3. `91bdd18c...` — **feat(native): add NM-01 contracts and fixture foundation**
   - begins the `apps/mobile` package lineage
   - parent: exactly `b523ce22...`

This is strong lineage evidence that the universal application was created **after and directly from** the design-governance sequence, not as an unrelated prototype.

Both `4f6a69b...` and `b523ce22...` are ancestors of integrated runtime `0112c880...`.

### 2.3 The implementation explicitly became the shared native/PWA Reader

Later `apps/mobile` history includes:

- `abf4c418...` — **feat(native): implement Reader shell and core routes**
- `4d457dac...` — **feat(native): complete approved Home hierarchy**
- `49052df8...` — **feat(ui): unify editorial Reader across native and PWA**
- `d7893e1d...` — **feat(source-parity): add read-only public source bridge**
- `4c37e7d2...` — **feat(nm04): present public Reader as editorial product**
- `4b8df23a...` — **feat(nm04): harden article rendering and bounded search**

The `49052df8...` commit changes the Reader Home, Explore, Article, Search, shared Cards/Layout and Reader product tests under `apps/mobile`. Its commit message explicitly identifies the implementation as the unified editorial Reader for native and PWA.

At `0112c880...`, `apps/mobile/package.json` is an Expo/React Native application using:

- Expo Router;
- React Native;
- React Native Web;
- static web export;
- shared iOS/Android/Web source;
- shared domain/service contracts.

`apps/mobile/app.config.ts` supplies environment-specific iOS and Android identities and a web static output configuration. This is a universal application implementation, not a WebView wrapper.

## 3. Design authority evidence

### 3.1 Canonical plan document

The requested `docs/native-mobile/MASTER_PLAN.md` path does not exist in the inspected lineage. The canonical equivalent is:

`docs/native-mobile/HEALTHTIMES_NATIVE_MOBILE_MASTER_PLAN.md`

It states that the target is one HealthTimes platform with three first-class Reader surfaces:

- Web/PWA;
- Android;
- iOS.

It also states that the website remains the canonical public web/SEO surface while native applications use the same platform identity and contracts.

### 3.2 Approved visual specification

Commit `b523ce22...` adds `docs/native-mobile/DESIGN.md` with status:

`APPROVED VISUAL DIRECTION — WIREFRAME BASELINE v1.0`

The document explicitly says:

- it applies to iOS, Android, mobile PWA and desktop/tablet PWA;
- the owner-approved wireframe is the primary visual reference;
- the wireframe is not loose inspiration;
- implementation is iOS + Android + rebuilt PWA following the Master Plan and DESIGN;
- the current PWA must be rebuilt to use the same visual system;
- Android, iOS and mobile PWA must unmistakably look like the same HealthTimes product.

This makes the old root presentation incompatible with being promoted as current visual authority merely because it remains deployable.

### 3.3 Wireframe custody contradiction

The expected approved image is:

`docs/native-mobile/assets/HEALTHTIMES_NATIVE_WIREFRAME_V1.png`

It is absent from the integrated tree and no repository commit for that filename was found.

`DESIGN.md` itself anticipated this state and says that, until the image is committed, the textual specification is the authority describing the approved wireframe.

Therefore:

**VISUAL GOVERNANCE DEFECT — APPROVED WIREFRAME IMAGE NOT UNDER REPOSITORY CUSTODY**

This remains a governance defect but is **not a Phase 2 blocker**, because the repository contains an explicit textual fallback authority.

## 4. Master Plan status contradiction

A governance contradiction exists inside the canonical Master Plan.

Its header still says:

`DRAFT FOR OWNER REVIEW — NOT YET AUTHORIZED FOR IMPLEMENTATION`

and its approval gate says the document should be changed to an approved baseline after owner approval.

However, the repository history immediately after that document shows:

- approved DESIGN committed at `b523ce22...`;
- `apps/mobile` implementation beginning directly from that approved-design commit;
- subsequent NM-01 through NM-07 implementation/certification work;
- explicit PWA/native unification commits;
- integrated certification lineage at `0112c880...`.

Therefore the Master Plan header is stale governance metadata relative to the later approved-design and implemented/certified lineage.

Phase 2 does **not** silently rewrite that historical document. The contradiction is recorded for later governance normalization.

It does not justify restoring the older root UI.

## 5. GitHub Pages role and why it can show the newer Reader

Commit:

`02cd2c90e236cde3bc3c399544b4e585fb8756cd`

is an ancestor of `0112c880...` and changes `.github/workflows/pages.yml` from one static-root deployment lane into two explicit lanes.

### Main branch lane

For `main`, the workflow:

- validates root `app.js`;
- requires root `index.html`, `article.html`, `premium.html`, `styles.css`, `app.js`;
- uploads the repository root as the static Pages artifact.

This is the legacy/static lane.

### NM-07 lane

For `feat/native-mobile-nm07-native-certification`, the workflow:

- installs `apps/mobile`;
- runs native/universal validation;
- validates Source Parity and Reader fidelity;
- runs `npm run native:export:web`;
- verifies `apps/mobile/dist`;
- verifies exported Home/Explore/Live/Search/Premium/Watch/My HealthTimes/Article routes;
- uploads `apps/mobile/dist` as the Pages artifact;
- verifies exact-head deployment.

This is the universal Reader PWA lane.

Therefore GitHub Pages is a **deployment mechanism capable of serving two different artifacts depending on branch/workflow path**. Its current appearance cannot itself decide product authority.

The newer Reader appears on Pages because the NM-07 lane explicitly exports and deploys `apps/mobile`.

## 6. Vercel role and why it can show the older/root product

The exact integrated Vercel deployment inspected for Phase 2 is:

- deployment ID: `dpl_DHnC2eR7JkTmA8Lm2r9HBL3MbFHc`;
- project: `healthtimes-staging`;
- Git branch: `integration/ag07-nm07-crosslane-candidate`;
- Git SHA: `0112c8802d220d23e20288783536f22e85ea346d`;
- state: `READY`;
- project framework: `null`.

At `0112c880...`:

- root `index.html` exists and loads root `styles.css`, `v21.css`, `v21-fixes.css`, `quality-pass.css`, `app.js`, `v21.js`, `ad-placement.js` and `quality-pass.js`;
- root `vercel.json` contains AG-06 Newsroom/API security headers;
- root `vercel.json` contains **no** `buildCommand`, `outputDirectory`, `rootDirectory` or rewrite selecting `apps/mobile/dist`;
- there is no Vercel configuration in the integrated runtime that performs the GitHub Pages NM-07 `apps/mobile` export path.

The deployment is therefore bound to the integrated repository SHA but not to the universal Reader web-export pipeline.

This explains the visual split:

> GitHub Pages' NM-07 lane explicitly builds `apps/mobile/dist`; the current Vercel integration deployment does not.

The current Vercel appearance is consequently a **deployment configuration artifact**, not a design-authority decision.

Phase 2 does not move the primary staging alias and does not change Vercel configuration.

## 7. CP5 authority and divergence

Accepted CP5 runtime:

`0ba7240d018efa2472a00f56453e9aa8be34e1c5`

Comparison to integrated runtime `0112c880...` shows:

- status: **diverged**;
- merge base: `ea599bf9ed3db9dc8fa7085e25bea20375c28e11`;
- integrated side: 463 commits ahead of the merge base;
- CP5 side: 75 commits absent from the integrated side.

The accepted CP5 tree contains:

- root legacy public frontend;
- `api/public.js`;
- `lib/ag05-public-runtime.js`;
- `.github/workflows/ag05-certification.yml`;
- `robots.txt`;
- `robots.production.txt`;
- CP5 route/SEO migrations and tests;
- a `vercel.json` public routing gateway.

The CP5 tree does **not** contain:

- `apps/mobile/package.json`;
- `docs/native-mobile/DESIGN.md`;
- `docs/native-mobile/HEALTHTIMES_NATIVE_MOBILE_MASTER_PLAN.md`.

Therefore CP5 cannot be the product/design authority for the later universal Reader. Its accepted value is capability authority.

At `0112c880...`, the following CP5 executable files are absent:

- `api/public.js`;
- `lib/ag05-public-runtime.js`;
- `.github/workflows/ag05-certification.yml`;
- `robots.txt`;
- `robots.production.txt`.

The integrated `vercel.json` also lacks CP5's public routing table.

This confirms the already identified convergence defect: accepted CP5 capabilities were not fully carried into the later integrated executable lineage.

## 8. CP5 capabilities that must survive convergence

The old CP5 presentation layer is **not** preserved as canonical UI. The following accepted capabilities are preserved independently of that presentation:

1. canonical public-path resolution;
2. deterministic legacy redirects;
3. explicit 404 behavior rather than homepage catch-all;
4. canonical article identity and canonical URL continuity;
5. migrated category/tag/author context routing where accepted;
6. server-visible SEO metadata;
7. structured data / schema graph generation;
8. Open Graph and canonical metadata;
9. sitemap generation;
10. RSS/feed generation;
11. staging/production robots policy;
12. analytics continuity;
13. migrated-media canonical URL use;
14. public route coverage against the accepted 5,786-object corpus;
15. HOSPAZ/direct-ad continuity and source provenance;
16. direct-ad placement/campaign truth without inventing destination, schedule or placement conditions;
17. performance/route certification expectations already accepted at CP5.

Phase 1 independently confirmed that the underlying CP5 database capabilities remain live, including:

- `ag05_resolve_public_path(text)`;
- `ag05_public_story_document(text)`;
- `ag05_public_context_document(text)`;
- `ag05_public_sitemap_xml()`;
- `ag05_public_feed_rows(integer)`;
- `ag05_hospaz_direct_ad_preview()`.

These are capability assets to consume, not reasons to resurrect CP5's legacy HTML.

## 9. Universal Reader capabilities that remain authoritative

The `apps/mobile` Reader remains authoritative for:

- one Reader implementation across Web/PWA, iOS and Android;
- responsive mobile/tablet/desktop Reader composition;
- Expo Router navigation;
- five-destination Reader information architecture: Home, Explore, Live, Watch, My HealthTimes;
- shared Article Reader;
- Search/Discovery presentation;
- edition/country preferences;
- Premium presentation and entitlement boundary;
- saved/history/offline Reader state where implemented/certified;
- Watch/Live/Listen surfaces;
- notification/deep-link handling;
- shared design tokens/components;
- accessibility and device-class behavior;
- Source Parity/domain contracts;
- migration from temporary read-only source adapters to authoritative backend repositories without rebuilding screens;
- Reader advertising slots as presentation abstractions;
- Studio/Reader separation;
- CA-01 native communications integration where already certified;
- AG-06 server capability consumption without client-side authority recreation.

No Phase 3 or Phase 4 work may replace `apps/mobile` with the root UI or independently rebuild these Reader systems.

## 10. Authority matrix

| Surface/system | Presentation authority | Capability authority | Deployment role | Phase 2 disposition |
| --- | --- | --- | --- | --- |
| **Legacy root UI** (`index.html`, `app.js`, `v21.js`, root public CSS/HTML) | **NO — legacy/superseded for Reader presentation** | Historical/client-review behavior only; selected capability evidence may be mined, not promoted wholesale | Currently deployable as repository-root static content | Preserve; do not delete; candidate for eventual public-presentation retirement after convergence certification |
| **`apps/mobile` universal Reader** | **YES — canonical Reader product/design implementation** | Reader navigation, Article, Search, Premium, Live/Watch, shared native/web UX, service contracts | Must become the single Web/PWA build artifact while remaining iOS/Android source | Preserve and consume; no replacement |
| **GitHub Pages** | **NO** | None inherently | Preview/static host; workflow can deploy root static or `apps/mobile/dist` depending lane | Keep as preview/evidence role until serving architecture is unified |
| **Vercel** | **NO** | Hosting/edge/serverless platform only | Current staging host; exact integrated deployment does not select `apps/mobile` export | Future canonical Web/PWA host may remain Vercel, but must be wired to authoritative Reader + preserved route/SEO capabilities; no alias move in Phase 2 |
| **CP5 route/SEO runtime** | **NO — old HTML rendering is not design authority** | **YES — canonical routing, redirects, SEO, structured data, sitemap, feed, robots, analytics and HOSPAZ/direct-ad continuity** | Previously exercised through Vercel/public handler and rehearsal runtime | Recover/port capability, not legacy presentation |
| **AG-06 Newsroom** | Public Reader: **NO**. Staff Newsroom/Studio presentation remains a separate protected surface pending convergence | **YES — authentication, RBAC, server capability/session/story lifecycle authority** | Protected API + staff surface | Consume existing authority; do not recreate auth/RBAC in Reader |
| **CA-01 internal communications** | Public Reader: **NO**. Studio communications UI may consume it | **YES — story discussion, assignments/reviews/corrections, Inbox, threads/messages, attachment/realtime authorization** | Server + Studio integration | Preserve certified server authority; Realtime remains transport/invalidation, not authorization |
| **COM-01 communications** | Public Reader: **NO** | **YES — communications domain, consent/suppression, message/thread/provider normalization and campaign/escalation authority already implemented** | Server/API/provider integration; live provider certification remains parked | Preserve runtime; provider wiring remains parked; do not rebuild in frontend convergence |

## 11. Future single Web/PWA serving architecture

Phase 2 freezes the required architecture contract without implementing it.

The future Web/PWA must be one product, not two competing frontends.

### Required presentation layer

`apps/mobile` / Expo Router / React Native Web is the canonical Reader presentation source.

A Web/PWA deployment must build the universal Reader web artifact from this source rather than defaulting to the legacy root public UI.

### Required data/content layer

The Reader must consume the accepted migrated Supabase corpus through the existing domain/repository contracts.

Phase 1 authority remains:

- 5,737 WordPress posts;
- 49 WordPress pages;
- 5,786 migrated public objects;
- 3 authors;
- 83 categories;
- 10,283 tags;
- 3,277 media records;
- 3,275 canonical media objects plus 2 explicit source exceptions;
- 5,786 public URL mappings;
- 2,430 stale storage objects preserved.

The temporary WordPress Source Parity bridge may remain a controlled fallback/evidence mechanism until the Supabase-backed repository cutover is certified, but it is not a reason to create another UI.

### Required public-route/SEO layer

Before a request reaches or renders the Reader, the serving architecture must preserve CP5 behavior for:

- canonical-path resolution;
- redirect decisions;
- explicit 404s;
- canonical/robots/Open Graph metadata;
- structured data;
- sitemap;
- RSS;
- legacy context paths;
- migrated-media canonical references;
- analytics continuity;
- HOSPAZ/direct-ad continuity.

The exact implementation mechanism is a Phase 3/Phase 4 concern. Phase 2 requires only that the capability survive and that legacy CP5 HTML not become the presentation source.

### Required protected application layer

The unified product must consume, not recreate:

- AG-06 authentication/RBAC/session/story authority;
- CA-01 internal discussion/Inbox/thread/attachment/realtime authority;
- COM-01 communications domain and provider-normalization authority;
- NM-07 universal Reader/native certification architecture.

Frontend role labels must never replace server capability checks.

### Required hosting layer

The canonical Web/PWA host must deploy the same authoritative universal Reader artifact while exposing the preserved CP5 route/SEO capabilities.

GitHub Pages may remain a preview/evidence surface.

Vercel may remain the staging/production web platform, but its project configuration must eventually point at the unified architecture rather than treating repository-root static files as the public Reader by default.

No host is itself a product authority.

## 12. Candidate eventual retirement — no deletion authorized

The following are **candidates for retirement or repurposing only after successful convergence and certification**:

### Legacy public presentation

- root `index.html`;
- root `article.html`;
- root `premium.html`;
- root `archive.html`;
- root `preferences.html`;
- root `about.html` where superseded by universal routes;
- root public `404.html`;
- `app.js`;
- `v21.js`;
- `styles.css`;
- `v21.css`;
- `v21-fixes.css`;
- `quality-pass.js`;
- `quality-pass.css`;
- `reader.js`;
- `reader.css`;
- root public `site.webmanifest`;
- root public `sw.js`;
- public-only portions of `ad-placement.js` once equivalent governed Reader advertising is certified.

### Deployment workflow behavior

The `main` static-root branch of `.github/workflows/pages.yml` is a candidate for retirement/rewiring after the universal Web/PWA serving path is certified.

The NM-07 universal export logic is capability evidence to preserve or migrate into the final web deployment workflow.

### CP5 presentation rendering

Legacy HTML rendering inside `lib/ag05-public-runtime.js` is a candidate for refactoring/replacement once its routing/SEO/metadata/ad capabilities are consumed by the universal Reader serving architecture.

**The CP5 capability contract itself is not a retirement candidate.**

### Explicitly not retirement candidates in Phase 2

Do not delete or retire:

- `apps/mobile`;
- AG-04 migrated data;
- CP5 RPC/database capability;
- AG-06 server authority;
- CA-01 server authority;
- COM-01 runtime;
- HOSPAZ source/campaign custody;
- Newsroom/Studio protected surfaces merely because root public Reader files are legacy.

Root `newsroom.html`, `newsroom.js`, `newsroom-v21.js` and related Newsroom CSS are not classified for deletion by this phase. Their eventual presentation disposition requires protected Studio convergence evidence, not a public-Reader assumption.

## 13. Phase 3 responsibility — recover CP5 capabilities without restoring legacy presentation

Phase 3 must recover/port the accepted CP5 executable capability into the current convergence lineage.

It must:

- consume the live, already-applied CP5 database effects identified in Phase 1;
- avoid migration replay;
- restore route-resolution/SEO/sitemap/feed/robots/structured-data/analytics/direct-ad capability at code/deployment level;
- preserve HOSPAZ source truth without inventing destination/schedule/placement conditions;
- resolve `vercel.json` routing/security composition with AG-06/CA-01/COM-01 requirements;
- retain `apps/mobile` as presentation authority;
- not copy CP5's legacy public HTML as the new Reader;
- not rebuild AG-06, CA-01, NM-07 or COM-01.

Phase 3 must produce a new candidate SHA and exact evidence before any affected frozen operation can be released.

## 14. Phase 4 responsibility — unified Web/PWA serving architecture

Phase 4 must make the universal Reader and preserved CP5 capabilities one deployable Web/PWA system.

It must:

- make `apps/mobile` the web presentation build;
- connect it to the accepted migrated Supabase corpus through existing contracts;
- preserve canonical/legacy route handling and server-visible SEO;
- preserve sitemap/feed/robots;
- preserve analytics continuity;
- map governed advertising/HOSPAZ capability into Reader ad placements without hardcoding campaign truth;
- preserve AG-06/CA-01/COM-01 server authority;
- establish one explicit Vercel Web/PWA build/route contract;
- eliminate the accidental product split between root-static Vercel and universal-Reader Pages;
- rerun affected route/SEO/security/PWA/browser/performance/accessibility certification against the new exact SHA.

Phase 4 must not independently recreate any accepted subsystem.

## 15. Contradictions and convergence risks discovered

### C-01 — Master Plan approval metadata is stale

The Master Plan says draft/not authorized, while its direct child commit is the approved DESIGN and the next child begins `apps/mobile` implementation. Later integrated certification also depends on that implementation.

**Disposition:** governance contradiction recorded; does not overturn the later approved design/implementation lineage.

### C-02 — Approved wireframe image is absent

`HEALTHTIMES_NATIVE_WIREFRAME_V1.png` is not under repository custody.

**Disposition:** existing `DESIGN.md` explicitly acts as textual authority until the image is recovered. Not a Phase 2 blocker.

### C-03 — GitHub Pages contains two presentation deployment lanes

`02cd2c90...` intentionally preserves root-static `main` deployment and universal `apps/mobile` deployment for NM-07.

**Disposition:** hosting split, not product-authority split. Final architecture must converge to one Web/PWA product.

### C-04 — Vercel integrated deployment does not build the universal Reader

The exact `0112c880...` Vercel deployment is READY, but its repository configuration does not select/export `apps/mobile`; the root static public frontend remains present.

**Disposition:** deployment configuration drift. Vercel appearance must not be interpreted as design authority.

### C-05 — Accepted CP5 executable runtime diverged from integrated runtime

CP5 and `0112c880...` diverged at `ea599bf9...`; 75 CP5-side commits are not in the integrated side. Critical CP5 executable files are absent from `0112c880...`.

**Disposition:** Phase 3 convergence requirement. CP5 acceptance is preserved; CP5 legacy visual presentation is not.

### C-06 — CP5 database capability is live even though CP5 migration files are absent from later repository lineage

Phase 1 proved the CP5 RPC/schema effects remain live while the later repository lineage lacks the corresponding AG-05 migration files and has migration-ledger timestamp divergence.

**Disposition:** forward-only ledger adoption/reconciliation. **NO migration replay.**

### C-07 — Root public UI and universal Reader coexist in one integrated tree

The integrated tree contains both products.

**Disposition:** coexistence is evidence/provenance, not dual authority. `apps/mobile` is canonical presentation; root public UI is preserved legacy evidence until later certified retirement.

## 16. Frozen operations remain frozen

Phase 2 releases no Phase 0 operation.

Still prohibited:

- `supabase db reset`;
- migration re-import/replay;
- database restore;
- table/column drops;
- destructive schema cleanup;
- storage cleanup;
- deletion of the 2,430 stale storage objects;
- deletion of the legacy root frontend;
- deletion/replacement of `apps/mobile`;
- broad UI redesign;
- primary Vercel staging-alias movement;
- production deployment;
- production database mutation;
- production DNS/MX/email changes;
- PR merges;
- COM-01 provider wiring;
- AG-08 start.

A frozen operation may resume only after the responsible convergence phase produces evidence and the moderator explicitly releases that operation.

## 17. Phase 2 receipt

- Product/design authority: **`apps/mobile` universal Reader**
- Legacy/superseded public presentation: **repository-root public UI**
- GitHub Pages: **preview/deployment role, not product authority**
- Vercel: **hosting/deployment role, not product authority**
- CP5: **routing/SEO/platform capability authority; legacy presentation not canonical**
- AG-06: **Newsroom security/application capability authority**
- CA-01: **internal communications capability authority**
- COM-01: **communications capability authority; provider wiring still parked**
- Runtime files changed: **NO**
- Database changed: **NO**
- Storage changed: **NO**
- Vercel alias changed: **NO**
- Production changed: **NO**
- PRs merged: **NO**
- COM-01 provider work resumed: **NO**
- AG-08 started: **NO**
- Broad implementation performed: **NO**

**PHASE 2 COMPLETE — FRONTEND AUTHORITY FROZEN / READY FOR PHASE 3**
