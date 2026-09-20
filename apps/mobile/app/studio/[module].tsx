import { useLocalSearchParams } from "expo-router";
import { Text, View, StyleSheet } from "react-native";
import { StudioAccessGate, StudioPlaceholder, StudioShell } from "../../src/ui/Studio";
import type { HealthTimesCapability } from "../../src/security/capabilities";
import { colors, radius, spacing } from "../../src/theme/tokens";

export function generateStaticParams() {
  return [
    "stories", "create-edit", "live-desk", "video-desk", "media", "advertising", "premium", "social",
    "audience", "search-growth", "analytics", "subscribers", "authors", "staff-roles", "settings"
  ].map((module) => ({ module }));
}

type ModuleConfig={
  title:string;
  owner:string;
  description:string;
  capability:HealthTimesCapability;
  readiness:string[];
};

const owners:Record<string,ModuleConfig>={
  "stories":{title:"Stories",owner:"AG-06",capability:"story.edit_own",description:"Assignments, drafts, revisions, review and publication must use server-backed capability checks.",readiness:["Draft/review layout ready","Publication authority server-only","Audit trail pending AG-06"]},
  "create-edit":{title:"Create / Edit",owner:"AG-06",capability:"story.create",description:"The story editor is a server-authorized workflow. Draft persistence, revisions, review transitions and publish authority remain backend-owned.",readiness:["Editor shell ready","Draft API pending","Publish action remains gated"]},
  "live-desk":{title:"Live Desk",owner:"AG-04 + AG-06",capability:"story.publish",description:"Live content and media connect to migrated content truth and staff-authorized publishing workflows.",readiness:["Live Reader surface ready","Source data pending AG-04","Publish authority pending AG-06"]},
  "video-desk":{title:"Video Desk",owner:"AG-04 + AG-06",capability:"story.edit_all",description:"Video metadata, media and publishing remain backend-owned.",readiness:["Watch surface ready","Video metadata pending AG-04","Publishing authority pending AG-06"]},
  "media":{title:"Media Library",owner:"AG-04 + AG-06",capability:"story.edit_all",description:"Migrated media, captions, credits, alt text and provenance come from staging Storage and media_assets.",readiness:["Media component language ready","Authoritative assets pending AG-04","Privileged writes pending AG-06"]},
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
  const {module}=useLocalSearchParams<{module:string}>();
  const config=owners[String(module)] ?? {
    title:"Studio",
    owner:"AG-06",
    capability:"staff.view" as const,
    description:"This module requires an AG-owned backend contract.",
    readiness:["Backend contract required"]
  };

  return (
    <StudioShell title={config.title}>
      <StudioAccessGate capability={config.capability}>
        <StudioPlaceholder owner={config.owner} description={config.description} />
        <View style={styles.readiness}>
          <Text style={styles.readinessTitle}>Implementation readiness</Text>
          {config.readiness.map((item)=><View style={styles.readinessRow} key={item}><View style={styles.dot} /><Text style={styles.readinessText}>{item}</Text></View>)}
        </View>
      </StudioAccessGate>
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
