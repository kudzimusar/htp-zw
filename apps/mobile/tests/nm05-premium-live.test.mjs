import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const eas=JSON.parse(readFileSync(join(root,"eas.json"),"utf8"));
const env=eas.build?.staging?.env ?? {};
const url=String(env.EXPO_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/,"");
const key=String(env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "");
const referencePath="/2026/09/18/zimbabwe-strengthens-social-contracting-as-hiv-donor-funding-shrinks/";

async function rpc(name,args){
  const response=await fetch(url+"/rest/v1/rpc/"+encodeURIComponent(name),{
    method:"POST",
    headers:{
      apikey:key,
      Accept:"application/json",
      "Content-Type":"application/json",
      "x-healthtimes-client":"nm05-premium-consumer-certification"
    },
    body:JSON.stringify(args)
  });
  return {response,payload:await response.json().catch(()=>null)};
}

test("live public teaser authority exposes one bounded paragraph and no Premium body",async()=>{
  assert.match(url,/^https:\/\/gcdohgbmqhqwydgaxrcr\.supabase\.co$/);
  assert.match(key,/^sb_publishable_/);

  const {response,payload}=await rpc("ag05_public_story_teaser_document",{p_path:referencePath});
  assert.equal(response.ok,true);
  assert.equal(String(payload?.source_id),"33190");
  assert.equal(payload?.access_policy,"premium_marker_review");
  assert.equal(payload?.body_html,null);

  const teaser=String(payload?.premium_teaser_html ?? "").trim();
  const paragraphs=teaser.match(/<p(?:\s[^>]*)?>[\s\S]*?<\/p>/gi) ?? [];
  assert.equal(paragraphs.length,1);
  assert.equal(paragraphs[0].trim(),teaser);

  const digest=createHash("sha256").update(teaser).digest("hex");
  console.log(JSON.stringify({
    source_id:String(payload.source_id),
    access_policy:payload.access_policy,
    body_html_is_null:payload.body_html===null,
    teaser_paragraphs:paragraphs.length,
    teaser_length:teaser.length,
    teaser_sha256:digest
  }));
});

test("low-level teaser extractor remains unavailable to public Reader role",async()=>{
  const {response}=await rpc("ag05_first_editorial_paragraph_html",{p_html:"<p>probe</p>"});
  assert.equal(response.ok,false);
  assert.ok([400,401,403,404].includes(response.status));
});
