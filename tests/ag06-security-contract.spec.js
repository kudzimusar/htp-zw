const { test, expect } = require('@playwright/test');
const fs = require('fs');

const read = path => fs.readFileSync(path, 'utf8');

test.describe('AG-06 security contract', () => {
  test('browser-local Newsroom authority and demo passwords are removed', async () => {
    const js = read('newsroom.js');
    const html = read('newsroom.html');
    expect(js).not.toContain('localStorage');
    expect(js).not.toContain('HealthTimes#Publisher26');
    expect(js).not.toContain('HealthTimes#Editor26');
    expect(js).not.toContain('HealthTimes#Reporter26');
    expect(js).not.toContain('HealthTimes#Commercial26');
    expect(js).toContain("function has(cap){return new Set(currentUser()?.capabilities||[]).has(cap)}");
    expect(html).toContain('name="email"');
    expect(html).toContain('data-recover-account');
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
    const browser = read('newsroom.js');
    expect(api).toContain("'HttpOnly'");
    expect(api).toContain("'SameSite=Lax'");
    expect(api).toContain("'Secure'");
    expect(api).toContain('x-htp-csrf');
    expect(api).toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(browser).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(browser).not.toContain('SUPABASE_ANON_KEY');
    expect(browser).not.toContain('SUPABASE_PUBLISHABLE_KEY');
    expect(api).toContain("service: true");
    expect(api).not.toMatch(/console\.(log|error)\([^\n]*(access|refresh|password)/i);
  });

  test('live AG-06 certification runs UI journeys before destructive session revocation probes', async () => {
    const pkg = JSON.parse(read('package.json'));
    expect(pkg.scripts['test:ag06:live']).toBe('playwright test tests/newsroom-os.spec.js && playwright test tests/ag06-live-security.spec.js');
  });

  test('synthetic certification identities never send outbound Auth email', async () => {
    const workflow = read('.github/workflows/ag06-security.yml');
    const provisioner = read('supabase/functions/ag06-certification-provision/index.ts');
    expect(workflow).not.toContain('probe_email:true');
    expect(provisioner).not.toContain('inviteUserByEmail');
    expect(provisioner).not.toContain('resetPasswordForEmail');
    expect(provisioner).toContain('probe_enabled:false');
    expect(provisioner).toContain('requested_probe_suppressed:body.probe_email === true');
  });

  test('story media and request-changes remain server-authoritative and communication-private domains stay separate', async () => {
    const sql = read('supabase/migrations/20260924072830_ag06_story_media_request_changes.sql');
    const api = read('api/newsroom.js');
    const browser = read('newsroom.js');
    const html = read('newsroom.html');

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
    expect(browser).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(browser).not.toContain('initialMedia=[');
    expect(browser).toContain("api('prepareStoryMedia'");
    expect(browser).toContain("api('requestStoryChanges'");
    expect(html).toContain('data-media-modal');
    expect(html).toContain('data-request-changes-modal');
    expect(html).toContain('Draft uploads stay private');
  });

  test('R1 canonical public author and section authority stays server-bound', async () => {
    const sql = read('supabase/migrations/20260927091500_ag06_canonical_author_section_authority.sql');
    const api = read('api/newsroom.js');
    const browser = read('newsroom.js');
    const html = read('newsroom.html');

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

    expect(browser).not.toContain("section:'Health News'");
    expect(browser).toContain('sectionId:s.primary_section_id');
    expect(browser).toContain('authorId:s.author_id');
    expect(browser).toContain('author_id:story.authorId||null');
    expect(browser).toContain('primary_section_id:story.sectionId||null');
    expect(browser).toContain("['status','owner','editor','factChecker','publicAuthor']");
    expect(browser).toContain('data-public-author-bind');

    expect(html).toContain('<label>Public author<select name="publicAuthor"');
    expect(html).toContain('<label>Section<select name="section"');
    expect(html).not.toContain('<label>Section<input name="section"');
    expect(html).toContain('data-author-modal');

    // Public-author presentation must not turn private staff fields into author data.
    const renderAuthorsStart=browser.indexOf('function renderAuthors()');
    const renderAuthorsEnd=browser.indexOf('function renderTopics()',renderAuthorsStart);
    const authorUi=browser.slice(renderAuthorsStart,renderAuthorsEnd);
    expect(authorUi).not.toContain('.email');
    expect(authorUi).not.toContain('.authUserId');
    expect(authorUi).not.toContain('.mfa');
    expect(authorUi).not.toContain('.phone');
    expect(authorUi).not.toContain('.session');
  });

  test('Newsroom route is isolated from public analytics and hardened with headers', async () => {
    const html = read('newsroom.html');
    const vercelText = read('vercel.json');
    const vercel = JSON.parse(vercelText);
    expect(html).not.toContain('app.js');
    expect(html).not.toMatch(/googletagmanager|gtag\s*\(/i);
    const newsroomHeaders = vercel.headers.find((row) => row.source === '/newsroom.html');
    expect(newsroomHeaders).toBeTruthy();
    const headerMap = Object.fromEntries(newsroomHeaders.headers.map(({ key, value }) => [key, value]));
    expect(headerMap['Content-Security-Policy']).toContain("frame-ancestors 'none'");
    expect(headerMap['X-Content-Type-Options']).toBe('nosniff');
    expect(headerMap['Permissions-Policy']).toContain('camera=()');
    expect(headerMap['Cache-Control']).toBe('no-store, private');
  });
});
