import { useLocalSearchParams } from "expo-router";
import { Text, View, StyleSheet } from "react-native";
import { StudioAccessGate, StudioAuthorityGate, StudioPlaceholder, StudioShell } from "../../src/ui/Studio";
import type { HealthTimesCapability } from "../../src/security/capabilities";
import { colors, radius, spacing } from "../../src/theme/tokens";
import { StudioInboxPanel } from "../../src/ui/StudioInbox";
import {
  StudioAssignmentDiscussionPanel,
  StudioAssignmentsPanel,
  StudioBreakingPanel,
  StudioDeskThreadsPanel,
  StudioDesksPanel,
  StudioModerationPanel,
  StudioStoryDiscussionPanel,
  StudioThreadPanel
} from "../../src/ui/StudioCommunications";
import { StudioStories } from "../../src/ui/StudioStories";
import { StudioStoryWorkspace } from "../../src/ui/StudioStoryWorkspace";
import { StudioReviewQueue } from "../../src/ui/StudioReviewQueue";
import { StudioPlanningBoard } from "../../src/ui/StudioPlanningBoard";
import { StudioEditorialCalendar } from "../../src/ui/StudioEditorialCalendar";
import { StudioHomepage } from "../../src/ui/StudioHomepage";
import { StudioMediaLibrary } from "../../src/ui/StudioMediaLibrary";
import { StudioVideoDesk } from "../../src/ui/StudioVideoDesk";
import { StudioLiveDesk } from "../../src/ui/StudioLiveDesk";

export function generateStaticParams() {
  return [
    "inbox", "assignments", "planning", "calendar", "stories", "create-edit", "review-queue", "homepage", "live-desk", "video-desk", "desks", "breaking", "moderation", "media", "advertising", "premium", "social",
    "audience", "search-growth", "analytics", "subscribers", "authors", "staff-roles", "settings"
  ].map((module) => ({ module }));
}

type ModuleConfig={
  title:string;
  owner:string;
  description:string;
  capability:HealthTimesCapability|null;
  readiness:string[];
};

