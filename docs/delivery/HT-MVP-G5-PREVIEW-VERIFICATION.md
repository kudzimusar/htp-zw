# HealthTimes G5: protected Preview verification

**Status:** prepared on 2026-11-14 for the next Owner-authorized protected Preview. **Not yet run:** no Preview of the integrated candidate exists.
**Audience:** release engineer and independent reviewer.

Some G5 behaviour can only be proven on Vercel itself, not by the compiled routing table or the local replica: how query strings are merged on rewrites, host-conditioned headers, and CDN caching. `scripts/web/g5-preview-verify.mjs` checks all of it on a real Preview, with pass/fail results and an evidence file.

## Authentication: use the short-lived OIDC header only

- **Do not use `vercel curl`.** When no bypass secret is supplied it calls `getOrCreateDeploymentProtectionToken(…, { createIfMissing })`. That **creates a persistent automation protection-bypass secret on the project**, which is the kind of secret the Owner revoked on 2026-11-08. This was confirmed in `@vercel/cli-support` code shipped with vercel 65.14.0.
- **Do not** create shareable links, protection exceptions or bypass secrets, and do not disable Deployment Protection.
- **Use** the development OIDC token for the project that owns the Preview. A local development token can reach the same project's Preview deployments by default, with no Trusted Sources change needed:

```bash
# In a directory linked to the Preview's own Vercel project (local link only; no project setting changes)
vercel env run -- node scripts/web/g5-preview-verify.mjs \
  --base https://<deployment>.vercel.app \
  --preserved /<a preserved WordPress article path>/ \
  --alias /<a CP5 alias path>/ \
  --upload /wp-content/uploads/<yyyy>/<mm>/<a mirrored file> \
  --browser --out g5-preview-verify
```

**How the suite protects the token:**
- It refuses any host other than `https://<name>.vercel.app`, and refuses to start without `VERCEL_OIDC_TOKEN`.
- It sends the token **only to the Preview origin**. In browser mode the header is attached by origin-scoped routing, so third-party requests (Cloudflare media, Supabase) never receive it.
- It never follows redirects, so the `/wp-content/uploads` 301 to Cloudflare cannot carry the token.
- It never prints or stores the token. The evidence keeps only non-sensitive response headers; for `Set-Cookie` it records cookie names, never values.

## What it checks

| Group | Checks | Pass condition |
|---|---|---|
| A. Protection | The Preview answers 401, 403 or a redirect without credentials | Protection is on |
| B. Reader-shell function | `/wp-admin/…` (rejected before any lookup) returns 404 with `X-HTP-Shell: bundled` and the Reader root; a spoofed `x-forwarded-host` plus cookies gives the same result; `/_htp/reader-shell` does not exist | The shell is bundled; no header trust; no recursion surface |
| C. Query rewrites | A duplicate `htpPath` cannot re-target the renderer; tracking parameters are ignored; UTF-8, encoded traversal, encoded slash and over-long paths never return 5xx or resolve wrongly; `robots.txt` and `/feed` work with query strings | **Records how Vercel really merges query strings** |
| D. Preview indexing | `X-Robots-Tag: noindex` on HTML, the page function, the API, the manifest and a hashed bundle; `robots.txt` disallows everything | No preview content is indexable |
| E. CDN caching | 404 and CP5 301 are publicly cacheable and identical on repeat (`x-vercel-cache` recorded); the preserved article is shared-cacheable with no `Vary: Cookie`; commerce and communications APIs are never publicly cached | No user-specific content in shared cache. The only cookie allowed on shared responses is Vercel's Skew Protection cookie `__vdpl` (the client Preview project has skew protection enabled); any other `Set-Cookie` fails, with its name recorded. |
| F. Security headers | CSP exactly as in `vercel.json`, plus HSTS, nosniff, X-Frame-Options, Referrer-Policy and Permissions-Policy on static HTML, the page function, an API and a static asset | All present |
| G. Legacy uploads | `/wp-content/uploads/*` returns a 301 to `https://healthtimes-media.pages.dev/wordpress/*` | Redirect correct |
| H. Browser (`--browser`) | Home, Explore, Premium, About, Studio and the preserved article render with 0 CSP violations and 0 page errors | Same as the local lab, on Vercel |

**Staging restriction.** While staging returns HTTP 402, checks that need a real CP5 lookup (the preserved article and the alias) report `BLOCKED_STAGING_402` instead of FAIL. Their evidence shows `X-HTP-Page: backend-unavailable`.

**CDN invalidation.** The Vercel CDN cache is scoped to each deployment, so a new deployment starts empty. Page responses expire within `s-maxage` (article 300 s, alias 3,600 s, 404 600–3,600 s).

## Self-test without a Preview

The suite runs in CI and locally against the compiled-route replica, with no token and no protection:

```bash
node scripts/web/g5-edge-lab.mjs --serve &          # prints {"replica":"http://127.0.0.1:<port>"}
node scripts/web/g5-preview-verify.mjs --local-replica http://127.0.0.1:<port> \
  --preserved /cholera-response-update/ --alias /2026/10/30/cholera-response-update/ \
  --upload /wp-content/uploads/2026/09/example.jpg
```

| Target | Result on 2026-11-14 |
|---|---|
| Replica | 22 pass, 0 fail, 6 not applicable (the indexing checks apply only on `*.vercel.app`) |
| Plain static server without the G5 edge | 14 failures |
| Unreachable target | A clean failure, with evidence still written |

## Production cutover

The suite refuses non-Preview hosts on purpose. After DNS cutover, run the checks in `HT-MVP-G5-WEB-LAUNCH-RUNBOOK.md` section 4 without any credential. Production must be **indexable**:
- no `X-Robots-Tag` on article pages;
- `robots.txt` lists the disallowed paths and the sitemap.
