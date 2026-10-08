import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const read=(path)=>readFileSync(join(root,path),"utf8");

test("UI-WF-01A Home tabs match the accepted visual contract exactly",()=>{
  const home=read("app/(reader)/index.tsx");
  const expected=[
    '{key:"for-you",label:"For You"}',
    '{key:"latest",label:"Latest"}',
    '{key:"zimbabwe",label:"Zimbabwe"}',
    '{key:"world",label:"World"}',
    '{key:"premium",label:"Premium"}'
  ];
  for(const item of expected) assert.ok(home.includes(item),"missing Home tab contract: "+item);
  assert.equal(home.includes('label:"Health"'),false);
  assert.equal(home.includes('key:"edition"'),false);
  assert.equal(home.includes("EDITOR'S DESK"),false);
});

test("UI-WF-01A phone masthead contains only brand and accessible Search control",()=>{
  const layout=read("src/ui/Layout.tsx");
  const start=layout.indexOf("const phoneSearchAction");
  const end=layout.indexOf("const utilityActions",start);
  assert.ok(start>=0 && end>start,"phone-only masthead action boundary missing");
  const phoneBlock=layout.slice(start,end);
  assert.ok(phoneBlock.includes("SymbolView"));
  assert.ok(phoneBlock.includes('accessibilityLabel="Search HealthTimes"'));
  for(const forbidden of [">Edition<",">Alerts<",">Premium<",">Search<"]){
    assert.equal(phoneBlock.includes(forbidden),false,"forbidden phone masthead text: "+forbidden);
  }
  assert.ok(layout.includes("{!phone && ("));
});

test("UI-WF-01A Home editorial navigation is text-first rather than Chip based",()=>{
  const home=read("app/(reader)/index.tsx");
  const layout=read("src/ui/Layout.tsx");
  assert.ok(home.includes("<EditorialTabs"));
  assert.equal(home.includes("<Chip"),false);
  assert.ok(layout.includes('accessibilityRole="button"'));
  assert.ok(layout.includes('accessibilityState={{ selected: active }}'));
  assert.ok(layout.includes("editorialTabIndicator"));
  assert.ok(layout.includes("height:2"));
});

test("UI-WF-01A uses one professional Expo symbol family for bottom navigation",()=>{
  const tabs=read("app/(reader)/_layout.tsx");
  assert.ok(tabs.includes('import { SymbolView } from "expo-symbols"'));
  assert.ok(tabs.includes("house.fill"));
  assert.ok(tabs.includes("explore"));
  assert.ok(tabs.includes("smart_display"));
  assert.ok(tabs.includes("account_circle"));
  for(const legacy of ["homeRoof","exploreDot","liveRing","watchGlyph","profileHead","profileBody"]){
    assert.equal(tabs.includes(legacy),false,"legacy View icon remains: "+legacy);
  }
  const order=["Home","Explore","Live","Watch","My HT"].map((label)=>tabs.indexOf('title:"'+label+'"'));
  assert.ok(order.every((value)=>value>=0),"one or more tab labels missing");
  assert.deepEqual([...order].sort((a,b)=>a-b),order,"bottom destinations are not in accepted order");
  assert.ok(tabs.includes('tabBar={desktop ? () => null : undefined}'));
});

test("UI-WF-01A preserves truthful advertising and conditional Live behavior",()=>{
  const home=read("app/(reader)/index.tsx");
  const cards=read("src/ui/Cards.tsx");
  assert.ok(home.includes('<AdSlot placement="hospaz-header-direct" sensitiveHealthContext />'));
  assert.equal((home.match(/hospaz-header-direct/g)??[]).length,1);
  assert.ok(cards.includes('if(!adDecision || adDecision.source === "none" || !adDecision.creativeUrl) return null;'));
  assert.ok(home.includes("!!liveItems.length"));
  assert.equal(/Most Read/.test(home),false,"Most Read must remain absent without ranking authority");
});

test("UI-WF-01A keeps Premium source-driven and body protection unchanged",()=>{
  const home=read("app/(reader)/index.tsx");
  const article=read("app/article/[id].tsx");
  const persistence=read("src/services/reader-persistence.ts");
  assert.ok(home.includes('source.filter((story)=>story.accessPolicy==="premium")'));
  assert.ok(article.includes("services.premium.hasEntitlement"));
  assert.ok(article.includes("entitlement.data===true"));
  assert.ok(article.includes("services.premium.getProtectedArticle"));
  assert.ok(persistence.includes('article.accessPolicy==="premium"'));
});

test("UI-WF-01A removes false curation and reduces generic Home containers",()=>{
  const home=read("app/(reader)/index.tsx");
  const cards=read("src/ui/Cards.tsx");
  assert.equal(home.includes("EDITOR'S DESK"),false);
  assert.ok(home.includes('<SectionHeader title="Top Stories" action="Explore"'));
  assert.ok(home.includes("borderTopWidth:2"));
  assert.equal(home.includes("borderRadius:radius.md"),false);
  assert.equal(cards.includes('hero:{borderBottomWidth:1'),false);
});

test("UI-WF-01A keeps first-viewport Hero source-backed and visually dominant",()=>{
  const cards=read("src/ui/Cards.tsx");
  assert.ok(cards.includes("story.heroMedia?.publicUrl"));
  assert.ok(cards.includes('resizeMode="cover"'));
  assert.ok(cards.includes("heroImagePhone:{aspectRatio:4/3}"));
  assert.ok(cards.includes("heroTitleOverlay:{fontSize:31"));
  assert.ok(cards.includes("story.title"));
  assert.equal(/unsplash|placeholder\.com|picsum/i.test(cards),false);
});
