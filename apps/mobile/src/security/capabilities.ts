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
  "security.sessions.view",
  "security.sessions.revoke",
  "security.audit.view"
] as const;

export type HealthTimesCapability = (typeof HEALTH_TIMES_CAPABILITIES)[number];

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
