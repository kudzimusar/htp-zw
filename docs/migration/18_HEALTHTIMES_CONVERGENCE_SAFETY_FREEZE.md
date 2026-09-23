# HealthTimes Convergence Recovery — Phase 0 Safety Freeze

**Programme controller:** AG-07  
**Phase:** 0 — Convergence Safety Freeze  
**Repository:** `kudzimusar/htp-zw`  
**Starting governance SHA:** `f58b2d2614317b8573055bb1a44780e5b339a3af`  
**Status:** ACTIVE  
**Runtime changes authorized:** NO

> **HEALTHTIMES CONVERGENCE RECOVERY — PHASE 0 SAFETY FREEZE ACTIVE**

## 1. Why this freeze exists

A cross-lane convergence defect has been identified across several independently accepted or certified authorities:

- the legacy root web UI;
- the authoritative wireframe-based universal Reader under `apps/mobile`;
- accepted CP5 public routing / SEO runtime;
- accepted AG-04 migrated Supabase content and media custody;
- later AG-06 / CA-01 / NM-07 / COM-01 integration lineage.

The programme currently has evidence that these authorities did not all converge into one complete client-facing lineage. In particular, PRECP7-P1-001 established that the accepted CP5 public-route / SEO runtime is absent from the later COM/integrated candidate lineage. The visual-conformance checkpoint also established that the universal Reader and the legacy presentation must not be conflated as equivalent visual authorities.

Phase 0 exists to prevent destructive cleanup, re-import, deployment, merge, routing, provider, or UI decisions from erasing evidence or changing custody before the responsible convergence phases verify what must be preserved and reconciled.

This phase is governance only. It does not resolve the frontend, database, migration-lineage, routing, advertising, provider, or visual-conformance problems.

## 2. Programme-wide mandatory freeze

Effective immediately and until the moderator explicitly releases the relevant operation:

- **NO `supabase db reset`**
- **NO migration re-import**
- **NO database restore**
- **NO table drops**
- **NO column drops**
- **NO destructive schema cleanup**
- **NO storage cleanup**
- **DO NOT delete the 2,430 stale `wordpress/uploads/...` storage objects**
- **NO primary Vercel staging-alias movement**
- **NO production deployment**
- **NO production database mutation**
- **NO production DNS/MX/email changes**
- **NO PR merges**
- **NO deletion of the legacy root frontend**
- **NO deletion of `apps/mobile` or its universal Reader implementation**
- **NO broad UI redesign**
- **NO attempt to restore the old UI as canonical**
- **NO attempt to replace the wireframe Reader during this phase**
- **COM-01 provider wiring remains parked**
- **AG-08 remains locked**

These prohibitions are independent. Release of one operation does not release any other frozen operation.

## 3. Migrated content and data authority

The accepted AG-04 corpus is immutable evidence during Phase 0.

| Authority | Accepted count |
| --- | ---: |
| Posts | 5,737 |
| Pages | 49 |
| Public objects | 5,786 |
| Authors | 3 |
| Categories | 83 |
| Tags | 10,283 |
| Media records | 3,277 |
| Canonical media | 3,275 |
| Public URL mappings | 5,786 |

These accepted counts must not be modified during Phase 0.

The 2,430 stale unreferenced `wordpress/uploads/...` staging storage objects remain preserved as evidence. Their prior classification as cleanup debt does **not** authorize deletion during the convergence recovery.

No Phase 0 action may reset, restore, re-import, truncate, drop, clean, or otherwise mutate the accepted migrated corpus or its storage evidence.

## 4. CP5 runtime authority

Accepted CP5 runtime:

`0ba7240d018efa2472a00f56453e9aa8be34e1c5`

It is preserved as immutable evidence for:

- canonical routing;
- redirects;
- sitemap;
- RSS;
- SEO;
- structured data;
- analytics continuity;
- HOSPAZ/direct-ad continuity.

CP5's accepted runtime authority does **not** make its legacy visual presentation the canonical UI.

The accepted CP5 runtime must not be rebuilt, silently reimplemented, discarded, or treated as superseded merely because later integration lineages omitted part of its executable public-route / SEO authority.

## 5. Universal Reader and frontend authority distinction

