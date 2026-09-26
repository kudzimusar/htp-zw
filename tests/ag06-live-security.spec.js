const { test, expect, request } = require('@playwright/test');
const fs = require('fs');
const crypto = require('crypto');

const baseURL = String(process.env.AG06_STAGING_BASE_URL || '').replace(/\/$/,'');
const supabaseURL = String(process.env.AG06_STAGING_SUPABASE_URL || '').replace(/\/$/,'');
const anonKey = process.env.AG06_STAGING_SUPABASE_PUBLISHABLE_KEY || '';
const accounts = {
  reporter: { email: process.env.AG06_REPORTER_EMAIL, password: process.env.AG06_REPORTER_PASSWORD },
  editor: { email: process.env.AG06_EDITOR_EMAIL, password: process.env.AG06_EDITOR_PASSWORD },
  commercial: { email: process.env.AG06_COMMERCIAL_EMAIL, password: process.env.AG06_COMMERCIAL_PASSWORD },
  publisher: { email: process.env.AG06_PUBLISHER_EMAIL, password: process.env.AG06_PUBLISHER_PASSWORD }
};
const configured = Boolean(baseURL && Object.values(accounts).every(a=>a.email&&a.password));
const directSupabaseConfigured = Boolean(supabaseURL && anonKey);
const statusOf = response => typeof response.status === 'function' ? response.status() : response.status;

