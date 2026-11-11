import test from "node:test";
import assert from "node:assert/strict";
import { planIncrementalSync } from "../scripts/editorial/sync-incremental-dryrun.mjs";
import { buildLedgerQuery } from "../scripts/editorial/source-sync-ledger-query.mjs";

const T1="2026-10-01T00:00:00.000Z";
const T2="2026-11-05T00:00:00.000Z";
const post=(overrides={})=>({
  postId:500,slug:"new-story",title:"New story",canonicalUrl:"https://healthtimes.co.zw/new-story/",
  publishedAt:T2,modifiedAt:T2,contentBody:"<p>Body</p>",excerpt:"Excerpt",categoryIds:[1],authorSourceId:"4",
  ...overrides
});
const source=(overrides={})=>({
  stableKey:"wordpress:post:500",legacySourceId:"src-1",storyId:"story-1",storySlug:"new-story",
  storyStatus:"published",storyAccessPolicy:"public",storyLockVersion:1,storyModifiedAt:T1,
  storyPublishedAt:T1,nativeRevisionCount:0,...overrides
});
const ledger=(overrides={})=>({schemaVersion:1,capturedAt:"2026-11-11T00:00:00.000Z",sources:[],slugOwners:[],...overrides});
const classified=(overrides={})=>({
  schemaVersion:1,
  authority:{decidedBy:"Editor-in-Chief",decidedAt:"2026-11-10T00:00:00.000Z",basis:"Reviewed"},
  records:[{stableKey:"wordpress:post:500",accessPolicy:"public",sourceModifiedAt:T2,...overrides}]
});
const only=(plan)=>{assert.equal(plan.decisions.length,1);return plan.decisions[0];};

test("a new classified post with a free slug is an insert candidate",()=>{
  const decision=only(planIncrementalSync([post()],ledger(),classified()));
  assert.equal(decision.decision,"INSERT_CANDIDATE");
  assert.equal(decision.stableKey,"wordpress:post:500");
});

test("an insert candidate is always the canonical public policy",()=>{
  const plan=planIncrementalSync([post()],ledger(),classified());
  assert.equal(plan.candidates[0].accessPolicy,"public");
  assert.equal(JSON.stringify(plan).includes('"free"'),false);
});

test("an unclassified new post is held and carries no body",()=>{
  const plan=planIncrementalSync([post()],ledger(),null);
  assert.equal(only(plan).decision,"HOLD_PENDING_CLASSIFICATION");
  assert.equal(plan.candidates.length,0);
  assert.equal(JSON.stringify(plan).includes("<p>Body</p>"),false);
});

test("a slug owned by a native story fails closed instead of overwriting it",()=>{
  const plan=planIncrementalSync([post()],ledger({slugOwners:[{slug:"new-story",storyId:"native-1",stableKey:null}]}),classified());
  assert.equal(only(plan).decision,"BLOCK_SLUG_COLLISION");
  assert.equal(plan.candidates.length,0);
});

test("a slug owned by a different source fails closed",()=>{
  const plan=planIncrementalSync([post()],ledger({slugOwners:[{slug:"new-story",storyId:"s9",stableKey:"wordpress:post:9"}]}),classified());
  assert.equal(only(plan).decision,"BLOCK_SLUG_COLLISION");
});

test("reconciliation is anchored on the source key even when the slug changed",()=>{
  const plan=planIncrementalSync([post({slug:"renamed"})],ledger({sources:[source()]}),classified());
  assert.equal(only(plan).decision,"HOLD_SLUG_CHANGED");
  assert.equal(plan.candidates.length,0);
});

test("an unchanged source is a no-op",()=>{
  const decision=only(planIncrementalSync([post({modifiedAt:T1})],ledger({sources:[source()]}),classified({sourceModifiedAt:T1})));
  assert.equal(decision.decision,"NOOP_UNCHANGED");
});

test("a modified public source with a fresh classification is an update candidate",()=>{
  const plan=planIncrementalSync([post()],ledger({sources:[source()]}),classified());
  assert.equal(only(plan).decision,"UPDATE_CANDIDATE");
  assert.deepEqual(plan.candidates[0].expected,{storyId:"story-1",lockVersion:1,modifiedAt:T1});
});

test("a modified source without a fresh classification is held",()=>{
  const plan=planIncrementalSync([post()],ledger({sources:[source()]}),classified({sourceModifiedAt:T1}));
  assert.equal(only(plan).decision,"HOLD_PENDING_CLASSIFICATION");
});

for(const policy of ["premium_marker_review","premium","free"]){
  test("story policy "+policy+" is never updated or downgraded",()=>{
    const plan=planIncrementalSync([post()],ledger({sources:[source({storyAccessPolicy:policy})]}),classified());
    assert.equal(only(plan).decision,"HOLD_PREMIUM_REVIEW");
    assert.equal(plan.candidates.length,0);
  });
}

test("a story edited in the newsroom is never overwritten",()=>{
  for(const edited of [{storyLockVersion:2},{nativeRevisionCount:1}]){
    const plan=planIncrementalSync([post()],ledger({sources:[source(edited)]}),classified());
    assert.equal(only(plan).decision,"HOLD_NATIVE_EDIT_CONFLICT");
  }
});

