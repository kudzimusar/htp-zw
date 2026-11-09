// Read-only public publisher diagnostics. This is NOT an authorization to ingest,
// republish, expose Premium bodies, or mutate the HealthTimes staging database.
const WP_PUBLISHER = "https://healthtimes.co.zw";
const restrictedTerms = /(?:^|[\s-])(?:premium|members?-only|subscription|restricted)(?:$|[\s-])/i;

export function utcPublicationDate(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = value.trim();
  const parsed = Date.parse(/[zZ]$|[+-]\d\d:\d\d$/.test(date) ? date : date + "Z");
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function termsFor(post) {
  return (post._embedded?.["wp:term"] ?? []).flat().filter(Boolean);
}

export function assessPublishedPost(post) {
  if (!post || post.type !== "post" || post.status !== "publish") {
    return { decision: "SKIP_NOT_PUBLISHED_POST" };
  }
  if (!Number.isSafeInteger(post.id) || post.id < 1 || !post.slug || typeof post.slug !== "string") {
    return { decision: "BLOCK_UNVERIFIED_IDENTITY" };
  }
  const terms = termsFor(post);
  const categoryIds = Array.isArray(post.categories) ? post.categories : [];
  // A public WP endpoint is not proof of Premium entitlement. Reject entries
  // whose term classification is absent, incomplete, or explicitly restricted.
  if (!terms.length || !categoryIds.length ||
      !categoryIds.every((id) => terms.some((term) => term.taxonomy === "category" && term.id === id))) {
    return { decision: "BLOCK_UNRESOLVED_CLASSIFICATION" };
  }
  if (terms.some((term) => restrictedTerms.test(String(term.name ?? "") + " " + String(term.slug ?? "")))) {
    return { decision: "BLOCK_RESTRICTED_CONTENT" };
  }
  const publishedAt = utcPublicationDate(post.date_gmt);
  const modifiedAt = utcPublicationDate(post.modified_gmt);
  if (!publishedAt) return { decision: "BLOCK_UNVERIFIED_PUBLICATION_DATE" };
  const canonical = typeof post.link === "string" ? post.link : "";
  try {
    if (!["healthtimes.co.zw", "www.healthtimes.co.zw"].includes(new URL(canonical).hostname)) {
      return { decision: "BLOCK_UNVERIFIED_CANONICAL_URL" };
    }
  } catch {
    return { decision: "BLOCK_UNVERIFIED_CANONICAL_URL" };
  }
  return {
    decision: "PUBLIC_METADATA_CANDIDATE",
    article: {
      postId: post.id,
      slug: post.slug,
      canonicalUrl: canonical,
      publishedAt,
      modifiedAt,
      title: String(post.title?.rendered ?? "").replace(/<[^>]+>/g," ").slice(0,200),
      categoryIds: categoryIds.slice(0,20)
    }
  };
}

export async function probePublicPublisher({ fetchImpl = fetch, now = Date.now() } = {}) {
  const url = new URL("/wp-json/wp/v2/posts", WP_PUBLISHER);
  for (const [k,v] of Object.entries({
    per_page: "20", status: "publish", orderby: "date", order: "desc", _embed: "1",
    _fields: "id,type,status,date_gmt,modified_gmt,slug,link,title,categories,_embedded"
  })) url.searchParams.set(k,v);
  let response;
  try {
    response = await fetchImpl(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "omit",
      signal: AbortSignal.timeout(10000)
    });
  } catch (error) {
    return { status: "BLOCKED_SOURCE_NETWORK", message: String(error?.message ?? error).slice(0,180) };
  }
  if (!response.ok) return { status: "BLOCKED_SOURCE_HTTP", httpStatus: response.status };
  let posts;
  try { posts = await response.json(); }
  catch { return { status: "BLOCKED_SOURCE_INVALID_JSON", httpStatus: response.status }; }
  if (!Array.isArray(posts)) return { status: "BLOCKED_SOURCE_INVALID_SCHEMA", httpStatus: response.status };

  const counts = {};
  const safe = [];
  for (const post of posts) {
    const result = assessPublishedPost(post);
    counts[result.decision] = (counts[result.decision] ?? 0) + 1;
    if (result.decision === "PUBLIC_METADATA_CANDIDATE") safe.push(result.article);
  }
  safe.sort((a,b) => Date.parse(b.publishedAt)-Date.parse(a.publishedAt) || a.postId-b.postId);
  const newest = safe[0]?.publishedAt ?? null;
  const latestAgeMs = newest ? now-Date.parse(newest) : Infinity;
  return {
    status: safe.length ? "PROBE_SUCCEEDED_NOT_AUTHORIZED_AS_FEED" : "BLOCKED_NO_VERIFIABLE_PUBLIC_POST",
    retrieved: posts.length,
    decisions: counts,
    latestPublicCandidateAt: newest,
    latestWithin7Days: latestAgeMs >= 0 && latestAgeMs <= 7*24*60*60*1000,
    latestTwentyMetadata: safe.slice(0,20),
    // A successful diagnostic does not prove full bodies, ongoing sync, or Premium secrecy.
    ingestionVerified: false,
    readerFreshnessVerified: false,
    fullBodyPublicationVerified: false
  };
}
