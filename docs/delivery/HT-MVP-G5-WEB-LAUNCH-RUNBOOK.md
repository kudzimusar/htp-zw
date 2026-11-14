# HealthTimes G5 public website launch runbook

**Status:** prepared on 2026-11-14 on the local G5 branch. **Nothing here is authorized yet.** Every step marked (Owner) needs explicit Owner authority at the time. No DNS, production or billing change has been made.
**Audience:** Owner, release manager, on-call engineer.

## 0. Preconditions (all required)

- G2 and G3 accepted. The final Reader and Newsroom SHA is certified in exact-head CI and independently reviewed.
- Staging recovered, and the editorial journey (create → review → publish → Reader → search, revise, unpublish) is proven.
- Policies approved by a named legal reviewer: `policiesApprovedForLaunch()` is true and the pages are republished without the draft banner.
- Launch scope decided by the Owner: Reader-only with commerce off (G4 pack, section 1), or commercial.
- Production hosting plan confirmed. Vercel Hobby does not allow commercial use; Supabase Free has no PITR and no remaining grace period.

## 1. What the edge already does (implemented and tested on the G5 branch)

| Concern | Implementation | Test or evidence |
|---|---|---|
| Security headers | `vercel.json`: enforced CSP (script hashes; no unsafe-inline or unsafe-eval), HSTS, nosniff, Referrer-Policy, X-Frame-Options, Permissions-Policy | `tests/g5-web-edge.test.mjs`; browser lab with 0 CSP violations; build fails if the CSP hashes drift |
| No indexing of previews | `X-Robots-Tag: noindex, nofollow` on every `*.vercel.app` host; `robots.txt` disallows everything except on `healthtimes.co.zw` and `www` | Web-edge tests |
| robots and sitemap | `/robots.txt` and `/sitemap.xml` served by `api/public.js` (sitemap from `ag05_public_sitemap_xml`) | Web-edge tests |
| RSS | `/feed` and `/feed/` → `kind=feed` | — |
| Legacy WordPress URLs | Preserved paths return 200 with server-rendered title, description, canonical, Open Graph, Twitter and JSON-LD. CP5 aliases return a real 301. Unknown paths return 404. Bot and file probes never reach Supabase. | Web-edge tests; browser lab (`scripts/web/g5-edge-lab.mjs`) |
| Legacy uploads | `/wp-content/uploads/*` → 301 to the Cloudflare archive (`healthtimes-media.pages.dev/wordpress/*`) | Manifest-key test |
| Page metadata | Titles and canonicals for all screens; `noindex` for personal, Studio, payment and draft-policy screens | `apps/mobile/tests/g5-route-metadata.test.mjs` |
| Dev route index | Expo's `/_sitemap` removed at build | Build guard |

## 2. Domain, DNS and TLS (Owner)

1. **Choose the canonical host.** The code assumes the apex `https://healthtimes.co.zw` (`lib/ag05-capability.js` `SITE_URL`, `apps/mobile/src/seo/route-metadata.ts`). Redirect `www` to the apex in Vercel domain settings.
2. **Production project.** Attach `healthtimes.co.zw` and `www.healthtimes.co.zw` to the dedicated **production** Vercel project, not `dist`. Vercel issues TLS certificates automatically once DNS points at it.
3. **Before cutover:**
   - Lower the DNS TTL to 300 seconds at least 24 hours ahead.
   - Record the current WordPress DNS values as the rollback target.
   - Keep WordPress reachable on a separate host for at least 30 days, for the ingest and source-parity paths.
4. **Cutover.** Point the apex and `www` records at Vercel as the Vercel domain screen instructs, then wait for certificate issuance.
5. **Email records.** Keep the MX, SPF, DKIM and DMARC records untouched. Only web records change.

## 3. Production environment (Owner; names only, values never in chat or the repository)

| Setting | Value or source |
|---|---|
| Web build (public) | `EXPO_PUBLIC_HEALTHTIMES_SERVICE_MODE`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `EXPO_PUBLIC_HEALTHTIMES_MEDIA_BASE_URL=https://healthtimes-media.pages.dev`. Leave `EXPO_PUBLIC_HEALTHTIMES_COMMERCE_ENABLED`, `EXPO_PUBLIC_HEALTHTIMES_NEWSLETTER_SIGNUP` and `EXPO_PUBLIC_HEALTHTIMES_ERROR_ENDPOINT` unset unless separately approved. |
| Server | `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `HEALTHTIMES_MEDIA_BASE_URL`; communication keys only if the newsletter is enabled; no `PAYNOW_*` for a Reader-only launch |
| CSP | `connect-src` allows `https://*.supabase.co`, so a new production Supabase project works without editing `vercel.json`. Tighten it to the exact project after cutover if wanted. |

## 4. Launch sequence

1. **Freeze.** Note the final SHA, the WordPress publishing freeze time (Newsroom OS becomes the only publishing authority) and the final sync SHA.
2. **Deploy.** Deploy the certified SHA to the production project. Record the previous production deployment as the instant-rollback target.
3. **Pre-DNS checks** against the production deployment URL (expect `noindex` there because it is `*.vercel.app`):

```
curl -sI https://<deployment>/ | grep -iE 'content-security-policy|strict-transport|x-robots-tag'
curl -s  https://<deployment>/robots.txt          # Disallow: / on vercel.app
curl -sI https://<deployment>/<a known preserved WordPress path>/     # 200 + text/html
curl -sI https://<deployment>/<a known alias path>/                   # 301 Location: canonical
curl -sI https://<deployment>/wp-content/uploads/<a mirrored key>     # 301 to healthtimes-media.pages.dev
```

4. **DNS cutover** (section 2).
5. **Post-DNS checks** on `https://healthtimes.co.zw`:
   - `robots.txt` lists the disallows and the sitemap line.
   - No `X-Robots-Tag` on article pages.
   - `/sitemap.xml` returns XML.
   - A shared article link shows its title and image in WhatsApp and Facebook previews.
   - The Lighthouse SEO check passes on Home and one article.
6. **Search Console.** Submit the sitemap. The Owner verifies the domain.
7. **Monitor for 72 hours** per `HT-MVP-G5-MONITORING-RUNBOOK.md`, especially Supabase egress, page-renderer 5xx and freshness.

## 5. Rollback

| Problem | Action | Time |
|---|---|---|
| Bad release | Vercel instant rollback to the recorded previous production deployment | Minutes |
| Site-wide failure | Revert the DNS records to the recorded WordPress values (low TTL) | TTL-bound |
| Durable fallback | G3 baseline `dpl_GXpXngWf…` (may be removed by Vercel around 2026-12-08) and the R5 sealed tarball | — |

## 6. Cost limits and operating risks

- **Supabase Free:** egress quota with no grace period left. Archive media must stay on Cloudflare, and the CI live-staging browser workflows must be reined in (see the G3-LR02 return). Daily backups are not managed on Free.
- **Vercel:** page-renderer invocations happen only for non-static addresses. Watch them after cutover, when legacy WordPress traffic and crawlers arrive.
- **Cloudflare Pages:** the archive is static; batch new-media syncs at most daily.

## 7. Client handover checklist

- Final source SHA and sealed custody bundle; this runbook and the monitoring runbook.
- Account ownership: domain registrar, DNS, Vercel team, Supabase organization, Cloudflare account, Expo organization, Apple and Google accounts.
- Named role holders: Incident Commander, on-call engineer, Editor-in-Chief, Finance and Security reviewers.
- The list of environment variable names per project (values handed over through the Owner's password manager only).
