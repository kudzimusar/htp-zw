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
  assert.match(services,/Production service adapters are locked/);
  assert.match(services,/Staging editorial-data mode is locked until AG-04/);
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
  assert.match(article,/Open current source article/);
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


test("System Status reports source parity without claiming authoritative migration",()=>{
  const status=read("app/system-status.tsx");
  assert.match(status,/read-only public source-parity editorial data/i);
  assert.match(status,/not migration completeness/i);
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
