# Current State Architecture

## Repository

- Branch inspected: `main`, then migration preparation branch.
- Client-review deployment: GitHub Pages.
- Application type: static HTML/CSS/JavaScript PWA.
- Tests: Playwright Chromium UAT.

## Implemented Public Surfaces

- Homepage, article, archive, Premium, preferences, about/standards and manual pages.
- Desktop and separate mobile/tablet presentation systems.
- PWA manifest and service worker shell caching.
- Reader account, saved stories, history, themes and Premium state in browser storage.
- Premium preview timer and content lock on Premium stories.
- HOSPAZ advertising placements and local ad metrics.
- Ask HealthTimes client-side discovery over bundled content.
- `ads.txt` and `app-ads.txt` static authorization files are now present for the new platform scaffold.

## Implemented Newsroom Frontend

- Staff login gateway using presentation credentials.
- Role/capability concepts.
- Reporter/editor/publisher/audience/commercial workspaces.
- Story drafts, autosave, submission, review and publishing simulation.
- Assignments, media library, staff access, audit log, Premium and advertising controls.

## Frontend-Only Boundaries

- Authentication, passwords, sessions and MFA are browser-local demonstrations.
- RBAC is enforced in JavaScript only.
- Story storage, revisions, staff records, audit logs, ads, Premium and metrics are browser-local.
- Public analytics/advertising snippets are not yet governed by a server-side consent/configuration layer.
- No Google Analytics, Search Console, AdSense, PageSpeed or backlink ingestion jobs exist yet.
- Premium entitlement is not connected to a payment/subscriber backend.
- Media is hotlinked from WordPress for review and must be migrated to owned storage.
- GitHub Pages does not provide backend functions, private drafts, row-level permissions, transactional email, backups or production audit history.

## Production-Ready Behaviours To Preserve

- Professional newsroom visual direction.
- Granular capability model.
- Reporter cannot publish in current UX.
- Commercial workspace is separated from editorial editing.
- Premium story access policy concept.
- HOSPAZ and source parity awareness.
- Mobile-first PWA shell and responsive testing discipline.
