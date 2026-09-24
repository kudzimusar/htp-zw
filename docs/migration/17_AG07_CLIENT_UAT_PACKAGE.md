# HealthTimes — Pre-CP7 Client UAT Package

Prepared for: **Michael Gwarisa**

Prepared by: AG-07 pre-CP7 readiness lane

Status: **PACKAGE PREPARED / FORMAL CLIENT UAT NOT YET STARTED**

## Important test-entry rule

Do not begin formal acceptance against the current COM preview runtime `5b6fca0fe1dceed5e167b845e023dfc456c47040`.

A cross-lane integration defect was found: the accepted CP5 migrated public-route/SEO runtime has not been incorporated into that candidate. The final client staging URL will be supplied only after a new integrated CP5+AG-06+CA-01+NM-07+COM-01 candidate is built and exact-head certified.

The eventual formal client UAT surface should be:

- primary staging URL: `https://healthtimes-staging.vercel.app`
- exact candidate SHA: **TO BE RECORDED AFTER REMEDIATION**
- exact deployment ID: **TO BE RECORDED AFTER REMEDIATION**

Do not use production credentials. Any staging credentials supplied later must be dedicated staging identities.

## What Michael should compare

Use the current WordPress HealthTimes site only as a content/source reference. The new product is not expected to reproduce the old theme pixel-for-pixel.

Assess:

- whether HealthTimes still feels recognizably like HealthTimes;
- whether migrated stories/pages are complete and readable;
- whether old and recent content can be found;
- whether images/media are correct;
- whether Zimbabwe coverage remains strong while Africa/global navigation is clear;
- whether mobile reading feels like a real mobile product;
- whether Premium presentation is understandable;
- whether advertising is clear and non-destructive;
- whether Listen works naturally;
- whether Newsroom editorial/commercial workflows are understandable.

## What deliberately stays authoritative

The migration preserves:

- 5,737 published posts;
- 49 published pages;
- 5,786 public objects;
- 3 public authors;
- 83 categories;
- 10,283 legacy tags for provenance;
- legacy source URLs and deterministic routing where source evidence exists;
- existing AdSense publisher identity;
- HealthTimes editorial/Newsroom role separation.

Internal authority remains server-backed. Frontend role labels are not security authority.

## What has changed

The target product introduces or formalizes:

- modern responsive HealthTimes publication UX;
- mobile/PWA and Native app surfaces;
- controlled global/Africa taxonomy on top of preserved source provenance;
- Premium reader flows;
- Listen;
- server-backed Newsroom sessions/capabilities;
- private internal communications and verified Reader discussions;
- communications/consent/suppression foundations;
- migration-aware SEO/routing;
- direct-ad/AdSense separation.

## Formal UAT scenarios

Record PASS/FAIL plus a short note for each.

### Public publication

1. Open homepage on desktop.
2. Open homepage on phone.
3. Open a recent migrated story.
4. Open an older migrated story.
5. Open a long-form story.
6. Check a story containing multiple images/gallery.
7. Check a story containing a table.
8. Check an embedded/video story.
9. Check a download/document story.
10. Open a legacy institutional page.
11. Browse Zimbabwe content.
12. Browse Africa/global content.
13. Use search/archive.
14. Follow representative old HealthTimes links and confirm the destination makes sense.
15. Verify images are relevant and not broken.
16. Verify no obvious old WordPress media dependency remains.

### Premium / Reader

17. Open a public story.
18. Open a Premium-labelled story.
19. Observe preview/warning/lock behavior.
20. Refresh and confirm the expected state persists.
21. Use Listen on an allowed story.
22. Confirm Listen stops/does not bypass the Premium boundary.
23. Exercise Reader account access where staging credentials are supplied.
24. Exercise permitted Reader discussion/comment.
25. Confirm a restricted or anonymous path does not expose private discussion capability.

### Advertising / commercial presentation

26. Review homepage advertising on desktop.
27. Review homepage advertising on phone.
28. Review article advertising on desktop.
29. Review article advertising on phone.
30. Verify the HOSPAZ creative is not destructively cropped or over navigation.
31. Confirm direct advertising is visually distinguishable from editorial content.

