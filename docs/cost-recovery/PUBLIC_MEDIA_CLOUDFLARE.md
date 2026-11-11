# Public media mirror for HealthTimes Free

Cloudflare Pages project: `healthtimes-media` in the existing `kudzimusar@gmail.com` account. The production hostname is `https://healthtimes-media.pages.dev`; the preview alias is `https://media-preview.healthtimes-media.pages.dev`. The Pages project has no Functions or Workers runtime.

Cloudflare's [documented Free limits](https://developers.cloudflare.com/pages/platform/limits/) are 20,000 files, 25 MiB per file, 500 builds per month, and one concurrent build. [Static asset requests](https://developers.cloudflare.com/pages/functions/pricing/) are free and unlimited; Pages Functions would use Workers quota, so none are deployed here. [Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/) via Wrangler supports 20,000 files; the browser drag-and-drop path supports only 1,000. This Direct Upload project can later be deployed from CI with Wrangler, but cannot be converted to Git integration in place.

## Scope and custody

Mirror only rows in `storage.objects` whose `bucket_id = 'migrated-media'` and whose bucket is public. The one currently published `newsroom-public` object can be mirrored under `newsroom-public/` for completeness, but its URL remains on Supabase. Keep all Supabase originals. Never include `newsroom-private`, `newsroom-communications-private`, or `communications-private` in the deploy directory. `newsroom-public` is a separate publishing pipeline and remains on Supabase until a verified new-media replication workflow is approved. The URL switch is limited to the immutable migrated archive.

Export a fresh inventory as a JSON array of `{name,size,mime,md5}` from this read-only query, saving it outside the repository:

```sql
select name, (metadata->>'size')::bigint as size,
       metadata->>'mimetype' as mime,
       trim(both '"' from metadata->>'eTag') as md5
from storage.objects
where bucket_id = 'migrated-media'
order by name;
```

Then run:

```sh
SUPABASE_URL=https://bzuvntbkevvuhfhqhkua.supabase.co node scripts/media/mirror-public-media.mjs /path/to/public-assets /path/to/inventory.json
npx wrangler pages deploy /path/to/public-assets --project-name healthtimes-media --branch media-preview
```

The script refuses path traversal, checks each downloaded object's length and MD5 against Supabase metadata, computes SHA-256, and writes `media-manifest.json` alongside the output directory. Re-running resumes existing files only when their source checksum matches. Compare the completed object count and bytes with a fresh SQL aggregate before deployment. Spot-check bytes and MIME types on the Pages preview URL, including JPG, PNG, PDF, and a missing/private path. The archive requires a full static deployment for additions or replacements; batch changes to stay inside Pages' deployment quota. Do not remove old objects without checking all references. If a deployment fails, the previous Pages deployment remains available.

## Preview and cutover

Set `EXPO_PUBLIC_HEALTHTIMES_MEDIA_BASE_URL=https://media-preview.healthtimes-media.pages.dev` only in an isolated Reader preview build. Set `HEALTHTIMES_MEDIA_BASE_URL` to the same URL only in an isolated API preview. The default unset value keeps Supabase URLs. This maps archived featured images, direct-ad creatives, and absolute inline archive URLs. It does not alter database records, storage adapters, draft uploads, auth, or newsroom private assets. For production, use the canonical `https://healthtimes-media.pages.dev` only after approval and full mirror verification; rollback by removing the two settings and redeploying the prior app build.

The October 23–November 23 Supabase cached-egress total does not reset when media is moved. Confirm the project remains reachable and review the next cycle's usage after cutover.

## New newsroom media

Published newsroom images are first promoted by the existing secure Supabase private-to-public workflow. Keep that path intact so publication is immediately visible and drafts remain private. The read-only `sync-published-newsroom.mjs` command calls only existing anonymous public Reader RPCs, selects media referenced by released public stories, downloads those public objects, and verifies featured SHA-256 when supplied. It writes a small allowlist for the Reader. The Reader uses Cloudflare only for keys in that verified allowlist; a newly published or replaced key stays on its working Supabase URL until the next sync and Reader deployment. Old objects are retained while references may exist; deletion requires a separate review.

