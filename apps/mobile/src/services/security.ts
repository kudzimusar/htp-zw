import type {
  AuthorizationService,
  DeviceSecurityService
} from "../domain/contracts";
import {
  HEALTH_TIMES_CAPABILITIES,
  emptyAuthorizationSnapshot,
  hasServerCapability,
  type HealthTimesCapability
} from "../security/capabilities";
import {
  getNotificationPreferences,
  saveNotificationPreferences
} from "../security/notification-preferences";
import { requestPushRegistrationBaseline } from "../security/push";
import { getStagingSupabaseClient } from "../platform/supabase";

export const stagingAuthorizationService: AuthorizationService = {
  async getSnapshot() {
    const supabase = getStagingSupabaseClient();
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;

    if (!data.session) {
      return emptyAuthorizationSnapshot(
        "anonymous",
        "No authenticated staging session exists. Studio authority is unavailable."
      );
    }

    const client=getStagingSupabaseClient() as any;
    const {error:registerError}=await client.rpc("newsroom_register_session",{
      p_user_agent:"HealthTimes Native CA-01"
    });

    if(registerError){
      const message=String(registerError.message ?? "");
      if(registerError.code==="42501" || message.includes("Active Newsroom staff profile required")){
        return emptyAuthorizationSnapshot(
          "authenticated-no-staff-authority",
          "This authenticated HealthTimes Reader account has no active Newsroom staff authority."
        );
      }
      return emptyAuthorizationSnapshot(
        "server-policy-unavailable",
        "The certified Newsroom server authority projection is temporarily unavailable. Authenticated client state cannot create Studio authority."
      );
    }

    const {data:context,error:contextError}=await client.rpc("newsroom_current_context",{});
    if(contextError || !context || typeof context!=="object"){
      return emptyAuthorizationSnapshot(
        "server-policy-unavailable",
        "The certified Newsroom server authority projection could not be read. Authenticated client state cannot create Studio authority."
      );
    }

    const known=new Set<string>(HEALTH_TIMES_CAPABILITIES);
    const capabilities=(Array.isArray(context.capabilities) ? context.capabilities : [])
      .filter((value:unknown):value is HealthTimesCapability=>typeof value==="string" && known.has(value));

    if(typeof context.id!=="string" || !context.id){
      return emptyAuthorizationSnapshot(
        "authenticated-no-staff-authority",
        "The authenticated account does not resolve to an active Newsroom staff profile."
      );
    }

    return {
      status:"authorized",
      staffProfileId:context.id,
      capabilities,
      source:"server",
      reason:"Authority loaded from the certified AG-06/CA-01 Newsroom server context."
    };
  },

  async hasCapability(capability) {
    const snapshot = await this.getSnapshot();
    return hasServerCapability(snapshot, capability);
  }
};

export const stagingDeviceSecurityService: DeviceSecurityService = {
  async getCurrentSession() {
    const supabase = getStagingSupabaseClient();
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;

    return {
      authenticated: Boolean(data.session),
      userId: data.session?.user.id ?? null,
      expiresAt: data.session?.expires_at ?? null,
      remoteSessionManagementAvailable: false
    };
  },

  async requestPushRegistration() {
    return requestPushRegistrationBaseline();
  },

  async getNotificationPreferences() {
    return getNotificationPreferences();
  },

  async saveNotificationPreferences(preferences) {
    await saveNotificationPreferences(preferences);
  }
};
