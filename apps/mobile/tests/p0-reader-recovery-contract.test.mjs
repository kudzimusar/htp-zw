import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"../../..");
const read=(file)=>readFileSync(resolve(root,file),"utf8");

test("article deep links are deduplicated against current browser and router paths",()=>{
  const source=read("apps/mobile/app/_layout.tsx");
  assert.match(source,/const current=normalizedPath\(pathnameRef\.current/);
  assert.match(source,/normalizedPath\(window\.location\.pathname\)/);
  assert.match(source,/if\(current===target \|\| browserPath===target \|\| pendingDestinationRef\.current===target\) return;/);
  assert.match(source,/Linking\.getInitialURL\(\)\.then\(routeUrl\)/);
});

test("Latest is strictly chronological and does not exclude hero or top story",()=>{
  const source=read("apps/mobile/app/(reader)/index.tsx");
  assert.match(source,/const source=sortByPublicationDesc\(home\.data\);/);
  assert.match(source,/const latest=generalStories\.slice\(0,6\);/);
  assert.doesNotMatch(source,/latest=generalStories\.filter\(\(story\)=>!immediateIds\.has\(story\.id\)\)/);
});

test("stale publication feeds are explicitly labeled as archive",()=>{
  const source=read("apps/mobile/app/(reader)/index.tsx");
  assert.match(source,/const feedStale=!home\.loading && serviceMode!=="fixture"/);
  assert.match(source,/ARCHIVED REPORTING/);
  assert.match(source,/feedStale\?"Recent Archive":"Latest"/);
  assert.match(source,/const displayLabel = feedStale && item\.key==="latest" \? "Archive" : item\.label;/);
});

test("P0 CI scope requires ancestry from immutable G3, not G2 staging authorization",()=>{
  const ci=read(".github/workflows/ht-mvp-uiat01-r3-icr05b-certification.yml");
  const refs=ci.match(/git merge-base --is-ancestor 7434e70d632e122a1c3feb773d0a81d2921bc854/g)??[];
  assert.equal(refs.length,2);
  assert.match(ci,/fix\/ht-mvp-owner-uat-p0-/);
  assert.match(ci,/g2StagingUatCertified: false/);
});


test("operational Studio must not allow query-preview impersonation or synthetic today's publish metric",()=>{
  const studio=read("apps/mobile/app/studio/index.tsx");
  const shell=read("apps/mobile/src/ui/Studio.tsx");
  assert.match(studio,/hasExecutiveAccess = authStatus === "authorized" && isExecutiveRole/);
  assert.match(studio,/authorization\.error \|\| authStatus !== "authorized"/);
  assert.match(studio,/Staff authorization required/);
  assert.doesNotMatch(studio,/hasExecutiveAccess = isExecutiveRole \|\| searchParams\.preview/);
  assert.doesNotMatch(studio,/publishedTodayCount=\{sourceStories\.length > 0 \? 1 : 0\}/);
  assert.match(studio,/publishedTodayCount=\{publishedTodayCount\}/);
  assert.doesNotMatch(shell,/Kudzanai Musarurwa|kudzimusar@gmail\.com/);
  assert.match(shell,/hasServerCapability\(snapshot, "story\.create"\)/);
});

test("public articles bypass Premium-only teaser RPC waterfall",()=>{
  const source=read("apps/mobile/src/services/source-parity.ts");
  assert.match(source,/const teaserAuthority=current\.accessPolicy==="premium"\s*\?\s*await boundedTeaserAuthority\(current\)\s*:\s*null;/);
  assert.doesNotMatch(source,/const teaserAuthority=await boundedTeaserAuthority\(current\);/);
});

test("live-source manifest is same-origin, independently hashed and delivers sanitized public bodies and media",()=>{
  const reader=read("apps/mobile/src/services/source-parity.ts");
  const generator=read("scripts/editorial/prepare-p0-public-metadata-manifest.mjs");
  const workflow=read(".github/workflows/ht-mvp-owner-uat-p0-browser-endurance.yml");
  assert.match(reader,/readSameOriginPublicManifest/);
  assert.match(reader,/EXPO_PUBLIC_HT_P0_PUBLIC_MANIFEST_AVAILABLE/);
  assert.match(reader,/url\.origin!==origin/);
  assert.match(reader,/crypto\.subtle\.digest/);
  assert.match(reader,/restrictedBodiesIncluded!==false/);
  assert.match(reader,/if\(!canRefreshPublicSourceFromRuntime\(\)\)/);
  assert.match(generator,/contentBody:article\.contentBody \?\? null/);
  assert.match(generator,/bodyAuthority:article\.contentBody \? "VERIFIED_PUBLIC_PUBLISHED" : "BLOCKED_PENDING_OWNER_CLASSIFICATION"/);
  assert.match(generator,/freshnessSlaVerified:true/);
  assert.match(generator,/contentBodyAvailable:true/);
  // A live publisher classification failure must not suppress the independent
  // lab browser-crash endurance gate. Manifest freshness is certified separately.
  assert.match(workflow,/APP_ENV: development/);
  assert.match(workflow,/EXPO_PUBLIC_HEALTHTIMES_SERVICE_MODE: source-parity/);
  assert.match(workflow,/EXPO_PUBLIC_HT_P0_PUBLIC_MANIFEST_AVAILABLE: "false"/);
  assert.doesNotMatch(workflow,/node scripts\/editorial\/prepare-p0-public-metadata-manifest\.mjs/);
  assert.match(workflow,/test -s apps\/mobile\/dist\/build-info\.json/);
  const publisherWorkflow=read(".github/workflows/ht-mvp-owner-uat-p0-readonly-publisher.yml");
  assert.match(publisherWorkflow,/node scripts\/editorial\/prepare-p0-public-metadata-manifest\.mjs/);
  assert.match(publisherWorkflow,/Prove exact checkout and frozen G3 ancestry/);
});

test("metadata-only stories explain unavailable bodies and offer source continuation",()=>{
  const reader=read("apps/mobile/app/article/[id].tsx");
  assert.match(reader,/Full public article delivery is not yet verified/);
  assert.match(reader,/complete body has not been certified/);
  assert.match(reader,/Continue reading at HealthTimes\.co\.zw/);
});

test("P0 service worker cannot mask editorial freshness, 403s or post-update JS with stale-first caches",()=>{
  const sw=read("apps/mobile/public/sw.js");
  assert.match(sw,/healthtimes-universal-p0-v3/);
  assert.match(sw,/healthtimes-public-feed\.json/);
  assert.match(sw,/isRestrictedPath\(url\.pathname\)/);
  assert.match(sw,/request\.cache === "no-store"/);
  assert.match(sw,/response\.ok && response\.type==="basic"/);
  assert.doesNotMatch(sw,/return cached \|\| network/);
  assert.doesNotMatch(sw,/cache\.put\(request, copy\);\s*return response/);
});

test("unauthorized Studio page does not execute privileged dashboard/inbox services while displaying access guard",()=>{
  const studio=read("apps/mobile/app/studio/index.tsx");
  const shell=read("apps/mobile/src/ui/Studio.tsx");
  for(const service of [
    "newsroomFinance.getOverview",
    "newsroomIntelligence.getEditorialIntelligence",
    "newsroomStaff.getStaffOperationsDirectory",
    "newsroomCommercial.getAdvertisingOverview",
    "newsroomCommercial.getSubscribersDirectory"
  ]){
    assert.match(studio,new RegExp('authorization\\.data\\?\\.status==="authorized"\\s*\\?\\s*services\\.'+service.replaceAll(".","\\.")));
  }
  assert.match(shell,/authorization\.data\?\.status==="authorized" \? services\.newsroomCommunication\.listInbox/);
});
