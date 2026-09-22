import { Platform } from "react-native";
import type {
  AnalyticsEvent,
  AnalyticsProviderStatus
} from "../domain/models";
import type { AnalyticsService } from "../domain/contracts";
import {
  CANONICAL_WEB_ANALYTICS_HOSTS,
  MOBILE_GROWTH_CONFIGURATION,
  VERIFIED_WEB_GROWTH_IDENTITIES
} from "./config";
import { validatePublicAnalyticsEvent } from "./events";

export interface AnalyticsAdapter {
  getStatus(): AnalyticsProviderStatus;
  emit(event: AnalyticsEvent): Promise<void>;
}

export type DevelopmentAnalyticsSink = AnalyticsAdapter & {
  events: AnalyticsEvent[];
};

export function createDevelopmentAnalyticsSink(): DevelopmentAnalyticsSink {
  const events: AnalyticsEvent[] = [];
  return {
    events,
    getStatus() {
      return {
        provider: "development-test",
        state: "available",
        measurementId: null,
        detail: "In-memory development/test sink; no provider transmission."
      };
    },
    async emit(event) {
      events.push(event);
    }
  };
}

type WebAnalyticsRuntime = {
  hostname: string;
  gtag?: (command: "event", name: string, parameters: Record<string, unknown>) => void;
};

function defaultWebRuntime(): WebAnalyticsRuntime {
  const runtime = globalThis as typeof globalThis & {
    location?: { hostname?: string };
    gtag?: WebAnalyticsRuntime["gtag"];
  };
  return {
    hostname: runtime.location?.hostname ?? "",
    gtag: runtime.gtag
  };
}

export function createPwaWebAnalyticsAdapter(
  runtime: WebAnalyticsRuntime = defaultWebRuntime()
): AnalyticsAdapter {
  const allowedHosts = new Set<string>(CANONICAL_WEB_ANALYTICS_HOSTS);
  const measurementId = VERIFIED_WEB_GROWTH_IDENTITIES.ga4WebMeasurementId;

  return {
    getStatus() {
      if (!allowedHosts.has(runtime.hostname)) {
        return {
          provider: "pwa-web",
          state: "blocked-by-host",
          measurementId,
          detail: "Verified web GA4 continuity is restricted to canonical HealthTimes hosts."
        };
      }
      if (!runtime.gtag) {
        return {
          provider: "pwa-web",
          state: "configuration-required",
          measurementId,
          detail: "Verified web measurement identity exists, but the canonical web transport is not initialized."
        };
      }
      return {
        provider: "pwa-web",
        state: "available",
        measurementId,
        detail: "Canonical web host with verified HealthTimes GA4 continuity transport."
      };
    },
    async emit(event) {
      const status = this.getStatus();
      if (status.state !== "available" || !runtime.gtag) return;
      runtime.gtag("event", event.eventName, {
        send_to: measurementId,
        story_id: event.storyId,
        page_path: event.pagePath,
        source: event.source,
        medium: event.medium,
        campaign: event.campaign,
        ...(event.parameters ?? {})
      });
    }
  };
}

export function createNativeAnalyticsAdapter(): AnalyticsAdapter {
  return {
    getStatus() {
      return {
        provider: "native",
        state: "configuration-required",
        measurementId: MOBILE_GROWTH_CONFIGURATION.ga4MobileMeasurementId,
        detail: "Native analytics remains configuration-required until AG-05 supplies approved native provider evidence."
      };
    },
    async emit() {
      return;
    }
  };
}

export function createAnalyticsService(adapter: AnalyticsAdapter): AnalyticsService {
  return {
    async getStatus() {
      return adapter.getStatus();
    },
    async track(candidate) {
      try {
        const approved = validatePublicAnalyticsEvent(candidate);
        await adapter.emit(approved);
      } catch {
        // Reader analytics is deliberately non-blocking. Validation/provider failures
        // are contained here so reading, saving, sharing and playback remain usable.
        return;
      }
    }
  };
}

export function createRuntimeAnalyticsService(): AnalyticsService {
  if (Platform.OS === "web") {
    const runtime = defaultWebRuntime();
    if (runtime.hostname === "localhost" || runtime.hostname === "127.0.0.1" || !runtime.hostname) {
      return createAnalyticsService(createDevelopmentAnalyticsSink());
    }
    return createAnalyticsService(createPwaWebAnalyticsAdapter(runtime));
  }
  return createAnalyticsService(createNativeAnalyticsAdapter());
}
