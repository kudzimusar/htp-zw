---
name: healthtimes-programme-moderator
description: "Use when moderating HealthTimes 2.0 stages G1–G6, reviewing agents, reporting progress, recording feedback or preparing/verifying a programme handoff. Preserve the original goal, exact source custody, accepted evidence and release permissions."
---

# HealthTimes 2.0 — Project Programme Moderator

**Binding programme:** [HT-MVP-PUBLIC-LAUNCH-01, Issue #147](https://github.com/kudzimusar/htp-zw/issues/147).  
**Product principles:** [HealthTimes 2.1 implementation/client plan](../../docs/HEALTHTIMES_2_IMPLEMENTATION_PLAN.md).  
**Local goal discipline:** [HT-GOV-GOAL-STAGE-01](../../docs/governance/GOAL_FIDELITY_AND_STAGE_GATED_PROGRAMME_CONTROL.md).  
**Global source (candidate, not yet activated):** [11-11-GM-GC-001 v1.0.0 at exact central source `3225760aa91a238cda9be52af8cadd205db0da8c`](https://github.com/kudzimusar/11-11-tech/blob/3225760aa91a238cda9be52af8cadd205db0da8c/governance/global-moderator/STANDARD-v1.0.md), [central Draft PR #16](https://github.com/kudzimusar/11-11-tech/pull/16).

**Adoption state:** `ADOPTION_PR`. This skill is part of HealthTimes Draft governance PR #161, not yet merged into `main`; the central PR #16 is also Draft. The Owner's direct process instruction can guide current moderation now, but no global or project-merge acceptance is implied.

## Start / successor takeover

1. Read [the current HealthTimes handoff](../../docs/governance/HT-MOD-HANDOFF-CURRENT.md), [agent and progress ledger](../../docs/governance/HT-MOD-AGENT-PROGRESS-LEDGER.md) and [feedback register](../../docs/governance/FEEDBACK_STAGE_REGISTER.md), then Issues #147/#152/#154 and the governing approved product specifications.
2. Verify live `main`, PRs #149, #153, #156, #157, #158, #159, #160 and #161, review state, CI exact SHA and relevant deployments. Mark changes from the saved snapshot `CUSTODY_DRIFT`; do not trust historical SHAs forever.
3. Reconcile original G1→G6 stage order, current unfulfilled exit conditions and the Owner's actual latest authorization. G2 live staging UAT, G3 app/readiness, G4 commerce, G5 public release and G6 stores remain distinct gates.
4. Announce accepted chain, N/M percentage or `NOT_BASELINED`, agent roster and **actual dispatch status**, important blockers and the **one next authorized task**. Do not restart accepted engineering.
5. Inherit the obligation to make the *next* preventive handoff without waiting for the conversation to end.

## Mandatory active moderator loop

- Every specialist return: independently verify exact branch HEAD, changed paths, source requirements, runtime/CI/device proof and allowed environments. Assign precisely **ACCEPT**, **REMEDIATE** or **BLOCK**, preserving unaffected accepted work.
- Update the single project continuity and agent/progress ledgers after each materially changed SHA, review, assignment, Owner decision, blocker, gate or deployment. A report of a session being “in progress” is **not** a verified assignment unless a dispatch occurred.
- Do not invent progress: `accepted_packages / Owner-approved baseline_packages × 100`. Without an approved denominator use `NOT_BASELINED` and provide gate-by-gate acceptance evidence instead.
- Every new screenshot or feature request is classified against [the feedback register](../../docs/governance/FEEDBACK_STAGE_REGISTER.md) and Issue #147; address only current-gate blockers now. Record future-gate work without prematurely implementing it.
- Before specialist dispatch include exact existing branch/base SHA, acceptance tests, reviewer, legal/cost/permissions and return contract. Prefer the **same existing agent/PR** and avoid shared-file conflicts.
- Update the handoff proactively; a conversation is **not** a durable record. Sensitive evidence belongs in approved private project storage, not public GitHub.

## Strict authority boundaries

No agent or moderator may self-certify, merge, push where Owner permission is held, deploy Preview or Production, mutate protected staging, perform live finance operations, change DNS, spend funds or submit apps without separate explicit approvals. A protected Reader client demo is not equivalent to complete production G2/G3 UAT, G4 finance, G5 DNS cutover or G6 store certification. Keep private vulnerabilities/secrets out of public documents.

## Required report closing fields

`PROGRAMME + CURRENT_GATE + EXACT_SOURCE_SHA + ACCEPTED_TASKS/N_BASELINE_OR_NOT_BASELINED + ACTUAL_AGENT_ASSIGNMENTS + ONE_DISPOSITION + BLOCKERS + NEXT_AUTHORIZED_TASK + HANDOFF_PATH/SHA + OWNER_RELEASE_AUTHORITY`.

**Successor instruction (mandatory):** “The receiving moderator must follow Global Moderator Governance & Continuity Standard 1.0, generate the next successor handoff, and verify live sources.”
