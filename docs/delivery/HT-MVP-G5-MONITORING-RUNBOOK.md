# HealthTimes G5 monitoring and incident runbook

**Status:** prepared on 2026-11-14 on the local G5 branch; not yet in operation.
**Audience:** HealthTimes operations, on-call engineer, Incident Commander.

This runbook covers the public website after the G5 cutover. It uses only free or already-paid services. No paid monitoring service is enabled.

## 1. What to watch

| Signal | Where | Normal | Act when |
|---|---|---|---|
| Site up | External check (Owner choice: a free uptime monitor, or a scheduled GitHub Actions probe) on `/`, `/robots.txt`, `/feed` and one archive article URL | HTTP 200 | 2 consecutive failures |
| Server errors | Vercel → Project → Logs/Observability; `X-HTP-Page` header on page responses | `story`, `context`, `redirect`, `not-found` | Any `backend-unavailable` (HTTP 503) or rising 5xx on `/api/public` |
| Supabase restriction | `staging-readonly-probe.sh` (see custody `HT-MVP-PUBLIC-LAUNCH-01-G3-LR02/evidence/`), run once per check, never in a loop | `STAGING_RECOVERED` (all reachable) | Any `402 RESTRICTED` |
| Supabase egress | Supabase → Organization → Usage (cached and uncached egress, per day) | Well under plan quota | More than 50% of the monthly quota used before mid-cycle |
| Content freshness | Newest item in `/feed` | Newest story under 24 hours old | Over 24 hours during the news day |
| Archive media | Cloudflare Pages analytics for `healthtimes-media.pages.dev`; one image HEAD request | HTTP 200 | Any 5xx, or 404 on a known key |
| Client errors | Off by default (section 3) | — | Only after the Owner enables capture |

**Supabase on the Free plan has no grace period left.** The next quota overage restricts the whole project immediately (Auth, Storage, REST, Functions). Watch egress weekly, and keep all public images on Cloudflare.

## 2. Incident steps

1. **Classify.** Site down, data unavailable (Supabase), images broken (Cloudflare), or wrong or unsafe content.
2. **Contain.**
   - Bad deployment: in Vercel, use instant rollback to the previous production deployment, then confirm the old SHA is in `/build-info.json`.
   - Supabase restricted: the page renderer already returns 503 with `Retry-After`. Post a status notice. The Owner decides between upgrading the plan or waiting for the cycle reset.
   - Media failure: do not point images back at Supabase on the Free plan, because that would exhaust egress. Restore the Cloudflare deployment from its previous version.
   - Unsafe content: unpublish in Newsroom Studio. The page renderer's CDN cache expires within 5 minutes (`s-maxage=300`).
3. **Communicate.** The Editor-in-Chief informs readers if needed. The Owner informs the client.
4. **Record.** Write a short incident note: timeline, cause, fix, follow-up owner.

## 3. Client error capture (prepared, off)

`apps/mobile/src/monitoring/client-errors.ts` installs nothing and sends nothing unless the build sets `EXPO_PUBLIC_HEALTHTIMES_ERROR_ENDPOINT`.

When enabled, each report contains only:
- the error kind and message;
- up to 8 stack frames;
- the page path, without query string or fragment;
- the release.

Emails, tokens, identifiers, phone numbers and long secrets are removed. Reports are sampled at 25%, de-duplicated, and capped at 5 per page session. Capture never listens to `message` events.

**A collector is required before enabling. This is an Owner decision.**

| Option | Cost | Notes |
|---|---|---|
| A. Supabase Edge Function that writes to a `client_errors` table | Free tier | Needs Owner-authorized DDL and a function deploy. It adds a small database load, so check the egress budget. |
| B. A new Vercel function | Free tier limits | The G3 preview packager allows exactly four function bundles. Adding one needs G3 approval. |
| C. Hosted service (for example Sentry's free tier) | Free tier, third party | Needs that service's SDK or ingest format, a CSP `connect-src` entry, a Privacy Policy line and a data-processing agreement. |

Whichever option is chosen, also:
- add the collector origin to `connect-src` in `vercel.json` if it is not same-origin;
- add a line to the Privacy Policy draft;
- set the build variable only in the production project.

## 4. Cost guardrails

- **Supabase Free:** 5 GB cached and 5 GB uncached egress per cycle, with no grace period left. Archive images come from Cloudflare (`EXPO_PUBLIC_HEALTHTIMES_MEDIA_BASE_URL`). Page responses are CDN-cached (`s-maxage=300`, 404s 600 s). Bot paths, files and internal prefixes never reach Supabase.
- **CI:** 13 staging-mode browser workflows load archive images on every push. Point them at Cloudflare, or limit when they run, before the cycle resets (see the G3-LR02 return).
- **Vercel:** page-renderer invocations happen only for addresses with no static file. Watch invocation counts after DNS cutover, when legacy WordPress traffic arrives. The Hobby plan does not allow commercial use; the Owner must confirm the plan.
- **Cloudflare Pages:** archive deployments are full-site uploads. Batch them at most daily (500 builds per month on the free tier).

## 5. Roles

| Role | Holder (client to name) | Responsibility |
|---|---|---|
| Incident Commander | | Declares incidents and authorizes rollback |
| On-call engineer | | Runs the containment steps above |
| Editor-in-Chief | | Content incidents, reader communication |
| Owner | | Billing, plan and provider decisions |
