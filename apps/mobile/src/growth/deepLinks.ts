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

export function articleDeepLink(articleId: string) {
  return Linking.createURL(`article/${encodeURIComponent(articleId)}`);
}

export function canonicalArticleUrl(article: ArticleSummary) {
  return `https://healthtimes.co.zw/${encodeURIComponent(article.slug)}/`;
}

export function attributedShareUrl(article: ArticleSummary, channel: ShareChannel) {
  const url = new URL(canonicalArticleUrl(article));
  url.searchParams.set("utm_source", "healthtimes_share");
  url.searchParams.set("utm_medium", channel);
  url.searchParams.set("utm_campaign", "organic_share");
  return url.toString();
}

export function parseHealthTimesDeepLink(url: string) {
  const parsed = Linking.parse(url);
  const path = parsed.path ?? "";
  const match = path.match(/^article\/([^/?#]+)$/);
  return match?.[1] ? { type: "article" as const, articleId: decodeURIComponent(match[1]) } : null;
}
