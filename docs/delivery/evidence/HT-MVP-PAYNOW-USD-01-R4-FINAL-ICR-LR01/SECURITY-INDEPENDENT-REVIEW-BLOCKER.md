# HT-MVP-PAYNOW-USD-01-R4-SEC — Security review evidence, NOT an independent certification

Date: 2026-11-02; frozen R3 SHA: `8f93c30fe53308aae2d1ef2bfef172576efe50ea`. R4 branch: `fix/ht-mvp-paynow-usd01-r4-physical-cert-closure`. R4 PR #138. No Production or LIVE approval.

**Review actor:** NOT APPOINTED. The GitHub actor `kudzimusar` is the implementer/Owner, not an independent Security approver. No claim of independent Security review is made. **Status: `BLOCKED_INDEPENDENT_SECURITY_REVIEW`.**

## Findings

- **SEC-R3-001 (High, engineering remediation preserved, independent retest still mandatory):** The formerly anonymous `GET /api/commerce?action=status` used a service-role RPC based on merchant reference alone. R3 introduced ownership checks for authenticated Premium subscribers before the privileged RPC and restricted operator authorization to connectivity purposes. R3 negative tests passed; R4 preserves the scope and tests.
- **SEC-R4-001 (High UX/security correctness, source-corrected):** The real `apps/mobile/app/payment/return.tsx` previously polled the subscriber-only status endpoint even for `HT-CONN-` connectivity references without subscriber identity, causing 401 and misleading indefinite pending. R4 now explicitly classifies connectivity returns as operator-only, makes **zero status API requests from that page**, and never includes the operator secret in browser code. Browser assertions must prove this before acceptance. Operator sees the result only through existing independently authorized server-side tools; a public browser is not an operator console.
- **SEC-R4-002 (Medium / LIVE rollout blocker):** `api/commerce.js` uses process-local `Map` rate limiting. On distributed serverless deployments, separate instances do not share counters. No global limiter or verified edge/WAF policy has been demonstrated. The existing authentication/operator secret and provider signed callback are separate controls; do **not** treat the in-memory map as a certified global abuse defense. Required external release remediation: a shared store/edge rate limiter reviewed for high-risk actions.
- **SEC-R4-003 (Authentication/UX, bounded correction):** An expired or missing customer session must yield a clear sign-in-required notice; foreign subscriber must receive an unavailable message; a 429 must stop blind polling. R4 return UI adds those branches and a deliberate authenticated manual retry. No bearer-reference authorization bypass.
- **SEC-R4-004 (External owner-dependent):** A new merchant TEST Faked Success requires the account owner authenticated in an approved Paynow browser session, unavailable to this task. Historical signed callbacks are not a new R4 provider transaction.

## Required nonimplementer review

A genuinely different named Security actor must inspect this exact final SHA, independently exercise real HTTP 401/404 and authenticated 200, foreign reference denial, operator-purpose isolation, CSRF, signed form and fresh poll, SSRF and redirected URLs, duplicate callback, provenance, timeout no-reinitiation and service-role grants; separately review the serverless rate limiter and all High/Critical fixes. Return `ACTOR`, `NONIMPLEMENTER_DECLARATION`, `HEAD_SHA`, `REPRODUCTION_EVIDENCE`, `SEVERITY` and `SECURITY_ACCEPTED|REMEDIATE|BLOCKED`. Until that return, no Security acceptance is authorized.
