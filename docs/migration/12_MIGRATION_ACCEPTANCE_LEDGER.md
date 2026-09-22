# Migration Acceptance Ledger

| Gate | Status | Evidence |
| --- | --- | --- |
| Repository inspected | Prepared | README, docs, source and tests reviewed |
| Baseline Chromium UAT run | Partial | 23 passed, 3 pre-existing failures |
| WordPress public inventory | Prepared | REST counts, sitemap, RSS, robots, DNS |
| Production architecture chosen | Prepared | Vercel + Supabase + Cloudflare recommendation |
| Production schema scaffold | Prepared | Supabase migration added |
| Idempotent provenance model | Prepared | `legacy_sources.stable_key` and importer checksum |
| REST importer dry run | Prepared | `scripts/migration/wordpress-importer.js` |
| WXR/database ingestion | Scaffolded | Mode placeholders and mapping plan |
| Media migration plan | Prepared | Manifest and storage plan |
| SEO/redirect plan | Prepared | Preserve legacy root slugs where practical |
| Newsroom backend/auth plan | Prepared | Server-side capability enforcement plan |
| Client access request | Prepared | Access request document added |
| Staging rehearsal runbook | Prepared | Runbook added |
| Production cutover runbook | Prepared | Runbook added, not executed |
| Rollback runbook | Prepared | Runbook added |
| Migration transform tests | Prepared | Playwright test file added |
| Analytics/SEO/monetization lane | Prepared | Dedicated document 13 plus schema extensions |
| ads.txt scaffold | Prepared | Confirmed publisher identity added and tested |
| app-ads.txt scaffold | Prepared | Future app monetization file added and tested |
| Final full UAT | Pending | Run after migration prep changes |

## Minimum Production Gates

- All expected published articles accounted for.
- All authors mapped.
- Taxonomies mapped or exception-listed.
- Required media accounted for.
- No unexplained broken internal links.
- Near-complete legacy URL coverage.
- Metadata/SEO verified.
- No Newsroom privilege escalation.
- No public exposure of drafts/internal data.
- No secrets committed.
- Backups tested.
- Restore procedure documented.
- Chromium UAT green or pre-existing failures explicitly accepted.
- Mobile/PWA/public smoke testing green.

## Analytics, SEO, Audience And Revenue Gates

- Existing Google Analytics continuity verified.
- Search Console property verified.
- Production pages emit expected analytics pageviews.
- Canonical URLs verified.
- Structured data passes validation.
- Sitemap accepted.
- `robots.txt` correct.
- `ads.txt` returns HTTP 200 and correct publisher identity.
- `app-ads.txt` returns HTTP 200 before app monetization.
- AdSense placements render without layout shift.
- Direct ads are distinguished from AdSense.
- Analytics do not capture protected Newsroom data.
- PageSpeed baseline recorded.
- No monetization secrets exist in client JavaScript.
- Historical imported metrics retain provenance.
- Global country reporting becomes available after integration.

## CP5 — SEO / Analytics / Monetization Continuity — MODERATOR ACCEPTED — 2026-09-22

Certified runtime candidate: 0ba7240d018efa2472a00f56453e9aa8be34e1c5

Moderator decision: **CP5 ACCEPTED**

