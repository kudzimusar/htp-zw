const STORAGE_PREFIX = '/storage/v1/object/public/migrated-media/';
const MIGRATED_SOURCE_ORIGIN = 'https://bzuvntbkevvuhfhqhkua.supabase.co';

export function rewriteVerifiedMigratedMediaUrl(value: string): string {
  if (!value.startsWith(MIGRATED_SOURCE_ORIGIN + STORAGE_PREFIX)) return value;
  const configured = process.env.EXPO_PUBLIC_HEALTHTIMES_MEDIA_BASE_URL?.trim();
  if (!configured) return value;
  try {
    const base = new URL(configured);
    if (base.protocol === 'https:' && base.pathname === '/' && !base.username && !base.password && !base.search && !base.hash) {
      return base.origin + '/' + value.slice((MIGRATED_SOURCE_ORIGIN + STORAGE_PREFIX).length);
    }
  } catch {}
  return value;
}

export function migratedMediaUrl(supabaseUrl: string, objectName: string | null | undefined): string | null {
  if (!supabaseUrl || !objectName) return null;
  const encoded = String(objectName).split('/').map(encodeURIComponent).join('/');
  const configured = process.env.EXPO_PUBLIC_HEALTHTIMES_MEDIA_BASE_URL?.trim();
  if (configured) {
    try {
      const base = new URL(configured);
      if (base.protocol === 'https:' && base.pathname === '/' && !base.username && !base.password && !base.search && !base.hash) {
        return base.origin + '/' + encoded;
      }
    } catch {}
  }
  return supabaseUrl.replace(/\/$/, '') + STORAGE_PREFIX + encoded;
}

export function mapMigratedInlineMedia(html: string | null, supabaseUrl: string): string | null {
  if (!html) return html;
  const configured = process.env.EXPO_PUBLIC_HEALTHTIMES_MEDIA_BASE_URL?.trim();
  if (!configured || !supabaseUrl) return html;
  let target: URL;
  let source: URL;
  try {
    target = new URL(configured);
    source = new URL(supabaseUrl);
  } catch { return html; }
  if (target.protocol !== 'https:' || target.pathname !== '/' || target.username || target.password || target.search || target.hash) return html;
  const prefix = source.origin + STORAGE_PREFIX;
  return html.split(prefix).join(target.origin + '/');
}
