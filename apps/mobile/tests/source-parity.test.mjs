import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const read=(path)=>readFileSync(join(root,path),"utf8");

test("Source Parity Bridge is public, read-only and replaceable",()=>{
  const service=read("src/services/source-parity.ts");
  const snapshot=read("src/source-parity/snapshot.ts");
  assert.match(snapshot,/https:\/\/healthtimes\.co\.zw/);
  assert.match(service,/EXPO_PUBLIC_HEALTHTIMES_SOURCE_BASE_URL/);
  assert.match(service,/method:"GET"/);
  assert.match(service,/credentials:"omit"/);
  assert.doesNotMatch(service,/method:"POST"|method:"PUT"|method:"PATCH"|method:"DELETE"/);
  assert.doesNotMatch(service,/service_role|subscriber|payment_method|private draft/i);
  assert.match(service,/ag04ReplacementRequired:true/);
});

test("current public HealthTimes source replaces generic editorial fixtures in parity mode",()=>{
  const snapshot=read("src/source-parity/snapshot.ts");
  for(const title of [
    "Zimbabwe Looks to Strengthen Social Contracting as HIV Donor Funding Shrinks",
    "Zimbabwe urged to join Borrowers Forum amid US$23.7bn debt",
    "Africa CDC Warns Ebola Response Is Missing Most Expected Contacts as Community Deaths Rise",
    "US medical team brings specialist surgical expertise to Zimbabwe in 15-year partnership",
    "Meet Dr Neddy Makonza",
    "Zimbabwe Joins Africa-Led Trial Testing Long-Acting HIV Treatment to Protect Babies",
    "DatCitizen Launches Backpack Walk in Solidarity With Girls Facing Unwanted Pregnancies",
    "Ken Sharpe appointed to lead Zimbabwe’s End Malaria Council",
    "Global Commission calls for end to punitive drug policies targeting children",
    "Zika-Carrying Mosquito Breeds in London, Raising Climate Change Concerns",
    "Parliament Probes NatPharm"
  ]){
    assert.ok(snapshot.includes(title),title);
  }
  assert.match(snapshot,/HealthTimes Premium/);
  assert.match(snapshot,/MITAP Media Pvt Ltd/);
  assert.match(snapshot,/sourceParityVideos/);
});

test("source provenance and legacy taxonomy stay explicit",()=>{
  const models=read("src/domain/models.ts");
  const snapshot=read("src/source-parity/snapshot.ts");
  const service=read("src/services/source-parity.ts");
  assert.match(models,/legacyTaxonomy\?: TaxonomyRef\[\]/);
  assert.match(snapshot,/wordpress-url:/);
  assert.match(snapshot,/legacyMembershipSignal/);
  assert.match(service,/categoryIds:/);
  assert.match(service,/tagIds:/);
  assert.match(service,/canonicalSectionForLegacy/);
});

test("Premium body never crosses the parity bridge without entitlement authority",()=>{
  const service=read("src/services/source-parity.ts");
  assert.match(service,/bodyHtml:accessPolicy==="premium" \? null/);
  assert.match(service,/legacyMembershipSignal:accessPolicy==="premium"/);
});

test("default development editorial mode is source parity while production stays locked",()=>{
  const config=read("src/platform/config.ts");
  const services=read("src/services/index.ts");
  assert.match(config,/source-parity/);
  assert.match(services,/sourceParityServices/);
  assert.match(services,/Production service adapters remain locked/);
  assert.match(services,/migratedCorpusServices/);
  assert.doesNotMatch(services,/Staging editorial-data mode is locked until AG-04/);
});

test("requested Reader surfaces consume the repository bridge instead of a second source architecture",()=>{
  const home=read("app/(reader)/index.tsx");
  const explore=read("app/(reader)/explore.tsx");
  const search=read("app/search.tsx");
  const premium=read("app/premium.tsx");
  const watch=read("app/(reader)/watch.tsx");
  const article=read("app/article/[id].tsx");
  const author=read("app/author/[slug].tsx");
  const about=read("app/about.tsx");
  for(const source of [home,explore,search,premium,watch]) assert.match(source,/services\./);
  assert.match(article,/SOURCE_PARITY_STATIC_ARTICLE_IDS/);
  assert.match(article,/View article on HealthTimes\.co\.zw/);
  assert.match(author,/services\.publication\.getAuthor/);
  assert.match(author,/services\.articles\.listByAuthor/);
  assert.match(about,/services\.publication\.getProfile/);
  assert.doesNotMatch(home,/fixture editorial data/i);
});