function csrfFrom(state){
  return state.cookies.find(c=>c.name==='htp_nr_csrf')?.value || '';
}
async function appLogin(kind){
  const ctx=await request.newContext({baseURL,ignoreHTTPSErrors:true,extraHTTPHeaders:{Origin:baseURL}});
  const response=await ctx.post('/api/newsroom',{data:{action:'login',...accounts[kind]}});
  expect(statusOf(response),`${kind} login`).toBe(200);
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
async function appAdoptLogin(kind){
  expect(directSupabaseConfigured,`${kind} provider adoption requires staging Supabase configuration`).toBeTruthy();
  const auth=await fetch(`${supabaseURL}/auth/v1/token?grant_type=password`,{
    method:'POST',
    headers:{apikey:anonKey,'Content-Type':'application/json'},
    body:JSON.stringify(accounts[kind])
  });
  expect(statusOf(auth),`${kind} direct provider auth for adoption`).toBe(200);
  const session=await auth.json();
  const ctx=await request.newContext({baseURL,ignoreHTTPSErrors:true,extraHTTPHeaders:{Origin:baseURL}});
  const response=await ctx.post('/api/newsroom',{data:{
    action:'adoptSession',accessToken:session.access_token,refreshToken:session.refresh_token,expiresIn:session.expires_in
  }});
  expect(statusOf(response),`${kind} provider-session adoption`).toBe(200);
  const state=await ctx.storageState();
  const csrf=csrfFrom(state);
  expect(csrf,`${kind} adopted-session CSRF cookie`).toBeTruthy();
  return {ctx,csrf};
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
  expect(statusOf(response),`${kind} direct Supabase auth`).toBe(200);
  const session=await response.json();
  const headers={apikey:anonKey,Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'};
  const register=await fetch(`${supabaseURL}/rest/v1/rpc/newsroom_register_session`,{
    method:'POST',headers,body:JSON.stringify({p_user_agent:'AG-06 direct RLS certification'})
  });
  expect(statusOf(register),`${kind} direct session registration`).toBe(200);
  return {session,headers};
}

test.describe('AG-06 live staging authorization attacks',()=>{
  test.describe.configure({mode:'serial'});
  test.skip(!configured,'Requires HealthTimes Staging URL/publishable key and four staging-only role accounts.');

  test('anonymous, Reporter, Commercial, Editor and Publisher boundaries hold below the UI',async()=>{
    test.setTimeout(60_000);
    test.setTimeout(120_000);
    const anonymous=await request.newContext({baseURL,ignoreHTTPSErrors:true,extraHTTPHeaders:{Origin:baseURL}});
    const anonBootstrap=await anonymous.get('/api/newsroom?action=bootstrap');
    expect(statusOf(anonBootstrap)).toBe(401);

    if(directSupabaseConfigured){
      const anonHeaders={apikey:anonKey,'Content-Type':'application/json'};
      const assertNoProtectedRows=async response=>{
        expect([200,401,403]).toContain(statusOf(response));
        if(statusOf(response)===200){
          const rows=await response.json();
          expect(rows).toEqual([]);
        }
      };
      const anonDraft=await fetch(`${supabaseURL}/rest/v1/stories?select=id,title,status&limit=1`,{headers:anonHeaders});
      await assertNoProtectedRows(anonDraft);
      const anonComments=await fetch(`${supabaseURL}/rest/v1/story_internal_comments?select=id&limit=1`,{headers:anonHeaders});
      await assertNoProtectedRows(anonComments);
      const anonAudit=await fetch(`${supabaseURL}/rest/v1/audit_logs?select=id&limit=1`,{headers:anonHeaders});
      await assertNoProtectedRows(anonAudit);
      const publicStories=await fetch(`${supabaseURL}/rest/v1/rpc/newsroom_public_published_stories`,{
        method:'POST',headers:anonHeaders,body:JSON.stringify({p_slug:null})
      });
      expect(statusOf(publicStories)).toBe(200);
      const publicRows=await publicStories.json();
      for(const row of publicRows.slice(0,3)){
        expect(row).not.toHaveProperty('internal_notes');
        expect(row).not.toHaveProperty('source_notes');
        expect(row).not.toHaveProperty('owner_staff_id');
        expect(row).not.toHaveProperty('lock_version');
      }
    } else {
      test.info().annotations.push({type:'live-postgrest',description:'Optional direct PostgREST probes skipped: staging publishable key is not configured.'});
    }

    const reporter=await appLogin('reporter');

    let boot=await appBootstrap(reporter);
    expect(statusOf(boot.response),`reporter bootstrap body: ${JSON.stringify(boot.body)}`).toBe(200);
    expect(boot.body.data.context.role).toBe('Reporter / Journalist');
    expect(boot.body.data.context.capabilities).toContain('story.create');
    expect(boot.body.data.context.capabilities).not.toContain('story.publish');
    const reporterAppSessionId=boot.body.data.context.session_id;
    expect(reporterAppSessionId).toBeTruthy();

    const stamp=Date.now();
    const created=await appPost(reporter,'createStory',{story:{
      title:`AG06 Reporter Boundary ${stamp}`,
      slug:`ag06-reporter-boundary-${stamp}`,
      desk:'Africa',country:'Zimbabwe',region:'Africa'
    }});
    expect(statusOf(created)).toBe(200);
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
    expect(statusOf(saved)).toBe(200);

    const submitted=await appPost(reporter,'transitionStory',{storyId,nextStatus:'Submitted'});
    expect(statusOf(submitted)).toBe(200);
    const reporterPublish=await appPost(reporter,'transitionStory',{storyId,nextStatus:'Published'});
    expect(statusOf(reporterPublish)).toBe(403);
    const reporterRole=await appPost(reporter,'changeRole',{staffId:boot.body.data.context.id,role:'Publisher / Owner'});
    expect(statusOf(reporterRole)).toBe(403);
    const reporterAdApprove=await appPost(reporter,'approveCampaign',{campaignId:'00000000-0000-0000-0000-000000000000',approved:true});
    expect(statusOf(reporterAdApprove)).toBe(403);

    if(directSupabaseConfigured){
      const rawReporter=await rawAuth('reporter');
      const roleRead=await fetch(`${supabaseURL}/rest/v1/newsroom_roles?select=id,name&name=eq.${encodeURIComponent('Publisher / Owner')}`,{headers:rawReporter.headers});
      expect(statusOf(roleRead)).toBe(200);
      const publisherRole=(await roleRead.json())[0];
      expect(publisherRole?.id).toBeTruthy();
      const directRoleEscalation=await fetch(`${supabaseURL}/rest/v1/staff_profiles?id=eq.${boot.body.data.context.id}`,{
        method:'PATCH',
        headers:{...rawReporter.headers,Prefer:'return=representation'},
        body:JSON.stringify({role_id:publisherRole.id,status:'active'})
      });
      expect([400,401,403,409]).toContain(statusOf(directRoleEscalation));
      const directPublish=await fetch(`${supabaseURL}/rest/v1/stories?id=eq.${storyId}`,{
        method:'PATCH',
        headers:{...rawReporter.headers,Prefer:'return=representation'},
        body:JSON.stringify({status:'publish',workflow_status:'Published',published_at:new Date().toISOString()})
      });
      expect([400,401,403,409]).toContain(statusOf(directPublish));
    }

    const commercial=await appLogin('commercial');
    const commercialBoot=await appBootstrap(commercial);
    expect(statusOf(commercialBoot.response)).toBe(200);
    expect(commercialBoot.body.data.context.role).toBe('Commercial Manager');
    expect(commercialBoot.body.data.context.capabilities).toContain('ads.view');
    expect(commercialBoot.body.data.context.capabilities).not.toContain('story.publish');
    expect(commercialBoot.body.data.context.capabilities).not.toContain('story.edit_all');
    const commercialEdit=await appPost(commercial,'saveStory',{
      storyId,expectedVersion:2,patch:{body:'Commercial attempted editorial mutation.'},reason:'Unauthorized commercial edit'
    });
    expect(statusOf(commercialEdit)).toBe(403);
    const commercialPublish=await appPost(commercial,'transitionStory',{storyId,nextStatus:'Published'});
    expect(statusOf(commercialPublish)).toBe(403);

    if(directSupabaseConfigured){
      const rawCommercial=await rawAuth('commercial');
      const directCommercialEdit=await fetch(`${supabaseURL}/rest/v1/stories?id=eq.${storyId}`,{
        method:'PATCH',
        headers:{...rawCommercial.headers,Prefer:'return=representation'},
        body:JSON.stringify({body_html:'Commercial attempted direct PostgREST editorial mutation.'})
      });
      expect([200,204,400,401,403]).toContain(statusOf(directCommercialEdit));
      if(statusOf(directCommercialEdit)===200){
        const rows=await directCommercialEdit.json();
        expect(rows).toEqual([]);
      }
    }

    const editor=await appLogin('editor');
    const editorBoot=await appBootstrap(editor);
    expect(statusOf(editorBoot.response)).toBe(200);
    expect(editorBoot.body.data.context.capabilities).toContain('story.publish');
    for(const nextStatus of ['Fact check','Health / Science review','Copy edit','Editor review','Ready','Published']){
      const response=await appPost(editor,'transitionStory',{storyId,nextStatus});
      expect(statusOf(response),`Editor transition to ${nextStatus}`).toBe(200);
    }
    const editorAfter=await appBootstrap(editor);
    story=editorAfter.body.data.stories.find(s=>s.id===storyId);
    expect(story.workflow_status).toBe('Published');
    expect(String(story.status).toLowerCase()).toBe('publish');

    const publisher=await appLogin('publisher');
    let publisherBoot=await appBootstrap(publisher);
    expect(statusOf(publisherBoot.response)).toBe(200);
    const reporterProfile=publisherBoot.body.data.staff.find(s=>String(s.email||'').toLowerCase()===String(accounts.reporter.email).toLowerCase());
    expect(reporterProfile?.id).toBeTruthy();
    const reporterSession=publisherBoot.body.data.sessions.find(s=>s.staff_profile_id===reporterProfile.id&&s.provider_session_id===reporterAppSessionId&&!s.revoked_at);
    expect(reporterSession?.provider_session_id).toBeTruthy();
    const revoke=await appPost(publisher,'revokeSession',{
      staffId:reporterProfile.id,providerSessionId:reporterSession.provider_session_id
    });
    expect(statusOf(revoke)).toBe(200);

    const staleReporter=await appBootstrap(reporter);
    expect(statusOf(staleReporter.response)).toBe(403);

    publisherBoot=await appBootstrap(publisher);
    const auditRows=publisherBoot.body.data.audit||[];
    const actions=auditRows.map(a=>a.action);
    expect(actions).toContain('story.published');
    expect(actions).toContain('session.revoked');

    const evidence={
      github_run_id:process.env.GITHUB_RUN_ID||null,
      tested_at:new Date().toISOString(),
      staging_project_ref:'gcdohgbmqhqwydgaxrcr',
      exact_branch_gateway:baseURL,
      direct_postgrest_probes:directSupabaseConfigured,
      anonymous:{bootstrap_denied_status:statusOf(anonBootstrap)},
      reporter:{
        role:boot.body.data.context.role,
        create_edit_own_submit:'PASS',
        publish_denied_status:statusOf(reporterPublish),
        self_role_escalation_denied_status:statusOf(reporterRole),
        ad_approval_denied_status:statusOf(reporterAdApprove)
      },
      commercial:{
        role:commercialBoot.body.data.context.role,
        editorial_edit_denied_status:statusOf(commercialEdit),
        publish_denied_status:statusOf(commercialPublish)
      },
      editor:{
        role:editorBoot.body.data.context.role,
        final_workflow_status:story.workflow_status,
        final_story_status:story.status
      },
      publisher:{
        role:publisherBoot.body.data.context.role,
        reporter_session_revoked:statusOf(revoke)===200,
        stale_reporter_rejected_status:statusOf(staleReporter.response)
      },
      story_id:storyId,
      audit:auditRows
        .filter(a=>['story.published','session.revoked'].includes(a.action))
        .map(a=>({action:a.action,target_table:a.target_table,target_id:a.target_id,created_at:a.created_at}))
    };
    fs.writeFileSync(process.env.AG06_EVIDENCE_PATH||'/tmp/ag06-live-evidence.json',JSON.stringify(evidence,null,2));
    console.log('AG06_LIVE_EVIDENCE',JSON.stringify(evidence));

    await Promise.all([anonymous.dispose(),reporter.ctx.dispose(),commercial.ctx.dispose(),editor.ctx.dispose(),publisher.ctx.dispose()]);
  });
  test('story media and Request changes enforce the editorial loop below the UI',async()=>{
    test.setTimeout(120_000);
    const stamp=Date.now();
    const reporter=await appAdoptLogin('reporter');
    const editor=await appAdoptLogin('editor');
    const commercial=await appAdoptLogin('commercial');

    let reporterBoot=await appBootstrap(reporter);
    expect(statusOf(reporterBoot.response)).toBe(200);
    const created=await appPost(reporter,'createStory',{story:{
      title:`AG06 Media Review ${stamp}`,
      slug:`ag06-media-review-${stamp}`,
      desk:'Africa',country:'Zimbabwe',region:'Africa'
    }});
    expect(statusOf(created)).toBe(200);
    const storyId=(await created.json()).id;

    reporterBoot=await appBootstrap(reporter);
    let story=reporterBoot.body.data.stories.find(s=>s.id===storyId);
    const saved=await appPost(reporter,'saveStory',{
      storyId,expectedVersion:story.lock_version,
      patch:{body:'Reporter draft with a private supporting document.',sources:'AG-06 media and review certification.'},
      reason:'Prepare media review certification story'
    });
    expect(statusOf(saved)).toBe(200);

    const content=Buffer.from('HealthTimes AG-06 private supporting document '+stamp);
    const checksum=crypto.createHash('sha256').update(content).digest('hex');
    const provenance=`AG06_CERT:${process.env.GITHUB_RUN_ID||stamp}`;
    const prepare=await appPost(reporter,'prepareStoryMedia',{
      storyId,filename:`ag06-support-${stamp}.txt`,mimeType:'text/plain',byteSize:content.length,
      checksum,altText:'',caption:'AG-06 private supporting document',credit:'HealthTimes certification',
      sourceProvenance:provenance,usageType:'supporting_document'
    });
    expect(statusOf(prepare)).toBe(200);
    const preparedBody=await prepare.json();
    expect(preparedBody.prepared.storage_bucket).toBe('newsroom-private');
    expect(preparedBody.prepared.storage_key).toContain(`story-media/${storyId}/`);
    const mediaId=preparedBody.prepared.media_id;

    const uploadForm=new FormData();
    uploadForm.append('cacheControl','3600');
    uploadForm.append('',new Blob([content],{type:'text/plain'}),`ag06-support-${stamp}.txt`);
    const upload=await fetch(preparedBody.uploadUrl,{method:'PUT',headers:{'x-upsert':'false'},body:uploadForm});
    expect(statusOf(upload)).toBe(200);

    const finalized=await appPost(reporter,'finalizeStoryMedia',{mediaId,storyId,usageType:'supporting_document',checksum});
    expect(statusOf(finalized)).toBe(200);
    const preview=await appPost(reporter,'getMediaPreview',{mediaId});
    expect(statusOf(preview)).toBe(200);
    expect((await preview.json()).public).toBe(false);

    reporterBoot=await appBootstrap(reporter);
    const persistedMedia=(reporterBoot.body.data.media||[]).find(m=>m.id===mediaId);
    expect(persistedMedia).toBeTruthy();
    expect(persistedMedia.status).toBe('private_ready');
    expect(persistedMedia.storage_bucket).toBe('newsroom-private');
    expect((persistedMedia.usage||[]).some(u=>u.story_id===storyId&&u.usage_type==='supporting_document')).toBe(true);

    if(directSupabaseConfigured){
      const anonHeaders={apikey:anonKey,'Content-Type':'text/plain'};
      const anonymousWrite=await fetch(`${supabaseURL}/storage/v1/object/newsroom-private/ag06-anonymous-${stamp}.txt`,{
        method:'POST',headers:anonHeaders,body:'unauthorised'
      });
      expect([400,401,403]).toContain(statusOf(anonymousWrite));
      const encodedPath=preparedBody.prepared.storage_key.split('/').map(encodeURIComponent).join('/');
      const anonymousRead=await fetch(`${supabaseURL}/storage/v1/object/newsroom-private/${encodedPath}`,{headers:{apikey:anonKey}});
      expect([400,401,403,404]).toContain(statusOf(anonymousRead));
    }

    const commercialAttach=await appPost(commercial,'prepareStoryMedia',{
      storyId,filename:'commercial.txt',mimeType:'text/plain',byteSize:10,
      sourceProvenance:'Commercial must not attach editorial media',usageType:'supporting_document'
    });
    expect(statusOf(commercialAttach)).toBe(403);

    const editorStory=await appPost(editor,'createStory',{story:{
      title:`AG06 Editor-owned Media Boundary ${stamp}`,
      slug:`ag06-editor-media-boundary-${stamp}`,
      desk:'Africa',country:'Zimbabwe',region:'Africa'
    }});
    expect(statusOf(editorStory)).toBe(200);
    const editorStoryId=(await editorStory.json()).id;
    const crossAttach=await appPost(reporter,'attachStoryMedia',{mediaId,storyId:editorStoryId,usageType:'supporting_document'});
    expect(statusOf(crossAttach)).toBe(403);

    const submitted=await appPost(reporter,'transitionStory',{storyId,nextStatus:'Submitted'});
    expect(statusOf(submitted)).toBe(200);
    const reporterReturn=await appPost(reporter,'requestStoryChanges',{storyId,reason:'Reporter must not exercise editor review authority.'});
    expect(statusOf(reporterReturn)).toBe(403);

    const emptyReason=await appPost(editor,'requestStoryChanges',{storyId,reason:'  '});
    expect(statusOf(emptyReason)).toBe(400);
    const requested=await appPost(editor,'requestStoryChanges',{storyId,reason:'Please verify the source document and clarify the second paragraph.'});
    expect(statusOf(requested)).toBe(200);

    const editorAfter=await appBootstrap(editor);
    const returned=editorAfter.body.data.stories.find(s=>s.id===storyId);
    expect(returned.workflow_status).toBe('Draft');
    expect((editorAfter.body.data.reviews||[]).some(r=>r.story_id===storyId&&r.status==='changes_requested')).toBe(true);
    expect((editorAfter.body.data.lifecycle||[]).some(r=>r.story_id===storyId&&r.to_status==='Draft'&&String(r.reason||'').includes('Changes requested'))).toBe(true);
    expect((editorAfter.body.data.audit||[]).some(r=>r.target_id===storyId&&r.action==='story.changes_requested')).toBe(true);

    reporterBoot=await appBootstrap(reporter);
    story=reporterBoot.body.data.stories.find(s=>s.id===storyId);
    expect(story.workflow_status).toBe('Draft');
    const changeNote=(reporterBoot.body.data.notifications||[]).find(n=>n.target_id===storyId&&n.event_type==='story.changes_requested');
    expect(changeNote).toBeTruthy();
    expect(changeNote.payload.reason).toContain('verify the source document');

    const revised=await appPost(reporter,'saveStory',{
      storyId,expectedVersion:story.lock_version,
      patch:{body:'Reporter revised copy after the editor requested source verification and clarification.'},
      reason:'Respond to requested changes'
    });
    expect(statusOf(revised)).toBe(200);
    const resubmitted=await appPost(reporter,'transitionStory',{storyId,nextStatus:'Submitted'});
    expect(statusOf(resubmitted)).toBe(200);

    reporterBoot=await appBootstrap(reporter);
    expect(reporterBoot.body.data.stories.find(s=>s.id===storyId)?.workflow_status).toBe('Submitted');

    console.log('AG06_MEDIA_REVIEW_EVIDENCE',JSON.stringify({
      story_id:storyId,media_id:mediaId,storage_bucket:'newsroom-private',
      media_persisted:true,commercial_media_denied:true,cross_story_media_denied:true,
      request_changes:true,reporter_notified:true,resubmission:true
    }));

    await Promise.all([reporter.ctx.dispose(),editor.ctx.dispose(),commercial.ctx.dispose()]);
  });

  test('CMS-native featured media promotion remains private until Publisher publication and releases a public Reader document',async()=>{
    test.setTimeout(240_000);
    expect(directSupabaseConfigured,'Public-media certification requires HealthTimes Staging publishable configuration').toBeTruthy();

    const stamp=Date.now();
    const slug=`ag06-public-media-${stamp}`;
    const path=`/${slug}/`;
    const filename=`ag06-public-${stamp}.png`;
    const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64');
    const checksum=crypto.createHash('sha256').update(image).digest('hex');

    const reporter=await appAdoptLogin('reporter');
    const editor=await appAdoptLogin('editor');
    const commercial=await appAdoptLogin('commercial');
    const publisher=await appAdoptLogin('publisher');
    const rawReporter=await rawAuth('reporter');
    const rawCommercial=await rawAuth('commercial');
    const rawPublisher=await rawAuth('publisher');

    const anonRpc=async(name,args)=>{
      const response=await fetch(`${supabaseURL}/rest/v1/rpc/${name}`,{
        method:'POST',
        headers:{apikey:anonKey,'Content-Type':'application/json'},
        body:JSON.stringify(args)
      });
      return {response,body:await response.json().catch(()=>null)};
    };
    const rawRpc=async(raw,name,args)=>{
      const response=await fetch(`${supabaseURL}/rest/v1/rpc/${name}`,{
        method:'POST',headers:raw.headers,body:JSON.stringify(args)
      });
      return {response,body:await response.json().catch(()=>null)};
    };

    let reporterBoot=await appBootstrap(reporter);
    expect(statusOf(reporterBoot.response)).toBe(200);
    const created=await appPost(reporter,'createStory',{story:{
      title:`AG06 Public Media ${stamp}`,
      slug,desk:'Africa',country:'Zimbabwe',region:'Africa'
    }});
    expect(statusOf(created)).toBe(200);
    const storyId=(await created.json()).id;

    reporterBoot=await appBootstrap(reporter);
    let story=reporterBoot.body.data.stories.find(s=>s.id===storyId);
    expect(story).toBeTruthy();
    const saved=await appPost(reporter,'saveStory',{
      storyId,expectedVersion:story.lock_version,
      patch:{
        title:`AG06 Public Media ${stamp}`,
        standfirst:'CMS-native public media certification.',
        body:'Public Reader certification body for CMS-native promotion.',
        sources:'AG-06 staging certification source.'
      },
      reason:'Prepare CMS public-media certification story'
    });
    expect(statusOf(saved)).toBe(200);

    const prepared=await appPost(reporter,'prepareStoryMedia',{
      storyId,filename,mimeType:'image/png',byteSize:image.length,checksum,
      altText:'HealthTimes AG-06 staging certification image',
      caption:'AG-06 CMS public media certification',
      credit:'HealthTimes certification',
      sourceProvenance:`AG06_PUBLIC_MEDIA_CERT:${process.env.GITHUB_RUN_ID||stamp}`,
      usageType:'featured'
    });
    expect(statusOf(prepared)).toBe(200);
    const preparedBody=await prepared.json();
    const mediaId=preparedBody.prepared.media_id;
    const privateKey=preparedBody.prepared.storage_key;
    expect(preparedBody.prepared.storage_bucket).toBe('newsroom-private');

    const uploadForm=new FormData();
    uploadForm.append('cacheControl','3600');
    uploadForm.append('',new Blob([image],{type:'image/png'}),filename);
    const uploaded=await fetch(preparedBody.uploadUrl,{method:'PUT',headers:{'x-upsert':'false'},body:uploadForm});
    expect(statusOf(uploaded)).toBe(200);

    const finalized=await appPost(reporter,'finalizeStoryMedia',{mediaId,storyId,usageType:'featured',checksum});
    expect(statusOf(finalized)).toBe(200);

    reporterBoot=await appBootstrap(reporter);
    const privateMedia=(reporterBoot.body.data.media||[]).find(m=>m.id===mediaId);
    expect(privateMedia).toBeTruthy();
    expect(privateMedia.storage_bucket).toBe('newsroom-private');
    expect(privateMedia.status).toBe('private_ready');
    expect(String(privateMedia.checksum||'').toLowerCase()).toBe(checksum);

    const encodedPrivate=privateKey.split('/').map(encodeURIComponent).join('/');
    const anonymousPrivate=await fetch(`${supabaseURL}/storage/v1/object/newsroom-private/${encodedPrivate}`,{headers:{apikey:anonKey}});
    expect([400,401,403,404]).toContain(statusOf(anonymousPrivate));

    const beforeDoc=await anonRpc('newsroom_public_story_document',{p_path:path});
    expect(statusOf(beforeDoc.response)).toBe(200);
    expect(beforeDoc.body).toBeNull();

    const beforeList=await anonRpc('newsroom_public_published_stories',{p_slug:slug});
    expect(statusOf(beforeList.response)).toBe(200);
    expect(beforeList.body).toEqual([]);

    const submitted=await appPost(reporter,'transitionStory',{storyId,nextStatus:'Submitted'});
    expect(statusOf(submitted)).toBe(200);
    for(const nextStatus of ['Fact check','Health / Science review','Copy edit','Editor review','Ready']){
      const moved=await appPost(editor,'transitionStory',{storyId,nextStatus});
      expect(statusOf(moved),`Editor transition to ${nextStatus}`).toBe(200);
    }

    const publicKey=`story-media/${storyId}/${mediaId}/${checksum}/${filename}`;
    const encodedPublic=publicKey.split('/').map(encodeURIComponent).join('/');

    const reporterPublish=await appPost(reporter,'transitionStory',{storyId,nextStatus:'Published'});
    expect(statusOf(reporterPublish)).toBe(403);
    const commercialPublish=await appPost(commercial,'transitionStory',{storyId,nextStatus:'Published'});
    expect(statusOf(commercialPublish)).toBe(403);

    for(const raw of [rawReporter,rawCommercial]){
      const denied=await fetch(`${supabaseURL}/storage/v1/object/newsroom-public/${encodedPublic}`,{
        method:'POST',
        headers:{...raw.headers,'Content-Type':'image/png','x-upsert':'false'},
        body:image
      });
      expect([400,401,403]).toContain(statusOf(denied));
    }

    const directFail=await rawRpc(rawPublisher,'newsroom_transition_story',{
      p_story_id:storyId,p_next_status:'Published',p_reason:'Direct fail-closed certification'
    });
    expect([400,409]).toContain(statusOf(directFail.response));

    let publisherBoot=await appBootstrap(publisher);
    story=publisherBoot.body.data.stories.find(s=>s.id===storyId);
    expect(story.workflow_status).toBe('Ready');
    const stillHidden=await anonRpc('newsroom_public_story_document',{p_path:path});
    expect(statusOf(stillHidden.response)).toBe(200);
    expect(stillHidden.body).toBeNull();

    const absentPublic=await fetch(`${supabaseURL}/storage/v1/object/public/newsroom-public/${encodedPublic}`);
    expect([400,404]).toContain(statusOf(absentPublic));

    const published=await appPost(publisher,'transitionStory',{storyId,nextStatus:'Published'});
    expect(statusOf(published)).toBe(200);

    const plan=await rawRpc(rawPublisher,'newsroom_story_media_promotion_plan',{p_story_id:storyId});
    expect(statusOf(plan.response)).toBe(200);
    const promoted=(Array.isArray(plan.body)?plan.body:[]).find(m=>m.media_id===mediaId);
    expect(promoted).toBeTruthy();
    expect(promoted.private_bucket).toBe('newsroom-private');
    expect(promoted.public_storage_bucket).toBe('newsroom-public');
    expect(promoted.public_storage_key).toBe(publicKey);
    expect(String(promoted.checksum||'').toLowerCase()).toBe(checksum);
    expect(promoted.media_status).toBe('published');

    const publicUrl=new URL(String(promoted.public_url),supabaseURL+'/').toString();
    const publicObject=await fetch(publicUrl);
    expect(statusOf(publicObject)).toBe(200);
    const publicBytes=Buffer.from(await publicObject.arrayBuffer());
    const publicChecksum=crypto.createHash('sha256').update(publicBytes).digest('hex');
    expect(publicChecksum).toBe(checksum);

    const privateObject=await fetch(`${supabaseURL}/storage/v1/object/newsroom-private/${encodedPrivate}`,{
      headers:{apikey:anonKey,Authorization:`Bearer ${rawPublisher.session.access_token}`}
    });
    expect(statusOf(privateObject)).toBe(200);
    const privateBytes=Buffer.from(await privateObject.arrayBuffer());
    const privateChecksum=crypto.createHash('sha256').update(privateBytes).digest('hex');
    expect(privateChecksum).toBe(checksum);

    const afterDoc=await anonRpc('newsroom_public_story_document',{p_path:path});
    expect(statusOf(afterDoc.response)).toBe(200);
    expect(afterDoc.body?.source_type).toBe('native-story');
    expect(afterDoc.body?.handling).toBe('native_cms');
    expect(afterDoc.body?.featured_storage_bucket).toBe('newsroom-public');
    expect(afterDoc.body?.featured_storage_object).toBe(publicKey);
    expect(afterDoc.body?.featured_public_url).toBe(promoted.public_url);
    expect(afterDoc.body?.featured_checksum).toBe(checksum);
    expect(afterDoc.body?.body_html).toContain('Public Reader certification body');

    const afterList=await anonRpc('newsroom_public_published_stories',{p_slug:slug});
    expect(statusOf(afterList.response)).toBe(200);
    expect(Array.isArray(afterList.body)).toBe(true);
    expect(afterList.body).toHaveLength(1);
    expect(afterList.body[0]?.id).toBe(storyId);

    publisherBoot=await appBootstrap(publisher);
    story=publisherBoot.body.data.stories.find(s=>s.id===storyId);
    expect(story.workflow_status).toBe('Published');
    expect(story.distribution?.public_reader).toBe(true);

    const overwrite=await fetch(`${supabaseURL}/storage/v1/object/newsroom-public/${encodedPublic}`,{
      method:'POST',
      headers:{...rawPublisher.headers,'Content-Type':'image/png','x-upsert':'false'},
      body:Buffer.from('conflicting public media bytes')
    });
    expect([400,409]).toContain(statusOf(overwrite));
    const afterConflict=await fetch(publicUrl);
    expect(statusOf(afterConflict)).toBe(200);
    expect(crypto.createHash('sha256').update(Buffer.from(await afterConflict.arrayBuffer())).digest('hex')).toBe(checksum);

    const idempotent=await rawRpc(rawPublisher,'newsroom_stage_story_media_promotion',{
      p_story_id:storyId,p_media_id:mediaId,p_public_storage_key:publicKey,p_verified_checksum:checksum
    });
    expect(statusOf(idempotent.response)).toBe(200);
    expect(idempotent.body?.status).toBe('published');

    const premium=await appPost(publisher,'setPremium',{storyId,accessPolicy:'premium'});
    expect(statusOf(premium)).toBe(200);
    const premiumDoc=await anonRpc('newsroom_public_story_document',{p_path:path});
    expect(statusOf(premiumDoc.response)).toBe(200);
    expect(premiumDoc.body?.access_policy).toBe('premium');
    expect(premiumDoc.body?.body_html).toBeNull();
    expect(premiumDoc.body?.featured_public_url).toBe(promoted.public_url);

    const premiumList=await anonRpc('newsroom_public_published_stories',{p_slug:slug});
    expect(statusOf(premiumList.response)).toBe(200);
    expect(premiumList.body).toEqual([]);

    // Preserve the Premium fail-closed proof above, then restore this same
    // certified story to Public so NM-04 can render the identical released
    // identity/media URL across Web/PWA/iOS/iPad/Android before final cleanup.
    const restoredPublic=await appPost(publisher,'setPremium',{storyId,accessPolicy:'public'});
    expect(statusOf(restoredPublic)).toBe(200);
    const restoredDoc=await anonRpc('newsroom_public_story_document',{p_path:path});
    expect(statusOf(restoredDoc.response)).toBe(200);
    expect(restoredDoc.body?.story_id).toBe(storyId);
    expect(restoredDoc.body?.access_policy).toBe('public');
    expect(restoredDoc.body?.body_html).toContain('Public Reader certification body');
    expect(restoredDoc.body?.featured_public_url).toBe(promoted.public_url);
    expect(restoredDoc.body?.featured_checksum).toBe(checksum);
    const restoredList=await anonRpc('newsroom_public_published_stories',{p_slug:slug});
    expect(statusOf(restoredList.response)).toBe(200);
    expect(restoredList.body).toHaveLength(1);
    expect(restoredList.body[0]?.id).toBe(storyId);

    const nm04Evidence={
      story_id:storyId,
      media_id:mediaId,
      slug,
      path,
      title:`AG06 Public Media ${stamp}`,
      body_text:'Public Reader certification body for CMS-native promotion.',
      featured_public_url:publicUrl,
      featured_storage_bucket:promoted.public_storage_bucket,
      featured_storage_object:promoted.public_storage_key,
      featured_checksum:checksum,
      alt_text:'HealthTimes AG-06 staging certification image',
      caption:'AG-06 CMS public media certification',
      credit:'HealthTimes certification',
      source_type:restoredDoc.body?.source_type,
      handling:restoredDoc.body?.handling,
      access_policy:restoredDoc.body?.access_policy
    };
    fs.writeFileSync(
      process.env.NM04_FIXTURE_EVIDENCE_PATH||'/tmp/nm04-native-fixture.json',
      JSON.stringify(nm04Evidence,null,2)
    );
    console.log('NM04_NATIVE_FIXTURE',JSON.stringify(nm04Evidence));

    console.log('AG06_PUBLIC_MEDIA_EVIDENCE',JSON.stringify({
      story_id:storyId,
      media_id:mediaId,
      private_bucket:'newsroom-private',
      private_key:privateKey,
      private_checksum:privateChecksum,
      public_bucket:promoted.public_storage_bucket,
      public_key:promoted.public_storage_key,
      public_checksum:publicChecksum,
      reporter_publish_denied:statusOf(reporterPublish),
      commercial_publish_denied:statusOf(commercialPublish),
      direct_unpromoted_publish_denied:statusOf(directFail.response),
      publication_status:statusOf(published),
      source_type:afterDoc.body?.source_type,
      handling:afterDoc.body?.handling,
      public_reader_release:story.distribution?.public_reader===true,
      anonymous_public_media_status:statusOf(publicObject),
      premium_body_protected:premiumDoc.body?.body_html===null,
      idempotent_promotion:idempotent.body?.status
    }));

    await Promise.all([
      reporter.ctx.dispose(),editor.ctx.dispose(),commercial.ctx.dispose(),publisher.ctx.dispose(),
      rawReporter.session?.access_token?Promise.resolve():Promise.resolve()
    ]);
  });

});
