export const HEALTH_TIMES_CAPABILITIES = [
  "story.create",
  "story.edit_own",
  "story.edit_all",
  "story.submit",
  "story.fact_check",
  "story.health_review",
  "story.copy_edit",
  "story.publish",
  "story.correct",
  "assignment.create",
  "assignment.manage",
  "premium.assign",
  "premium.manage",
  "ads.view",
  "ads.create",
  "ads.approve",
  "subscriber.view",
  "subscriber.manage",
  "staff.view",
  "staff.invite",
  "staff.change_role",
  "staff.revoke",
  "analytics.view",
  "settings.manage",
  "security.manage",
  "security.view_sessions",
  "security.revoke_session",
  "security.view_audit",
  "distribution.manage",
  "media.manage",
  "communication.desk.manage",
  "communication.breaking.manage",
  "communication.announce",
  "comment.configure",
  "comment.moderate",
  "comment.restrict",
  "comment.audit",
  "social.compose",
  "social.approve",
  "social.publish",
  "social.manage_accounts",
  "marketing.create",
  "marketing.approve",
  "marketing.send",
  "marketing.analytics"
] as const;

export type HealthTimesCapability = (typeof HEALTH_TIMES_CAPABILITIES)[number];

export const SOCIAL_DESK_CAPABILITIES = [
  "social.compose",
  "social.approve",
  "social.publish",
  "social.manage_accounts"
] as const satisfies readonly HealthTimesCapability[];

export const NEWSLETTER_DESK_CAPABILITIES = [
  "marketing.create",
  "marketing.approve",
  "marketing.send",
  "marketing.analytics"
] as const satisfies readonly HealthTimesCapability[];

export const PUSH_DESK_CAPABILITIES = [
  "distribution.manage",
  "story.publish"
] as const satisfies readonly HealthTimesCapability[];

export type AuthorizationSnapshot = {
  status:
    | "anonymous"
    | "server-policy-unavailable"
    | "authenticated-no-staff-authority"
    | "authorized";
  staffProfileId: string | null;
  capabilities: HealthTimesCapability[];
  source: "server" | "none";
  reason: string;
};

export function emptyAuthorizationSnapshot(
  status: Exclude<AuthorizationSnapshot["status"], "authorized">,
  reason: string
): AuthorizationSnapshot {
  return {
    status,
    staffProfileId: null,
    capabilities: [],
    source: "none",
    reason
  };
}

export function hasServerCapability(
  snapshot: AuthorizationSnapshot,
  capability: HealthTimesCapability
) {
  return snapshot.status === "authorized" &&
    snapshot.source === "server" &&
    snapshot.capabilities.includes(capability);
}

export function hasAnyServerCapability(
  snapshot: AuthorizationSnapshot | null | undefined,
  capabilities: readonly HealthTimesCapability[]
): boolean {
  if (
    !snapshot ||
    snapshot.status !== "authorized" ||
    snapshot.source !== "server" ||
    !Array.isArray(snapshot.capabilities) ||
    !Array.isArray(capabilities) ||
    capabilities.length === 0
  ) {
    return false;
  }
  return capabilities.some((capability) =>
    snapshot.capabilities.includes(capability)
  );
}

export function hasSocialDeskAccess(
  snapshot: AuthorizationSnapshot | null | undefined
): boolean {
  return hasAnyServerCapability(snapshot, SOCIAL_DESK_CAPABILITIES);
}

export function hasNewsletterDeskAccess(
  snapshot: AuthorizationSnapshot | null | undefined
): boolean {
  return hasAnyServerCapability(snapshot, NEWSLETTER_DESK_CAPABILITIES);
}

export function hasPushDeskAccess(
  snapshot: AuthorizationSnapshot | null | undefined
): boolean {
  return hasAnyServerCapability(snapshot, PUSH_DESK_CAPABILITIES);
}

export const WHATSAPP_DESK_CAPABILITIES: readonly HealthTimesCapability[] = [
  "distribution.manage",
  "story.publish"
] as const;

export function hasWhatsAppDeskAccess(
  snapshot: AuthorizationSnapshot | null | undefined
): boolean {
  return hasAnyServerCapability(snapshot, WHATSAPP_DESK_CAPABILITIES);
}

export interface WhatsAppDeskCapabilityMatrix {
  hasDeskAccess: boolean;
  canCreate: boolean;
  canApprove: boolean;
  canReject: boolean;
  canDispatch: boolean;
}

export function resolveWhatsAppDeskCapabilityState(
  snapshot: AuthorizationSnapshot | null | undefined
): WhatsAppDeskCapabilityMatrix {
  if (
    !snapshot ||
    snapshot.status !== "authorized" ||
    snapshot.source !== "server"
  ) {
    return {
      hasDeskAccess: false,
      canCreate: false,
      canApprove: false,
      canReject: false,
      canDispatch: false
    };
  }

  return {
    hasDeskAccess: hasWhatsAppDeskAccess(snapshot),
    canCreate: hasServerCapability(snapshot, "distribution.manage"),
    canApprove: hasServerCapability(snapshot, "story.publish"),
    canReject:
      hasServerCapability(snapshot, "distribution.manage") ||
      hasServerCapability(snapshot, "story.publish"),
    canDispatch: hasServerCapability(snapshot, "story.publish")
  };
}