| CP5 gate | State | Evidence |
| --- | --- | --- |
| CP3 authoritative public-object baseline | PASS | 5,737 posts + 49 pages = 5,786 |
| AG-04 canonical URL handoff | PASS | 5,786 / 5,786 mappings; 5,786 distinct sources; all PRESERVE_DIRECTLY / HTTP 200 |
| Active-rerun race protection | PASS | certification now waits for 5,786 mappings, 5,786 distinct sources and zero active AG-04 rehearsal runs |
| Canonical/redirect policy | PASS | 5,786 canonical preserved-direct objects; 0 canonical redirects; 0 canonical exceptions; 0 homepage catch-alls |
| Historical story aliases | PASS WITH EXPLICIT EXCEPTIONS | 341 deterministic one-hop aliases / 661 occurrences; 28 explicit 404 paths / 66 occurrences; no redirect chains |
| Category/context destination policy | PASS FOR AG-05 ROUTING | 429 category occurrences across 36 exact source paths; imported-section-backed HTTP 200 noindex context routes |
| Historical author aliases | EXPLICIT EVIDENCE GAP | 7 occurrences remain 404 until authoritative source alias evidence is supplied |
| Source SEO metadata preservation | PASS WITH SOURCE SPARSITY | 2 source SEO titles; 1,973 source SEO descriptions; no plugin metadata invented |
| Initial-HTML SEO | PASS ON CERTIFIED RUNTIME | story/page renderer emits title, permitted description fallback, canonical, robots, OG/Twitter, dates, author/section where real |
| Structured data | PASS | NewsArticle, Article, Person when real, Organization, BreadcrumbList, CollectionPage |
| Sitemap | PASS | guarded runtime HTTP 200 with 5,786 URLs; stale primary alias is carried to CP7 integrated-staging routing |
| robots.txt | PASS | guarded runtime HTTP 200 and staging Disallow policy; stale primary alias is carried to CP7 integrated-staging routing |
| RSS/feed | PASS | guarded runtime HTTP 200, 50-item sample; stale primary alias is carried to CP7 integrated-staging routing |
| Representative legacy routes | PASS | 13/13 live rehearsal tests green; stale primary alias remains an integrated CP7 routing requirement |
| HOSPAZ provenance binding | PASS | 32960, 32971, 33005 bound to migrated media identities; canonical storage objects exist |
| HOSPAZ commercial fields | EVIDENCE GAP | destination, schedule, conditions remain UNKNOWN; no click target invented |
| AG-04 media/content parity | OUTSIDE AG-05 / CP4 STILL NOT ACCEPTED | no AG-04 parity claim made; supplied CP4 blocker boundary preserved |
| Migration tests | PASS | run 35685659947: 60 / 60 |
| Validate HealthTimes 2.0 | PASS | run 35685659694 |
| Browser smoke | PASS | job 106611789132 |
| Live completed-rehearsal runtime | PASS | job 106611789406: 13 / 13 |
| CLS / Lighthouse | PASS | job 106612369495; all tested CLS <= 0.10 |
| AG-05 certification | PASS | run 35685656455 |
| Exact-head Vercel preview | PASS | dpl_DiC5U13hXBfgotJo921KqoqoXPrq READY at runtime SHA 0ba7240d... |
| CP7 integrated staging candidate / platform routing requirement | CARRIED TO CP7 | healthtimes-staging.vercel.app remains on AG-02 SHA 4512b7d... and must be reassigned before integrated CP7 UAT |
| GA4 / Search Console / AdSense account proof | EVIDENCE GAP | ownership/settings/history unavailable; not fabricated |
| Google Ads truth | EVIDENCE GAP | incomplete configuration; no campaign/conversion truth invented |
| Production systems untouched | PASS | WordPress/DNS/GA/Search Console/AdSense/Google Ads production systems unchanged |

### Post-AG04 Lighthouse retest

| Page | Strategy | Score | LCP | CLS | INP |
| --- | --- | ---: | ---: | ---: | --- |
| Archive | Desktop | 98 | 1047 ms | 0.0026 | N/A in lab |
| Archive | Mobile | 98 | 2029 ms | 0.0631 | N/A in lab |
| Direct-ad preview | Desktop | 100 | 708 ms | 0.0000 | N/A in lab |
| Direct-ad preview | Mobile | 100 | 1007 ms | 0.0000 | N/A in lab |
| Home | Desktop | 92 | 1805 ms | 0.0561 | N/A in lab |
| Home | Mobile | 89 | 3750 ms | 0.0000 | N/A in lab |
| Migrated story | Desktop | 100 | 752 ms | 0.0000 | N/A in lab |
| Migrated story | Mobile | 91 | 3469 ms | 0.0000 | N/A in lab |
| Premium | Desktop | 100 | 449 ms | 0.0026 | N/A in lab |
| Premium | Mobile | 98 | 1981 ms | 0.0000 | N/A in lab |

INP was unavailable from the lab runs and is not fabricated.

**CP5 ACCEPTED — moderator-accepted at certified runtime 0ba7240d018efa2472a00f56453e9aa8be34e1c5. The stale healthtimes-staging.vercel.app alias is reclassified as a CP7 INTEGRATED STAGING CANDIDATE / PLATFORM ROUTING REQUIREMENT and must be reassigned before integrated CP7 UAT.**

Production systems modified: NO
