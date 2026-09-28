# AG-06 — NM-04 Consumer Authority Handoff

**Programme:** HealthTimes migration  
**Repository:** `kudzimusar/htp-zw`  
**Issue:** `#39 — AG-06: native public context + inline media authority`  
**PR:** `#40 — AG-06: Native public context + inline media authority`  
**Accepted runtime SHA:** `ed5e38a4201029c342617aa43f1dbd62161f5b97`  
**Accepted baseline:** `2849c18cd9f5ed36d62b4bb72d19f55c00ab8b15`  
**HealthTimes Staging Supabase ref:** `gcdohgbmqhqwydgaxrcr`  
**Production systems modified:** **NO**

## 1. Authority freeze

Moderator disposition:

`ACCEPTED — AG-06 NATIVE PUBLIC CONTEXT + INLINE MEDIA AUTHORITY CLOSED`

AG-06 feature implementation is frozen at runtime SHA:

`ed5e38a4201029c342617aa43f1dbd62161f5b97`

This document is the consumer-contract handoff to the moderator for the next NM-04 Reader integration phase. It does not authorize any new AG-06 runtime work.

## 2. Ownership boundary

AG-06 owns the accepted native Newsroom/public contracts.

AG-05 remains the migrated WordPress routing/context authority.

NM-04 is expected to consume both through the existing source-neutral Reader service/model layer.

Target architecture:

`AG-05 migrated public authority`
+
`AG-06 native public authority`
→
`NM-04 source-neutral services / mappers`
→
`ArticleDetail / MediaRef / canonical Reader`
→
`apps/mobile Web / PWA / iOS / Android`

The superseded root Reader must not be revived.

## 3. Canonical author / section authority

Accepted relationships:

- `staff_profiles.public_author_id → authors.id`
- `stories.author_id`
- `stories.primary_section_id`

Canonical public-author authority remains:

`public.authors`

Canonical section authority remains:

`public.sections`

Rules:

- workflow owner and public byline are separate identities;
- changing `owner_staff_id` must not silently rewrite `author_id`;
- a Reporter cannot arbitrarily impersonate another public author;
- imported author identities/slugs/source provenance remain protected;
- Reader consumers must not infer public author identity from staff identity;
- Reader consumers must not infer canonical section identity from `desk` or free-text labels.

## 4. Native public context RPC

RPC:

`public.newsroom_public_context_document(p_path text)`

Execute authority:

- anon: allowed
- authenticated: allowed
- service_role: allowed

Supported paths:

- `/category/<slug>/`
- `/author/<slug>/`

Invalid path forms return:

`null`

A syntactically valid category/author path whose slug does not resolve to a canonical section/author also returns:

`null`

A valid known context with no eligible native stories returns the context object with:

`items: []`

### 4.1 Top-level fields

The accepted top-level JSON fields are:

- `kind`
- `slug`
- `name`
- `bio` — author context only; omitted when null by `jsonb_strip_nulls`
- `path`
- `canonical_url`
- `source_type`
- `handling`
- `items`

Fixed provenance values:

- `source_type = "native-story-context"`
- `handling = "native_cms"`

### 4.2 Item fields

Each eligible context item is built from:

- `story_id`
- `title`
- `canonical_url`
- `published_at`
- `modified_at`
- `author_name`
- `author_slug`
- `section_name`
- `section_slug`
- `access_policy`

Null object fields can be removed by the top-level `jsonb_strip_nulls` processing.

### 4.3 Release eligibility

Native context includes stories only when all applicable rules hold:

- `stories.legacy_source_id IS NULL`
- matching canonical section or canonical author
- `status IN ('publish','published')` case-insensitively
- `distribution.public_reader = true`
- `published_at IS NULL OR published_at <= now()`

Ordering:

1. `published_at DESC NULLS LAST`
2. `created_at DESC`
3. story ID

Maximum returned items:

`50`

NM-04 must consume this already-filtered public contract. It must not reproduce publication authorization client-side.

## 5. Public author contract

Public author identity is exposed through the native context/story documents only.

Author context top-level fields:

- `name`
- `slug`
- `bio` when present

Public story author object:

- `name`
- `slug`
- `bio`

No public author ID is emitted by these accepted public documents.

