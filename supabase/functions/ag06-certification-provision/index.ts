import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { createLocalJWKSet, jwtVerify } from "npm:jose@5.10.0";

const ISSUER = "https://token.actions.githubusercontent.com";
const AUDIENCE = "healthtimes-ag06-certification";
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
  publisher: "Publisher / Owner"
};

function response(status:number, body:unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {"content-type":"application/json","cache-control":"no-store"}
  });
}

async function verifyCaller(req:Request, body:any) {
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) throw new Error("GitHub OIDC token required");
  const { payload } = await jwtVerify(auth.slice(7), JWKS, { issuer: ISSUER, audience: AUDIENCE });
  const runId = String(body.run_id || "");
  const runAttempt = String(body.run_attempt || "");
  if (payload.repository !== "kudzimusar/htp-zw") throw new Error("repository claim mismatch");
  if (!["pull_request","workflow_dispatch"].includes(String(payload.event_name || ""))) throw new Error("event claim mismatch");
  if (!String(payload.workflow_ref || "").includes("kudzimusar/htp-zw/.github/workflows/ag06-security.yml@")) throw new Error("workflow claim mismatch");
  if (String(payload.run_id || "") !== runId) throw new Error("run claim mismatch");
  if (String(payload.run_attempt || "1") !== runAttempt) throw new Error("run-attempt claim mismatch");
  return {runId,runAttempt};
}