### Newsroom Reporter

32. Sign in with staging Reporter.
33. Open/create a story.
34. Edit and save.
35. Refresh and recover the saved state.
36. Submit for review.
37. Attempt direct publish and record that it is denied.

### Newsroom Editor

38. Sign in as staging Editor.
39. Open the submitted Reporter story.
40. Review/comment.
41. Request/advance changes as available.
42. Publish where the role/capability permits.
43. Confirm the published/audit result is visible.

### Commercial

44. Sign in as staging Commercial.
45. Open allowed commercial/advertising surfaces.
46. Attempt to edit/publish an editorial story and confirm denial.

### Publisher/Admin

47. Review staff/access surface.
48. Review session/access lifecycle.
49. Demonstrate session revoke.
50. Demonstrate access revoke where staged.
51. Review audit evidence.

### Internal communications

52. Verify story discussion is attached to the correct story.
53. Verify assignments are distinct from general coordination.
54. Verify staff Inbox notifications.
55. Verify typed general coordination thread/message behavior.
56. Confirm Reader discussion remains a separate domain.

### PWA/mobile

57. Verify mobile top/bottom navigation.
58. Verify no horizontal overflow.
59. Verify PWA manifest/install surface where supported.
60. Verify offline/failure behavior does not expose private Newsroom content.
61. Review Watch/Video and Saved/Listen surfaces where available.

## Communications provider note

The application-side communications runtime may be reviewed, but these live-provider items are not yet client acceptance claims:

- Resend real transactional delivery;
- signed Resend webhook;
- Brevo live contact sync;
- Brevo unsubscribe/bounce/complaint;
- Cloudflare real inbound email;
- Cloudflare real reply-thread routing.

They remain provider-access dependent until separately certified.

## How to report a finding

Each finding should contain:

- UAT ID;
- date/time;
- page/workspace;
- device/browser;
- exact steps;
- expected result;
- actual result;
- screenshot/video if useful;
- severity suggestion;
- whether it blocks acceptance.

Severity used by the programme:

- P0 — security/data loss/cutover impossible;
- P1 — critical workflow/content failure;
- P2 — significant defect requiring disposition;
- P3 — minor defect/polish;
- P4 — post-migration enhancement.

The technical lane will determine final severity and root-cause ownership.

## Acceptance focus

Michael is asked to judge:

- content completeness;
- HealthTimes identity/recognition;
- readability;
- mobile experience;
- navigation;
- media;
- search/archive;
- Premium experience;
- advertising presentation;
- Reporter/Editor workflow;
- Commercial workflow;
- general usability.

Michael is **not** being asked to certify database security, RLS, schema integrity, secret handling or direct API authorization; those remain technical certification responsibilities.

## Formal UAT status

UAT date: **NOT YET STARTED**

Client acceptance: **NOT RECORDED**

Unresolved client P0/P1: **NOT YET MEASURED**

Reason: formal UAT waits for the non-provider cross-lane integration defect to be remediated and the complete candidate to be frozen.

Production authorization: **NOT GRANTED**

## Phase 12 test-entry reconciliation — 2026-09-24

The earlier warning against testing runtime `5b6fca0...` remains historically correct, but its CP5-lineage blocker has been remediated by the Phase 4–12 convergence programme.

Current technically certified Phase 12 runtime:

`f36d6336c65c598191ea2841952a8c9f18bcf57e`

Controlled Phase 12 preview deployment:

`dpl_FTzbVeYbBdGS3d3mYfErJkFXxUHF`

The preview is `target:null` and Vercel-auth protected. Phase 12 did **not** move the primary staging alias because no separate alias-movement authorization was issued after preview certification.

Formal client UAT is still **PENDING CLIENT UAT**. The moderator must release the final client test-entry URL before Michael begins formal acceptance. This package must not infer client acceptance from technical certification.

Technical convergence P0/P1 at Phase 12 closure: **0 / 0**.

Provider-live email evidence, physical-device/store evidence and production-cutover items remain separately deferred and are not client acceptance claims.
