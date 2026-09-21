# NM-04 — Reader Media, Offline & Migrated Content Formats

**Repository:** `kudzimusar/htp-zw`  
**Starting SHA:** `eb1eba1e1d5579b3019f67e614fbe21297ab5a30`  
**Branch:** `feat/native-mobile-nm04-reader-media-offline`  
**Production systems modified:** **NO**

## Scope

This checkpoint extends the existing Reader without changing NM-03 authority semantics or activating an AG-04 repository.

### Reader-safe migrated content

The structured Reader parser now has normalized presentation blocks for:

- paragraphs and H2/H3 headings;
- block quotes and distinguishable pull quotes;
- ordered/unordered nested lists;
- figures with caption and credit;
- multi-image galleries;
- tables;
- downloadable document references;
- safe audio references;
- safe video references.

Executable `script`, `iframe`, `object`, `embed`, `form`, `input`, `button`, unsafe URL schemes and arbitrary executable WordPress content remain fail-closed.

AG-04 remains responsible for transforming the authoritative WordPress source into these approved normalized records. NM-04 only renders them.

## Audio / media contract

`AudioItem` and `VideoItem` now carry provider-independent optional media metadata. The Reader media state supports:

`idle → loading → playing ↔ paused → ended`

and explicit `error`, elapsed progress, duration, seek, playback rate and mini/full presentation.

A playback source must be explicitly verified and HTTP(S). No production narration URL is invented.

The PWA can use the web audio transport when a verified source is supplied. Native background/lock-screen playback is **not claimed** until a certified native adapter exists.

## Offline state

Article persistence is versioned to a v2 offline record with:

- availability state;
- downloaded timestamp;
- source modification timestamp;
- text availability;
- media availability;
- local-only sync mode;
- failure reason.

The semantic state model includes:

- not-downloaded;
- downloading;
- available;
- stale;
- failed;
- unavailable;
- pending-sync.

The current implementation is local device persistence only. It does not claim account/cloud synchronization.

### Premium safety

The persistence boundary independently re-checks eligibility. A non-public or missing body is persisted only as sanitized metadata with `bodyHtml: null`, `textAvailable: false`, and `state: unavailable`.

Local storage never grants entitlement.

## Saved library

Saved and Downloaded remain distinct.

The library can now separately represent:

- saved articles;
- downloaded article records;
- reading history;
- saved video IDs;
- saved audio IDs;
- offline-capable media metadata.

Saving media does not claim a media download.

## Connectivity

Reader connectivity uses one semantic state:

- online;
- offline;
- unknown.

The PWA observes browser online/offline transitions. Native remains `unknown` until NM-07 certifies a native connectivity adapter. Downloaded public articles can be used as route fallback when the network repository cannot supply the story.

## Authority preservation

This checkpoint does not redefine:

- `geographyAuthority`;
- `taxonomyResolution`;
- `geographyResolution`;
- `AG04ReaderProjectionBundle`;
- `mapAG04ReaderProjection()`;
- AG-04 readiness evaluation;
- migration provenance;
- Premium source context.

## Handoffs

### AG-04 → NM-04

NM-04 is ready to consume authoritative normalized records for tables, galleries, pull quotes, documents, audio/video references, captions/credits, media URLs, transcript/caption readiness and article-media relationships.

### AG-05 → NM-05

Not implemented here: video ads, audio sponsorship, GA4 media events, AdMob/GAM configuration or commercial media placements.

### AG-06 → NM-06

Not implemented here: server bookmark sync, protected Premium media/body access, account entitlement, remote media authorization or cross-device download state.

### AG-07 → NM-07

New simulator/device UAT cases: verified playback, unavailable media, pause/resume/seek/speed, network loss/recovery, downloaded-article fallback, stale-copy presentation, high text scale, tablet/narrow-browser layout, screen-reader media labels, and physical Android/iOS playback once a native adapter exists.
