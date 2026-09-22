import type {
  AdPlacementDefinition,
  AdPlacementKey
} from "../domain/models";

export const READER_AD_PLACEMENTS: Record<AdPlacementKey, AdPlacementDefinition> = {
  home_top: {
    key: "home_top",
    surface: "home",
    format: "banner",
    sensitiveHealthEligibility: "blocked",
    personalizationAllowed: false
  },
  home_after_live: {
    key: "home_after_live",
    surface: "home",
    format: "inline-display",
    sensitiveHealthEligibility: "blocked",
    personalizationAllowed: false
  },
  home_feed_1: {
    key: "home_feed_1",
    surface: "home",
    format: "feed-display",
    sensitiveHealthEligibility: "blocked",
    personalizationAllowed: false
  },
  home_feed_2: {
    key: "home_feed_2",
    surface: "home",
    format: "feed-display",
    sensitiveHealthEligibility: "blocked",
    personalizationAllowed: false
  },
  home_watch: {
    key: "home_watch",
    surface: "home",
    format: "inline-display",
    sensitiveHealthEligibility: "blocked",
    personalizationAllowed: false
  },
  home_deep_feed: {
    key: "home_deep_feed",
    surface: "home",
    format: "feed-display",
    sensitiveHealthEligibility: "blocked",
    personalizationAllowed: false
  },
  article_after_intro: {
    key: "article_after_intro",
    surface: "article",
    format: "inline-display",
    sensitiveHealthEligibility: "blocked",
    personalizationAllowed: false
  },
  article_mid_body: {
    key: "article_mid_body",
    surface: "article",
    format: "inline-display",
    sensitiveHealthEligibility: "blocked",
    personalizationAllowed: false
  },
  article_end: {
    key: "article_end",
    surface: "article",
    format: "inline-display",
    sensitiveHealthEligibility: "blocked",
    personalizationAllowed: false
  },
  live_feed: {
    key: "live_feed",
    surface: "live",
    format: "feed-display",
    sensitiveHealthEligibility: "blocked",
    personalizationAllowed: false
  },
  watch_feed: {
    key: "watch_feed",
    surface: "watch",
    format: "feed-display",
    sensitiveHealthEligibility: "blocked",
    personalizationAllowed: false
  }
};

export function getReaderAdPlacement(key: AdPlacementKey): AdPlacementDefinition {
  const placement = READER_AD_PLACEMENTS[key];
  if (!placement) {
    throw new Error("Unregistered Reader ad placement: " + String(key));
  }
  return placement;
}
