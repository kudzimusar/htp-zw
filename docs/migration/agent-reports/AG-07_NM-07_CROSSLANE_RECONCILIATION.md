# AG-07 / NM-07 — Cross-Lane Integration Reconciliation

Date: 2026-09-22

## Certified inputs

Server / AG-07 technical input:

`971571480d0295661556631e000aaef4d490b8b3`

This is the AG-07 integration candidate built from CA-01 certified server runtime
`e8bbbc22661dbd5a755e63742fb53c805d96d5b9` plus documentation-only AG-07 provenance.

Native / NM-07 input:

`f1a9f5f985fcd399dcb6666002ce04d85fdd9ced`

This is the moderator-accepted CA-01 Native certified component.

## Tree reconciliation

The two certified histories diverged before the Native workspace existed on the server lane.

The combined tree is assembled by explicit authority:

- backend / Supabase / Newsroom / CA-01 server runtime: server parent
- `apps/mobile/**`: Native parent
- Native-only workflows and `docs/native-mobile/**`: Native parent
- `README.md`: Native parent because it includes the Native/Universal foundation section
- root `package.json`: merged scripts; server migration/security/CA-01 scripts preserved and Native `native:*` scripts added
- root Validate/UAT/Playwright/Newsroom files: server parent
- no already-applied migration rewritten
- no frozen CA-01 branch moved

Overlapping files deliberately retained from the server parent:

- `.github/workflows/pages.yml`
- `.github/workflows/uat.yml`
- `.github/workflows/validate.yml`
- `newsroom.css`
- `newsroom.html`
- `newsroom.js`
- `playwright.config.js`
- `tests/newsroom-os.spec.js`
- `v21-fixes.css`

The Native PWA is still independently built/certified by the Native workflows; the older branch-specific Pages preview workflow is not allowed to overwrite the server lane's Pages workflow during integration.

## Candidate status

This commit is a technical cross-lane integration candidate only.

It does not authorize:

- merge to main
- production deployment
- production database mutation
- production DNS/email changes
- App Store / Play Store submission
- CP7 integrated acceptance

Required next action: exact-head combined certification and cross-lane staging/UAT/regression.

Production systems modified: NO.
