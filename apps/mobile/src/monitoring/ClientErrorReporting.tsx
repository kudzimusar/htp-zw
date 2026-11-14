import { useEffect } from "react";
import { Platform } from "react-native";
import { installClientErrorReporting } from "./client-errors";

/** Installs web error capture once, only when the build configures an endpoint. */
export function ClientErrorReporting() {
  useEffect(() => {
    installClientErrorReporting({ platform: Platform.OS, release: process.env.EXPO_PUBLIC_HEALTHTIMES_RELEASE ?? "unknown" });
  }, []);
  return null;
}
