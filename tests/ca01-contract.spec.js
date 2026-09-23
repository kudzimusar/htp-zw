const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname,'..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');

test.describe('CA-01 implementation contract',()=>{
  test('forward-only schema keeps private and reader communication domains separate',()=>{
    const internal=read('supabase/migrations/20260922054411_ca01_internal_schema_capabilities.sql');
    const reader=read('supabase/migrations/20260922054428_ca01_reader_discussion_moderation.sql');
    expect(internal).toContain('story_internal_comment_revisions');
    expect(internal).toContain('newsroom_threads');
    expect(internal).toContain('newsroom_notifications');
    expect(reader).toContain('reader_comment_profiles');
    expect(reader).toContain('story_comments');
    expect(reader).toContain("add column if not exists comment_policy text not null default 'disabled'");
    expect(reader).not.toMatch(/alter table public\.story_internal_comments[\s\S]*story_comments/i);
  });

  test('canonical CA-01 capability vocabulary is singular',()=>{
    const internal=read('supabase/migrations/20260922054411_ca01_internal_schema_capabilities.sql');
    for(const capability of [
      'communication.desk.manage','communication.breaking.manage','communication.announce',
      'comment.configure','comment.moderate','comment.restrict','comment.audit'
    ]) expect(internal).toContain(capability);
    const runtime=read('newsroom.js');
    expect(runtime).not.toContain('security.sessions.view');
    expect(runtime).not.toContain('security.sessions.revoke');
    expect(runtime).not.toContain('security.audit.view');
  });

  test('reader comment writes are authenticated RPC-only and public projection is minimized',()=>{
    const reader=read('supabase/migrations/20260922054428_ca01_reader_discussion_moderation.sql');
    expect(reader).toContain('revoke all on public.story_comments from public,anon,authenticated');
    expect(reader).toContain('grant execute on function public.reader_submit_story_comment(uuid,text,uuid) to authenticated');
    expect(reader).not.toContain('grant execute on function public.reader_submit_story_comment(uuid,text,uuid) to anon');
    expect(reader).toContain('reader_public_story_comments');
    expect(reader).toMatch(/grant execute on function public\.reader_public_story_comments\([^;]+\) to anon,authenticated/);
  });

  test('private attachment boundary is isolated and server-signed',()=>{
    const storage=read('supabase/migrations/20260922054424_ca01_communication_storage.sql');
    const api=read('api/newsroom.js');
    expect(storage).toContain("newsroom-communications-private");
    expect(storage).toContain("public=false");
    expect(storage).toContain('newsroom_can_read_communication_attachment');
    expect(storage).not.toMatch(/create policy[\s\S]+for insert to authenticated[\s\S]+newsroom-communications-private/i);
    expect(api).toContain('/storage/v1/object/upload/sign/');
    expect(api).toContain("service: true");
    expect(api).toContain("attachmentDownload");
  });

  test('Realtime is private policy transport with minimal server-side event hints',()=>{
    const realtime=read('supabase/migrations/20260922054449_ca01_realtime_authorization.sql');
    const emission=read('supabase/migrations/20260922070256_ca01_realtime_event_emission.sql');
    expect(realtime).toContain('newsroom_can_join_realtime_topic');
    expect(realtime).toContain('reader_can_join_comment_topic');
    expect(realtime).toContain("realtime.messages.extension='broadcast'");
    expect(realtime).toContain("realtime.messages.extension='presence'");
    expect(realtime).not.toMatch(/create policy\s+ca01_[^\n]*broadcast[^\n]*\n[\s\S]{0,160}for insert/i);
    expect(emission).toContain('realtime.send');
    expect(emission).toContain("'newsroom:story:'");
    expect(emission).toContain("'newsroom:thread:'");
    expect(emission).toContain("'newsroom:inbox:'");
    expect(emission).toContain("'reader:story-comments:'");
    expect(emission).not.toMatch(/jsonb_build_object\([\s\S]{0,400}'body'/i);
  });

  test('Newsroom Inbox uses durable server rows, not fixture notifications',()=>{
    const api=read('api/newsroom.js');
    const client=read('newsroom.js');
    expect(api).toContain("rpc('newsroom_list_inbox'");
    expect(api).toContain("rpc('newsroom_inbox_summary'");
    expect(client).toContain("data.notifications||[]");
    expect(client).not.toContain('Story submitted for review</strong><p>Community Prevention Follow-up');
  });

  test('reader discussion API fails closed without an authenticated reader token',()=>{
    const discussion=read('api/discussion.js');
    expect(discussion).toContain("Authenticated reader session required.");
    expect(discussion).toContain("Canonical storyId is required.");
    expect(discussion).toContain("reader_submit_story_comment");
    expect(discussion).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
  });
});
