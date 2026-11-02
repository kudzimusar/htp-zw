import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('DEF-003: Category filter routing and accessibility contract', () => {
  const indexPath = path.resolve('apps/mobile/app/(reader)/index.tsx');
  const indexSource = fs.readFileSync(indexPath, 'utf8');

  // 1. Verify URL synchronization hooks and helpers
  assert.ok(indexSource.includes('useLocalSearchParams'), 'HomeScreen must use useLocalSearchParams for URL state');
  assert.ok(indexSource.includes('function parseFilter'), 'HomeScreen must define parseFilter helper');
  assert.ok(indexSource.includes('window.history.pushState'), 'HomeScreen must sync category changes to browser history via pushState');
  assert.ok(indexSource.includes('window.addEventListener("popstate"'), 'HomeScreen must handle browser back/forward via popstate listener');
  assert.ok(indexSource.includes('router.setParams'), 'HomeScreen must update route params via router.setParams');

  // 2. Verify Accessibility Semantics
  assert.ok(indexSource.includes('accessibilityRole="tablist"'), 'Editorial filter rail must have accessibilityRole="tablist"');
  assert.ok(indexSource.includes('accessibilityRole="tab"'), 'Filter pills must have accessibilityRole="tab"');
  assert.ok(indexSource.includes('aria-selected={active}'), 'Filter pills must expose aria-selected attribute');
  assert.ok(indexSource.includes('accessibilityState={{ selected: active }}'), 'Filter pills must expose accessibilityState.selected');

  // 3. Verify in-memory feed filtering without duplicate requests
  assert.ok(indexSource.includes('useAsync(() => services.articles.getHome(), [])'), 'Home feed must be requested with empty dependency array');
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
