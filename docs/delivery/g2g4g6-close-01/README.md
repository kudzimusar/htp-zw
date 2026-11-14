# HT-MVP-PUBLIC-LAUNCH-01-G2G4G6-PARALLEL-CLOSE-01

**Prepared:** 2026-11-14 on local branch `local/g2g4g6-parallel-close-01`, based on the G3/G5 tip `4fa9768`. The branch is **not pushed**.
**Audience:** programme moderator (issue #147), the G2/G3 and G3/G5 specialists, HealthTimes Owner.

## Scope respected

- Only new files were added, plus one patch file. No existing file was modified.
- PRs #157, #158 and #159, the G3/G5 candidate and its worktree are untouched.
- No changes to Vercel, Supabase, DNS, billing or production settings.
- No staging access was attempted (staging returns HTTP 402).
- No live write, merge, deployment, store submission or payment.
- Every database test ran on a fresh loopback Postgres 16 cluster, which was deleted afterwards.

## Deliverables

| # | Deliverable | Where |
|---|---|---|
| 1 | Newsroom content continuity and migration dry-run package | `A-CONTENT-CONTINUITY-RUNBOOK.md`; `scripts/continuity/*` |
| 2 | Current-content freshness and reconciliation tests | `tests/continuity/*` (27 tests); real-data report in `evidence/` |
| 3 | Native account-deletion design and disposable test evidence | `B-NATIVE-COMPLIANCE.md` section 1; `scripts/account/*`; `tests/account/*`; `tests/database/account-deletion-operator.test.mjs`; `patches/B1-in-app-account-deletion.patch` |
| 4 | Mobile commerce-disabled compliance package | `B-NATIVE-COMPLIANCE.md` section 3 |
| 5 | Android/iOS store readiness | `B-NATIVE-COMPLIANCE.md` section 4 (extends the accepted G6 pack); web deletion page copy in section 2 |
| 6 | G4 certification and operational procedures | `C-G4-CERTIFICATION-AND-OPERATIONS.md` |
| 7 | Owner/client decision register | `D-OWNER-DECISION-REGISTER.md` |
| 8–10 | Blockers, handover, readiness assessment | Below |

## Verification

Run on 2026-11-14 at `4fa9768` plus the new files. Exact commands are in `evidence/TEST-EVIDENCE.md`.

| Suite | Result |
|---|---|
| New continuity, legacy-URL and operator unit tests | **38/38** |
| Database suites in one parallel run: canonical roles, source-sync writer, editorial eligibility, G5 deletion contract, **new deletion operator end-to-end** | **59/59**, 0 skipped |
| Existing G5 web edge and P0 sync-plan tests (non-regression) | 65/65 |
| Commerce and Paynow suites (root) | 43/43 |
| Mobile commerce guard, finance readiness, Premium consumer and landing tests | 35/35 |
| Patch B1 applied: `tsc --noEmit` and the affected mobile tests | Clean, and all pass except one **pre-existing** staging test, which fails with HTTP 402 with or without the patch |

**Mutation checks.** 6 on the continuity verifier and 5 on the operator. All 11 broke at least one test, except continuity mutant M6 (`ready` ignoring the BLOCK count). M6 is equivalent: every BLOCK code already fails a gate.

## 8. Remaining blockers, by accountable owner

| Owner | Blocker | Blocks |
|---|---|---|
| **Owner** | D-01 role holders; D-02 freeze and cut-over; D-06 Privacy and Terms; D-09 scope; D-13 support contact | Reader-only launch |
| **Publisher** | D-03 corpus classification; D-07 media rights basis (81/100 sampled images have no record) | Reader-only launch (D-03); legal risk (D-07) |
| **Owner + legal** | D-05 retention decisions | G5 deletion go-live, G6 |
| **Owner** | D-04 store accounts and D-U-N-S; D-10 brand assets | G6 |
| **Supabase/billing owner** | Staging egress restriction (HTTP 402) | Real reconciliation (gap A-2), the freshness run, and every staging step |
| **G2/G3 specialist** | After recovery: backup-and-restore proof, ledger capture, dry run, staging apply, then the continuity report with 0 BLOCK and freshness PASS | G2 content continuity |
| **G5 contract owner** | Due-list function; support-assisted deletion route (findings H-3) | G5 deletion go-live |
| **G3/G5 owner** | Reader-only store binary without Studio/Owner Preview (G6-R1) | G6 |
| **Owner + Finance + Security** | D-08, D-11, D-12; certification gaps C-8 to C-18 | Commercial release only |

## 9. Integration handover (after G3/G5 certification)

These items go onto the certified tip, in this order. Each needs its owner's normal review.

| ID | Item | Target owner | Depends on |
|---|---|---|---|
| H-1 | Merge `scripts/continuity/*` and `tests/continuity/*`; add the continuity tests to the P0 publisher CI job | G2/G3 | Nothing (new files only) |
| H-2 | Shortlink route for `/?p=<id>` (gap A-3); replace the pinning test with a positive test | G5 web | D-14 |
| H-3 | Contract amendment: `account_deletion_due_requests` (service-role only); then switch the operator's `listDue` to it | G5 contract owner / DBA | — |
| H-4 | Apply patch B1, regenerate `database.types.ts` after the migration, and add a `/account/delete` web page from section 2 of `B-NATIVE-COMPLIANCE.md` | Mobile + G5 web | D-05, D-13, migration applied |
| H-5 | Reader-only native build (exclude Studio and Owner Preview from store binaries) | G3/G5 → mobile | — |
| H-6 | Schedule the deletion operator (server-only, service key in the server environment only) | Owner-authorized ops | H-3, migration on production |
| H-7 | Commerce gap tests C-9 to C-13 | Commerce engineer | D-08, Finance approval of section 3 |

## 10. Readiness assessment

| Workstream | Gate | Ready? | Evidence-based reason |
|---|---|---|---|
| A: content continuity | G2 | **Tooling ready; gate not passable yet** | The verifier, the URL preservation proof (all 148 non-root pilot URLs return 200 through the real handler; the root is the Reader home) and the dry-run procedure are tested. The gate needs a staging ledger capture and a freshness PASS (blocked by HTTP 402), plus D-01, D-02 and D-03. |
| B: account deletion | G5 → G6 | **Engineering ready for integration; not live** | The contract plus the operator are proven end to end on a disposable database; the in-app patch typechecks and passes. Live use needs the migration applied (DBA), H-3, D-05 and the web page. |
| B: commerce-disabled native | G6 | **Ready** | Guard, no restore, no steering copy, existing subscriber access: all tests pass |
| B: store submission | G6 | **Not ready** | D-04 and D-10, G6-R1, and deletion live are outstanding |
| C: commercial | G4 | **Not ready, by design** | 8 gap classes remain, and both reviewers are unnamed. The Reader-only launch does not depend on G4. |
| D: decisions | all | **Register ready; 14 decisions open** | 6 of them are launch-blocking |

**Bottom line.** Everything that could be done independently of G3/G5 and of staging is now built and tested. What remains for the Reader-only launch is:
- Owner and Publisher decisions (D-01, D-02, D-03, D-06, D-09, D-13);
- staging recovery;
- one G2/G3 run of the dry-run procedure in `A-CONTENT-CONTINUITY-RUNBOOK.md`.
