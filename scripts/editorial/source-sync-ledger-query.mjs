// Builds the read-only query that snapshots what the database knows about a set of
// WordPress posts. One SELECT, so it can run through psql or a read-only MCP
// connection. It reads identifiers and policy columns only, never source payloads.
const SAFE_SLUG = /^[a-z0-9_%-]+$/i;

export function buildLedgerQuery(posts, { windowStartAt = null } = {}) {
  if (!Array.isArray(posts) || !posts.length) throw new Error("NO_POSTS");
  const values = posts.map(({ postId, slug }) => {
    if (!Number.isSafeInteger(postId) || postId < 1) throw new Error("INVALID_POST_ID");
    if (typeof slug !== "string" || !SAFE_SLUG.test(slug)) throw new Error("INVALID_SLUG");
    return `(${postId}::bigint,'${slug}')`;
  }).join(",");
  if (windowStartAt !== null && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(windowStartAt)) {
    throw new Error("INVALID_WINDOW");
  }
  const windowRows = windowStartAt === null ? "" : `
  union
  select ls.id, ls.stable_key, ls.last_seen_at
  from public.legacy_sources ls
  join public.stories st on st.legacy_source_id = ls.id
  where ls.system = 'wordpress' and ls.source_type = 'post' and st.published_at >= '${windowStartAt}'::timestamptz`;
  return `with input(post_id, slug) as (values ${values}),
keyed as (select post_id, slug, 'wordpress:post:' || post_id as stable_key from input),
scope as (
  select ls.id, ls.stable_key, ls.last_seen_at
  from public.legacy_sources ls
  where ls.stable_key in (select stable_key from keyed)${windowRows}
),
matched as (
  select sc.stable_key, sc.id as legacy_source_id, sc.last_seen_at,
    st.id as story_id, st.slug as story_slug, st.status as story_status,
    st.access_policy as story_access_policy, st.lock_version as story_lock_version,
    st.modified_at as story_modified_at, st.published_at as story_published_at,
    (select count(*) from public.story_revisions r where r.story_id = st.id and r.editor_id is not null) as native_revision_count
  from scope sc
  left join public.stories st on st.legacy_source_id = sc.id
),
owners as (
  select st.slug, st.id as story_id, ls.stable_key
  from public.stories st
  left join public.legacy_sources ls on ls.id = st.legacy_source_id
  where st.slug in (select slug from input)
)
select jsonb_build_object(
  'schemaVersion', 1,
  'capturedAt', now(),
  'sources', coalesce((select jsonb_agg(jsonb_build_object(
    'stableKey', stable_key, 'legacySourceId', legacy_source_id, 'lastSeenAt', last_seen_at,
    'storyId', story_id, 'storySlug', story_slug, 'storyStatus', story_status,
    'storyAccessPolicy', story_access_policy, 'storyLockVersion', story_lock_version,
    'storyModifiedAt', story_modified_at, 'storyPublishedAt', story_published_at,
    'nativeRevisionCount', native_revision_count)) from matched), '[]'::jsonb),
  'slugOwners', coalesce((select jsonb_agg(jsonb_build_object(
    'slug', slug, 'storyId', story_id, 'stableKey', stable_key)) from owners), '[]'::jsonb)
)::text as ledger;`;
}
