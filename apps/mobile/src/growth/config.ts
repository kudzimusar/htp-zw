export const GROWTH_EVENT_VERSION = "2026-09-09" as const;

export const VERIFIED_WEB_GROWTH_IDENTITIES = {
  source: "repository web continuity evidence; AG-05 account-level continuity remains authoritative",
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

export const CANONICAL_WEB_ANALYTICS_HOSTS = [
  "healthtimes.co.zw",
  "www.healthtimes.co.zw"
] as const;

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

export const VERIFIED_SELLER_DECLARATION =
  "google.com, pub-8744434739998394, DIRECT, f08c47fec0942fa0" as const;

export const SELLER_FILE_EVIDENCE = {
  adsTxt: {
    status: "web-continuity-recorded",
    declarations: [VERIFIED_SELLER_DECLARATION] as readonly string[],
    authority: "repository web seller evidence; AG-05 continuity certification pending"
  },
  appAdsTxt: {
    status: "configuration-required",
    declarations: [] as readonly string[],
    authority: "AG-05 native app seller evidence required"
  },
  nativeAdvertisingProvider: {
    status: "configuration-required",
    declarations: [] as readonly string[],
    authority: "AG-05 approved native provider configuration required"
  }
} as const;
