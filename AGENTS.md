# AGENTS.md — HealthTimes Programme Goal Fidelity

**Applicable to all automated work in this repository.** This file is proposed for acceptance through a governance-only Draft PR. It does not itself authorize a release or override the Owner.

## Before every substantial task

1. Read the **original, controlling programme**: [HT-MVP-PUBLIC-LAUNCH-01 Issue #147](https://github.com/kudzimusar/htp-zw/issues/147). Follow G1 → G2 → G3 → G4 → G5 → G6 and the exact current acceptance criteria. Do not substitute informal four-step summaries or emergency timeboxes for those gates.
2. Read [Goal Fidelity and Stage-Gated Programme Control](docs/governance/GOAL_FIDELITY_AND_STAGE_GATED_PROGRAMME_CONTROL.md) and [Feedback Stage Register](docs/governance/FEEDBACK_STAGE_REGISTER.md), including Owner-approved amendments and previously accepted engineering.
3. Establish the **current gate**, its remaining acceptance conditions, **exact source SHA / PR ancestry**, previously accepted tests/reviews and the existing specialist assigned.
4. Categorize each new issue as **current-gate blocker**, **current-gate nonblocker**, **future-gate requirement**, **cross-gate dependency**, **scope-change proposal** or **security/data incident**. Record it and work **at the assigned gate**. Feedback is not authorization for scope drift.
5. Execute only the smallest bounded correction permitted by the current gate. Preserve prior engineering; prefer the existing specialist and branch. Do not launch an alternative redesign, PR hierarchy or feature programme without an Owner decision.
6. Return source-backed tests and a gate verdict: **DONE / REMEDIATE / BLOCKED / Owner-authorized DEFERRED / NOT_TESTED**. Report fixture, simulator, staging and production evidence separately; do not turn a 402 or a skipped check into PASS.

## Release permissions remain separate

Implementation, local commit, remote publication, peer review, formal approval, protected Preview deployment, main merge, public DNS cutover, LIVE payments, database migration and mobile-store submission are **distinct acts**. Follow Issue #147 for approvals. Do not merge/deploy/mutate protected infrastructure, use privileged secrets, expose vulnerability reproduction details, or incur paid services without appropriate authorization.

A **client-demonstrable Reader** may be a scoped G3 Preview milestone but is **not** a replacement for real G2 journalist/editor/publisher workflow, full G3 acceptance, G4 certification, G5 public launch or G6 app publication.

## Mandatory closeout line

`PROGRAMME | CURRENT GATE | UNMET ORIGINAL CRITERIA | NEW FEEDBACK CLASSIFIED/DEFERRED | EXACT SHA/EVIDENCE | NEXT AUTHORIZED MOVE | RELEASE AUTHORITY`

This root guidance exists to keep all implementation agents and reviewers aligned with the same Owner-approved finish line.

## Global Moderator continuity (provisional adoption, PR #161)

The Owner also requires [11-11-GM-GC-001 — Global Moderator Governance & Continuity Standard v1.0](https://github.com/kudzimusar/11-11-tech/blob/3225760aa91a238cda9be52af8cadd205db0da8c/governance/global-moderator/STANDARD-v1.0.md) and the [central reusable skill](https://github.com/kudzimusar/11-11-tech/blob/3225760aa91a238cda9be52af8cadd205db0da8c/skills/11-11-global-moderator/SKILL.md) to govern moderation **once independently approved and adopted**. As of 19 Nov 2026, [central PR #16](https://github.com/kudzimusar/11-11-tech/pull/16) and this project-specific adoption PR #161 are DRAFT/UNMERGED. These are source-pinned process *candidates* and do not grant authority to merge/deploy or replace the binding G1→G6 programme.

**Mandatory local continuity sources:**
- [HealthTimes moderator skill](skills/healthtimes-programme-moderator/SKILL.md)
- [Current preventive successor handoff](docs/governance/HT-MOD-HANDOFF-CURRENT.md)
- [Agent, task, gate and progress ledger](docs/governance/HT-MOD-AGENT-PROGRESS-LEDGER.md)
- [Machine-readable continuity manifest](docs/governance/HT-MOD-CONTINUITY-MANIFEST.json)
- [Feedback mapped to the correct stage](docs/governance/FEEDBACK_STAGE_REGISTER.md)

**Operating rule:** On every material specialist return, source SHA change, acceptance/disposition, blocker, Owner decision or stage transition: verify live source; issue exactly one `ACCEPT / REMEDIATE / BLOCK`; update existing ledgers and handoff; and show accepted N/M or `NOT_BASELINED` (never invent a completion percentage). Actual agent dispatch must be confirmed rather than inferred from a written prompt.

**Preventive handoff trigger:** major phase boundary, planned session transfer, substantial cluster of agent returns, or any suspicion that prior context is becoming unreliable. Write a source-backed successor handoff *before* session loss. A successor independently rechecks PR/CI/main/agent custody, explicitly acknowledges the verified next task, and must create the next preventive handoff. Keep private findings and secrets outside public GitHub.

This process guidance has no standing authorization for Production, paid service use, staging writes, DNS, finance, deployment, repository merge or app-store changes. If central PR #16 or local PR #161 is not yet approved, distinguish voluntary direct Owner process instructions from formally adopted repository policy.

## Canonical two-rule global contract (Owner-directed)

Before assigning, reviewing or implementing HealthTimes tasks, **every agent must read both global standards** and this project's accepted Issue #147 G1–G6 plan. The central standards govern process, not release authority:

- **Rule A — Goal Fidelity and Stage Control:** [11-11-GM-GF-001](https://github.com/kudzimusar/11-11-tech/blob/917c16f6d64d7f29d442fec562021dd11687228d/governance/global-moderator/GOAL-FIDELITY-STAGE-CONTROL-v1.0.md). Classify new feedback under Issue #147's existing current/future gates; do not initiate a competing programme or override previously accepted engineering.
- **Rule B — Active Moderator Governance and Continuity:** [11-11-GM-GC-001](https://github.com/kudzimusar/11-11-tech/blob/917c16f6d64d7f29d442fec562021dd11687228d/governance/global-moderator/STANDARD-v1.0.md). Independently verify specialist return at exact SHA and issue ACCEPT/REMEDIATE/BLOCK; show approved N/M or NOT_BASELINED; update the existing agent ledger and successor handoff before context loss.
- **Mandatory central start-here:** [Unified contract](https://github.com/kudzimusar/11-11-tech/blob/917c16f6d64d7f29d442fec562021dd11687228d/governance/global-moderator/AGENT-GOVERNANCE-UNIFIED-v1.0.md) and [Downloadable PDF](https://github.com/kudzimusar/11-11-tech/blob/917c16f6d64d7f29d442fec562021dd11687228d/governance/global-moderator/11-11-TECH-GLOBAL-AGENT-GOVERNANCE-v1.0.pdf). [HealthTimes stage mapping](docs/governance/GLOBAL_AGENT_RULES.md).

**Adoption state:** The Owner's process instruction is effective for moderation now, but central PR #16 and HealthTimes PR #161 are Draft and unmerged. Review and Owner consent remain required for repository merge/activation. Do not alter application source, protected Preview, payments, staging, DNS, media or app stores without their separate permissions.
