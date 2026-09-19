import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
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
        <Stack.Screen name="studio" />
      </Stack>
    </>
  );
}
