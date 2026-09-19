import type {
  AuthorizationService,
  DeviceSecurityService
} from "../domain/contracts";
import {
  emptyAuthorizationSnapshot,
  hasServerCapability
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

    return emptyAuthorizationSnapshot(
      "server-policy-unavailable",
      "AG-06 has not certified the server capability policy/read model. Authenticated client state cannot create Studio authority."
    );
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
