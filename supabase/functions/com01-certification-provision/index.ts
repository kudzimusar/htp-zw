import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { createLocalJWKSet, jwtVerify } from "npm:jose@5.10.0";

const ISSUER = "https://token.actions.githubusercontent.com";
const AUDIENCE = "healthtimes-com01-certification";
const JWKS = createLocalJWKSet({keys:[
  {"kty":"RSA","alg":"RS256","use":"sig","kid":"cc413527-173f-5a05-976e-9c52b1d7b431","n":"w4M936N3ZxNaEblcUoBm-xu0-V9JxNx5S7TmF0M3SBK-2bmDyAeDdeIOTcIVZHG-ZX9N9W0u1yWafgWewHrsz66BkxXq3bscvQUTAw7W3s6TEeYY7o9shPkFfOiU3x_KYgOo06SpiFdymwJflRs9cnbaU88i5fZJmUepUHVllP2tpPWTi-7UA3AdP3cdcCs5bnFfTRKzH2W0xqKsY_jIG95aQJRBDpbiesefjuyxcQnOv88j9tCKWzHpJzRKYjAUM6OPgN4HYnaSWrPJj1v41eEkFM1kORuj-GSH2qMVD02VklcqaerhQHIqM-RjeHsN7G05YtwYzomE5G-fZuwgvQ","e":"AQAB"},
  {"kty":"RSA","alg":"RS256","use":"sig","kid":"38826b17-6a30-5f9b-b169-8beb8202f723","n":"5Manmy-zwsk3wEftXNdKFZec4rSWENW4jTGevlvAcU9z3bgLBogQVvqYLtu9baVm2B3rfe5onadobq8po5UakJ0YsTiiEfXWdST7YI2Sdkvv-hOYMcZKYZ4dFvuSO1vQ2DgEkw_OZNiYI1S518MWEcNxnPU5u67zkawAGsLlmXNbOylgVfBRJrG8gj6scr-sBs4LaCa3kg5IuaCHe1pB-nSYHovGV_z0egE83C098FfwO1dNZBWeo4Obhb5Z-ZYFLJcZfngMY0zJnCVNmpHQWOgxfGikh3cwi4MYrFrbB4NTlxbrQ3bL-rGKR5X318veyDlo8Dyz2KWMobT4wB9U1Q","e":"AQAB"},
  {"kty":"RSA","alg":"RS256","use":"sig","kid":"38E9B30B3A023A1B72309921A69A42FCC496C42C","n":"tEq2Fp9HcdT5MwMsB_UTm8j_woJJLi3sA-y0RX2tioTm581seyfvOH6lJ5JmHVtS-_fb8B2tRT1pznHQSNq14PsJdu9bp5egbWmIz-5RvhqoM-oKem_MJENCNFuqXijRLT47FRdfH3inqde1vJlA_JJHCqYMKIpHH7kqNFYcCpwr0vk80Hc2rTyL0uBXI7NqBZbtUgNoyucWO5O7QQrPNOmlr-GI8aFckFRfobCaCOiH9qW02FtkV74fwBGVCNhNf3a1CK81-O8xEGimvVydI_pQA5B8QqVuQjY_ntOu555HdirA0hKkY6fsE9eZCMFmWDHZ2kSWLjhabxWxIzSzXQ","e":"AQAB"},
  {"kty":"RSA","alg":"RS256","use":"sig","kid":"4F3E9AD8C9A6F5EB3173006F4FA630E28F43DCE9","n":"tGevqhkBGn8NB0dKxs8Ddxhn-xZPm55svcSlkJZEOwDOXDLl_0-iVOVKNJfcHHLHvMqa6zh2DDcpAWZi2FpeBAJupsrymqwzllxOODWKWoVIoaIjOO7h1JLiF9Knwuq-o6BPtKdwOT-bOrXRzChMtQsc5C1Auex-D0Z6loObBuK1Lkm0RK9ISQsLqBEwq8g0OOupI_shU1r2rT2G0nkZ0CvxVlQeUGShFi8Mdys2s5LPqBwjC4LKwjk8moWQV32KEccbTPKxnG_539DxRglHJgHPHisSVGsfZIUXi2chtXdQHZPdVve8ZRmknCykZtkJ6K87llSUXi7oyzhCIZdiUQ","e":"AQAB"}
]});

const ROLES: Record<string,string> = {
  reporter: "Reporter / Journalist",
  editor: "Editor-in-Chief",
  commercial: "Commercial Manager",
  publisher: "Publisher / Owner"
};

