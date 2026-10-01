import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const read=(path)=>readFileSync(join(root,path),"utf8");

test("Phase 3 Explore uses source-backed progressive discovery rather than a taxonomy dump",()=>{
  const explore=read("app/(reader)/explore.tsx");
  assert.match(explore,/services\.taxonomy\.getSnapshot/);
  assert.match(explore,/services\.articles\.getHome/);
  assert.match(explore,/Explore by topic/);
  assert.match(explore,/Browse all discovery options/);
  assert.match(explore,/accessibilityState=\{\{expanded\}\}/);
  assert.match(explore,/primaryShortcuts/);
  assert.match(explore,/StoryList/);
  assert.doesNotMatch(explore,/StoryGrid/);
  assert.doesNotMatch(explore,/TAXONOMY GATEWAY|CANONICAL|LEGACY|Canonical desks|Legacy publication categories/);
  assert.doesNotMatch(explore,/popular|trending|viewer count|trend score/i);
});

test("Phase 3 Intelligent Search preserves service authority and adds progressive states",()=>{
  const search=read("app/search.tsx");
  assert.match(search,/services\.search\.search/);
  assert.match(search,/query_redacted:true/);
  assert.match(search,/Raw health search words are not sent/);
  assert.match(search,/Suggested searches/);
  assert.match(search,/Searching HealthTimes/);
  assert.match(search,/Search is temporarily unavailable/);
  assert.match(search,/No HealthTimes results found/);
  assert.match(search,/Show search filters/);
  assert.match(search,/accessibilityState=\{\{expanded:filtersOpen\}\}/);
  assert.match(search,/Authors/);
  assert.match(search,/StoryList/);
  assert.match(search,/VideoCard/);
  assert.match(search,/AudioCard/);
  assert.match(search,/LiveRail/);
  assert.match(search,/Platform\.OS==="web"/);
  assert.match(search,/inputRef\.current\?\.focus/);
  assert.doesNotMatch(search,/AI answer|generated health advice|semantic answer|autocomplete/i);
});

test("Phase 3 evidence workflow proves exact head, responsive states and Phase 2 smoke",()=>{
  const workflow=read("../.github/workflows/ui01-phase3-discovery.yml");
  assert.match(workflow,/Prove exact candidate checkout/);
  assert.match(workflow,/390,844/);
  assert.match(workflow,/834,1112/);
  assert.match(workflow,/1440,1000/);
  assert.match(workflow,/Minified React error #418/);
  assert.match(workflow,/horizontalOverflow/);
  assert.match(workflow,/search-initial/);
  assert.match(workflow,/search-populated/);
  assert.match(workflow,/search-no-results/);
  assert.match(workflow,/search-loading/);
  assert.match(workflow,/dark-explore/);
  assert.match(workflow,/dark-search/);
  assert.match(workflow,/article-phase2-regression/);
  assert.match(workflow,/premium-phase2-regression/);
});
