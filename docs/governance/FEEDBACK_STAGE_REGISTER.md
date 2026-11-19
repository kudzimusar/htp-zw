# HT-MVP-PUBLIC-LAUNCH-01 — Feedback and Stage Assignment Register

**Register version:** 1.0.0 — 19 November 2026 (Asia/Tokyo)  
**Authority:** [Issue #147](https://github.com/kudzimusar/htp-zw/issues/147) defines which gate owns the requirement; this register only **classifies** observations.  
**Control method:** [Goal Fidelity and Stage-Gated Programme Control](GOAL_FIDELITY_AND_STAGE_GATED_PROGRAMME_CONTROL.md).  
**Status:** This register is proposed in a Draft governance PR, not a declaration of Owner acceptance or source remediation.

## How to use

Every finding must be logged **once**, assigned to the original approved criterion and have a gate trigger. The existence of an observation does not automatically make it a current-gate blocker. When two gates are involved, distinguish *current preparatory evidence* from *later formal exit*. Keep status until independently verified; closing an issue requires an exact source/build and evidence, not an agent assertion.

**Classification keys:** CURRENT_GATE_BLOCKER, CURRENT_GATE_NONBLOCKER, FUTURE_GATE_REQUIREMENT, CROSS_GATE_DEPENDENCY, SCOPE_CHANGE_PROPOSAL, SECURITY_OR_DATA_INCIDENT, INVESTIGATE_AGAINST_CRITERION.

## Owner feedback of 19 November 2026 — classified, not prematurely executed

| ID | Observed evidence and scope | Planned gate and accepted requirement | Classification / action now | Formal closure trigger |
| --- | --- | --- | --- | --- |
| **HT-FB-001** | Older protected Preview shows newest available article dated **18 Sep 2026** and archival disclaimer; does not show current publisher updates. | **G2** editorial/content authority and public classification; **G3** verified Reader content/production-equivalent freshness; **G5** controlled publisher cutover. | **CROSS_GATE_DEPENDENCY.** Confirm approved recent-source manifest and exact-revision public/Premium classification as part of existing G2/G3 work; no new content pipeline or invented 'latest' news. | G2 authoritative feed/classification evidence, then G3 actual Preview content/freshness proof; continuous G5 sync only at G5. |
| **HT-FB-002** | Hero image absent and multiple Top Stories have grey/empty image areas in older Preview. | **G3** Reader image correctness and accepted PR #158 Cloudflare media; **G5** new-media publishing/cutover operations. | **G3 ACCEPTANCE GAP; CROSS_GATE G5**. Reuse existing mirror and image-origin verifier; classify missing source data vs absent mirror vs HTTP/CSP errors and rights restrictions. Do not rebuild mirror, bypass media verification or release unapproved images. | Exact candidate build proves selected approved images render; G5 full future media lifecycle remains separate. |
| **HT-FB-003** | Owner questions writer/byline completeness; screenshots show **some** names, not proof of accurate identities or end-to-end profiles. | **G2** staff/author authority; **G3** public authors, bylines, profile/article mapping; **G5** production editorial maintenance. | **CROSS_GATE_DEPENDENCY.** Verify actual displayed bylines against authoritative record; no inferred bios/headshots or generic author-profile shortcuts. | G3 author→article and article→verified author journey plus G2 identity-source acceptance. |
| **HT-FB-004** | Contact route from new Preview opens **legacy WordPress** UI and old branding. Some source pages/products are intentionally legacy. | **G3** coherent internal Reader navigation/protected Preview; **G5** preserved URL redirects, site cutover and parity. | **G3 navigation evidence now; FUTURE_GATE G5 for canonical cutover.** Classify core route vs an explicitly external channel; do not rewrite production WordPress/DNS during G3. | Tested internal About/Contact/client routes at G3; legacy redirects and full parity at G5. |
| **HT-FB-005** | Search screenshot: query “Global Health”, **Authors filter** selected, zero results. | **G3** search and author discovery behavior. | **INVESTIGATE_AGAINST_CRITERION**. This alone is not evidence article search is broken; verify All, Articles and Authors scope and accurate empty-state copy. | Browser tests of topic, article-title and real author queries at current G3 QA. |
| **HT-FB-006** | Original WordPress products and destinations such as Jobs, Fellowships, Training and BARAZA e-paper still appear among source links. | **G5** canonical site parity and route preservation; governed scope from original implementation plan. | **FUTURE_GATE_REQUIREMENT** for full integration; no unapproved G3 feature build. Keep external links clearly labelled until their planned migration. | G5 parity register reconciled with verified destinations, redirects and Owner exclusions. |
| **HT-FB-007** | Independent peer found six N1–N6 defects in integrated PR #159 (two P2, including one security). Sensitive details retained in restricted peer evidence. | **G3/G5** current integrated candidate security, route identity, metadata, CSP and certification criteria. | **CURRENT G3/G5 CANDIDATE BLOCKER**: existing specialist's authorized **local** N1–N6 correction only. Maintain publication hold; do not repeat review or expose vulnerability details publicly. | Exact new local SHA, negative tests, Owner-authorized push, independent peer review and formal reviewer on new SHA before any protected new Preview. |
| **HT-FB-008** | Reader-only client demonstration requested urgently before full commercial/native acceptance. | **G3** bounded client Preview; **G2/G3** real authenticated editorial journey; **G4/G5/G6** separate production milestones. | **SCOPE_PROPOSAL, NOT AN AUTOMATIC GATE EXCEPTION.** Client demo can show only independently tested scoped features with explicit limitations; it does not count as full MVP acceptance or authorize G5/G6. | Separate Owner decision on exact protected Preview build and handoff receipt; formal gates unchanged. |

## Current formal sequence — avoid dashboard-driven false progress

- **G1:** Integration engineering candidate exists; accepted evidence is not permission to merge Draft PR #149.
- **G2:** Real authenticated Newsroom/staging evidence remains a control gate; canonical UAT case identities must not be waived.
- **G3:** Reader/production-equivalent application work may progress in controlled parallel branches; current integrated PR #159 requires independently reviewed local correction before its next Preview.
- **G4:** Commercial certification remains pending; no LIVE payment enablement.
- **G5:** WordPress/DNS/canonical cutover, redirects, full content and media lifecycle require a separate authorized public release.
- **G6:** Signed Android/iOS and app-store publication remain later milestones.

This snapshot describes the programme control position around the Owner feedback date, **not an automatically current GitHub state**. Every specialist must reverify the exact PR SHA and UAT status before writing.

## Template for future entries

| ID | Evidence link/date and user behavior | Original requirement ID | Planned gate | Classification | Existing specialist / current action | Future trigger | Exact-head closure proof |
| --- | --- | --- | --- | --- | --- | --- | --- |
| HT-FB-YYYYMMDD-N | Screenshot/CI/log/code, noting observation vs inference | Spec / issue section | G1–G6 | One of the classification keys above | Fix now or record only | Named gate entry | Test, browser result, reviewer, SHA |

**Do not open new feature PRs merely to process this register.** Use the controlling specialist, source custody and approved gate, and refer any actual scope/order change to the Owner.
