import { useLocalSearchParams } from "expo-router";
import { StudioPlaceholder, StudioShell } from "../../src/ui/Studio";

export function generateStaticParams() {
  return [
    "stories", "create-edit", "live-desk", "video-desk", "media", "advertising", "premium", "social",
    "audience", "search-growth", "analytics", "subscribers", "authors", "staff-roles", "settings"
  ].map((module) => ({ module }));
}


const owners:Record<string,{title:string;owner:string;description:string}>={
  "stories":{title:"Stories",owner:"AG-06",description:"Assignments, drafts, revisions, review and publication must use server-backed capability checks."},
  "create-edit":{title:"Create / Edit",owner:"AG-06",description:"The story editor is a server-authorized workflow. Draft persistence, revisions, review transitions and publish authority remain backend-owned."},
  "live-desk":{title:"Live Desk",owner:"AG-04 + AG-06",description:"Live content and media connect to migrated content truth and staff-authorized publishing workflows."},
  "video-desk":{title:"Video Desk",owner:"AG-04 + AG-06",description:"Video metadata, media and publishing remain backend-owned."},
  "media":{title:"Media Library",owner:"AG-04",description:"Migrated media, captions, credits, alt text and provenance come from staging Storage and media_assets."},
  "advertising":{title:"Advertising Manager",owner:"AG-05 + AG-06",description:"Campaigns, creatives, placements and approval capabilities stay separate from editorial authority."},
  "premium":{title:"Premium",owner:"AG-05 + AG-06",description:"Commercial configuration and subscriber entitlements are server enforced; no client-side authority."},
  "social":{title:"Social Desk",owner:"AG-05",description:"Publishing attribution and downstream referral measurement use canonical links and real integrations."},
  "audience":{title:"Audience",owner:"AG-05",description:"Audience intelligence uses real first-party and GA4-derived aggregates only."},
  "search-growth":{title:"Search & Growth",owner:"AG-05",description:"Search Console, SEO and growth evidence comes from verified external identities and ingestion."},
  "analytics":{title:"Analytics & Intelligence",owner:"AG-05",description:"KPI cards remain empty until AnalyticsService supplies verified metrics. No sample revenue is shown as truth."},
  "subscribers":{title:"Subscribers",owner:"AG-06",description:"Subscriber records, entitlements and access are protected server data."},
  "authors":{title:"Authors",owner:"AG-04 + AG-06",description:"Migrated authors and newsroom identity are distinct and reconciled through backend contracts."},
  "staff-roles":{title:"Staff & Roles",owner:"AG-06",description:"Roles are displayed from the server; capabilities are the authorization primitive and users cannot self-escalate."},
  "settings":{title:"Platform Settings",owner:"AG-06",description:"Privileged settings require server capability enforcement and audit events."}
};

export default function StudioModule(){
  const {module}=useLocalSearchParams<{module:string}>();
  const config=owners[String(module)] ?? {title:"Studio",owner:"AG-06",description:"This module requires an AG-owned backend contract."};
  return <StudioShell title={config.title}><StudioPlaceholder owner={config.owner} description={config.description} /></StudioShell>;
}
