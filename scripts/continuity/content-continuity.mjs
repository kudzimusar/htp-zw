// HT-MVP-PUBLIC-LAUNCH-01-G2G4G6-PARALLEL-CLOSE-01, Workstream A.
// Content-continuity verifier for the WordPress -> Newsroom OS transition.
//
// Pure data: it never connects to WordPress, Supabase or the Reader. Every input is a
// JSON snapshot captured separately (read-only), so the same verdict can be reproduced
// on fixtures, on the committed migration-output, or on a post-recovery staging capture.
//
// Usage: node scripts/continuity/content-continuity.mjs snapshot.json [--out report.json]
// Exit code 0 = every gate passes, 1 = at least one BLOCK finding, 2 = bad input.

import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export const FRESHNESS_SLA_SECONDS = 900; // same SLA as scripts/editorial/sync-cycle.mjs
export const CLASSES = Object.freeze({
  MIGRATED_HISTORICAL: "MIGRATED_HISTORICAL",       // in WordPress and migrated, unchanged since
  MIGRATED_OUTDATED: "MIGRATED_OUTDATED",           // migrated, but WordPress has a newer revision
  CURRENT_WP_NOT_MIGRATED: "CURRENT_WP_NOT_MIGRATED", // live in WordPress, absent from Newsroom
  WITHDRAWN_AT_SOURCE: "WITHDRAWN_AT_SOURCE",       // migrated, no longer published in WordPress
  NATIVE_NEWSROOM: "NATIVE_NEWSROOM"                // authored in Newsroom OS, no WordPress source
});

