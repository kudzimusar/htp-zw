import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { StudioPlaceholder, StudioShell } from "../../src/ui/Studio";
import { colors, radius, spacing } from "../../src/theme/tokens";
import { services } from "../../src/services";
import { useAsync } from "../../src/hooks/useAsync";

const actions=[
  ["Inbox","inbox","Assignments, mentions, reviews, urgent work and announcements"],
  ["Assignments","assignments","Authoritative assignments with typed coordination discussions"],
  ["Stories","stories","Draft, review, assignment and publication workflows"],
  ["Create / Edit","create-edit","Server-authorized story creation and editing"],
  ["Live Desk","live-desk","Live blogs, streams and scheduled events"],
  ["Video Desk","video-desk","Video publishing and metadata"],
  ["Desks","desks","Private specialist coordination and assignment discussions"],
  ["Breaking","breaking","Temporary breaking-news coordination rooms"],
  ["Moderation","moderation","Verified-reader comment review and restrictions"],
  ["Advertising","advertising","Campaigns, creatives and placements"],
  ["Analytics","analytics","KPI-first views from AG-05 real services"],
  ["Staff & Roles","staff-roles","Server-authorized staff and capabilities"]
] as const;

const dependencies=[
  ["AG-04","Migrated articles, authors and media","BLOCKED / NOT INTEGRATED"],
  ["AG-05","Verified analytics, ads and growth services","BLOCKED / NOT INTEGRATED"],
  ["AG-06","Server roles, sessions, audit and privileged APIs","CERTIFIED PARENT / CLIENT PROJECTION PENDING"],
  ["CA-01","Inbox, communications and verified-reader discussion","NATIVE CONTRACT INTEGRATION"],
  ["AG-07","Frozen integrated candidate and client UAT","CP7 BLOCKED"]
] as const;

export default function StudioToday(){
  const router=useRouter();
  const authorization=useAsync(()=>services.authorization.getSnapshot(),[]);
  const stories=useAsync(()=>services.articles.getHome(),[]);
  const publication=useAsync(()=>services.publication.getProfile(),[]);
  const authStatus=authorization.data?.status ?? "checking";
  const sourceStories=stories.data ?? [];
  const sourceBacked=sourceStories.filter((story)=>story.sourceProvenance?.system==="wordpress");
  const premiumStories=sourceStories.filter((story)=>story.accessPolicy==="premium");
  const reviewStories=sourceStories.filter((story)=>story.contentIntegrity==="requires-review");
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
        <Text style={styles.sectionTitle}>Publication visibility</Text>
        <Text style={styles.sectionText}>Read-only Reader context is safe to inspect here. It does not grant editorial write authority.</Text>
      </View>

      <View style={styles.statusStrip}>
        <View style={styles.statusBlock}>
          <Text style={styles.statusLabel}>SOURCE-BACKED STORIES</Text>
          <Text style={styles.metricValue}>{sourceBacked.length}</Text>
        </View>
        <View style={styles.statusBlock}>
          <Text style={styles.statusLabel}>PREMIUM-LABELLED</Text>
          <Text style={styles.metricValue}>{premiumStories.length}</Text>
        </View>
        <View style={styles.statusBlock}>
          <Text style={styles.statusLabel}>REQUIRES REVIEW</Text>
          <Text style={styles.metricValue}>{reviewStories.length}</Text>
        </View>
        <View style={styles.statusBlock}>
          <Text style={styles.statusLabel}>PUBLICATION</Text>
          <Text style={styles.statusValue}>{publication.data?.name ?? "HealthTimes"}</Text>
        </View>
      </View>

      {!!sourceBacked.length && (
        <View style={styles.sourcePanel}>
          <View style={styles.sourcePanelHeader}>
            <Text style={styles.sourcePanelTitle}>Current public source context</Text>
            <Text style={styles.sourceBadge}>READ-ONLY</Text>
          </View>
          {sourceBacked.slice(0,5).map((story)=>(
            <View key={story.id} style={styles.sourceRow}>
              <View style={styles.sourceCopy}>
                <Text style={styles.sourceTitle}>{story.title}</Text>
                <Text style={styles.sourceMeta}>
                  {story.author?.displayName ?? "HealthTimes"} · {story.primarySection?.name ?? "Canonical desk pending"}
                </Text>
              </View>
              <Text style={story.accessPolicy==="premium" ? styles.premiumState : styles.publicState}>
                {story.accessPolicy==="premium" ? "PREMIUM" : "PUBLIC"}
              </Text>
            </View>
          ))}
          <Text style={styles.sourceFootnote}>SOURCE-BACKED = public WordPress parity only. AG-04 remains authoritative for migrated story/media records and editorial workflow state.</Text>
        </View>
      )}

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
  metricValue:{fontSize:26,fontWeight:"900",color:colors.ink,letterSpacing:-.5},
  sourcePanel:{marginTop:spacing.lg,backgroundColor:"#FFFFFF",borderWidth:1,borderColor:colors.border,borderRadius:radius.md,overflow:"hidden"},
  sourcePanelHeader:{padding:spacing.lg,flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:spacing.md,borderBottomWidth:1,borderBottomColor:colors.border},
  sourcePanelTitle:{fontSize:16,fontWeight:"900",color:colors.ink},
  sourceBadge:{fontSize:9,fontWeight:"900",letterSpacing:.9,color:colors.blue},
  sourceRow:{padding:spacing.lg,flexDirection:"row",alignItems:"center",gap:spacing.md,borderBottomWidth:1,borderBottomColor:colors.border},
  sourceCopy:{flex:1,gap:3},
  sourceTitle:{fontSize:14,fontWeight:"800",color:colors.ink},
  sourceMeta:{fontSize:11,lineHeight:16,color:colors.inkMuted},
  publicState:{fontSize:9,fontWeight:"900",letterSpacing:.8,color:colors.success},
  premiumState:{fontSize:9,fontWeight:"900",letterSpacing:.8,color:colors.premium},
  sourceFootnote:{fontSize:11,lineHeight:17,color:colors.inkMuted,padding:spacing.lg},
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