function response(status:number, body:unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {"content-type":"application/json","cache-control":"no-store"}
  });
}

async function verifyCaller(req:Request, body:any) {
  const auth=req.headers.get("authorization")||"";
  if(!auth.startsWith("Bearer ")) throw new Error("GitHub OIDC token required");
  const {payload}=await jwtVerify(auth.slice(7),JWKS,{issuer:ISSUER,audience:AUDIENCE});
  const runId=String(body.run_id||"");
  const runAttempt=String(body.run_attempt||"");
  if(payload.repository!=="kudzimusar/htp-zw") throw new Error("repository claim mismatch");
  if(!["pull_request","workflow_dispatch"].includes(String(payload.event_name||""))) throw new Error("event claim mismatch");
  if(!String(payload.workflow_ref||"").includes("kudzimusar/htp-zw/.github/workflows/com01-communications.yml@")) throw new Error("workflow claim mismatch");
  if(String(payload.run_id||"")!==runId) throw new Error("run claim mismatch");
  if(String(payload.run_attempt||"1")!==runAttempt) throw new Error("run-attempt claim mismatch");
  return {runId,runAttempt};
}

async function deleteByIds(client:any, table:string, column:string, ids:string[]) {
  if(!ids.length) return;
  const result=await client.from(table).delete().in(column,ids);
  if(result.error) throw result.error;
}

async function cleanup(admin:any, runId:string) {
  const usersResult=await admin.auth.admin.listUsers({page:1,perPage:1000});
  if(usersResult.error) throw usersResult.error;
  const users=usersResult.data.users.filter((u:any)=>
    u.user_metadata?.com01_staging_test===true &&
    String(u.user_metadata?.github_run_id||"")===runId
  );
  const authIds=users.map((u:any)=>u.id);
  let staff:any[]=[];
  if(authIds.length){
    const q=await admin.from("staff_profiles").select("id,auth_user_id,email").in("auth_user_id",authIds);
    if(q.error) throw q.error;
    staff=q.data||[];
  }
  const staffIds=staff.map((x:any)=>x.id);

  const contactsQ=await admin.from("contact_profiles").select("id,email").like("email","%"+runId+"%");
  if(contactsQ.error) throw contactsQ.error;
  const contactIds=(contactsQ.data||[]).map((x:any)=>x.id);

  let threadIds:string[]=[];
  if(contactIds.length){
    const tq=await admin.from("communication_threads").select("id").in("contact_id",contactIds);
    if(tq.error) throw tq.error;
    threadIds=(tq.data||[]).map((x:any)=>x.id);
  }
  let messageIds:string[]=[];
  if(threadIds.length){
    const mq=await admin.from("communication_messages").select("id").in("thread_id",threadIds);
    if(mq.error) throw mq.error;
    messageIds=(mq.data||[]).map((x:any)=>x.id);
  }
  await deleteByIds(admin,"communication_attachments","message_id",messageIds);
  await deleteByIds(admin,"communication_events","message_id",messageIds);
  await deleteByIds(admin,"communication_assignments","thread_id",threadIds);
  await deleteByIds(admin,"communication_participants","thread_id",threadIds);
  await deleteByIds(admin,"communication_messages","thread_id",threadIds);
  await deleteByIds(admin,"communication_threads","id",threadIds);

  if(contactIds.length){
    await deleteByIds(admin,"campaign_recipients","contact_id",contactIds);
    await deleteByIds(admin,"contact_segment_members","contact_id",contactIds);
    await deleteByIds(admin,"communication_suppressions","contact_id",contactIds);
    await deleteByIds(admin,"contact_consents","contact_id",contactIds);
    await deleteByIds(admin,"communication_events","contact_id",contactIds);
    await deleteByIds(admin,"contact_profiles","id",contactIds);
  }

  if(staffIds.length){
    const posts=await admin.from("social_posts").select("id").in("created_by",staffIds);
    if(posts.error) throw posts.error;
    const postIds=(posts.data||[]).map((x:any)=>x.id);
    await deleteByIds(admin,"social_publication_attempts","social_post_id",postIds);
    await deleteByIds(admin,"social_posts","id",postIds);
    await deleteByIds(admin,"newsroom_notifications","staff_profile_id",staffIds);
    await deleteByIds(admin,"newsroom_notifications","actor_staff_id",staffIds);
    await deleteByIds(admin,"newsroom_sessions","staff_profile_id",staffIds);
    await deleteByIds(admin,"audit_logs","actor_staff_id",staffIds);
    await deleteByIds(admin,"staff_profiles","id",staffIds);
  }

  const webhookQ=await admin.from("provider_webhook_events").select("id,provider_event_id").like("provider_event_id","%"+runId+"%");
  if(webhookQ.error) throw webhookQ.error;
  const webhookIds=(webhookQ.data||[]).map((x:any)=>x.id);
  await deleteByIds(admin,"provider_webhook_events","id",webhookIds);

  const idempotencyQ=await admin.from("communication_idempotency_keys").select("id,key").like("key","%"+runId+"%");
  if(idempotencyQ.error) throw idempotencyQ.error;
  await deleteByIds(admin,"communication_idempotency_keys","id",(idempotencyQ.data||[]).map((x:any)=>x.id));

  for(const user of users){
    const deleted=await admin.auth.admin.deleteUser(user.id);
    if(deleted.error) throw deleted.error;
  }
  return {users:users.length,staff:staffIds.length,contacts:contactIds.length,threads:threadIds.length,messages:messageIds.length};
}

