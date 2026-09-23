import { Tabs } from "expo-router";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import type { ColorValue } from "react-native";
import { breakpoints } from "../../src/theme/tokens";
import { useAppearance } from "../../src/theme/AppearanceProvider";

type TabIconKind="home"|"explore"|"live"|"watch"|"profile";

function TabIcon({kind,color,focused}:{kind:TabIconKind;color:ColorValue;focused:boolean}){
  if(kind==="explore"){
    return (
      <View style={[styles.exploreIcon,{borderColor:color}]}>
        <View style={[styles.exploreDot,{backgroundColor:color}]} />
      </View>
    );
  }
  if(kind==="live"){
    return (
      <View style={[styles.liveRing,{borderColor:color}]}>
        <View style={[styles.liveDot,{backgroundColor:color}]} />
      </View>
    );
  }
  if(kind==="watch"){
    return (
      <View style={[styles.watchIcon,{borderColor:color}]}>
        <View style={[styles.watchGlyph,{borderLeftColor:color}]} />
      </View>
    );
  }
  if(kind==="profile"){
    return (
      <View style={styles.profileIcon}>
        <View style={[styles.profileHead,{borderColor:color,backgroundColor:focused?color:"transparent"}]} />
        <View style={[styles.profileBody,{borderColor:color}]} />
      </View>
    );
  }
  return (
    <View style={[styles.homeIcon,{borderColor:color}]}>
      <View style={[styles.homeRoof,{borderLeftColor:color,borderTopColor:color}]} />
    </View>
  );
}

export default function ReaderTabs() {
  const { width }=useWindowDimensions();
  const { palette }=useAppearance();
  const desktop=width >= breakpoints.desktop;

  const icon=(kind:TabIconKind)=>
    ({color,focused}:{color:ColorValue;focused:boolean;size:number})=><TabIcon kind={kind} color={color} focused={focused} />;

  return (
    <Tabs
      tabBar={desktop ? () => null : undefined}
      screenOptions={{
        headerShown:false,
        tabBarActiveTintColor:palette.blue,
        tabBarInactiveTintColor:palette.inkMuted,
        tabBarStyle: desktop ? { display:"none" } : {
          minHeight:72,
          borderTopColor:palette.border,
          backgroundColor:palette.paper,
          paddingTop:5
        },
        tabBarItemStyle:{minHeight:60},
        tabBarLabelStyle:{fontSize:10,fontWeight:"800",paddingBottom:7}
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

const styles=StyleSheet.create({
  homeIcon:{width:18,height:16,borderWidth:2,borderRadius:3,marginTop:5,position:"relative"},
  homeRoof:{position:"absolute",width:11,height:11,borderLeftWidth:2,borderTopWidth:2,transform:[{rotate:"45deg"}],top:-7,left:2.5,backgroundColor:"transparent"},
  exploreIcon:{width:20,height:20,borderRadius:10,borderWidth:2,alignItems:"center",justifyContent:"center"},
  exploreDot:{width:5,height:5,borderRadius:3},
  liveRing:{width:20,height:20,borderRadius:10,borderWidth:2,alignItems:"center",justifyContent:"center"},
  liveDot:{width:7,height:7,borderRadius:4},
  watchIcon:{width:23,height:17,borderRadius:4,borderWidth:2,alignItems:"center",justifyContent:"center"},
  watchGlyph:{width:0,height:0,borderTopWidth:4,borderBottomWidth:4,borderLeftWidth:6,borderTopColor:"transparent",borderBottomColor:"transparent",marginLeft:2},
  profileIcon:{width:22,height:21,alignItems:"center",justifyContent:"flex-end"},
  profileHead:{position:"absolute",top:0,width:9,height:9,borderRadius:5,borderWidth:2},
  profileBody:{width:18,height:10,borderTopLeftRadius:9,borderTopRightRadius:9,borderWidth:2,borderBottomWidth:0}
});
