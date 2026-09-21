import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const read=(path)=>readFileSync(join(root,path),"utf8");

test("native auth sessions use SecureStore while web keeps a compatible storage fallback",()=>{
  const storage=read("src/security/auth-storage.ts");
  const supabase=read("src/platform/supabase.ts");
  assert.ok(storage.includes('expo-secure-store'));
  assert.ok(storage.includes('Platform.OS === "web"'));
  assert.ok(storage.includes("SecureStore.setItemAsync"));
  assert.ok(storage.includes("SecureStore.getItemAsync"));
  assert.ok(storage.includes("SecureStore.deleteItemAsync"));
  assert.ok(supabase.includes("storage: healthTimesAuthStorage"));
  assert.equal(supabase.includes("storage: AsyncStorage"),false);
});

test("canonical capabilities are explicit and cannot be supplied as a local role switch",()=>{
  const capabilities=read("src/security/capabilities.ts");
  for(const value of [
    "story.create","story.edit_own","story.publish","premium.manage","ads.approve",
    "subscriber.view","staff.invite","staff.change_role","staff.revoke",
    "analytics.view","settings.manage","security.sessions.revoke"
  ]){
    assert.ok(capabilities.includes('"'+value+'"'),"missing capability: "+value);
  }
  assert.ok(capabilities.includes('snapshot.status === "authorized"'));
  assert.ok(capabilities.includes('snapshot.source === "server"'));

  const security=read("src/services/security.ts");
  assert.ok(security.includes('"server-policy-unavailable"'));
  assert.ok(security.includes("capabilities: []") || read("src/security/capabilities.ts").includes("capabilities: []"));
});

test("staging Reader auth uses Supabase Auth without granting staff authority",()=>{
  const staging=read("src/services/staging.ts");
  for(const action of [
    "signInWithPassword",
    "signUp",
    "resetPasswordForEmail",
    "auth.resend",
    "exchangeCodeForSession",
    "auth.setSession",
    "auth.updateUser",
    "auth.signOut"
  ]) assert.ok(staging.includes(action),"missing staging auth action: "+action);

  const security=read("src/services/security.ts");
  assert.ok(security.includes("Authenticated client state cannot create Studio authority"));
  assert.equal(/role\s*:\s*["'](admin|editor|publisher)/i.test(staging+security),false);
});

test("account deletion stays server-authoritative",()=>{
  const staging=read("src/services/staging.ts");
  const screen=read("app/devices-sessions.tsx");
  assert.ok(staging.includes('status: "server-required"'));
  assert.ok(staging.includes("mobile client cannot delete Auth users directly"));
  assert.ok(screen.includes("requestAccountDeletion"));
  assert.equal(staging.includes("admin.deleteUser"),false);
});

test("push registration is permission-driven and never claims server registration",()=>{
  const push=read("src/security/push.ts");
  assert.ok(push.includes("getPermissionsAsync"));
  assert.ok(push.includes("requestPermissionsAsync"));
  assert.ok(push.includes("setNotificationChannelAsync"));
  assert.ok(push.includes("getExpoPushTokenAsync"));
  assert.ok(push.includes('status: "backend-required"'));
  assert.ok(push.includes("not treated as registered"));
  assert.equal(push.includes("registerDeviceTokenOnServer"),false);
});

test("Studio modules require server-issued capabilities",()=>{
  const studio=read("src/ui/Studio.tsx");
  const modules=read("app/studio/[module].tsx");
  assert.ok(studio.includes("StudioAccessGate"));
  assert.ok(studio.includes("hasServerCapability"));
  assert.ok(studio.includes("cannot grant this capability"));
  assert.ok(studio.includes("navigating directly to this route"));
  for(const value of [
    'capability:"story.create"',
    'capability:"story.publish"',
    'capability:"ads.view"',
    'capability:"premium.manage"',
    'capability:"subscriber.view"',
    'capability:"staff.view"',
    'capability:"settings.manage"'
  ]) assert.ok(modules.includes(value),"missing Studio gate: "+value);
});

test("NM-06 account and notification routes are present",()=>{
  const layout=read("app/_layout.tsx");
  const my=read("app/(reader)/my.tsx");
  for(const route of ["account-access","devices-sessions","notification-settings"]){
    assert.ok(layout.includes('name="'+route+'"'),"missing route: "+route);
  }
  assert.ok(my.includes("/account-access"));
  assert.ok(my.includes("/devices-sessions"));
  assert.ok(my.includes("/notification-settings"));
});

test("no privileged server secret or local authority fixture is introduced",()=>{
  const files=[
    "src/security/auth-storage.ts",
    "src/security/capabilities.ts",
    "src/security/push.ts",
    "src/services/security.ts",
    "src/services/staging.ts",
    "app/account-access.tsx",
    "app/devices-sessions.tsx"
  ];
  const corpus=files.map(read).join("\n");
  assert.equal(/service[_-]?role/i.test(corpus),false);
  assert.equal(/SUPABASE_SERVICE_ROLE_KEY/i.test(corpus),false);
  assert.equal(/setRole|switchRole|assumeRole|grantCapability/i.test(corpus),false);
});

test("anonymous staging reads cannot enumerate protected identity/editorial tables",async()=>{
  const eas=JSON.parse(read("eas.json"));
  const env=eas.build?.staging?.env ?? {};
  const url=env.EXPO_PUBLIC_SUPABASE_URL;
  const key=env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  assert.equal(typeof url,"string");
  assert.equal(typeof key,"string");

  for(const table of [
    "staff_profiles",
    "stories",
    "story_revisions",
    "subscribers",
    "premium_entitlements"
  ]){
    const response=await fetch(url+"/rest/v1/"+table+"?select=id&limit=1",{
      headers:{apikey:key,Authorization:"Bearer "+key}
    });
    assert.equal(response.ok,true,table+" RLS probe returned HTTP "+response.status);
    const body=await response.json();
    assert.equal(Array.isArray(body),true);
    assert.equal(body.length,0,"anonymous client must not enumerate "+table);
  }
});


test("account recovery callback is consumed before password replacement",()=>{
  const account=read("app/account-access.tsx");
  const staging=read("src/services/staging.ts");
  assert.ok(account.includes("Linking.getInitialURL"));
  assert.ok(account.includes('Linking.addEventListener("url"'));
  assert.ok(account.includes("handleAuthCallback"));
  assert.ok(account.includes("completePasswordReset"));
  assert.ok(staging.includes("exchangeCodeForSession"));
  assert.ok(staging.includes("auth.setSession"));
  assert.ok(staging.includes("auth.updateUser"));
  assert.ok(staging.includes("A verified password-recovery session is required"));
});


test("Studio operational UX remains fail-closed and capability-oriented",()=>{
  const studio=read("src/ui/Studio.tsx");
  const today=read("app/studio/index.tsx");
  const modules=read("app/studio/[module].tsx");
  assert.ok(studio.includes("SERVER POLICY PENDING"));
  assert.ok(studio.includes("Authority: AG-06 server roles only"));
  assert.ok(studio.includes("Required capability"));
  assert.ok(today.includes("CP7"));
  assert.ok(today.includes("NOT AUTHORIZED"));
  assert.ok(modules.includes("Implementation readiness"));
  assert.equal(/setRole|switchRole|assumeRole|grantCapability/i.test(studio+"\n"+today+"\n"+modules),false);
});
