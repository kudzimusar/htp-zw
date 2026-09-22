import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { createLocalJWKSet, jwtVerify } from "npm:jose@5.10.0";

const ISSUER = "https://token.actions.githubusercontent.com";
const AUDIENCE = "healthtimes-ca01-certification";
const JWKS = createLocalJWKSet({keys:[
  {"kty":"RSA","alg":"RS256","use":"sig","kid":"cc413527-173f-5a05-976e-9c52b1d7b431","n":"w4M936N3ZxNaEblcUoBm-xu0-V9JxNx5S7TmF0M3SBK-2bmDyAeDdeIOTcIVZHG-ZX9N9W0u1yWafgWewHrsz66BkxXq3bscvQUTAw7W3s6TEeYY7o9shPkFfOiU3x_KYgOo06SpiFdymwJflRs9cnbaU88i5fZJmUepUHVllP2tpPWTi-7UA3AdP3cdcCs5bnFfTRKzH2W0xqKsY_jIG95aQJRBDpbiesefjuyxcQnOv88j9tCKWzHpJzRKYjAUM6OPgN4HYnaSWrPJj1v41eEkFM1kORuj-GSH2qMVD02VklcqaerhQHIqM-RjeHsN7G05YtwYzomE5G-fZuwgvQ","e":"AQAB"},
  {"kty":"RSA","alg":"RS256","use":"sig","kid":"38826b17-6a30-5f9b-b169-8beb8202f723","n":"5Manmy-zwsk3wEftXNdKFZec4rSWENW4jTGevlvAcU9z3bgLBogQVvqYLtu9baVm2B3rfe5onadobq8po5UakJ0YsTiiEfXWdST7YI2Sdkvv-hOYMcZKYZ4dFvuSO1vQ2DgEkw_OZNiYI1S518MWEcNxnPU5u67zkawAGsLlmXNbOylgVfBRJrG8gj6scr-sBs4LaCa3kg5IuaCHe1pB-nSYHovGV_z0egE83C098FfwO1dNZBWeo4Obhb5Z-ZYFLJcZfngMY0zJnCVNmpHQWOgxfGikh3cwi4MYrFrbB4NTlxbrQ3bL-rGKR5X318veyDlo8Dyz2KWMobT4wB9U1Q","e":"AQAB"},
  {"kty":"RSA","alg":"RS256","use":"sig","kid":"38E9B30B3A023A1B72309921A69A42FCC496C42C","n":"tEq2Fp9HcdT5MwMsB_UTm8j_woJJLi3sA-y0RX2tioTm581seyfvOH6lJ5JmHVtS-_fb8B2tRT1pznHQSNq14PsJdu9bp5egbWmIz-5RvhqoM-oKem_MJENCNFuqXijRLT47FRdfH3inqde1vJlA_JJHCqYMKIpHH7kqNFYcCpwr0vk80Hc2rTyL0uBXI7NqBZbtUgNoyucWO5O7QQrPNOmlr-GI8aFckFRfobCaCOiH9qW02FtkV74fwBGVCNhNf3a1CK81-O8xEGimvVydI_pQA5B8QqVuQjY_ntOu555HdirA0hKkY6fsE9eZCMFmWDHZ2kSWLjhabxWxIzSzXQ","e":"AQAB"},
  {"kty":"RSA","alg":"RS256","use":"sig","kid":"4F3E9AD8C9A6F5EB3173006F4FA630E28F43DCE9","n":"tGevqhkBGn8NB0dKxs8Ddxhn-xZPm55svcSlkJZEOwDOXDLl_0-iVOVKNJfcHHLHvMqa6zh2DDcpAWZi2FpeBAJupsrymqwzllxOODWKWoVIoaIjOO7h1JLiF9Knwuq-o6BPtKdwOT-bOrXRzChMtQsc5C1Auex-D0Z6loObBuK1Lkm0RK9ISQsLqBEwq8g0OOupI_shU1r2rT2G0nkZ0CvxVlQeUGShFi8Mdys2s5LPqBwjC4LKwjk8moWQV32KEccbTPKxnG_539DxRglHJgHPHisSVGsfZIUXi2chtXdQHZPdVve8ZRmknCykZtkJ6K87llSUXi7oyzhCIZdiUQ","e":"AQAB"}
]});


