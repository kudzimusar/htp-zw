import type { PropsWithChildren } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { breakpoints, colors, layout, spacing } from "../theme/tokens";

const modules=[
  ["Today","/studio"],
  ["Stories","/studio/stories"],
  ["Create / Edit","/studio/create-edit"],
  ["Live Desk","/studio/live-desk"],
  ["Video Desk","/studio/video-desk"],
  ["Media","/studio/media"],
  ["Advertising","/studio/advertising"],
  ["Premium","/studio/premium"],
  ["Social Desk","/studio/social"],
  ["Audience","/studio/audience"],
  ["Search & Growth","/studio/search-growth"],
  ["Analytics & Intelligence","/studio/analytics"],
  ["Subscribers","/studio/subscribers"],
  ["Authors","/studio/authors"],
  ["Staff & Roles","/studio/staff-roles"],
  ["Platform Settings","/studio/settings"]
] as const;

export function StudioShell({children,title}:PropsWithChildren<{title:string}>){
  const {width}=useWindowDimensions();
  const router=useRouter();
  const desktop=width>=breakpoints.tablet;
  return (
    <SafeAreaView style={styles.safe} edges={["top","left","right"]}>
      <View style={styles.shell}>
        {desktop && <View style={styles.sidebar}>
          <Pressable onPress={()=>router.push("/" as never)}><Text style={styles.brand}>HealthTimes</Text><Text style={styles.studioLabel}>STUDIO</Text></Pressable>
          <ScrollView contentContainerStyle={styles.nav}>
            {modules.map(([label,path])=><Pressable key={path} style={styles.navItem} onPress={()=>router.push(path as never)}><Text style={styles.navText}>{label}</Text></Pressable>)}
          </ScrollView>
          <Text style={styles.security}>Authority: AG-06 server roles only</Text>
        </View>}
        <ScrollView style={styles.workspace} contentContainerStyle={styles.workspaceContent}>
          <View style={styles.mobileBar}>
            <View><Text style={styles.workspaceBrand}>HealthTimes Studio</Text><Text style={styles.environment}>DEVELOPMENT • NO SERVER AUTHORITY</Text></View>
            <Pressable style={styles.back} onPress={()=>router.push("/" as never)}><Text style={styles.backText}>Reader</Text></Pressable>
          </View>
          <View style={styles.content}>
            <Text style={styles.title}>{title}</Text>
            {!desktop && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mobileNav}>
              {modules.slice(0,7).map(([label,path])=><Pressable key={path} style={styles.mobileNavItem} onPress={()=>router.push(path as never)}><Text style={styles.mobileNavText}>{label}</Text></Pressable>)}
            </ScrollView>}
            {children}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

export function StudioPlaceholder({owner,description}:{owner:string;description:string}){
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderOwner}>{owner}</Text>
      <Text style={styles.placeholderText}>{description}</Text>
      <Text style={styles.placeholderState}>No fabricated production metrics or permissions are shown.</Text>
    </View>
  );
}

const styles=StyleSheet.create({
  safe:{flex:1,backgroundColor:colors.navy},
  shell:{flex:1,flexDirection:"row",backgroundColor:colors.paperMuted},
  sidebar:{width:250,backgroundColor:colors.navy,padding:spacing.xl},
  brand:{fontSize:22,fontWeight:"900",color:"#FFFFFF"},
  studioLabel:{fontSize:10,fontWeight:"900",letterSpacing:1.4,color:"#70D1D1",marginTop:2},
  nav:{paddingVertical:spacing.xl,gap:2},
  navItem:{minHeight:42,justifyContent:"center",paddingHorizontal:spacing.sm},
  navText:{fontSize:13,fontWeight:"700",color:"#D5DFE8"},
  security:{fontSize:10,lineHeight:15,color:"#8FA2B5"},
  workspace:{flex:1,backgroundColor:colors.paperMuted},
  workspaceContent:{minHeight:"100%"},
  mobileBar:{minHeight:72,backgroundColor:"#FFFFFF",borderBottomWidth:1,borderBottomColor:colors.border,paddingHorizontal:spacing.lg,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},
  workspaceBrand:{fontSize:16,fontWeight:"900",color:colors.ink},
  environment:{fontSize:9,fontWeight:"900",color:colors.live,letterSpacing:0.6,marginTop:2},
  back:{minHeight:layout.touchMin,justifyContent:"center",paddingHorizontal:12,borderWidth:1,borderColor:colors.border},
  backText:{fontWeight:"800",color:colors.ink},
  content:{width:"100%",maxWidth:1180,alignSelf:"center",padding:spacing.xl},
  title:{fontSize:30,fontWeight:"900",color:colors.ink,letterSpacing:-0.5},
  mobileNav:{gap:spacing.sm,paddingVertical:spacing.lg},
  mobileNavItem:{minHeight:38,justifyContent:"center",paddingHorizontal:12,backgroundColor:"#FFFFFF",borderWidth:1,borderColor:colors.border},
  mobileNavText:{fontSize:12,fontWeight:"800",color:colors.ink},
  placeholder:{marginTop:spacing.xl,backgroundColor:"#FFFFFF",borderWidth:1,borderColor:colors.border,padding:spacing.xl,gap:spacing.sm},
  placeholderOwner:{fontSize:11,fontWeight:"900",color:colors.blue,letterSpacing:1},
  placeholderText:{fontSize:18,lineHeight:25,fontWeight:"800",color:colors.ink,maxWidth:760},
  placeholderState:{fontSize:13,lineHeight:20,color:colors.inkMuted}
});
