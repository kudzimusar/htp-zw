import test from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "./ts-module-loader.mjs";

const linking={
  createURL:(path)=>"healthtimes://"+path,
  parse:(value)=>{
    if(value.startsWith("healthtimes://")){
      return {path:value.slice("healthtimes://".length).split(/[?#]/)[0]};
    }
    try{return {path:new URL(value).pathname.replace(/^\//,"").replace(/\/$/,"")};}
    catch{return {path:null};}
  }
};
const links=loadTs("src/growth/deepLinks.ts",{mocks:{"expo-linking":linking}});

const article={id:"wp:123",slug:"verified-story"};

test("outgoing shares use canonical HealthTimes URL and bounded approved attribution",()=>{
  for(const channel of ["system","whatsapp","facebook","x","linkedin","copy"]){
    const value=new URL(links.attributedShareUrl(article,channel));
    assert.equal(value.hostname,"healthtimes.co.zw");
    assert.equal(value.pathname,"/verified-story/");
    assert.equal(value.searchParams.get("utm_source"),"healthtimes_share");
    assert.equal(value.searchParams.get("utm_medium"),channel);
    assert.equal(value.searchParams.get("utm_campaign"),"organic_share");
    assert.equal(value.searchParams.get("ht_article_id"),"wp:123");
  }
});

test("native article deep links accept only bounded identifiers",()=>{
  assert.equal(links.parseHealthTimesDeepLink("healthtimes://article/wp%3A123").articleId,"wp:123");
  assert.equal(links.parseHealthTimesDeepLink("healthtimes://article/%E0%A4%A"),null);
  assert.equal(links.parseHealthTimesDeepLink("healthtimes://article/../../studio"),null);
});

test("canonical web links resolve by slug and never trust inbound ht_article_id",()=>{
  const destination=links.parseHealthTimesDeepLink(
    "https://healthtimes.co.zw/verified-story/?ht_article_id=hostile-admin-id&utm_source=WhatsApp"
  );
  assert.deepEqual(destination,{type:"article-slug",articleSlug:"verified-story"});
});

test("hostile hosts malformed URLs and reserved paths are rejected",()=>{
  for(const value of [
    "https://evil.example/verified-story/?ht_article_id=wp:123",
    "not a url",
    "javascript:alert(1)",
    "https://healthtimes.co.zw/wp-admin/",
    "https://healthtimes.co.zw/search/"
  ]) assert.equal(links.parseHealthTimesDeepLink(value),null);
});

test("social attribution normalizes UTM values and canonical paths",()=>{
  const attribution=links.parseSocialReferral(
    "https://www.healthtimes.co.zw/verified-story?utm_source=Whats App&utm_medium=SOCIAL%20Share&utm_campaign=Launch!!!&utm_content=Card%201"
  );
  assert.deepEqual(attribution,{
    source:"whats-app",
    medium:"social-share",
    campaign:"launch",
    content:"card-1",
    canonicalPath:"/verified-story/"
  });
});

test("social attribution rejects untrusted and non-HTTPS hosts",()=>{
  assert.equal(links.parseSocialReferral("https://evil.example/story?utm_source=x"),null);
  assert.equal(links.parseSocialReferral("http://healthtimes.co.zw/story?utm_source=x"),null);
});
