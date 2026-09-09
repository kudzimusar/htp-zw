# AG-01 — Preparation Closure & Baseline Governance

## Mission

Close CP1 so every later migration agent starts from a durable, reviewable and green baseline.

## Mandatory first reads

1. `docs/migration-agents/00_MASTER_MIGRATION_EXECUTION_PROGRAMME.md`
2. `docs/migration-agents/01_AGENT_REGISTER.md`
3. all available `docs/migration/00_...13_...` files
4. README, package scripts, current Playwright config/workflow and existing Newsroom/public implementation docs

## Critical local-state instruction

A local branch `migration-preparation-2026-09-09` was reported to contain migration files that were not yet visible on GitHub when this task was written.

Before switching branches or cleaning the workspace:

- run `git status --short --branch`;
- inspect local branches;
- inspect untracked and modified files;
- preserve all migration preparation work;
- do not use destructive reset/clean commands;
- do not recreate files merely because the remote branch lacks them.

If the reported local migration work is absent, STOP and report that blocker.

## Required work

1. Reconcile the local migration-preparation work against `main@a4f1211...` or the actual latest main.
2. Commit the migration package, importer, Supabase migration, ad authorization files and tests to a dedicated remote migration-preparation branch.
3. Ensure `docs/migration/` contains the canonical 00–13 package and no conflicting duplicate plans.
4. Review `scripts/migration/wordpress-importer.js` and transformation helpers. Identify scaffold-only WXR/database functionality explicitly.
5. Review production schema for idempotency/provenance constraints, indexes, integration-health tables, ingestion runs/checkpoints, analytics/search/ad/PageSpeed/audience/ad-event/citation models.
6. Apply the Supabase schema from zero to a disposable database/project. Record all required extensions, ordering assumptions and failures.
7. Run migration tests and normal project validation.
8. Run complete Chromium UAT. Fix real product/test defects until baseline is green. Known historical areas to verify include article speaker control, Newsroom login flakiness and 1440px horizontal overflow.
9. Perform a secrets hygiene scan. Confirm no WordPress exports, client credentials, Google OAuth tokens, Supabase service keys, database dumps or payment secrets are committed.
10. Freeze Global Taxonomy v1 for migration mapping. Preserve legacy WordPress tags internally but do not expose all 10,238 tags as canonical public taxonomy.
11. Validate `ads.txt` and `app-ads.txt` content as readiness files. Do not invent AdMob or unverified seller records.
12. Create `docs/migration/agent-reports/AG-01_CP1_PREPARATION_CLOSURE.md`.

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

- migration preparation is committed and pushed;
- migration docs are canonical and readable;
- `npm run test:migration` passes;
- normal validation passes;
- full Chromium UAT passes with no unexplained failures;
- disposable schema apply from zero succeeds;
- secrets scan is clean;
- taxonomy v1 is documented;
- no production system was modified.

## Stop conditions

STOP if:
- local migration work cannot be located;
- applying the schema requires unsafe production credentials;
- a red baseline test cannot be classified/resolved;
- committed files contain secrets or sensitive WordPress/customer exports;
- architecture docs materially conflict and owner intent cannot be inferred safely.

## Receipt

Report:
- start branch/SHA;
- end branch/SHA;
- migration files committed;
- schema apply evidence;
- migration/validation/Chromium results;
- taxonomy freeze location;
- remaining importer gaps;
- secrets result;
- CP1 ACCEPTED or BLOCKED;
- explicit `Production systems modified: NO`.