const ms = (value) => { const t = Date.parse(value ?? ""); return Number.isFinite(t) ? t : null; };
const utc = (value) => {
  if (!value) return null;
  // WordPress *_gmt fields and the normalized records carry no zone suffix; they are UTC.
  const text = String(value);
  return ms(/[zZ]|[+-]\d\d:?\d\d$/.test(text) ? text : text + "Z");
};
const normPath = (value) => {
  if (!value) return null;
  let p;
  try { p = new URL(value, "https://healthtimes.co.zw").pathname; } catch { return null; }
  p = p.replace(/\/{2,}/g, "/").toLowerCase();
  return p.endsWith("/") ? p : p + "/";
};
const titleKey = (title) => String(title ?? "")
  .replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ")
  .normalize("NFKD").replace(/[̀-ͯ]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function finding(list, severity, code, subject, detail = {}) {
  list.push({ severity, code, subject, ...detail });
}

// Accepts either normalized migration records (migration-output/normalized-records.json)
// or ledger rows ({ stableKey, storySlug, storyModifiedAt, ... }) and returns one shape.
export function normalizeMigrated(entry) {
  if (entry?.source && entry?.story) {
    return {
      stableKey: entry.source.stableKey,
      sourceType: entry.source.type,
      sourceId: String(entry.source.id),
      slug: entry.story.slug,
      legacyPath: normPath(entry.source.legacyPath ?? entry.source.sourceUrl),
      canonical: normPath(entry.story.seo?.canonical || entry.source.sourceUrl),
      canonicalUrl: entry.story.seo?.canonical || entry.source.sourceUrl || null,
      title: entry.story.title,
      publishedAt: utc(entry.story.publishedAt),
      modifiedAt: utc(entry.story.modifiedAt),
      authorId: entry.story.authorSourceId ?? null,
      categoryIds: entry.story.categorySourceIds ?? [],
      featuredMediaId: entry.story.featuredMediaSourceId ? String(entry.story.featuredMediaSourceId) : null,
      accessPolicy: entry.story.accessPolicy ?? "public"
    };
  }
  return {
    stableKey: entry.stableKey,
    sourceType: entry.sourceType ?? "post",
    sourceId: String(entry.stableKey ?? "").split(":").at(-1),
    slug: entry.storySlug ?? entry.slug,
    legacyPath: normPath(entry.legacyPath ?? `/${entry.storySlug ?? entry.slug}/`),
    canonical: normPath(entry.canonicalUrl ?? `/${entry.storySlug ?? entry.slug}/`),
    canonicalUrl: entry.canonicalUrl ?? null,
    title: entry.title ?? null,
    publishedAt: utc(entry.storyPublishedAt ?? entry.publishedAt),
    modifiedAt: utc(entry.storyModifiedAt ?? entry.modifiedAt),
    authorId: entry.authorSourceId ?? entry.authorId ?? null,
    categoryIds: entry.categoryIds ?? [],
    featuredMediaId: entry.featuredMediaId ? String(entry.featuredMediaId) : null,
    accessPolicy: entry.storyAccessPolicy ?? entry.accessPolicy ?? "public"
  };
}

export function verifyContinuity(snapshot) {
  if (!snapshot || typeof snapshot !== "object") throw new TypeError("snapshot must be an object");
  const capturedAt = ms(snapshot.capturedAt);
  if (capturedAt === null) throw new TypeError("snapshot.capturedAt is required");
  const findings = [];
  const wpPosts = snapshot.wordpress?.posts ?? [];
  const wpComplete = snapshot.wordpress?.complete === true;
  const migrated = (snapshot.migrated ?? []).map(normalizeMigrated);
  const native = snapshot.native ?? [];
  const media = new Map((snapshot.media ?? []).map((m) => [String(m.source?.id ?? m.id), m]));

  // ---- Inventory -------------------------------------------------------------------
  const wpByKey = new Map();
  for (const post of wpPosts) {
    const key = `wordpress:${post.type ?? "post"}:${post.postId ?? post.id}`;
    if (wpByKey.has(key)) finding(findings, "BLOCK", "DUPLICATE_SOURCE_IDENTITY", key);
    wpByKey.set(key, post);
  }
  const migratedByKey = new Map();
  for (const record of migrated) {
    if (!record.stableKey) { finding(findings, "BLOCK", "MISSING_STABLE_KEY", record.slug ?? "(unknown)"); continue; }
    if (migratedByKey.has(record.stableKey)) finding(findings, "BLOCK", "DUPLICATE_STABLE_KEY", record.stableKey);
    migratedByKey.set(record.stableKey, record);
  }

  const inventory = [];
  for (const record of migratedByKey.values()) {
    const post = wpByKey.get(record.stableKey);
    let cls;
    if (!post) {
      // Only a complete WordPress listing proves absence; a partial sample proves nothing.
      cls = wpComplete ? CLASSES.WITHDRAWN_AT_SOURCE : CLASSES.MIGRATED_HISTORICAL;
    } else {
      const wpModified = utc(post.modifiedAt ?? post.modified_gmt);
      cls = wpModified !== null && record.modifiedAt !== null && wpModified > record.modifiedAt
        ? CLASSES.MIGRATED_OUTDATED : CLASSES.MIGRATED_HISTORICAL;
    }
    inventory.push({ class: cls, stableKey: record.stableKey, slug: record.slug, verifiedAgainstSource: Boolean(post) });
    if (cls === CLASSES.MIGRATED_OUTDATED) finding(findings, "HOLD", "OUTDATED_MIGRATED_ARTICLE", record.stableKey, { slug: record.slug });
    if (cls === CLASSES.WITHDRAWN_AT_SOURCE) finding(findings, "REVIEW", "WITHDRAWN_AT_SOURCE", record.stableKey, { slug: record.slug });
  }
  for (const [key, post] of wpByKey) {
    if (migratedByKey.has(key)) continue;
    inventory.push({ class: CLASSES.CURRENT_WP_NOT_MIGRATED, stableKey: key, slug: post.slug, verifiedAgainstSource: true });
    finding(findings, "BLOCK", "MISSING_ARTICLE", key, { slug: post.slug, publishedAt: post.publishedAt ?? null });
  }
  for (const story of native) {
    inventory.push({ class: CLASSES.NATIVE_NEWSROOM, storyId: story.storyId, slug: story.slug, verifiedAgainstSource: true });
  }

  // Declared source totals that no listing covers are the most likely silent gap.
  const declaredPosts = snapshot.wordpress?.declaredTotals?.posts;
  const declaredPages = snapshot.wordpress?.declaredTotals?.pages ?? 0;
  const migratedPosts = migrated.filter((r) => r.sourceType === "post").length;
  const migratedPages = migrated.filter((r) => r.sourceType === "page").length;
  if (Number.isInteger(declaredPosts) && declaredPosts > migratedPosts) {
    finding(findings, "BLOCK", "SOURCE_COVERAGE_GAP", "wordpress:post", { declared: declaredPosts, migrated: migratedPosts, missing: declaredPosts - migratedPosts });
  }
  if (Number.isInteger(declaredPages) && declaredPages > migratedPages) {
    finding(findings, "REVIEW", "SOURCE_COVERAGE_GAP", "wordpress:page", { declared: declaredPages, migrated: migratedPages, missing: declaredPages - migratedPages });
  }

  // ---- Identity, slugs, canonical URLs, duplicates ----------------------------------
  const slugOwners = new Map();
  const claim = (slug, owner) => {
    if (!slug) return;
    const key = slug.toLowerCase();
    const prev = slugOwners.get(key);
    if (prev && prev !== owner) finding(findings, "BLOCK", "SLUG_COLLISION", key, { owners: [prev, owner] });
    else slugOwners.set(key, owner);
  };
  for (const r of migratedByKey.values()) claim(r.slug, r.stableKey);
  for (const s of native) claim(s.slug, `native:${s.storyId}`);

  const canonicalOwners = new Map();
  for (const r of migratedByKey.values()) {
    if (!r.canonical) { finding(findings, "BLOCK", "MISSING_CANONICAL_URL", r.stableKey); continue; }
    const host = (() => { try { return new URL(r.canonicalUrl ?? r.canonical, "https://healthtimes.co.zw").hostname.replace(/^www\./, ""); } catch { return null; } })();
    if (host !== "healthtimes.co.zw") finding(findings, "BLOCK", "FOREIGN_CANONICAL_URL", r.stableKey);
    const prev = canonicalOwners.get(r.canonical);
    if (prev && prev !== r.stableKey) finding(findings, "BLOCK", "CANONICAL_COLLISION", r.canonical, { owners: [prev, r.stableKey] });
    canonicalOwners.set(r.canonical, r.stableKey);
  }

  // A WordPress article re-keyed by hand into Newsroom: same headline, published within
  // 72 hours, different identity. Never auto-merged; an editor decides.
  const byTitle = new Map();
  const entries = [
    ...[...migratedByKey.values()].map((r) => ({ id: r.stableKey, title: r.title, at: r.publishedAt })),
    ...[...wpByKey.entries()].filter(([k]) => !migratedByKey.has(k)).map(([k, p]) => ({ id: k, title: p.title, at: utc(p.publishedAt) })),
    ...native.map((s) => ({ id: `native:${s.storyId}`, title: s.title, at: ms(s.publishedAt) }))
  ];
  for (const e of entries) {
    const key = titleKey(e.title);
    if (key.length < 12) continue;
    for (const other of byTitle.get(key) ?? []) {
      if (other.id !== e.id && (e.at === null || other.at === null || Math.abs(e.at - other.at) <= 72 * 3600e3)) {
        finding(findings, "HOLD", "DUPLICATE_SUSPECT", key.slice(0, 80), { ids: [other.id, e.id] });
      }
    }
    byTitle.set(key, [...(byTitle.get(key) ?? []), e]);
  }

  // ---- Metadata, attribution and media rights ----------------------------------------
  for (const r of migratedByKey.values()) {
    if (r.sourceType !== "post") continue; // pages carry no byline, category or date semantics
    if (!r.authorId) finding(findings, "HOLD", "MISSING_AUTHOR", r.stableKey);
    if (!r.categoryIds.length) finding(findings, "HOLD", "MISSING_CATEGORY", r.stableKey);
    if (r.publishedAt === null) finding(findings, "BLOCK", "MISSING_PUBLICATION_DATE", r.stableKey);
    else if (r.publishedAt > capturedAt) finding(findings, "REVIEW", "FUTURE_DATED_HISTORICAL", r.stableKey);
    if (!r.featuredMediaId) { finding(findings, "REVIEW", "NO_FEATURED_IMAGE", r.stableKey); continue; }
    const m = media.get(r.featuredMediaId);
    if (!m) { finding(findings, "HOLD", "FEATURED_MEDIA_NOT_INVENTORIED", r.stableKey, { mediaId: r.featuredMediaId }); continue; }
    const meta = m.media ?? m;
    if (!String(meta.altText ?? "").trim()) finding(findings, "REVIEW", "MEDIA_MISSING_ALT_TEXT", r.stableKey, { mediaId: r.featuredMediaId });
    // Rights are never inferred: a credit line or an explicit rights record is required.
    if (!String(meta.credit ?? "").trim() && !meta.rights) {
      finding(findings, "HOLD", "MEDIA_RIGHTS_UNRECORDED", r.stableKey, { mediaId: r.featuredMediaId });
    }
  }
  for (const s of native) {
    if (!s.authorName) finding(findings, "HOLD", "MISSING_AUTHOR", `native:${s.storyId}`);
    if (s.heroMedia && !s.heroMedia.credit && !s.heroMedia.rights) finding(findings, "HOLD", "MEDIA_RIGHTS_UNRECORDED", `native:${s.storyId}`);
  }

  // ---- Legacy redirect preservation --------------------------------------------------
  const redirects = snapshot.redirects ?? [];
  const covered = new Set();
  for (const rd of redirects) {
    const from = normPath(rd.sourcePath);
    const to = normPath(rd.targetPath);
    if (!from || !to) { finding(findings, "BLOCK", "INVALID_REDIRECT", String(rd.sourcePath)); continue; }
    // "/" -> "/" is the preserved WordPress front page; anything else landing on "/" is a
    // soft-404 catch-all, which AG-05 forbids (lib/ag05-capability.js routeDecision).
    if (to === "/" && from !== "/") finding(findings, "BLOCK", "HOMEPAGE_CATCHALL_REDIRECT", from);
    if (rd.sourceStableKey && !migratedByKey.has(rd.sourceStableKey)) finding(findings, "BLOCK", "REDIRECT_TO_UNMIGRATED_SOURCE", from, { stableKey: rd.sourceStableKey });
    covered.add(from);
  }
  for (const r of migratedByKey.values()) {
    if (r.legacyPath && !covered.has(r.legacyPath)) finding(findings, "BLOCK", "LEGACY_URL_NOT_PRESERVED", r.legacyPath, { stableKey: r.stableKey });
  }

  // ---- Publication freshness ----------------------------------------------------------
  const freshness = evaluateFreshness(snapshot, findings);

  const counts = Object.fromEntries(Object.values(CLASSES).map((c) => [c, 0]));
  for (const item of inventory) counts[item.class] += 1;
  const severities = { BLOCK: 0, HOLD: 0, REVIEW: 0 };
  const byCode = {};
  for (const f of findings) { severities[f.severity] += 1; byCode[f.code] = (byCode[f.code] ?? 0) + 1; }
  const has = (...codes) => findings.some((f) => f.severity === "BLOCK" && codes.includes(f.code));
  const gates = {
    inventoryComplete: !has("MISSING_ARTICLE", "SOURCE_COVERAGE_GAP", "MISSING_STABLE_KEY", "DUPLICATE_SOURCE_IDENTITY") && wpComplete,
    identityAndDuplicatesClear: !has("DUPLICATE_STABLE_KEY", "SLUG_COLLISION", "CANONICAL_COLLISION", "MISSING_CANONICAL_URL", "FOREIGN_CANONICAL_URL"),
    metadataComplete: !findings.some((f) => ["MISSING_AUTHOR", "MISSING_CATEGORY", "MISSING_PUBLICATION_DATE", "FEATURED_MEDIA_NOT_INVENTORIED", "MEDIA_RIGHTS_UNRECORDED"].includes(f.code)),
    redirectsPreserved: !has("INVALID_REDIRECT", "HOMEPAGE_CATCHALL_REDIRECT", "REDIRECT_TO_UNMIGRATED_SOURCE", "LEGACY_URL_NOT_PRESERVED"),
    freshness: freshness.verdict
  };
  return {
    schemaVersion: 1,
    capturedAt: new Date(capturedAt).toISOString(),
    wordpressListingComplete: wpComplete,
    counts,
    severities,
    byCode,
    gates,
    freshness,
    ready: severities.BLOCK === 0 && Object.values(gates).every((g) => g === true || g === "PASS"),
    inventory,
    findings
  };
}

// The Reader passes only if every approved, public, already-due item older than the SLA
// is visible, and nothing unapproved or embargoed is. "Due" uses the Reader capture time.
export function evaluateFreshness(snapshot, findings = []) {
  const reader = snapshot.reader;
  if (!reader || !Array.isArray(reader.items)) return { verdict: "NOT_RUN", reason: "no Reader capture in snapshot" };
  const readerAt = ms(reader.capturedAt);
  if (readerAt === null) return { verdict: "NOT_RUN", reason: "Reader capture has no capturedAt" };
  const sla = (snapshot.freshnessSlaSeconds ?? FRESHNESS_SLA_SECONDS) * 1000;
  const visible = new Set(reader.items.map((i) => String(i.slug).toLowerCase()));
  const oldestVisible = Math.min(...reader.items.map((i) => ms(i.publishedAt)).filter((t) => t !== null));
  const windowStart = reader.truncated ? oldestVisible : -Infinity;

  const approved = [
    ...(snapshot.native ?? []).map((s) => ({ id: `native:${s.storyId}`, slug: s.slug, at: ms(s.publishedAt), approved: s.status === "published" && s.approved === true, policy: s.accessPolicy ?? "public", lane: "native" })),
    ...(snapshot.wordpress?.posts ?? []).filter((p) => p.classifiedPublic === true).map((p) => ({ id: `wordpress:post:${p.postId}`, slug: p.slug, at: utc(p.publishedAt), approved: true, policy: "public", lane: "wordpress" }))
  ];
  let checked = 0; let missing = 0; let newestApproved = null;
  for (const item of approved) {
    const slug = String(item.slug).toLowerCase();
    const due = item.at !== null && item.at <= readerAt;
    if (!item.approved || !due) {
      if (visible.has(slug)) {
        finding(findings, "BLOCK", item.approved ? "EMBARGO_LEAK" : "UNAPPROVED_IN_READER", item.id, { slug });
      }
      continue;
    }
    if (item.policy !== "public" && item.policy !== "premium") continue;
    if (newestApproved === null || item.at > newestApproved.at) newestApproved = item;
    if (readerAt - item.at < sla || item.at < windowStart) continue;
    checked += 1;
    if (!visible.has(slug)) { missing += 1; finding(findings, "BLOCK", "APPROVED_CONTENT_NOT_IN_READER", item.id, { slug, lane: item.lane, ageSeconds: Math.round((readerAt - item.at) / 1000) }); }
  }
  const newestVisibleAt = Math.max(...reader.items.map((i) => ms(i.publishedAt)).filter((t) => t !== null));
  const failed = findings.some((f) => ["EMBARGO_LEAK", "UNAPPROVED_IN_READER", "APPROVED_CONTENT_NOT_IN_READER"].includes(f.code));
  if (!checked && !failed) {
    return { verdict: "NOT_RUN", reason: "no approved item is older than the SLA inside the Reader window", slaSeconds: sla / 1000 };
  }
  return {
    verdict: failed ? "FAIL" : "PASS",
    slaSeconds: sla / 1000,
    approvedDueChecked: checked,
    missing,
    newestApproved: newestApproved && { id: newestApproved.id, publishedAt: new Date(newestApproved.at).toISOString() },
    newestVisibleAt: Number.isFinite(newestVisibleAt) ? new Date(newestVisibleAt).toISOString() : null
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [file, flag, out] = process.argv.slice(2);
  if (!file) { console.error("usage: content-continuity.mjs snapshot.json [--out report.json]"); process.exit(2); }
  let report;
  try { report = verifyContinuity(JSON.parse(await readFile(file, "utf8"))); }
  catch (error) { console.error(String(error.message ?? error)); process.exit(2); }
  if (flag === "--out" && out) await writeFile(out, JSON.stringify(report, null, 2) + "\n");
  const { inventory, findings, ...summary } = report;
  console.log(JSON.stringify(summary, null, 2));
  process.exit(report.severities.BLOCK ? 1 : 0);
}
