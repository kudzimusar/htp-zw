# Media Migration

## Policy

Permanent production content must not depend on hotlinking `healthtimes.co.zw/wp-content/uploads`. All editorial and advertiser media must be copied to controlled object storage/CDN.

## Destination

Recommended default: Supabase Storage behind Cloudflare/Vercel CDN. S3-compatible storage is also acceptable if the client already has a preferred provider.

## Manifest

The importer writes `media-manifest.json` with:

- WordPress attachment ID.
- Source URL.
- Filename.
- MIME type.
- Alt text.
- Caption.
- Credit.
- Dimensions.
- Checksum once downloaded.
- Destination bucket/key/public URL once migrated.
- Status and exception notes.

## Process

1. Discover attachments through REST, WXR and direct database export.
2. Detect inline images in post content.
3. Download to staging cache with rate limits and retries.
4. Calculate checksums.
5. Upload to destination storage.
6. Rewrite story HTML/structured body to destination URLs.
7. Verify image dimensions, broken media, captions and alt text.
8. Preserve advertiser creatives separately from editorial media.

## Exceptions

Flag missing files, hotlinked third-party images, empty alt text, unsupported file types, galleries, shortcodes, documents, videos and oversized assets.
