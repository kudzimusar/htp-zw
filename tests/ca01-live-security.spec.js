const { test, expect, request } = require('@playwright/test');
const fs = require('fs');

const baseURL=String(process.env.CA01_STAGING_BASE_URL||'').replace(/\/$/,'');
const supabaseURL=String(process.env.CA01_STAGING_SUPABASE_URL||'').replace(/\/$/,'');
const anonKey=process.env.CA01_STAGING_SUPABASE_PUBLISHABLE_KEY||'';
const staffKinds=['reporter','editor','commercial','publisher','health'];
const staff=Object.fromEntries(staffKinds.map(kind=>[kind,{
  email:process.env['CA01_'+kind.toUpperCase()+'_EMAIL'],
  password:process.env['CA01_'+kind.toUpperCase()+'_PASSWORD']
}]));
const readerKinds=['author','reporter','restricted','unverified'];
const readers=Object.fromEntries(readerKinds.map(kind=>[kind,{
  email:process.env['CA01_READER_'+kind.toUpperCase()+'_EMAIL'],
  password:process.env['CA01_READER_'+kind.toUpperCase()+'_PASSWORD']
}]));
const canonicalStoryId=String(process.env.CA01_TEST_STORY_ID||'');
const configured=Boolean(baseURL&&supabaseURL&&anonKey&&canonicalStoryId&&
  Object.values(staff).every(a=>a.email&&a.password)&&
  Object.values(readers).every(a=>a.email&&a.password));
const statusOf=r=>typeof r.status==='function'?r.status():r.status;

