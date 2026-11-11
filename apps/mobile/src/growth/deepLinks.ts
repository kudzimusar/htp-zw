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
const APP_SCHEME = "healthtimes:";
const MAX_ARTICLE_LINK_LENGTH = 2048;
// Session tokens in an auth callback can be long.
const MAX_CALLBACK_LENGTH = 16384;
const ARTICLE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,159}$/;
const ACCOUNT_CALLBACK_MODES = new Set(["verification", "recovery", "owner-activation"]);

function parseLink(url: unknown, maxLength: number): URL | null {
  if (typeof url !== "string" || !url || url.length > maxLength) return null;
  try {
    const parsed = new URL(url);
    return parsed.username || parsed.password ? null : parsed;
  } catch {
    return null;
  }
}

function currentWebOrigin(): string | null {
  const origin = typeof window !== "undefined" ? window.location?.origin : null;
  // Sandboxed and file: documents report the literal origin "null", as does every
  // non-web URL, so that value can never establish trust.
  return origin && origin !== "null" ? origin : null;
}

// healthtimes://article/x carries "article" as the host; healthtimes:///article/x in the path.
function routeSegments(parsed: URL): string[] {
  const path = parsed.pathname.split("/").filter(Boolean);
  return parsed.protocol === APP_SCHEME && parsed.hostname ? [parsed.hostname, ...path] : path;
}

function validArticleId(value: string | null | undefined): string | null {
  return value && ARTICLE_ID.test(value) ? value : null;
}

function decodedSegment(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

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
  const parsed = parseLink(url, MAX_ARTICLE_LINK_LENGTH);
  if (!parsed) return null;
  const publisher = parsed.protocol === "https:" && allowedHosts.has(parsed.hostname);
  if (parsed.protocol !== APP_SCHEME && !publisher && parsed.origin !== currentWebOrigin()) return null;

  const [routeName, routeId, ...extra] = routeSegments(parsed);
  const fromRoute = routeName === "article" && routeId && !extra.length ? decodedSegment(routeId) : null;
  const fromQuery = publisher ? parsed.searchParams.get("ht_article_id")?.trim() : null;
  const articleId = validArticleId(fromRoute ?? fromQuery);
  return articleId ? { type: "article" as const, articleId } : null;
}

// Expo Router resolves the app's own scheme itself; acting on it here too would
// open the destination twice.
export function isRouterOwnedLink(url: string) {
  return parseLink(url, MAX_ARTICLE_LINK_LENGTH)?.protocol === APP_SCHEME;
}

export type AccountCallback = { mode: "verification" | "recovery" | "owner-activation" | null };

// Only a real callback to this app's account route may reach the auth service.
export function parseAccountCallback(url: string | null): AccountCallback | null {
  const parsed = parseLink(url, MAX_CALLBACK_LENGTH);
  if (!parsed) return null;
  if (parsed.protocol !== APP_SCHEME && parsed.origin !== currentWebOrigin()) return null;
  const route = routeSegments(parsed);
  if (route.length !== 1 || route[0] !== "account-access") return null;

  const modes = parsed.searchParams.getAll("mode");
  if (modes.length > 1 || (modes.length === 1 && !ACCOUNT_CALLBACK_MODES.has(modes[0]!))) return null;

  const params = new URLSearchParams(parsed.search.slice(1) + "&" + parsed.hash.slice(1));
  const hasCredentials = params.has("code") || (params.has("access_token") && params.has("refresh_token"));
  if (!hasCredentials && !params.has("error")) return null;
  return { mode: (modes[0] as AccountCallback["mode"]) ?? null };
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
