# HealthTimes UI Recovery Programme — Final Authority Freeze

**Programme:** HealthTimes UI Recovery / Canonical Reader Convergence  
**Closure:** UI-INT-04R — Final UI Programme Freeze Documentation  
**Freeze date:** 6 October 2026  
**Canonical repository:** `kudzimusar/htp-zw`

> This document freezes the accepted UI programme authority after moderator acceptance of UI-INT-05, UI-02 Phase 6A, and the fresh four-cell native recertification. It is documentation-only. It does not merge, deploy, or promote any integration branch.

---

## 1. Purpose / programme closure status

The HealthTimes UI recovery programme is closed for the accepted scope represented by this document.

Moderator disposition:

```text
UI-INT-05 ACCEPTED
UI-02 PHASE 6A ACCEPTED
FOUR-CELL NATIVE RECERTIFICATION ACCEPTED
UI-GOV-01R ACCEPTED
PROGRAMME FREEZE DOCUMENTATION RELEASED
```

This freeze records the distinction between canonical production/main authority, accepted-but-unmerged integration authority, historical implementation/certification evidence, governance custody, and known separate debts.

---

## 2. Canonical production/main authority

Canonical production/main Reader authority remains:

```text
dcfdedcf5dc7f4c0e47dc968e21b63d3d2d6cb95
```

Canonical Reader implementation authority remains:

```text
apps/mobile
```

Public build identity at the accepted main release:

```text
presentation = apps/mobile
service_mode = source-parity
base_path = /htp-zw
SHA = dcfdedcf5dc7f4c0e47dc968e21b63d3d2d6cb95
```

Accepted UI-02 integration candidate authority is separate:

```text
dec9f8b1f28b18850bf347ada39799c0c1c3aa60
```

`dec9f8b1...` is accepted for integration custody but is not merged, not deployed by this closure, and is not canonical main.

---

## 3. Main Pages release receipt

Accepted canonical-main Pages release:

```text
workflow run: 37095727623
workflow: Deploy HealthTimes Canonical Universal PWA
candidate: dcfdedcf5dc7f4c0e47dc968e21b63d3d2d6cb95
conclusion: SUCCESS

build job: 111125133181
result: SUCCESS

deploy-main job: 111125314556
result: SUCCESS
```

Pages artifact receipt:

```text
artifact: 11264371594
sha256: 79da4c1fb10983a3211c31ffec2366a5128d09528fcd6daca60f2910bbc75efe
```

Exact-main Reader CI:

```text
Native Reader Product Gates
run: 37095727615
candidate: dcfdedcf5dc7f4c0e47dc968e21b63d3d2d6cb95
conclusion: SUCCESS
```

---

## 4. Final UI-06 live certification receipt

Final accepted live Premium/public certification custody:

```text
branch: test/ui06-ui-int03c-main-release-cert
orchestration: be76becc7fde481ea8cebbf9ee5ea637ea7ac892
accepted behavioural tooling: 2b425e0c4bf44fb6aa2a1f56e1f8e0cc39bfc280

run: 37097095604
job: 111129128996
result: SUCCESS

artifact: 11264189293
sha256: e842a55ae1332596c0bd8687dede064e37b1ffaa7d95d3bd3146335860516248

target deployed SHA: dcfdedcf5dc7f4c0e47dc968e21b63d3d2d6cb95
```

---

## 5. Premium/public frozen contract

Premium source authority:

```text
source ID: 33190
slug: zimbabwe-strengthens-social-contracting-as-hiv-donor-funding-shrinks
```

Accepted anonymous contract:

```text
classification = Premium
body_html = null
exactly one teaser paragraph
20-second presentation preview
protected paragraph/body never delivered anonymously
inline paywall after expiry
subscription prompt exactly once
Not now / Close / Escape work
reload does not restart teaser or reopen prompt
Premium WordPress content-field requests = 0
protected article/body requests = 0
automatic commerce requests = 0
```

The 20-second timer is presentation behaviour, not a security boundary. Anonymous full-body delivery remains prohibited. No entitlement, product, price, provider, or commerce authority is inferred from UI acceptance.

---

## 6. Fiji public comparator contract

Accepted public comparator:

