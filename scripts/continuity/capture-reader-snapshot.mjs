// Read-only capture of what the Reader can see right now, for the freshness gate in
// content-continuity.mjs. Uses only the anonymous public RPCs the Reader itself calls
// (publishable key; no service role, no writes). Do not run against staging while the
// project is egress-restricted (HTTP 402): every call counts against the restriction.
//
// Usage:
//   SUPABASE_URL=... SUPABASE_PUBLISHABLE_KEY=... node capture-reader-snapshot.mjs > reader.json
// Then merge {"reader": ...} into a continuity snapshot whose "native" section comes from
// the Newsroom read-only query in the content-continuity runbook.

const base = process.env.SUPABASE_URL?.replace(/\/$/, "");
const key = process.env.SUPABASE_PUBLISHABLE_KEY;
if (!base || !key) { console.error("Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY"); process.exit(2); }
if (/service_role/i.test(key)) { console.error("Refusing a service-role key: this capture must see what anonymous readers see"); process.exit(2); }

async function rpc(name, args) {
  const response = await fetch(`${base}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(args)
  });
  if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
  return response.json();
}

const LIMIT = 200; // the feed RPC's own ceiling
const capturedAt = new Date().toISOString();
const migrated = await rpc("ag05_public_feed_documents", { p_limit: LIMIT, p_public_limit: 50, p_search: null });
const native = await rpc("newsroom_public_published_stories", { p_slug: null });
const slugOf = (path) => String(path ?? "").replace(/^\/+|\/+$/g, "").split("/").at(-1);
const items = [
  ...(Array.isArray(migrated) ? migrated : []).map((d) => ({ slug: slugOf(d.new_path ?? d.old_path), publishedAt: d.published_at, lane: "migrated" })),
  ...(Array.isArray(native) ? native : []).map((s) => ({ slug: s.slug, publishedAt: s.published_at, lane: "native" }))
].filter((i) => i.slug);
process.stdout.write(JSON.stringify({
  reader: { capturedAt, truncated: (Array.isArray(migrated) ? migrated.length : 0) >= LIMIT, items }
}, null, 2) + "\n");
