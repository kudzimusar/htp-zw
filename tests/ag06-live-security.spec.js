const { test, expect, request } = require('@playwright/test');

const baseURL = String(process.env.AG06_STAGING_BASE_URL || '').replace(/\/$/,'');
const supabaseURL = String(process.env.AG06_STAGING_SUPABASE_URL || '').replace(/\/$/,'');
const anonKey = process.env.AG06_STAGING_SUPABASE_PUBLISHABLE_KEY || '';
const accounts = {
  reporter: { email: process.env.AG06_REPORTER_EMAIL, password: process.env.AG06_REPORTER_PASSWORD },
  editor: { email: process.env.AG06_EDITOR_EMAIL, password: process.env.AG06_EDITOR_PASSWORD },
  commercial: { email: process.env.AG06_COMMERCIAL_EMAIL, password: process.env.AG06_COMMERCIAL_PASSWORD },
  publisher: { email: process.env.AG06_PUBLISHER_EMAIL, password: process.env.AG06_PUBLISHER_PASSWORD }
};
const configured = Boolean(baseURL && supabaseURL && anonKey && Object.values(accounts).every(a=>a.email&&a.password));

function csrfFrom(state){
  return state.cookies.find(c=>c.name==='htp_nr_csrf')?.value || '';
}
async function appLogin(kind){
  const ctx=await request.newContext({baseURL,extraHTTPHeaders:{Origin:baseURL}});
  const response=await ctx.post('/api/newsroom',{data:{action:'login',...accounts[kind]}});
  expect(response.status(),`${kind} login`).toBe(200);
  const state=await ctx.storageState();
  const csrf=csrfFrom(state);
  expect(csrf,`${kind} CSRF cookie`).toBeTruthy();
  return {ctx,csrf};
}
async function appPost(client,action,payload={}){
  return client.ctx.post('/api/newsroom',{
    headers:{Origin:baseURL,'X-HTP-CSRF':client.csrf},
    data:{action,...payload}
  });
}
async function appBootstrap(client){
  const response=await client.ctx.get('/api/newsroom?action=bootstrap',{headers:{Origin:baseURL}});
  const body=await response.json().catch(()=>({}));
  return {response,body};
}
async function rawAuth(kind){
  const response=await fetch(`${supabaseURL}/auth/v1/token?grant_type=password`,{
    method:'POST',
    headers:{apikey:anonKey,'Content-Type':'application/json'},
    body:JSON.stringify(accounts[kind])
  });
  expect(response.status(),`${kind} direct Supabase auth`).toBe(200);
  const session=await response.json();
  const headers={apikey:anonKey,Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'};
  const register=await fetch(`${supabaseURL}/rest/v1/rpc/newsroom_register_session`,{
    method:'POST',headers,body:JSON.stringify({p_user_agent:'AG-06 direct RLS certification'})
  });
  expect(register.status(),`${kind} direct session registration`).toBe(200);
  return {session,headers};
}

test.describe('AG-06 live staging authorization attacks',()=>{
  test.describe.configure({mode:'serial'});
  test.skip(!configured,'Requires HealthTimes Staging URL/publishable key and four staging-only role accounts.');

  test('anonymous, Reporter, Commercial, Editor and Publisher boundaries hold below the UI',async()=>{
    const anonymous=await request.newContext({baseURL,extraHTTPHeaders:{Origin:baseURL}});
    const anonBootstrap=await anonymous.get('/api/newsroom?action=bootstrap');
    expect(anonBootstrap.status()).toBe(401);

    const anonHeaders={apikey:anonKey,'Content-Type':'application/json'};
    const anonDraft=await fetch(`${supabaseURL}/rest/v1/stories?select=id,title,status&limit=1`,{headers:anonHeaders});
    expect([401,403]).toContain(anonDraft.status());
    const anonComments=await fetch(`${supabaseURL}/rest/v1/story_internal_comments?select=id&limit=1`,{headers:anonHeaders});
    expect([401,403]).toContain(anonComments.status());
    const anonAudit=await fetch(`${supabaseURL}/rest/v1/audit_logs?select=id&limit=1`,{headers:anonHeaders});
    expect([401,403]).toContain(anonAudit.status());
    const publicStories=await fetch(`${supabaseURL}/rest/v1/rpc/newsroom_public_published_stories`,{
      method:'POST',headers:anonHeaders,body:JSON.stringify({p_slug:null})
    });
    expect(publicStories.status()).toBe(200);
    const publicRows=await publicStories.json();
    for(const row of publicRows.slice(0,3)){
      expect(row).not.toHaveProperty('internal_notes');
      expect(row).not.toHaveProperty('source_notes');
      expect(row).not.toHaveProperty('owner_staff_id');
      expect(row).not.toHaveProperty('lock_version');
    }

    const reporter=await appLogin('reporter');
    let boot=await appBootstrap(reporter);
    expect(boot.response.status()).toBe(200);
    expect(boot.body.data.context.role).toBe('Reporter / Journalist');
    expect(boot.body.data.context.capabilities).toContain('story.create');
    expect(boot.body.data.context.capabilities).not.toContain('story.publish');

    const stamp=Date.now();
    const created=await appPost(reporter,'createStory',{story:{
      title:`AG06 Reporter Boundary ${stamp}`,
      slug:`ag06-reporter-boundary-${stamp}`,
      desk:'Africa',country:'Zimbabwe',region:'Africa'
    }});
    expect(created.status()).toBe(200);
    const storyId=(await created.json()).id;
    expect(storyId).toBeTruthy();

    boot=await appBootstrap(reporter);
    let story=boot.body.data.stories.find(s=>s.id===storyId);
    expect(story).toBeTruthy();
    const saved=await appPost(reporter,'saveStory',{
      storyId,expectedVersion:story.lock_version,
      patch:{title:`AG06 Reporter Boundary ${stamp}`,body:'Reporter-owned staging security test copy.',sources:'AG-06 automated staging evidence.'},
      reason:'AG-06 direct authorization test'
    });
    expect(saved.status()).toBe(200);

    const submitted=await appPost(reporter,'transitionStory',{storyId,nextStatus:'Submitted'});
    expect(submitted.status()).toBe(200);
    const reporterPublish=await appPost(reporter,'transitionStory',{storyId,nextStatus:'Published'});
    expect(reporterPublish.status()).toBe(403);
    const reporterRole=await appPost(reporter,'changeRole',{staffId:boot.body.data.context.id,role:'Publisher / Owner'});
    expect(reporterRole.status()).toBe(403);
    const reporterAdApprove=await appPost(reporter,'approveCampaign',{campaignId:'00000000-0000-0000-0000-000000000000',approved:true});
    expect(reporterAdApprove.status()).toBe(403);

    const rawReporter=await rawAuth('reporter');
    const roleRead=await fetch(`${supabaseURL}/rest/v1/newsroom_roles?select=id,name&name=eq.${encodeURIComponent('Publisher / Owner')}`,{headers:rawReporter.headers});
    expect(roleRead.status()).toBe(200);
    const publisherRole=(await roleRead.json())[0];
    expect(publisherRole?.id).toBeTruthy();
    const directRoleEscalation=await fetch(`${supabaseURL}/rest/v1/staff_profiles?id=eq.${boot.body.data.context.id}`,{
      method:'PATCH',
      headers:{...rawReporter.headers,Prefer:'return=representation'},
      body:JSON.stringify({role_id:publisherRole.id,status:'active'})
    });
    expect([400,401,403,409]).toContain(directRoleEscalation.status());
    const directPublish=await fetch(`${supabaseURL}/rest/v1/stories?id=eq.${storyId}`,{
      method:'PATCH',
      headers:{...rawReporter.headers,Prefer:'return=representation'},
      body:JSON.stringify({status:'publish',workflow_status:'Published',published_at:new Date().toISOString()})
    });
    expect([400,401,403,409]).toContain(directPublish.status());

    const commercial=await appLogin('commercial');
    const commercialBoot=await appBootstrap(commercial);
    expect(commercialBoot.response.status()).toBe(200);
    expect(commercialBoot.body.data.context.role).toBe('Commercial Manager');
    expect(commercialBoot.body.data.context.capabilities).toContain('ads.view');
    expect(commercialBoot.body.data.context.capabilities).not.toContain('story.publish');
    expect(commercialBoot.body.data.context.capabilities).not.toContain('story.edit_all');
    const commercialEdit=await appPost(commercial,'saveStory',{
      storyId,expectedVersion:2,patch:{body:'Commercial attempted editorial mutation.'},reason:'Unauthorized commercial edit'
    });
    expect(commercialEdit.status()).toBe(403);
    const commercialPublish=await appPost(commercial,'transitionStory',{storyId,nextStatus:'Published'});
    expect(commercialPublish.status()).toBe(403);

    const rawCommercial=await rawAuth('commercial');
    const directCommercialEdit=await fetch(`${supabaseURL}/rest/v1/stories?id=eq.${storyId}`,{
      method:'PATCH',
      headers:{...rawCommercial.headers,Prefer:'return=representation'},
      body:JSON.stringify({body_html:'Commercial attempted direct PostgREST editorial mutation.'})
    });
    expect([200,204,400,401,403]).toContain(directCommercialEdit.status());
    if(directCommercialEdit.status()===200){
      const rows=await directCommercialEdit.json();
      expect(rows).toEqual([]);
    }

    const editor=await appLogin('editor');
    const editorBoot=await appBootstrap(editor);
    expect(editorBoot.response.status()).toBe(200);
    expect(editorBoot.body.data.context.capabilities).toContain('story.publish');
    for(const nextStatus of ['Fact check','Health / Science review','Copy edit','Editor review','Ready','Published']){
      const response=await appPost(editor,'transitionStory',{storyId,nextStatus});
      expect(response.status(),`Editor transition to ${nextStatus}`).toBe(200);
    }
    const editorAfter=await appBootstrap(editor);
    story=editorAfter.body.data.stories.find(s=>s.id===storyId);
    expect(story.workflow_status).toBe('Published');
    expect(String(story.status).toLowerCase()).toBe('publish');

    const publisher=await appLogin('publisher');
    let publisherBoot=await appBootstrap(publisher);
    expect(publisherBoot.response.status()).toBe(200);
    const reporterProfile=publisherBoot.body.data.staff.find(s=>String(s.email||'').toLowerCase()===String(accounts.reporter.email).toLowerCase());
    expect(reporterProfile?.id).toBeTruthy();
    const reporterSession=publisherBoot.body.data.sessions.find(s=>s.staff_profile_id===reporterProfile.id&&!s.revoked_at);
    expect(reporterSession?.provider_session_id).toBeTruthy();
    const revoke=await appPost(publisher,'revokeSession',{
      staffId:reporterProfile.id,providerSessionId:reporterSession.provider_session_id
    });
    expect(revoke.status()).toBe(200);

    const staleReporter=await appBootstrap(reporter);
    expect(staleReporter.response.status()).toBe(403);

    publisherBoot=await appBootstrap(publisher);
    const actions=(publisherBoot.body.data.audit||[]).map(a=>a.action);
    expect(actions).toContain('story.published');
    expect(actions).toContain('session.revoked');

    await Promise.all([anonymous.dispose(),reporter.ctx.dispose(),commercial.ctx.dispose(),editor.ctx.dispose(),publisher.ctx.dispose()]);
  });
});
