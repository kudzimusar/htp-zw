import type { ConfigContext, ExpoConfig } from "expo/config";

type AppEnvironment = "development" | "staging" | "production";

const resolveEnvironment = (): AppEnvironment => {
  const value = process.env.APP_ENV;
  if (value === "staging" || value === "production") return value;
  return "development";
};

export default ({ config }: ConfigContext): ExpoConfig => {
  const environment = resolveEnvironment();
  const suffix = environment === "production" ? "" : environment === "staging" ? ".staging" : ".dev";
  const displayName =
    environment === "production" ? "HealthTimes" : environment === "staging" ? "HealthTimes Staging" : "HealthTimes Dev";
  const webBaseUrl = process.env.HEALTHTIMES_WEB_BASE_URL?.trim();

  return {
    ...config,
    name: displayName,
    slug: "healthtimes",
    version: "0.1.0",
    scheme: "healthtimes",
    orientation: "default",
    userInterfaceStyle: "automatic",
    plugins: ["expo-router", "expo-secure-store", "expo-notifications"],
    experiments: {
      typedRoutes: true,
      ...(webBaseUrl ? { baseUrl: webBaseUrl } : {})
    },
    ios: {
      ...config.ios,
      supportsTablet: true,
      bundleIdentifier: "zw.co.healthtimes.app" + suffix
    },
    android: {
      ...config.android,
      package: "zw.co.healthtimes.app" + suffix
    },
    web: {
      ...config.web,
      bundler: "metro",
      output: "static"
    },
    extra: {
      ...config.extra,
      environment,
      product: "reader"
    }
  };
};
