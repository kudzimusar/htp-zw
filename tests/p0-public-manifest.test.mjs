import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { buildPublicManifest, isClassifiedPublic, classificationIndex, stableKeyForPost } from "../scripts/editorial/public-manifest.mjs";

const MODIFIED="2026-11-06T11:18:48.000Z";
const article=(overrides={})=>({
  postId:33649,slug:"public-lab-shortages",canonicalUrl:"https://healthtimes.co.zw/public-lab-shortages/",
  publishedAt:MODIFIED,modifiedAt:MODIFIED,title:"Public lab shortages",categoryIds:[1],
  publicTerms:[{id:1,taxonomy:"category",slug:"health-news",name:"Health News"}],
  contentBody:"<p>Body text.</p>",excerpt:"Excerpt.",authorName:"Michael Gwarisa",
  heroMedia:{sourceUrl:"https://healthtimes.co.zw/wp-content/uploads/a.jpg",altText:"A",caption:""},
  ...overrides
});
const probe=(articles=[article()])=>({latestPublicCandidateAt:MODIFIED,latestTwentyMetadata:articles});
const classification=(records)=>({
  schemaVersion:1,
  authority:{role:"Publisher/Owner",decidedBy:"Publisher",decidedAt:"2026-11-10T00:00:00.000Z",basis:"Reviewed against membership rules"},
  records
});
const publicRecord=(overrides={})=>({stableKey:"wordpress:post:33649",accessPolicy:"public",sourceModifiedAt:MODIFIED,evidence:{kind:"publisher-owner-decision",reference:"decision-1"},...overrides});
const build=(articles,doc)=>buildPublicManifest({probe:probe(articles),classification:doc,generatedAt:"2026-11-11T00:00:00.000Z"});

test("source keys use the canonical legacy_sources format",()=>{
  assert.equal(stableKeyForPost(33185),"wordpress:post:33185");
});

test("without classification nothing beyond metadata ships, even if a body was fetched",()=>{
  const manifest=build([article()],null);
  const [entry]=manifest.articles;
  assert.equal(entry.contentBody,null);
  assert.equal(entry.excerpt,null);
  assert.equal(entry.heroMedia,null);
  assert.equal(entry.authorName,null);
  assert.equal(entry.bodyAuthority,"BLOCKED_PENDING_OWNER_CLASSIFICATION");
  assert.equal(manifest.metadataOnly,true);
  assert.equal(manifest.contentBodyAvailable,false);
  assert.equal(JSON.stringify(manifest).includes("Body text."),false);
});

test("an editorially classified public post ships its sanitized body",()=>{
  const manifest=build([article()],classification([publicRecord()]));
  const [entry]=manifest.articles;
  assert.equal(entry.contentBody,"<p>Body text.</p>");
  assert.equal(entry.bodyAuthority,"EDITORIAL_CLASSIFIED_PUBLIC");
  assert.equal(manifest.metadataOnly,false);
  assert.equal(manifest.contentBodyAvailable,true);
});

for(const policy of ["premium","premium_marker_review","free","PUBLIC",""]){
  test("access policy "+JSON.stringify(policy)+" never authorizes a body",()=>{
    const manifest=build([article()],classification([publicRecord({accessPolicy:policy})]));
    assert.equal(manifest.articles[0].contentBody,null);
  });
}

test("a classification is void once the publisher modifies the post",()=>{
  const later=article({modifiedAt:"2026-11-07T00:00:00.000Z"});
  const manifest=build([later],classification([publicRecord()]));
  assert.equal(manifest.articles[0].contentBody,null);
  assert.equal(manifest.articles[0].bodyAuthority,"BLOCKED_PENDING_OWNER_CLASSIFICATION");
});

test("classification is matched per post and never spills to other stories",()=>{
  const other=article({postId:999,slug:"other",contentBody:"<p>Other.</p>"});
  const manifest=build([article(),other],classification([publicRecord()]));
  assert.equal(manifest.articles[0].contentBody,"<p>Body text.</p>");
  assert.equal(manifest.articles[1].contentBody,null);
});

test("an empty body cannot be classified into publication",()=>{
  const manifest=build([article({contentBody:""})],classification([publicRecord()]));
  assert.equal(manifest.articles[0].contentBody,null);
});

test("a one-shot export never claims the freshness SLA or restricted bodies",()=>{
  const manifest=build([article()],classification([publicRecord()]));
  assert.equal(manifest.freshnessSlaVerified,false);
  assert.equal(manifest.restrictedBodiesIncluded,false);
});

test("author and media stay unverified: classification does not license them",()=>{
  const [entry]=build([article()],classification([publicRecord()])).articles;
  assert.equal(entry.authorAuthority,"NOT_VERIFIED");
  assert.equal(entry.mediaAuthority,"NOT_VERIFIED");
});

test("the hash is computed exactly as the Reader verifies it",()=>{
  const manifest=build([article()],null);
  const expected=createHash("sha256").update(JSON.stringify(manifest.articles)).digest("hex");
  assert.equal(manifest.contentHashSha256,expected);
  assert.equal(manifest.count,1);
});

const OWNER={role:"Publisher/Owner",decidedBy:"x",decidedAt:"2026-11-10T00:00:00Z"};
for(const [label,doc] of Object.entries({
  "wrong schema":{schemaVersion:2,authority:OWNER,records:[]},
  "missing authority":{schemaVersion:1,records:[]},
  "a non-Owner role":{schemaVersion:1,authority:{...OWNER,role:"Editor-in-Chief"},records:[]},
  "blank decider":{schemaVersion:1,authority:{...OWNER,decidedBy:" "},records:[]},
  "invalid decision date":{schemaVersion:1,authority:{...OWNER,decidedAt:"soon"},records:[]},
  "records not a list":{schemaVersion:1,authority:OWNER,records:{}},
  "a record with no evidence":{schemaVersion:1,authority:OWNER,records:[{stableKey:"wordpress:post:1",accessPolicy:"public",sourceModifiedAt:MODIFIED}]},
  "a record citing REST availability":{schemaVersion:1,authority:OWNER,records:[{stableKey:"wordpress:post:1",accessPolicy:"public",sourceModifiedAt:MODIFIED,evidence:{kind:"wordpress-rest"}}]}
})){
  test("a malformed classification document is rejected: "+label,()=>{
    assert.throws(()=>classificationIndex(doc),/INVALID_CLASSIFICATION/);
  });
}

test("isClassifiedPublic requires a matching record",()=>{
  assert.equal(isClassifiedPublic(article(),new Map()),false);
});
