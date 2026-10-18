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
  "staff.manage",
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

export const STAFF_DESK_CAPABILITIES: readonly HealthTimesCapability[] = [
  "staff.view",
  "staff.manage"
] as const;

export function hasStaffDeskAccess(
  snapshot: AuthorizationSnapshot | null | undefined
): boolean {
  if (!snapshot) return false;
  return hasAnyServerCapability(snapshot, STAFF_DESK_CAPABILITIES);
}

export function canManageStaff(
  snapshot: AuthorizationSnapshot | null | undefined
): boolean {
  if (!snapshot) return false;
  return (
    hasServerCapability(snapshot, "staff.manage") ||
    hasServerCapability(snapshot, "staff.change_role") ||
    hasServerCapability(snapshot, "staff.revoke")
  );
}

export const ADVERTISING_DESK_CAPABILITIES: readonly HealthTimesCapability[] = [
  "ads.view",
  "ads.create",
  "ads.approve"
] as const;

export function hasAdvertisingDeskAccess(
  snapshot: AuthorizationSnapshot | null | undefined
): boolean {
  if (!snapshot) return false;
  return hasAnyServerCapability(snapshot, ADVERTISING_DESK_CAPABILITIES);
}

export function canCreateCampaign(
  snapshot: AuthorizationSnapshot | null | undefined
): boolean {
  if (!snapshot) return false;
  return hasServerCapability(snapshot, "ads.create");
}

export function canApproveCampaign(
  snapshot: AuthorizationSnapshot | null | undefined
): boolean {
  if (!snapshot) return false;
  return hasServerCapability(snapshot, "ads.approve");
}

export const SUBSCRIBER_DESK_CAPABILITIES: readonly HealthTimesCapability[] = [
  "subscriber.view",
  "subscriber.manage"
] as const;

export function hasSubscriberDeskAccess(
  snapshot: AuthorizationSnapshot | null | undefined
): boolean {
  if (!snapshot) return false;
  return hasAnyServerCapability(snapshot, SUBSCRIBER_DESK_CAPABILITIES);
}

export function canManageSubscribers(
  snapshot: AuthorizationSnapshot | null | undefined
): boolean {
  if (!snapshot) return false;
  return hasServerCapability(snapshot, "subscriber.manage");
}

export const PREMIUM_DESK_CAPABILITIES: readonly HealthTimesCapability[] = [
  "premium.manage",
  "premium.assign",
  "subscriber.view"
] as const;

export function hasPremiumDeskAccess(
  snapshot: AuthorizationSnapshot | null | undefined
): boolean {
  if (!snapshot) return false;
  return hasAnyServerCapability(snapshot, PREMIUM_DESK_CAPABILITIES);
}

export function canManagePremium(
  snapshot: AuthorizationSnapshot | null | undefined
): boolean {
  if (!snapshot) return false;
  return hasServerCapability(snapshot, "premium.manage");
}

export function canAssignPremium(
  snapshot: AuthorizationSnapshot | null | undefined
): boolean {
  if (!snapshot) return false;
  return (
    hasServerCapability(snapshot, "premium.manage") ||
    hasServerCapability(snapshot, "premium.assign")
  );
}

export const AI_DESK_CAPABILITIES: readonly HealthTimesCapability[] = [
  "story.create",
  "story.edit_own",
  "story.edit_all",
  "story.copy_edit",
  "story.fact_check",
  "story.health_review",
  "story.publish"
] as const;

export function hasAiDeskAccess(
  snapshot: AuthorizationSnapshot | null | undefined
): boolean {
  if (!snapshot) return false;
  return hasAnyServerCapability(snapshot, AI_DESK_CAPABILITIES);
}

export function canRunAiAssist(
  snapshot: AuthorizationSnapshot | null | undefined
): boolean {
  if (!snapshot) return false;
  return hasAnyServerCapability(snapshot, AI_DESK_CAPABILITIES);
}

export const CITATIONS_DESK_CAPABILITIES: readonly HealthTimesCapability[] = [
  "analytics.view",
  "story.edit_own",
  "story.edit_all",
  "story.publish"
] as const;

export function hasCitationsDeskAccess(
  snapshot: AuthorizationSnapshot | null | undefined
): boolean {
  if (!snapshot) return false;
  return hasAnyServerCapability(snapshot, CITATIONS_DESK_CAPABILITIES);
}

export function canManageCitations(
  snapshot: AuthorizationSnapshot | null | undefined
): boolean {
  if (!snapshot) return false;
  return (
    hasServerCapability(snapshot, "story.edit_all") ||
    hasServerCapability(snapshot, "story.publish") ||
    hasServerCapability(snapshot, "analytics.view")
  );
}

export const AUTHORS_DESK_CAPABILITIES: readonly HealthTimesCapability[] = [
  "staff.view",
  "staff.manage",
  "story.create",
  "story.edit_own",
  "story.edit_all",
  "story.publish"
] as const;

export function hasAuthorsDeskAccess(
  snapshot: AuthorizationSnapshot | null | undefined
): boolean {
  if (!snapshot) return false;
  return hasAnyServerCapability(snapshot, AUTHORS_DESK_CAPABILITIES);
}

export function canManageAuthors(
  snapshot: AuthorizationSnapshot | null | undefined
): boolean {
  if (!snapshot) return false;
  return (
    hasServerCapability(snapshot, "staff.manage") ||
    hasServerCapability(snapshot, "story.edit_all")
  );
}

export const SETTINGS_DESK_CAPABILITIES: readonly HealthTimesCapability[] = [
  "settings.manage",
  "security.manage"
] as const;

export function hasSettingsDeskAccess(
  snapshot: AuthorizationSnapshot | null | undefined
): boolean {
  if (!snapshot) return false;
  return hasAnyServerCapability(snapshot, SETTINGS_DESK_CAPABILITIES);
}

export function canManageSettings(
  snapshot: AuthorizationSnapshot | null | undefined
): boolean {
  if (!snapshot) return false;
  return hasServerCapability(snapshot, "settings.manage");
}


