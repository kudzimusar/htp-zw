# HealthTimes UI Programme — Final Post-Promotion Closure Receipt

**Programme:** HealthTimes UI Recovery / Governance Promotion  
**Repository:** `kudzimusar/htp-zw`  
**Receipt role:** Final post-promotion programme authority record  
**Canonical main at closure:** `46f43e6e4f76ddbc0bdf6cf9b3f1f296ce82d4b8`  
**Canonical Reader authority:** `apps/mobile`  
**Retired Reader authority:** repository-root Reader — **LEGACY / SUPERSEDED / NON-SERVING**

> This document is a factual post-promotion receipt. It does not modify product/runtime authority and must not be read as a new implementation plan, feature specification, deployment instruction, or replacement for the underlying Git/GitHub receipts.

## 1. Closure disposition

The UI programme product/native/web release and governance promotion are complete under moderator authority.

This receipt records the final canonical lineage and keeps distinct:
- historical source custody;
- accepted executable/source candidates;
- promotion merge SHAs;
- production release SHA;
- governance source and promotion SHAs;
- certification workflow/run receipts;
- historical unmerged PR custody;
- accepted non-blocking evidence/tooling limitations and programme debt.

The final canonical main recorded by this receipt is:

`46f43e6e4f76ddbc0bdf6cf9b3f1f296ce82d4b8`

The canonical Reader remains `apps/mobile`. The repository-root Reader is retired and non-serving; it is not a runtime fallback or alternate Reader authority.

## 2. Authority ledger

| Authority | SHA / receipt | Status |
| --- | --- | --- |
| UI-02 accepted source/executable candidate | `dec9f8b1f28b18850bf347ada39799c0c1c3aa60` | Accepted |
| UI-02 promotion merge / canonical main | `f4deb281f2e287336cb931f52047a5a60c35975b` | Promoted |
| UAT accepted exact source | `642e8ec852f390b84dbcdbfc023b152600894d18` | Accepted |
| UAT promotion merge / canonical main | `8808e49cda5f0e193c8d3d02a0e2c6d1c4cc0849` | Promoted |
| Historical governance source, PR #41 | `dc554c4ce5621ae672f309af27d814d356fe2f89` | Historical / unmerged |
| Accepted clean governance custody, PR #76 | `a416488a8afe572f63e304caa439b1432f07dd72` | Historical accepted source / unmerged |
| Current-main governance source, PR #78 | `182d3c11c7f03571d1fda3d487de70d849b22172` | Accepted source |
| Governance promotion merge | `46f43e6e4f76ddbc0bdf6cf9b3f1f296ce82d4b8` | Promoted |
| Final production release SHA | `46f43e6e4f76ddbc0bdf6cf9b3f1f296ce82d4b8` | Released |
| Final canonical main at programme closure | `46f43e6e4f76ddbc0bdf6cf9b3f1f296ce82d4b8` | Canonical |

These SHAs are intentionally not collapsed into a single identity. Source candidates, accepted executables, merge commits, release identities, and governance source custody remain distinguishable.

## 3. UI-02 / native lineage

Accepted UI-02 source candidate:

`dec9f8b1f28b18850bf347ada39799c0c1c3aa60`

PR #69 promoted that accepted source with merge/main:

`f4deb281f2e287336cb931f52047a5a60c35975b`

The accepted native certification was:

- workflow: **UI-02 Phase 6A Native Cross-Device Evidence**
- run: `37409082441`
- result: **SUCCESS**
- exact head: `dec9f8b1f28b18850bf347ada39799c0c1c3aa60`
- contract + frozen regressions: **SUCCESS**
- iOS phone: **SUCCESS**
- iOS tablet: **SUCCESS**
- Android phone: **SUCCESS**
- Android tablet: **SUCCESS**
- aggregate exact-head native evidence: **SUCCESS**

PR #69 promotion preserved the accepted candidate tree with zero candidate-to-main changed-file delta.

PR #52 was not merged. It remains historical UI-02 custody only.

