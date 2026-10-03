import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const PREFIX = "healthtimes.auth.";

const secureOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
};

export const healthTimesAuthStorage = {
  async getItem(key: string) {
    const storageKey = PREFIX + key;
    if (Platform.OS === "web") {
      return AsyncStorage.getItem(storageKey);
    }
    return SecureStore.getItemAsync(storageKey, secureOptions);
  },

  async setItem(key: string, value: string) {
    const storageKey = PREFIX + key;
    if (Platform.OS === "web") {
      await AsyncStorage.setItem(storageKey, value);
      return;
    }
    await SecureStore.setItemAsync(storageKey, value, secureOptions);
  },

  async removeItem(key: string) {
    const storageKey = PREFIX + key;
    if (Platform.OS === "web") {
      await AsyncStorage.removeItem(storageKey);
      return;
    }
    await SecureStore.deleteItemAsync(storageKey, secureOptions);
  }
};
