# REC-01 — Local Migration Custody Recovery

## Mission

Locate, preserve, commit and push the authoritative local HealthTimes migration-preparation work that was previously created but never persisted to GitHub.

This is a recovery-only lane supporting AG-01. It does not replace AG-01 and does not advance CP1 by itself.

## Required execution environment

REC-01 **must** run in an environment with `LOCAL-TERMINAL` access to the original HealthTimes Mac/worktree. A GitHub-only/cloud environment is insufficient and must return a blocker rather than reconstruct the missing work.

Read `../03_TOOL_ENVIRONMENT_MATRIX.md` before acting.

Expected original workspace reported during preparation:

`/Users/shadreckmusarurwa/Project AI/htp-zw`

Expected branch:

`migration-preparation-2026-09-09`

## Mandatory reads

- `docs/migration-agents/00_MASTER_MIGRATION_EXECUTION_PROGRAMME.md`
- `docs/migration-agents/01_AGENT_REGISTER.md`
- `docs/migration-agents/02_AGENT_LAUNCH_INSTRUCTIONS.md`
- `docs/migration-agents/03_TOOL_ENVIRONMENT_MATRIX.md`
- this task file

If the documentation is not present locally, read it from `origin/docs/healthtimes-migration-agents` without changing the working tree.

## Safety rule

Before custody is understood, do not run destructive or state-rewriting commands such as:

- `git reset --hard`
- `git clean -fd` / `git clean -fdx`
- `git checkout .`
- `git restore .`
- `git rebase`
- `git merge`
- `git pull --rebase`
- forced branch switches

Do not recreate missing migration files from documentation.

## Read-only discovery

Start in the reported workspace and capture:

```bash
pwd
git rev-parse --show-toplevel
git remote -v
git status --short --branch
git branch -vv
git worktree list
git log --oneline --decorate --graph --all -40
git diff --stat
git diff
git ls-files --others --exclude-standard
```

Inspect expected migration assets:

```bash
find docs/migration -maxdepth 2 -type f -print 2>/dev/null | sort
find scripts/migration -maxdepth 3 -type f -print 2>/dev/null | sort
find tests/migration -maxdepth 3 -type f -print 2>/dev/null | sort
find supabase/migrations -maxdepth 1 -type f -print 2>/dev/null | sort
ls -l ads.txt app-ads.txt 2>/dev/null
grep -nE '"(test:migration|migration:inventory|migration:dry-run)"' package.json 2>/dev/null
```

If the reported workspace does not exist, search only likely repositories under `/Users/shadreckmusarurwa/Project AI` and confirm the remote is `kudzimusar/htp-zw` before inspecting further.

## Custody classification

Return exactly one classification after inspecting the original local environment:

- **A** — work exists and is committed on `migration-preparation-2026-09-09`;
- **B** — branch exists but contains modified/untracked migration work;
- **C** — migration files exist in the working tree but the expected branch was never created;
- **D** — migration work exists on another local branch/worktree;
- **E** — the original local repository was inspected and the migration work genuinely cannot be located.

Do not classify E if the original local environment itself was not inspected.

## Preservation and secret safety

Before branch manipulation, preserve terminal evidence of dirty/untracked state and, where practical, SHA-256 checksums of migration files.

Inspect for sensitive material before committing/pushing. Database dumps, WXR/private exports, subscriber/customer exports, media archives containing private material, `.env` files, OAuth credentials, Supabase service-role keys, hosting/payment secrets and similar material must not be committed.

If a real secret is already present in local Git history, STOP before pushing and report `SECRET-IN-HISTORY BLOCKER`.

## Recovery branch

If the authoritative work is found safely, establish or use:

`migration-preparation-2026-09-09`

without discarding the working tree. Review the exact changed files, commit the recovered preparation coherently, and push:

```bash
git push -u origin migration-preparation-2026-09-09
```

Verify local and remote SHAs match.

## Expected recovered scope

The recovered package is expected to include, as applicable:

- `docs/migration/`
- `scripts/migration/`
- `tests/migration/`
- `supabase/migrations/`
- `ads.txt`
- `app-ads.txt`
- migration scripts in `package.json`
- related safe configuration/tests

Do not add speculative replacements merely to satisfy this list.

## Stop boundary

REC-01 stops after custody recovery and remote persistence. It does **not** perform AG-01's full schema/importer/UAT certification.

## Receipt

Return `# REC-01 — Local Migration Custody Recovery Receipt` containing:

- local repository path and origin;
- starting branch/SHA/worktree state;
- custody classification A/B/C/D/E with evidence;
- migration package presence;
- modified/untracked counts and checksum-manifest status;
- sensitive-material check without exposing secrets;
- recovered branch and commits;
- local SHA, remote SHA and whether they match;
- explicit production-safety statement.

End with exactly one:

`RECOVERY COMPLETE — AG-01 may resume CP1 certification from <SHA>`

or

`RECOVERY BLOCKED — AG-01 remains blocked`

Do not begin AG-02.
