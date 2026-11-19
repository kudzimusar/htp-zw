# HT-GMGC-ADOPT-01 — Provisional Global Moderator Standard Reconciliation

**Date:** 19 November 2026 (JST)  
**Status:** `ADOPTION_PR`, NOT `ACCEPTED` — HealthTimes Draft [PR #161](https://github.com/kudzimusar/htp-zw/pull/161) and central Draft [PR #16](https://github.com/kudzimusar/11-11-tech/pull/16) are unmerged; independent reviews/Owner authority still required.  
**Original programme:** [Issue #147](https://github.com/kudzimusar/htp-zw/issues/147) (G1→G6) and [implementation/client-review plan](../HEALTHTIMES_2_IMPLEMENTATION_PLAN.md).  
**Central source pin:** `kudzimusar/11-11-tech@3225760aa91a238cda9be52af8cadd205db0da8c`, `11-11-GM-GC-001` v1.0.0.  
**Normative central document:** [STANDARD-v1.0.md](https://github.com/kudzimusar/11-11-tech/blob/3225760aa91a238cda9be52af8cadd205db0da8c/governance/global-moderator/STANDARD-v1.0.md).  
**Central reusable skill:** [11-11-global-moderator/SKILL.md](https://github.com/kudzimusar/11-11-tech/blob/3225760aa91a238cda9be52af8cadd205db0da8c/skills/11-11-global-moderator/SKILL.md).  
**Central project adoption:** [ADOPTION.md](https://github.com/kudzimusar/11-11-tech/blob/3225760aa91a238cda9be52af8cadd205db0da8c/governance/global-moderator/ADOPTION.md).  
**Original handoff template:** [Moderator handoff](https://github.com/kudzimusar/11-11-tech/blob/3225760aa91a238cda9be52af8cadd205db0da8c/governance/global-moderator/templates/moderator-handoff.template.md).

## 1. Owner interpretation — two complementary skills, not two plans

- **Goal Fidelity & Stage Control v1.0:** Preserve Issue #147, do not let feedback pre-empt future gates or trigger competing development plans. Existing [Goal Fidelity standard](GOAL_FIDELITY_AND_STAGE_GATED_PROGRAMME_CONTROL.md) and [feedback register](FEEDBACK_STAGE_REGISTER.md) assign Owner screenshot findings to G2/G3/G5 instead of redesigning the programme.
- **Global Moderator Governance & Continuity v1.0:** The moderator actively manages agents and reviewer ownership, independently classifies returns `ACCEPT / REMEDIATE / BLOCK`, reports accepted-work coverage from a reliable denominator (otherwise `NOT_BASELINED`), and checkpoints a successor-ready handoff **before context is lost**.
- The Owner is asking for accountable *process* across the portfolio, not a new HealthTimes architecture, feature phase, implementation specialist or automatic cross-project adoption.

The source order is: explicit current Owner authorization + binding project charter/gates/architecture; after approval, global process standard controls methods **without replacing stronger local rules**; then versioned task, evidence and continuity records. Prior to central and local approval, the central document is a **source-pinned candidate process** that may be followed because the Owner specifically instructed it, not because PR #16 is merged.

## 2. One HealthTimes continuity system (no competing registers)

| Requirement from central ADOPTION.md | Local authoritative location | State |
| --- | --- | --- |
| Original goal / six gates / project sovereignty | [Issue #147](https://github.com/kudzimusar/htp-zw/issues/147) + root [AGENTS.md](../../AGENTS.md) | Existing binding authority preserved |
| Reusable project moderator skill | [skills/healthtimes-programme-moderator/SKILL.md](../../skills/healthtimes-programme-moderator/SKILL.md) | Added on Draft #161 |
| Active task / agent / reviewer status | [HT-MOD-AGENT-PROGRESS-LEDGER.md](HT-MOD-AGENT-PROGRESS-LEDGER.md) | Added on Draft #161; roles verified vs reported distinguished |
| Accepted/blocked gate / progress / blockers / decisions | **Same agent/progress ledger** | Added on Draft #161; `NOT_BASELINED` because no defensible approved task denominator |
| Latest full handoff | [HT-MOD-HANDOFF-CURRENT.md](HT-MOD-HANDOFF-CURRENT.md) | Added on Draft #161; supersession via version-controlled edits |
| Machine-readable continuity | [HT-MOD-CONTINUITY-MANIFEST.json](HT-MOD-CONTINUITY-MANIFEST.json) | Added on Draft #161; validate against central schema |
| New feedback routed to proper phase | [FEEDBACK_STAGE_REGISTER.md](FEEDBACK_STAGE_REGISTER.md) | Existing Draft #161 work maintained |
| Developer-agent entrypoint | root [AGENTS.md](../../AGENTS.md) | Linked original plan, skill, ledgers, handoff triggers |
| Owner approvals / independent reviews | Existing PR comments, Issues #147/#152/#154, Owner decision register; reviewer `@11-eleven-skm` | Independent acceptance still pending |
| Personal reusable capability | Private USER-scoped `11-11 Global Moderator` v1.0.0 plugin | Installed for personal use; **not** activation across all programmes |

Avoid additional status trackers until a real proven need arises. This mapping is the single index.

## 3. No changes to product or release authority

- `main` at 19 Nov verification: `6994aa18d37e2189dbc1d3f8efc76a638ee0971c`.
- Preserve Draft stack PRs #149, #153, #156, #157, #158, #159 and parallel #160. No source rewrite, architecture migration, branch integration or GitHub merge occurred here.
- Owner-authorized work remains **local N1–N6 implementation** by the *same* existing G3/G5 specialist on current #159 source, and nothing in these docs authorizes a push/deployment.
- No protected Preview release, database write, LIVE Paynow, DNS/WordPress cutover, new paid hosting, new media upload or native store submission.
- Public GitHub contains only non-sensitive synopsis; private peer vulnerability reproduction and protected identities remain in restricted storage.
- The corporate public repository is not used to store the detailed HealthTimes handoff or sensitive project evidence.

## 4. Adoption certification: GOVERNANCE controls GOV-01–GOV-08

| Control | Required test and honest current status |
| --- | --- |
| **GOV-01** source/accepted task truth | Verify PR heads, ledger and manifesto against live source; recheck immediately before Owner approval. `IN_PROGRESS` |
| **GOV-02** reviewer separation | Specialist source never self-accepted; `@11-eleven-skm` formal reviewer requested, approval pending. `PENDING_REVIEW` |
| **GOV-03** return → disposition → progress | Last known N1–N6 peer result recorded `REMEDIATE`; progress denominator `NOT_BASELINED` rather than fabricated. `DOCUMENTED` |
| **GOV-04** no fictitious autonomy/release | Explicit session-dispatch unknowns and all live changes held. `DOCUMENTED` |
| **GOV-05** successor resumability | Full handoff, source link map, agent ledger and exact next action available; independent cold-takeover test still pending. `PENDING_TEST` |
| **GOV-06** existing project sovereignty | G1→G6, source authority and accepted architecture remain controlling; no new stage. `DOCUMENTED` |
| **GOV-07** confidential evidence safe | Handoff is public-safe; no private token, exploit or staff identity; independent privacy review pending. `PENDING_REVIEW` |
| **GOV-08** checkpoint survives session failure | Documents committed to **Draft PR branch**, available to successor even without this chat; not merged to main. `PR_PENDING` |

**No adoption ACCEPT claim until all mandatory controls pass and both normative central and local Owner/reviewer gates authorize acceptance.**

## 5. Required independent reviewer and Owner decisions

**Review request:** `@11-eleven-skm` on existing Draft #161. Reviewer must verify central exact source and project compatibility, machine manifest schema, leakage risk, no competing status sources, and successor resumability. Review must be exact-head, and new changes require re-evaluation.

**Owner:** determine approval of this project adoption proposal after reviewing central PR #16 final accepted revision. If central PR #16 changes before merge, reconcile this candidate against the **actual accepted central SHA** and update the links/references before final local approval.

**No self-merge.** Keep both PRs Draft until their distinct acceptance conditions and Owner release decisions are complete.

## 6. Operating sequence after approval

At every substantive moderation engagement:
1. Re-open original approved stage and most recent handoff before assessing fresh feedback.
2. Check agents/PRs/CI/blocked and unknown evidence.
3. Give one exact independent disposition for each returned specialist task.
4. Update agent ledger and continuity snapshot on a reviewable branch.
5. Report accepted N/M percentage from an approved denominator or `NOT_BASELINED`; name next one authorized task.
6. Before transfer/major gate/context uncertainty, proactively issue the next complete successor handoff, then require incoming moderator to independently verify and repeat.

**Non-negotiable:** A moderator cannot promise to detect the exact last context token or automatically work in the background; versioned checkpoints make continuity possible even if a conversation abruptly ends.
