import { request } from "@playwright/test";
import { createHash } from "node:crypto";
import { appendFileSync, writeFileSync } from "node:fs";

const baseURL=String(process.env.AG06_STAGING_BASE_URL||"").replace(/\/$/,"");
const supabaseURL=String(process.env.AG06_STAGING_SUPABASE_URL||"").replace(/\/$/,"");
const anonKey=String(process.env.AG06_STAGING_SUPABASE_PUBLISHABLE_KEY||"");
const accounts={
  reporter:{email:process.env.AG06_REPORTER_EMAIL,password:process.env.AG06_REPORTER_PASSWORD},
  editor:{email:process.env.AG06_EDITOR_EMAIL,password:process.env.AG06_EDITOR_PASSWORD},
  publisher:{email:process.env.AG06_PUBLISHER_EMAIL,password:process.env.AG06_PUBLISHER_PASSWORD}
};

function invariant(value,message){
  if(!value) throw new Error(message);
}
function statusOf(response){
  return typeof response.status==="function"?response.status():response.status;
}
function csrfFrom(state){
  return state.cookies.find((cookie)=>cookie.name==="htp_nr_csrf")?.value||"";
}
async function adopt(kind){
  const account=accounts[kind];
  invariant(account?.email&&account?.password,kind+" staging account is missing");
  const auth=await fetch(`${supabaseURL}/auth/v1/token?grant_type=password`,{
    method:"POST",
    headers:{apikey:anonKey,"Content-Type":"application/json"},
    body:JSON.stringify(account)
  });
  invariant(auth.ok,kind+" direct auth failed HTTP "+auth.status);
  const session=await auth.json();
  const ctx=await request.newContext({
    baseURL,
    ignoreHTTPSErrors:true,
    extraHTTPHeaders:{Origin:baseURL}
  });
  const adopted=await ctx.post("/api/newsroom",{data:{
    action:"adoptSession",
    accessToken:session.access_token,
    refreshToken:session.refresh_token,
    expiresIn:session.expires_in
  }});
  invariant(statusOf(adopted)===200,kind+" adoption failed HTTP "+statusOf(adopted));
  const csrf=csrfFrom(await ctx.storageState());
  invariant(csrf,kind+" CSRF cookie is missing");
  return {ctx,csrf};
}
async function appPost(client,action,payload={}){
  return client.ctx.post("/api/newsroom",{
    headers:{Origin:baseURL,"X-HTP-CSRF":client.csrf},
    data:{action,...payload}
  });
}
async function bootstrap(client){
  const response=await client.ctx.get("/api/newsroom?action=bootstrap",{headers:{Origin:baseURL}});
  const body=await response.json().catch(()=>({}));
  invariant(statusOf(response)===200,"bootstrap failed HTTP "+statusOf(response));
  return body;
}
async function anonRpc(name,args){
  const response=await fetch(`${supabaseURL}/rest/v1/rpc/${name}`,{
    method:"POST",
    headers:{apikey:anonKey,Authorization:`Bearer ${anonKey}`,"Content-Type":"application/json"},
    body:JSON.stringify(args)
  });
  const body=await response.json().catch(()=>null);
  invariant(response.ok,`${name} failed HTTP ${response.status}: ${JSON.stringify(body)}`);
  return body;
}
async function expectStatus(response,expected,label){
  const actual=statusOf(response);
  invariant(actual===expected,`${label} expected HTTP ${expected}, got ${actual}`);
}

invariant(baseURL&&supabaseURL&&anonKey,"NM-04 staging fixture requires bounded staging configuration");

const stamp=Date.now();
const slug=`nm04-native-reader-${process.env.GITHUB_RUN_ID||stamp}`;
const path=`/${slug}/`;
const title=`NM-04 Native Reader ${process.env.GITHUB_RUN_ID||stamp}`;
const bodyText="CMS-native public Reader certification body.";
const standfirst="CMS-native Reader source-neutral featured-media proof.";
const filename=`nm04-native-${stamp}.png`;
const image=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=","base64");
const checksum=createHash("sha256").update(image).digest("hex");
const altText="HealthTimes NM-04 CMS-native certification image";
const caption="NM-04 source-neutral Reader certification";
const credit="HealthTimes certification";

const reporter=await adopt("reporter");
const editor=await adopt("editor");
const publisher=await adopt("publisher");

