import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import type { Database } from "../generated/database.types";
import { hasStagingConfig, stagingConfig } from "./config";

let client: SupabaseClient<Database> | null = null;

export function getStagingSupabaseClient(): SupabaseClient<Database> {
  if (!hasStagingConfig) {
    throw new Error("HealthTimes staging Supabase configuration is missing or invalid.");
  }

  if (!client) {
    client = createClient<Database>(stagingConfig.url, stagingConfig.publishableKey, {
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
