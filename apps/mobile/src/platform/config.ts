import Constants from "expo-constants";

export type AppEnvironment = "development" | "staging" | "production";
export type EditorialDataMode = "fixture" | "staging" | "production";

type Extra = {
  environment?: AppEnvironment;
  product?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

export const appEnvironment: AppEnvironment =
  extra.environment === "staging" || extra.environment === "production"
    ? extra.environment
    : "development";

const requestedMode = process.env.EXPO_PUBLIC_HEALTHTIMES_SERVICE_MODE;
export const editorialDataMode: EditorialDataMode =
  requestedMode === "staging"
    ? "staging"
    : requestedMode === "production"
      ? "production"
      : "fixture";

export const stagingConfig = {
  url: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
  publishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
  expectedProjectRef: "gcdohgbmqhqwydgaxrcr"
} as const;

export const hasStagingConfig =
  stagingConfig.url.startsWith("https://") &&
  stagingConfig.publishableKey.startsWith("sb_publishable_");

export function environmentSummary() {
  if (appEnvironment === "staging" && editorialDataMode === "fixture") {
    return "STAGING APP • FIXTURE EDITORIAL DATA • LIVE STAGING PLATFORM";
  }
  if (appEnvironment === "production") {
    return "PRODUCTION";
  }
  return "DEVELOPMENT • FIXTURE DATA • NOT PRODUCTION";
}
