export const GROWTH_EVENT_VERSION = "2026-09-09" as const;

export const VERIFIED_WEB_GROWTH_IDENTITIES = {
  source: "AG-03 integration inventory",
  googleTag: "GT-PLTTGPL",
  ga4AccountId: "137814020",
  ga4PropertyId: "359235319",
  ga4WebStreamId: "4756168788",
  ga4WebMeasurementId: "G-S39LN2KX4X",
  searchConsoleProperty: "https://healthtimes.co.zw/",
  adsensePublisherId: "pub-8744434739998394",
  adsenseClientId: "ca-pub-8744434739998394",
  adsenseKnownWebSlotId: "7971959240"
} as const;

export const MOBILE_GROWTH_CONFIGURATION = {
  ga4MobileStreamId: null,
  ga4MobileMeasurementId: null,
  adMobAppId: null,
  adMobBannerUnitId: null,
  iosMonthlyProductId: null,
  iosYearlyProductId: null,
  androidMonthlyProductId: null,
  androidYearlyProductId: null,
  status: "configuration-required"
} as const;

export type PremiumPreviewConfiguration = {
  seconds: number;
  source: "environment" | "fail-closed";
};

const MAX_PREMIUM_PREVIEW_SECONDS = 300;

export function premiumPreviewConfiguration(): PremiumPreviewConfiguration {
  const raw = process.env.EXPO_PUBLIC_HEALTHTIMES_PREMIUM_PREVIEW_SECONDS?.trim();
  if (!raw) return { seconds: 0, source: "fail-closed" };

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > MAX_PREMIUM_PREVIEW_SECONDS) {
    return { seconds: 0, source: "fail-closed" };
  }

  return {
    seconds: Math.floor(parsed),
    source: "environment"
  };
}

export const VERIFIED_SELLER_DECLARATION =
  "google.com, pub-8744434739998394, DIRECT, f08c47fec0942fa0" as const;