Deno.serve(async (req:Request) => {
  if (req.method !== "POST") return response(405,{ok:false,error:"POST required"});
  try {
    const body = await req.json();
    const {runId,runAttempt} = await verifyCaller(req,body);
    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!url || !service) throw new Error("staging admin runtime unavailable");
    const admin = createClient(url, service, {auth:{persistSession:false,autoRefreshToken:false}});

    if (body.action === "cleanup") {
      const listed = await admin.auth.admin.listUsers({page:1,perPage:1000});
      if (listed.error) throw listed.error;
      const users = listed.data.users.filter((u:any) =>
        u.user_metadata?.ag06_staging_test === true &&
        String(u.user_metadata?.github_run_id || "") === runId
      );
      const emails = users.map((u:any)=>String(u.email||"").toLowerCase()).filter(Boolean);
      let profileIds:string[] = [];
      if (emails.length) {
        const profiles = await admin.from("staff_profiles").select("id,email").in("email",emails);
        if (profiles.error) throw profiles.error;
        profileIds = (profiles.data || []).map((p:any)=>p.id);
      }
      const revokedAt = new Date().toISOString();
      if (profileIds.length) {
        const sessions = await admin.from("newsroom_sessions")
          .update({revoked_at:revokedAt})
          .in("staff_profile_id",profileIds)
          .is("revoked_at",null);
        if (sessions.error) throw sessions.error;
      }
      for (const user of users) {
        const deleted = await admin.auth.admin.deleteUser(user.id);
        if (deleted.error) throw deleted.error;
      }
      let retainedProfiles:any[] = [];
      let liveSessions:any[] = [];
      if (profileIds.length) {
        const profiles = await admin.from("staff_profiles")
          .select("id,status,revoked_at")
          .in("id",profileIds);
        if (profiles.error) throw profiles.error;
        retainedProfiles = profiles.data || [];
        const invalid = retainedProfiles.filter((p:any)=>String(p.status||"").toLowerCase()!=="revoked" || !p.revoked_at);
        if (invalid.length) throw new Error("Auth-delete revocation trigger did not inert every retained staff profile");

        const sessions = await admin.from("newsroom_sessions")
          .select("id,staff_profile_id,revoked_at")
          .in("staff_profile_id",profileIds)
          .is("revoked_at",null);
        if (sessions.error) throw sessions.error;
        liveSessions = sessions.data || [];
        if (liveSessions.length) throw new Error("Live Newsroom sessions remain after Auth cleanup");
      }
      return response(200,{
        ok:true,action:"cleanup",run_id:runId,
        deleted_auth_users:users.length,
        retained_inert_staff_profiles:retainedProfiles.length,
        retained_profiles_status:"revoked",
        live_sessions_remaining:liveSessions.length
      });
    }

    if (body.action !== "provision") throw new Error("unsupported certification action");
    const accounts = Array.isArray(body.accounts) ? body.accounts : [];
    if (accounts.length !== 4) throw new Error("exactly four staging accounts required");

    const roles = await admin.from("newsroom_roles").select("id,name").in("name",Object.values(allowedRoles));
    if (roles.error) throw roles.error;
    const roleIds = new Map((roles.data || []).map((r:any)=>[r.name,r.id]));

    const existingUsers = await admin.auth.admin.listUsers({page:1,perPage:1000});
    if (existingUsers.error) throw existingUsers.error;

    const created:any[] = [];
    for (const account of accounts) {
      const key = String(account.role || "");
      const email = String(account.email || "").toLowerCase();
      const password = String(account.password || "");
      const roleName = allowedRoles[key];
      const expected = `ag06-${key}-${runId}-${runAttempt}@healthtimes.co.zw`;
      if (!roleName || email !== expected || password.length < 16) throw new Error(`invalid bounded account: ${key}`);

      let user = existingUsers.data.users.find((u:any)=>String(u.email||"").toLowerCase()===email);
      if (user && user.user_metadata?.ag06_staging_test !== true) throw new Error(`refusing non-test account: ${email}`);

      if (user) {
        const updated = await admin.auth.admin.updateUserById(user.id,{
          password,email_confirm:true,
          user_metadata:{...(user.user_metadata||{}),ag06_staging_test:true,ag06_role:key,github_run_id:runId}
        });
        if (updated.error) throw updated.error;
        user = updated.data.user;
      } else {
        const made = await admin.auth.admin.createUser({
          email,password,email_confirm:true,
          user_metadata:{ag06_staging_test:true,ag06_role:key,github_run_id:runId}
        });
        if (made.error) throw made.error;
        user = made.data.user;
      }

      const roleId = roleIds.get(roleName);
      if (!roleId) throw new Error(`Newsroom role missing: ${roleName}`);
      const profile = await admin.from("staff_profiles").upsert({
        auth_user_id:user.id,
        display_name:`AG-06 ${key[0].toUpperCase()+key.slice(1)} Certification`,
        email,
        role_id:roleId,
        desk:key==="commercial"?"Commercial":"Health News",
        beat:"AG-06 staging certification",
        country:"Zimbabwe",
        region:"Africa",
        status:"active",
        handle:`ag06-${key}-${runId}-${runAttempt}`,
        mfa_required:key==="editor"||key==="publisher",
        revoked_at:null,
        updated_at:new Date().toISOString()
      },{onConflict:"email"}).select("id,email").single();
      if (profile.error) throw profile.error;

      created.push({role:key,email,auth_user_id:user.id,staff_profile_id:profile.data.id});
    }

    // CI certification identities are synthetic and administratively confirmed.
    // Never exercise outbound invite/recovery delivery against generated @healthtimes.co.zw addresses:
    // repeated delivery failures damage the shared SMTP reputation and can restrict the staging project.
    const emailBehavior:any = {
      invite_api_accepted:null,
      recovery_api_accepted:null,
      delivery_confirmed:false,
      probe_enabled:false,
      requested_probe_suppressed:body.probe_email === true,
      note:"Outbound Auth email probes are disabled in CI. Certification validates authorization without mailbox delivery."
    };

    return response(200,{
      ok:true,
      action:"provision",
      project_ref:new URL(url).hostname.split(".")[0],
      users:created,
      email_behavior:emailBehavior,
      mfa_classification:"MFA CAPABILITY/POLICY READY — AAL2 NOT YET ENFORCED"
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String((error as any)?.message || "certification operation denied");
    return response(403,{ok:false,error:message});
  }
});