The current verified local cache is `/Users/shadreckmusarurwa/Project AI/healthtimes-media-cache` (2,318 files). For a new publishing batch, run the sync with the current public Supabase publishable key in `SUPABASE_PUBLISHABLE_KEY`, then deploy the **entire** cache to the preview Pages branch with Wrangler, verify its hashes and URLs, review the generated allowlist diff, and deploy the Reader preview. Batch at most daily to stay below 500 Pages builds per month. No Supabase service-role key, schema change, RLS change, or new Cloudflare paid service is required. The owner must approve any production deployment or publishing URL switch separately.

```sh
SUPABASE_URL=https://bzuvntbkevvuhfhqhkua.supabase.co \
SUPABASE_PUBLISHABLE_KEY=... \
node scripts/media/sync-published-newsroom.mjs \
  '/Users/shadreckmusarurwa/Project AI/healthtimes-media-cache' \
  apps/mobile/src/services/newsroom-mirrored-keys.ts

npx wrangler pages deploy \
  '/Users/shadreckmusarurwa/Project AI/healthtimes-media-cache' \
  --project-name healthtimes-media --branch media-preview
```

## 11 November 2026 preview evidence

- Supabase project `bzuvntbkevvuhfhqhkua` remained `ACTIVE_HEALTHY`. The source bucket held 2,317 public archived files totaling 675,592,991 bytes; the largest was 6,917,615 bytes. All source MD5 checks matched downloaded bytes. The [compressed checksum manifest](media-manifest-2026-11-11.json.gz) records each path, MD5, and SHA-256; the decompressed manifest SHA-256 is `3dd139093a9e6d70fe324ab47af6c08a0a3313915604614f3f09c5f0c1092326` and the compressed file SHA-256 is `e9b116f030188ade312ee88b8ed8cccf261939a02b867628992bfdeefcdd5491`.
- One published `newsroom-public` JPG of 38,566 bytes was mirrored separately. Total preview deployment: 2,318 files, 675,631,557 bytes. Supabase source counts remained unchanged after the mirror.
- The published-only newsroom sync read five released public stories and selected exactly one referenced public object. Its hash matched the content-addressed path and the existing Pages copy. Draft and private objects were excluded from the generated Reader allowlist.
- Full preview deployment: `https://de5c18d0.healthtimes-media.pages.dev`, alias `https://media-preview.healthtimes-media.pages.dev`.
- With Owner approval, the identical 2,318-file set was deployed to the canonical `https://healthtimes-media.pages.dev` hostname as deployment `https://93cbe0a2.healthtimes-media.pages.dev`. Wrangler reused all 2,318 previously uploaded files. Canonical-host verification repeated the JPG, PNG, two PDFs, and published newsroom JPG: HTTP 200, expected MIME, SHA-256 identical to the local source. Private and missing paths returned HTTP 404. This publication did not switch any HealthTimes app or DNS URL.
- JPG, PNG, a 496,500-byte PDF, a 6,917,615-byte PDF, and the newsroom JPG each returned HTTP 200 with expected MIME type and matching SHA-256 against source bytes. A private path and a nonexistent archived path both returned HTTP 404.
- Mobile TypeScript and focused tests passed. The local Expo web export loaded the live staging feed with a preview-only Cloudflare setting. Desktop Home cards and article hero images used `media-preview.healthtimes-media.pages.dev` and loaded at native resolution; the 390px mobile article view showed the same Cloudflare hero. A hard-coded source-parity image map was found during this browser check and updated to honor the preview setting. A branch-scoped Vercel preview setting also selects the Cloudflare hostname; production settings remain unchanged. The automatic Vercel `dist` preview is a legacy static site and is not evidence for the current Expo Reader.

This evidence proves the static mirror and archived-media URL mapping in the local Reader preview. Owner/Editor publishing and new-media replacement/deletion UAT remain a separate gate. New newsroom uploads still appear first on Supabase, then can move to Cloudflare after a verified batch and Reader redeployment. This is an operator-run workflow; automatic replication is not implemented. Future media can consume Supabase egress between batches, so a production operating schedule and Owner approval are required before claiming full future-media egress diversion.
