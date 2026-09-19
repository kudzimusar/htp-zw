import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import { hasStagingConfig, stagingConfig } from "./config";

let client: SupabaseClient | null = null;

export function getStagingSupabaseClient(): SupabaseClient {
  if (!hasStagingConfig) {
    throw new Error("HealthTimes staging Supabase configuration is missing or invalid.");
  }

  if (!client) {
    client = createClient(stagingConfig.url, stagingConfig.publishableKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === "web"
      },
      global: {
        headers: {
          "x-healthtimes-client": "reader-nm02"
        }
      }
    });
  }

  return client;
}
