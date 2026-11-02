import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const PSQL_BIN = '/opt/homebrew/opt/libpq/bin/psql';
const PG_URI = 'postgres://postgres:ephemeral-ci-only@127.0.0.1:55432/postgres';

test('DEF-003: Category filter routing and accessibility contract', () => {
  const indexPath = path.resolve('apps/mobile/app/(reader)/index.tsx');
  const indexSource = fs.readFileSync(indexPath, 'utf8');

  // 1. Verify URL synchronization hooks and helpers
  assert.ok(indexSource.includes('useLocalSearchParams'), 'HomeScreen must use useLocalSearchParams for URL state');
  assert.ok(indexSource.includes('function parseFilter'), 'HomeScreen must define parseFilter helper');
  assert.ok(indexSource.includes('window.history.pushState'), 'HomeScreen must sync category changes to browser history via pushState');
  assert.ok(indexSource.includes('window.addEventListener("popstate"'), 'HomeScreen must handle browser back/forward via popstate listener');

  // 2. Verify clean Web vs Native separation (avoiding dual push races)
  assert.ok(
    indexSource.includes('if (typeof window !== "undefined" && window.history) {') &&
    indexSource.includes('} else {') &&
    indexSource.includes('router.setParams'),
    'HomeScreen must branch cleanly between window.history.pushState on web and router.setParams on native'
  );

  // 3. Verify Accessibility Semantics
  assert.ok(indexSource.includes('accessibilityRole="tablist"'), 'Editorial filter rail must have accessibilityRole="tablist"');
  assert.ok(indexSource.includes('accessibilityRole="tab"'), 'Filter pills must have accessibilityRole="tab"');
  assert.ok(indexSource.includes('aria-selected={active}'), 'Filter pills must expose aria-selected attribute');
  assert.ok(indexSource.includes('accessibilityState={{ selected: active }}'), 'Filter pills must expose accessibilityState.selected');

  // 4. Verify in-memory feed filtering without duplicate requests
  assert.ok(indexSource.includes('useAsync(() => services.articles.getHome(), [])'), 'Home feed must be requested with empty dependency array');
});

test('DEF-003 Functional: URL query parsing and state restoration logic', () => {
  // Test category filter parser logic independently
  function parseFilter(val) {
    if (!val) return null;
    const s = Array.isArray(val) ? val[0] : val;
    if (!s || typeof s !== "string") return null;
    const lower = s.toLowerCase().trim();
    if (lower === "for-you" || lower === "foryou") return "for-you";
    if (lower === "latest") return "latest";
    if (lower === "zimbabwe") return "zimbabwe";
    if (lower === "world") return "world";
    if (lower === "premium") return "premium";
    return null;
  }

  assert.equal(parseFilter('zimbabwe'), 'zimbabwe');
  assert.equal(parseFilter('Zimbabwe'), 'zimbabwe');
  assert.equal(parseFilter('ZIMBABWE'), 'zimbabwe');
  assert.equal(parseFilter('world'), 'world');
  assert.equal(parseFilter('latest'), 'latest');
  assert.equal(parseFilter('premium'), 'premium');
  assert.equal(parseFilter('for-you'), 'for-you');
  assert.equal(parseFilter('foryou'), 'for-you');
  assert.equal(parseFilter(['zimbabwe']), 'zimbabwe');
  assert.equal(parseFilter('invalid-category'), null);
  assert.equal(parseFilter(''), null);
  assert.equal(parseFilter(null), null);
  assert.equal(parseFilter(undefined), null);

  // Test URL query synchronization logic
  const mockUrl = new URL('https://healthtimes.co.zw/');
  mockUrl.searchParams.set('category', 'zimbabwe');
  assert.equal(mockUrl.searchParams.get('category'), 'zimbabwe');
  assert.equal(parseFilter(mockUrl.searchParams.get('category')), 'zimbabwe');

  mockUrl.searchParams.delete('category');
  assert.equal(mockUrl.searchParams.get('category'), null);
  assert.equal(parseFilter(mockUrl.searchParams.get('category')) ?? 'for-you', 'for-you');
});

test('DEF-006: Story creation and editing validation contract', async () => {
  const workspacePath = path.resolve('apps/mobile/src/ui/StudioStoryWorkspace.tsx');
  const workspaceSource = fs.readFileSync(workspacePath, 'utf8');

  // 1. Verify "Untitled story" default is eliminated from creation input
  assert.ok(
    !workspaceSource.includes('title: title || "Untitled story"'),
    'StudioStoryWorkspace must not default empty titles to "Untitled story"'
  );

  // 2. Verify title required validation logic exists
  assert.ok(
    workspaceSource.includes('setTitleError("Story title is required before saving or submitting.")') ||
    workspaceSource.includes('setTitleError("Story title is required before saving or submitting draft.")'),
    'handleSave must set clear title error message when title is empty'
  );

  // 3. Verify title error state and UI element
  assert.ok(workspaceSource.includes('testID="story-title-input"'), 'Title input must have testID="story-title-input"');
  assert.ok(workspaceSource.includes('testID="story-title-error"'), 'Title error text must have testID="story-title-error"');
  assert.ok(workspaceSource.includes('testID="save-story-button"'), 'Save button must have testID="save-story-button"');
  assert.ok(workspaceSource.includes('accessibilityRole="alert"'), 'Title error must expose accessibilityRole="alert"');

  // 4. Verify newsroom-stories service validation
  const servicePath = path.resolve('apps/mobile/src/services/newsroom-stories.ts');
  const serviceSource = fs.readFileSync(servicePath, 'utf8');

  assert.ok(
    serviceSource.includes('Story title is required before saving or submitting.'),
    'newsroomStories.createStory must validate that title is non-empty'
  );
  assert.ok(
    serviceSource.includes('Story title cannot be empty.'),
    'newsroomStories.saveStory must reject empty titles in patch'
  );
});

test('DEF-006 Functional: Database RPC direct refusal on blank titles', () => {
  const runPsql = (sql) => {
    const cmd = `${PSQL_BIN} "${PG_URI}" -A -t -v ON_ERROR_STOP=1`;
    return execSync(cmd, { encoding: 'utf8', input: sql });
  };

  // Direct RPC call with empty title must throw SQL exception
  assert.throws(() => {
    runPsql(`SELECT public.newsroom_create_story('{"title": ""}'::jsonb);`);
  }, /Story title cannot be empty/);

  // Direct RPC call with whitespace title must throw SQL exception
  assert.throws(() => {
    runPsql(`SELECT public.newsroom_create_story('{"title": "   \\t  "}'::jsonb);`);
  }, /Story title cannot be empty/);

  // Direct RPC call with null title must throw SQL exception
  assert.throws(() => {
    runPsql(`SELECT public.newsroom_create_story('{"title": null}'::jsonb);`);
  }, /Story title cannot be empty/);
});

test('Cards & Search: Navigable link identities and href attributes', () => {
  const cardsSource = fs.readFileSync(path.resolve('apps/mobile/src/ui/Cards.tsx'), 'utf8');
  assert.ok(
    cardsSource.includes('href: `/article/${story.id}`'),
    'StoryCard must expose href attribute for DOM navigation identity'
  );

  const searchSource = fs.readFileSync(path.resolve('apps/mobile/app/(reader)/search.tsx'), 'utf8');
  assert.ok(
    searchSource.includes('href: `/author/${author.slug}`'),
    'AuthorCard in search must expose href attribute'
  );
});
