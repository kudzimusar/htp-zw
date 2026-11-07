# R5 Security technical return — NOT independent Security acceptance

**Frozen parent:** `fdb8d0f9e5d636fe047e9e4abf205c130acd25af`.
**R5 engineering SHA:** `28857a86320cabb3ee944d0e43cfc0b180fbaadb` (review final evidence SHA when assigned).
**Author:** implementation authority through GitHub `kudzimusar`; **NOT** a distinct third-party reviewer.
**Review:** `BLOCKED_INDEPENDENT_SECURITY_ACTOR_NOT_ASSIGNED`.

## SEC-R4-002 — Distributed limiter

R5 removes the per-process `globalThis.__HTP_PAYNOW_RATE__` Map from `api/commerce.js` and implements `lib/paynow-distributed-rate.js` plus **undeployed** candidate `supabase/migrations/candidates/20261102130000_ht_mvp_paynow_r5_shared_rate.sql`. PostgreSQL atomic `INSERT ON CONFLICT DO UPDATE` serializes counters across separate workers; HMAC-SHA256 of the trusted client IP/action means only a bucket hash reaches the database. Vercel-sanitized `x-vercel-forwarded-for` is trusted only when `VERCEL_ENV` is set; non-Vercel runtimes use socket peer IP and ignore spoofable XFF. Malformed IP, missing HMAC, unavailable RPC, denied DB privilege, timeout or malformed JSON **fail closed** with `RATE_CONTROL_UNAVAILABLE`. 429 supplies `Retry-After`.

Authorization precedes rate lookup for anonymous status. Rate checks protect authenticated status and TEST/LIVE initiation and TEST operator actions; provider signed callbacks are **not** denied by a shared caller-IP bucket, preventing legitimate Paynow webhook replay outage. Signed callback and trusted fresh poll validation remain required. DB table is RLS enabled, direct anon/authenticated/service_role privileges revoked; only server service_role can execute restricted rate RPC. Expired buckets require an approved separate maintenance plan.

**Executable tests:** `tests/migration/paynow-r5-shared-rate.test.js` covers concurrent **20 separate psql processes / capacity 10**, shared persisted count, expiry reset, invalid headers, IPv6, absence of HMAC, RPC failure, strict read grants and hashing. This proves disposable PostgreSQL functionality, **not** deployed multi-instance staging protection. No R5 rate RPC or table exists in Staging.

**Operational blocker:** R5 branch must **not** replace the active payment backend until the Staging RPC is separately authorized/deployed and the dedicated server-only `PAYNOW_RATE_HMAC_KEY` is installed; it fails closed when absent. A deployment without the database prerequisite will deny protected status reads, not silently use memory. No LIVE rollout authorized.

## Subscriber HTTP / operator separation

`tests/migration/paynow-r5-http-auth.test.js` starts an actual Node HTTP server bound to the real `api/commerce.js` handler and sends real TCP requests with distinct synthetic Supabase users and purpose-limited TEST operator headers. It verifies anonymous 401 before rate call, expired session 401, other subscriber 404 with **zero privileged payment RPC**, owning subscriber 200, operator PREMIUM 404, operator CONNECTIVITY 200 without monetary entitlement. Network authentication and ownership DB responses are deterministic fixtures; **real two-subscriber Staging login has NOT been performed** and is an explicit external UAT gate.

## Independent Security reviewer required

A named reviewer separate from both implementing actor and Finance must review exact final SHA, verify actual Supabase identity/Security grants, callback SHA-512, poll parity, SSRF, CSRF, broken auth/IDOR and shared limiter on deployed preview/Staging across instances. Status `SECURITY_ACCEPTED` is **not issued**. Do not equate passing CI or this technical record to independent approval.
