# CI staging egress control

HealthTimes staging (`bzuvntbkevvuhfhqhkua`) runs on Supabase Free. The organization gets 5 GB of cached egress per billing cycle. In November 2026 the quota was exhausted and Supabase restricted the whole project: Auth, REST, Storage and Functions all returned HTTP 402 `exceed_cached_egress_quota`. The grace period has been used, so the next overage restricts the project again immediately.

The main driver was CI. Browser and emulator jobs render the Reader on every pull-request push, and each render downloads archive images from Supabase Storage. This control moves that image traffic to the verified Cloudflare Pages mirror described in [PUBLIC_MEDIA_CLOUDFLARE.md](PUBLIC_MEDIA_CLOUDFLARE.md). Live staging checks stay in place and stay mandatory.

## What the control does

`scripts/ci/public-media-mirror.sh` has two commands:

- **`enable`** confirms that the mirror serves a manifest-verified archive object, then exports `EXPO_PUBLIC_HEALTHTIMES_MEDIA_BASE_URL=https://healthtimes-media.pages.dev` to the later steps of the job. If the mirror is unreachable, the job fails. There is no fallback to Supabase.
- **`verify`** fails unless the mirror origin was compiled into the exported web bundle. Metro inlines `EXPO_PUBLIC_*` values at transform time, so a stale cache can produce a bundle without it.

The Reader's resolver (`apps/mobile/src/services/public-media-origin.ts`) maps only two kinds of media to the mirror:

- public `migrated-media` archive objects;
- `newsroom-public` keys on the verified allowlist.

Private buckets, signed URLs, Premium body delivery, REST, RPC, Auth and Functions are unchanged.

Every mirrored job places `enable` after its unit tests and before any build or Metro start. Unit suites therefore keep the default Supabase configuration that they assert. Every mirrored web build is followed by `verify`.

| Workflow | Jobs |
|---|---|
| `ag05-nm07-phase7-premium-hospaz.yml` | `convergence` |
| `nm07-phase6-migrated-corpus.yml` | `reader-convergence` |
| `phase10-visual-conformance.yml` | `candidate-web`, `candidate-ios`, `candidate-android` |
| `phase10-visual-evidence.yml` | `final-web` |
| `uat.yml` | `playwright` |
| `ui-wf01b-r2-owner-home-evidence.yml` | `owner-checkpoint-home` |
| `ui01-phase3-discovery.yml` | `discovery-web` |
| `ui01-phase4-media.yml` | `media-web` |
| `ui02-phase6a-native-cross-device.yml` | `ios-evidence`, `android-evidence` |
| `ui03-commercial-reader-conformance.yml` | `web-evidence` |
| `ui04-edition-full-reload-diagnostic.yml` | `diagnose-edition-reload` |
| `ui04-phase5-reader-ownership.yml` | `reader-ownership-web` |
| `ui05-phase6b-accessibility-states-responsive.yml` | `phase6b-quality` |
| `ui06-phase6c-final-cross-device-certification.yml` | `final-web-client-uat` |

These workflows also cancel superseded runs. Their concurrency group is keyed by ref, with `cancel-in-progress`. Six of them were previously keyed by commit SHA, which let every superseded push run to completion. `ui04-edition-full-reload-diagnostic.yml` previously had no concurrency group. Exact-head certification is unaffected, because the run for the latest head always completes.

The UI-03 evidence runner redirects verified WordPress image URLs to the same object as the rest of the job: Cloudflare when the job enabled the mirror, Supabase otherwise.

## Measured effect

The census uses `scripts/ci/media-request-census.mjs`. It runs a Chromium pass over 21 page views: Home, Explore, Watch, Search, Premium and two articles, at 390, 768 and 1440 pixels wide, with a fresh context per width. Requests to `*.supabase.co` are counted but never sent.

Both builds use the staging-browser workflows' environment. The baseline is `d61bd97` without the mirror; the change adds the `enable` step.

| | Without the mirror | With the mirror |
|---|---|---|
| Supabase Storage requests | 59 | 0 |
| Cloudflare mirror requests | 0 | 57 |
| Unique archive objects | 7 | 7 (same paths) |
| Rendered images loaded | 15 of 15 (archive images failed) | 99 of 99 |

The 7 source-parity archive images total 4.08 MB, including one 2.17 MB PNG. One such pass loads them 57 times, which is about 27 MB if each page view fetches its objects once. That traffic now goes to Cloudflare Pages static hosting, which has no egress charge.

## What still depends on staging

These checks still call live staging. They remain mandatory in their workflows. While staging is restricted they fail, and that failure must be classified as `BLOCKED_AUTHORITY`, never treated as a pass.

- REST and RPC suites, including `test:staging`, `test:nm05-premium-live`, `test:premium-hospaz`, `test:migrated-corpus` and `test:identity-security`.
- The live HEAD check of the 7 mapped Supabase objects in `test:source-parity`. HEAD requests carry no body.
- The canonical UAT (`npm run test:uat`), UI-03 evidence and UI-06 final certification, which all use the Premium teaser RPC.
- The staging-service builds: the HOSPAZ proofs in UI-03 and Phase 10, the Phase 10 Android staging APK, and the AG-05 and NM-07 staging-mode browser smoke tests. The JSON data still comes from staging, but archive images in these builds now come from the mirror.
- The `readonly-staging` jobs of AG-05 and NM-07.

**When they must run:**
- on the exact head of every candidate pull request, as today;
- with staging recovered, as one full exact-head pass before any protected Preview deployment is requested.

Confirm recovery first, with one run of the read-only probe. Do not re-push or re-run to retry known HTTP 402 failures, and never loop the live suites.

## Exclusions

The contract test (`tests/ci/staging-egress-control.test.mjs`) lists these exclusions explicitly. Any new job that both builds and renders the Reader must enable the mirror or be added to this list with a reason.

- `ht-mvp-owner-uat-p0-browser-endurance.yml` has its own branch-scoped mirror step for the media and launch branches. The accepted P0 branch keeps its certified configuration.
- `native-reader-product.yml` runs a Playwright spec with no page fixture, so the exported bundle is never rendered.
- `ui-wf01b-r2-p2-owner-android-apk.yml` builds a frozen product SHA, on dispatch or on one legacy branch.
- `ui-wf02a-search-native-visual.yml` runs only for one legacy base branch.

## Limits

- **Branch scope.** Pull-request workflows are read from the merge of the head into the base. Other branches therefore use this control only once they contain it, by merge or rebase.
- **Other Supabase traffic.** Newsroom uploads, staging REST and RPC traffic, and any public deployment built without the mirror still use Supabase. One example is `pages.yml`, which builds the public Pages Reader from `main`. Decide its media origin before `main` receives the source-parity snapshot.
- **Usage checks.** The control reduces CI image egress. It does not raise the quota. Check usage in the Supabase dashboard each week.

## Verify and roll back

```sh
node --test tests/ci/staging-egress-control.test.mjs
npm run build:phase4:web   # with the CI environment; add the mirror variable for the "after" case
node scripts/ci/media-request-census.mjs --out census.json
```

To roll back, revert the commit that introduced this document. That restores the previous workflows, which load archive images from Supabase.
