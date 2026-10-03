import AsyncStorage from "@react-native-async-storage/async-storage";

export type NotificationPreferences = {
  breaking: boolean;
  live: boolean;
  followedTopics: boolean;
  premium: boolean;
  system: boolean;
};

const KEY = "ht:nm06:notification-preferences:v1";

const defaults: NotificationPreferences = {
  breaking: true,
  live: true,
  followedTopics: true,
  premium: true,
  system: true
};

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return defaults;
  try {
    const parsed = JSON.parse(raw) as Partial<NotificationPreferences>;
    return {
      breaking: parsed.breaking !== false,
      live: parsed.live !== false,
      followedTopics: parsed.followedTopics !== false,
      premium: parsed.premium !== false,
      system: parsed.system !== false
    };
  } catch {
    return defaults;
  }
}

export async function saveNotificationPreferences(preferences: NotificationPreferences) {
  await AsyncStorage.setItem(KEY, JSON.stringify(preferences));
}
