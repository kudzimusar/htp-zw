import { useEffect, useState } from "react";
import { Tabs } from "expo-router";
import { Platform, useWindowDimensions } from "react-native";
import type { ColorValue } from "react-native";
import { SymbolView } from "expo-symbols";
import { breakpoints } from "../../src/theme/tokens";
import { useAppearance } from "../../src/theme/AppearanceProvider";

type TabIconKind="home"|"explore"|"live"|"watch"|"profile";

function TabIcon({kind,color,focused}:{kind:TabIconKind;color:ColorValue;focused:boolean}){
  const names={
    home:{
      ios: focused ? "house.fill" : "house",
      android:"home",
      web:"home"
    },
    explore:{
      ios: focused ? "safari.fill" : "safari",
      android:"explore",
      web:"explore"
    },
    live:{
      ios:"dot.radiowaves.left.and.right",
      android:"sensors",
      web:"sensors"
    },
    watch:{
      ios: focused ? "play.rectangle.fill" : "play.rectangle",
      android:"smart_display",
      web:"smart_display"
    },
    profile:{
      ios: focused ? "person.crop.circle.fill" : "person.crop.circle",
      android:"account_circle",
      web:"account_circle"
    }
  } as const;

  return (
    <SymbolView
      name={names[kind]}
      tintColor={color}
      size={23}
      type={focused ? "hierarchical" : "monochrome"}
    />
  );
}

export default function ReaderTabs() {
  const { width }=useWindowDimensions();
  const { palette }=useAppearance();
  const [responsiveReady,setResponsiveReady]=useState(Platform.OS!=="web");
  useEffect(()=>{ if(Platform.OS==="web") setResponsiveReady(true); },[]);
  const desktop=responsiveReady && width >= breakpoints.desktop;

  const icon=(kind:TabIconKind)=>
    ({color,focused}:{color:ColorValue;focused:boolean;size:number})=><TabIcon kind={kind} color={color} focused={focused} />;

  return (
    <Tabs
      key={palette.paper + "|" + palette.ink}
      tabBar={desktop ? () => null : undefined}
      screenOptions={{
        headerShown:false,
        tabBarActiveTintColor:palette.blue,
        tabBarInactiveTintColor:palette.inkMuted,
        tabBarHideOnKeyboard:true,
        tabBarStyle: desktop ? { display:"none" } : {
          minHeight:66,
          borderTopColor:palette.border,
          backgroundColor:palette.paper,
          paddingTop:4
        },
        tabBarItemStyle:{minHeight:56},
        tabBarLabelStyle:{fontSize:9,fontWeight:"800",paddingBottom:5}
      }}
    >
      <Tabs.Screen name="index" options={{title:"Home",tabBarIcon:icon("home")}} />
      <Tabs.Screen name="explore" options={{title:"Explore",tabBarIcon:icon("explore")}} />
      <Tabs.Screen name="live" options={{title:"Live",tabBarIcon:icon("live")}} />
      <Tabs.Screen name="watch" options={{title:"Watch",tabBarIcon:icon("watch")}} />
      <Tabs.Screen name="my" options={{title:"My HT",tabBarIcon:icon("profile")}} />
    </Tabs>
  );
}
