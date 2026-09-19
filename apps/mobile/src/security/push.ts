import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export type PushRegistrationResult = {
  status:
    | "permission-denied"
    | "configuration-required"
    | "backend-required"
    | "unsupported";
  deviceTokenAvailable: boolean;
  message: string;
};

function resolveProjectId() {
  return Constants.easConfig?.projectId ??
    (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId ??
    null;
}

export async function requestPushRegistrationBaseline(): Promise<PushRegistrationResult> {
  if (Platform.OS === "web") {
    return {
      status: "unsupported",
      deviceTokenAvailable: false,
      message: "Native push registration is available only in iOS/Android development builds."
    };
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
  return {
    status: "backend-required",
    deviceTokenAvailable: Boolean(token.data),
    message:
      "A device push token can be issued, but AG-06 has not supplied a server registration/revocation endpoint. The token is not treated as registered."
  };
}
