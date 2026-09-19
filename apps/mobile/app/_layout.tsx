import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AppearanceProvider } from "../src/theme/AppearanceProvider";

export default function RootLayout() {
  return (
    <AppearanceProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(reader)" />
        <Stack.Screen name="article/[id]" />
        <Stack.Screen name="search" />
        <Stack.Screen name="listen" />
        <Stack.Screen name="saved" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="edition" />
        <Stack.Screen name="premium" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="system-status" />
        <Stack.Screen name="appearance" />
        <Stack.Screen name="growth-status" />
        <Stack.Screen name="notification-settings" />
        <Stack.Screen name="devices-sessions" />
        <Stack.Screen name="account-access" />
        <Stack.Screen name="studio" />
      </Stack>
    </AppearanceProvider>
  );
}
