# HT-GOV-GOAL-STAGE-01 — Goal Fidelity and Stage-Gated Programme Control

**Version:** 1.0.0 — Owner-requested governance proposal, 19 November 2026 (Asia/Tokyo)  
**Programme:** HT-MVP-PUBLIC-LAUNCH-01 — HealthTimes 2.0  
**Controlling authority:** [Issue #147 — Controlled Six-Gate Public Launch Programme](https://github.com/kudzimusar/htp-zw/issues/147)  
**Related product vision:** [HealthTimes 2.1 Implementation Plan](../HEALTHTIMES_2_IMPLEMENTATION_PLAN.md)  
**Approval state:** Proposed in a governance-only Draft PR. Becoming an accepted repository standard requires Owner approval and merge. This document does not change Issue #147, authorization or the release state.

## 1. Why this standard exists

The Owner identified a programme-control failure: isolated feedback, agent reports and emergency findings have repeatedly generated alternative work plans even though the agreed objective and stage gates already exist. This diverts effort from a functioning, unified HealthTimes 2.0 that the client can test, and makes accepted source appear to be perpetually unfinished.

**Core rule:** The approved programme controls how observations are handled. New feedback does not automatically change the programme, create a new stage or authorize a feature. Implement or remediate it *when its documented gate comes due*, while retaining essential security containment and explicit Owner change control.

This is a governance discipline, not another software feature or release phase.

## 2. Source-of-truth precedence

1. **Owner's explicit accepted scope / decisions:** supersede older directions only where the Owner clearly changes them; record the change and impact.
2. **Programme control:** Issue #147 remains authoritative for the six launch gates and their exit criteria. Follow its current amendments and formally accepted decisions, not an agent's summary.
3. **Approved product requirements:** implementation plan, source parity register, UAT registers and relevant product contracts. Preserve them unless the Owner authorizes a conflict resolution.
4. **Accepted engineering and immutable evidence:** source ancestry, exact SHAs, approved tests, peer evidence, and release receipts. A Draft PR is not automatically an accepted or deployed feature.
5. **Specialist recommendations, screenshots and exploratory feedback:** evidence to classify, not automatic programme authority.
6. **Proposed emergency timeboxes and client meeting overlays:** execution tactics only; they never become substitutes for the approved six gates.

When documents conflict, make the conflict visible with exact references and obtain an Owner decision instead of silently choosing a convenient interpretation.

The central 11-11 Tech moderator governance proposal (separately tracked outside this repository) is not deemed globally adopted merely by referencing it here.

## 3. Frozen HealthTimes gate order

| Gate | Controlling objective | Exit / explicit limit |
| --- | --- | --- |
| **G1 — Unified engineering candidate** | Integrate accepted Reader/Newsroom/mobile and Paynow lines into a traceable reviewable source candidate. | Independent integration tests, source custody and Draft review; **not** a merge or release. |
| **G2 — Database and authenticated staging UAT** | Migration provenance and authorized schema; real Journalist, Editor and staff identity, RBAC, sessions and canonical UAT. | Evidence for all original UAT cases or individual Owner-authorized exclusions; no mock-to-PASS conversion. |
| **G3 — Production application readiness** | Actual Reader and authenticated newsroom, current authorized content, images, author identity, article/share/search UX, security, legal, observability and deployment-equivalent behavior. | Independently verified publish→approve→Reader journey and protected app evidence; no unauthorized production activation. |
| **G4 — Independent commercial certification** | Paynow TEST, merchant USD, entitlement, advertising, refunds and reconciliations. | Independent Security and Finance certification; LIVE payment remains separately Owner-authorized. |
| **G5 — Controlled public web release** | Approved production schema/cutover, public web/Newsroom release, historical URLs, canonical/SEO, backups, monitoring and rollback. | Public and staff smoke tests; exact release receipt; explicit Owner approval. Reader-only G4 deferral requires separate documented scope decision. |
| **G6 — Native app publication** | Production-compatible signed Android/iOS, store/compliance policies, real devices and controlled store rollouts. | Store submissions and verifiable outcomes with separate Owner authority. |

G3 preparatory tasks may run in parallel while G2 is blocked if explicitly bounded and their dependencies are retained. **Parallel preparation is not sequential gate acceptance.** A protected client demonstration is a narrower G3 milestone; it must not be passed off as operational G2 completion, G5 public launch or G6 release.

## 4. Required stage ledger

Before any sizeable review, handoff, new assignment or release recommendation, report a short table containing:

| Field | Required evidence |
| --- | --- |
| Programme goal | Exact approved desired business/product outcome, source link and revision |
| Current controlling gate | Gate ID, expected product deliverable, documented exit criteria |
| Last accepted milestone | SHA, PR, evidence receipt and actual approval scope |
| Work in progress | Existing specialist, existing branch/PR, exact starting and candidate SHAs |
| Remaining gate blockers | Requirement ID, observable failure, verified vs inferred status |
| Future feedback | Assigned later gate and reactivation trigger, no premature implementation |
| Next authorized action | Smallest existing work item that closes the controlling exit criterion |
| Release authority | Which separate Owner/reviewer approvals are still held |

Use verdicts **DONE / REMEDIATE / BLOCKED / Owner-authorized DEFERRED / NOT_TESTED**; do not convert an absent external environment or a simulated check into PASS. Distinguish implementation, independent certification, protected deployment, client acceptance, public production and store release.

## 5. Mandatory feedback classification before action

Record new observations in [FEEDBACK_STAGE_REGISTER.md](FEEDBACK_STAGE_REGISTER.md), preserving their original evidence:

- **CURRENT_GATE_BLOCKER:** Violates an already approved current-gate exit criterion. Correct under the existing agent/task, with regression evidence.
- **CURRENT_GATE_NONBLOCKER:** Valid improvement but not a required exit criterion. Queue within the stage if economical; do not expand the gate.
- **FUTURE_GATE_REQUIREMENT:** Already expected at a later gate. Record owner, requirement, acceptance and exact gate trigger; **do not implement early simply because it was mentioned now**.
- **CROSS_GATE_DEPENDENCY:** Needs evidence from an earlier gate before a later gate can close. Assign the prerequisite to its original gate; avoid duplicate code ownership.
- **SCOPE_CHANGE_PROPOSAL:** Not in approved requirements or seeks to reorder/waive an exit criterion. Request explicit Owner decision with impact on cost, timeline, accepted source and release.
- **SECURITY_OR_DATA_INCIDENT:** Immediate harm or unauthorized disclosure risk: pursue bounded safety containment with evidence and appropriate authority, then resume the controlled gate without redesign.

A reported urgency or client meeting is **not itself** an authorization to change requirements, bypass public/Premium access classification, disable fail-closed security, or deploy without approval.

## 6. Change and agent-dispatch rules

Before issuing work, the Moderator must answer, in order:

1. **What was the original purpose?** Cite the actual controlling plan.
2. **Which gate are we at?** Name the precise exit criterion, not a general ambition.
3. **What is already accepted?** Cite the accepted source / proof and distinguish it from local, unmerged and deployed work.
4. **Does the finding block that gate?** Cross-reference the feedback register; assign later-stage changes to later stages.
5. **What is the minimum code/test correction that completes the current exit?** No competing programme/architecture without an Owner-approved change.
6. **Who is the existing specialist?** Prefer the original agent and PR; avoid overlapping file ownership, replaying accepted work or unnecessary new branches.
7. **What are the publication, independent-review and release authorities?** Keep each separate and explicit.

Every executable assignment must specify controlling source section, current gate, starting SHA and branch, accepted parents, exact task boundaries, negative/positive tests, five-width or device evidence when relevant, security exclusions, permitted writes, reviewer, and closure receipt.

No agent may self-certify exact-head release, claim CI PASS for blocked UAT, merge Draft PRs, change DNS, introduce paid services, submit to stores, activate LIVE payments or change production/staging authority without the required separate Owner authorization.

## 7. Stage closure, client delivery and escalation

An accepted stage requires observed behavior and inspectable evidence matched against its **original** acceptance criteria, with a separately recorded Owner decision where required. A new commit invalidates prior exact-head signoff for affected tests. Preserve the canonical UAT case IDs and status ledger.

Where a client meeting precedes full acceptance, document a **bounded client-preview deliverable**: SHA/build ID, protected URL and access, actual working journeys, content age/provenance, media/author truth, explicit incomplete functions, client feedback path and safe fallback. An older Preview is not automatically acceptable just because it deploys. A prototype demonstration is not production certification.

If a task misses its acceptance conditions, state **REMEDIATE** or **BLOCKED**, do not expand it into a new product programme. Escalate only the concrete decision requiring Owner judgment.

## 8. Moderator handoff and preventive control

The Moderator owns a living custody record: original goal and gate order, last accepted evidence, source HEAD/PR ancestry, active specialists and file boundaries, current vs later-stage feedback, exact blockers, Owner approvals outstanding, independent reviews, rollback constraints and next bounded task. Prepare the successor handoff before context becomes unreliable.

**Required closure sentence in every substantial moderation report:**

> **Programme:** [ID]. **Current gate:** [Gx]. **Original acceptance remaining:** [items]. **Feedback deferred to:** [gate/IDs]. **Next authorized move:** [existing specialist/task]. **Release authority:** [held/approved].

## 9. Governance conformance checklist

- [ ] Original goal and approved source were re-read.
- [ ] Current stage and exact acceptance criteria are named.
- [ ] Accepted source/evidence are preserved.
- [ ] New feedback is classified and logged against the right gate.
- [ ] No stage order or requirement was silently changed.
- [ ] Existing specialist and source custody are reused where possible.
- [ ] Agent task has bounded outputs and measurable tests.
- [ ] Independent certification and Owner approval remain separate from implementation.
- [ ] Client-visible product evidence is distinguished from CI artifacts.
- [ ] Next gate and outstanding future-stage items are explicit.

**The overriding success metric is delivery of the originally approved HealthTimes product through its accepted sequence—not volume of tasks, reports, PRs or reactive feature changes.**
