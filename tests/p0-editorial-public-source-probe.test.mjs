import test from "node:test";
import assert from "node:assert/strict";
import { assessPublishedPost, probePublicPublisher, utcPublicationDate } from "../scripts/editorial/public-source-readonly-probe.mjs";

function post(overrides={}) {
  return {
    id: 99401, type:"post", status:"publish", slug:"new-public-report",
    link:"https://healthtimes.co.zw/new-public-report/",
    date_gmt:"2026-11-06T10:00:00", modified_gmt:"2026-11-07T10:00:00",
    title:{rendered:"Current public report"},
    categories:[1], _embedded:{"wp:term":[[{id:1,taxonomy:"category",name:"Health News",slug:"health-news"}]]},
    ...overrides
  };
}

test("UTC dates are normalized explicitly",()=>{
  assert.equal(utcPublicationDate("2026-11-06T10:00:00"),"2026-11-06T10:00:00.000Z");
  assert.equal(utcPublicationDate(""),null);
});

test("published public metadata is accepted without returning body HTML",()=>{
  const result=assessPublishedPost({...post(),content:{rendered:"PRIVATE CONTENT MUST NOT LEAK"}});
  assert.equal(result.decision,"PUBLIC_METADATA_CANDIDATE");
  assert.equal(result.article.publishedAt,"2026-11-06T10:00:00.000Z");
  assert.equal(JSON.stringify(result).includes("PRIVATE CONTENT"),false);
});

test("Premium markers, missing categories, drafts, pages and noncanonical URLs are blocked",()=>{
  assert.equal(assessPublishedPost(post({_embedded:{"wp:term":[[{id:1,taxonomy:"category",name:"HealthTimes Premium",slug:"healthtimes-premium"}]]}})).decision,"BLOCK_RESTRICTED_CONTENT");
  assert.equal(assessPublishedPost(post({categories:[]})).decision,"BLOCK_UNRESOLVED_CLASSIFICATION");
  assert.equal(assessPublishedPost(post({status:"draft"})).decision,"SKIP_NOT_PUBLISHED_POST");
  assert.equal(assessPublishedPost(post({type:"page"})).decision,"SKIP_NOT_PUBLISHED_POST");
  assert.equal(assessPublishedPost(post({link:"https://evil.example/post/"})).decision,"BLOCK_UNVERIFIED_CANONICAL_URL");
});

test("public source HTTP refusal is reported blocked, not falsely passed",async()=>{
  const result=await probePublicPublisher({fetchImpl:async()=>({ok:false,status:403})});
  assert.equal(result.status,"BLOCKED_SOURCE_HTTP");
  assert.equal(result.httpStatus,403);
});

test("safe metadata produces date-sorted diagnostics without claiming Reader synchronization",async()=>{
  let url,options;
  const result=await probePublicPublisher({
    now:Date.parse("2026-11-09T10:00:00Z"),
    fetchImpl:async(u,o)=>{
      if(u.includes("/posts?")){url=u;options=o;}
      return {ok:true,status:200,json:async()=>[
        post({id:1,slug:"older",date_gmt:"2026-11-04T12:00:00"}),
        post({id:2,slug:"newer",date_gmt:"2026-11-06T12:00:00"}),
        post({id:3,slug:"premium",_embedded:{"wp:term":[[{id:1,taxonomy:"category",name:"HealthTimes Premium",slug:"premium"}]]}})
      ]};
    }
  });
  assert.match(url,/\/wp-json\/wp\/v2\/posts\?/);
  assert.equal(options.method,"GET");
  assert.equal(options.credentials,"omit");
  assert.equal(result.latestTwentyMetadata[0].slug,"newer");
  assert.equal(result.latestWithin7Days,true);
  assert.equal(result.decisions.BLOCK_RESTRICTED_CONTENT,1);
  assert.equal(result.ingestionVerified,false);
  assert.equal(result.readerFreshnessVerified,false);
});


test("missing embedded terms can be verified through bounded WordPress taxonomy lookups",async()=>{
  const calls=[];
  const result=await probePublicPublisher({
    now:Date.parse("2026-11-09T00:00:00Z"),
    fetchImpl:async(url)=>{
      calls.push(url);
      let body;
      if(url.includes("/categories?")) body=[{id:1,name:"Health News",slug:"health-news"}];
      else if(url.includes("/tags?")) body=[{id:11,name:"Policy",slug:"policy"}];
      else body=[post({_embedded:{},tags:[11]})];
      return {ok:true,status:200,json:async()=>body};
    }
  });
  assert.equal(result.status,"PROBE_SUCCEEDED_NOT_AUTHORIZED_AS_FEED");
  assert.equal(result.latestTwentyMetadata.length,1);
  assert.ok(calls.some(url=>url.includes("/categories?")));
  assert.ok(calls.some(url=>url.includes("/tags?")));
  assert.equal(result.fullBodyPublicationVerified,false);
});

test("unresolvable taxonomy remains fail-closed even when headline is current",async()=>{
  const result=await probePublicPublisher({
    now:Date.parse("2026-11-09T00:00:00Z"),
    fetchImpl:async(url)=>({
      ok:true,status:200,json:async()=>url.includes("/posts?") ? [post({_embedded:{},tags:[99]})] : []
    })
  });
  assert.equal(result.status,"BLOCKED_NO_VERIFIABLE_PUBLIC_POST");
  assert.equal(result.decisions.BLOCK_UNRESOLVED_CLASSIFICATION,1);
});
