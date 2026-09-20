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

export function articleDeepLink(articleId: string) {
  return Linking.createURL("article/" + encodeURIComponent(articleId));
}

export function canonicalArticleUrl(article: ArticleSummary) {
  return "https://healthtimes.co.zw/" + encodeURIComponent(article.slug) + "/";
}

export function attributedShareUrl(article: ArticleSummary, channel: ShareChannel) {
  const url = new URL(canonicalArticleUrl(article));
  url.searchParams.set("ht_article_id", article.id);
  url.searchParams.set("utm_source", "healthtimes_share");
  url.searchParams.set("utm_medium", channel);
  url.searchParams.set("utm_campaign", "organic_share");
  return url.toString();
}

export function parseHealthTimesDeepLink(url: string) {
  const parsed = Linking.parse(url);
  const path = parsed.path ?? "";
  const routeMatch = path.match(/^article\/([^/?#]+)$/);
  if (routeMatch?.[1]) {
    return { type: "article" as const, articleId: decodeURIComponent(routeMatch[1]) };
  }

  try {
    const web = new URL(url);
    if (!allowedHosts.has(web.hostname)) return null;
    const articleId = web.searchParams.get("ht_article_id")?.trim();
    if (!articleId) return null;
    return { type: "article" as const, articleId: articleId.slice(0, 160) };
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

const cleanAttributionValue = (value: string | null) =>
  value && value.trim() ? value.trim().slice(0, 120) : null;

export function parseSocialReferral(url: string): SocialReferralAttribution | null {
  try {
    const parsed = new URL(url);
    if (!allowedHosts.has(parsed.hostname)) {
      return null;
    }
    return {
      source: cleanAttributionValue(parsed.searchParams.get("utm_source")),
      medium: cleanAttributionValue(parsed.searchParams.get("utm_medium")),
      campaign: cleanAttributionValue(parsed.searchParams.get("utm_campaign")),
      content: cleanAttributionValue(parsed.searchParams.get("utm_content")),
      canonicalPath: parsed.pathname || "/"
    };
  } catch {
    return null;
  }
}