const owners:Record<string,ModuleConfig>={
  "inbox":{title:"Inbox",owner:"CA-01 / AG-06",capability:null,description:"Durable assignments, mentions, reviews, urgent work and announcements. Access requires a server-authorized Newsroom session.",readiness:["Inbox RPC contract defined","No local role authority","Realtime remains event transport only"]},
  "assignments":{title:"Assignments",owner:"CA-01 / AG-06",capability:null,description:"Authoritative story assignments remain in story_assignments; discussion uses a typed assignment thread only.",readiness:["Assignment state remains specialized","Discussion does not duplicate assignment state","RLS scopes each staff session"]},
  "planning":{title:"News Budget / Planning",owner:"HT-NR-03A",capability:null,description:"Operational editorial planning, news budget and assignment management backed by canonical story assignments.",readiness:["Canonical story_assignments authority","Strict assignment.manage capability enforcement","Authoritative server progression (Assigned -> Complete)","Zero fabricated reporters or assignments","Deep workspace handoff to StudioStoryWorkspace"]},
  "calendar":{title:"Editorial Calendar",owner:"HT-NR-03B",capability:null,description:"Read-only editorial calendar and agenda derived from canonical story deadlines, scheduled publications, and server-scoped assignment deadlines.",readiness:["Derived from canonical stories.deadline_at, stories.scheduled_at, and story_assignments.deadline_at","Server-scoped via newsroom_list_stories and assignment RLS","Agenda and 7-day Week views with deterministic urgency","Zero fabricated generic events or historical publication noise","Deep handoffs to Story Workspace, Assignments, and Planning"]},
  "desks":{title:"Desks",owner:"CA-01 / AG-06",capability:null,description:"Private specialist coordination uses Newsroom desk membership and server-enforced thread access.",readiness:["Desk membership is server-owned","Thread access enforced below UI","Presence not used for authority"]},
  "breaking":{title:"Breaking",owner:"CA-01 / AG-06",capability:null,description:"Temporary breaking rooms use bounded membership, durable messages and restrained Presence.",readiness:["Breaking-room contract defined","Durable messages authoritative","Presence is non-authoritative"]},
  "moderation":{title:"Moderation",owner:"CA-01 / AG-06",capability:"comment.moderate",description:"Verified-reader comments remain a separate security domain with human moderation and restriction history.",readiness:["Reader and staff comments remain separate","Canonical story UUID required","Health misinformation requires human review"]},
  "stories":{title:"Stories",owner:"HT-NR-02A",capability:null,description:"Server-backed Newsroom stories, drafts, review states, access policies and editorial lifecycle.",readiness:["Server-backed listing active","Filtered by status, desk and policy","Gated 'New Story' creation"]},
  // In-workspace capability checks: capability:"story.create"
  "create-edit":{title:"Story Workspace",owner:"HT-NR-02A",capability:null,description:"Professional editorial workspace with writing, reporting, canonical metadata, review workflow, history and autosave.",readiness:["Route entry uses StudioAuthorityGate; creation gated inside workspace","Optimistic concurrency with lock_version","Debounced autosave (~10s)","Canonical public author and section authority","Review records and revision restoration"]},
  "review-queue":{title:"Review Queue",owner:"HT-NR-02B",capability:null,description:"Operational editorial review queue and triage desk derived from canonical server story workflow data.",readiness:["Queue derived from canonical server stories","Operational triage filtering: workflow state, desk, reporter, overdue, deadline","Deterministic priority ordering: overdue, imminent deadline, review state urgency","Canonical workspace handoff to StudioStoryWorkspace","Fail-closed empty, unauthorized and error states"]},
  "homepage":{title:"Homepage",owner:"HT-NR-04A",capability:"distribution.manage" as const,description:"Editorial homepage presentation control-plane for Hero, Top Stories, and Curated Sections backed by canonical story distribution metadata.",readiness:["Canonical stories.distribution.homepage metadata authority","Strict distribution.manage capability enforcement","Hero (max 1) and Top Stories (ranks 1-6) curation","Manual curated sections: features, public-health, research, health-business, hiv-aids, global-health, premium, further-coverage","Preserves unknown distribution keys and optimistic lock_version concurrency"]},
  "live-desk":{title:"Live Desk",owner:"HT-NR-05D-A",capability:"story.publish" as const,description:"Canonical live coverage control-plane, scheduling, related story association, and public Live projection.",readiness:["Canonical newsroom_live_coverage authority","Strict story.publish capability enforcement","Optimistic concurrency via lock_version","Upcoming, Live, and Ended lifecycle","Related story and verified public media projection"]},
  "video-desk":{title:"Video Desk",owner:"HT-NR-05C-A",capability:"media.manage" as const,description:"Canonical video desk registry, editorial metadata and readiness operations backed by server video RPCs.",readiness:["Canonical newsroom_videos authority","Strict media.manage capability enforcement","Optimistic concurrency via lock_version","Draft and Ready editorial lifecycle","Related story association and verified destination metadata"]},
  "media":{title:"Media Library",owner:"HT-NR-05A",capability:"media.manage" as const,description:"Canonical media library and metadata operations backed by server media RPCs (newsroom_list_media, newsroom_get_media_preview, newsroom_update_story_media_metadata).",readiness:["Canonical newsroom_list_media authority","Strict media.manage capability enforcement","Authoritative metadata updates via newsroom_update_story_media_metadata","Full mime type classification & storage custody transparency","Safe preview isolation & deep story usage handoff"]},
  "advertising":{title:"Advertising Manager",owner:"AG-05 + AG-06",capability:"ads.view",description:"Campaigns, creatives, placements and approval capabilities stay separate from editorial authority.",readiness:["Reader placements declared","Native provider IDs not certified","Campaign authority pending AG-06"]},
  "premium":{title:"Premium",owner:"AG-05 + AG-06",capability:"premium.manage",description:"Commercial configuration and subscriber entitlements are server enforced; no client-side authority.",readiness:["Store UI fail-closed","Verified native products pending AG-05","Entitlement authority pending AG-06"]},
  "social":{title:"Social Desk",owner:"AG-05 + AG-06",capability:"analytics.view",description:"Publishing attribution and downstream referral measurement use canonical links and real integrations.",readiness:["Canonical share links ready","Attribution taxonomy ready","Provider ingestion pending AG-05"]},
  "audience":{title:"Audience",owner:"AG-05 + AG-06",capability:"analytics.view",description:"Audience intelligence uses real first-party and GA4-derived aggregates only.",readiness:["No fabricated audience totals","Verified aggregates pending AG-05","Access policy pending AG-06"]},
  "search-growth":{title:"Search & Growth",owner:"AG-05 + AG-06",capability:"analytics.view",description:"Search Console, SEO and growth evidence comes from verified external identities and ingestion.",readiness:["Search UI ready","Privacy-safe analytics taxonomy ready","External ingestion pending AG-05"]},
  "analytics":{title:"Analytics & Intelligence",owner:"AG-05 + AG-06",capability:"analytics.view",description:"KPI cards remain empty until AnalyticsService supplies verified metrics. No sample revenue is shown as truth.",readiness:["KPI component language ready","No sample metrics presented as truth","Analytics service pending AG-05"]},
  "subscribers":{title:"Subscribers",owner:"AG-06",capability:"subscriber.view",description:"Subscriber records, entitlements and access are protected server data.",readiness:["Reader identity exists","Subscriber read model pending","Entitlement authority server-only"]},
  "authors":{title:"Authors",owner:"AG-04 + AG-06",capability:"staff.view",description:"Migrated authors and newsroom identity are distinct and reconciled through backend contracts.",readiness:["Author contract exists","Migration reconciliation pending AG-04","Staff mapping pending AG-06"]},
  "staff-roles":{title:"Staff & Roles",owner:"AG-06",capability:"staff.view",description:"Roles are displayed from the server; capabilities are the authorization primitive and users cannot self-escalate.",readiness:["Capability catalogue fixed","No local role selector","Server role read model pending AG-06"]},
  "settings":{title:"Platform Settings",owner:"AG-06",capability:"settings.manage",description:"Privileged settings require server capability enforcement and audit events.",readiness:["Route is capability-gated","No publishable-key privileged writes","Audited settings API pending AG-06"]}
};

