# HealthTimes Migration — Agent Launch Instructions

Use this file when assigning any migration or recovery agent.

## Common bootstrap prompt

Give the agent the following instructions before its specific task:

> You are an execution agent in the HealthTimes WordPress-to-new-platform migration programme.
>
> Repository: `kudzimusar/htp-zw`
>
> Canonical migration-agent documentation branch: `docs/healthtimes-migration-agents`
>
> Do not rely on the assignment prompt alone. Before changing code, read the canonical programme files, tool/environment matrix and your task file in full.
>
> First read:
>
> 1. `docs/migration-agents/00_MASTER_MIGRATION_EXECUTION_PROGRAMME.md`
> 2. `docs/migration-agents/01_AGENT_REGISTER.md`
> 3. `docs/migration-agents/02_AGENT_LAUNCH_INSTRUCTIONS.md`
> 4. `docs/migration-agents/03_TOOL_ENVIRONMENT_MATRIX.md`
> 5. your assigned file under `docs/migration-agents/agent-tasks/`
>
> If your implementation branch does not contain those files, read them directly from the documentation branch, for example:
>
> ```bash
> git fetch origin
> git show origin/docs/healthtimes-migration-agents:docs/migration-agents/00_MASTER_MIGRATION_EXECUTION_PROGRAMME.md
> git show origin/docs/healthtimes-migration-agents:docs/migration-agents/01_AGENT_REGISTER.md
> git show origin/docs/healthtimes-migration-agents:docs/migration-agents/02_AGENT_LAUNCH_INSTRUCTIONS.md
> git show origin/docs/healthtimes-migration-agents:docs/migration-agents/03_TOOL_ENVIRONMENT_MATRIX.md
> git show origin/docs/healthtimes-migration-agents:docs/migration-agents/agent-tasks/<YOUR_TASK_FILE>.md
> ```
>
> Confirm that your execution environment has every tool/environment class marked required for your agent. If a required environment is missing, STOP and report the missing capability rather than simulate evidence.
>
> Then read every `docs/migration/` file named by your task, plus current repository code relevant to your lane.
>
> Follow checkpoint prerequisites and stop conditions exactly.
>
> Until AG-08 is explicitly unlocked, you are NOT authorized to modify live WordPress data, change production DNS, alter email DNS records, perform a production import, decommission WordPress, or commit secrets/client exports.
>
> Work on a dedicated branch. Preserve the approved public design and Newsroom UX unless your task explicitly requires an underlying production-architecture change.
>
> Run all tests required by your task. Do not call a checkpoint complete with unexplained red tests.
>
> When finished, write the required agent report and return a receipt containing start/end SHA, files changed, commands/tests, evidence, gates passed/failed, blockers, next authorized checkpoint, tool/environment limitations, and whether any production system was modified.

## Recovery task mapping

- REC-01: `REC-01_LOCAL_CUSTODY_RECOVERY.md` — requires LOCAL-TERMINAL access to the original Mac/worktree. Use only while the migration-preparation custody blocker exists.

## Agent task mapping

- AG-01: `AG-01_PREPARATION_CLOSURE.md`
- AG-02: `AG-02_STAGING_PLATFORM.md`
- AG-03: `AG-03_SOURCE_DATA_CAPTURE.md`
- AG-04: `AG-04_REHEARSAL_CONTENT_MEDIA_TAXONOMY.md`
- AG-05: `AG-05_SEO_ANALYTICS_MONETIZATION.md`
- AG-06: `AG-06_NEWSROOM_BACKEND_SECURITY.md`
- AG-07: `AG-07_CERTIFICATION_CLIENT_UAT.md`
- AG-08: `AG-08_PRODUCTION_CUTOVER_ROLLBACK.md` — LOCKED until CP7 acceptance plus explicit owner production authorization.

## Canonical sequencing

```text
REC-01 Local Custody Recovery (temporary precondition while custody blocker exists)
        ↓
AG-01 / CP1 Preparation Closure
        ↓
AG-02 / CP2 Staging Platform
        ↓
AG-03 / CP3 Client Data / Source Capture
        ↓
┌──────────────────┬──────────────────┬──────────────────┐
│ AG-04 / CP4      │ AG-05 / CP5      │ AG-06 / CP6      │
│ Content / Media  │ SEO / Analytics  │ Newsroom Backend │
│ / Taxonomy       │ / Monetization   │ / Auth/Security  │
└──────────────────┴──────────────────┴──────────────────┘
        ↓
AG-07 / CP7 Integrated Certification + Client UAT
        ↓
EXPLICIT OWNER PRODUCTION AUTHORIZATION
        ↓
AG-08 / CP8 Production Cutover + Rollback
```

AG-04/05/06 may overlap only after CP2/CP3 prerequisites are satisfied, the moderator authorizes the lanes, and file/schema ownership is coordinated.

## Current custody rule

If `migration-preparation-2026-09-09` is not remotely available and the original local preparation has not been recovered, AG-01 remains blocked and AG-02 through AG-07 remain frozen. Use REC-01 in a local-capable environment; do not keep assigning the same local-custody task to a GitHub-only agent.

## Programme outcome

The desired pre-cutover statement is:

> **HealthTimes' editorial content, search authority, audience intelligence and monetization infrastructure are all prepared and proven in staging for controlled production migration.**

The desired production statement is not permitted until AG-08 completes post-cutover verification.
