import type {
  AnalyticsEvent,
  AnalyticsEventName
} from "../domain/models";
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

const parameterAllowlist: Record<AnalyticsEventName, readonly string[]> = {
  page_view: ["route"],
  article_view: ["premium_state", "section"],
  article_25_percent: ["scroll_depth"],
  article_50_percent: ["scroll_depth"],
  article_75_percent: ["scroll_depth"],
  article_complete: ["scroll_depth"],
  listen_started: ["media_id", "duration_seconds"],
  listen_completed: ["media_id", "duration_seconds", "elapsed_seconds"],
  story_saved: ["reader_state"],
  story_shared: ["channel"],
  whatsapp_share: ["channel"],
  search_performed: ["result_count", "format", "country_filter", "topic_filter", "query_redacted"],
  topic_followed: ["source_surface"],
  citation_copied: ["reference_kind"],
  reference_opened: ["reference_kind"],
  premium_preview_started: ["preview_seconds"],
  premium_warning_shown: ["seconds_elapsed"],
  premium_locked: ["seconds_elapsed"],
  subscription_started: ["plan_key", "source_path", "storefront_status"],
  subscription_completed: ["plan_key", "server_entitlement_confirmed"],
  newsletter_signup: ["surface"],
  push_opt_in: ["surface"],
  ad_impression: ["placement_key", "provider_state", "format"],
  ad_click: ["placement_key", "provider_state", "format"]
};

const prohibitedParameterFragments = [
  "diagnosis",
  "disease",
  "condition",
  "medication",
  "prescription",
  "symptom",
  "patient",
  "medical_record",
  "health_profile",
  "protected_body",
  "body_html",
  "draft_body",
  "editorial_note",
  "newsroom",
  "studio",
  "staff_role",
  "capability",
  "permission",
  "password",
  "token",
  "authorization",
  "subscriber_email",
  "subscriber_phone",
  "search_query",
  "raw_query",
  "query_text",
  "search_term"
] as const;

const protectedReaderPaths = ["/studio", "/newsroom"] as const;

export function isPublicAnalyticsEventName(value: string): value is AnalyticsEventName {
  return publicEventSet.has(value);
}

function boundedString(field: string, value: string | undefined, maximum: number) {
  if (value === undefined) return;
  if (!value.trim() || value.length > maximum) {
    throw new Error(field + " must be a non-empty public analytics value of at most " + maximum + " characters.");
  }
}

export function validatePublicAnalyticsEvent(event: AnalyticsEvent): AnalyticsEvent {
  if (!isPublicAnalyticsEventName(event.eventName)) {
    throw new Error("Unsupported public analytics event: " + String(event.eventName));
  }

  if (event.eventVersion !== GROWTH_EVENT_VERSION) {
    throw new Error(
      "Analytics event version must be " + GROWTH_EVENT_VERSION + "; received " + String(event.eventVersion) + "."
    );
  }

  boundedString("storyId", event.storyId, 160);
  boundedString("pagePath", event.pagePath, 240);
  boundedString("source", event.source, 120);
  boundedString("medium", event.medium, 120);
  boundedString("campaign", event.campaign, 120);

  if (event.pagePath && protectedReaderPaths.some((prefix) => event.pagePath!.startsWith(prefix))) {
    throw new Error("Protected Newsroom/Studio paths are prohibited from public Reader analytics.");
  }

  const parameters = event.parameters ?? {};
  const allowedKeys = new Set(parameterAllowlist[event.eventName]);
  const keys = Object.keys(parameters);
  if (keys.length > 16) {
    throw new Error("Public analytics payload contains too many parameters.");
  }

  for (const key of keys) {
    const normalized = key.toLowerCase();
    if (!allowedKeys.has(key)) {
      throw new Error("Analytics parameter is not approved for " + event.eventName + ": " + key);
    }
    if (prohibitedParameterFragments.some((fragment) => normalized.includes(fragment))) {
      throw new Error("Protected analytics attribute is prohibited: " + key);
    }
    const value = parameters[key];
    if (typeof value === "string" && value.length > 160) {
      throw new Error("Analytics string parameter is too long: " + key);
    }
  }

  if (event.eventName === "search_performed" && parameters.query_redacted !== true) {
    throw new Error("search_performed requires query_redacted=true and never accepts raw query text.");
  }

  if (
    event.eventName === "subscription_completed" &&
    parameters.server_entitlement_confirmed !== true
  ) {
    throw new Error("subscription_completed requires authoritative server entitlement confirmation.");
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
