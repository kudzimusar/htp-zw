import { useEffect, useState, type PropsWithChildren } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { breakpoints, colors, layout, radius, spacing } from "../theme/tokens";
import { services } from "../services";
import { useAsync } from "../hooks/useAsync";
import { hasServerCapability, type HealthTimesCapability } from "../security/capabilities";

const modules=[
  ["Today","/studio"],
  ["Inbox","/studio/inbox"],
  ["Assignments","/studio/assignments"],
  ["Stories","/studio/stories"],
  ["Create / Edit","/studio/create-edit"],
  ["Live Desk","/studio/live-desk"],
  ["Video Desk","/studio/video-desk"],
  ["Desks","/studio/desks"],
  ["Breaking","/studio/breaking"],
  ["Moderation","/studio/moderation"],
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

function useHydratedStudioWidth(){
  const [responsiveReady,setResponsiveReady]=useState(Platform.OS!=="web");
  const [width,setWidth]=useState(0);

  useEffect(()=>{
    if(Platform.OS!=="web") return;
    const sync=()=>setWidth(window.innerWidth);
    sync();
    window.addEventListener("resize",sync);
    setResponsiveReady(true);
    return ()=>window.removeEventListener("resize",sync);
  },[]);

  if(Platform.OS!=="web") return Number.MAX_SAFE_INTEGER;
  return responsiveReady ? width : 0;
}

function authorizationLabel(status:string|undefined){
  if(status==="authorized") return "SERVER AUTHORIZED";
  if(status==="authenticated-no-staff-authority") return "READER ONLY";
  if(status==="server-policy-unavailable") return "SERVER POLICY PENDING";
  return "NO STAFF AUTHORITY";
}

export function StudioShell({children,title}:PropsWithChildren<{title:string}>){
  const width=useHydratedStudioWidth();
  const router=useRouter();
  const pathname=usePathname();
  const [responsiveReady,setResponsiveReady]=useState(Platform.OS!=="web");
  useEffect(()=>{ if(Platform.OS==="web") setResponsiveReady(true); },[]);
  const desktop=responsiveReady && width>=breakpoints.tablet;
  const authorization=useAsync(()=>services.authorization.getSnapshot(),[]);
  const active=(path:string)=>path==="/studio" ? pathname==="/studio" : pathname===path;
  const status=authorizationLabel(authorization.data?.status);

  return (
    <SafeAreaView style={styles.safe} edges={["top","left","right"]}>
      <View style={styles.shell}>
        {desktop && <View style={styles.sidebar}>
          <Pressable onPress={()=>router.push("/" as never)} accessibilityRole="button">
            <Text style={styles.brand}>HealthTimes</Text>
            <Text style={styles.studioLabel}>STUDIO</Text>
          </Pressable>
          <ScrollView contentContainerStyle={styles.nav}>
            {modules.map(([label,path])=>(
              <Pressable
                key={path}
                style={[styles.navItem,active(path)&&styles.navItemActive]}
                onPress={()=>router.push(path as never)}
                accessibilityState={{selected:active(path)}}
              >
                <Text style={[styles.navText,active(path)&&styles.navTextActive]}>{label}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={styles.securityPanel}>
            <Text style={styles.securityLabel}>{status}</Text>
            <Text style={styles.security}>Authority: AG-06 server roles only</Text>
          </View>
        </View>}
        <ScrollView style={styles.workspace} contentContainerStyle={styles.workspaceContent}>
          <View style={styles.mobileBar}>
            <View style={styles.workspaceIdentity}>
              <Text style={styles.workspaceBrand}>HealthTimes Studio</Text>
              <Text style={styles.environment}>STAGING WORKSPACE • FAIL-CLOSED AUTHORITY</Text>
            </View>
            <View style={styles.topActions}>
              {!desktop && <Text style={styles.mobileStatus}>{status}</Text>}
              <Pressable style={styles.back} onPress={()=>router.push("/" as never)}><Text style={styles.backText}>Reader</Text></Pressable>
            </View>
          </View>
          <View style={styles.content}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>Operational workspace. Production metrics, permissions and publishing authority appear only from certified services.</Text>
            {!desktop && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mobileNav}>
              {modules.map(([label,path])=>(
                <Pressable key={path} style={[styles.mobileNavItem,active(path)&&styles.mobileNavItemActive]} onPress={()=>router.push(path as never)}>
                  <Text style={[styles.mobileNavText,active(path)&&styles.mobileNavTextActive]}>{label}</Text>
                </Pressable>
              ))}
            </ScrollView>}
            {children}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

export function StudioAuthorityGate({children}:PropsWithChildren){
  const authorization=useAsync(()=>services.authorization.getSnapshot(),[]);
  if(authorization.loading){
    return (
      <View style={styles.accessGate}>
        <Text style={styles.accessGateEyebrow}>SERVER AUTHORITY</Text>
        <Text style={styles.accessGateTitle}>Checking Newsroom session…</Text>
      </View>
    );
  }
  const snapshot=authorization.data;
  const allowed=snapshot?.status==="authorized" && snapshot.source==="server";
  if(!allowed){
    return (
      <View style={styles.accessGate}>
        <Text style={styles.accessGateEyebrow}>SERVER AUTHORITY REQUIRED</Text>
        <Text style={styles.accessGateTitle}>This Studio communication module is locked.</Text>
        <Text style={styles.accessGateText}>
          {snapshot?.reason ?? authorization.error?.message ?? "No server-authorized Newsroom session is available."}
        </Text>
        <Text style={styles.accessGateText}>
          Reader authentication, local role labels, client state, or direct navigation cannot create Newsroom authority.
        </Text>
      </View>
    );
  }
  return <>{children}</>;
}

export function StudioAccessGate({
  capability,
  children
}:PropsWithChildren<{capability:HealthTimesCapability}>){
  const authorization=useAsync(()=>services.authorization.getSnapshot(),[capability]);

  if(authorization.loading){
    return (
      <View style={styles.accessGate}>
        <Text style={styles.accessGateEyebrow}>SERVER AUTHORITY</Text>
        <Text style={styles.accessGateTitle}>Checking capability…</Text>
      </View>
    );
  }

  const snapshot=authorization.data;
  const allowed=snapshot ? hasServerCapability(snapshot,capability) : false;
  if(!allowed){
    return (
      <View style={styles.accessGate}>
        <Text style={styles.accessGateEyebrow}>SERVER AUTHORITY REQUIRED</Text>
        <Text style={styles.accessGateTitle}>This Studio module is locked.</Text>
        <View style={styles.capabilityRow}>
          <Text style={styles.capabilityLabel}>Required capability</Text>
          <Text style={styles.capabilityValue}>{capability}</Text>
        </View>
        <Text style={styles.accessGateText}>
          {snapshot?.reason ?? authorization.error?.message ?? "No server capability snapshot is available."}
        </Text>
        <Text style={styles.accessGateText}>
          Signing in, changing local state, editing the client, or navigating directly to this route cannot grant this capability.
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}

export function StudioPlaceholder({owner,description}:{owner:string;description:string}){
  return (
    <View style={styles.placeholder}>
      <View style={styles.ownerRow}>
        <Text style={styles.placeholderOwner}>{owner}</Text>
        <Text style={styles.integrationBadge}>SERVICE-OWNED</Text>
      </View>
      <Text style={styles.placeholderText}>{description}</Text>
      <Text style={styles.placeholderState}>No fabricated production metrics, permissions, revenue, audience totals or workflow authority are shown.</Text>
    </View>
  );
}

const styles=StyleSheet.create({
  safe:{flex:1,backgroundColor:colors.navy},
  shell:{flex:1,flexDirection:"row",backgroundColor:colors.paperMuted},
  sidebar:{width:264,backgroundColor:colors.navy,padding:spacing.xl},
  brand:{fontSize:22,fontWeight:"900",color:"#FFFFFF"},
  studioLabel:{fontSize:10,fontWeight:"900",letterSpacing:1.4,color:"#70D1D1",marginTop:2},
  nav:{paddingVertical:spacing.xl,gap:2},
  navItem:{minHeight:42,justifyContent:"center",paddingHorizontal:spacing.sm,borderLeftWidth:3,borderLeftColor:"transparent"},
  navItemActive:{backgroundColor:"#102A3F",borderLeftColor:"#70D1D1"},
  navText:{fontSize:13,fontWeight:"700",color:"#D5DFE8"},
  navTextActive:{color:"#FFFFFF"},
  securityPanel:{borderTopWidth:1,borderTopColor:"#234057",paddingTop:spacing.md,gap:4},
  securityLabel:{fontSize:9,fontWeight:"900",letterSpacing:0.8,color:"#70D1D1"},
  security:{fontSize:10,lineHeight:15,color:"#8FA2B5"},
  workspace:{flex:1,backgroundColor:colors.paperMuted},
  workspaceContent:{minHeight:"100%"},
  mobileBar:{minHeight:72,backgroundColor:"#FFFFFF",borderBottomWidth:1,borderBottomColor:colors.border,paddingHorizontal:spacing.lg,flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:spacing.md},
  workspaceIdentity:{flex:1},
  workspaceBrand:{fontSize:16,fontWeight:"900",color:colors.ink},
  environment:{fontSize:9,fontWeight:"900",color:colors.live,letterSpacing:0.6,marginTop:2},
  topActions:{flexDirection:"row",alignItems:"center",gap:spacing.sm},
  mobileStatus:{fontSize:9,fontWeight:"900",color:colors.inkMuted},
  back:{minHeight:layout.touchMin,justifyContent:"center",paddingHorizontal:12,borderWidth:1,borderColor:colors.border,borderRadius:radius.sm},
  backText:{fontWeight:"800",color:colors.ink},
  content:{width:"100%",maxWidth:1180,alignSelf:"center",padding:spacing.xl},
  title:{fontSize:30,fontWeight:"900",color:colors.ink,letterSpacing:-0.5},
  subtitle:{fontSize:13,lineHeight:20,color:colors.inkMuted,maxWidth:760,marginTop:spacing.xs},
  mobileNav:{gap:spacing.sm,paddingVertical:spacing.lg,paddingRight:spacing.lg},
  mobileNavItem:{minHeight:40,justifyContent:"center",paddingHorizontal:12,backgroundColor:"#FFFFFF",borderWidth:1,borderColor:colors.border,borderRadius:radius.sm},
  mobileNavItemActive:{borderColor:colors.blue,backgroundColor:"#EEF5FF"},
  mobileNavText:{fontSize:12,fontWeight:"800",color:colors.ink},
  mobileNavTextActive:{color:colors.blue},
  placeholder:{marginTop:spacing.xl,backgroundColor:"#FFFFFF",borderWidth:1,borderColor:colors.border,padding:spacing.xl,gap:spacing.sm,borderRadius:radius.md},
  ownerRow:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:spacing.md,flexWrap:"wrap"},
  placeholderOwner:{fontSize:11,fontWeight:"900",color:colors.blue,letterSpacing:1},
  integrationBadge:{fontSize:9,fontWeight:"900",letterSpacing:0.8,color:colors.inkMuted},
  placeholderText:{fontSize:18,lineHeight:25,fontWeight:"800",color:colors.ink,maxWidth:760},
  placeholderState:{fontSize:13,lineHeight:20,color:colors.inkMuted},
  accessGate:{marginTop:spacing.xl,backgroundColor:"#FFFFFF",borderWidth:1,borderColor:colors.live,padding:spacing.xl,gap:spacing.sm,borderRadius:radius.md},
  accessGateEyebrow:{fontSize:10,fontWeight:"900",letterSpacing:1,color:colors.live},
  accessGateTitle:{fontSize:20,fontWeight:"900",color:colors.ink},
  capabilityRow:{flexDirection:"row",flexWrap:"wrap",gap:spacing.sm,alignItems:"center"},
  capabilityLabel:{fontSize:11,fontWeight:"800",color:colors.inkMuted},
  capabilityValue:{fontSize:11,fontWeight:"900",color:colors.ink,backgroundColor:colors.paperMuted,paddingHorizontal:8,paddingVertical:5},
  accessGateText:{fontSize:14,lineHeight:21,color:colors.inkMuted,maxWidth:760}
});
