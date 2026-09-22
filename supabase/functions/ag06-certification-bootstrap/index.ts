import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@5.10.0";

const ISSUER = "https://token.actions.githubusercontent.com";
const AUDIENCE = "healthtimes-ag06-certification";
const JWKS = createRemoteJWKSet(new URL("https://token.actions.githubusercontent.com/.well-known/jwks"));

const roles = [
  { key: "reporter", email: "ag06-reporter@healthtimes-staging.example.com", displayName: "AG-06 Reporter", role: "Reporter / Journalist", handle: "ag06-reporter", mfaRequired: false },
  { key: "editor", email: "ag06-editor@healthtimes-staging.example.com", displayName: "AG-06 Editor", role: "Editor-in-Chief", handle: "ag06-editor", mfaRequired: true },
  { key: "commercial", email: "ag06-commercial@healthtimes-staging.example.com", displayName: "AG-06 Commercial", role: "Commercial Manager", handle: "ag06-commercial", mfaRequired: false },
  { key: "publisher", email: "ag06-publisher@healthtimes-staging.example.com", displayName: "AG-06 Publisher", role: "Publisher / Owner", handle: "ag06-publisher", mfaRequired: true }
];

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" }
  });
}

function password() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const random = btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, "x");
  return `Ht!${random}7aA`;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json(405, { ok: false, error: "POST required" });

  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return json(401, { ok: false, error: "GitHub OIDC token required" });

  try {
    const { payload } = await jwtVerify(token, JWKS, { issuer: ISSUER, audience: AUDIENCE });
    if (payload.repository !== "kudzimusar/htp-zw") throw new Error("repository claim mismatch");
    if (!["pull_request", "workflow_dispatch"].includes(String(payload.event_name || ""))) throw new Error("event claim mismatch");
    if (payload.workflow !== "AG-06 Newsroom Security") throw new Error("workflow claim mismatch");

    const url = Deno.env.get("SUPABASE_URL");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const publishableMap = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}");
    const publishable = publishableMap.default || Deno.env.get("SUPABASE_ANON_KEY");
    if (!url || !service || !publishable) throw new Error("staging Supabase runtime keys unavailable");

    const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });
    const client = createClient(url, publishable, { auth: { autoRefreshToken: false, persistSession: false } });

    const roleRows = await admin.from("newsroom_roles").select("id,name").in("name", roles.map(x => x.role));
    if (roleRows.error) throw roleRows.error;
    const roleIds = new Map((roleRows.data || []).map((r: any) => [r.name, r.id]));

    const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listed.error) throw listed.error;

    const credentials: Record<string, { email: string; password: string }> = {};

    for (const spec of roles) {
      const roleId = roleIds.get(spec.role);
      if (!roleId) throw new Error(`role missing: ${spec.role}`);
      const nextPassword = password();
      let user = listed.data.users.find(u => String(u.email || "").toLowerCase() === spec.email);

      if (user) {
        const updated = await admin.auth.admin.updateUserById(user.id, {
          password: nextPassword,
          email_confirm: true,
          user_metadata: { ...(user.user_metadata || {}), ag06_staging_test: true, newsroom_role: spec.role }
        });
        if (updated.error) throw updated.error;
        user = updated.data.user;
      } else {
        const created = await admin.auth.admin.createUser({
          email: spec.email,
          password: nextPassword,
          email_confirm: true,
          user_metadata: { ag06_staging_test: true, newsroom_role: spec.role }
        });
        if (created.error) throw created.error;
        user = created.data.user;
      }

      const existing = await admin.from("staff_profiles")
        .select("id,auth_user_id,role_id,status,email")
        .eq("email", spec.email)
        .maybeSingle();
      if (existing.error) throw existing.error;

      if (!existing.data) {
        const inserted = await admin.from("staff_profiles").insert({
          auth_user_id: user.id,
          display_name: spec.displayName,
          email: spec.email,
          role_id: roleId,
          desk: spec.key === "commercial" ? "Commercial" : "Health News",
          beat: "AG-06 staging certification",
          country: "Zimbabwe",
          region: "Africa",
          status: "active",
          handle: spec.handle,
          mfa_required: spec.mfaRequired
        });
        if (inserted.error) throw inserted.error;
      } else {
        if (existing.data.auth_user_id !== user.id || existing.data.role_id !== roleId || String(existing.data.status).toLowerCase() !== "active") {
          throw new Error(`existing staging profile drift for ${spec.key}; refusing authority mutation`);
        }
      }

      credentials[spec.key] = { email: spec.email, password: nextPassword };
    }

    const inviteEmail = `ag06-invite-probe-${Date.now()}@healthtimes-staging.example.com`;
    const invite = await admin.auth.admin.inviteUserByEmail(inviteEmail, {
      data: { ag06_staging_email_probe: true }
    });
    const inviteAccepted = !invite.error;
    if (invite.data?.user?.id) {
      await admin.auth.admin.deleteUser(invite.data.user.id).catch(() => {});
    }

    const recovery = await client.auth.resetPasswordForEmail(roles[0].email, {
      redirectTo: "https://healthtimes-staging.vercel.app/newsroom.html"
    });

    return json(200, {
      ok: true,
      project_ref: new URL(url).hostname.split(".")[0],
      credentials,
      publishable_key: publishable,
      email_behavior: {
        invite_api_accepted: inviteAccepted,
        invite_error: invite.error?.message || null,
        recovery_api_accepted: !recovery.error,
        recovery_error: recovery.error?.message || null,
        delivery_confirmed: false,
        note: "Reserved example.com staging addresses are used; API acceptance is tested, external mailbox delivery is intentionally not asserted."
      },
      mfa_classification: "MFA CAPABILITY/POLICY READY — AAL2 NOT YET ENFORCED"
    });
  } catch (error) {
    return json(403, { ok: false, error: error instanceof Error ? error.message : "certification bootstrap denied" });
  }
});
