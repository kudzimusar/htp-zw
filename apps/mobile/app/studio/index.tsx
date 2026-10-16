import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { StudioShell } from "../../src/ui/Studio";
import { colors, radius, spacing } from "../../src/theme/tokens";
import { services } from "../../src/services";
import { useAsync } from "../../src/hooks/useAsync";
import { resolveWorkflowStatus } from "../../src/ui/StudioStories";
import { isReviewWorkflowStatus } from "../../src/ui/StudioReviewQueue";
import { ASSIGNMENT_STATUS_SEQUENCE } from "../../src/ui/StudioPlanningBoard";
import {
  computeCalendarSummaryMetrics,
  deriveEditorialCalendarItems,
  getCalendarEventKindLabel
} from "../../src/ui/StudioEditorialCalendar";

const actions=[
  ["Stories","stories","Draft, review, assignment and publication workflows"],
  ["Create / Edit","create-edit","Server-authorized story creation and editing"],
  ["Review Queue","review-queue","Operational editorial review, triage and deadline prioritization"],
  ["Planning / News Budget","planning","Operational editorial planning, news budget and assignment management"],
  ["Assignments","assignments","Authoritative assignments with typed coordination discussions"],
  ["Editorial Calendar","calendar","Chronological editorial agenda for story deadlines, scheduled publications and assignments"],
  ["Inbox","inbox","Assignments, mentions, reviews, urgent work and announcements"]
] as const;

