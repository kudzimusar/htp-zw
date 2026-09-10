# AG-01 — Preparation Closure & Baseline Governance

## Mission

Close CP1 so every later migration agent starts from a durable, reviewable and green baseline.

## Required environment/tools

Read `docs/migration-agents/03_TOOL_ENVIRONMENT_MATRIX.md` first.

AG-01 requires:
- repository/local execution capability;
- GitHub access;
- Playwright/Chromium/browser-UAT tooling;
- disposable/local/staging-safe database capability for schema-from-zero;
- secrets-scan capability as available.

A GitHub-only environment cannot perform local-custody recovery. If the authoritative migration preparation has not yet been pushed, AG-01 must remain blocked until REC-01 completes in a local-capable environment.

## Recovery prerequisite while custody blocker exists

Expected authoritative branch:

`migration-preparation-2026-09-09`

If that branch is absent remotely and the original local workspace has not been recovered, STOP and request/await:

`RECOVERY COMPLETE — AG-01 may resume CP1 certification from <SHA>`

Do not reconstruct the missing preparation from governance documents.

Once REC-01 succeeds, AG-01 must start from the exact recovered SHA named in the REC-01 receipt.

## Mandatory first reads

1. `docs/migration-agents/00_MASTER_MIGRATION_EXECUTION_PROGRAMME.md`
2. `docs/migration-agents/01_AGENT_REGISTER.md`
3. `docs/migration-agents/02_AGENT_LAUNCH_INSTRUCTIONS.md`
4. `docs/migration-agents/03_TOOL_ENVIRONMENT_MATRIX.md`
5. all available `docs/migration/00_...13_...` files
6. README, package scripts, Playwright config/workflows and relevant Newsroom/public implementation docs

## Critical state instruction

Before switching branches or cleaning any local workspace:

- run `git status --short --branch`;
- inspect local branches/worktrees;
- inspect untracked and modified files;
- preserve migration preparation work;
- do not use destructive reset/clean commands;
- do not recreate files merely because a remote branch lacks them.

If local custody is the blocker, hand off to REC-01 rather than repeatedly attempting recovery from a cloud/GitHub-only environment.

## Required work after recovery

1. Verify the recovered `migration-preparation-2026-09-09` branch and REC-01 SHA against GitHub.
2. Ensure `docs/migration/` contains the canonical 00–13 package and no conflicting duplicate plans.
3. Review `scripts/migration/wordpress-importer.js` and transformation helpers; classify REST/WXR/database functionality truthfully as implemented/partial/placeholder.
4. Review production schema for provenance/idempotency constraints, indexes, integration-health tables, ingestion runs/checkpoints, analytics/search/ad/PageSpeed/audience/ad-event/citation models.
5. Apply the Supabase/Postgres schema from zero to a disposable safe database/project. Record extensions, ordering assumptions and failures.
6. Run `npm run test:migration`, migration inventory/dry-run commands where defined, and normal project validation.
7. Run complete Chromium UAT. Fix genuine product/test defects until the baseline is green. Verify historical article speaker, Newsroom login and 1440px overflow areas.
8. Perform secrets hygiene. Confirm no WordPress exports, client credentials, Google OAuth tokens, Supabase service keys, database dumps, subscriber/customer exports or payment secrets are committed.
9. Freeze Global Taxonomy v1 for migration mapping. Preserve legacy WordPress tags internally without exposing all 10,238 as canonical public taxonomy.
10. Validate `ads.txt` and `app-ads.txt` as readiness files; do not invent AdMob or seller records.
11. Create `docs/migration/agent-reports/AG-01_CP1_PREPARATION_CLOSURE.md`.

## Global taxonomy v1 minimum

Geography:
- Global
- Africa
- Southern Africa
- East Africa
- West Africa
- Central Africa
- North Africa
- Zimbabwe
- country-level expansion model

Desks:
- Global Health
- Africa
- Research
- Policy
- Investigations
- Public Health
- Health Systems
- Health Business

Topics:
- normalized disease/public-health/policy/financing/health-system topics with legacy-tag aliases/provenance.

## Acceptance gates

AG-01 may mark CP1 accepted only when:

- REC-01 recovery is complete if it was required;
- authoritative migration preparation exists remotely at a verified SHA;
- migration docs are canonical/readable;
- importer readiness is classified truthfully;
- disposable schema apply from zero succeeds;
- `npm run test:migration` passes;
- inventory/dry-run checks pass where defined;
- normal validation passes;
- full Chromium UAT passes with no unexplained failures;
- secrets scan is clean;
- taxonomy v1 is documented;
- ads authorization readiness is checked;
- no production system was modified.

## Stop conditions

STOP if:
- required REC-01 recovery is incomplete;
- applying schema requires unsafe production credentials;
- a red baseline test cannot be classified/resolved;
- tracked files contain secrets or sensitive WordPress/customer exports;
- architecture docs materially conflict and safe intent cannot be resolved.

## Receipt

Return `# AG-01 — CP1 Preparation Closure Receipt` with:
- REC-01 recovered SHA if applicable;
- start/end branch and SHA;
- migration package verification;
- importer readiness;
- schema-from-zero evidence;
- migration/inventory/dry-run/validation/Chromium results;
- taxonomy freeze location;
- secrets result;
- outstanding blockers;
- explicit `Production systems modified: NO`.

End with exactly one:

`CP1 ACCEPTED — AG-02 may begin`

or

`CP1 NOT READY — AG-02 remains blocked`