Private staff/security fields are not part of the public contract, including:

- staff email
- Auth UID
- provider/session identity
- MFA state
- capability assignments
- internal staff role data
- private Newsroom notes

NM-04 must not query staff tables to enrich public author presentation.

## 6. Public section contract

Category context top-level public section fields:

- `name`
- `slug`

Public story section object:

- `name`
- `slug`

No section ID is emitted by the accepted public documents.

NM-04 must use the canonical public context contract rather than direct screen-level reads from `sections` or `stories`.

## 7. Native public story document

RPC:

`public.newsroom_public_story_document(p_path text)`

Execute authority:

- anon: allowed
- authenticated: allowed

The function returns `null` when no eligible native public/premium story matches the normalized path.

Eligible stories must satisfy:

- `legacy_source_id IS NULL`
- `status IN ('publish','published')`
- `access_policy IN ('public','premium')`
- `distribution.public_reader = true`
- `published_at IS NULL OR published_at <= now()`
- normalized slug path or normalized canonical URL path matches `p_path`

### 7.1 Exact story-document fields

The accepted response object contains these keys:

- `story_id`
- `source_id`
- `source_type`
- `source_url`
- `old_path`
- `new_path`
- `handling`
- `http_status`
- `title`
- `story_title`
- `description`
- `canonical_url`
- `robots`
- `index_policy`
- `open_graph_title`
- `open_graph_description`
- `open_graph_image`
- `featured_storage_bucket`
- `featured_storage_object`
- `featured_public_url`
- `featured_source_url`
- `featured_alt_text`
- `featured_caption`
- `featured_credit`
- `featured_checksum`
- `inline_media`
- `schema_type`
- `source_plugin`
- `published_at`
- `modified_at`
- `author`
- `section`
- `access_policy`
- `body_html`
- `standfirst`
- `excerpt`

Fixed native provenance:

- `source_id = null`
- `source_type = "native-story"`
- `source_url = null`
- `handling = "native_cms"`
- `http_status = 200`
- `robots = "index,follow,max-image-preview:large"`
- `index_policy = "index"`
- `schema_type = "NewsArticle"`
- `source_plugin = "healthtimes-newsroom"`
- `featured_source_url = null`

## 8. Featured media contract

The public story document exposes the accepted featured image through:

- `open_graph_image`
- `featured_storage_bucket`
- `featured_storage_object`
- `featured_public_url`
- `featured_alt_text`
- `featured_caption`
- `featured_credit`
- `featured_checksum`

Only published featured media with:

- `public_storage_bucket = 'newsroom-public'`
- non-null public storage key
- non-null public URL

is eligible for this projection.

Reader-safe managed public media authority is:

`newsroom-public`

Private Newsroom custody remains:

`newsroom-private`

NM-04 must not treat signed/private preview URLs as public Reader media.

## 9. Inline body binding contract

Canonical inline marker:

`<figure data-healthtimes-media-id="<UUID>"></figure>`

Binding validation is scoped to CMS-native Newsroom stories.

For a valid marker:

- media ID must exist;
- media must be attached to the same story;
- `media_usage.usage_type = 'inline'`;
- media must be an image MIME type;
- private custody must be `newsroom-private`;
- media status must be one of `private_ready`, `public_staged`, `published`.

Publication fails closed when the body contains:

- a cross-story marker;
- a detached marker;
- an arbitrary/unbound UUID marker;
- unresolved HealthTimes marker syntax;
- a `newsroom-private` URL;
- a signed private Storage URL.

Detaching media does not silently rewrite article body HTML. A stale marker remains visible to the validator and blocks publication.

## 10. Inline public media manifest

For public stories only, `inline_media` contains marker-bound published inline images in body order.

Exact item fields:

- `media_id`
- `usage_type` — fixed to `"inline"`
- `marker`
- `public_storage_bucket`
- `public_storage_object`
- `public_url`
- `checksum`
- `alt_text`
- `caption`
- `credit`

Eligibility:

- same-story `media_usage='inline'`
- marker is present in accepted body
- media status = `published`
- `public_storage_bucket='newsroom-public'`
- public storage object non-null
- public URL non-null

Ordering follows marker position in `body_html`, then media ID.

