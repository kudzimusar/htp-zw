# R3 Security — Non-Implementing Reviewer Assignment and Evidence

**Unit:** HT-MVP-PAYNOW-USD-01-R3-ICR-LR01-SEC  
**Frozen R2 parent:** `0f24b9f6d26b773276a14717760ca749e13c862c`  
**R3 implementation source head reviewed by automated gate:** `3e687c97974fdfee0895c699442fa3b6d80d551e`  
**Review actor:** NOT ASSIGNED. This is an implementation-team evidence packet, **not an independent review signature**.  
**Disposition:** `BLOCKED_INDEPENDENT_SECURITY_REVIEWER` until a different authorized reviewer evaluates the final exact SHA and signs the return.

## Findings, risk and remediation

**SEC-R3-001 — High, fixed in candidate; independent retest required.** Existing `api/commerce.js` `GET action=status` previously called a privileged service-role `payment_get_paynow_transaction_status` RPC for any well-formed merchant reference without subscriber authentication or ownership. A high-entropy reference is not an access-control decision. R3 now requires an owning authenticated subscriber with a scoped transaction ownership lookup **before** the privileged RPC, or a separate authenticated TEST operator restricted to `PROVIDER_CONNECTIVITY_TEST`. Foreign subscriber returns `PAYMENT_STATUS_NOT_FOUND` (HTTP 404), anonymous HTTP request is 401, and no authorization failure invokes the privileged status RPC. **Evidence:** `api/commerce.js`, `lib/paynow-runtime.js`, `tests/migration/paynow-r3-status-authorization.test.js`.

**SEC-R3-002 — Medium, open observation.** The commerce handler's in-memory per-instance rate map is not a globally shared serverless rate limiter. Operator token, signed callback/poll checks and authentication remain primary controls; a future distributed limiter should receive separate review. It is not grounds to waive service-role or signature controls.

**SEC-R3-003 — LIVE merchant currency evidence, still blocked.** Paynow standard status/poll responses do not guarantee `currency`; R3 accepts absent signed currency **only as input to the separate LIVE attestation RPC** and never as USD proof. Explicit signed non-USD fails. Candidate SQL requires an independently approved merchant-specific provider USD charge and settlement record matching transaction, merchant reference, provider reference, integration ID, amount, USD currency, two distinct reviewers and immutable source digest. No LIVE monetary RPC or attestation table exists in staging. The simulation Edge remains TEST-only and has no monetary reconciliation RPC.

## Negative-path evidence

- R2 regression preserved: SHA-512 signature tamper, wrong hash, malformed/duplicate fields, unsafe poll URL, callback-versus-poll mismatch, reference and amount mismatch, transport errors, replay/duplicate callback, ambiguous initiation timeout and fail-closed claim reset.
- R3 security additions: anonymous status denial, foreign subscriber isolation, owning subscriber authorization, connectivity operator restricted purpose; TEST checkout and unauthorized operator requests remain denied.
- R3 SQL unit/disposable test checks service-role cannot INSERT provider USD attestations, public cannot EXECUTE LIVE RPC, signed non-USD and missing dual provider evidence rejected, mismatch and cancellation rejected, concurrent duplicate event exactly-once.
- CI gate: https://github.com/kudzimusar/htp-zw/actions/runs/41399720386 earlier full **68/68** PASS at R3 precursor; further exact-head candidate CI required after final evidence changes.
- Edge v24 TEST webhook is `verify_jwt=false` by existing provider webhook design and relies instead on HMAC/SHA-512 provider signing, bounded body size, strict URL and server polling verification; must be independently assessed, not assumed acceptable.

## Independent reviewer return contract

An authorized **non-implementing Security specialist** must inspect actual code diff, rerun complete CI and targeted malicious HTTP tests on final remote SHA, inspect current Staging Edge v24 source parity and Preview, assess SSRF, authentication, operator/CSRF, service-role privileges and live/no-live boundary, then return: `ACTOR`, `SHA`, `EVIDENCE`, `DEFECTS_WITH_SEVERITY`, `SECURITY_ACCEPTED|REMEDIATE|BLOCKED`. The implementation actor **may not sign off its own changes**. No reviewer has done so as of this evidence writing.
