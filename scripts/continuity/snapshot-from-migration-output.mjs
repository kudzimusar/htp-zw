// Builds a continuity snapshot from a migration-output directory (offline, read-only).
// The WordPress listing in migration-output is a sample, so the snapshot is marked
// incomplete; the declared REST totals still expose the coverage gap.
//
// Usage: node snapshot-from-migration-output.mjs <migration-output dir> [capturedAt] > snapshot.json
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const dir = process.argv[2];
if (!dir) { console.error("usage: snapshot-from-migration-output.mjs <dir> [capturedAt]"); process.exit(2); }
const load = async (name) => JSON.parse(await readFile(join(dir, name), "utf8"));
const inventory = await load("wordpress-public-inventory.json");
const snapshot = {
  capturedAt: process.argv[3] ?? inventory.generatedAt,
  wordpress: {
    complete: false,
    declaredTotals: { posts: inventory.totals?.posts, pages: inventory.totals?.pages },
    posts: (inventory.samples?.posts ?? []).map((p) => ({
      postId: p.id, type: p.type, slug: p.slug, title: p.title?.rendered,
      publishedAt: p.date_gmt, modifiedAt: p.modified_gmt
    }))
  },
  migrated: await load("normalized-records.json"),
  media: await load("media-manifest.json"),
  redirects: await load("redirect-manifest.json"),
  native: []
};
process.stdout.write(JSON.stringify(snapshot));
