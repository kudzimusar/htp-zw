import { Tabs } from "expo-router";
import { useWindowDimensions } from "react-native";
import { breakpoints, colors } from "../../src/theme/tokens";

export default function ReaderTabs() {
  const { width }=useWindowDimensions();
  const desktop=width >= breakpoints.desktop;
  return (
    <Tabs
      screenOptions={{
        headerShown:false,
        tabBarActiveTintColor:colors.blue,
        tabBarInactiveTintColor:colors.inkMuted,
        tabBarStyle: desktop ? { display:"none" } : {
          minHeight:64,
          borderTopColor:colors.border,
          backgroundColor:colors.paper
        },
        tabBarLabelStyle:{fontSize:11,fontWeight:"800",paddingBottom:6}
      }}
    >
      <Tabs.Screen name="index" options={{title:"Home"}} />
      <Tabs.Screen name="explore" options={{title:"Explore"}} />
      <Tabs.Screen name="live" options={{title:"Live"}} />
      <Tabs.Screen name="watch" options={{title:"Watch"}} />
      <Tabs.Screen name="my" options={{title:"My HT"}} />
    </Tabs>
  );
}
