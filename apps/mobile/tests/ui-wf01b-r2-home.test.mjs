import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
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


function loadTsModule(path){
  const source=read(path);
  const output=ts.transpileModule(source,{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
  }).outputText;
  const mod={exports:{}};
  new Function("module","exports","require",output)(mod,mod.exports,(name)=>{
    throw new Error("Unexpected runtime import "+name);
  });
  return mod.exports;
}

test("Latest feed is globally ordered by authoritative publication time after merge",()=>{
  const {sortByPublicationDesc,mergeReaderFeeds}=loadTsModule("src/reader/feed-order.ts");
  const rows=[
    {id:"older",slug:"older",canonicalUrl:"https://example.test/older",canonicalStoryId:null,publishedAt:"2026-10-01T08:00:00Z",modifiedAt:null},
    {id:"latest",slug:"latest",canonicalUrl:"https://example.test/latest",canonicalStoryId:null,publishedAt:"2026-10-20T08:00:00Z",modifiedAt:null},
    {id:"middle",slug:"middle",canonicalUrl:"https://example.test/middle",canonicalStoryId:null,publishedAt:"2026-10-12T08:00:00Z",modifiedAt:null}
  ];
  assert.deepEqual(sortByPublicationDesc(rows).map((item)=>item.id),["latest","middle","older"]);
  const merged=mergeReaderFeeds(
    [{...rows[2],id:"staging-middle"}],
    [rows[1],{...rows[2],id:"source-middle"}]
  );
  assert.deepEqual(merged.map((item)=>item.id),["latest","staging-middle"]);
});

test("general Home modules exclude Premium while Premium retains intentional placement",()=>{
  const home=read("app/(reader)/index.tsx");
  assert.match(home,/const generalStories=source\.filter\(\(story\)=>story\.accessPolicy!=="premium"\)/);
  assert.match(home,/if\(activeFilter==="latest"\) return generalStories/);
  assert.match(home,/const generalPresentations=presentations\.filter\(\(item\)=>item\.article\.accessPolicy!=="premium"\)/);
  assert.match(home,/const premium=premiumStories/);
  assert.match(home,/SectionHeader title="Premium Intelligence"/);
});

test("ad frame keeps natural proportions and never upscales known creatives across viewports",()=>{
  const {resolveAdCreativeFrame}=loadTsModule("src/growth/ad-layout.ts");
  const input={naturalWidth:728,naturalHeight:90,maxWidth:900,fallbackAspect:8/1};
  const desktop=resolveAdCreativeFrame({...input,viewportWidth:1440});
  const tablet=resolveAdCreativeFrame({...input,viewportWidth:834});
  const phone=resolveAdCreativeFrame({...input,viewportWidth:390});
  assert.equal(desktop.width,728);
  assert.equal(tablet.width,728);
  assert.ok(phone.width<728);
  assert.equal(desktop.aspectRatio,728/90);
  assert.equal(tablet.aspectRatio,728/90);
  assert.equal(phone.aspectRatio,728/90);
});

test("public Pages build fails closed around real Owner activation authority",()=>{
  const activate=read("src/ui/StudioActivate.tsx");
  const staff=read("src/services/newsroom-staff.ts");
  const pages=read("../../.github/workflows/pages.yml");
  assert.match(activate,/EXPO_PUBLIC_HEALTHTIMES_PUBLIC_CLIENT_REVIEW/);
  assert.match(activate,/Owner activation is not available in this build/);
  assert.doesNotMatch(activate+"\n"+staff,/[A-Z0-9._%+-]+@gmail\.com/i);
  assert.doesNotMatch(activate+"\n"+staff,/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  assert.match(pages,/EXPO_PUBLIC_HEALTHTIMES_PUBLIC_CLIENT_REVIEW: "1"/);
  assert.match(pages,/EXPO_PUBLIC_HEALTHTIMES_OWNER_PREVIEW: "1"/);
});
