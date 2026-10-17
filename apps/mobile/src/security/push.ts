import Constants from "expo-constants";
import { Platform } from "react-native";

export type PushRegistrationResult = {
  status:
    | "permission-denied"
    | "configuration-required"
    | "backend-required"
    | "unsupported"
    | "registered"
    | "error";
  deviceTokenAvailable: boolean;
  message: string;
};

export type PushRegistrationOptions = {
  registerRpc?: (
    token: string,
    platform: "ios" | "android"
  ) => Promise<{ device_id: string; status: string }>;
};

function resolveProjectId() {
  return Constants.easConfig?.projectId ??
    (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId ??
    null;
}

export async function requestPushRegistrationBaseline(
  options?: PushRegistrationOptions
): Promise<PushRegistrationResult> {
  if (Platform.OS === "web") {
    return {
      status: "unsupported",
      deviceTokenAvailable: false,
      message: "Native push registration is available only in iOS/Android development builds."
    };
  }

  try {
    // Ordinary Reader startup must not initialize the native notifications
    // registration module. Load it only after the reader explicitly requests
    // native push setup.
    const Notifications = await import("expo-notifications");

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "HealthTimes",
        importance: Notifications.AndroidImportance.DEFAULT
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    const permission =
      existing.status === "granted"
        ? existing
        : await Notifications.requestPermissionsAsync();

    if (permission.status !== "granted") {
      return {
        status: "permission-denied",
        deviceTokenAvailable: false,
        message: "Notification permission was not granted."
      };
    }

    const projectId = resolveProjectId();
    if (!projectId) {
      return {
        status: "configuration-required",
        deviceTokenAvailable: false,
        message: "EAS project identity is not configured for push-token issuance."
      };
    }

    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!token?.data) {
      return {
        status: "error",
        deviceTokenAvailable: false,
        message: "Push token issuance returned empty data."
      };
    }

    if (options?.registerRpc) {
      const platform = Platform.OS === "ios" ? "ios" : "android";
      try {
        const result = await options.registerRpc(token.data, platform);
        if (result && result.status === "active") {
          return {
            status: "registered",
            deviceTokenAvailable: true,
            message: "Push notification device registration successful."
          };
        }
        return {
          status: "error",
          deviceTokenAvailable: false,
          message: "Server push registration rejected."
        };
      } catch {
        return {
          status: "error",
          deviceTokenAvailable: false,
          message: "Server push registration RPC failed."
        };
      }
    }

    return {
      status: "backend-required",
      deviceTokenAvailable: Boolean(token.data),
      message:
        "A device push token can be issued, but AG-06 has not supplied a server registration/revocation endpoint. The token is not treated as registered."
    };
  } catch {
    return {
      status: "error",
      deviceTokenAvailable: false,
      message: "Native push setup could not be completed on this device."
    };
  }
}

