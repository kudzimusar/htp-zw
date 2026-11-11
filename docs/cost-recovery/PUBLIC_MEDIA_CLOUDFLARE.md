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

## 11 November 2026 preview evidence

- Supabase project `bzuvntbkevvuhfhqhkua` remained `ACTIVE_HEALTHY`. The source bucket held 2,317 public archived files totaling 675,592,991 bytes; the largest was 6,917,615 bytes. All source MD5 checks matched downloaded bytes. The [checksum manifest](media-manifest-2026-11-11.json) records each path, MD5, and SHA-256; the manifest SHA-256 is `3dd139093a9e6d70fe324ab47af6c08a0a3313915604614f3f09c5f0c1092326`.
- One published `newsroom-public` JPG of 38,566 bytes was mirrored separately. Total preview deployment: 2,318 files, 675,631,557 bytes. Supabase source counts remained unchanged after the mirror.
- Full preview deployment: `https://de5c18d0.healthtimes-media.pages.dev`, alias `https://media-preview.healthtimes-media.pages.dev`. The stable production hostname is intentionally not deployed.
- JPG, PNG, a 496,500-byte PDF, a 6,917,615-byte PDF, and the newsroom JPG each returned HTTP 200 with expected MIME type and matching SHA-256 against source bytes. A private path and a nonexistent archived path both returned HTTP 404.
- Mobile TypeScript and 28 focused tests passed. A branch-scoped Vercel preview setting selects the Cloudflare preview hostname; production settings remain unchanged.

This evidence proves the static mirror and URL mapping. Browser UAT for desktop/mobile Reader and Owner/Editor publishing remains a separate gate. Current new newsroom uploads still go through the existing Supabase private-to-public promotion path and continue to use Supabase public URLs; a safe automatic replication mechanism is not yet implemented. This limitation must be resolved before claiming full future-media egress diversion.
