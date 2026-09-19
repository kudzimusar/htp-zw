import type { AuthService, PlatformService } from "../domain/contracts";
import type { ReaderProfile } from "../domain/models";
import { checkStagingConnectivity } from "../platform/connectivity";
import { getStagingSupabaseClient } from "../platform/supabase";

const anonymousReader: ReaderProfile = {
  id: "anonymous",
  displayName: "Reader",
  membership: "anonymous"
};

export const stagingAuthService: AuthService = {
  async getReader() {
    const supabase = getStagingSupabaseClient();
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    const user = data.session?.user;
    if (!user) return anonymousReader;

    return {
      id: user.id,
      displayName:
        typeof user.user_metadata?.display_name === "string"
          ? user.user_metadata.display_name
          : user.email ?? "HealthTimes Reader",
      membership: "registered"
    };
  },

  async getSessionState() {
    const supabase = getStagingSupabaseClient();
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return {
      authenticated: Boolean(data.session),
      userId: data.session?.user.id ?? null,
      expiresAt: data.session?.expires_at ?? null
    };
  },

  async signOut() {
    const supabase = getStagingSupabaseClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }
};

export const stagingPlatformService: PlatformService = {
  async checkConnectivity() {
    return checkStagingConnectivity();
  }
};