export default function StudioToday(){
  const router=useRouter();
  const authorization=useAsync(()=>services.authorization.getSnapshot(),[]);
  const stories=useAsync(()=>services.articles.getHome(),[]);
  const publication=useAsync(()=>services.publication.getProfile(),[]);
  const authStatus=authorization.data?.status ?? "checking";
  const isAuthorizedStaff=authStatus==="authorized" && authorization.data?.source==="server";

  const newsroomStoriesAsync=useAsync(
    ()=>isAuthorizedStaff ? services.newsroomStories.listStories(200) : Promise.resolve([]),
    [isAuthorizedStaff]
  );
  const newsroomAssignmentsAsync=useAsync(
    ()=>isAuthorizedStaff ? services.newsroomCommunication.listAssignments() : Promise.resolve([]),
    [isAuthorizedStaff]
  );

  const newsroomStories=newsroomStoriesAsync.data ?? [];
  const newsroomAssignments=newsroomAssignmentsAsync.data ?? [];

  const calendarItems=useMemo(
    ()=>deriveEditorialCalendarItems(newsroomStories,newsroomAssignments),
    [newsroomStories,newsroomAssignments]
  );
  const calendarMetrics=useMemo(
    ()=>computeCalendarSummaryMetrics(calendarItems),
    [calendarItems]
  );
  const reviewQueueCount=useMemo(
    ()=>newsroomStories.filter((s)=>isReviewWorkflowStatus(resolveWorkflowStatus(s))).length,
    [newsroomStories]
  );

  const sourceStories=stories.data ?? [];
  const sourceBacked=sourceStories.filter((story)=>story.sourceProvenance?.system==="wordpress");
  const premiumStories=sourceStories.filter((story)=>story.accessPolicy==="premium");

  return (
    <StudioShell title="Today">
      {/* 1. Attention */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Attention</Text>
        <Text style={styles.sectionText}>Immediate newsroom priorities across deadlines, editorial review gates and active assignments.</Text>
      </View>

      <View style={styles.statusStrip}>
        <View style={styles.statusBlock}>
          <Text style={styles.statusLabel}>OVERDUE DEADLINES</Text>
          <Text style={styles.metricValue}>{calendarMetrics.overdueDeadlinesCount}</Text>
        </View>
        <View style={styles.statusBlock}>
          <Text style={styles.statusLabel}>IN REVIEW QUEUE</Text>
          <Text style={styles.metricValue}>{reviewQueueCount}</Text>
        </View>
        <View style={styles.statusBlock}>
          <Text style={styles.statusLabel}>DUE TODAY</Text>
          <Text style={styles.metricValue}>{calendarMetrics.todayCount}</Text>
        </View>
        <View style={styles.statusBlock}>
          <Text style={styles.statusLabel}>SCHEDULED RELEASES</Text>
          <Text style={styles.metricValue}>{calendarMetrics.scheduledPublicationsCount}</Text>
        </View>
      </View>

      {/* 2. Today's Schedule */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Today&apos;s schedule</Text>
        <Text style={styles.sectionText}>Chronological deadlines and scheduled publications from server authority.</Text>
      </View>

      <View style={styles.sourcePanel}>
        <View style={styles.sourcePanelHeader}>
          <Text style={styles.sourcePanelTitle}>Upcoming editorial agenda</Text>
          <Pressable onPress={()=>router.push("/studio/calendar" as never)}>
            <Text style={styles.sourceBadge}>OPEN CALENDAR →</Text>
          </Pressable>
        </View>
        {calendarItems.length===0 ? (
          <Text style={styles.sourceFootnote}>
            {isAuthorizedStaff
              ? "No scheduled deadlines or publications currently active."
              : "Sign in with an active server-authorized Newsroom staff profile to view live editorial deadlines."}
          </Text>
        ) : (
          calendarItems.slice(0,5).map((item)=>(
            <View key={item.id} style={styles.sourceRow}>
              <View style={styles.sourceCopy}>
                <Text style={styles.sourceTitle}>{item.title}</Text>
                <Text style={styles.sourceMeta}>
                  {getCalendarEventKindLabel(item.eventKind)} · {item.workflowOrStatus} · {item.timestamp.slice(0,16).replace("T"," ")} UTC
                </Text>
              </View>
              <Text style={item.isOverdue ? styles.premiumState : styles.publicState}>
                {item.isOverdue ? "OVERDUE" : item.horizonBucket.toUpperCase()}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* 3. Editorial workflow pipeline & 4. Planning summary */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Editorial workflow pipeline & Planning summary</Text>
        <Text style={styles.sectionText}>Active story workflow distribution and news budget assignment stages.</Text>
      </View>

      <View style={styles.statusStrip}>
        {(["Draft","Submitted","Fact check","Health / Science review","Copy edit","Editor review","Ready","Scheduled","Published"] as const).map((stage)=>(
          <View key={stage} style={styles.statusBlock}>
            <Text style={styles.statusLabel}>{stage.toUpperCase()}</Text>
            <Text style={styles.metricValue}>
              {newsroomStories.filter((s)=>resolveWorkflowStatus(s)===stage).length}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.statusStrip}>
        {ASSIGNMENT_STATUS_SEQUENCE.map((status)=>(
          <View key={status} style={styles.statusBlock}>
            <Text style={styles.statusLabel}>ASSIGNMENT · {status.toUpperCase()}</Text>
            <Text style={styles.metricValue}>
              {newsroomAssignments.filter((a)=>a.status===status).length}
            </Text>
          </View>
        ))}
      </View>

      {/* 5. Quick actions */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Quick actions</Text>
        <Text style={styles.sectionText}>Open a daily newsroom workspace module. Each privileged action passes through its server capability gate.</Text>
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

      {/* Demoted governance & publication footer */}
      <View style={styles.governanceFooter}>
        <Text style={styles.governanceFooterText}>
          Publication: {publication.data?.name ?? "HealthTimes"} · Public Feed Stories: {sourceBacked.length} ({premiumStories.length} Premium) · Session Authority: {authStatus} · Release Gate CP7: NOT AUTHORIZED
        </Text>
      </View>
    </StudioShell>
  );
}
const styles=StyleSheet.create({
  statusStrip:{marginTop:spacing.md,flexDirection:"row",flexWrap:"wrap",gap:spacing.sm},
  statusBlock:{minWidth:155,flexGrow:1,backgroundColor:"#FFFFFF",borderWidth:1,borderColor:colors.border,padding:spacing.md,borderRadius:radius.md,gap:4},
  statusLabel:{fontSize:9,fontWeight:"900",letterSpacing:1,color:colors.inkMuted},
  statusValue:{fontSize:14,fontWeight:"900",color:colors.ink,textTransform:"uppercase"},
  metricValue:{fontSize:22,fontWeight:"900",color:colors.ink,letterSpacing:-.5},
  sourcePanel:{marginTop:spacing.md,backgroundColor:"#FFFFFF",borderWidth:1,borderColor:colors.border,borderRadius:radius.md,overflow:"hidden"},
  sourcePanelHeader:{padding:spacing.lg,flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:spacing.md,borderBottomWidth:1,borderBottomColor:colors.border},
  sourcePanelTitle:{fontSize:16,fontWeight:"900",color:colors.ink},
  sourceBadge:{fontSize:10,fontWeight:"900",letterSpacing:.9,color:colors.blue},
  sourceRow:{padding:spacing.lg,flexDirection:"row",alignItems:"center",gap:spacing.md,borderBottomWidth:1,borderBottomColor:colors.border},
  sourceCopy:{flex:1,gap:3},
  sourceTitle:{fontSize:14,fontWeight:"800",color:colors.ink},
  sourceMeta:{fontSize:11,lineHeight:16,color:colors.inkMuted},
  publicState:{fontSize:9,fontWeight:"900",letterSpacing:.8,color:colors.success},
  premiumState:{fontSize:9,fontWeight:"900",letterSpacing:.8,color:colors.live},
  sourceFootnote:{fontSize:12,lineHeight:18,color:colors.inkMuted,padding:spacing.lg},
  sectionHeader:{marginTop:spacing.xl,gap:4},
  sectionTitle:{fontSize:20,fontWeight:"900",color:colors.ink},
  sectionText:{fontSize:13,lineHeight:20,color:colors.inkMuted},
  grid:{marginTop:spacing.md,flexDirection:"row",flexWrap:"wrap",gap:spacing.lg},
  card:{minWidth:240,flex:1,backgroundColor:"#FFFFFF",borderWidth:1,borderColor:colors.border,padding:spacing.xl,gap:spacing.sm,borderRadius:radius.md},
  cardTitle:{fontSize:18,fontWeight:"900",color:colors.ink},
  cardText:{fontSize:13,lineHeight:20,color:colors.inkMuted},
  open:{fontSize:12,fontWeight:"900",color:colors.blue,marginTop:spacing.sm},
  governanceFooter:{marginTop:spacing.xl,paddingTop:spacing.md,borderTopWidth:1,borderTopColor:colors.border},
  governanceFooterText:{fontSize:11,color:colors.inkMuted}
});