Deno.serve(async(req:Request)=>{
  if(req.method!=="POST") return response(405,{ok:false,error:"POST required"});
  let admin:any=null;
  let runId="";
  try{
    const body=await req.json();
    const verified=await verifyCaller(req,body);
    runId=verified.runId;
    const runAttempt=verified.runAttempt;
    const url=Deno.env.get("SUPABASE_URL")!;
    const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anon=Deno.env.get("SUPABASE_ANON_KEY")!;
    if(!url||!service||!anon) throw new Error("staging admin runtime unavailable");
    admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});

    if(body.action==="cleanup"){
      return response(200,{ok:true,action:"cleanup",run_id:runId,cleanup:await cleanup(admin,runId)});
    }
    if(body.action!=="run") throw new Error("unsupported certification action");

    await cleanup(admin,runId);

    const accounts=Array.isArray(body.staff_accounts)?body.staff_accounts:[];
    if(accounts.length!==4) throw new Error("exactly four staging staff accounts required");

    const roles=await admin.from("newsroom_roles").select("id,name").in("name",Object.values(ROLES));
    if(roles.error) throw roles.error;
    const roleIds=new Map((roles.data||[]).map((r:any)=>[r.name,r.id]));
    const existing=await admin.auth.admin.listUsers({page:1,perPage:1000});
    if(existing.error) throw existing.error;

    const created:any[]=[];
    for(const account of accounts){
      const key=String(account.role||"");
      const email=String(account.email||"").toLowerCase();
      const password=String(account.password||"");
      const roleName=ROLES[key];
      const expected="com01-"+key+"-"+runId+"-"+runAttempt+"@healthtimes.co.zw";
      if(!roleName||email!==expected||password.length<16) throw new Error("invalid bounded staff account: "+key);
      let user=existing.data.users.find((u:any)=>String(u.email||"").toLowerCase()===email);
      if(user&&user.user_metadata?.com01_staging_test!==true) throw new Error("refusing non-test account: "+email);
      if(user){
        const updated=await admin.auth.admin.updateUserById(user.id,{
          password,email_confirm:true,
          user_metadata:{...(user.user_metadata||{}),com01_staging_test:true,com01_role:key,github_run_id:runId}
        });
        if(updated.error) throw updated.error;
        user=updated.data.user;
      }else{
        const made=await admin.auth.admin.createUser({
          email,password,email_confirm:true,
          user_metadata:{com01_staging_test:true,com01_role:key,github_run_id:runId}
        });
        if(made.error) throw made.error;
        user=made.data.user;
      }
      const roleId=roleIds.get(roleName);
      if(!roleId) throw new Error("Newsroom role missing: "+roleName);
      const profile=await admin.from("staff_profiles").upsert({
        auth_user_id:user.id,
        display_name:"COM-01 "+key+" Certification",
        email,role_id:roleId,desk:key==="commercial"?"Commercial":"Health News",
        status:"active",handle:"com01-"+key+"-"+runId,updated_at:new Date().toISOString()
      },{onConflict:"email"}).select("id,email").single();
      if(profile.error) throw profile.error;
      created.push({role:key,email,password,auth_user_id:user.id,staff_profile_id:profile.data.id});
    }

    const userClients:any={};
    const queueMatrix:any={};
    for(const account of created){
      const client=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
      const signed=await client.auth.signInWithPassword({email:account.email,password:account.password});
      if(signed.error) throw signed.error;
      const registered=await client.rpc("newsroom_register_session",{p_user_agent:"COM-01 staging certification"});
      if(registered.error) throw registered.error;
      userClients[account.role]=client;
      queueMatrix[account.role]={};
      for(const queue of ["tips","advertising","support","privacy"]){
        const allowed=await client.rpc("communications_queue_allowed",{p_queue_key:queue});
        if(allowed.error) throw allowed.error;
        queueMatrix[account.role][queue]=allowed.data===true;
      }
    }

    const boundariesOk=
      queueMatrix.reporter.tips===true &&
      queueMatrix.reporter.advertising===false &&
      queueMatrix.editor.tips===true &&
      queueMatrix.editor.advertising===false &&
      queueMatrix.commercial.tips===false &&
      queueMatrix.commercial.advertising===true &&
      queueMatrix.commercial.support===true &&
      queueMatrix.publisher.tips===true &&
      queueMatrix.publisher.advertising===true &&
      queueMatrix.publisher.support===true &&
      queueMatrix.publisher.privacy===true;
    if(!boundariesOk) throw new Error("communications role boundary proof failed");

    const externalEmail="com01-external-"+runId+"@example.invalid";
    const firstEvent="com01-"+runId+"-inbound-1";
    const first=await admin.rpc("communications_ingest_inbound",{
      p_provider:"cloudflare",p_event_id:firstEvent,p_queue_key:"tips",
      p_from_email:externalEmail,p_to_email:"tips@staging.invalid",
      p_subject:"COM-01 staging inbound proof",p_body_text:"first inbound body",p_body_html:null,
      p_reply_token:null,p_provider_message_id:"cf-"+runId+"-1",p_payload_hash:"cert-"+runId+"-1",
      p_payload:{certification:true,run_id:runId}
    });
    if(first.error) throw first.error;
    const replay=await admin.rpc("communications_ingest_inbound",{
      p_provider:"cloudflare",p_event_id:firstEvent,p_queue_key:"tips",
      p_from_email:externalEmail,p_to_email:"tips@staging.invalid",
      p_subject:"COM-01 staging inbound proof",p_body_text:"first inbound body",p_body_html:null,
      p_reply_token:null,p_provider_message_id:"cf-"+runId+"-1",p_payload_hash:"cert-"+runId+"-1",
      p_payload:{certification:true,run_id:runId}
    });
    if(replay.error) throw replay.error;
    if(first.data?.duplicate!==false||replay.data?.duplicate!==true||first.data?.thread_id!==replay.data?.thread_id){
      throw new Error("inbound replay idempotency proof failed");
    }

    const threadQ=await admin.from("communication_threads").select("id,opaque_reply_token").eq("id",first.data.thread_id).single();
    if(threadQ.error) throw threadQ.error;
    const replyInbound=await admin.rpc("communications_ingest_inbound",{
      p_provider:"cloudflare",p_event_id:"com01-"+runId+"-inbound-reply",p_queue_key:"tips",
      p_from_email:externalEmail,p_to_email:"reply+"+threadQ.data.opaque_reply_token+"@staging.invalid",
      p_subject:"Re: COM-01 staging inbound proof",p_body_text:"reply inbound body",p_body_html:null,
      p_reply_token:threadQ.data.opaque_reply_token,p_provider_message_id:"cf-"+runId+"-2",
      p_payload_hash:"cert-"+runId+"-2",p_payload:{certification:true,reply:true,run_id:runId}
    });
    if(replyInbound.error) throw replyInbound.error;
    if(replyInbound.data?.thread_id!==first.data.thread_id||replyInbound.data?.created_thread!==false){
      throw new Error("opaque reply threading proof failed");
    }

    const publisher=userClients.publisher;
    const prepared=await publisher.rpc("communications_prepare_reply",{
      p_thread_id:first.data.thread_id,p_body_text:"COM-01 certification reply",p_subject:null
    });
    if(prepared.error) throw prepared.error;
    const syntheticProviderId="com01-cert-provider-"+runId;
    const sentState=await admin.rpc("communications_record_send_result",{
      p_message_id:prepared.data.message_id,p_provider_message_id:syntheticProviderId,p_status:"sent",
      p_error:"synthetic certification state only; not external provider proof"
    });
    if(sentState.error) throw sentState.error;

    const deliveryEvent="com01-"+runId+"-delivery-1";
    const delivered=await admin.rpc("communications_ingest_provider_event",{
      p_provider:"resend",p_event_id:deliveryEvent,p_event_type:"email.delivered",
      p_provider_message_id:syntheticProviderId,p_recipient_email:externalEmail,
      p_payload_hash:"cert-delivery-"+runId,p_payload:{certification:true,synthetic:true,run_id:runId}
    });
    if(delivered.error) throw delivered.error;
    const deliveryReplay=await admin.rpc("communications_ingest_provider_event",{
      p_provider:"resend",p_event_id:deliveryEvent,p_event_type:"email.delivered",
      p_provider_message_id:syntheticProviderId,p_recipient_email:externalEmail,
      p_payload_hash:"cert-delivery-"+runId,p_payload:{certification:true,synthetic:true,run_id:runId}
    });
    if(deliveryReplay.error) throw deliveryReplay.error;
    const eventCount=await admin.from("communication_events").select("id",{count:"exact",head:true}).eq("provider_event_id",deliveryEvent);
    if(eventCount.error) throw eventCount.error;
    if(delivered.data?.duplicate!==false||deliveryReplay.data?.duplicate!==true||eventCount.count!==1){
      throw new Error("provider event idempotency proof failed");
    }

    const marketingEmail="com01-marketing-"+runId+"@example.invalid";
    const consent=await admin.rpc("communications_record_consent",{
      p_email:marketingEmail,p_purpose:"NEWSLETTER",p_channel:"email",p_granted:true,
      p_source:"com01-certification",p_policy_version:"cert-2026-09-22"
    });
    if(consent.error) throw consent.error;
    const eligible=await admin.rpc("communications_marketing_eligible",{p_contact_id:consent.data.contact_id,p_purpose:"NEWSLETTER"});
    if(eligible.error) throw eligible.error;
    if(eligible.data!==true) throw new Error("granted marketing consent should be eligible");

    const noConsentEmail="com01-no-consent-"+runId+"@example.invalid";
    const noConsentContact=await admin.rpc("communications_contact_for_email",{p_email:noConsentEmail,p_source:"com01-certification"});
    if(noConsentContact.error) throw noConsentContact.error;
    const noConsentEligible=await admin.rpc("communications_marketing_eligible",{p_contact_id:noConsentContact.data,p_purpose:"NEWSLETTER"});
    if(noConsentEligible.error) throw noConsentEligible.error;
    if(noConsentEligible.data!==false) throw new Error("no-consent marketing eligibility denial failed");

    const withdrawn=await admin.rpc("communications_record_consent",{
      p_email:marketingEmail,p_purpose:"NEWSLETTER",p_channel:"email",p_granted:false,
      p_source:"com01-certification",p_policy_version:"cert-2026-09-22"
    });
    if(withdrawn.error) throw withdrawn.error;
    const marketingAfterOptOut=await admin.rpc("communications_marketing_eligible",{p_contact_id:consent.data.contact_id,p_purpose:"NEWSLETTER"});
    if(marketingAfterOptOut.error) throw marketingAfterOptOut.error;
    const transactionalAfterOptOut=await admin.rpc("communications_transactional_eligible",{p_contact_id:consent.data.contact_id,p_kind:"security"});
    if(transactionalAfterOptOut.error) throw transactionalAfterOptOut.error;
    if(marketingAfterOptOut.data!==false||transactionalAfterOptOut.data!==true){
      throw new Error("marketing opt-out / transactional separation proof failed");
    }

    const bounceEmail="com01-bounce-"+runId+"@example.invalid";
    const bounceEvent=await admin.rpc("communications_ingest_provider_event",{
      p_provider:"resend",p_event_id:"com01-"+runId+"-bounce",p_event_type:"email.bounced",
      p_provider_message_id:"unknown-"+runId,p_recipient_email:bounceEmail,
      p_payload_hash:"cert-bounce-"+runId,p_payload:{certification:true,run_id:runId}
    });
    if(bounceEvent.error) throw bounceEvent.error;
    const complaintEmail="com01-complaint-"+runId+"@example.invalid";
    const complaintEvent=await admin.rpc("communications_ingest_provider_event",{
      p_provider:"resend",p_event_id:"com01-"+runId+"-complaint",p_event_type:"email.complained",
      p_provider_message_id:"unknown-"+runId,p_recipient_email:complaintEmail,
      p_payload_hash:"cert-complaint-"+runId,p_payload:{certification:true,run_id:runId}
    });
    if(complaintEvent.error) throw complaintEvent.error;
    const suppressionQ=await admin.from("communication_suppressions").select("email,scope,reason").in("email",[bounceEmail,complaintEmail]);
    if(suppressionQ.error) throw suppressionQ.error;
    const suppressionReasons=new Set((suppressionQ.data||[]).map((x:any)=>x.reason));
    if(!suppressionReasons.has("bounce")||!suppressionReasons.has("complaint")) throw new Error("bounce/complaint suppression proof failed");

    const dangerous=await publisher.rpc("communications_prepare_attachment",{
      p_message_id:prepared.data.message_id,p_filename:"payload.exe",p_mime_type:"application/octet-stream",
      p_byte_size:1024,p_sha256:null
    });
    if(dangerous.error) throw dangerous.error;
    if(dangerous.data?.status!=="quarantined") throw new Error("dangerous attachment quarantine proof failed");

    const anonClient=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
    const anonThread=await anonClient.from("communication_threads").select("id").limit(1);
    const anonAttachment=await anonClient.from("communication_attachments").select("id").eq("id",dangerous.data.id);
    const anonymousDenied=Boolean(anonThread.error)&&Boolean(anonAttachment.error);
    if(!anonymousDenied) throw new Error("anonymous private communications denial proof failed");

    const storyQuery=await admin.from("stories").select("id").in("status",["publish","published"]).eq("access_policy","public").limit(1);
    if(storyQuery.error) throw storyQuery.error;
    const storyId=storyQuery.data?.[0]?.id;
    if(!storyId) throw new Error("published public story required for social certification");
    const draft=await publisher.rpc("communications_create_social_draft",{
      p_story_id:storyId,p_provider:"unconfigured-cert-provider",
      p_body:"COM-01 bounded social certification draft "+runId,p_social_account_id:null
    });
    if(draft.error) throw draft.error;

    const unapproved=await publisher.rpc("communications_prepare_social_publish",{p_social_post_id:draft.data});
    const unapprovedDenied=Boolean(unapproved.error);
    if(!unapprovedDenied) throw new Error("unapproved social publication must be denied");

    const approved=await publisher.rpc("communications_approve_social_post",{p_social_post_id:draft.data});
    if(approved.error) throw approved.error;
    const attempt=await publisher.rpc("communications_prepare_social_publish",{p_social_post_id:draft.data});
    if(attempt.error) throw attempt.error;
    if(attempt.data?.provider_ready!==false) throw new Error("unconfigured social provider must fail closed");

    const attemptQ=await admin.from("social_publication_attempts").select("id,status,provider_response").eq("id",attempt.data.attempt_id).single();
    if(attemptQ.error) throw attemptQ.error;
    if(attemptQ.data.status!=="unconfigured") throw new Error("social provenance fail-closed result missing");

    const evidence={
      project_ref:new URL(url).hostname.split(".")[0],
      role_boundaries:{ok:true,matrix:queueMatrix},
      inbound:{
        first_duplicate:first.data.duplicate,
        replay_duplicate:replay.data.duplicate,
        thread_id:first.data.thread_id,
        reply_same_thread:replyInbound.data.thread_id===first.data.thread_id
      },
      provider_event_logic:{
        synthetic_only:true,
        first_duplicate:delivered.data.duplicate,
        replay_duplicate:deliveryReplay.data.duplicate,
        normalized_event_count:eventCount.count
      },
      consent:{
        granted_eligible:eligible.data,
        no_consent_eligible:noConsentEligible.data,
        opted_out_marketing_eligible:marketingAfterOptOut.data,
        security_transactional_eligible_after_marketing_opt_out:transactionalAfterOptOut.data
      },
      suppressions:{rows:suppressionQ.data||[]},
      privacy:{anonymous_private_access_denied:anonymousDenied,dangerous_attachment_status:dangerous.data.status},
      social:{
        unapproved_publish_denied:unapprovedDenied,
        approved_attempt_status:attemptQ.data.status,
        provider_ready:attempt.data.provider_ready,
        provenance_recorded:Boolean(attemptQ.data.id)
      },
      external_provider_proof:{
        resend_send:false,
        resend_signed_webhook:false,
        brevo_sync:false,
        cloudflare_edge_route:false
      }
    };

    const cleanupResult=await cleanup(admin,runId);
    return response(200,{ok:true,action:"run",run_id:runId,evidence,cleanup:cleanupResult});
  }catch(error){
    let cleanupError:string|null=null;
    if(admin&&runId){
      try{await cleanup(admin,runId);}catch(e){cleanupError=e instanceof Error?e.message:String(e);}
    }
    const message=error instanceof Error?error.message:String((error as any)?.message||"certification operation denied");
    return response(403,{ok:false,error:message,cleanup_error:cleanupError});
  }
});