test("Pages owner preview explicitly runs source-parity mode",()=>{
  const pages=read("../../.github/workflows/pages.yml");
  assert.match(pages,/EXPO_PUBLIC_HEALTHTIMES_SERVICE_MODE: source-parity/);
  assert.match(pages,/test:source-parity/);
});


test("System Status distinguishes source-parity development bridge from canonical staging corpus",()=>{
  const status=read("app/system-status.tsx");
  assert.match(status,/accepted migrated editorial corpus/i);
  assert.match(status,/source-parity remains a development bridge/i);
  assert.match(status,/canonical staging source/i);
  assert.doesNotMatch(status,/fixture-backed editorial data/i);
});


test("verified source photography is available in deterministic parity fallback",()=>{
  const snapshot=read("src/source-parity/snapshot.ts");
  for(const asset of [
    "enhanced_1200x665.jpg",
    "dr-neddy-makonza-zimbabwe-fourth-female-orthopaedic-surgeon.png",
    "Chief-Nyamaropa.jpeg",
    "aids-2026-protest-hiv-indigenous-people-fiji-creative-commons-https-creativecommons-org-licenses-by-sa-4-0.jpg.png",
    "zimbabwe-parliamentarians-not-in-my-constituency-teenage-pregnancy.jpg"
  ]){
    assert.ok(snapshot.includes(asset),asset);
  }
  assert.match(snapshot,/publicUrl:input\.imageUrl \?\? null/);
});


test("live public WordPress refresh can surface newly published posts without replacing the fallback snapshot",()=>{
  const service=read("src/services/source-parity.ts");
  assert.match(service,/fallbackBySlug\.get\(post\.slug\) \?\? null/);
  assert.match(service,/mapWpPost\(post,fallback\)/);
  assert.match(service,/const liveArticles=Array\.from\(refreshed\.values\(\)\)/);
  assert.match(service,/const snapshotFallbacks=sourceParityArticles\.filter/);
  assert.match(service,/const merged=\[\.\.\.liveArticles,\.\.\.snapshotFallbacks\]/);
  assert.doesNotMatch(service,/if\(!fallback\) continue/);
});


test("new live posts remain readable through the existing ArticleRepository contract",()=>{
  const service=read("src/services/source-parity.ts");
  assert.match(service,/const current=\(await refreshedArticles\(\)\)\.find\(\(article\)=>article\.id===id\)/);
  assert.match(service,/encodeURIComponent\(current\.slug\)/);
  assert.doesNotMatch(service,/if\(!fallback\) return null/);
});

test("fallbackless live posts preserve uncertainty instead of fabricating canonical truth",()=>{
  const service=read("src/services/source-parity.ts");
  assert.match(service,/function inferPrimarySection/);
  assert.match(service,/if\(!normalized\.some\(\(name\)=>canonicalLegacyNames\.has\(name\)\)\) return null/);
  assert.match(service,/Geography is left unassigned because the public source metadata does not provide enough evidence/);
  assert.match(service,/No AG-01 canonical desk is inferred/);
  assert.match(service,/author-unresolved/);
  assert.match(service,/taxonomy-unresolved/);
  assert.match(service,/missing-media/);
  assert.match(service,/unknown-shortcode/);
});

test("live source taxonomy and authors can extend parity surfaces without a second repository",()=>{
  const service=read("src/services/source-parity.ts");
  assert.match(service,/const articles=await refreshedArticles\(\);/);
  assert.match(service,/async function parityAuthors/);
  assert.match(service,/return parityAuthors\(\)/);
  assert.match(service,/topics:observedLegacy/);
});

test("source-parity search respects contract filters as well as the live corpus",()=>{
  const service=read("src/services/source-parity.ts");
  assert.match(service,/if\(query\.country\)/);
  assert.match(service,/if\(query\.topic\)/);
  assert.match(service,/article\.legacyTaxonomy/);
});