test("a source record with no story is reported, not repaired",()=>{
  const plan=planIncrementalSync([post()],ledger({sources:[source({storyId:null})]}),classified());
  assert.equal(only(plan).decision,"BLOCK_LEDGER_ORPHAN_SOURCE");
});

test("source rows missing from a complete window are flagged for review, never deleted",()=>{
  const plan=planIncrementalSync([post()],ledger({sources:[source({stableKey:"wordpress:post:77",storyPublishedAt:T2})]}),classified(),{windowComplete:true,windowStartAt:T1});
  const missing=plan.decisions.find(item=>item.stableKey==="wordpress:post:77");
  assert.equal(missing.decision,"REVIEW_SOURCE_MISSING");
  assert.equal(plan.candidates.some(item=>item.stableKey==="wordpress:post:77"),false);
});

test("an incomplete window never infers an unpublish",()=>{
  const plan=planIncrementalSync([post()],ledger({sources:[source({stableKey:"wordpress:post:77",storyPublishedAt:T2})]}),classified(),{windowComplete:false,windowStartAt:T1});
  assert.equal(plan.decisions.some(item=>item.decision==="REVIEW_SOURCE_MISSING"),false);
  assert.equal(plan.unpublishDetection,"NOT_EVALUATED_INCOMPLETE_WINDOW");
});

test("the plan is data only: no SQL text, and the write stays held",()=>{
  const plan=planIncrementalSync([post()],ledger(),classified());
  assert.equal("sqlStatements" in plan,false);
  assert.doesNotMatch(JSON.stringify(plan),/INSERT INTO|ON CONFLICT|UPDATE public/i);
  assert.equal(plan.stagingDatabaseWriteStatus,"HELD_PENDING_OWNER_AUTHORIZATION");
});

test("identical inputs produce an identical plan hash",()=>{
  const first=planIncrementalSync([post()],ledger(),classified());
  const second=planIncrementalSync([post()],ledger(),classified());
  assert.match(first.planSha256,/^[0-9a-f]{64}$/);
  assert.equal(first.planSha256,second.planSha256);
});

test("the hash changes when the ledger snapshot changes",()=>{
  const first=planIncrementalSync([post()],ledger(),classified());
  const second=planIncrementalSync([post()],ledger({capturedAt:"2026-11-12T00:00:00.000Z"}),classified());
  assert.notEqual(first.planSha256,second.planSha256);
});

test("the planner refuses to run without a ledger snapshot",()=>{
  assert.throws(()=>planIncrementalSync([post()],null,classified()),/LEDGER_REQUIRED/);
  assert.throws(()=>planIncrementalSync([post()],{schemaVersion:1},classified()),/LEDGER_REQUIRED/);
});

test("the watermark advances to the newest modification when every post is resolved",()=>{
  const plan=planIncrementalSync([post()],ledger(),classified(),{latestModifiedRetrievedAt:T2});
  assert.equal(plan.nextWatermark,T2);
});

test("the watermark never advances past a post that still needs a decision",()=>{
  const held=post({postId:1,slug:"a",modifiedAt:T1});
  const plan=planIncrementalSync([held,post()],ledger(),classified(),{latestModifiedRetrievedAt:T2});
  assert.equal(plan.nextWatermark,T1);
});

test("a permanently held story does not pin the watermark",()=>{
  const plan=planIncrementalSync([post()],ledger({sources:[source({storyAccessPolicy:"premium_marker_review"})]}),classified(),{latestModifiedRetrievedAt:T2});
  assert.equal(plan.nextWatermark,T2);
});

test("a post retrieved but blocked by the probe is not reported as missing",()=>{
  const plan=planIncrementalSync([],ledger({sources:[source({stableKey:"wordpress:post:77",storyPublishedAt:T2})]}),null,{windowComplete:true,windowStartAt:T1,retrievedPostIds:[77]});
  assert.equal(plan.decisions.some(item=>item.decision==="REVIEW_SOURCE_MISSING"),false);
});

test("the ledger query is one read-only statement keyed by source identity",()=>{
  const query=buildLedgerQuery([post()]);
  assert.match(query.trim(),/^with\b/i);
  assert.equal(query.trim().replace(/;$/,"").includes(";"),false);
  assert.doesNotMatch(query,/\b(?:insert|update|delete|alter|drop|truncate|create|grant|revoke)\b/i);
  assert.match(query,/wordpress:post:/);
  assert.doesNotMatch(query,/\braw\b/);
});

test("the ledger query refuses input it cannot safely inline",()=>{
  assert.throws(()=>buildLedgerQuery([post({slug:"x'; drop table stories; --"})]),/INVALID_SLUG/);
  assert.throws(()=>buildLedgerQuery([post({postId:"1 or 1=1"})]),/INVALID_POST_ID/);
  assert.throws(()=>buildLedgerQuery([]),/NO_POSTS/);
});

test("a window start is validated before it reaches the query",()=>{
  assert.throws(()=>buildLedgerQuery([post()],{windowStartAt:"2026'; drop"}),/INVALID_WINDOW/);
  assert.match(buildLedgerQuery([post()],{windowStartAt:T1}),/2026-10-01T00:00:00\.000Z/);
});