try{
  const created=await appPost(reporter,"createStory",{story:{
    title,slug,desk:"Africa",country:"Zimbabwe",region:"Africa"
  }});
  await expectStatus(created,200,"create story");
  const storyId=(await created.json()).id;
  invariant(storyId,"fixture story id is missing");

  let reporterBoot=await bootstrap(reporter);
  let story=reporterBoot.data.stories.find((candidate)=>candidate.id===storyId);
  invariant(story,"fixture story missing from reporter bootstrap");

  const saved=await appPost(reporter,"saveStory",{
    storyId,
    expectedVersion:story.lock_version,
    patch:{
      title,
      standfirst,
      body:bodyText,
      sources:"NM-04 staging certification source."
    },
    reason:"Prepare NM-04 CMS-native Reader certification story"
  });
  await expectStatus(saved,200,"save story");

  const prepared=await appPost(reporter,"prepareStoryMedia",{
    storyId,
    filename,
    mimeType:"image/png",
    byteSize:image.length,
    checksum,
    altText,
    caption,
    credit,
    sourceProvenance:`NM04_NATIVE_READER_CERT:${process.env.GITHUB_RUN_ID||stamp}`,
    usageType:"featured"
  });
  await expectStatus(prepared,200,"prepare featured media");
  const preparedBody=await prepared.json();
  invariant(preparedBody.prepared?.storage_bucket==="newsroom-private","featured media did not begin private");
  const mediaId=preparedBody.prepared.media_id;

  const uploadForm=new FormData();
  uploadForm.append("cacheControl","3600");
  uploadForm.append("",new Blob([image],{type:"image/png"}),filename);
  const upload=await fetch(preparedBody.uploadUrl,{method:"PUT",headers:{"x-upsert":"false"},body:uploadForm});
  invariant(upload.ok,"private media upload failed HTTP "+upload.status);

  const finalized=await appPost(reporter,"finalizeStoryMedia",{mediaId,storyId,usageType:"featured",checksum});
  await expectStatus(finalized,200,"finalize featured media");

  const unreleased=await anonRpc("newsroom_public_story_document",{p_path:path});
  invariant(unreleased===null,"unreleased native story resolved before public_reader release");

  const submitted=await appPost(reporter,"transitionStory",{storyId,nextStatus:"Submitted"});
  await expectStatus(submitted,200,"submit story");
  for(const nextStatus of ["Fact check","Health / Science review","Copy edit","Editor review","Ready"]){
    const moved=await appPost(editor,"transitionStory",{storyId,nextStatus});
    await expectStatus(moved,200,"transition "+nextStatus);
  }
  const published=await appPost(publisher,"transitionStory",{storyId,nextStatus:"Published"});
  await expectStatus(published,200,"Publisher publication");

  const doc=await anonRpc("newsroom_public_story_document",{p_path:path});
  invariant(doc?.story_id===storyId,"released document story identity mismatch");
  invariant(doc?.source_type==="native-story","released document source_type mismatch");
  invariant(doc?.handling==="native_cms","released document handling mismatch");
  invariant(doc?.body_html?.includes(bodyText),"released public body is missing");
  invariant(doc?.featured_storage_bucket==="newsroom-public","featured media was not promoted to newsroom-public");
  invariant(doc?.featured_public_url,"released document public media URL is missing");
  invariant(String(doc.featured_public_url).includes("/storage/v1/object/public/newsroom-public/"),"featured media URL is not public newsroom-public");
  invariant(!String(doc.featured_public_url).includes("newsroom-private"),"private bucket leaked into public media URL");
  invariant(String(doc.featured_checksum||"").toLowerCase()===checksum,"featured checksum mismatch");

  const listing=await anonRpc("newsroom_public_published_stories",{p_slug:slug});
  invariant(Array.isArray(listing)&&listing.length===1&&listing[0]?.id===storyId,"released native story missing from public listing");

  const publicObject=await fetch(doc.featured_public_url);
  invariant(publicObject.ok,"promoted public media returned HTTP "+publicObject.status);
  const publicChecksum=createHash("sha256").update(Buffer.from(await publicObject.arrayBuffer())).digest("hex");
  invariant(publicChecksum===checksum,"render-source public bytes checksum mismatch");

  const evidence={
    sha:process.env.GITHUB_SHA||null,
    run_id:process.env.GITHUB_RUN_ID||null,
    story_id:storyId,
    media_id:mediaId,
    slug,
    path,
    title,
    standfirst,
    body_text:bodyText,
    featured_public_url:doc.featured_public_url,
    featured_storage_bucket:doc.featured_storage_bucket,
    featured_storage_object:doc.featured_storage_object,
    featured_checksum:doc.featured_checksum,
    alt_text:doc.featured_alt_text,
    caption:doc.featured_caption,
    credit:doc.featured_credit,
    access_policy:doc.access_policy,
    source_type:doc.source_type,
    handling:doc.handling
  };
  const evidencePath=process.env.NM04_FIXTURE_EVIDENCE_PATH||"/tmp/nm04-native-fixture.json";
  writeFileSync(evidencePath,JSON.stringify(evidence,null,2));
  if(process.env.GITHUB_OUTPUT){
    for(const [key,value] of Object.entries({
      story_id:storyId,
      slug,
      title,
      featured_public_url:doc.featured_public_url,
      featured_checksum:doc.featured_checksum
    })){
      appendFileSync(process.env.GITHUB_OUTPUT,`${key}=${String(value)}\n`);
    }
  }
  console.log("NM04_NATIVE_FIXTURE",JSON.stringify(evidence));
} finally {
  await Promise.all([reporter.ctx.dispose(),editor.ctx.dispose(),publisher.ctx.dispose()]);
}
