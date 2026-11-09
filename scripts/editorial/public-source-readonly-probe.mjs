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

export function assessPublishedPost(post,{ categoryTerms = [], tagTerms = [] } = {}) {
  if (!post || post.type !== "post" || post.status !== "publish") {
    return { decision: "SKIP_NOT_PUBLISHED_POST" };
  }
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
  return {
    decision: "PUBLIC_METADATA_CANDIDATE",
    article: {
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
    }
  };
}

async function lookupTaxonomy(type,postIds,fetchImpl) {
  const ids=[...new Set(postIds.filter((value)=>Number.isSafeInteger(value) && value>0))].slice(0,100);
  if(!ids.length) return [];
  const path=type==="category" ? "/wp-json/wp/v2/categories" : "/wp-json/wp/v2/tags";
  const url=new URL(path,WP_PUBLISHER);
  url.searchParams.set("include",ids.join(","));
  url.searchParams.set("per_page","100");
  url.searchParams.set("_fields","id,name,slug");
  try {
    const response=await fetchImpl(url.toString(),{
      method:"GET",headers:{Accept:"application/json"},credentials:"omit",
      signal:AbortSignal.timeout(10000)
    });
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

export async function probePublicPublisher({ fetchImpl = fetch, now = Date.now() } = {}) {
  const url = new URL("/wp-json/wp/v2/posts", WP_PUBLISHER);
  for (const [k,v] of Object.entries({
    per_page: "20", status: "publish", orderby: "date", order: "desc", _embed: "1",
    _fields: "id,type,status,date_gmt,modified_gmt,slug,link,title,categories,tags,_embedded"
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

  // WordPress may omit _embedded terms when _fields projections are used.
  // Resolve explicit category and tag IDs from the publisher's own public
  // taxonomy endpoints. Unresolved IDs remain BLOCKED, never assumed public.
  const categoryTerms=await lookupTaxonomy("category",posts.flatMap((p)=>p.categories??[]),fetchImpl);
  const tagTerms=await lookupTaxonomy("post_tag",posts.flatMap((p)=>p.tags??[]),fetchImpl);
  const counts = {};
  const safe = [];
  for (const post of posts) {
    const result = assessPublishedPost(post,{categoryTerms,tagTerms});
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
