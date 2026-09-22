# AG-04 → AG-05 Public URL Continuity Contract

Status: **ACTIVE CROSS-LANE CONTRACT**

Source baseline: CP3 snapshot `2026-09-21`

Expected public objects:

- posts: **5,737**
- pages: **49**
- total: **5,786**

## Ownership

AG-04 owns source-content import, source IDs, slugs, body-link rewriting, media and taxonomy.

AG-05 owns canonical URL policy, preservation/redirect classification, SEO metadata continuity, sitemap, RSS, robots, structured data and post-cutover HTTP monitoring.

AG-05 must not invent a second content URL map. The canonical handoff is one sanitized public URL manifest produced from the AG-04 imported source identities.

## Required manifest

Recommended handoff path:

`migration-output/ag04-public-url-manifest.json`

The file may be outside Git while generated during rehearsal. It must contain one record for every published post/page from the accepted CP3 snapshot.

Each record:

```json
{
  "source_url": "https://healthtimes.co.zw/example/",
  "source_object_id": "123",
  "source_object_type": "post",
  "destination_url": "https://healthtimes.co.zw/example/",
  "handling": "PRESERVE_DIRECTLY",
  "HTTP_status": 200,
  "canonical_url": "https://healthtimes.co.zw/example/",
  "reason": "Preserve WordPress post-name permalink.",
  "verification_status": "VERIFIED",
  "robots": "index,follow",
  "seo": {
    "title": null,
    "description": null,
    "open_graph_title": null,
    "open_graph_description": null,
    "open_graph_image": null,
    "source_plugin": null
  }
}
```

Allowed `handling` values:

- `PRESERVE_DIRECTLY`
- `301_REDIRECT`
- `ARCHIVE`
- `NOINDEX`
- `EXCEPTION`

## Hard rules

1. Exactly **5,737 post** records and **49 page** records must be accounted for.
2. `PRESERVE_DIRECTLY` keeps the legacy path and returns HTTP 200.
3. `301_REDIRECT` must resolve in one hop to the preferred destination.
4. Missing content must not be redirected to the homepage as a catch-all.
5. Every archive/noindex/exception record requires an explicit reason.
6. No source URL may silently disappear.
7. Canonicals must never collapse unrelated stories/pages to the homepage.
8. AG-04 must preserve source SEO/plugin fields when discovered; AG-05 consumes them and does not replace non-empty source metadata with generic text.
9. Rank Math is known to be inactive in the source capture, but historical Rank Math/other SEO postmeta must still be preserved when actually present.
10. The output contains public URL/SEO data only. No private source rows, credentials, subscriber information or protected Newsroom content may enter the manifest.

## Validation

Run:

```bash
npm run migration:ag05-url -- \
  --manifest migration-output/ag04-public-url-manifest.json \
  --out-dir migration-output/ag05
```

The validator fails on:

- count mismatch;
- duplicate source URLs;
- missing required fields;
- redirect chains;
- source=destination redirects;
- catch-all redirects to `/`;
- invalid preservation status;
- homepage canonical collapse.

Only a complete manifest may generate:

- `ag05-url-manifest.json`
- `redirect-manifest.json`
- `sitemap.xml`
- `robots.production.txt`
- `rss-feed-policy.json`

## Current coordination state

At AG-05 launch, branch `migration/ag-04-rehearsal-content-media-taxonomy` still pointed at the accepted CP3 SHA and had no rehearsal-import commits. Therefore AG-05 URL coverage remains deliberately **BLOCKED** until the AG-04 handoff exists.

This is an execution dependency, not permission for AG-05 to modify the content importer.