## 4. Canonical UAT custody lineage

A historical UAT custody defect was identified before PR #77:

- root `package.json` referenced `tests/phase12-canonical-uat.spec.js` through the canonical UAT script;
- the canonical test file was absent.

The remediation lane was:

- PR #77
- branch: `fix/ui-rel02-canonical-uat-recustody`
- accepted exact UAT source: `642e8ec852f390b84dbcdbfc023b152600894d18`
- promotion merge/main: `8808e49cda5f0e193c8d3d02a0e2c6d1c4cc0849`

Exact-main Chromium certification after PR #77 promotion:

- workflow: **Chromium UAT — Canonical Reader**
- run: `37457402712`
- job: `112248262766`
- result: **SUCCESS**
- `EXPECTED_SHA=8808e49cda5f0e193c8d3d02a0e2c6d1c4cc0849`
- `CHECKED_OUT_SHA=8808e49cda5f0e193c8d3d02a0e2c6d1c4cc0849`
- browser result: **7 / 7 PASS**

PR #77 itself did not trigger a production Pages deployment.

## 5. Governance lineage

Historical governance source custody:

- PR #41
- head: `dc554c4ce5621ae672f309af27d814d356fe2f89`
- state at closure: historical / unmerged

Accepted clean governance-source custody:

- PR #76
- head: `a416488a8afe572f63e304caa439b1432f07dd72`
- state at closure: Draft / Open / Unmerged

Current-main governance candidate:

- PR #78
- source: `182d3c11c7f03571d1fda3d487de70d849b22172`

Final governance promotion:

- merge/main: `46f43e6e4f76ddbc0bdf6cf9b3f1f296ce82d4b8`

Canonical governance blobs on final main:

- `docs/native-mobile/DESIGN.md`  
  blob: `0e66bdd478c2d245d360cbea327e1a41fdfed4d0`
- `docs/native-mobile/assets/HEALTHTIMES_NATIVE_WIREFRAME_V1.png`  
  blob: `5fa5bcc85dfc9b636dfec190d84d94217ffb769f`

PR #41 and PR #76 remain historical/unmerged custody and were not promoted independently.

## 6. Final production Pages release

Production release workflow:

- workflow: **Deploy HealthTimes Canonical Universal PWA**
- run: `37545026859`
- event: `push`
- branch: `main`
- head: `46f43e6e4f76ddbc0bdf6cf9b3f1f296ce82d4b8`
- result: **SUCCESS**

Jobs:

- build: `112546862242` — **SUCCESS**
- deploy-main: `112547264971` — **SUCCESS**
- deploy-native-preview — **SKIPPED**
- verify-native-preview — **SKIPPED**

Production artifact:

- artifact ID: `11450855818`
- name: `github-pages`
- size: `1181470` bytes
- digest: `sha256:ff710a9a3284032de17bfdd86171085059d7fb66b32a529e1fca015519b0ed8a`

Embedded build identity:

```json
{
  "sha": "46f43e6e4f76ddbc0bdf6cf9b3f1f296ce82d4b8",
  "presentation": "apps/mobile",
  "service_mode": "source-parity",
  "base_path": "/htp-zw"
}
```

GitHub Pages deployment reported:

- created deployment for `46f43e6e4f76ddbc0bdf6cf9b3f1f296ce82d4b8`;
- deployment status: **success**.

## 7. Final exact-main Chromium UAT

Final exact-main browser certification:

- workflow: **Chromium UAT — Canonical Reader**
- run: `37545026854`
- job: `112546862333`
- result: **SUCCESS**
- `EXPECTED_SHA=46f43e6e4f76ddbc0bdf6cf9b3f1f296ce82d4b8`
- `CHECKED_OUT_SHA=46f43e6e4f76ddbc0bdf6cf9b3f1f296ce82d4b8`
- browser result: **7 / 7 PASS**

Covered contracts:

