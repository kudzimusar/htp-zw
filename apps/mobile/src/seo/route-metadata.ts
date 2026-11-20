// HT-MVP-PUBLIC-LAUNCH-01-G5: titles, descriptions, canonical URLs and robots
// directives for routes that have no story-specific metadata. Article,
// author and legacy WordPress addresses are described by their own capability
// metadata (api/public.js kind=page, +not-found CapabilityHead) and return null.

export const CANONICAL_ORIGIN = "https://healthtimes.co.zw";
export const SITE_NAME = "HealthTimes";
const DEFAULT_DESCRIPTION = "Health news, investigations and analysis from HealthTimes.";

export type RouteMetadata = {
  readonly title: string;
  readonly description: string;
  readonly canonicalUrl: string;
  readonly robots: "index,follow" | "noindex,follow" | "noindex,nofollow";
};

type Entry = { title: string; description?: string; robots?: RouteMetadata["robots"] };

const PUBLIC_ROUTES: Record<string, Entry> = {
  "/": { title: SITE_NAME, description: DEFAULT_DESCRIPTION },
  "/explore": { title: "Explore", description: "Browse HealthTimes reporting by place, desk, topic and format." },
  "/search": { title: "Search", description: "Search HealthTimes reporting.", robots: "noindex,follow" },
  "/live": { title: "Live coverage", description: "Live HealthTimes coverage and updates." },
  "/watch": { title: "Watch", description: "HealthTimes video reporting." },
  "/listen": { title: "Listen", description: "HealthTimes audio.", robots: "noindex,follow" },
  "/about": { title: "About HealthTimes", description: "Who publishes HealthTimes, its editorial principles and how to request a correction." },
  "/authors": { title: "Authors and journalists", description: "HealthTimes reporters and contributors." },
  "/premium": { title: "HealthTimes Premium", description: "What HealthTimes Premium membership includes." },
  "/edition": { title: "Edition", robots: "noindex,follow" }
};

const POLICY_ROUTES: Record<string, string> = {
  "/privacy": "Privacy Policy",
  "/terms": "Terms of Use",
  "/subscription-terms": "Subscription Terms"
};

// Personal, operational and staff surfaces: never indexed, links not followed.
const PRIVATE_ROUTES: Record<string, string> = {
  "/my": "My HealthTimes",
  "/saved": "Saved stories",
  "/account-access": "Sign in",
  "/devices-sessions": "Devices and sessions",
  "/notification-settings": "Notification settings",
  "/notifications": "Notifications",
  "/appearance": "Appearance",
  "/onboarding": "Welcome",
  "/system-status": "System status",
  "/growth-status": "Growth status"
};
const PRIVATE_PREFIXES: Array<[string, string]> = [
  ["/studio", "Newsroom Studio"],
  ["/owner-preview", "Owner Preview"],
  ["/payment", "Payment"]
];

function normalize(pathname: string | null | undefined): string {
  const path = ((String(pathname || "/").split("?")[0] ?? "").split("#")[0] ?? "/").replace(/\/{2,}/g, "/") || "/";
  const bare = path.length > 1 ? path.replace(/\/+$/, "") : path;
  return bare.startsWith("/(reader)") ? bare.slice("/(reader)".length) || "/" : bare;
}

function titled(title: string): string {
  return title === SITE_NAME || title.includes(SITE_NAME) ? title : title + " — " + SITE_NAME;
}

export type ArticleMetadata = {
  readonly title: string;
  readonly description: string;
  /** The preserved public (WordPress) URL; null when the story has none. */
  readonly canonicalUrl: string | null;
  readonly image: string | null;
};

function httpsUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function articleMetadata(story: {
  title: string;
  standfirst?: string | null;
  excerpt?: string | null;
  canonicalUrl?: string | null;
  heroMedia?: { publicUrl?: string | null } | null;
}): ArticleMetadata {
  const summary = String(story.standfirst || story.excerpt || DEFAULT_DESCRIPTION).replace(/\s+/g, " ").trim();
  return {
    title: titled(story.title || SITE_NAME),
    description: summary.length > 300 ? summary.slice(0, 297).trimEnd() + "…" : summary,
    canonicalUrl: httpsUrl(story.canonicalUrl),
    image: httpsUrl(story.heroMedia?.publicUrl)
  };
}

export function routeMetadata(pathname: string | null | undefined, options: { policiesApproved?: boolean } = {}): RouteMetadata | null {
  const path = normalize(pathname);
  const canonicalUrl = CANONICAL_ORIGIN + (path === "/" ? "/" : path);
  const publicEntry = PUBLIC_ROUTES[path];
  if (publicEntry) {
    return {
      title: titled(publicEntry.title),
      description: publicEntry.description || DEFAULT_DESCRIPTION,
      canonicalUrl,
      robots: publicEntry.robots || "index,follow"
    };
  }
  if (POLICY_ROUTES[path]) {
    return {
      title: titled(POLICY_ROUTES[path]),
      description: SITE_NAME + " " + POLICY_ROUTES[path] + ".",
      canonicalUrl,
      // Drafts stay out of search results until legal approval.
      robots: options.policiesApproved ? "index,follow" : "noindex,follow"
    };
  }
  const privateTitle = PRIVATE_ROUTES[path] ?? PRIVATE_PREFIXES.find(([prefix]) => path === prefix || path.startsWith(prefix + "/"))?.[1];
  if (privateTitle) {
    return { title: titled(privateTitle), description: DEFAULT_DESCRIPTION, canonicalUrl, robots: "noindex,nofollow" };
  }
  return null;
}
