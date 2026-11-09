import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Linking from "expo-linking";
import { Stack, usePathname, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AppearanceProvider } from "../src/theme/AppearanceProvider";
import { parseHealthTimesDeepLink } from "../src/growth/deepLinks";

function DeepLinkBridge(){
  const router=useRouter();
  const pathname=usePathname();
  const pathnameRef=useRef(pathname);
  const initialUrlProcessedRef=useRef(false);
  const pendingDestinationRef=useRef<string|null>(null);
  pathnameRef.current=pathname;

  useEffect(()=>{
    let active=true;
    const normalizedPath=(path:string)=>path.replace(/\\/+$/,"") || "/";

    const routeUrl=(url:string|null)=>{
      if(!active || !url) return;
      const destination=parseHealthTimesDeepLink(url);
      if(destination?.type!=="article") return;

      const target="/article/"+encodeURIComponent(destination.articleId);
      const current=normalizedPath(pathnameRef.current || "/");
      const browserPath=Platform.OS==="web" && typeof window!=="undefined"
        ? normalizedPath(window.location.pathname)
        : null;

      // Expo Linking can report the address already being rendered as its
      // initial deep link. Pushing that route again can duplicate history and
      // remount the ArticleReader while it is still hydrating.
      if(current===target || browserPath===target || pendingDestinationRef.current===target) return;
      pendingDestinationRef.current=target;
      router.push(target as never);
    };

    if(!initialUrlProcessedRef.current){
      initialUrlProcessedRef.current=true;
      void Linking.getInitialURL().then(routeUrl).catch((reason)=>{
        console.error("[HealthTimes] Initial deep-link resolution failed",reason);
      });
    }
    const subscription=Linking.addEventListener("url",({url})=>routeUrl(url));

    return ()=>{
      active=false;
      subscription.remove();
    };
  },[router]);

  useEffect(()=>{
    if(pendingDestinationRef.current===pathname){
      pendingDestinationRef.current=null;
    }
  },[pathname]);

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
