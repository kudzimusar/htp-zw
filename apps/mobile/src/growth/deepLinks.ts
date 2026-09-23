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
  const candidate=(article as ArticleSummary & { canonicalUrl?: string | null }).canonicalUrl;
  if(candidate){
    try{
      const parsed=new URL(candidate);
      if(allowedHosts.has(parsed.hostname.toLowerCase()) && parsed.protocol==="https:") return parsed.toString();
    }catch{}
  }
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
    if (articleId) return { type: "article" as const, articleId: articleId.slice(0, 160) };
    const segments=web.pathname.split("/").filter(Boolean);
    const reserved=new Set(["category","tag","author","about","contact","privacy-policy","wp-admin","wp-json"]);
    const slug=segments.at(-1);
    if(!slug || reserved.has(segments[0]?.toLowerCase() ?? "")) return null;
    const dated=segments.length===4 && /^\d{4}$/.test(segments[0]??"") && /^\d{2}$/.test(segments[1]??"") && /^\d{2}$/.test(segments[2]??"");
    if(segments.length===1 || dated) return { type:"article" as const, articleId:decodeURIComponent(slug).slice(0,160) };
    return null;
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