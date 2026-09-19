import * as Linking from "expo-linking";
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

  async signInWithPassword(email, password) {
    const supabase = getStagingSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { status: "error", message: "Sign-in failed. Check your credentials and account verification state." };
    }
    return { status: "success", message: "Signed in to HealthTimes Staging." };
  },

  async registerReader(email, password, displayName) {
    const supabase = getStagingSupabaseClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName.trim().slice(0, 120) },
        emailRedirectTo: Linking.createURL("account-access") + "?mode=verification"
      }
    });

    if (error) {
      return { status: "error", message: "Registration could not be completed." };
    }

    return data.session
      ? { status: "success", message: "Reader account created and signed in." }
      : {
          status: "verification-required",
          message: "Reader account created. Complete email verification before signing in."
        };
  },

  async requestPasswordReset(email) {
    const supabase = getStagingSupabaseClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: Linking.createURL("account-access") + "?mode=recovery"
    });
    return error
      ? { status: "error", message: "Password reset could not be requested." }
      : {
          status: "success",
          message: "If the account can receive a reset email, HealthTimes has requested one."
        };
  },

  async resendVerification(email) {
    const supabase = getStagingSupabaseClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: Linking.createURL("account-access") + "?mode=verification" }
    });
    return error
      ? { status: "error", message: "Verification email could not be requested." }
      : {
          status: "success",
          message: "If verification is pending, HealthTimes has requested a new verification email."
        };
  },

  async handleAuthCallback(url) {
    const supabase = getStagingSupabaseClient();

    try {
      const normalized = url.includes("#")
        ? url.replace("#", url.includes("?") ? "&" : "?")
        : url;
      const parsed = new URL(normalized);
      const code = parsed.searchParams.get("code");
      const accessToken = parsed.searchParams.get("access_token");
      const refreshToken = parsed.searchParams.get("refresh_token");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          return { status: "error", message: "The account link could not be exchanged for a session." };
        }
        return { status: "success", message: "Account link verified. The secure staging session is active." };
      }

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
        if (error) {
          return { status: "error", message: "The account link could not establish a secure session." };
        }
        return { status: "success", message: "Account link verified. The secure staging session is active." };
      }

      return { status: "blocked", message: "This link does not contain a supported Supabase Auth callback." };
    } catch {
      return { status: "error", message: "The account callback URL is invalid." };
    }
  },

  async completePasswordReset(password) {
    if (password.length < 8) {
      return { status: "error", message: "New password must be at least 8 characters." };
    }

    const supabase = getStagingSupabaseClient();
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      return {
        status: "blocked",
        message: "A verified password-recovery session is required before changing the password."
      };
    }

    const { error } = await supabase.auth.updateUser({ password });
    return error
      ? { status: "error", message: "Password update could not be completed." }
      : { status: "success", message: "Password updated for the current HealthTimes account." };
  },

  async requestAccountDeletion() {
    return {
      status: "server-required",
      message:
        "Account deletion requires an authenticated AG-06 server endpoint with audit and identity-provider deletion. The mobile client cannot delete Auth users directly."
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