NM-04 must resolve an inline marker only against the same story document's `inline_media` manifest.

It must not infer placement from manifest order alone and must not write resolved public URLs back into Newsroom `body_html`.

## 11. Checksum / storage trust boundary

Accepted public promotion authority requires:

- verified SHA-256 checksum;
- checksum-bound public object key;
- private/public checksum equality;
- conflicting overwrite denial;
- repeated identical promotion to be idempotent.

Public object key structure is checksum-bound beneath the story/media identity, for example:

`story-media/<story-id>/<media-id>/<sha256>/<filename>`

Public URL shape:

`/storage/v1/object/public/newsroom-public/<public-storage-object>`

NM-04 must treat the accepted public URL/checksum as server authority. It must not synthesize a different managed-media URL.

## 12. Premium boundary

For anonymous Premium story detail:

- `body_html = null`
- `inline_media = []`

Featured-media behavior remains available according to the accepted public story contract.

NM-04 must not:

- reconstruct Premium body from list/context metadata;
- infer entitlement locally;
- render protected inline-body media anonymously;
- cache a protected body obtained from an unrelated authority.

Premium entitlement remains a server-side authority.

## 13. AG-05 coexistence

AG-06 native public context does not replace AG-05 migrated context.

Server authority remains separate:

- AG-05 = migrated WordPress route/context authority
- AG-06 = CMS-native Newsroom public context/story authority

The next NM-04 phase should normalize both into the existing source-neutral Reader domain model.

Direct route resolution must preserve accepted migrated precedence before native fallback wherever the existing NM-04 contract requires it.

No AG-05 SQL/function change is part of this handoff.

## 14. NM-04 implementation targets

The next consumer phase is bounded to three capabilities.

### 14.1 Native category browse

NM-04 should consume AG-06 `/category/<slug>/` context and normalize eligible native stories alongside migrated AG-05 context through the Reader service layer.

No direct screen query to `stories` or `sections`.

### 14.2 Native author browse

NM-04 should consume AG-06 `/author/<slug>/` context and normalize it alongside migrated AG-05 author context.

Public author identity must remain separate from Newsroom staff identity.

### 14.3 CMS-native inline body media

NM-04 should:

1. consume native public story `body_html`;
2. encounter `data-healthtimes-media-id="<UUID>"`;
3. resolve that UUID only against the same document's `inline_media`;
4. render with the existing source-neutral Reader media component/model;
5. preserve `alt_text`, `caption`, and `credit`;
6. leave stored Newsroom body unchanged.

## 15. Sanitized contract examples

These examples preserve the accepted runtime shape. IDs/URLs are sanitized placeholders.

### 15.1 Native category context

```json
{
  "kind": "category",
  "slug": "health-news",
  "name": "Health News",
  "path": "/category/health-news/",
  "canonical_url": "https://healthtimes.co.zw/category/health-news/",
  "source_type": "native-story-context",
  "handling": "native_cms",
  "items": [
    {
      "story_id": "<story-uuid>",
      "title": "Example public HealthTimes story",
      "canonical_url": "https://healthtimes.co.zw/example-public-story/",
      "published_at": "2026-09-28T12:00:00Z",
      "modified_at": "2026-09-28T12:05:00Z",
      "author_name": "HealthTimes",
      "author_slug": "healthtimesco",
      "section_name": "Health News",
      "section_slug": "health-news",
      "access_policy": "public"
    }
  ]
}
```

### 15.2 Native author context

```json
{
  "kind": "author",
  "slug": "healthtimesco",
  "name": "HealthTimes",
  "bio": "Example sanitized public author biography.",
  "path": "/author/healthtimesco/",
  "canonical_url": "https://healthtimes.co.zw/author/healthtimesco/",
  "source_type": "native-story-context",
  "handling": "native_cms",
  "items": [
    {
      "story_id": "<story-uuid>",
      "title": "Example public HealthTimes story",
      "canonical_url": "https://healthtimes.co.zw/example-public-story/",
      "published_at": "2026-09-28T12:00:00Z",
      "modified_at": "2026-09-28T12:05:00Z",
      "author_name": "HealthTimes",
      "author_slug": "healthtimesco",
      "section_name": "Health News",
      "section_slug": "health-news",
      "access_policy": "public"
    }
  ]
}
```