```text
source ID: 33149
route: /article/source-fiji-hiv-emergency-epidemic-spreads-beyond-drug-users
source-parity classification = public
public body renders
no Premium preview
no Premium teaser/paywall
no subscription popup
```

Source `33149` must not be promoted to Premium by UI evidence or presentation logic.

---

## 7. UI-02 / UI-INT-05 accepted integration candidate

Accepted clean integration custody:

```text
branch: integration/ui02-phase6a-accepted-lineage
PR: #69
accepted exact head: dec9f8b1f28b18850bf347ada39799c0c1c3aa60
base: main
base SHA: dcfdedcf5dc7f4c0e47dc968e21b63d3d2d6cb95
state: Draft / Open / Unmerged / Mergeable
moderator disposition: ACCEPTED INTEGRATION CANDIDATE
```

Authority distinction:

```text
ACCEPTED != MERGED
ACCEPTED != DEPLOYED
ACCEPTED != CANONICAL MAIN
```

No merge authority is granted by this freeze.

---

## 8. Final four-cell native certification receipt

Accepted fresh full certification:

```text
workflow: UI-02 Phase 6A Native Cross-Device Evidence
run: 37409082441
event: workflow_dispatch
attempt: 1
candidate: dec9f8b1f28b18850bf347ada39799c0c1c3aa60
conclusion: SUCCESS
```

Accepted jobs:

| Matrix / contract job | Job ID | Result |
| --- | ---: | --- |
| Phase 6A contract + frozen Reader regressions | `112093204871` | SUCCESS |
| iOS phone real simulator evidence | `112093205162` | SUCCESS |
| iOS tablet real simulator evidence | `112093205029` | SUCCESS |
| Android phone real emulator evidence | `112093205140` | SUCCESS |
| Android tablet real emulator evidence | `112093205075` | SUCCESS |
| aggregate exact-head native evidence | `112101361593` | SUCCESS |

Accepted native artifacts:

| Cell | Artifact ID | Artifact name | SHA-256 digest |
| --- | ---: | --- | --- |
| iOS phone | `11388779446` | `ui02-phase6a-native-evidence-ios-phone-attempt-1` | `sha256:c016a150896d53227cee4b7156a419290d62855bf9ae273b1dfe029fd8d69d70` |
| iOS tablet | `11389161554` | `ui02-phase6a-native-evidence-ios-tablet-attempt-1` | `sha256:2ff07aafa77950422b3b9a7834ffdae0444a208c8d8539a94d53fdc0bc988c5b` |
| Android phone | `11388524216` | `ui02-phase6a-native-evidence-android-phone-attempt-1` | `sha256:57ce740ff7818c5a4e4dc81b83f9ed63b6763074c48ab71f46921b801af2553b` |
| Android tablet | `11389535552` | `ui02-phase6a-native-evidence-android-tablet-attempt-1` | `sha256:93ae3cdbdcd630e5fef72d49ba50d5d69d79e0e3927d293c1067318c2fb7b7d1` |
| Aggregate | `11389795962` | `ui02-phase6a-native-evidence-attempt-1` | `sha256:e7541581360a25b1644f73529397f17912cc4023aebc43a524309be088bec202` |

Accepted aggregate contract:

```text
candidateSha = dec9f8b1f28b18850bf347ada39799c0c1c3aa60
runAttempt = 1
matrix cell count = 4
unavailableMatrixCells = []
duplicateMatrixCells = []
runtimeErrorCells = []
programmeDisposition = READY FOR UI MODERATOR REVIEW
moderator acceptance = ACCEPTED
```

Evidence remains real native iOS Simulator and Android Emulator evidence; browser resizing is not a substitute.

---

## 9. Accepted Edition runtime remediation

Accepted Edition blob:

```text
apps/mobile/app/edition.tsx
b9816d26e7f3370ccdabbfc0bcbfe8185ca70a92
```

The accepted remediation preserves taxonomy records, uses stable taxonomy IDs as React keys, and continues to use taxonomy names as the user-facing preference values and selection semantics.

---

## 10. Frozen five-path UI-02 authority proof

Accepted UI-02 source authority:

```text
6af3ee8f1ce34012caefaefc1464d7e3c98a0035
```

The following five paths remain byte-identical to that accepted source authority:

