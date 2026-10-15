const { test, expect } = require('@playwright/test');
const fs = require('fs');

const read = path => fs.readFileSync(path, 'utf8');

test.describe('AG-06 security contract', () => {
  test('canonical client authority is server-derived, fails closed, and validates server capabilities', async () => {
    const secService = read('apps/mobile/src/services/security.ts');
    const capModule = read('apps/mobile/src/security/capabilities.ts');

    // Server-derived authorization
    expect(secService).toContain('newsroom_register_session');
    expect(secService).toContain('newsroom_current_context');
    expect(secService).toContain('source:"server"');

    // Fail-closed authority
    expect(secService).toContain('emptyAuthorizationSnapshot(');
    expect(secService).toContain('"anonymous"');
    expect(secService).toContain('"authenticated-no-staff-authority"');
    expect(secService).toContain('"server-policy-unavailable"');
    expect(secService).not.toContain('HealthTimes#Publisher26');
    expect(secService).not.toContain('HealthTimes#Editor26');
    expect(secService).not.toContain('HealthTimes#Reporter26');
    expect(secService).not.toContain('HealthTimes#Commercial26');

    // Server capability validation
    expect(capModule).toContain('hasServerCapability');
    expect(capModule).toContain('snapshot.status === "authorized"');
    expect(capModule).toContain('snapshot.source === "server"');
    expect(capModule).toContain('snapshot.capabilities.includes(capability)');
  });

  test('RLS and RPC contract enforce editorial and staff authority server-side', async () => {
    const sql = read('supabase/migrations/20260922020254_ag06_newsroom_auth_rbac.sql');
    expect(sql).toContain('create or replace function public.newsroom_has_capability');
    expect(sql).toContain('create or replace function public.newsroom_session_authorized');
    expect(sql).toContain('create or replace function public.newsroom_protect_story_authority_fields');
    expect(sql).toContain('create or replace function public.newsroom_protect_staff_authority_fields');
    expect(sql).toContain('Self role changes are not permitted');
    expect(sql).toContain("Workflow transition is not authorized");
    expect(sql).toContain("drop policy if exists ag06_stories_insert on public.stories");
    expect(sql).not.toContain('create policy ag06_stories_insert');
    expect(sql).not.toContain("('Reporter / Journalist','story.publish')");
    expect(sql).not.toContain("('Commercial Manager','story.publish')");
    expect(sql).not.toContain("('Commercial Manager','story.edit_all')");
    expect(sql).toContain("('Reporter / Journalist','story.edit_own')");
    expect(sql).toContain("('Reporter / Journalist','story.submit')");
    expect(sql).toContain("('Commercial Manager','ads.view')");
    expect(sql).toContain("('Commercial Manager','subscriber.view')");
    expect(sql).toContain('revoke all on public.story_internal_comments from anon');
    expect(sql).toContain('revoke all on public.audit_logs from anon');
    expect(sql).toContain('newsroom_public_published_stories');
  });

  test('public story listing cannot bypass the native Reader release marker', async () => {
    const hardening = read('supabase/migrations/20260925230247_ag06_public_story_release_boundary_hardening.sql');
    expect(hardening).toContain('create or replace function public.newsroom_public_published_stories');
    expect(hardening).toContain('s.legacy_source_id is null');
    expect(hardening).toContain("coalesce((s.distribution->>'public_reader')::boolean,false)=true");
    expect(hardening).toContain("lower(s.access_policy)='public'");
    expect(hardening).toContain('revoke execute on function public.newsroom_public_published_stories(text) from public');
    expect(hardening).toContain('grant execute on function public.newsroom_public_published_stories(text) to anon, authenticated, service_role');
  });

  test('protected functions are not left executable by anonymous/public roles', async () => {
    const sql = read('supabase/migrations/20260922020254_ag06_newsroom_auth_rbac.sql');
    const hardening = read('supabase/migrations/20260922021521_ag06_security_advisor_hardening.sql');
    for (const signature of [
      'newsroom_create_story(jsonb)',
      'newsroom_save_story(uuid,integer,jsonb,text)',
      'newsroom_transition_story(uuid,text,text)',
      'newsroom_create_invitation(text,text,text,text,text,uuid)',
      'newsroom_change_staff_role(uuid,text)',
      'newsroom_revoke_staff(uuid,text)',
      'newsroom_revoke_session(uuid,text)'
    ]) {
      expect(sql).toContain(`revoke execute on function public.${signature} from public, anon`);
      expect(sql).toContain(`grant execute on function public.${signature} to authenticated`);
    }
    for (const helper of [
      'newsroom_can_read_story(uuid)',
      'newsroom_can_edit_story(uuid)',
      'newsroom_current_staff_id_basic()',
      'newsroom_has_capability(text)',
      'newsroom_session_authorized()'
    ]) {
      expect(hardening).toContain(`revoke execute on function public.${helper} from public, anon`);
      expect(hardening).toContain(`grant execute on function public.${helper} to authenticated`);
    }
    expect(hardening).toContain('revoke execute on function public.newsroom_sync_staff_from_auth() from public, anon, authenticated');
    expect(hardening).toContain('alter function public.newsroom_safe_editor_text(text) set search_path = public');
  });

  test('server API protects credentials and request integrity', async () => {
    const api = read('api/newsroom.js');
    const clientSec = read('apps/mobile/src/services/security.ts');
    expect(api).toContain("'HttpOnly'");
    expect(api).toContain("'SameSite=Lax'");
    expect(api).toContain("'Secure'");
    expect(api).toContain('x-htp-csrf');
    expect(api).toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(clientSec).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(clientSec).not.toContain('service_role');
    expect(api).toContain("service: true");
    expect(api).not.toMatch(/console\.(log|error)\([^\n]*(access|refresh|password)/i);
  });

  test('live AG-06 certification runs UI journeys before destructive session revocation probes', async () => {
    const pkg = JSON.parse(read('package.json'));
    expect(pkg.scripts['test:ag06:live']).toBeDefined();
    expect(pkg.scripts['test:ag06:live']).toContain('playwright test');
    expect(pkg.scripts['test:ag06:live']).toContain('tests/ag06-live-security.spec.js');
  });

  test('temporary certification provisioners and workflows are excluded from canonical kernel', async () => {
    expect(fs.existsSync('supabase/functions/ag06-certification-provision')).toBe(false);
    expect(fs.existsSync('.github/workflows/ag06-security.yml')).toBe(false);
    const clientSec = read('apps/mobile/src/services/security.ts');
    expect(clientSec).not.toContain('ag06-certification-provision');
    expect(clientSec).not.toContain('probe_email');
  });

  test('story media and request-changes remain server-authoritative and communication-private domains stay separate', async () => {
    const sql = read('supabase/migrations/20260924072830_ag06_story_media_request_changes.sql');
    const api = read('api/newsroom.js');
    const clientSec = read('apps/mobile/src/services/security.ts');

    expect(sql).toContain('create or replace function public.newsroom_prepare_story_media');
    expect(sql).toContain('create or replace function public.newsroom_finalize_story_media');
    expect(sql).toContain('create or replace function public.newsroom_attach_story_media');
    expect(sql).toContain('create or replace function public.newsroom_request_story_changes');
    expect(sql).toContain("'newsroom-private'");
    expect(sql).not.toContain("insert into public.newsroom_communication_attachments");
    expect(sql).not.toContain("insert into public.communication_attachments");
    expect(sql).not.toMatch(/storage_bucket\s*[=:]\s*['"]migrated-media['"]/i);
    expect(sql).toContain("'story.changes_requested'");
    expect(sql).toContain("'changes_requested'");
    expect(sql).toContain("'Draft'");
    expect(sql).toContain('newsroom_notifications');
    expect(sql).toContain('revoke all on public.media_assets from anon, authenticated');
    expect(sql).toContain("bucket_id='newsroom-private'");
    expect(sql).toContain('newsroom_can_read_media(ma.id)');

    expect(api).toContain("if (action === 'prepareStoryMedia')");
    expect(api).toContain("if (action === 'finalizeStoryMedia')");
    expect(api).toContain("if (action === 'requestStoryChanges')");
    expect(api).toContain('/storage/v1');
    expect(clientSec).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
  });

  test('R1 canonical public author and section authority stays server-bound', async () => {
    const sql = read('supabase/migrations/20260927091500_ag06_canonical_author_section_authority.sql');
    const api = read('api/newsroom.js');

    expect(sql).toContain('add column if not exists public_author_id uuid');
    expect(sql).toContain('references public.authors(id) on delete set null');
    expect(sql).not.toContain('create table if not exists public.native_authors');
    expect(sql).not.toContain('create table if not exists public.newsroom_authors');
    expect(sql).not.toContain('create table if not exists public.native_sections');

    expect(sql).toContain("lower(regexp_replace(trim(display_name),'\\s+',' ','g'))");
    expect(sql).toContain('staff_unique');
    expect(sql).toContain('author_unique');
    expect(sql).toContain('sp.public_author_id is null');
    expect(sql).not.toMatch(/split_part\s*\(\s*(email|sp\.email)/i);
    expect(sql).toContain('No email/handle/desk/role/fuzzy inference');
    expect(sql).not.toMatch(/levenshtein|similarity\s*\(|soundex/i);

    expect(sql).toContain('create or replace function public.newsroom_create_public_author');
    expect(sql).toContain('create or replace function public.newsroom_bind_staff_public_author');
    expect(sql).toContain("newsroom_has_capability('story.edit_all')");
    expect(sql).toContain('wordpress_source_id');
    expect(sql).toContain("'Public author slug already exists; bind explicitly instead of mutating the existing author'");

    expect(sql).toContain('select public_author_id into v_default_author');
    expect(sql).toContain("'Reporter cannot assign another public author'");
    expect(sql).toContain("'story.edit_all required to change canonical public author'");
    expect(sql).toContain('author_id=v_author');
    expect(sql).toContain('primary_section_id=v_section');
    expect(sql).toContain("'Canonical section does not exist'");
    expect(sql).toContain('v_owner := v_old.owner_staff_id');
    expect(sql).not.toMatch(/v_owner\s*:=.*public_author_id/i);

    expect(api).toContain("rpc('newsroom_list_public_authors'");
    expect(api).toContain("rpc('newsroom_list_sections'");
    expect(api).toContain("if (action === 'createPublicAuthor')");
    expect(api).toContain("if (action === 'bindStaffPublicAuthor')");
    expect(api).toContain('public_author_id');
  });

  test('R2 native public context is minimized, released-only and separate from AG-05', async () => {
    const sql = read('supabase/migrations/20260927093000_ag06_native_public_context.sql');
    const ag05 = read('supabase/migrations/20260922030247_ag05_context_routes.sql');

    expect(sql).toContain('create or replace function public.newsroom_public_context_document(p_path text)');
    expect(sql).toContain("'^/category/[^/]+/$'");
    expect(sql).toContain("'^/author/[^/]+/$'");
    expect(sql).not.toContain("'^/tag/");
    expect(sql).toContain('st.legacy_source_id is null');
    expect(sql).toContain("lower(st.status) in ('publish','published')");
    expect(sql).toContain("coalesce((st.distribution->>'public_reader')::boolean,false)=true");
    expect(sql).toContain('(st.published_at is null or st.published_at<=now())');
    expect(sql).toContain('st.primary_section_id=v_id');
    expect(sql).toContain('st.author_id=v_id');
    expect(sql).toContain('order by st.published_at desc nulls last,st.created_at desc,st.id');
    expect(sql).toContain('limit 50');

    for (const key of [
      "'story_id'","'title'","'canonical_url'","'published_at'","'modified_at'",
      "'author_name'","'author_slug'","'section_name'","'section_slug'","'access_policy'"
    ]) expect(sql).toContain(key);

    expect(sql).not.toContain("'body_html'");
    expect(sql).not.toContain("'source_notes'");
    expect(sql).not.toContain('staff_profiles');
    expect(sql).not.toContain('newsroom_sessions');
    expect(sql).not.toContain('auth.users');
    expect(sql).toContain("'source_type','native-story-context'");
    expect(sql).toContain("'handling','native_cms'");
    expect(sql).toContain('revoke execute on function public.newsroom_public_context_document(text) from public');
    expect(sql).toContain('grant execute on function public.newsroom_public_context_document(text) to anon, authenticated, service_role');

    // R2 adds a separate AG-06 native capability; it does not rewrite AG-05 context authority.
    expect(ag05).toContain('create or replace function public.ag05_public_context_document');
    expect(sql).not.toContain('create or replace function public.ag05_public_context_document');
    expect(sql).not.toContain('update public.legacy_sources');
  });

  test('R3 inline body binding uses stable same-story media markers and fails closed', async () => {
    const sql = read('supabase/migrations/20260927094500_ag06_inline_body_binding.sql');

    expect(sql).toContain(`'<figure data-healthtimes-media-id="'||p_media_id::text||'"></figure>'`);
    expect(sql).toContain('create or replace function public.newsroom_validate_inline_body_bindings');
    expect(sql).toContain('if v_story.legacy_source_id is not null then');
    expect(sql).toContain("lower(v_body) like '%newsroom-private%'");
    expect(sql).toContain("lower(v_body) like '%/storage/v1/object/sign/%'");
    expect(sql).toContain("like '%data-healthtimes-media-id%'");
    expect(sql).toContain("mu.story_id=p_story_id");
    expect(sql).toContain("mu.media_id=v_media_id");
    expect(sql).toContain("mu.usage_type='inline'");
    expect(sql).toContain("ma.mime_type like 'image/%'");
    expect(sql).toContain("'Inline media marker is not bound to same-story inline image authority'");
    expect(sql).toContain('revoke execute on function public.newsroom_validate_inline_body_bindings(uuid) from public,anon,authenticated');
  });

  test('R4 public inline promotion generalizes the accepted featured pipeline without Premium leakage', async () => {
    const sql = read('supabase/migrations/20260927101500_ag06_public_inline_media_promotion.sql');
    const api = read('api/newsroom.js');

    expect(sql).toContain('create function public.newsroom_story_media_promotion_plan');
    expect(sql).toContain('usage_type text');
    expect(sql).toContain("mu.usage_type='featured'");
    expect(sql).toContain("mu.usage_type='inline'");
    expect(sql).toContain("lower(coalesce(v_story.access_policy,'public'))='public'");
    expect(sql).toContain('ma.id=any(v_inline_ids)');
    expect(sql).toContain('public.newsroom_validate_inline_body_bindings(p_story_id)');
    expect(sql).toContain("'Premium inline media is not eligible for anonymous public promotion'");
    expect(sql).toContain("'Bound inline Newsroom media must be promoted before public publication'");
    expect(sql).toContain("'usage_type',mu.usage_type");
    expect(sql).toContain("public_storage_bucket='newsroom-public'");
    expect(sql).toContain("v_expected_prefix text := 'story-media/'||p_story_id::text||'/'||p_media_id::text||'/'");
    expect(sql).toContain("v_expected_key := v_expected_prefix||v_hash||'/'||v_asset.filename");
    expect(sql).toContain("'Promoted media checksum does not match private custody'");
    expect(sql).toContain("'Public media key does not match immutable promotion identity'");
    expect(sql).toContain("status='public_staged'");
    expect(sql).toContain("status='published'");
    expect(sql).toContain('newsroom_clear_staged_story_media');

    expect(sql).toContain("'inline_media',case when lower(coalesce(s.access_policy,'public'))='public'");
    expect(sql).toContain("'media_id',ma.id");
    expect(sql).toContain("'usage_type','inline'");
    expect(sql).toContain("'marker',public.newsroom_inline_media_marker(ma.id)");
    expect(sql).toContain("'public_storage_object',ma.public_storage_key");
    expect(sql).toContain("'checksum',ma.checksum");
    expect(sql).toContain("'alt_text',ma.alt_text");
    expect(sql).toContain("'caption',ma.caption");
    expect(sql).toContain("'credit',ma.credit");
    expect(sql).toContain("'body_html',case when lower(s.access_policy)='public' then s.body_html else null end");
    expect(sql).toContain("else '[]'::jsonb end");
    expect(sql).not.toContain("'private_key',");
    expect(sql).not.toContain("'uploaded_by_staff_id',");
    expect(sql).not.toContain("'source_provenance',");

    expect(api).toContain('async function promoteReaderBoundStoryMedia');
    expect(api).not.toContain('async function promoteFeaturedStoryMedia');
    expect(api).toContain("usageType:media.usage_type");
    expect(api).toContain("staged=await promoteReaderBoundStoryMedia(storyId,token)");
    expect(api).toContain('rollbackStagedStoryMedia(storyId,staged,token)');
  });

  test('R4 certification cleanup preserves protected author authority', async () => {
    const sql = read('supabase/migrations/20260927120000_ag06_certification_cleanup_service_role_claim.sql');
    const perf = read('supabase/migrations/20260927121500_ag06_audit_feed_performance.sql');
    const activeCleanup = read('supabase/migrations/20260927123000_ag06_certification_active_binding_cleanup.sql');

    expect(sql).toContain('create or replace function public.newsroom_clear_certification_public_author_bindings(p_profile_ids uuid[])');
    expect(sql).toContain("auth.role() is distinct from 'service_role'");
    expect(sql).toContain("sp.beat='AG-06 staging certification'");
    expect(sql).toContain("sp.email ~ '^ag06-(reporter|editor|commercial|publisher)-[0-9]+-[0-9]+@healthtimes[.]co[.]zw$'");
    expect(sql).toContain("perform set_config('app.newsroom_rpc','1',true)");
    expect(sql).toContain('revoke execute on function public.newsroom_clear_certification_public_author_bindings(uuid[]) from public, anon, authenticated');
    expect(sql).toContain('grant execute on function public.newsroom_clear_certification_public_author_bindings(uuid[]) to service_role');
    expect(sql).not.toContain("if current_setting('request.jwt.claim.role'");

    expect(perf).toContain('create index if not exists idx_audit_logs_created_at_desc');
    expect(perf).toContain('on public.audit_logs(created_at desc,id desc)');

    expect(activeCleanup).toContain("auth.role() is distinct from 'service_role'");
    expect(activeCleanup).toContain("sp.beat='AG-06 staging certification'");
    expect(activeCleanup).toContain("sp.email ~ '^ag06-(reporter|editor|commercial|publisher)-[0-9]+-[0-9]+@healthtimes[.]co[.]zw$'");
    expect(activeCleanup).not.toContain("lower(sp.status)='revoked'");
    expect(activeCleanup).toContain('revoke execute on function public.newsroom_clear_certification_public_author_bindings(uuid[])');
    expect(activeCleanup).toContain('grant execute on function public.newsroom_clear_certification_public_author_bindings(uuid[])');

    // Temporary provisioner edge function is excluded from canonical runtime
    expect(fs.existsSync('supabase/functions/ag06-certification-provision/index.ts')).toBe(false);
    const api = read('api/newsroom.js');
    expect(api).not.toContain('ag06-certification-provision');
  });

  test('deployment serving configuration is outside Newsroom kernel contract scope', async () => {
    // Serving/hosting configuration (such as vercel.json security headers) was explicitly
    // excluded from HT-NR-01 kernel recustody to prevent regression of canonical Reader/Mobile architecture.
    expect(fs.existsSync('vercel.json')).toBe(false);
  });
});
