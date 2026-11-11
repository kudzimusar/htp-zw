// Read-only public publisher diagnostics. This is NOT an authorization to ingest,
// republish, expose Premium bodies, or mutate the HealthTimes staging database.
import { publicPlainText, safeMediaUrl, sanitizePublicHtml } from "./public-html-sanitizer.mjs";

const WP_PUBLISHER = "https://healthtimes.co.zw";
const restrictedTerms = /(?:^|[\s-])(?:premium|members?-only|subscription|restricted)(?:$|[\s-])/i;
const METADATA_FIELDS = "id,type,status,date_gmt,modified_gmt,slug,link,title,categories,tags,_embedded";
// WordPress keeps _embedded in a _fields projection only when _links is requested too.
const BODY_FIELDS = METADATA_FIELDS + ",_links,author,content,excerpt,featured_media";
const SYNC_WINDOW_SIZE = 100;

export function utcPublicationDate(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = value.trim();
  const parsed = Date.parse(/[zZ]$|[+-]\d\d:\d\d$/.test(date) ? date : date + "Z");
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function featuredMedia(post) {
  const media = post._embedded?.["wp:featuredmedia"]?.[0];
  const sourceUrl = safeMediaUrl(media?.source_url);
  if (!sourceUrl) return null;
  const caption = publicPlainText(media.caption?.rendered);
  return { sourceUrl, altText: publicPlainText(media.alt_text) || caption, caption };
}

function termsFor(post) {
  return (post._embedded?.["wp:term"] ?? []).flat().filter(Boolean);
}

export function assessPublishedPost(post,{ categoryTerms = [], tagTerms = [], includeBody = false } = {}) {
  if (!post || post.type !== "post" || post.status !== "publish") {
    return { decision: "SKIP_NOT_PUBLISHED_POST" };
  }
  if (includeBody && post.content?.protected === true) return { decision: "BLOCK_PASSWORD_PROTECTED" };
  if (!Number.isSafeInteger(post.id) || post.id < 1 || !post.slug || typeof post.slug !== "string") {
    return { decision: "BLOCK_UNVERIFIED_IDENTITY" };
  }
  const terms = [...termsFor(post),...categoryTerms,...tagTerms];
  const categoryIds = Array.isArray(post.categories) ? post.categories : [];
  const tagIds = Array.isArray(post.tags) ? post.tags : [];
  // A public WP endpoint is not proof of Premium entitlement. Reject entries
  // whose term classification is absent, incomplete, or explicitly restricted.
  if (!terms.length || !categoryIds.length ||
      !categoryIds.every((id) => terms.some((term) => term.taxonomy === "category" && term.id === id)) ||
      !tagIds.every((id) => terms.some((term) => term.taxonomy === "post_tag" && term.id === id))) {
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
  const article = {
    postId: post.id,
    slug: post.slug,
    canonicalUrl: canonical,
    publishedAt,
    modifiedAt,
    title: String(post.title?.rendered ?? "").replace(/<[^>]+>/g," ").slice(0,200),
    categoryIds: categoryIds.slice(0,20),
    publicTerms: terms.filter((term,index,array)=>
      (term.taxonomy==="category" && categoryIds.includes(term.id) ||
        term.taxonomy==="post_tag" && tagIds.includes(term.id)) &&
      array.findIndex((candidate)=>candidate.taxonomy===term.taxonomy && candidate.id===term.id)===index
    ).map((term)=>({
      id:term.id,
      taxonomy:term.taxonomy,
      slug:String(term.slug??"").slice(0,120),
      name:String(term.name??"").slice(0,120)
    }))
  };
  if (includeBody) {
    // Sanitized content only. Whether it may be published is an editorial decision.
    article.contentBody = sanitizePublicHtml(post.content?.rendered ?? "", { baseUrl: canonical });
    article.excerpt = publicPlainText(post.excerpt?.rendered);
    article.heroMedia = featuredMedia(post);
    article.authorName = publicPlainText(post._embedded?.author?.[0]?.name).slice(0,120) || null;
    article.authorSourceId = Number.isSafeInteger(post.author) && post.author > 0 ? String(post.author) : null;
  }
  return {
    decision: "PUBLIC_METADATA_CANDIDATE",
    article
  };
}

async function fetchPublisher(route, params, fetchImpl) {
  // A redirect could hand back content from another host, so it is an error.
  const request = (url) => fetchImpl(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "omit",
    redirect: "error",
    signal: AbortSignal.timeout(10000)
  });
  const primary = new URL("/wp-json" + route, WP_PUBLISHER);
  for (const [key, value] of Object.entries(params)) primary.searchParams.set(key, value);
  const response = await request(primary);
  if (response.status !== 404) return response;
  // LiteSpeed hosts can 404 pretty REST paths; the query-string route is equivalent.
  const fallback = new URL("/", WP_PUBLISHER);
  fallback.searchParams.set("rest_route", route);
  for (const [key, value] of Object.entries(params)) fallback.searchParams.set(key, value);
  return request(fallback);
}

async function lookupTaxonomy(type,postIds,fetchImpl) {
  const ids=[...new Set(postIds.filter((value)=>Number.isSafeInteger(value) && value>0))].slice(0,100);
  if(!ids.length) return [];
  try {
    const response=await fetchPublisher(type==="category" ? "/wp/v2/categories" : "/wp/v2/tags",{
      include:ids.join(","),per_page:"100",_fields:"id,name,slug"
    },fetchImpl);
    if(!response.ok) return [];
    const entries=await response.json();
    if(!Array.isArray(entries)) return [];
    return entries.filter((term)=>Number.isSafeInteger(term.id) && ids.includes(term.id) &&
      typeof term.name==="string" && typeof term.slug==="string"
    ).map((term)=>({...term,taxonomy:type}));
  } catch {
    return [];
  }
}

export async function probePublicPublisher({ fetchImpl = fetch, now = Date.now(), includeBody = false, since = null } = {}) {
  // A sync window reads oldest-modified-first after the watermark, so a backlog
  // larger than one page drains across runs instead of being skipped.
  const perPage = since ? SYNC_WINDOW_SIZE : 20;
  const params = {
    per_page: String(perPage), status: "publish",
    orderby: since ? "modified" : "date", order: since ? "asc" : "desc",
    _embed: "1", _fields: includeBody ? BODY_FIELDS : METADATA_FIELDS
  };
  if (since) params.modified_after = since;
  let response;
  try {
    response = await fetchPublisher("/wp/v2/posts", params, fetchImpl);
  } catch (error) {
    return { status: "BLOCKED_SOURCE_NETWORK", message: String(error?.message ?? error).slice(0,180) };
  }
  if (!response.ok) return { status: "BLOCKED_SOURCE_HTTP", httpStatus: response.status };
  let posts;
  try { posts = await response.json(); }
  catch { return { status: "BLOCKED_SOURCE_INVALID_JSON", httpStatus: response.status }; }
  if (!Array.isArray(posts)) return { status: "BLOCKED_SOURCE_INVALID_SCHEMA", httpStatus: response.status };

  // WordPress may omit _embedded terms when _fields projections are used.
  // Resolve explicit category and tag IDs from the publisher's own public
  // taxonomy endpoints. Unresolved IDs remain BLOCKED, never assumed public.
  const categoryTerms=await lookupTaxonomy("category",posts.flatMap((p)=>p.categories??[]),fetchImpl);
  const tagTerms=await lookupTaxonomy("post_tag",posts.flatMap((p)=>p.tags??[]),fetchImpl);
  const counts = {};
  const safe = [];
  for (const post of posts) {
    const result = assessPublishedPost(post,{categoryTerms,tagTerms,includeBody});
    counts[result.decision] = (counts[result.decision] ?? 0) + 1;
    if (result.decision === "PUBLIC_METADATA_CANDIDATE") safe.push(result.article);
  }
  safe.sort((a,b) => Date.parse(b.publishedAt)-Date.parse(a.publishedAt) || a.postId-b.postId);
  const newest = safe[0]?.publishedAt ?? null;
  const latestAgeMs = newest ? now-Date.parse(newest) : Infinity;
  const modifiedTimes = posts.map((post) => utcPublicationDate(post.modified_gmt)).filter(Boolean).sort();
  return {
    status: safe.length ? "PROBE_SUCCEEDED_NOT_AUTHORIZED_AS_FEED" : "BLOCKED_NO_VERIFIABLE_PUBLIC_POST",
    retrieved: posts.length,
    retrievedPostIds: posts.map((post) => post.id),
    windowComplete: posts.length < perPage,
    latestModifiedRetrievedAt: modifiedTimes[modifiedTimes.length-1] ?? null,
    decisions: counts,
    latestPublicCandidateAt: newest,
    latestWithin7Days: latestAgeMs >= 0 && latestAgeMs <= 7*24*60*60*1000,
    latestTwentyMetadata: safe.slice(0,20),
    candidates: safe,
    // A successful diagnostic does not prove full bodies, ongoing sync, or Premium secrecy.
    ingestionVerified: false,
    readerFreshnessVerified: false,
    fullBodyPublicationVerified: false
  };
}