const allowedRoles: Record<string,string> = {
  reporter: "Reporter / Journalist",
  editor: "Editor-in-Chief",
  commercial: "Commercial Manager",
  publisher: "Publisher / Owner",
  health: "Health / Science Editor"
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
  if(!String(payload.workflow_ref||"").includes("kudzimusar/htp-zw/.github/workflows/ca01-communications.yml@")) throw new Error("workflow claim mismatch");
  if(String(payload.run_id||"")!==runId) throw new Error("run claim mismatch");
  if(String(payload.run_attempt||"1")!==runAttempt) throw new Error("run-attempt claim mismatch");
  return {runId,runAttempt};
}

Deno.serve(async(req:Request)=>{
  if(req.method!=="POST") return response(405,{ok:false,error:"POST required"});
  try{
    const body=await req.json();
    const {runId,runAttempt}=await verifyCaller(req,body);
    const url=Deno.env.get("SUPABASE_URL")!;
    const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if(!url||!service) throw new Error("staging admin runtime unavailable");
    const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});

    if(body.action==="cleanup"){
      const listed=await admin.auth.admin.listUsers({page:1,perPage:1000});
      if(listed.error) throw listed.error;
      const users=listed.data.users.filter((u:any)=>
        u.user_metadata?.ca01_staging_test===true &&
        String(u.user_metadata?.github_run_id||"")===runId
      );
      const authIds=users.map((u:any)=>u.id);
      let staff:any[]=[];
      let readers:any[]=[];
      if(authIds.length){
        const s=await admin.from("staff_profiles").select("id,auth_user_id,email").in("auth_user_id",authIds);
        if(s.error) throw s.error; staff=s.data||[];
        const r=await admin.from("reader_comment_profiles").select("id,auth_user_id").in("auth_user_id",authIds);
        if(r.error) throw r.error; readers=r.data||[];
      }
      const staffIds=staff.map((x:any)=>x.id);
      const readerIds=readers.map((x:any)=>x.id);

      let commentIds:string[]=[];
      if(readerIds.length){
        const comments=await admin.from("story_comments").select("id").in("author_profile_id",readerIds);
        if(comments.error) throw comments.error;
        commentIds=(comments.data||[]).map((x:any)=>x.id);
      }

      let reportIds:string[]=[];
      if(readerIds.length){
        const own=await admin.from("story_comment_reports").select("id").in("reporter_profile_id",readerIds);
        if(own.error) throw own.error;
        reportIds.push(...(own.data||[]).map((x:any)=>x.id));
      }
      if(commentIds.length){
        const onComments=await admin.from("story_comment_reports").select("id").in("comment_id",commentIds);
        if(onComments.error) throw onComments.error;
        reportIds.push(...(onComments.data||[]).map((x:any)=>x.id));
      }
      reportIds=[...new Set(reportIds)];

      if(reportIds.length){
        const n=await admin.from("newsroom_notifications").delete().eq("target_table","story_comment_reports").in("target_id",reportIds);
        if(n.error) throw n.error;
      }
      if(staffIds.length){
        const n1=await admin.from("newsroom_notifications").delete().in("staff_profile_id",staffIds);
        if(n1.error) throw n1.error;
        const n2=await admin.from("newsroom_notifications").delete().in("actor_staff_id",staffIds);
        if(n2.error) throw n2.error;

        const attachments=await admin.from("newsroom_communication_attachments").select("id,storage_path").in("uploaded_by",staffIds);
        if(attachments.error) throw attachments.error;
        const paths=(attachments.data||[]).map((x:any)=>x.storage_path).filter(Boolean);
        if(paths.length){
          const removed=await admin.storage.from("newsroom-communications-private").remove(paths);
          if(removed.error) throw removed.error;
          const del=await admin.from("newsroom_communication_attachments").delete().in("id",(attachments.data||[]).map((x:any)=>x.id));
          if(del.error) throw del.error;
        }

        const internal=await admin.from("story_internal_comments").select("id").in("author_staff_id",staffIds);
        if(internal.error) throw internal.error;
        const internalIds=(internal.data||[]).map((x:any)=>x.id);
        if(internalIds.length){
          const rev=await admin.from("story_internal_comment_revisions").delete().in("comment_id",internalIds); if(rev.error) throw rev.error;
          const men=await admin.from("story_internal_comment_mentions").delete().in("comment_id",internalIds); if(men.error) throw men.error;
          const del=await admin.from("story_internal_comments").delete().in("id",internalIds); if(del.error) throw del.error;
        }

        const anns=await admin.from("newsroom_announcements").delete().in("created_by",staffIds); if(anns.error) throw anns.error;
        const threads=await admin.from("newsroom_threads").delete().in("created_by",staffIds); if(threads.error) throw threads.error;
        const desks=await admin.from("newsroom_desks").delete().in("created_by",staffIds); if(desks.error) throw desks.error;

        const assignments=await admin.from("story_assignments").select("id").or(
          staffIds.flatMap((id:string)=>[
            "assigned_by.eq."+id,
            "reporter_staff_id.eq."+id,
            "assigned_editor_staff_id.eq."+id
          ]).join(",")
        );
        if(assignments.error) throw assignments.error;
        const assignmentIds=(assignments.data||[]).map((x:any)=>x.id);
        if(assignmentIds.length){
          const del=await admin.from("story_assignments").delete().in("id",assignmentIds); if(del.error) throw del.error;
        }
      }

      if(commentIds.length){
        const rev=await admin.from("story_comment_revisions").delete().in("comment_id",commentIds); if(rev.error) throw rev.error;
        const mod=await admin.from("story_comment_moderation_actions").delete().in("comment_id",commentIds); if(mod.error) throw mod.error;
      }
      if(reportIds.length){
        const rep=await admin.from("story_comment_reports").delete().in("id",reportIds); if(rep.error) throw rep.error;
      }
      if(readerIds.length){
        const restrictions=await admin.from("reader_comment_restrictions").delete().in("reader_profile_id",readerIds); if(restrictions.error) throw restrictions.error;
        const comments=await admin.from("story_comments").delete().in("author_profile_id",readerIds); if(comments.error) throw comments.error;
        const profiles=await admin.from("reader_comment_profiles").delete().in("id",readerIds); if(profiles.error) throw profiles.error;
      }

      if(body.test_story_id){
        const reset=await admin.from("stories").update({comment_policy:"disabled"}).eq("id",String(body.test_story_id));
        if(reset.error) throw reset.error;
      }

      for(const user of users){
        const deleted=await admin.auth.admin.deleteUser(user.id);
        if(deleted.error) throw deleted.error;
      }

      let liveSessions:any[]=[];
      if(staffIds.length){
        const sessions=await admin.from("newsroom_sessions").select("id").in("staff_profile_id",staffIds).is("revoked_at",null);
        if(sessions.error) throw sessions.error; liveSessions=sessions.data||[];
      }

      return response(200,{
        ok:true,action:"cleanup",run_id:runId,
        deleted_auth_users:users.length,
        reader_profiles_deleted:readerIds.length,
        test_comments_deleted:commentIds.length,
        test_reports_deleted:reportIds.length,
        retained_staff_profiles:staffIds.length,
        live_sessions_remaining:liveSessions.length
      });
    }

    if(body.action!=="provision") throw new Error("unsupported certification action");
    const staffAccounts=Array.isArray(body.staff_accounts)?body.staff_accounts:[];
    const readerAccounts=Array.isArray(body.reader_accounts)?body.reader_accounts:[];
    if(staffAccounts.length!==5) throw new Error("exactly five staging staff accounts required");
    if(readerAccounts.length!==4) throw new Error("exactly four staging reader accounts required");

    const roles=await admin.from("newsroom_roles").select("id,name").in("name",Object.values(allowedRoles));
    if(roles.error) throw roles.error;
    const roleIds=new Map((roles.data||[]).map((r:any)=>[r.name,r.id]));
    const existing=await admin.auth.admin.listUsers({page:1,perPage:1000});
    if(existing.error) throw existing.error;

    const staffCreated:any[]=[];
    for(const account of staffAccounts){
      const key=String(account.role||"");
      const email=String(account.email||"").toLowerCase();
      const password=String(account.password||"");
      const roleName=allowedRoles[key];
      const expected=`ca01-${key}-${runId}-${runAttempt}@healthtimes.co.zw`;
      if(!roleName||email!==expected||password.length<16) throw new Error("invalid bounded staff account: "+key);

      let user=existing.data.users.find((u:any)=>String(u.email||"").toLowerCase()===email);
      if(user&&user.user_metadata?.ca01_staging_test!==true) throw new Error("refusing non-test account: "+email);
      if(user){
        const updated=await admin.auth.admin.updateUserById(user.id,{password,email_confirm:true,user_metadata:{...(user.user_metadata||{}),ca01_staging_test:true,ca01_kind:"staff",ca01_role:key,github_run_id:runId}});
        if(updated.error) throw updated.error; user=updated.data.user;
      }else{
        const made=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{ca01_staging_test:true,ca01_kind:"staff",ca01_role:key,github_run_id:runId}});
        if(made.error) throw made.error; user=made.data.user;
      }

      const roleId=roleIds.get(roleName);
      if(!roleId) throw new Error("Newsroom role missing: "+roleName);
      const profile=await admin.from("staff_profiles").upsert({
        auth_user_id:user.id,
        display_name:`CA-01 ${key[0].toUpperCase()+key.slice(1)} Certification`,
        email,role_id:roleId,
        desk:key==="commercial"?"Commercial":(key==="health"?"Health & Science":"Health News"),
        beat:"CA-01 staging certification",country:"Zimbabwe",region:"Africa",
        status:"active",handle:`ca01-${key}-${runId}`,mfa_required:key==="editor"||key==="publisher",
        revoked_at:null,updated_at:new Date().toISOString()
      },{onConflict:"email"}).select("id,email").single();
      if(profile.error) throw profile.error;
      staffCreated.push({role:key,email,auth_user_id:user.id,staff_profile_id:profile.data.id});
    }

    const readerCreated:any[]=[];
    for(const account of readerAccounts){
      const kind=String(account.kind||"");
      const email=String(account.email||"").toLowerCase();
      const password=String(account.password||"");
      const verified=account.verified===true;
      const expected=`ca01-reader-${kind}-${runId}-${runAttempt}@healthtimes.co.zw`;
      if(!["author","reporter","restricted","unverified"].includes(kind)||email!==expected||password.length<16) throw new Error("invalid bounded reader account: "+kind);
      if(kind==="unverified"&&verified) throw new Error("unverified fixture cannot be confirmed");

      let user=existing.data.users.find((u:any)=>String(u.email||"").toLowerCase()===email);
      if(user&&user.user_metadata?.ca01_staging_test!==true) throw new Error("refusing non-test account: "+email);
      if(user){
        const updated=await admin.auth.admin.updateUserById(user.id,{password,email_confirm:verified,user_metadata:{...(user.user_metadata||{}),ca01_staging_test:true,ca01_kind:"reader",ca01_reader_kind:kind,github_run_id:runId}});
        if(updated.error) throw updated.error; user=updated.data.user;
      }else{
        const made=await admin.auth.admin.createUser({email,password,email_confirm:verified,user_metadata:{ca01_staging_test:true,ca01_kind:"reader",ca01_reader_kind:kind,github_run_id:runId}});
        if(made.error) throw made.error; user=made.data.user;
      }
      readerCreated.push({kind,email,verified,auth_user_id:user.id});
    }

    const storyQuery=await admin.from("stories")
      .select("id,slug,title,status,access_policy,published_at,comment_policy")
      .in("status",["publish","published"])
      .eq("access_policy","public")
      .order("published_at",{ascending:false,nullsFirst:false})
      .limit(1);
    if(storyQuery.error) throw storyQuery.error;
    const testStory=(storyQuery.data||[])[0]||null;
    if(!testStory?.id) throw new Error("no canonical published public story is available for CA-01 certification");

    return response(200,{
      ok:true,action:"provision",project_ref:new URL(url).hostname.split(".")[0],
      staff:staffCreated,readers:readerCreated,
      test_story:{
        id:testStory.id,
        slug:testStory.slug,
        title:testStory.title,
        original_comment_policy:testStory.comment_policy||"disabled"
      }
    });
  }catch(error){
    const message=error instanceof Error?error.message:String((error as any)?.message||"certification operation denied");
    return response(403,{ok:false,error:message});
  }
});