1. exact build identity;
2. responsive Home on phone/tablet/desktop;
3. primary `apps/mobile` Reader routes;
4. Zimbabwe Premium anonymous fail-closed behavior;
5. Fiji public comparator;
6. truthful Premium access boundary;
7. PWA Pages-subpath safety and retired root Reader non-serving.

The exact-main UAT therefore certified the deployed build lineage without restoring or serving the retired repository-root Reader.

## 8. Final repository validation

Final canonical validation:

- workflow: **Validate HealthTimes 2.0**
- run: `37545026836`
- job: `112546862192`
- result: **SUCCESS**
- head: `46f43e6e4f76ddbc0bdf6cf9b3f1f296ce82d4b8`

## 9. PR #78 native recertification note

PR #78 native recertification used:

- workflow: **UI-02 Phase 6A Native Cross-Device Evidence**
- run: `37459220896`
- controlling rerun attempt: `2`
- exact head: `182d3c11c7f03571d1fda3d487de70d849b22172`

The overall workflow conclusion remained **FAILURE** because the attempt-2 aggregate bookkeeping selected only attempt-scoped artifacts and failed after the substantive rerun cells had completed.

The independently accepted substantive exact-head matrix was:

- contract + frozen regressions: **SUCCESS**
- Android phone: **SUCCESS**
- Android tablet: **SUCCESS**
- iOS phone: **SUCCESS**
- iOS tablet: **SUCCESS**
- `nativeRuntimeErrorLineCount = 0` on every captured required native cell

Classification:

**AGGREGATE EVIDENCE-HARNESS / RUN-ATTEMPT SCOPING DEFECT — NOT A PRODUCT REGRESSION**

This receipt does not claim the overall workflow was green.

## 10. Live-smoke waiver / external verification limitation

Direct post-deployment external HTTP smoke could not be completed from the available moderator/execution environments.

Recorded facts:

- GitHub Pages deployment itself reported success;
- the exact deployed artifact identity matched `46f43e6e4f76ddbc0bdf6cf9b3f1f296ce82d4b8`;
- exact-main Chromium UAT was green at **7 / 7**;
- no contradictory production-runtime evidence was observed.

Classification:

**EXTERNAL VERIFICATION ACCESS LIMITATION**

This receipt does not falsely state that independent live HTTP smoke was completed.

## 11. Premium and public classification

The accepted classification at closure remains:

- Zimbabwe Premium article: **protected / anonymous fail-closed**
- Fiji comparator: **public**

This closure does not mutate Premium entitlement, commerce provider/payment authority, Supabase, AG-05, source classification, CMS authority, or provider authority.

## 12. Historical PR custody at closure

| PR | Closure state |
| --- | --- |
| #41 | historical / unmerged |
| #52 | historical / unmerged |
| #69 | merged / closed |
| #75 | pre-promotion freeze receipt / unmerged |
| #76 | historical clean governance custody / unmerged |
| #77 | merged / closed |
| #78 | merged / closed |

Historical PRs remain custody records. This closure receipt does not close, rewrite, rebase, amend, or merge them.

## 13. Known non-blocking debt

The following already-recorded programme debt remains separated from accepted closure and is non-blocking for this programme receipt, where still applicable and not superseded by later work:

- Watch media debt;
- shared staging / provider-readiness debt;
- future Premium/provider activation work;
- historical PR cleanup.

These items are not converted into new defects by this receipt and do not change the accepted programme closure status.

## 14. Final authority statement

At programme closure:

- canonical Reader authority is `apps/mobile`;
- repository-root Reader is legacy, superseded, and non-serving;
- final canonical main is `46f43e6e4f76ddbc0bdf6cf9b3f1f296ce82d4b8`;
- production Pages release is tied to the same exact SHA;
- governance blobs are promoted and canonical;
- final Validate and Chromium UAT are green;
- accepted native evidence remains valid, with the PR #78 aggregate bookkeeping defect explicitly classified as evidence-harness/run-attempt scoping rather than product regression;
- historical custody remains preserved.

This document is the final post-promotion UI programme receipt only. It carries no independent merge, deployment, product, Premium, Supabase, backend, or domain authority.
