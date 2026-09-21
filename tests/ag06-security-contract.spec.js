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
    const sql = read('supabase/migrations/20260922080100_ag06_newsroom_auth_rbac.sql');
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

  test('protected functions are not left executable by anonymous/public roles', async () => {
    const sql = read('supabase/migrations/20260922080100_ag06_newsroom_auth_rbac.sql');
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

  test('Newsroom route is isolated from public analytics and hardened with headers', async () => {
    const html = read('newsroom.html');
    const vercel = read('vercel.json');
    expect(html).not.toContain('app.js');
    expect(html).not.toMatch(/googletagmanager|gtag\s*\(/i);
    expect(vercel).toContain('"source": "/newsroom.html"');
    expect(vercel).toContain("frame-ancestors 'none'");
    expect(vercel).toContain('"X-Content-Type-Options"');
    expect(vercel).toContain('"Permissions-Policy"');
    expect(vercel).toContain('"Cache-Control", "value": "no-store, private"');
  });
});
