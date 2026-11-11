import test from "node:test";
import assert from "node:assert/strict";
import { confirmWithdrawals, planIncrementalSync } from "../scripts/editorial/sync-incremental-dryrun.mjs";
import { FRESHNESS_SLA_SECONDS, MAX_WITHDRAWALS_PER_CYCLE, runSyncCycle } from "../scripts/editorial/sync-cycle.mjs";
import { checkPostWithdrawn } from "../scripts/editorial/public-source-readonly-probe.mjs";
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
  authority:{role:"Publisher/Owner",decidedBy:"Publisher",decidedAt:"2026-11-10T00:00:00.000Z",basis:"Reviewed"},
  records:[{stableKey:"wordpress:post:500",accessPolicy:"public",sourceModifiedAt:T2,evidence:{kind:"publisher-owner-decision",reference:"d1"},...overrides}]
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

const missingPlan=()=>planIncrementalSync([],ledger({sources:[source({stableKey:"wordpress:post:77",storyPublishedAt:T2})]}),null,{windowComplete:true,windowStartAt:T1,retrievedPostIds:[]});
const sources=()=>ledger({sources:[source({stableKey:"wordpress:post:77",storyPublishedAt:T2})]});

test("a confirmed withdrawal becomes an unpublish candidate with concurrency guards",()=>{
  const plan=confirmWithdrawals(missingPlan(),sources(),new Map([["wordpress:post:77","withdrawn"]]));
  assert.equal(plan.decisions[0].decision,"UNPUBLISH_CANDIDATE");
  assert.deepEqual(plan.candidates[0].expected,{storyId:"story-1",lockVersion:1,modifiedAt:T1});
});

test("a post still published stays out of the withdrawal path",()=>{
  const plan=confirmWithdrawals(missingPlan(),sources(),new Map([["wordpress:post:77","still-published"]]));
  assert.equal(plan.decisions[0].decision,"NOOP_STILL_PUBLISHED");
  assert.equal(plan.candidates.length,0);
});

test("an inconclusive check never unpublishes",()=>{
  const plan=confirmWithdrawals(missingPlan(),sources(),new Map([["wordpress:post:77","unknown"]]));
  assert.equal(plan.decisions[0].decision,"REVIEW_SOURCE_MISSING");
  assert.equal(plan.candidates.length,0);
});

test("confirming withdrawals reseals the plan hash",()=>{
  const before=missingPlan();
  const after=confirmWithdrawals(before,sources(),new Map([["wordpress:post:77","withdrawn"]]));
  assert.notEqual(after.planSha256,before.planSha256);
});

for(const [label,response,expected] of [
  ["a published post",{ok:true,status:200,json:async()=>({id:9,status:"publish"})},"still-published"],
  ["a missing post",{ok:false,status:404,json:async()=>({code:"rest_post_invalid_id"})},"withdrawn"],
  ["a post no longer public",{ok:false,status:401,json:async()=>({code:"rest_forbidden"})},"withdrawn"],
  ["a forbidden post",{ok:false,status:403,json:async()=>({code:"rest_forbidden"})},"withdrawn"],
  ["a firewall 403 with no WordPress error",{ok:false,status:403,json:async()=>{throw new Error("html");}},"unknown"],
  ["a generic 404 with no WordPress error",{ok:false,status:404,json:async()=>({message:"not found"})},"unknown"],
  ["a server error",{ok:false,status:503},"unknown"],
  ["an unexpected status field",{ok:true,status:200,json:async()=>({id:9,status:"draft"})},"withdrawn"]
]){
  test("withdrawal check treats "+label+" as "+expected,async()=>{
    assert.equal(await checkPostWithdrawn(9,{fetchImpl:async()=>response}),expected);
  });
}

test("a network failure is inconclusive",async()=>{
  assert.equal(await checkPostWithdrawn(9,{fetchImpl:async()=>{throw new Error("reset");}}),"unknown");
});

test("the withdrawal check rejects a non-integer post id",async()=>{
  assert.equal(await checkPostWithdrawn("1/../2",{fetchImpl:async()=>{throw new Error("must not fetch");}}),"unknown");
});

const windowOf=(candidates,extra={})=>async()=>({candidates,retrieved:candidates.length,retrievedPostIds:candidates.map(p=>p.postId),windowComplete:true,latestModifiedRetrievedAt:T2,...extra});
const NOW=Date.parse("2026-11-06T00:00:00.000Z");

test("a source outage changes nothing and raises an alert",async()=>{
  const result=await runSyncCycle({state:{watermark:T1},probe:async()=>({status:"BLOCKED_SOURCE_HTTP"}),readLedger:async()=>ledger(),now:NOW});
  assert.equal(result.status,"SOURCE_UNAVAILABLE");
  assert.equal(result.state.watermark,T1);
  assert.ok(result.alerts.includes("SOURCE_UNAVAILABLE"));
});

test("without a writer the cycle plans and holds",async()=>{
  const result=await runSyncCycle({state:{},probe:windowOf([post()]),readLedger:async()=>ledger(),classification:classified(),now:NOW});
  assert.equal(result.status,"PLANNED_HELD");
  assert.equal(result.state.watermark,undefined);
});

test("the cycle reads from one second before the watermark",async()=>{
  let since;
  await runSyncCycle({state:{watermark:T2},probe:async(options)=>{since=options.since;return {candidates:[],retrievedPostIds:[],windowComplete:true};},readLedger:async()=>ledger(),now:NOW});
  assert.equal(since,"2026-11-04T23:59:59.000Z");
});

test("a stale last success raises the freshness alert",async()=>{
  const stale=new Date(NOW-(FRESHNESS_SLA_SECONDS+1)*1000).toISOString();
  const result=await runSyncCycle({state:{lastSuccessAt:stale},probe:windowOf([]),readLedger:async()=>ledger(),now:NOW});
  assert.ok(result.alerts.includes("FRESHNESS_SLA_EXCEEDED"));
});

test("posts waiting on a decision raise an alert",async()=>{
  const result=await runSyncCycle({state:{},probe:windowOf([post()]),readLedger:async()=>ledger(),now:NOW});
  assert.ok(result.alerts.includes("DECISIONS_PENDING"));
});

test("a sudden spike of withdrawals is held for review, not applied",async()=>{
  const rows=Array.from({length:MAX_WITHDRAWALS_PER_CYCLE+1},(_,n)=>source({stableKey:"wordpress:post:"+(9000+n),storyPublishedAt:T2,storySlug:"s"+n}));
  let applied=false;
  const result=await runSyncCycle({
    state:{},now:NOW,
    probe:async()=>({candidates:[post()],retrievedPostIds:[500],windowComplete:true,latestModifiedRetrievedAt:T2}),
    readLedger:async()=>ledger({sources:rows}),
    classification:null,
    checkWithdrawn:async()=>"withdrawn",
    apply:async()=>{applied=true;return {};}
  });
  assert.equal(applied,false);
  assert.ok(result.alerts.includes("WITHDRAWAL_SPIKE"));
  assert.equal(result.plan.candidates.length,0);
});

test("the sync SLA target is 15 minutes",()=>{
  assert.equal(FRESHNESS_SLA_SECONDS,900);
});
