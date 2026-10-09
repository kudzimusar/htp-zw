import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const read=(path)=>readFileSync(join(root,path),"utf8");

test("owner Home tabs and phone masthead are exact",()=>{
  const home=read("app/(reader)/index.tsx");
  const layout=read("src/ui/Layout.tsx");
  assert.ok(home.includes('type HomeFilter="for-you"|"latest"|"zimbabwe"|"world"|"premium"'));
  for(const label of ["For You","Latest","Zimbabwe","World","Premium"]) assert.ok(home.includes('label:"'+label+'"'));
  assert.equal(home.includes('label:"Health"'),false);
  assert.equal(home.includes('key:"edition"'),false);
  assert.match(layout,/const phoneSearchAction = phone \?/);
  assert.match(layout,/accessibilityLabel="Search HealthTimes"/);
  assert.match(layout,/magnifyingglass/);
  assert.match(layout,/\{!phone && \(/);
  const phoneBlock=layout.match(/const phoneSearchAction[\s\S]*?\) : null;/)?.[0] ?? "";
  assert.doesNotMatch(phoneBlock,/>Search<|>Alerts<|>Premium<|Edition/);
});

test("Home business and editorial truth remains fail-closed",()=>{
  const home=read("app/(reader)/index.tsx");
  const cards=read("src/ui/Cards.tsx");
  assert.match(home,/SectionHeader title="Top Stories"/);
  assert.doesNotMatch(home,/EDITOR'S DESK/);
  for(const placement of ["hospaz-header-direct","home_after_live","home_watch","home_deep_feed"]) assert.ok(home.includes('placement="'+placement+'"'));
  assert.match(cards,/if\(!adDecision \|\| adDecision\.source === "none" \|\| !adDecision\.creativeUrl\) return null/);
  assert.match(home,/!!liveItems\.length/);
  assert.match(home,/item\.status==="live"/);
  assert.match(home,/story\.accessPolicy==="premium"/);
  assert.match(home,/Source-backed Premium journalism will appear here/);
  assert.doesNotMatch(home,/Most Read/);
});

test("bottom navigation uses professional symbols and exactly five destinations",()=>{
  const tabs=read("app/(reader)/_layout.tsx");
  for(const label of ["Home","Explore","Live","Watch","My HT"]) assert.ok(tabs.includes('title:"'+label+'"'));
  assert.match(tabs,/from "expo-symbols"/);
  assert.match(tabs,/SymbolView/);
  for(const glyph of ["house.fill","safari.fill","play.rectangle.fill","person.crop.circle.fill"]) assert.ok(tabs.includes(glyph));
  for(const legacy of ["homeRoof","exploreDot","liveRing","watchGlyph","profileHead"]) assert.equal(tabs.includes(legacy),false);
  assert.match(tabs,/tabBar=\{desktop \? \(\) => null : undefined\}/);
});

test("Hero remains text-led until real source media resolves",()=>{
  const cards=read("src/ui/Cards.tsx");
  assert.match(cards,/mediaState/);
  assert.match(cards,/onLoad=\{\(\)=>setMediaState\("ready"\)\}/);
  assert.match(cards,/onError=\{\(\)=>setMediaState\("failed"\)\}/);
  assert.match(cards,/heroImageProbe/);
  assert.match(cards,/hasMedia && shortTabletLandscape && styles\.heroShortTabletLandscape/);
});

test("Premium protected body authority remains unchanged",()=>{
  const sourceParity=read("src/services/source-parity.ts");
  const article=read("app/article/[id].tsx");
  assert.match(sourceParity,/bodyHtml:accessPolicy==="premium" \? null/);
  assert.match(article,/PremiumPaywall/);
  assert.match(article,/parseArticleContent\(protectedBody \? null : story\.bodyHtml/);
});

test("iOS tablet route readiness still proves real Save article control",()=>{
  const flow=read("e2e/ui02-phase6a-tablet.yaml");
  assert.match(flow,/Prime the scheme on Home/);
  assert.match(flow,/healthtimes:\/\/article\/source-zimbabwe-strengthens-social-contracting-as-hiv-donor-funding-shrinks/);
  assert.match(flow,/visible: "Save article"/);
});
