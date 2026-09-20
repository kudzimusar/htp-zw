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
