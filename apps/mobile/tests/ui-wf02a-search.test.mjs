import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const read=(path)=>readFileSync(join(root,path),"utf8");

test("Search route remains /search inside Reader shell without a sixth visible bottom tab",()=>{
  assert.equal(existsSync(join(root,"app/(reader)/search.tsx")),true,"Search must live inside (reader) route group");
  assert.equal(existsSync(join(root,"app/search.tsx")),false,"Duplicate root /search route must not exist");

  const rootLayout=read("app/_layout.tsx");
  assert.doesNotMatch(rootLayout,/name="search"/,"Root Stack must not register obsolete search screen");

  const readerTabs=read("app/(reader)/_layout.tsx");
  const visibleTitles=[...readerTabs.matchAll(/title:"([^"]+)"/g)].map((match)=>match[1]);
  assert.deepEqual(visibleTitles,["Home","Explore","Live","Watch","My HT"]);
  assert.match(readerTabs,/<Tabs\.Screen name="search" options=\{\{href:null\}\} \/>/);
  assert.doesNotMatch(readerTabs,/title:"Search"/);
  assert.match(readerTabs,/tabBar=\{desktop \? \(\) => null : undefined\}/);
});

test("Phone initial Search state opens with prominent Search field and no phone masthead or title above it",()=>{
  const search=read("app/(reader)/search.tsx");
  assert.match(search,/<Page chrome=\{desktop\}>/);
  assert.doesNotMatch(search,/<Page[^>]*title=/);
  assert.match(search,/placeholder="Search articles, topics, authors…"/);
  assert.match(search,/accessibilityLabel="Search HealthTimes"/);
  assert.match(search,/returnKeyType="search"/);
  assert.match(search,/onSubmitEditing=\{\(\)=>submit\(\)\}/);
  assert.doesNotMatch(search,/accessibilityLabel="Submit HealthTimes search"/,"Phone Search should rely on native keyboard Search instead of a persistent trailing CTA");
  assert.doesNotMatch(search,/submitIconButton/,"Persistent blue submit block must not return");
  assert.doesNotMatch(search,/>Search<\/Text>/,"Phone Search must not use a large adjacent text Search button");

  const render=search.slice(search.indexOf("<Page chrome={desktop}>"));
  const fieldIndex=render.indexOf('placeholder="Search articles, topics, authors…"');
  const formatIndex=render.indexOf("styles.controlsBar");
  const tryIndex=render.indexOf(">Try searching for<");
  const explanationIndex=render.indexOf(">Intelligent Search<");
  assert.ok(fieldIndex>0,"Search field must be present");
  assert.ok(formatIndex>fieldIndex,"Format controls must follow the Search field");
  assert.ok(tryIndex>formatIndex,"Try searching for must immediately follow the type-filter family in the initial phone hierarchy");
  assert.ok(explanationIndex>tryIndex,"Intelligent Search explanation must follow Try searching for");
});

test("Format tabs preserve exact All / Articles / Videos / Audio / Authors order",()=>{
  const search=read("app/(reader)/search.tsx");
  const block=search.match(/const formatTabs:[\s\S]*?\];/)?.[0] ?? "";
  const labels=[...block.matchAll(/\["([^"]+)",\s*"([^"]+)"\]/g)].map((match)=>match[1]);
  assert.deepEqual(labels,["All","Articles","Videos","Audio","Authors"]);
  assert.match(search,/formatRail:\{width:"100%"/,"Type controls must own the available phone row");
  assert.match(search,/formatTabs:\{paddingHorizontal:0,gap:4/,"Phone type controls must stay compact enough for 390px");
  assert.match(search,/formatTab:\{[\s\S]*?minHeight:36,[\s\S]*?paddingHorizontal:10/,"Type controls must preserve readable compact touch styling");
});

test("Try searching for derives suggestions from real taxonomy/geography authority",()=>{
  const search=read("app/(reader)/search.tsx");
  assert.match(search,/services\.taxonomy\.getSnapshot\(\)/);
  assert.match(search,/taxonomy\.data\?\.geographicZones/);
  assert.match(search,/taxonomy\.data\?\.topics/);
  assert.match(search,/taxonomy\.data\?\.editorialDesks/);
  assert.match(search,/\.\.\.topics\.slice\(0,3\)/);
  assert.match(search,/\.\.\.countries\.slice\(0,2\)/);
  assert.match(search,/\]\)\)\.slice\(0,5\)/,"Initial Search should expose a bounded five-item real suggestion set");
  assert.match(search,/>Try searching for</);
  assert.match(search,/SuggestionRow/);
  assert.doesNotMatch(search,/suggestionArrow/,"Suggestion rows should stay query-like rather than card/CTA-like");
  assert.match(search,/onPress=\{\(\)=>submit\(item\)\}/);
});

test("Progressive-disclosure filters are initially collapsed and remain functional",()=>{
  const search=read("app/(reader)/search.tsx");
  assert.match(search,/const \[filtersOpen,setFiltersOpen\]=useState\(false\)/);
  assert.match(search,/accessibilityState=\{\{expanded:filtersOpen\}\}/);
  assert.match(search,/filtersOpen\?"Hide search filters":"Show search filters"/);
  assert.match(search,/filtersOpen && view!=="authors"/);
  assert.match(search,/suggestionsHeadingRow/,"Initial Filters affordance should remain subordinate to Try searching for");
  assert.match(search,/const filterControl=view!=="authors"/);
  assert.match(search,/>COUNTRY</);
  assert.match(search,/>TOPIC \/ DESK</);
  assert.match(search,/Clear filters/);
});

test("Real search execution, source-backed results, analytics redaction, truthful copy and dark mode are preserved",()=>{
  const search=read("app/(reader)/search.tsx");
  assert.match(search,/services\.search\.search\(\{text:submitted,format:serviceFormat,country,topic\}\)/);
  assert.match(search,/event\("search_performed"/);
  assert.match(search,/query_redacted:true/);
  assert.doesNotMatch(search,/query:\s*submitted|query:\s*query/);
  assert.match(search,/Your raw health search words are not sent to Reader analytics\./);

  for(const component of ["StoryList","StoryGrid","VideoCard","AudioCard","LiveRail"]){
    assert.ok(search.includes(component),"missing result renderer: "+component);
  }
  assert.match(search,/Author matches/);

  assert.match(search,/>Intelligent Search</);
  assert.doesNotMatch(
    search,
    /AI-Powered Search|AI ranking|semantic model|LLM search|personalized intelligence|AI answer|generated health advice/i
  );

  assert.match(search,/useAppearance\(\)/);
  for(const token of ["palette.paper","palette.paperMuted","palette.ink","palette.inkMuted","palette.blue","palette.border"]){
    assert.ok(search.includes(token),"missing dark-mode palette token: "+token);
  }
});
