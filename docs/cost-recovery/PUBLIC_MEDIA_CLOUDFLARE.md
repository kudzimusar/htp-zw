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
