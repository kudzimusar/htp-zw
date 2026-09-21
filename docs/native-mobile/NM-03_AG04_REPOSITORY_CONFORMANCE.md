# NM-03 — AG-04 Repository Conformance & Replacement Gate

**Repository:** `kudzimusar/htp-zw`  
**Branch:** `feat/native-mobile-nm03-source-contract-reconciliation`  
**Starting checkpoint:** `2baf931f1fc9bf82936a54bab66b357910e134bd`  
**Scope:** AG-04 Reader repository projection, authority enforcement and executable replacement readiness  
**Production systems modified:** **NO**

## Purpose

This gate answers one question deterministically:

> Can an AG-04 Supabase ArticleRepository replace the temporary public WordPress Source Parity repository without changing Reader semantics or weakening content, provenance, taxonomy, geography or Premium boundaries?

The answer is currently **BLOCKED**.

This work does not implement the AG-04 importer, activate a staging ArticleRepository, grant Premium entitlement or change Reader UI.

## AG-04 Reader projection bundle

The future AG-04 repository must supply one `AG04ReaderProjectionBundle` to the existing mapper contract.

The bundle is:

- `story` — the migrated `stories` row;
- `author` — resolved migrated author row, or null when explicitly unresolved;
- `primarySection` — section candidate;
- `primarySectionAuthority` — `canonical-approved`, `observed-source` or `inferred-requires-review`;
- `topics` — canonical/topic candidates;
- `topicsAuthority` — explicit authority for those topic candidates;
- `legacyTaxonomy` — preserved WordPress categories/tags with source IDs/slugs/names/kinds;
- `geography` — geographic-zone candidates;
- `geographyAuthority` — explicit authority for those geography candidates;
- `heroMedia` — resolved media row;
- `heroMediaLegacySource` — the related `legacy_sources` row where the media originated in WordPress;
- `legacySource` — the story's `legacy_sources` row;
- `migrationExceptions` — deterministic migration/reconciliation exceptions;
- `premiumSourceContext` — Premium/access migration provenance only.

`mapAG04ReaderProjection()` converts that bundle through the same `mapStoryRow()` path into the existing `ArticleDetail`. No second Article model exists.

## Authority rules

### Section

Only `primarySectionAuthority: "canonical-approved"` populates `ArticleDetail.primarySection`.

A WordPress-backed observed section remains legacy taxonomy. An inferred section remains under `taxonomyResolution.inferredRequiresReview`.

### Topics

Only `topicsAuthority: "canonical-approved"` populates `ArticleDetail.topics`.

Observed WordPress tags belong in `legacyTaxonomy`. Inferred topics remain in `taxonomyResolution.inferredRequiresReview`.

### Geography

Repository-supplied geography is a candidate, not authority.

Only:

`geographyAuthority: "canonical-approved"`

may populate:

- `geographyRefs`;
- Reader-facing `geography`;
- `geographyResolution.canonicalApproved`.

`observed-source` geography is preserved under `geographyResolution.observedSource`.

`inferred-requires-review`, and geography supplied without an explicit authority, is preserved under `geographyResolution.inferredRequiresReview`.

Therefore a geographic row cannot become canonical merely because an AG-04 query returned it.

## Premium migration semantics

AG-04 may provide migration evidence through:

`premiumSourceContext`

containing:

- legacy membership/access signal;
- whether a historical provider reference exists;
- reconciliation classification.

This is **provenance only**.

The public AG-04 Reader projection:

- derives the visible access policy from the migrated story row;
- treats an unknown/non-public access value as Premium/fail-closed;
- always maps a Premium story with `bodyHtml: null`;
- never creates an entitlement;
- never authorizes a protected body.

NM-06 remains entitlement/protected-access authority.

## Executable readiness evaluator

`apps/mobile/src/domain/ag04-conformance.ts` defines:

- `AG04ReaderRepositoryEvidence`;
- `AG04ReaderRepositoryReadiness`;
- `evaluateAG04ReaderRepositoryReadiness()`;
- `CURRENT_AG04_READER_REPOSITORY_EVIDENCE`;
- `CURRENT_AG04_READER_REPOSITORY_READINESS`.

The evaluator returns:

- `ready: boolean`;
- `status: "blocked" | "ready"`;
- deterministic blocker codes, owner and detail.

### Current blockers

The current evidence object truthfully leaves the replacement gate blocked because:

- **AG-03:** authoritative database + complete uploads source package is not accepted;
- **AG-04:** no certified rehearsal import exists;
- **AG-04:** complete published post/page reconciliation is not certified;
- **AG-04:** author/byline reconciliation is not certified;
- **AG-04:** legacy taxonomy + canonical taxonomy mapping is not certified;
- **AG-04:** media/storage/provenance reconciliation is not certified;
- **AG-04:** shortcode/custom-field exception ledger is not certified;
- **AG-04:** canonical URL/slug/publication/modified field reconciliation is not certified;
- **AG-04:** Premium/access source markers are not reconciled;
- **AG-04:** internal-link reconciliation is not certified;
- **AG-04:** importer idempotency is not certified;
- **AG-04:** stable WordPress IDs/keys/checksums/provenance are not certified end-to-end;
- **AG-04:** no certified story↔geography relation/query exists;
- **AG-04:** Reader-safe public staging read policy is not certified;
- **NM-06:** protected Premium-body boundary on the migrated repository path is not certified;
- **NM-03:** an actual AG-04 repository projection has not yet passed this conformance suite;
- unexplained content loss count is not certified as zero;
- unexplained media loss count is not certified as zero;
- unexplained broken internal-link count is not certified as zero.