test("Premium content is excluded from browser REST requests before mapping",()=>{
  const service=read("src/services/source-parity.ts");
  assert.match(service,/const wpMetadataFields=/);
  assert.match(service,/const wpPublicDetailFields=wpMetadataFields\+",content"/);
  assert.match(service,/wpPostQuery\(\{includeContent:false\}\)/);
  assert.match(service,/const includeContent=current\.accessPolicy==="public" && !taxonomyUnresolved/);
  assert.match(service,/wpPostQuery\(\{includeContent\}\)/);
  assert.match(service,/fallback\?\.accessPolicy==="premium"/);
});

test("uncertain live taxonomy fails closed for detail body retrieval",()=>{
  const service=read("src/services/source-parity.ts");
  assert.match(service,/exception\.kind==="taxonomy-unresolved"/);
  assert.match(service,/exception\.field==="legacyTaxonomy" \|\| exception\.field==="primarySection"/);
  assert.match(service,/includeContent=current\.accessPolicy==="public" && !taxonomyUnresolved/);
});


test("institutional products and social channels remain source-verifiably reachable",()=>{
  const models=read("src/domain/models.ts");
  const snapshot=read("src/source-parity/snapshot.ts");
  const explore=read("app/(reader)/explore.tsx");
  const about=read("app/about.tsx");
  assert.match(models,/sourceLinks\?: PublicationLink\[\]/);
  for(const path of [
    "/jobs/",
    "/fellowships-grants/",
    "/training-courses/",
    "/academic-research/",
    "/baraza-e-paper/"
  ]) assert.ok(snapshot.includes(path),path);
  for(const destination of [
    "x.com/healthtimeszim",
    "facebook.com/healthtimeszw",
    "instagram.com/healthtimesnews",
    "youtube.com/@HealthTimesTV"
  ]) assert.ok(snapshot.includes(destination),destination);
  assert.match(explore,/services\.publication\.getProfile/);
  assert.match(explore,/Linking\.openURL\(sourceLink\.url\)/);
  assert.match(about,/HealthTimes products & channels/);
  assert.match(about,/publication\.data\.sourceLinks/);
  assert.match(snapshot,/\/author\/michael-gwarisa\//);
  assert.match(snapshot,/\/author\/kuda-pembere\//);
});


test("premium Reader Home consumes broad real-publication sections without fixture-style scaffolding",()=>{
  const home=read("app/(reader)/index.tsx");
  for(const label of [
    "Top Stories",
    "Latest",
    "Features",
    "Public Health",
    "Research & Findings",
    "Health Financing",
    "HIV/AIDS",
    "Global Health",
    "Watch",
    "Premium",
    "Opportunities",
    "Further Coverage"
  ]) assert.ok(home.includes(label),label);
  assert.doesNotMatch(home,/No verified live event right now/);
});

test("Explore preserves source taxonomy families behind reader-facing navigation",()=>{
  const explore=read("app/(reader)/explore.tsx");
  const snapshot=read("src/source-parity/snapshot.ts");
  const service=read("src/services/source-parity.ts");
  assert.match(explore,/services\.taxonomy\.getSnapshot/);
  assert.match(explore,/Editorial desks/);
  assert.match(explore,/Topics & categories/);
  assert.match(explore,/Formats/);
  assert.doesNotMatch(explore,/TAXONOMY GATEWAY|CANONICAL|LEGACY|Canonical desks|Legacy publication categories/);
  for(const family of [
    "Communicable Diseases",
    "Noncommunicable Diseases",
    "Opinion & Analysis",
    "Research & Findings"
  ]) assert.ok(snapshot.includes(family),family);
  assert.match(service,/sourceParityLegacyNavigation/);
});

test("source search returns authors and fails closed for unsupported video taxonomy filters",()=>{
  const models=read("src/domain/models.ts");
  const service=read("src/services/source-parity.ts");
  const search=read("app/search.tsx");
  assert.match(models,/authors: AuthorProfile\[\]/);
  assert.match(service,/const authors=query\.format/);
  assert.match(service,/query\.country\|\|query\.topic\|\|\(query\.format&&query\.format!=="video"\)/);
  assert.match(search,/Author matches/);
  assert.match(search,/country,setCountry/);
  assert.match(search,/topic,setTopic/);
});

test("verified lead photography survives deterministic source fallback",()=>{
  const snapshot=read("src/source-parity/snapshot.ts");
  assert.match(snapshot,/zimbabwe-social-contracting-hiv-financing-dialogue\.jpg/);
  assert.match(snapshot,/enerst-chikwati-ahf-zimbabwe-country-director\.jpeg/);
});

test("unfilled advertising inventory collapses instead of rendering wireframe placeholders",()=>{
  const cards=read("src/ui/Cards.tsx");
  assert.match(cards,/if\(!adDecision \|\| adDecision\.source === "none"\) return null/);
  assert.doesNotMatch(cards,/Advertising space/);
  assert.doesNotMatch(cards,/Reserved advertising placement/);
});

test("institutional continuity is discoverable from My HealthTimes and About",()=>{
  const my=read("app/(reader)/my.tsx");
  const about=read("app/about.tsx");
  assert.match(my,/PUBLICATION & INSTITUTIONAL/);
  assert.match(my,/Corrections & Editorial Standards/);
  assert.match(my,/services\.publication\.getProfile/);
  assert.match(about,/Corrections & editorial standards/);
  assert.match(about,/Request a correction/);
});

test("Pages workflow proves exact deployed SHA and critical owner-preview routes",()=>{
  const pages=read("../../.github/workflows/pages.yml");
  assert.match(pages,/build-info\.json/);
  assert.match(pages,/Exact-head Pages deployment: PASS/);
  assert.match(pages,/access-control-allow-origin/);
  assert.doesNotMatch(pages,/sub\(\/\\r\$\/,\\\"\\\"\)/);
  for(const route of ["live","explore","search","premium","watch","my","article\/source-zimbabwe-strengthens-social-contracting-as-hiv-donor-funding-shrinks"]){
    assert.ok(pages.includes(route),route);
  }
});

test("Watch uses verified destinations rather than the HealthTimes root",()=>{
  const snapshot=read("src/source-parity/snapshot.ts"),cards=read("src/ui/Cards.tsx");
  for(const id of ["lezgDMK2lPg","8rU5X2X6CNc","v4Sjv8-kz3I","zEDRwL6NYak","8K9nxwmj-1k"]){
    assert.ok(snapshot.includes("https://www.youtube.com/watch?v="+id),id);
    assert.ok(snapshot.includes("https://img.youtube.com/vi/"+id+"/maxresdefault.jpg"),id+" thumbnail");
  }
  assert.match(cards,/verifiedVideoDestination/);assert.match(cards,/Video unavailable/);assert.match(cards,/Linking\.openURL/);
});

test("public Reader surfaces keep programme language in diagnostics, not editorial UI",()=>{
  const publicSurfaces=[
    read("app/(reader)/index.tsx"),read("app/(reader)/explore.tsx"),read("app/(reader)/live.tsx"),
    read("app/(reader)/watch.tsx"),read("app/article/[id].tsx"),read("app/search.tsx"),read("app/about.tsx")
  ].join("\n");
  assert.doesNotMatch(publicSurfaces,/SOURCE PARITY PREVIEW|SOURCE-BACKED DISCOVERY|AG-0[1-7]|migration completeness|temporary read-only parity bridge/i);
  const status=read("app/system-status.tsx");
  assert.match(status,/NM-04 DIAGNOSTICS/);
  assert.match(status,/NM-07 \/ AG-04/);
  assert.match(status,/canonical staging source/i);
});
test("live-discovered stories retain dynamic internal article navigation",()=>{
  const service=read("src/services/source-parity.ts"),cards=read("src/ui/Cards.tsx");
  assert.match(service,/id:fallback\?\.id \?\? "source-"\+post\.slug/);
  assert.match(cards,/router\.push\(\("\/article\/" \+ story\.id\)/);
});
test("GitHub Pages preview includes fresh-load deep-link fallback handshake",()=>{
  const html=read("app/+html.tsx"),workflow=read("../../.github/workflows/pages.yml");
  assert.match(html,/ht:nm04:pwa-deep-link/);
  assert.match(html,/history\.replaceState/);
  assert.match(workflow,/HEALTHTIMES_PWA_DEEP_LINK_FALLBACK/);
  assert.match(workflow,/source-nm04-live-discovered/);
});