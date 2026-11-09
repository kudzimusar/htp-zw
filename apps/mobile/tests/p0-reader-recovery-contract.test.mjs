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
  assert.match(source,/const feedStale=serviceMode!=="fixture"/);
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
