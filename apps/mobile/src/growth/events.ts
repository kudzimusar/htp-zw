import type { AnalyticsEvent, AnalyticsEventName } from "../domain/models";
import { GROWTH_EVENT_VERSION } from "./config";

export const HEALTH_TIMES_PUBLIC_EVENTS: readonly AnalyticsEventName[] = [
  "page_view",
  "article_view",
  "article_25_percent",
  "article_50_percent",
  "article_75_percent",
  "article_complete",
  "listen_started",
  "listen_completed",
  "story_saved",
  "story_shared",
  "whatsapp_share",
  "search_performed",
  "topic_followed",
  "citation_copied",
  "reference_opened",
  "premium_preview_started",
  "premium_warning_shown",
  "premium_locked",
  "subscription_started",
  "subscription_completed",
  "newsletter_signup",
  "push_opt_in",
  "ad_impression",
  "ad_click"
] as const;

const publicEventSet = new Set<string>(HEALTH_TIMES_PUBLIC_EVENTS);

const prohibitedParameterFragments = [
  "diagnosis",
  "disease",
  "condition",
  "medication",
  "prescription",
  "symptom",
  "patient",
  "medical_record",
  "health_profile"
] as const;

export function isPublicAnalyticsEventName(value: string): value is AnalyticsEventName {
  return publicEventSet.has(value);
}

export function validatePublicAnalyticsEvent(event: AnalyticsEvent): AnalyticsEvent {
  if (!isPublicAnalyticsEventName(event.eventName)) {
    throw new Error(`Unsupported public analytics event: ${event.eventName}`);
  }

  if (event.eventVersion !== GROWTH_EVENT_VERSION) {
    throw new Error(
      `Analytics event version must be ${GROWTH_EVENT_VERSION}; received ${event.eventVersion}.`
    );
  }

  for (const key of Object.keys(event.parameters ?? {})) {
    const normalized = key.toLowerCase();
    if (prohibitedParameterFragments.some((fragment) => normalized.includes(fragment))) {
      throw new Error(
        `Sensitive health attribute "${key}" is prohibited from public analytics payloads.`
      );
    }
  }

  return event;
}

export function event(
  eventName: AnalyticsEventName,
  parameters: AnalyticsEvent["parameters"] = {},
  fields: Omit<AnalyticsEvent, "eventName" | "eventVersion" | "parameters"> = {}
): AnalyticsEvent {
  return validatePublicAnalyticsEvent({
    ...fields,
    eventName,
    eventVersion: GROWTH_EVENT_VERSION,
    parameters
  });
}