### 15.3 Public native story with featured + inline media

```json
{
  "story_id": "<story-uuid>",
  "source_id": null,
  "source_type": "native-story",
  "source_url": null,
  "old_path": "/example-public-story/",
  "new_path": "/example-public-story/",
  "handling": "native_cms",
  "http_status": 200,
  "title": "Example public HealthTimes story",
  "story_title": "Example public HealthTimes story",
  "description": "Sanitized standfirst.",
  "canonical_url": "https://healthtimes.co.zw/example-public-story/",
  "robots": "index,follow,max-image-preview:large",
  "index_policy": "index",
  "open_graph_title": "Example public HealthTimes story",
  "open_graph_description": "Sanitized standfirst.",
  "open_graph_image": "/storage/v1/object/public/newsroom-public/story-media/<story-uuid>/<featured-media-uuid>/<sha256>/featured.png",
  "featured_storage_bucket": "newsroom-public",
  "featured_storage_object": "story-media/<story-uuid>/<featured-media-uuid>/<sha256>/featured.png",
  "featured_public_url": "/storage/v1/object/public/newsroom-public/story-media/<story-uuid>/<featured-media-uuid>/<sha256>/featured.png",
  "featured_source_url": null,
  "featured_alt_text": "Example featured image",
  "featured_caption": "Example featured caption",
  "featured_credit": "HealthTimes",
  "featured_checksum": "<sha256>",
  "inline_media": [
    {
      "media_id": "<inline-media-uuid>",
      "usage_type": "inline",
      "marker": "<figure data-healthtimes-media-id=\"<inline-media-uuid>\"></figure>",
      "public_storage_bucket": "newsroom-public",
      "public_storage_object": "story-media/<story-uuid>/<inline-media-uuid>/<sha256>/inline.png",
      "public_url": "/storage/v1/object/public/newsroom-public/story-media/<story-uuid>/<inline-media-uuid>/<sha256>/inline.png",
      "checksum": "<sha256>",
      "alt_text": "Example inline image",
      "caption": "Example inline caption",
      "credit": "HealthTimes"
    }
  ],
  "schema_type": "NewsArticle",
  "source_plugin": "healthtimes-newsroom",
  "published_at": "2026-09-28T12:00:00Z",
  "modified_at": "2026-09-28T12:05:00Z",
  "author": {
    "name": "HealthTimes",
    "slug": "healthtimesco",
    "bio": "Example sanitized public author biography."
  },
  "section": {
    "name": "Health News",
    "slug": "health-news"
  },
  "access_policy": "public",
  "body_html": "<p>Example public body.</p><figure data-healthtimes-media-id=\"<inline-media-uuid>\"></figure>",
  "standfirst": "Sanitized standfirst.",
  "excerpt": "Sanitized excerpt."
}
```

### 15.4 Anonymous Premium story

```json
{
  "story_id": "<premium-story-uuid>",
  "source_id": null,
  "source_type": "native-story",
  "source_url": null,
  "old_path": "/example-premium-story/",
  "new_path": "/example-premium-story/",
  "handling": "native_cms",
  "http_status": 200,
  "title": "Example Premium story",
  "story_title": "Example Premium story",
  "description": "Sanitized Premium standfirst.",
  "canonical_url": "https://healthtimes.co.zw/example-premium-story/",
  "robots": "index,follow,max-image-preview:large",
  "index_policy": "index",
  "inline_media": [],
  "schema_type": "NewsArticle",
  "source_plugin": "healthtimes-newsroom",
  "published_at": "2026-09-28T12:00:00Z",
  "modified_at": "2026-09-28T12:05:00Z",
  "author": {
    "name": "HealthTimes",
    "slug": "healthtimesco",
    "bio": "Example sanitized public author biography."
  },
  "section": {
    "name": "Health News",
    "slug": "health-news"
  },
  "access_policy": "premium",
  "body_html": null,
  "standfirst": "Sanitized Premium standfirst.",
  "excerpt": "Sanitized Premium excerpt."
}
```

Featured-media keys remain present according to the story-document schema and may be null if no eligible published featured media exists.

## 16. Migration authority

Accepted AG-06 residual-authority migration identities:

- `20260927040923_ag06_certification_active_binding_cleanup`
- `20260927091500_ag06_canonical_author_section_authority`
- `20260927093000_ag06_native_public_context`
- `20260927094500_ag06_inline_body_binding`
- `20260927101500_ag06_public_inline_media_promotion`
- `20260927110000_ag06_inline_public_storage_authority`
- `20260927113000_ag06_certification_author_binding_cleanup`
- `20260927120000_ag06_certification_cleanup_service_role_claim`
- `20260927121500_ag06_audit_feed_performance`
- `20260927123000_ag06_certification_active_binding_cleanup`

Audited lineage:

- `040923` is the adopted historical staging identity and is replay-safe/no-op in repository ordering.
- `123000` is the final executable forward reaffirmation.

Repository / HealthTimes Staging migration identity parity at acceptance:

`60 / 60`

No staging reset, migration repair, or ledger rewrite was used.

## 17. Accepted exact-head certification

Accepted runtime SHA:

`ed5e38a4201029c342617aa43f1dbd62161f5b97`

Green exact-head workflows:

- Migration Tests — run `36435156644`
- Validate Canonical Reader + Protected Operations — run `36435156707`
- Chromium UAT — run `36435156681`
- AG-07 Phase 4 Unified Web/PWA — run `36435156853`
- AG-06 Newsroom Security — run `36435156834`
- CA-01 Communications Security — run `36435156760`
- NM-07 Phase 6 Migrated Corpus Reader — run `36435156802`
- AG-05 + NM-07 Premium/HOSPAZ — run `36435156955`
- Native Mobile Foundation — run `36435156780`
- Native Binary Certification — run `36435156607`
- Phase 10 Candidate Visual Conformance — run `36435156796`, attempt 2
- Phase 10 Web/PWA Evidence — run `36435158120`

Native artifacts:

- `10975686452` — `healthtimes-native-config-matrix`
- `10976012969` — `healthtimes-android-debug-apk`
- `10976870045` — `healthtimes-ios-simulator-app`

Visual artifacts:

- `10976039376` — Web/PWA screenshots
- `10976835380` — Android screenshots
- `10977025956` — iOS screenshots

## 18. Final test-only certification correction

The accepted candidate includes one bounded test-contract correction:

`apps/mobile/tests/staging-connectivity.test.mjs`

at accepted runtime SHA:

`ed5e38a4201029c342617aa43f1dbd62161f5b97`

The correction:

- keeps direct anonymous `stories` access fail-closed;
- keeps public projection reachability required;
- validates bounded public response fields when rows exist;
- removes only the stale assumption that clean staging must contain at least one native public story.

Reader runtime behavior was not changed by this correction.

## 19. Vercel provenance

Accepted automatic Preview:

- project: `healthtimes-staging`
- deployment: `dpl_FBNAjNRup1LFTZ5eaUC4mKNea1ta`
- SHA: `ed5e38a4201029c342617aa43f1dbd62161f5b97`
- state: `READY`
- target: `null`

No production promotion occurred.

## 20. Freeze confirmation

This handoff does not authorize or perform:

- AG-06 runtime changes;
- SQL changes;
- migration changes;
- Newsroom API/UI changes;
- AG-05 changes;
- AG-04 changes;
- NM-04 implementation;
- `apps/mobile` runtime changes;
- production changes;
- PR merge;
- CP7;
- AG-08.

## 21. Residual consumer limitations

The accepted contract intentionally leaves these implementation responsibilities to NM-04:

1. combine AG-05 migrated and AG-06 native category context in the source-neutral Reader;
2. combine AG-05 migrated and AG-06 native author context;
3. render CMS-native inline body markers using the same story's safe inline manifest;
4. preserve Premium body/inline fail-closed behavior;
5. preserve migrated route precedence.

No additional AG-06 feature phase is released by this handoff.

## 22. Handoff disposition

`AG-06 AUTHORITY FROZEN — ACCEPTED NATIVE CATEGORY/AUTHOR CONTEXT + PUBLIC INLINE-MEDIA CONTRACT DOCUMENTED / NM-04 CONSUMER TARGETS HANDED TO MODERATOR / NO NEW AG-06 IMPLEMENTATION RELEASED`
