import { useEffect } from "react";
import { Platform } from "react-native";
import * as Linking from "expo-linking";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AppearanceProvider } from "../src/theme/AppearanceProvider";
import { parseHealthTimesDeepLink } from "../src/growth/deepLinks";

function DeepLinkBridge(){
  const router=useRouter();

  useEffect(()=>{
    // On web, Expo Router / browser history already owns the current URL.
    // Re-processing the browser's initial URL can push
    // /article/X while /article/X is already mounted, recreating the route tree.
    if(Platform.OS==="web") return;

    let active=true;

    const routeUrl=(url:string|null)=>{
      if(!active || !url) return;
      const destination=parseHealthTimesDeepLink(url);
      if(destination?.type==="article"){
        router.push(("/article/" + encodeURIComponent(destination.articleId)) as never);
      }
    };

    void Linking.getInitialURL().then(routeUrl);
    const subscription=Linking.addEventListener("url",({url})=>routeUrl(url));

    return ()=>{
      active=false;
      subscription.remove();
    };
  },[router]);

  return null;
}

export default function RootLayout() {
  return (
    <AppearanceProvider>
      <DeepLinkBridge />
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(reader)" />
        <Stack.Screen name="article/[id]" />
        <Stack.Screen name="listen" />
        <Stack.Screen name="saved" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="edition" />
        <Stack.Screen name="premium" />
        <Stack.Screen name="authors" />
        <Stack.Screen name="author/[slug]" />
        <Stack.Screen name="about" />
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