The current product/design authority for PWA, Android, and iOS is:

- `apps/mobile`
- `docs/native-mobile/HEALTHTIMES_NATIVE_MOBILE_MASTER_PLAN.md`
- `docs/native-mobile/DESIGN.md`

The universal Reader authority must remain intact during Phase 0.

The frontend distinction is therefore frozen as follows:

1. **Universal Reader:** `apps/mobile` and the approved native-mobile design/master-plan documents are the current PWA / Android / iOS product and design authority.
2. **Legacy root frontend:** preserve it as convergence evidence. Do not delete it, but do not restore or promote it as canonical UI authority.
3. **CP5 visual presentation:** preserve it only insofar as needed to establish accepted CP5 runtime/public continuity; its legacy visual presentation is not canonical UI authority.
4. **Wireframe authority:** the wireframe-based Reader authority must not be replaced or broadly redesigned during Phase 0.
5. **Convergence:** later phases must reconcile runtime/data/routing authority into the universal Reader without independently rebuilding already certified security/application lanes.

No Phase 0 action may decide the final implementation mechanism for that reconciliation.

## 6. Integrated security and application authority

Preserve the certified AG-06, CA-01, NM-07, and COM-01 lineages without rebuilding them.

Frozen integrated application/security baseline:

`0112c8802d220d23e20288783536f22e85ea346d`

Certified COM-01 implementation runtime:

`5b6fca0fe1dceed5e167b845e023dfc456c47040`

These lineages remain evidence for their accepted responsibilities. Phase 0 does not reopen or redesign their security, Reader, communications, or certification architecture.

Their preservation also does not resolve the separate CP5 convergence omission. Both sets of authority must remain available for the later reconciliation phases.

## 7. COM-01 provider hold

COM-01 provider wiring remains parked.

Current disposition remains:

`IMPLEMENTATION COMPLETE / LIVE PROVIDER CERTIFICATION DEFERRED`

Current dependency remains:

`EXTERNAL_PROVIDER_WIRING — DEFERRED PENDING AUTHORITATIVE DNS ACCESS`

Phase 0 authorizes no Resend, Brevo, Cloudflare email-provider, DNS, MX, sender, inbound-routing, or production mailbox change.

No provider evidence may be fabricated or substituted for the deferred live-provider certification.

## 8. Production prohibition

Phase 0 provides **no production authorization**.

Specifically:

- production deployment remains prohibited;
- production database mutation remains prohibited;
- production DNS/MX/email changes remain prohibited;
- production storage cleanup remains prohibited;
- production routing changes remain prohibited;
- no primary staging alias may be moved;
- no PR may be merged as part of this phase;
- no App Store or Play Store release is authorized;
- AG-08 remains locked.

The existence of accepted component runtimes, green historical certification, or this governance record does not imply CP7 acceptance or production readiness.

## 9. Phase 0 change boundary

This phase may change documentation only.

It must not modify:

- application code;
- migrations;
- Supabase;
- Vercel configuration;
- workflows;
- storage;
- production;
- frontend assets.

If any runtime file changes as part of Phase 0, the Phase 0 task must stop and those runtime changes must be reverted before completion.

## 10. Release condition

The freeze is operation-specific and remains active until explicit moderator release.

**A frozen operation may resume only after the responsible convergence phase produces evidence and the moderator explicitly releases that operation.**

Completion of Phase 0 does not itself release any operation.

AG-04 may proceed only into the separately assigned **data-custody verification phase**. That phase does not inherit permission to perform any operation frozen above.

## 11. Phase 0 disposition

**HEALTHTIMES CONVERGENCE RECOVERY — PHASE 0 SAFETY FREEZE ACTIVE**

- Runtime code modified: **NO**
- Supabase mutation authorized: **NO**
- Vercel alias movement authorized: **NO**
- Storage cleanup authorized: **NO**
- PR merge authorized: **NO**
- Production change authorized: **NO**
- COM-01 provider work resumed: **NO**
- AG-08 started: **NO**
- Phase 1 started: **NO**

**PHASE 0 COMPLETE — CONVERGENCE SAFETY FREEZE ACTIVE / READY FOR AG-04 DATA-CUSTODY PHASE**