export default function StudioModule(){
  const {module,deskId,threadId,assignmentId,storyId}=useLocalSearchParams<{module:string;deskId?:string;threadId?:string;assignmentId?:string;storyId?:string}>();
  const config=owners[String(module)] ?? {
    title:"Studio",
    owner:"AG-06",
    capability:"staff.view" as const,
    description:"This module requires an AG-owned backend contract.",
    readiness:["Backend contract required"]
  };

  const content=(
    <>
      {String(module)!=="stories" && String(module)!=="create-edit" && String(module)!=="review-queue" && String(module)!=="planning" && String(module)!=="calendar" && String(module)!=="homepage" && String(module)!=="media" && String(module)!=="video-desk" && String(module)!=="live-desk" && (
        <StudioPlaceholder owner={config.owner} description={config.description} />
      )}
      {String(module)==="inbox" && <StudioInboxPanel />}
      {String(module)==="assignments" && (assignmentId ? <StudioAssignmentDiscussionPanel assignmentId={String(assignmentId)} /> : <StudioAssignmentsPanel />)}
      {String(module)==="planning" && <StudioPlanningBoard />}
      {String(module)==="calendar" && <StudioEditorialCalendar />}
      {String(module)==="stories" && <StudioStories />}
      {String(module)==="create-edit" && <StudioStoryWorkspace storyId={storyId ? String(storyId) : undefined} />}
      {String(module)==="review-queue" && <StudioReviewQueue />}
      {String(module)==="homepage" && <StudioHomepage />}
      {String(module)==="media" && <StudioMediaLibrary />}
      {String(module)==="video-desk" && <StudioVideoDesk />}
      {String(module)==="live-desk" && <StudioLiveDesk />}
      {String(module)==="desks" && (threadId ? <StudioThreadPanel threadId={String(threadId)} /> : deskId ? <StudioDeskThreadsPanel deskId={String(deskId)} /> : <StudioDesksPanel />)}
      {String(module)==="breaking" && (threadId ? <StudioThreadPanel threadId={String(threadId)} /> : <StudioBreakingPanel />)}
      {String(module)==="moderation" && <StudioModerationPanel />}
      <View style={styles.readiness}>
        <Text style={styles.readinessTitle}>Implementation readiness</Text>
        {config.readiness.map((item)=><View style={styles.readinessRow} key={item}><View style={styles.dot} /><Text style={styles.readinessText}>{item}</Text></View>)}
      </View>
    </>
  );

  return (
    <StudioShell title={config.title}>
      {config.capability
        ? <StudioAccessGate capability={config.capability}>{content}</StudioAccessGate>
        : <StudioAuthorityGate>{content}</StudioAuthorityGate>}
    </StudioShell>
  );
}

const styles=StyleSheet.create({
  readiness:{marginTop:spacing.lg,backgroundColor:"#FFFFFF",borderWidth:1,borderColor:colors.border,borderRadius:radius.md,padding:spacing.xl,gap:spacing.sm},
  readinessTitle:{fontSize:16,fontWeight:"900",color:colors.ink,marginBottom:spacing.xs},
  readinessRow:{flexDirection:"row",gap:spacing.sm,alignItems:"flex-start"},
  dot:{width:8,height:8,borderRadius:4,backgroundColor:colors.blue,marginTop:6},
  readinessText:{fontSize:13,lineHeight:20,color:colors.inkMuted,flex:1}
});
