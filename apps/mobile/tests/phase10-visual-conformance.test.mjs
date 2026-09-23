import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

function read(relative){
  return fs.readFileSync(new URL(relative, import.meta.url),"utf8");
}

const home=read("../app/(reader)/index.tsx");
const tabs=read("../app/(reader)/_layout.tsx");
const layout=read("../src/ui/Layout.tsx");
const article=read("../app/article/[id].tsx");
const my=read("../app/(reader)/my.tsx");
const onboarding=read("../app/onboarding.tsx");
const cards=read("../src/ui/Cards.tsx");
const premium=read("../app/premium.tsx");
const premiumStore=read("../src/growth/premium-store.ts");
const explore=read("../app/(reader)/explore.tsx");
const listen=read("../app/listen.tsx");
const notifications=read("../app/notifications.tsx");

test("Phase 10 Home hydration keeps React Hook order stable",()=>{
  assert.doesNotMatch(home,/useMemo\s*\(/);
  assert.match(home,/if \(home\.loading\)/);
  assert.match(home,/const filteredStories=\(\(\)=>\{/);
  assert.match(home,/SectionHeader title="Top Stories"/);
});

test("Phase 10 responsive shell hydrates deterministically before viewport structural changes",()=>{
  assert.match(tabs,/useState\(Platform\.OS!==["']web["']\)/);
  assert.match(tabs,/responsiveReady && width >= breakpoints\.desktop/);
  assert.match(tabs,/tabBar=\{desktop \? \(\) => null : undefined\}/);
  assert.match(layout,/function useHydratedWindowWidth\(\)/);
  assert.match(layout,/return responsiveReady \? width : 0/);
  assert.match(tabs,/Home/);
  assert.match(tabs,/Explore/);
  assert.match(tabs,/Live/);
  assert.match(tabs,/Watch/);
  assert.match(tabs,/My HT/);
});

test("Phase 10 shared Reader chrome exposes truthful Premium discovery",()=>{
  assert.match(layout,/accessibilityLabel="HealthTimes Premium"/);
  assert.match(layout,/>Premium<\/Text>/);
  assert.match(layout,/chrome\?: boolean/);
});

test("Phase 10 public Article Reader hides migration-internal taxonomy labels",()=>{
  assert.doesNotMatch(article,/Canonical desk/);
  assert.doesNotMatch(article,/Legacy source taxonomy/);
  assert.match(article,/story\.primarySection\?\.name \?\? "HealthTimes"/);
  assert.match(article,/story\.geography\.map/);
});

test("Phase 10 My HealthTimes leads with personal controls and omits internal readiness affordances",()=>{
  assert.doesNotMatch(my,/System Status/);
  assert.doesNotMatch(my,/Growth & Commercial Readiness/);
  assert.doesNotMatch(my,/Payment Methods/);
  assert.doesNotMatch(my,/appEnvironment/);
  assert.ok(my.indexOf('{groups.map') < my.indexOf('title="HealthTimes" eyebrow="PUBLICATION & INSTITUTIONAL"'));
});

test("Phase 10 Explore and secondary surfaces use reader-facing language",()=>{
  for(const term of ["TAXONOMY GATEWAY","CANONICAL","LEGACY","Canonical desks","Legacy publication categories"]){
    assert.doesNotMatch(explore,new RegExp(term));
  }
  assert.match(explore,/Editorial desks/);
  assert.match(explore,/Topics & categories/);
  assert.doesNotMatch(listen,/certified media playback adapter|later media playback lane|Classification metadata required/);
  assert.doesNotMatch(notifications,/Notification authority/);
});

test("Phase 10 onboarding uses focused welcome chrome",()=>{
  assert.match(onboarding,/<Page chrome=\{false\}>/);
  assert.match(onboarding,/Welcome to HealthTimes/);
  assert.match(onboarding,/Existing account\? Sign in/);
});

test("Phase 10 preserves fail-closed direct advertising and Premium commerce truth",()=>{
  assert.match(cards,/const clickable=\/\^https:\\\/\\\/\/i\.test\(destination\)/);
  assert.match(cards,/No verified destination is available for this direct advertisement/);
  assert.match(premiumStore,/status: "configuration-required"/);
  assert.doesNotMatch(premium,/AUTHORITATIVE ACCESS POLICY|platform configuration|product identifier/);
  assert.doesNotMatch(premium,/\$[0-9]+(?:\.[0-9]{2})?/);
  assert.match(home,/AdSlot placement="hospaz-header-direct"/);
});