| Path | Accepted blob |
| --- | --- |
| `apps/mobile/src/security/push.ts` | `46da11d0cdabd94655d9996b98f34c5c8311ee6c` |
| `apps/mobile/tests/ui02-phase6a-native-realization.test.mjs` | `310c9f4c7175368fe96501d5abce9ab6bd809b83` |
| `apps/mobile/tests/ui02-phase6a-native.test.mjs` | `645b4b5d1e6160af38d750a45f6640e85c6bef50` |
| `scripts/native/ui02-phase6a-android-run.sh` | `073f4199e102555b57283df2fed8c42735e8ab33` |
| `scripts/native/ui02-phase6a-manifest.mjs` | `2dea641a86271216139073ea110064d0d63e960e` |

```text
frozen authority proof = 5/5 identical
```

---

## 11. Historical UI PR cleanup disposition

The following historical implementation/certification PRs are closed without merge and retained only as historical evidence:

```text
#42
#43
#45
#46
#47
#48
#49
#50
#51
#53
#59
```

Disposition:

```text
CLOSED
UNMERGED
HISTORICAL EVIDENCE ONLY
```

Their branches remain retained. They must not be reopened, merged, or treated as current serving authority by inference from this freeze.

---

## 12. PR #52 historical status

```text
PR: #52
branch: feat/ui02-phase6-native-cross-device-certification
current head at freeze preflight: 1b67a1cdaa27d18ca7b5ab065889362ab3172aa4
state: Draft / Open / Unmerged
role: historical UI-02 implementation/certification lineage
```

PR #52 is not the clean accepted integration candidate, is not canonical main, and must not be merged as a side effect of this closure. PR #69 supersedes it for accepted-lineage integration custody.

---

## 13. PR #69 accepted integration-candidate status

```text
PR: #69
title: UI-INT-05: Converge accepted UI-02 Phase 6A native lineage
branch: integration/ui02-phase6a-accepted-lineage
exact accepted head: dec9f8b1f28b18850bf347ada39799c0c1c3aa60
state: Draft / Open / Unmerged / Mergeable
moderator disposition: ACCEPTED INTEGRATION CANDIDATE
```

PR #69 remains accepted but intentionally unmerged. This document records custody; it does not change serving authority.

---

## 14. Governance custody reconciliation — PR #41 source / PR #76 accepted clean re-custody

PR #41 remains the historical approved DESIGN.md / wireframe source custody:

```text
PR: #41
title: UI governance: freeze approved wireframe and DESIGN.md v2
branch: docs/ui-design-governance-v2
head: dc554c4ce5621ae672f309af27d814d356fe2f89
state: Draft / Open / Unmerged / Mergeable
role: HISTORICAL APPROVED GOVERNANCE SOURCE CUSTODY
```

PR #41 remains unmerged. Its approved governance assets were reconstructed byte-identically onto canonical-main lineage; PR #41 itself was not merged, rewritten, or promoted.

Accepted clean governance re-custody:

```text
PR: #76
title: UI-GOV-01R: Re-custody approved DESIGN.md and wireframe on canonical main
branch: docs/ui-gov01-clean-governance-recustody
base: main
base SHA: dcfdedcf5dc7f4c0e47dc968e21b63d3d2d6cb95
accepted exact governance SHA: a416488a8afe572f63e304caa439b1432f07dd72
state: Draft / Open / Unmerged / Mergeable
moderator disposition: ACCEPT
```

Accepted candidate shape:

```text
1 ahead
0 behind
1 commit
2 changed paths
```

The two approved governance assets are byte-identical between PR #41 historical source custody and PR #76 accepted clean canonical-main re-custody:

| Governance asset | Accepted blob |
| --- | --- |
| `docs/native-mobile/DESIGN.md` | `0e66bdd478c2d245d360cbea327e1a41fdfed4d0` |
| `docs/native-mobile/assets/HEALTHTIMES_NATIVE_WIREFRAME_V1.png` | `5fa5bcc85dfc9b636dfec190d84d94217ffb769f` |

UI-GOV-01R certification receipt:

```text
pull_request validation:
run 37413966273
job 112108371041
result SUCCESS

checkout used synthetic merge:
77a5cc1f05dc887ad98ff01495b03507f80e604b

synthetic merge -> accepted candidate compare:
content delta = 0 files

R1 manual exact-ref certification:
target = a416488a8afe572f63e304caa439b1432f07dd72
result = SUCCESS
mutation = NONE
```

