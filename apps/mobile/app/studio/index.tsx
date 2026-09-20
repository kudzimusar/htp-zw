import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { StudioPlaceholder, StudioShell } from "../../src/ui/Studio";
import { colors, radius, spacing } from "../../src/theme/tokens";
import { services } from "../../src/services";
import { useAsync } from "../../src/hooks/useAsync";

const actions=[
  ["Stories","stories","Draft, review, assignment and publication workflows"],
  ["Create / Edit","create-edit","Server-authorized story creation and editing"],
  ["Live Desk","live-desk","Live blogs, streams and scheduled events"],
  ["Video Desk","video-desk","Video publishing and metadata"],
  ["Advertising","advertising","Campaigns, creatives and placements"],
  ["Analytics","analytics","KPI-first views from AG-05 real services"],
  ["Staff & Roles","staff-roles","Server-authorized staff and capabilities"]
] as const;

const dependencies=[
  ["AG-04","Migrated articles, authors and media","BLOCKED / NOT INTEGRATED"],
  ["AG-05","Verified analytics, ads and growth services","BLOCKED / NOT INTEGRATED"],
  ["AG-06","Server roles, sessions, audit and privileged APIs","BLOCKED / NOT INTEGRATED"],
  ["AG-07","Frozen integrated candidate and client UAT","CP7 BLOCKED"]
] as const;

export default function StudioToday(){
  const router=useRouter();
  const authorization=useAsync(()=>services.authorization.getSnapshot(),[]);
  const authStatus=authorization.data?.status ?? "checking";
  return (
    <StudioShell title="Today">
      <StudioPlaceholder owner="AG-06 / AG-05" description="Studio layout and capability gates are ready for service integration, but newsroom identity, permissions, analytics and commercial data remain service-owned and are not invented by the client." />

      <View style={styles.statusStrip}>
        <View style={styles.statusBlock}>
          <Text style={styles.statusLabel}>AUTHORITY STATE</Text>
          <Text style={styles.statusValue}>{authStatus}</Text>
        </View>
        <View style={styles.statusBlock}>
          <Text style={styles.statusLabel}>CP7</Text>
          <Text style={styles.statusValue}>BLOCKED</Text>
        </View>
        <View style={styles.statusBlock}>
          <Text style={styles.statusLabel}>PRODUCTION CUTOVER</Text>
          <Text style={styles.statusValue}>NOT AUTHORIZED</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Workspace</Text>
        <Text style={styles.sectionText}>Open a module. Each privileged action still passes through its server capability gate.</Text>
      </View>

      <View style={styles.grid}>
        {actions.map(([title,path,description])=>(
          <Pressable key={path} style={styles.card} onPress={()=>router.push(("/studio/"+path) as never)}>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.cardText}>{description}</Text>
            <Text style={styles.open}>Open →</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Integration dependencies</Text>
        <Text style={styles.sectionText}>These are backend programme gates, not UI blockers.</Text>
      </View>
      <View style={styles.dependencies}>
        {dependencies.map(([owner,description,state])=>(
          <View style={styles.dependencyRow} key={owner}>
            <View style={styles.dependencyOwner}><Text style={styles.dependencyOwnerText}>{owner}</Text></View>
            <View style={styles.dependencyCopy}>
              <Text style={styles.dependencyDescription}>{description}</Text>
              <Text style={styles.dependencyState}>{state}</Text>
            </View>
          </View>
        ))}
      </View>
    </StudioShell>
  );
}
const styles=StyleSheet.create({
  statusStrip:{marginTop:spacing.xl,flexDirection:"row",flexWrap:"wrap",gap:spacing.sm},
  statusBlock:{minWidth:190,flexGrow:1,backgroundColor:"#FFFFFF",borderWidth:1,borderColor:colors.border,padding:spacing.lg,borderRadius:radius.md,gap:4},
  statusLabel:{fontSize:9,fontWeight:"900",letterSpacing:1,color:colors.inkMuted},
  statusValue:{fontSize:14,fontWeight:"900",color:colors.ink,textTransform:"uppercase"},
  sectionHeader:{marginTop:spacing.xl,gap:4},
  sectionTitle:{fontSize:20,fontWeight:"900",color:colors.ink},
  sectionText:{fontSize:13,lineHeight:20,color:colors.inkMuted},
  grid:{marginTop:spacing.lg,flexDirection:"row",flexWrap:"wrap",gap:spacing.lg},
  card:{minWidth:240,flex:1,backgroundColor:"#FFFFFF",borderWidth:1,borderColor:colors.border,padding:spacing.xl,gap:spacing.sm,borderRadius:radius.md},
  cardTitle:{fontSize:18,fontWeight:"900",color:colors.ink},
  cardText:{fontSize:13,lineHeight:20,color:colors.inkMuted},
  open:{fontSize:12,fontWeight:"900",color:colors.blue,marginTop:spacing.sm},
  dependencies:{marginTop:spacing.lg,backgroundColor:"#FFFFFF",borderWidth:1,borderColor:colors.border,borderRadius:radius.md,overflow:"hidden"},
  dependencyRow:{minHeight:72,flexDirection:"row",gap:spacing.md,alignItems:"center",padding:spacing.lg,borderBottomWidth:1,borderBottomColor:colors.border},
  dependencyOwner:{minWidth:64,alignItems:"center",justifyContent:"center",paddingVertical:8,backgroundColor:colors.navy},
  dependencyOwnerText:{color:"#FFFFFF",fontSize:11,fontWeight:"900"},
  dependencyCopy:{flex:1,gap:3},
  dependencyDescription:{fontSize:14,fontWeight:"800",color:colors.ink},
  dependencyState:{fontSize:11,fontWeight:"800",color:colors.warning}
});