No runtime evidence is fabricated to make these pass.

## AG-04 requirement → Reader-contract expectation

| Canonical AG-04 output | NM-03 Reader expectation |
| --- | --- |
| Complete published post/page reconciliation | `postPageReconciliationComplete`; every Reader story accounted for or explicit exception |
| Stable WordPress provenance | story/media `SourceProvenance` retains IDs, stable keys, checksums and source URLs |
| Authors/bylines | resolved `AuthorRef` or explicit unresolved exception |
| Legacy + canonical taxonomy | legacy terms preserved; only explicit canonical-approved section/topics reach Reader canonical fields |
| Media reconciliation | hero media mapped with source provenance; missing legacy-source relation is review-state |
| Shortcode/custom-field exceptions | preserved in `sourceProvenance.exceptions`; no silent loss |
| Canonical URLs and publication dates | `canonicalUrl`, `publishedAt`, `modifiedAt` preserved and certified |
| Premium/access markers | represented in `premiumSourceContext` without entitlement grant |
| Internal-link reconciliation | unexplained broken-link count must equal zero |
| Idempotent import | `idempotentImportCertified` must be true before replacement |
| Before/after reconciliation | unexplained content/media loss counts must each equal zero |
| Geography required by Reader | certified story↔geography relation plus explicit `canonical-approved` authority |
| Reader-safe staging exposure | public read policy certified; Premium body boundary certified separately |

## Behavioral conformance tests

`apps/mobile/tests/ag04-mapper-behavior.test.mjs` executes the real TypeScript mapping modules after deterministic in-test transpilation and asserts returned values.

It covers:

- canonical-approved section;
- observed WordPress section;
- inferred/review-only section;
- canonical-approved topics;
- observed legacy tags;
- inferred topics;
- canonical geography;
- observed geography;
- inferred and authority-less geography;
- resolved author;
- unresolved author;
- resolved media with `legacy_sources`;
- media missing its provenance relation;
- public article;
- Premium article;
- unknown/unsafe access policy;
- unknown shortcode;
- explicit migration exception;
- stable WordPress post identity;
- stable WordPress media identity;
- current readiness = BLOCKED;
- fully certified evidence + zero loss = READY;
- unexplained media loss re-blocks an otherwise ready candidate.

These behavior tests are part of `npm --prefix apps/mobile run test:content-contracts`.

## Activation condition

The gate changes from **BLOCKED** to **READY** only when one staging candidate supplies evidence with all boolean requirements true **and**:

- `unexplainedContentLossCount === 0`;
- `unexplainedMediaLossCount === 0`;
- `unexplainedBrokenInternalLinkCount === 0`.

In addition, the AG-04 repository projection must pass the NM-03 behavior/conformance suite against that candidate.

Only after that evidence is certified may a separate change propose removing the staging editorial-data lock in `apps/mobile/src/services/index.ts`.

This lane does **not** remove that lock.

Production activation remains outside this gate.

## Ownership handoff

### AG-03 owned

- authoritative private WordPress database export;
- complete `wp-content/uploads/` archive;
- authoritative source-package/provenance validation;
- source snapshot/freeze evidence needed by AG-04.

### AG-04 owned

- importer and rehearsal import;
- complete post/page/author/taxonomy/media reconciliation;
- stable source provenance and checksums;
- migration exception ledger;
- canonical URL/date preservation;
- Premium/access marker migration;
- internal-link reconciliation;
- idempotency;
- story↔geography query/relation;
- staging Reader-safe public read policy evidence.

### NM-03 owned

- ArticleDetail projection contract;
- section/topic/geography authority semantics;
- provenance and migration-exception projection;
- Premium migration provenance shape;
- repository conformance tests;
- executable replacement readiness decision.

### NM-04 owned

- Reader visual behavior and presentation.
- No NM-04 Reader/UI file is changed by this lane.

### NM-06 owned

- entitlement and protected Premium-body authorization;
- authenticated protected-content access path.

## Source Parity preservation

The temporary source repository remains active while this gate is BLOCKED.

Its existing contract is unchanged:

- public WordPress GET only;
- `credentials: "omit"`;
- bounded `per_page=50`;
- `corpusComplete: false`;
- deterministic real-content fallback;
- Premium body exclusion before retrieval;
- WordPress source IDs/provenance;
- canonical/legacy taxonomy separation;
- review-state geography;
- no crawler/migration behavior.

Staging editorial mode remains locked. Production editorial mode remains locked.

**Production systems modified: NO.**
