import * as Linking from "expo-linking";
import type { ArticleSummary } from "../domain/models";

export type ShareChannel =
  | "system"
  | "whatsapp"
  | "facebook"
  | "x"
  | "linkedin"
  | "email"
  | "copy";

const allowedHosts = new Set(["healthtimes.co.zw", "www.healthtimes.co.zw"]);
const articleIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const articleSlugPattern = /^[a-z0-9][a-z0-9-]{0,199}$/i;
const reservedWebPaths = new Set([
  "about",
  "contact",
  "premium",
  "search",
  "author",
  "authors",
  "category",
  "tag",
  "wp-admin",
  "wp-json",
  "feed"
]);

export function normalizeArticleIdentifier(value: string | null | undefined) {
  const candidate = value?.trim() ?? "";
  return articleIdPattern.test(candidate) ? candidate : null;
}

export function normalizeArticleSlug(value: string | null | undefined) {
  const candidate = value?.trim().replace(/^\/+|\/+$/g, "") ?? "";
  if (!articleSlugPattern.test(candidate) || reservedWebPaths.has(candidate.toLowerCase())) {
    return null;
  }
  return candidate;
}

export function articleDeepLink(articleId: string) {
  const safeId = normalizeArticleIdentifier(articleId);
  if (!safeId) throw new Error("Invalid article identifier for native deep link.");
  return Linking.createURL("article/" + encodeURIComponent(safeId));
}

export function canonicalArticleUrl(article: ArticleSummary) {
  const slug = normalizeArticleSlug(article.slug);
  if (!slug) throw new Error("Invalid canonical HealthTimes article slug.");
  return "https://healthtimes.co.zw/" + encodeURIComponent(slug) + "/";
}

export function attributedShareUrl(article: ArticleSummary, channel: ShareChannel) {
  const url = new URL(canonicalArticleUrl(article));
  const articleId = normalizeArticleIdentifier(article.id);
  if (articleId) url.searchParams.set("ht_article_id", articleId);
  url.searchParams.set("utm_source", "healthtimes_share");
  url.searchParams.set("utm_medium", channel);
  url.searchParams.set("utm_campaign", "organic_share");
  return url.toString();
}

export type HealthTimesDeepLink =
  | { type: "article"; articleId: string }
  | { type: "article-slug"; articleSlug: string };

export function parseHealthTimesDeepLink(url: string): HealthTimesDeepLink | null {
  const parsed = Linking.parse(url);
  const path = parsed.path ?? "";
  const routeMatch = path.match(/^article\/([^/?#]+)$/);
  if (routeMatch?.[1]) {
    try {
      const articleId = normalizeArticleIdentifier(decodeURIComponent(routeMatch[1]));
      return articleId ? { type: "article", articleId } : null;
    } catch {
      return null;
    }
  }

  try {
    const web = new URL(url);
    if (web.protocol !== "https:" || !allowedHosts.has(web.hostname)) return null;
    const segments = web.pathname.split("/").filter(Boolean);
    if (segments.length !== 1) return null;
    const rawSlug = segments[0];
    if (!rawSlug) return null;
    const articleSlug = normalizeArticleSlug(decodeURIComponent(rawSlug));
    if (!articleSlug) return null;

    // ht_article_id is attribution metadata only. It is deliberately never trusted
    // as the destination identifier for inbound web links.
    return { type: "article-slug", articleSlug };
  } catch {
    return null;
  }
}

export type SocialReferralAttribution = {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  content: string | null;
  canonicalPath: string;
};

const cleanAttributionValue = (value: string | null) => {
  if (!value?.trim()) return null;
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return normalized || null;
};

function canonicalPath(pathname: string) {
  const normalized = "/" + pathname.split("/").filter(Boolean).join("/");
  return normalized === "/" ? "/" : normalized + "/";
}

export function parseSocialReferral(url: string): SocialReferralAttribution | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || !allowedHosts.has(parsed.hostname)) {
      return null;
    }
    return {
      source: cleanAttributionValue(parsed.searchParams.get("utm_source")),
      medium: cleanAttributionValue(parsed.searchParams.get("utm_medium")),
      campaign: cleanAttributionValue(parsed.searchParams.get("utm_campaign")),
      content: cleanAttributionValue(parsed.searchParams.get("utm_content")),
      canonicalPath: canonicalPath(parsed.pathname)
    };
  } catch {
    return null;
  }
}