The exact-ref R1 certification was non-mutating. The successful pull-request validation used GitHub's synthetic merge commit, but independent comparison proves that synthetic-merge content and the accepted candidate have zero file delta.

Authority distinction:

```text
PR #41 = historical approved governance source custody
PR #76 = accepted clean canonical-main governance re-custody
a416488a... = accepted clean governance candidate

ACCEPTED != MERGED
ACCEPTED != DEPLOYED
ACCEPTED != CANONICAL MAIN
```

No merge, deployment, production, Pages, Supabase, payment/provider, or runtime authority is granted by UI-GOV-01R or by this reconciliation.

---

## 15. Known open debts / separate authority lanes

### A. P3 Watch media debt

```text
https://img.youtube.com/vi/8K9nxwmj-1k/maxresdefault.jpg
historically observed: 404
classification: P3 WATCH MEDIA DEBT
```

This did not block accepted Premium/UI-02 certification and is not remediated by this closure.

### B. Shared staging projection

Known separate staging condition:

```text
newsroom_public_published_stories
row count = 0
classification = SHARED STAGING READINESS / DATA CONDITION
authority = SEPARATE LANE
```

This freeze does not modify Supabase, RLS, RPC SQL, publication state, or staging data.

### C. Governance custody status

Governance re-custody is now accepted through PR #76 while remaining unmerged:

```text
PR #41 = historical approved source custody / OPEN / UNMERGED
PR #76 = accepted clean canonical-main re-custody / Draft / Open / Unmerged
accepted governance candidate = a416488a8afe572f63e304caa439b1432f07dd72
UI-GOV-01R disposition = ACCEPT
merge authority = NO
deployment authority = NO
```

This is no longer an unresolved custody question inside the UI programme freeze. It remains a separate unmerged governance authority boundary.

---

## 16. Explicit non-authorities / prohibited inference

The following boundaries are frozen:

```text
Historical PRs are not current serving authority.
PR #52 is not canonical main.
PR #69 is accepted but not merged.
PR #41 remains historical governance source custody and is not merged.
PR #76 is accepted clean governance re-custody but is not merged.
The accepted governance candidate a416488a... is not canonical main.
PR #41 is not implicitly merged or closed by this freeze.
PR #76 acceptance does not authorize deployment or production mutation.
The retired root Reader remains retired.
apps/mobile remains canonical Reader authority.
UI evidence does not become Supabase/domain authority.
Certification artifacts do not authorize production mutation.
No UI acceptance authorizes payment/provider activation.
Documentation acceptance does not authorize deployment.
Documentation acceptance does not move aliases or Pages custody.
```

No evidence receipt in this file should be interpreted as permission to weaken tests, bypass exact-head custody, expose protected Premium content, invent commerce authority, or revive retired implementation paths.

---

## 17. Final programme freeze statement

The HealthTimes UI recovery programme is frozen with canonical main remaining at `dcfdedcf5dc7f4c0e47dc968e21b63d3d2d6cb95` and accepted UI-02 integration custody remaining separately at `dec9f8b1f28b18850bf347ada39799c0c1c3aa60`.

The final UI-02 four-cell native matrix is accepted with all required device cells green, exact-head/current-attempt aggregate evidence complete, and zero unavailable, duplicate, or runtime-error cells.

Premium/public behaviour, Fiji public classification, historical PR dispositions, Edition remediation, frozen UI-02 source blobs, PR #41 historical governance source custody, PR #76 accepted clean governance re-custody, and known separate debts are recorded without changing product or production authority.

```text
UI-INT-04R PROGRAMME FREEZE:
CANONICAL MAIN PRESERVED
ACCEPTED UI-02 INTEGRATION CANDIDATE RECORDED
FOUR-CELL NATIVE CERTIFICATION RECORDED
PREMIUM/PUBLIC CONTRACT FROZEN
HISTORICAL PR CUSTODY FROZEN
GOVERNANCE SOURCE CUSTODY PRESERVED
ACCEPTED CLEAN GOVERNANCE RE-CUSTODY RECORDED
PRODUCT MUTATION = NO
PRODUCTION MUTATION = NO
MERGE AUTHORITY = NO
DEPLOYMENT AUTHORITY = NO
```
