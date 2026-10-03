import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import type { Database } from "../generated/database.types";
import { hasStagingConfig, stagingConfig } from "./config";
import { healthTimesAuthStorage } from "../security/auth-storage";

let client: SupabaseClient<Database> | null = null;

export function getStagingSupabaseClient(): SupabaseClient<Database> {
  if (!hasStagingConfig) {
    throw new Error("HealthTimes staging Supabase configuration is missing or invalid.");
  }

  if (!client) {
    client = createClient<Database>(stagingConfig.url, stagingConfig.publishableKey, {
      auth: {
        storage: healthTimesAuthStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === "web"
      },
      global: {
        headers: {
          "x-healthtimes-client": "reader-nm06"
        }
      }
    });
  }

  return client;
}