function csrfFrom(state){return state.cookies.find(c=>c.name==='htp_nr_csrf')?.value||'';}
async function appLogin(kind){
  const ctx=await request.newContext({baseURL,ignoreHTTPSErrors:true,extraHTTPHeaders:{Origin:baseURL}});
  const response=await ctx.post('/api/newsroom',{data:{action:'login',...staff[kind]}});
  expect(statusOf(response),kind+' Newsroom login').toBe(200);
  const state=await ctx.storageState();
  const csrf=csrfFrom(state);expect(csrf).toBeTruthy();
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
  return {response,body:await response.json().catch(()=>({}))};
}
async function rawPassword(email,password){
  return fetch(supabaseURL+'/auth/v1/token?grant_type=password',{
    method:'POST',headers:{apikey:anonKey,'Content-Type':'application/json'},
    body:JSON.stringify({email,password})
  });
}
async function rawReader(kind){
  const response=await rawPassword(readers[kind].email,readers[kind].password);
  expect(statusOf(response),kind+' reader auth').toBe(200);
  const session=await response.json();
  return {
    session,
    headers:{apikey:anonKey,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'}
  };
}
async function rawStaff(kind){
  const response=await rawPassword(staff[kind].email,staff[kind].password);
  expect(statusOf(response),kind+' staff auth').toBe(200);
  const session=await response.json();
  const headers={apikey:anonKey,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'};
  const register=await fetch(supabaseURL+'/rest/v1/rpc/newsroom_register_session',{
    method:'POST',headers,body:JSON.stringify({p_user_agent:'CA-01 direct RLS certification'})
  });
  expect(statusOf(register),kind+' direct session registration').toBe(200);
  return {session,headers};
}
async function rpc(headers,name,args={}){
  return fetch(supabaseURL+'/rest/v1/rpc/'+name,{method:'POST',headers,body:JSON.stringify(args)});
}
let localGatewayContext=null;
async function localGateway(){
  if(!localGatewayContext){
    localGatewayContext=await request.newContext({
      baseURL,
      ignoreHTTPSErrors:true,
      extraHTTPHeaders:{Origin:baseURL}
    });
  }
  return localGatewayContext;
}
async function discussionPost(token,action,payload={}){
  const ctx=await localGateway();
  return ctx.post('/api/discussion',{
    headers:{Authorization:'Bearer '+token},
    data:{action,...payload}
  });
}

test.describe('CA-01 live staging security and discussion contract',()=>{
  test.describe.configure({mode:'serial'});
  test.skip(!configured,'Requires CA-01 staging staff and reader identities.');

  test('private Newsroom and verified Reader discussion boundaries hold below the UI',async({browser})=>{
    test.setTimeout(180_000);

    const storyId=canonicalStoryId;
    expect(storyId).toMatch(/^[0-9a-f-]{36}$/i);

    const reporter=await appLogin('reporter');
    const editor=await appLogin('editor');
    const commercial=await appLogin('commercial');
    const publisher=await appLogin('publisher');
    const health=await appLogin('health');

    const reporterBoot=await appBootstrap(reporter);
    const editorBoot=await appBootstrap(editor);
    const healthBoot=await appBootstrap(health);
    expect(statusOf(reporterBoot.response)).toBe(200);
    expect(statusOf(editorBoot.response)).toBe(200);
    expect(statusOf(healthBoot.response)).toBe(200);
    expect(editorBoot.body.data.context.capabilities).toContain('communication.desk.manage');
    expect(editorBoot.body.data.context.capabilities).toContain('communication.breaking.manage');
    expect(editorBoot.body.data.context.capabilities).toContain('comment.moderate');
    expect(healthBoot.body.data.context.capabilities).toContain('comment.moderate');
    expect(healthBoot.body.data.context.capabilities).not.toContain('comment.restrict');

    // Before assignment, a Reporter and Commercial user cannot enter an unrelated story discussion.
    const reporterUnrelated=await appPost(reporter,'addComment',{storyId,comment:'Unauthorized reporter note'});
    expect(statusOf(reporterUnrelated)).toBe(403);
    const commercialUnrelated=await appPost(commercial,'addComment',{storyId,comment:'Unauthorized commercial note'});
    expect(statusOf(commercialUnrelated)).toBe(403);

    // Editor can comment and mention only already-authorized staff.
    const healthId=healthBoot.body.data.context.id;
    const editorComment=await appPost(editor,'addComment',{
      storyId,
      comment:'@'+healthBoot.body.data.context.handle+' please review this evidence.',
      mentionStaffIds:[healthId]
    });
    expect(statusOf(editorComment)).toBe(200);
    const editorCommentId=(await editorComment.json()).id;
    expect(editorCommentId).toBeTruthy();

    const healthAfterMention=await appBootstrap(health);
    expect((healthAfterMention.body.data.notifications||[]).some(n=>
      n.category==='mention'&&n.target_id===editorCommentId
    )).toBeTruthy();

    // Assignment creates durable notification and then legitimately grants the Reporter story access.
    const reporterId=reporterBoot.body.data.context.id;
    const assignment=await appPost(editor,'createAssignment',{assignment:{
      story_id:storyId,title:'CA-01 assignment '+Date.now(),reporter_staff_id:reporterId,
      assigned_editor_staff_id:editorBoot.body.data.context.id,desk:'Health News',
      deadline_at:new Date(Date.now()+86400000).toISOString(),priority:'High',
      notes:'CA-01 assignment communication certification'
    }});
    expect(statusOf(assignment)).toBe(200);
    const assignmentId=(await assignment.json()).id;

    const reporterAfterAssignment=await appBootstrap(reporter);
    const assignmentNotice=(reporterAfterAssignment.body.data.notifications||[]).find(n=>n.target_id===assignmentId&&n.category==='assignment');
    expect(assignmentNotice?.id).toBeTruthy();

    const reporterComment=await appPost(reporter,'addComment',{storyId,comment:'Reporter update after authorized assignment.'});
    expect(statusOf(reporterComment)).toBe(200);
    const reporterCommentId=(await reporterComment.json()).id;

    const assignmentThread=await appPost(editor,'createThread',{
      threadType:'assignment',title:'Assignment coordination',assignmentId,priority:'high'
    });
    expect(statusOf(assignmentThread)).toBe(200);
    const assignmentThreadId=(await assignmentThread.json()).id;
    const reporterThreadPost=await appPost(reporter,'postThreadMessage',{
      threadId:assignmentThreadId,message:'Reporting is underway.'
    });
    expect(statusOf(reporterThreadPost)).toBe(200);

    // Desk and Breaking coordination remain membership/capability bounded.
    const desk=await appPost(editor,'createDesk',{key:'ca01-'+Date.now(),name:'CA-01 Certification Desk'});
    expect(statusOf(desk)).toBe(200);
    const deskId=(await desk.json()).id;
    expect(statusOf(await appPost(editor,'setDeskMember',{deskId,staffId:reporterId,memberRole:'member'}))).toBe(200);
    const deskThread=await appPost(editor,'createThread',{threadType:'desk',title:'Desk coordination',deskId});
    expect(statusOf(deskThread)).toBe(200);
    const deskThreadId=(await deskThread.json()).id;
    expect(statusOf(await appPost(reporter,'postThreadMessage',{threadId:deskThreadId,message:'Desk member message.'}))).toBe(200);
    expect(statusOf(await appPost(commercial,'postThreadMessage',{threadId:deskThreadId,message:'Commercial intrusion attempt.'}))).toBe(403);

    const breaking=await appPost(editor,'createThread',{threadType:'breaking',title:'CA-01 Breaking Certification',priority:'urgent'});
    expect(statusOf(breaking)).toBe(200);
    const breakingThreadId=(await breaking.json()).id;
    expect(statusOf(await appPost(editor,'setThreadMember',{threadId:breakingThreadId,staffId:reporterId}))).toBe(200);
    expect(statusOf(await appPost(reporter,'postThreadMessage',{threadId:breakingThreadId,message:'Breaking room update.'}))).toBe(200);
    expect(statusOf(await appPost(commercial,'postThreadMessage',{threadId:breakingThreadId,message:'Commercial breaking intrusion.'}))).toBe(403);

    const announcement=await appPost(editor,'publishAnnouncement',{
      title:'CA-01 certification announcement',message:'Acknowledge this bounded staging announcement.',
      audienceScope:'all_staff',priority:'high',requiresAck:true
    });
    expect(statusOf(announcement)).toBe(200);
    const announcementId=(await announcement.json()).id;
    const reporterAfterAnnouncement=await appBootstrap(reporter);
    const ackNotice=(reporterAfterAnnouncement.body.data.notifications||[]).find(n=>
      n.target_id===announcementId&&n.requires_ack
    );
    expect(ackNotice?.id).toBeTruthy();
    expect(statusOf(await appPost(reporter,'ackNotification',{notificationId:ackNotice.id}))).toBe(200);
    const otherAck=await appPost(editor,'markNotificationRead',{notificationId:ackNotice.id});
    expect([400,403,404]).toContain(statusOf(otherAck));

    // Desktop CA-01 surfaces consume the already-authorized server session, not local role state.
    const editorState=await editor.ctx.storageState();
    const uiContext=await browser.newContext({baseURL,ignoreHTTPSErrors:true,storageState:editorState});
    const page=await uiContext.newPage();
    await page.goto('/newsroom.html');
    await expect(page.locator('[data-newsroom-app]')).toBeVisible({timeout:15_000});
    await page.locator('[data-module="inbox"]').click();
    await expect(page.getByRole('heading',{name:'Inbox',exact:true})).toBeVisible();
    await expect(page.locator('[data-inbox-filter]')).toBeVisible();
    await page.locator('[data-module="desks"]').click();
    await expect(page.getByRole('heading',{name:'Desks',exact:true})).toBeVisible();
    await page.locator('[data-module="breaking"]').click();
    await expect(page.getByRole('heading',{name:'Breaking',exact:true})).toBeVisible();
    await page.locator('[data-module="moderation"]').click();
    await expect(page.getByRole('heading',{name:'Moderation',exact:true})).toBeVisible();
    await uiContext.close();

    // Direct Inbox insertion is impossible even for a logged-in staff identity.
    const rawReporter=await rawStaff('reporter');
    const directNotificationInsert=await fetch(supabaseURL+'/rest/v1/newsroom_notifications',{
      method:'POST',
      headers:{...rawReporter.headers,Prefer:'return=representation'},
      body:JSON.stringify({staff_profile_id:reporterId,event_type:'forged',category:'general',priority:'normal'})
    });
    expect([401,403]).toContain(statusOf(directNotificationInsert));

    // Reader fixtures: verified readers can register; unverified credentials cannot become an eligible commenter.
    const authorReader=await rawReader('author');
    const reportingReader=await rawReader('reporter');
    const restrictedReader=await rawReader('restricted');
    const unverifiedLogin=await rawPassword(readers.unverified.email,readers.unverified.password);
    expect(statusOf(unverifiedLogin)).not.toBe(200);

    const register=async(raw,displayName)=>{
      const response=await discussionPost(raw.session.access_token,'registerProfile',{displayName});
      expect(statusOf(response)).toBe(200);
      return (await response.json()).id;
    };
    const authorProfileId=await register(authorReader,'CA01 Reader Author');
    const reportingProfileId=await register(reportingReader,'CA01 Reader Reporter');
    const restrictedProfileId=await register(restrictedReader,'CA01 Restricted Reader');
    expect(authorProfileId&&reportingProfileId&&restrictedProfileId).toBeTruthy();

    // A reader has no authorization path into Newsroom persisted data.
    const readerInternal=await fetch(supabaseURL+'/rest/v1/story_internal_comments?select=id&limit=10',{headers:authorReader.headers});
    expect(statusOf(readerInternal)).toBe(200);
    expect(await readerInternal.json()).toEqual([]);
    const readerThreads=await fetch(supabaseURL+'/rest/v1/newsroom_threads?select=id&limit=10',{headers:authorReader.headers});
    expect(statusOf(readerThreads)).toBe(200);
    expect(await readerThreads.json()).toEqual([]);
    const readerInbox=await fetch(supabaseURL+'/rest/v1/newsroom_notifications?select=id&limit=10',{headers:authorReader.headers});
    expect(statusOf(readerInbox)).toBe(200);
    expect(await readerInbox.json()).toEqual([]);

    const readerNewsroomTopic=await rpc(authorReader.headers,'newsroom_can_join_realtime_topic',{p_topic:'newsroom:story:'+storyId});
    expect(statusOf(readerNewsroomTopic)).toBe(200);
    expect(await readerNewsroomTopic.json()).toBe(false);

    // Comment policy defaults closed; Publisher explicitly opens only this canonical test story.
    const policy=await appPost(publisher,'setStoryCommentPolicy',{storyId,policy:'open'});
    expect(statusOf(policy)).toBe(200);

    const readerCommentTopic=await rpc(authorReader.headers,'reader_can_join_comment_topic',{p_topic:'reader:story-comments:'+storyId});
    expect(statusOf(readerCommentTopic)).toBe(200);
    expect(await readerCommentTopic.json()).toBe(true);

    const eligibility=await discussionPost(authorReader.session.access_token,'eligibility',{storyId});
    expect(statusOf(eligibility)).toBe(200);
    const eligibilityBody=await eligibility.json();
    expect(['pre_moderated','allowed']).toContain(eligibilityBody.eligibility.status);

    const tempId='11111111-1111-4111-8111-111111111111';
    const tempSubmit=await discussionPost(authorReader.session.access_token,'submitComment',{storyId:tempId,comment:'Temporary ID must never persist.'});
    expect([400,403,404]).toContain(statusOf(tempSubmit));

    const local=await localGateway();
    const anonymousSubmit=await local.post('/api/discussion',{
      data:{action:'submitComment',storyId,comment:'Anonymous attempt'}
    });
    expect(statusOf(anonymousSubmit)).toBe(401);

    const submitted=await discussionPost(authorReader.session.access_token,'submitComment',{
      storyId,comment:'A verified reader comment awaiting moderation.'
    });
    expect(statusOf(submitted)).toBe(200);
    const commentId=(await submitted.json()).id;

    let queue=await appPost(publisher,'listModerationQueue',{limit:50});
    expect(statusOf(queue)).toBe(200);
    expect((await queue.json()).rows.some(c=>c.id===commentId)).toBeTruthy();

    const published=await appPost(publisher,'moderateComment',{
      commentId,moderationAction:'publish',reasonCode:'ca01_certification'
    });
    expect(statusOf(published)).toBe(200);

    const publicDiscussion=await local.get('/api/discussion?storyId='+encodeURIComponent(storyId));
    expect(statusOf(publicDiscussion)).toBe(200);
    const publicBody=await publicDiscussion.json();
    const publicComment=publicBody.rows.find(c=>c.id===commentId);
    expect(publicComment?.body).toContain('verified reader comment');
    expect(publicComment).not.toHaveProperty('author_profile_id');
    expect(publicComment).not.toHaveProperty('risk_flags');

    const report=await discussionPost(reportingReader.session.access_token,'reportComment',{
      commentId,reasonCode:'health_misinformation',details:'CA-01 bounded certification report.'
    });
    expect(statusOf(report)).toBe(200);
    const reportId=(await report.json()).id;

    const healthRestriction=await appPost(health,'restrictReader',{
      readerProfileId:restrictedProfileId,kind:'comment_block',reasonCode:'should_be_denied'
    });
    expect(statusOf(healthRestriction)).toBe(403);

    const restriction=await appPost(publisher,'restrictReader',{
      readerProfileId:restrictedProfileId,kind:'comment_block',reasonCode:'ca01_certification'
    });
    expect(statusOf(restriction)).toBe(200);
    const restrictedSubmit=await discussionPost(restrictedReader.session.access_token,'submitComment',{
      storyId,comment:'Blocked reader attempt.'
    });
    expect(statusOf(restrictedSubmit)).toBe(403);

    // Attachment metadata is story/thread-authorized and direct bucket mutation is denied.
    const prepared=await rpc(rawReporter.headers,'newsroom_prepare_communication_attachment',{
      p_story_internal_comment_id:reporterCommentId,
      p_newsroom_message_id:null,
      p_filename:'ca01-proof.txt',
      p_mime_type:'text/plain',
      p_byte_size:5,
      p_sha256:null
    });
    expect(statusOf(prepared)).toBe(200);
    const preparedBody=await prepared.json();
    const uploadPath=preparedBody.path;
    const directUpload=await fetch(supabaseURL+'/storage/v1/object/newsroom-communications-private/'+uploadPath,{
      method:'POST',
      headers:{apikey:anonKey,Authorization:'Bearer '+rawReporter.session.access_token,'Content-Type':'text/plain'},
      body:'proof'
    });
    expect([400,401,403]).toContain(statusOf(directUpload));
    const readerAttachment=await fetch(supabaseURL+'/rest/v1/newsroom_communication_attachments?id=eq.'+preparedBody.id+'&select=id,storage_path',{headers:authorReader.headers});
    expect(statusOf(readerAttachment)).toBe(200);
    expect(await readerAttachment.json()).toEqual([]);

    // Required moderation notification fanout reaches authorized staff.
    const publisherAfterReport=await appBootstrap(publisher);
    expect((publisherAfterReport.body.data.notifications||[]).some(n=>
      n.category==='moderation'&&n.target_id===reportId
    )).toBeTruthy();

    const evidence={
      github_run_id:process.env.GITHUB_RUN_ID||null,
      tested_at:new Date().toISOString(),
      staging_project_ref:'gcdohgbmqhqwydgaxrcr',
      story_id:storyId,
      internal:{
        reporter_unrelated_denied:statusOf(reporterUnrelated),
        commercial_unrelated_denied:statusOf(commercialUnrelated),
        mention_notification:true,
        assignment_id:assignmentId,
        assignment_thread_id:assignmentThreadId,
        desk_id:deskId,
        desk_thread_id:deskThreadId,
        breaking_thread_id:breakingThreadId,
        announcement_ack:true,
        forged_inbox_insert_denied:statusOf(directNotificationInsert)
      },
      reader:{
        anonymous_denied:statusOf(anonymousSubmit),
        temporary_id_denied:statusOf(tempSubmit),
        published_comment_id:commentId,
        report_id:reportId,
        health_restrict_denied:statusOf(healthRestriction),
        restricted_reader_denied:statusOf(restrictedSubmit),
        newsroom_realtime_predicate_denied:true,
        comment_realtime_predicate_allowed:true
      },
      storage:{
        metadata_id:preparedBody.id,
        direct_bucket_insert_denied:statusOf(directUpload),
        reader_metadata_denied:true
      }
    };
    fs.writeFileSync(process.env.CA01_EVIDENCE_PATH||'/tmp/ca01-live-evidence.json',JSON.stringify(evidence,null,2));
    console.log('CA01_LIVE_EVIDENCE',JSON.stringify(evidence));

    await Promise.all([reporter.ctx.dispose(),editor.ctx.dispose(),commercial.ctx.dispose(),publisher.ctx.dispose(),health.ctx.dispose()]);
    if(localGatewayContext) await localGatewayContext.dispose();
  });
});
