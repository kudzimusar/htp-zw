import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const read=(path)=>readFileSync(join(root,path),"utf8");

test("Phase 5 Saved exposes only persisted Reader ownership states",()=>{
  const saved=read("app/saved.tsx");
  assert.match(saved,/type LibraryTab = "saved" \| "offline" \| "history"/);
  assert.match(saved,/useLocalSearchParams/);
  assert.match(saved,/Saving a story does not download it for offline reading/);
  assert.match(saved,/Available offline/);
  assert.match(saved,/Premium stories are not stored here without verified offline access/);
  assert.match(saved,/Reading history/);
  assert.match(saved,/services\.reader\.getSavedArticleIds/);
  assert.match(saved,/services\.reader\.getDownloadedArticles/);
  assert.match(saved,/services\.reader\.getReadingHistoryIds/);
  assert.doesNotMatch(saved,/Reader storage boundary|versioned device storage/);
  assert.doesNotMatch(saved,/"videos"|"audio"/);
});

test("Phase 5 My HealthTimes uses server staff authority and truthful account destinations",()=>{
  const my=read("app/(reader)/my.tsx");
  assert.match(my,/services\.authorization\.getSnapshot/);
  assert.match(my,/authorization\.data\?\.status==="authorized"/);
  assert.match(my,/authorization\.data\.source==="server"/);
  assert.match(my,/Boolean\(authorization\.data\.staffProfileId\)/);
  assert.match(my,/staffAuthorized &&/);
  assert.match(my,/HealthTimes Studio/);
  assert.match(my,/\/saved\?tab=saved/);
  assert.match(my,/\/saved\?tab=offline/);
  assert.match(my,/\/saved\?tab=history/);
  assert.match(my,/services\.auth\.signOut/);
  assert.match(my,/HEALTHTIMES PREMIUM/);
  assert.match(my,/store\.data\?\.status==="available"/);
  assert.doesNotMatch(my,/Policy linkage pending|Publication product/);
  assert.doesNotMatch(my,/label:"Security"/);
  assert.doesNotMatch(my,/Sign Out \/ Account deletion/);
});

test("Phase 5 Edition keeps one primary edition and progressively discloses source-backed choices",()=>{
  const edition=read("app/edition.tsx");
  assert.match(edition,/PRIMARY_LIMIT=6/);
  assert.match(edition,/TOPIC_LIMIT=8/);
  assert.match(edition,/services\.taxonomy\.getSnapshot/);
  assert.match(edition,/services\.reader\.getPreferences/);
  assert.match(edition,/accessibilityRole="radiogroup"/);
  assert.match(edition,/accessibilityRole="radio"/);
  assert.match(edition,/Show More Countries\/Regions/);
  assert.match(edition,/Followed Countries & Regions/);
  assert.match(edition,/Content Preferences/);
  assert.match(edition,/Save Preferences/);
  assert.match(edition,/Edition and billing country are different/);
  assert.doesNotMatch(edition,/Popular/);
  assert.doesNotMatch(edition,/Zimbabwe/);
});

test("Phase 5 evidence workflow certifies all ownership surfaces and frozen regressions",()=>{
  const workflow=read("../../.github/workflows/ui04-phase5-reader-ownership.yml");
  for(const viewport of ["390,844","834,1112","1440,1000"]) assert.match(workflow,new RegExp(viewport));
  assert.match(workflow,/pageErrors/);
  assert.match(workflow,/consoleErrors/);
  assert.match(workflow,/React #418/);
  assert.match(workflow,/horizontalOverflow/);
  assert.match(workflow,/mobileTabCount/);
  assert.match(workflow,/dark-my-healthtimes/);
  assert.match(workflow,/dark-saved/);
  assert.match(workflow,/dark-edition/);
  assert.match(workflow,/studioVisible/);
  assert.match(workflow,/phase3-regression-explore/);
  assert.match(workflow,/phase4-regression-watch/);
  assert.match(workflow,/ui03-regression-premium/);
});
