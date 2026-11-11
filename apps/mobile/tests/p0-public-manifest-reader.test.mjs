import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { loadTs } from "./ts-module-loader.mjs";

const NOW=new Date().toISOString();
const SLUG="public-lab-shortages";
const MEDIA="https://healthtimes.co.zw/wp-content/uploads/2026/11/lab.jpg";

const entry=(overrides={})=>({
  id:33649,type:"post",status:"publish",slug:SLUG,link:"https://healthtimes.co.zw/"+SLUG+"/",
  publishedAt:NOW,modifiedAt:NOW,title:"Public lab shortages",categoryIds:[1],
  publicTerms:[{id:1,taxonomy:"category",slug:"health-news",name:"Health News"}],
  contentBody:null,excerpt:null,heroMedia:null,authorName:null,
  bodyAuthority:"BLOCKED_PENDING_OWNER_CLASSIFICATION",authorAuthority:"NOT_VERIFIED",mediaAuthority:"NOT_VERIFIED",
  ...overrides
});
const classified=(overrides={})=>entry({contentBody:"<p>Body text.</p>",bodyAuthority:"EDITORIAL_CLASSIFIED_PUBLIC",...overrides});
const manifestOf=(articles)=>({
  schemaVersion:1,source:"healthtimes.co.zw/public-wordpress-rest-metadata",verifiedAt:NOW,
  metadataOnly:!articles.some(a=>a.contentBody),contentBodyAvailable:articles.some(a=>a.contentBody),
  restrictedBodiesIncluded:false,count:articles.length,
  contentHashSha256:createHash("sha256").update(JSON.stringify(articles)).digest("hex"),articles
});

async function storyFrom(articles){
  const previous={fetch:global.fetch,location:globalThis.location,flag:process.env.EXPO_PUBLIC_HT_P0_PUBLIC_MANIFEST_AVAILABLE};
  process.env.EXPO_PUBLIC_HT_P0_PUBLIC_MANIFEST_AVAILABLE="true";
  globalThis.location={origin:"https://preview.example"};
  global.fetch=async()=>({ok:true,status:200,json:async()=>manifestOf(articles)});
  try{
    const {sourceParityServices}=loadTs("src/services/source-parity.ts",{mocks:{
      "expo-linking":{createURL:(path)=>"healthtimes://"+path,parse:()=>({path:null})},
      "react-native":{Platform:{OS:"web"}}
    }});
    const home=await sourceParityServices.articles.getHome();
    return home.find(article=>article.slug===SLUG)??null;
  }finally{
    global.fetch=previous.fetch;
    if(previous.location===undefined) delete globalThis.location; else globalThis.location=previous.location;
    if(previous.flag===undefined) delete process.env.EXPO_PUBLIC_HT_P0_PUBLIC_MANIFEST_AVAILABLE;
    else process.env.EXPO_PUBLIC_HT_P0_PUBLIC_MANIFEST_AVAILABLE=previous.flag;
  }
}

test("a metadata-only manifest is accepted without a body",async()=>{
  const story=await storyFrom([entry()]);
  assert.ok(story);
  assert.equal(story.bodyHtml??null,null);
});

test("an editorially classified body reaches the Reader",async()=>{
  const story=await storyFrom([classified({heroMedia:{sourceUrl:MEDIA,altText:"Lab",caption:""}})]);
  assert.equal(story.bodyHtml,"<p>Body text.</p>");
  assert.equal(story.heroMedia.publicUrl,MEDIA);
});

const REJECTED={
  "the retired R2 authority":classified({bodyAuthority:"VERIFIED_PUBLIC_PUBLISHED"}),
  "a body under a blocked authority":entry({contentBody:"<p>x</p>"}),
  "media under a blocked authority":entry({heroMedia:{sourceUrl:MEDIA,altText:"",caption:""}}),
  "a classified authority with no body":classified({contentBody:null}),
  "an empty classified body":classified({contentBody:"   "}),
  "an unsupported element":classified({contentBody:"<table><tr><td>x</td></tr></table>"}),
  "svg markup":classified({contentBody:"<svg onload=alert(1)></svg>"}),
  "an event handler":classified({contentBody:'<p onclick="alert(1)">x</p>'}),
  "a style attribute":classified({contentBody:'<p style="color:red">x</p>'}),
  "a srcset attribute":classified({contentBody:'<img src="'+MEDIA+'" srcset="https://evil.example/x 2x">'}),
  "an off-host body image":classified({contentBody:'<img src="https://evil.example/wp-content/uploads/x.jpg">'}),
  "an off-host hero":classified({heroMedia:{sourceUrl:"https://evil.example/wp-content/uploads/x.jpg",altText:"",caption:""}}),
  "an insecure hero":classified({heroMedia:{sourceUrl:"http://healthtimes.co.zw/wp-content/uploads/x.jpg",altText:"",caption:""}})
};
for(const [label,bad] of Object.entries(REJECTED)){
  test("the manifest is refused for "+label,async()=>{
    assert.equal(await storyFrom([bad]),null);
  });
}

test("one bad record rejects the whole manifest",async()=>{
  const other=entry({id:2,slug:"other-story",link:"https://healthtimes.co.zw/other-story/"});
  assert.equal(await storyFrom([classified({bodyAuthority:"VERIFIED_PUBLIC_PUBLISHED"}),other]),null);
});
