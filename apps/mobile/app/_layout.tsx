import { useEffect } from "react";
import * as Linking from "expo-linking";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AppearanceProvider } from "../src/theme/AppearanceProvider";
import { parseHealthTimesDeepLink } from "../src/growth/deepLinks";
import { services } from "../src/services";

function DeepLinkBridge(){
  const router=useRouter();

  useEffect(()=>{
    let active=true;

    const routeUrl=async(url:string|null)=>{
      if(!active || !url) return;
      const destination=parseHealthTimesDeepLink(url);
      if(destination?.type==="article"){
        router.push(("/article/" + encodeURIComponent(destination.articleId)) as never);
        return;
      }
      if(destination?.type==="article-slug"){
        const article=await services.articles.getBySlug(destination.articleSlug);
        if(active && article){
          router.push(("/article/" + encodeURIComponent(article.id)) as never);
        }
      }
    };

    void Linking.getInitialURL().then((url)=>void routeUrl(url));
    const subscription=Linking.addEventListener("url",({url})=>{void routeUrl(url);});

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
        <Stack.Screen name="search" />
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
