# NM-05R2 — Premium Teaser Pages Boundary Closure

## Moderator disposition

**ACCEPTED EXECUTABLE — READY FOR PAGES DEPLOYMENT / UI-06 RECERTIFICATION**

Repository: `kudzimusar/htp-zw`

Branch: `fix/nm05r2-premium-teaser-pages-boundary`

PR: #57 — Draft / Open / Unmerged

Accepted executable:

`3d7f59f97f195a304d5ed5571a7e71ec8f91810c`

Accepted base executable:

`c1a9f642a735ad2d02775a7d8668e797bedbb426`

## Proven live defect

UI-06 on Pages wrapper `4dd51e1bc7abc8413097c4d7295f54e4ce4c00e9` proved that all browser WordPress metadata requests aborted before the bounded teaser RPC could run. The Reader therefore failed closed directly to the Premium paywall.

The defect was not AG-05 SQL and did not expose protected content.

## Accepted repair

`apps/mobile/src/services/source-parity.ts` no longer requires a browser WordPress metadata lookup before Premium classification.

The bounded authority sequence is now:

1. derive the generic dated compatibility candidate from repository-known `publishedAt + slug`;
2. call `ag05_public_story_teaser_document` through the existing Premium authority adapter;
3. fall back to canonical URL only if the dated candidate does not resolve;
4. Premium returns with `bodyHtml = null` and bounded teaser only;
5. public WordPress body content remains reachable only after classification leaves the story public.

No source ID or date is hard-coded into product logic.

## Exact-head evidence

At executable `3d7f59f97f195a304d5ed5571a7e71ec8f91810c`:

- NM-05 Premium Teaser + Commerce Consumer Conformance run `37023997830`: **SUCCESS**
- job `110893887911`: **SUCCESS**
- required Reader/UI-03 preservation matrix: **SUCCESS**
- NM-05 consumer behavior: **SUCCESS**
- live bounded teaser authority: **SUCCESS**
- AG-05 commerce + teaser protection contract: **SUCCESS**
- source-parity Web/PWA export: **SUCCESS**
- Chromium source-parity Premium browser/network proof: **SUCCESS**
- fail-closed static commerce/source-parity output: **SUCCESS**
- Chromium UAT run `37023997302`: **SUCCESS**
- Protected Operations run `37023997395`: **SUCCESS**

The generic Migration Tests workflow also ran, but its broad suite is not the controlling NM-05R2 gate. The changed AG-05 Premium protection spec was independently executed and passed in the exact-head NM-05 workflow above.

## Frozen authority receipt

- UI-03 Premium prompt implementation changed: **NO**
- one-paragraph policy changed: **NO**
- 20-second policy changed: **NO**
- AG-05 SQL changed: **NO**
- Supabase migrations changed: **NO**
- commerce provider activated: **NO**
- Paynow/PayPal changed: **NO**
- HOSPAZ changed: **NO**
- Pages deployed by this branch: **NO**
- main changed: **NO**

## Next bounded operation

Create a fresh Pages deployment wrapper from this documentation closure, carrying forward the accepted Pages workflow custody from the prior wrapper. Then run UI-06 live Premium certification against the new wrapper.

Do not merge PR #57 as part of this closure.
