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
