import test from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "./ts-module-loader.mjs";

const reactNative={Platform:{OS:"web"}};
const growth=loadTs("src/growth/analytics.ts",{mocks:{"react-native":reactNative}});
const events=loadTs("src/growth/events.ts");

test("public analytics accepts the approved article and redacted-search shapes",()=>{
  assert.doesNotThrow(()=>events.event("article_view",{premium_state:"public",section:"news"},{storyId:"42",pagePath:"/article/42"}));
  assert.doesNotThrow(()=>events.event("search_performed",{
    result_count:4,format:"all",country_filter:false,topic_filter:true,query_redacted:true
  },{pagePath:"/search"}));
});

test("every approved public event has an executable valid payload contract",()=>{
  const cases=[
    ["page_view",{route:"/"}],
    ["article_view",{premium_state:"public",section:"news"}],
    ["article_25_percent",{scroll_depth:25}],
    ["article_50_percent",{scroll_depth:50}],
    ["article_75_percent",{scroll_depth:75}],
    ["article_complete",{scroll_depth:100}],
    ["listen_started",{media_id:"audio-1",duration_seconds:120}],
    ["listen_completed",{media_id:"audio-1",duration_seconds:120,elapsed_seconds:120}],
    ["story_saved",{reader_state:"local-reader"}],
    ["story_shared",{channel:"system"}],
    ["whatsapp_share",{channel:"whatsapp"}],
    ["search_performed",{result_count:2,format:"all",country_filter:false,topic_filter:false,query_redacted:true}],
    ["topic_followed",{source_surface:"topic"}],
    ["citation_copied",{reference_kind:"citation"}],
    ["reference_opened",{reference_kind:"source"}],
    ["premium_preview_started",{preview_seconds:30}],
    ["premium_warning_shown",{seconds_elapsed:25}],
    ["premium_locked",{seconds_elapsed:30}],
    ["subscription_started",{plan_key:"monthly",source_path:"/premium",storefront_status:"available"}],
    ["subscription_completed",{plan_key:"monthly",server_entitlement_confirmed:true}],
    ["newsletter_signup",{surface:"reader"}],
    ["push_opt_in",{surface:"settings"}],
    ["ad_impression",{placement_key:"watch_feed",provider_state:"available",format:"feed-display"}],
    ["ad_click",{placement_key:"watch_feed",provider_state:"available",format:"feed-display"}]
  ];
  for(const [name,parameters] of cases){
    assert.doesNotThrow(()=>events.event(name,parameters,{pagePath:"/reader"}),name);
  }
  assert.equal(cases.length,events.HEALTH_TIMES_PUBLIC_EVENTS.length);
});

test("public analytics rejects raw health-query and protected editorial fields",()=>{
  assert.throws(()=>events.validatePublicAnalyticsEvent({
    eventName:"search_performed",eventVersion:"2026-09-09",pagePath:"/search",
    parameters:{query_redacted:true,raw_query:"diabetes"}
  }),/not approved|prohibited/i);
  assert.throws(()=>events.validatePublicAnalyticsEvent({
    eventName:"article_view",eventVersion:"2026-09-09",pagePath:"/studio/story/1",
    parameters:{premium_state:"public",section:"health"}
  }),/Newsroom\/Studio/i);
  assert.throws(()=>events.validatePublicAnalyticsEvent({
    eventName:"article_view",eventVersion:"2026-09-09",
    parameters:{premium_state:"public",protected_body:"secret"}
  }),/not approved|prohibited/i);
});

test("subscription completion cannot be asserted without server entitlement confirmation",()=>{
  assert.throws(()=>events.event("subscription_completed",{
    plan_key:"monthly",server_entitlement_confirmed:false
  }),/server entitlement/i);
  assert.doesNotThrow(()=>events.event("subscription_completed",{
    plan_key:"monthly",server_entitlement_confirmed:true
  }));
});

test("development analytics sink records validated events without provider transmission",async()=>{
  const sink=growth.createDevelopmentAnalyticsSink();
  const service=growth.createAnalyticsService(sink);
  await service.track(events.event("article_view",{premium_state:"public",section:"news"},{storyId:"1"}));
  assert.equal(sink.events.length,1);
  assert.equal((await service.getStatus()).provider,"development-test");
});

test("analytics failures are contained and never break Reader actions",async()=>{
  const service=growth.createAnalyticsService({
    getStatus:()=>({provider:"development-test",state:"error",measurementId:null,detail:"test"}),
    emit:async()=>{throw new Error("provider down");}
  });
  await assert.doesNotReject(()=>service.track(events.event("story_saved",{reader_state:"local-reader"},{storyId:"1"})));
  await assert.doesNotReject(()=>service.track({
    eventName:"search_performed",eventVersion:"2026-09-09",parameters:{query_redacted:false}
  }));
});

test("PWA web adapter emits only on canonical HealthTimes hosts",async()=>{
  const calls=[];
  const canonical=growth.createPwaWebAnalyticsAdapter({
    hostname:"healthtimes.co.zw",
    gtag:(...args)=>calls.push(args)
  });
  assert.equal(canonical.getStatus().state,"available");
  await canonical.emit(events.event("page_view",{route:"/"},{pagePath:"/"}));
  assert.equal(calls.length,1);
  assert.equal(calls[0][0],"event");
  assert.equal(calls[0][2].send_to,"G-S39LN2KX4X");

  const previewCalls=[];
  const preview=growth.createPwaWebAnalyticsAdapter({
    hostname:"kudzimusar.github.io",
    gtag:(...args)=>previewCalls.push(args)
  });
  assert.equal(preview.getStatus().state,"blocked-by-host");
  await preview.emit(events.event("page_view",{route:"/"},{pagePath:"/"}));
  assert.equal(previewCalls.length,0);
});

test("native analytics remains configuration-required and has no web measurement ID",async()=>{
  const native=growth.createNativeAnalyticsAdapter();
  const status=native.getStatus();
  assert.equal(status.state,"configuration-required");
  assert.equal(status.provider,"native");
  assert.equal(status.measurementId,null);
  await assert.doesNotReject(()=>native.emit(events.event("page_view",{route:"/"},{pagePath:"/"})));
});
