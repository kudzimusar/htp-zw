# HealthTimes Migration — Agent Launch Instructions

Use this file when assigning any migration agent.

## Common bootstrap prompt

Give the agent the following instructions before its specific task:

> You are an execution agent in the HealthTimes WordPress-to-new-platform migration programme.
>
> Repository: `kudzimusar/htp-zw`
>
> Canonical migration-agent documentation branch: `docs/healthtimes-migration-agents`
>
> Do not rely on the assignment prompt alone. Before changing code, read the canonical programme files and your task file in full.
>
> First read:
>
> 1. `docs/migration-agents/00_MASTER_MIGRATION_EXECUTION_PROGRAMME.md`
> 2. `docs/migration-agents/01_AGENT_REGISTER.md`
> 3. your assigned file under `docs/migration-agents/agent-tasks/`
>
> If your implementation branch does not contain those files, read them directly from the documentation branch, for example:
>
> ```bash
> git fetch origin
> git show origin/docs/healthtimes-migration-agents:docs/migration-agents/00_MASTER_MIGRATION_EXECUTION_PROGRAMME.md
> git show origin/docs/healthtimes-migration-agents:docs/migration-agents/01_AGENT_REGISTER.md
> git show origin/docs/healthtimes-migration-agents:docs/migration-agents/agent-tasks/<YOUR_TASK_FILE>.md
> ```
>
> Then read every `docs/migration/` file named by your task, plus the current repository code relevant to your lane.
>
> Follow checkpoint prerequisites and stop conditions exactly.
>
> Until AG-08 is explicitly unlocked, you are NOT authorized to modify live WordPress data, change production DNS, alter email DNS records, perform a production import, decommission WordPress, or commit secrets/client exports.
>
> Work on a dedicated branch. Preserve existing working public design and Newsroom UX unless your task explicitly requires an underlying production-architecture change.
>
> Run all tests required by your task. Do not call a checkpoint complete with unexplained red tests.
>
> When finished, write the required agent report and return a receipt containing start/end SHA, files changed, commands/tests, evidence, gates passed/failed, blockers, next authorized checkpoint, and whether any production system was modified.

## Task file mapping

- AG-01: `AG-01_PREPARATION_CLOSURE.md`
- AG-02: `AG-02_STAGING_PLATFORM.md`
- AG-03: `AG-03_SOURCE_DATA_CAPTURE.md`
- AG-04: `AG-04_REHEARSAL_CONTENT_MEDIA_TAXONOMY.md`
- AG-05: `AG-05_SEO_ANALYTICS_MONETIZATION.md`
- AG-06: `AG-06_NEWSROOM_BACKEND_SECURITY.md`
- AG-07: `AG-07_CERTIFICATION_CLIENT_UAT.md`
- AG-08: `AG-08_PRODUCTION_CUTOVER_ROLLBACK.md` — LOCKED until explicit owner authorization.

## Sequencing

Default sequence:

```text
AG-01 Preparation Closure
        ↓
AG-02 Staging Platform
        ↓
AG-03 Client Data / Source Capture
        ↓
┌──────────────┬──────────────────┬──────────────────┐
│ AG-04        │ AG-05            │ AG-06            │
│ Content &    │ SEO / Analytics  │ Newsroom Backend │
│ Media Import │ / Monetization   │ / Security       │
└──────────────┴──────────────────┴──────────────────┘
        ↓
AG-07 Certification + Client UAT
        ↓
OWNER AUTHORIZATION
        ↓
AG-08 Production Cutover + Rollback
```

AG-04/05/06 may overlap only after AG-02 and AG-03 prerequisites are satisfied and file/schema ownership is coordinated.

## Programme outcome

The desired pre-cutover statement is:

> **HealthTimes' editorial content, search authority, audience intelligence and monetization infrastructure are all prepared and proven in staging for controlled production migration.**

The desired production statement is not permitted until AG-08 completes post-cutover verification.
