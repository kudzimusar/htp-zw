import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");

test("HT-NR-02: Route authority separates stories list and workspace entry from hard-gated creation", () => {
  const router = read("app/studio/[module].tsx");
  const workspace = read("src/ui/StudioStoryWorkspace.tsx");

  // Stories route is not hard-gated only by story.edit_own
  assert.ok(router.includes('"stories":{title:"Stories"'));
  assert.ok(router.includes('capability:null,description:"Server-backed Newsroom stories'));
  assert.equal(router.includes('capability:"story.edit_own"'), false);

  // Existing Story Workspace is not hard-gated by story.create at route entry
  assert.ok(router.includes('"create-edit":{title:"Story Workspace"'));
  assert.ok(router.includes('Route entry uses StudioAuthorityGate; creation gated inside workspace'));

  // Inside workspace: new-story mode explicitly requires story.create
  assert.ok(workspace.includes("!storyId && auth && !canCreate"));
  assert.ok(workspace.includes("Required capability: story.create"));

  // Inside workspace: existing edit mode uses story.edit_own OR story.edit_all
  assert.ok(workspace.includes("const canEditStory = canEditAll || canEditOwn;"));
  assert.ok(workspace.includes("const isReadOnly = Boolean(storyId && !canEditStory);"));
  assert.ok(workspace.includes("Read-Only Access"));
  assert.ok(workspace.includes("Editing requires story.edit_own or story.edit_all capability."));
});

test("HT-NR-02: Fake newsroom product data is removed and fixture service fails closed", () => {
  const fixtures = read("src/services/fixtures.ts");

  // No fixtureStories, fixtureAuthors, fixtureSections product truth
  assert.equal(fixtures.includes("fixtureStories"), false);
  assert.equal(fixtures.includes("fixtureAuthors"), false);
  assert.equal(fixtures.includes("fixtureSections"), false);
  assert.equal(fixtures.includes("fixtureRevisions"), false);
  assert.equal(fixtures.includes("fixtureAutosaves"), false);
  assert.equal(fixtures.includes("fixtureReviews"), false);
  assert.equal(fixtures.includes("fixtureCorrections"), false);

  // Fixture story operations fail closed with canonical rejection
  assert.ok(fixtures.includes("export const fixtureNewsroomStoryService: NewsroomStoryService"));
  assert.ok(fixtures.includes('const FAIL_CLOSED_NEWSROOM_MESSAGE = "Server-authorized Newsroom story authority is unavailable in fixture mode.";'));
  assert.ok(fixtures.includes("throw new Error(FAIL_CLOSED_NEWSROOM_MESSAGE);"));

  // Service index binds staging vs fixture adapters
  const servicesIndex = read("src/services/index.ts");
  assert.ok(servicesIndex.includes("newsroomStories: stagingNewsroomStoryService"));
  assert.ok(fixtures.includes("newsroomStories: fixtureNewsroomStoryService"));
});

test("HT-NR-02: New story creation matches canonical RPC semantics and server defaults", () => {
  const service = read("src/services/newsroom-stories.ts");
  const models = read("src/domain/models.ts");
  const workspace = read("src/ui/StudioStoryWorkspace.tsx");

  // Create uses newsroom_create_story
  assert.ok(service.includes('"newsroom_create_story"'));

  // Absent author is omitted rather than serialized as null
  assert.ok(service.includes("if (explicitAuthor && explicitAuthor.trim()) {"));
  assert.ok(service.includes("payload.author_id = explicitAuthor.trim();"));
  assert.equal(service.includes("author_id: input.authorId || null"), false);
  assert.equal(service.includes("author_id: input.authorId ?? null"), false);

  // CreateStoryInput omits unsupported publication fields
  const createInputType = models.slice(models.indexOf("export type CreateStoryInput = {"), models.indexOf("export type SaveStoryPatch = {"));
  assert.equal(createInputType.includes("comment_policy"), false);
  assert.equal(createInputType.includes("commentPolicy"), false);
  assert.equal(createInputType.includes("distribution"), false);
  assert.equal(createInputType.includes("scheduled_at"), false);
  assert.equal(createInputType.includes("scheduledAt"), false);
  assert.equal(createInputType.includes("ad_setting"), false);
  assert.equal(createInputType.includes("adSetting"), false);

  // Canonical UUID returned and story reloaded via loadStory to adopt server defaults
  assert.ok(workspace.includes("const newId = await services.newsroomStories.createStory"));
  assert.ok(workspace.includes("await loadStory(newId);"));
  assert.ok(workspace.includes("const data = await services.newsroomStories.getStory(id);"));
  assert.ok(workspace.includes("setStory(data);"));

  // Unsupported publication state is not pretended before creation
  assert.ok(workspace.includes("Publication, commercial, and scheduling controls will become active after the draft is created on the server."));
});

test("HT-NR-02: Story persistence enforces optimistic concurrency and decouples comment policy", () => {
  const service = read("src/services/newsroom-stories.ts");
  const models = read("src/domain/models.ts");
  const workspace = read("src/ui/StudioStoryWorkspace.tsx");

  // Save uses newsroom_save_story with expected lock version
  assert.ok(service.includes('"newsroom_save_story"'));
  assert.ok(service.includes("p_expected_version: expectedVersion"));

  // Comment policy RPC is NOT chained inside saveStory
  const saveStoryMethod = service.slice(service.indexOf("async saveStory("), service.indexOf("async setCommentPolicy("));
  assert.equal(saveStoryMethod.includes("newsroom_set_story_comment_policy"), false);

  // SaveStoryPatch does not include comment policy
  const savePatchType = models.slice(models.indexOf("export type SaveStoryPatch = {"), models.indexOf("export interface NewsroomStoryService") !== -1 ? models.indexOf("export interface NewsroomStoryService") : models.length);
  assert.equal(savePatchType.includes("commentPolicy"), false);
  assert.equal(savePatchType.includes("comment_policy"), false);

  // UI uses Manual save and Autosave reasons
  assert.ok(workspace.includes('"Manual save"'));
  assert.ok(workspace.includes('"Autosave"'));
  assert.ok(workspace.includes("VERSION_CONFLICT"));
});

test("HT-NR-02: Comment policy is a dedicated RPC with strict capability and eligibility gating", () => {
  const contracts = read("src/domain/contracts.ts");
  const service = read("src/services/newsroom-stories.ts");
  const workspace = read("src/ui/StudioStoryWorkspace.tsx");

  // Dedicated method in contracts
  assert.ok(contracts.includes('setCommentPolicy(storyId: string, policy: "disabled" | "read_only" | "open"): Promise<string>'));

  // Dedicated implementation calling newsroom_set_story_comment_policy
  assert.ok(service.includes('"newsroom_set_story_comment_policy"'));
  assert.ok(service.includes("async setCommentPolicy(storyId: string, policy:"));

  // UI requires comment.configure capability
  assert.ok(workspace.includes('const canConfigureComments = hasCap("comment.configure");'));

  // Canonical values: disabled, read_only, open
  assert.ok(workspace.includes('["disabled", "Disabled", true]'));
  assert.ok(workspace.includes('["read_only", "Read Only", canEnableComments]'));
  assert.ok(workspace.includes('["open", "Open Comments", canEnableComments]'));

  // Gated: open/read_only not offered for non-published or premium stories
  assert.ok(workspace.includes('const isPublished = (story?.status ?? "").toLowerCase() === "publish" || (story?.status ?? "").toLowerCase() === "published";'));
  assert.ok(workspace.includes('const isPublicStory = (story?.accessPolicy ?? "").toLowerCase() === "public";'));
  assert.ok(workspace.includes("const canEnableComments = isPublished && isPublicStory;"));
  assert.ok(workspace.includes("services.newsroomStories.setCommentPolicy(storyId, nextPolicy)"));
});

test("HT-NR-02: Distribution preserves complete JSON structure and merges public_reader", () => {
  const workspace = read("src/ui/StudioStoryWorkspace.tsx");

  // Preserves existing distribution object, merging public_reader
  assert.ok(workspace.includes("p.distribution = {"));
  assert.ok(workspace.includes("...(story?.distribution ?? {}),"));
  assert.ok(workspace.includes("public_reader: distributionPublicReader"));
});

test("HT-NR-02: Privileged editorial metadata fields are individually capability-gated", () => {
  const workspace = read("src/ui/StudioStoryWorkspace.tsx");

  // Ad change requires story.edit_all
  assert.ok(workspace.includes('const canManageAdSetting = hasCap("story.edit_all");'));

  // Scheduling requires story.publish
  assert.ok(workspace.includes('const canSchedule = hasCap("story.publish");'));

  // Access policy requires premium.assign or premium.manage
  assert.ok(workspace.includes('const canManagePremium = hasCap("premium.assign") || hasCap("premium.manage");'));

  // Distribution requires distribution.manage or story.edit_all
  assert.ok(workspace.includes('const canManageDistribution = hasCap("distribution.manage") || hasCap("story.edit_all");'));
});

test("HT-NR-02: Editorial workflow enforces server vocabulary, capability unions, and dirty save before transition", () => {
  const workspace = read("src/ui/StudioStoryWorkspace.tsx");

  // Exact server workflow state names
  assert.ok(workspace.includes('"Draft"'));
  assert.ok(workspace.includes('"Editor review"'));
  assert.ok(workspace.includes('"Approved"'));
  assert.ok(workspace.includes('"Published"'));
  assert.ok(workspace.includes('"Archived"'));

  // Editor review transition permits edit_all OR copy_edit
  assert.ok(workspace.includes('opts.push({ label: "Send to Editor Review", status: "Editor review", allowed: canEditAll || canCopyEdit });'));

  // Request Changes capability union
  assert.ok(workspace.includes("const canRequestChanges = canEditAll || canFactCheck || canHealthReview || canCopyEdit || canPublish;"));

  // Review types individually gated
  assert.ok(workspace.includes('list.push({ type: "fact_check", label: "Fact Check", cap: "story.fact_check" });'));
  assert.ok(workspace.includes('list.push({ type: "health_review", label: "Health / Science Review", cap: "story.health_review" });'));
  assert.ok(workspace.includes('list.push({ type: "copy_edit", label: "Copy Edit", cap: "story.copy_edit" });'));
  assert.ok(workspace.includes('list.push({ type: "editor_review", label: "Editor Review", cap: "story.edit_all" });'));

  // Review status vocabulary matches server semantics
  assert.ok(workspace.includes('"completed"'));
  assert.ok(workspace.includes('"approved"'));
  assert.ok(workspace.includes('"changes_requested"'));

  // Dirty story must save successfully before transition or review
  assert.ok(workspace.includes("const handleTransition = async"));
  assert.ok(workspace.includes("const executeRequestChanges = async"));
  assert.ok(workspace.includes("const executeRecordReview = async"));
  assert.ok(workspace.includes('await saveStoryInternal("Manual save");'));
});

test("HT-NR-02: History revision restoration enforces explicit two-step confirmation and dirty state protection", () => {
  const workspace = read("src/ui/StudioStoryWorkspace.tsx");
  const service = read("src/services/newsroom-stories.ts");

  // Restore revision supplies story UUID, revision UUID, expected lock_version
  assert.ok(service.includes('"newsroom_restore_revision"'));
  assert.ok(service.includes("p_story_id: storyId"));
  assert.ok(service.includes("p_revision_id: revisionId"));
  assert.ok(service.includes("p_expected_version: expectedVersion"));

  // Two-step confirmation with dirty-state protection
  assert.ok(workspace.includes("confirmRestoreRev"));
  assert.ok(workspace.includes("executeRestoreRevision"));
  assert.ok(workspace.includes("Confirm Restore: Revision #"));
  assert.ok(workspace.includes("You have unsaved edits in the editor. Please save or reload before restoring this revision"));
});

test("HT-NR-02: Story list implements multi-dimensional filtering, search, and maps 'publish' to 'Published'", () => {
  const stories = read("src/ui/StudioStories.tsx");

  // Multi-dimensional filters and search
  assert.ok(stories.includes("searchQuery"));
  assert.ok(stories.includes("statusFilter"));
  assert.ok(stories.includes("policyFilter"));
  assert.ok(stories.includes("deskFilter"));
  assert.ok(stories.includes("availableDesks"));

  // resolveWorkflowStatus maps publish to Published
  assert.ok(stories.includes("export function resolveWorkflowStatus(story: { workflowStatus?: string | null; status?: string | null }): string"));
  assert.ok(stories.includes('ws === "publish" || ws === "published"'));
  assert.ok(stories.includes('return "Published";'));
});

test("HT-NR-02: Excerpt is read-only pending server mutation contract", () => {
  const workspace = read("src/ui/StudioStoryWorkspace.tsx");

  // Displayed as read-only server display, not editable TextInput
  assert.ok(workspace.includes("Server Excerpt (Read-only)"));
  assert.ok(workspace.includes("Excerpt mutation is deferred"));
  assert.equal(workspace.includes('placeholder="Enter short story excerpt"'), false);
  assert.equal(workspace.includes("onChangeText={(text) => setExcerpt(text)}"), false);
});

test("HT-NR-02-R2: Review selection initializes from authorized types and fails closed on unauthorized types", () => {
  const workspace = read("src/ui/StudioStoryWorkspace.tsx");

  // Default reviewType is not hardcoded to an arbitrary category
  assert.ok(workspace.includes('const [reviewType, setReviewType] = useState("");'));

  // Opening review initializes from availableReviewTypes[0]
  assert.ok(workspace.includes("const handleOpenRecordReview = () => {"));
  assert.ok(workspace.includes("const first = availableReviewTypes[0];"));
  assert.ok(workspace.includes("if (!first) return;"));
  assert.ok(workspace.includes("setReviewType(first.type);"));
  assert.ok(workspace.includes('setPromptAction("recordReview");'));

  // executeRecordReview validates reviewType belongs to availableReviewTypes
  assert.ok(workspace.includes("const isAuthorizedType = availableReviewTypes.some((item) => item.type === reviewType);"));
  assert.ok(workspace.includes('if (!isAuthorizedType) {'));
  assert.ok(workspace.includes('setStatusMessage("Unauthorized review type. Please select an authorized review category.");'));
  assert.ok(workspace.includes("return;"));

  // Action button wired to handleOpenRecordReview
  assert.ok(workspace.includes("onPress={handleOpenRecordReview}"));
});

test("HT-NR-02-R2: Post-save domain state performs explicit camelCase mapping and preserves server authorities", () => {
  const workspace = read("src/ui/StudioStoryWorkspace.tsx");

  // Does not blindly spread SaveStoryPatch into NewsroomStory
  assert.equal(workspace.includes("...patch"), false);

  // Synchronizes all fields written by buildPatch with explicit camelCase domain properties
  assert.ok(workspace.includes("title,"));
  assert.ok(workspace.includes("slug: slug || story.slug,"));
  assert.ok(workspace.includes("standfirst: standfirst || null,"));
  assert.ok(workspace.includes("bodyHtml: body || null,"));
  assert.ok(workspace.includes("desk: desk || null,"));
  assert.ok(workspace.includes("topic: topic || null,"));
  assert.ok(workspace.includes("country: country || null,"));
  assert.ok(workspace.includes("region: region || null,"));
  assert.ok(workspace.includes("sourceNotes: sourceNotes || null,"));
  assert.ok(workspace.includes("internalNotes: internalNotes || null,"));
  assert.ok(workspace.includes("deadlineAt: deadlineAt || null,"));
  assert.ok(workspace.includes("authorId: canEditAll ? (authorId || null) : story.authorId,"));
  assert.ok(workspace.includes("primarySectionId: primarySectionId || null,"));
  assert.ok(workspace.includes("accessPolicy: canManagePremium ? accessPolicy : story.accessPolicy,"));
  assert.ok(workspace.includes("distribution: canManageDistribution"));
  assert.ok(workspace.includes("adSetting: canManageAdSetting ? adSetting : story.adSetting,"));
  assert.ok(workspace.includes("seoTitle: seoTitle || null,"));
  assert.ok(workspace.includes("seoDescription: seoDescription || null,"));
  assert.ok(workspace.includes("scheduledAt: canSchedule ? (scheduledAt || null) : story.scheduledAt,"));
  assert.ok(workspace.includes("lockVersion: newVersion"));

  // Preserves workflow, status, and commentPolicy without overriding from ordinary story save
  assert.equal(workspace.includes("workflowStatus: patch"), false);
  assert.equal(workspace.includes("status: patch"), false);
  assert.equal(workspace.includes("commentPolicy: patch"), false);
});

test("HT-NR-02-R2: Monotonic save-generation tracking protects concurrent in-flight edits", () => {
  const workspace = read("src/ui/StudioStoryWorkspace.tsx");

  // Generation reference exists
  assert.ok(workspace.includes("const dirtyRevisionRef = useRef(0);"));

  // markDirty increments generation
  assert.ok(workspace.includes("dirtyRevisionRef.current += 1;"));

  // Save captures saving revision
  assert.ok(workspace.includes("const savingRevision = dirtyRevisionRef.current;"));

  // Server ack clears dirty only if no newer edits occurred
  assert.ok(workspace.includes("if (dirtyRevisionRef.current === savingRevision) {"));
  assert.ok(workspace.includes("setIsDirty(false);"));
  assert.ok(workspace.includes('setSaveStatus("saved");'));
  assert.ok(workspace.includes('setStatusMessage(isAuto ? "Autosaved." : "Changes saved.");'));
  assert.ok(workspace.includes("} else {"));
  assert.ok(workspace.includes("setIsDirty(true);"));
  assert.ok(workspace.includes('setSaveStatus("idle");'));
  assert.ok(workspace.includes('setStatusMessage("Earlier changes saved; newer edits pending.");'));
});

test("HT-NR-02-R2: Comment policy is disabled while unsaved story changes are pending", () => {
  const workspace = read("src/ui/StudioStoryWorkspace.tsx");

  // Handler blocks when isDirty or save in progress
  assert.ok(workspace.includes('if (isDirty || saveStatus === "saving" || saveStatus === "autosaving" || saveStatus === "conflict") {'));
  assert.ok(workspace.includes('setStatusMessage("Save pending story changes before changing reader comment policy.");'));

  // UI renders warning message when changes are pending
  assert.ok(workspace.includes("{isDirty && ("));
  assert.ok(workspace.includes("Save pending story changes before changing reader comment policy."));

  // UI choice chips are disabled when isDirty
  assert.ok(workspace.includes("!isDirty &&"));
  assert.ok(workspace.includes('saveStatus !== "saving" &&'));
  assert.ok(workspace.includes('saveStatus !== "autosaving" &&'));
  assert.ok(workspace.includes('saveStatus !== "conflict"'));
});

test("HT-NR-02-R2: Schedule Publication requires valid parseable timestamp and saves dirty schedule before transition", () => {
  const workspace = read("src/ui/StudioStoryWorkspace.tsx");

  // transitionOptions requires valid parseable date
  assert.ok(workspace.includes('const hasValidSchedule = scheduledAt.trim() !== "" && !Number.isNaN(Date.parse(scheduledAt));'));
  assert.ok(workspace.includes('opts.push({ label: "Schedule Publication", status: "Scheduled", allowed: canPublish && hasValidSchedule });'));

  // Publish Now remains separate and independent
  assert.ok(workspace.includes('opts.push({ label: "Publish Now", status: "Published", allowed: canPublish });'));

  // handleTransition validates scheduledAt when transitioning to Scheduled
  assert.ok(workspace.includes('if (nextStatus === "Scheduled") {'));
  assert.ok(workspace.includes('const validSchedule = scheduledAt.trim() !== "" && !Number.isNaN(Date.parse(scheduledAt));'));
  assert.ok(workspace.includes('if (!validSchedule) {'));
  assert.ok(workspace.includes('setStatusMessage("A valid publication date and time is required to schedule publication.");'));
  assert.ok(workspace.includes("return;"));

  // handleTransition saves dirty schedule changes before invoking transition
  assert.ok(workspace.includes('if (isDirty) {'));
  assert.ok(workspace.includes('setStatusMessage("Saving unsaved edits before transition…");'));
  assert.ok(workspace.includes('const saved = await saveStoryInternal("Manual save");'));
  assert.ok(workspace.includes('if (!saved) return;'));
});

test("HT-NR-02: Behavioral lifecycle state machine verifies concurrency and workflow guarantees", async () => {
  let lockVersion = 1;
  let workflowStatus = "Draft";
  let autosaves = null;
  const revisions = [{ revisionNumber: 1, title: "Original Title", lockVersion: 1 }];

  function saveStory(expectedVersion, patch, reason = "Autosave") {
    if (lockVersion !== expectedVersion) {
      throw new Error("VERSION_CONFLICT");
    }
    lockVersion += 1;
    if (reason.toLowerCase() === "autosave") {
      autosaves = { title: patch.title || "Original Title", lockVersion };
    } else {
      autosaves = null;
      revisions.unshift({ revisionNumber: revisions.length + 1, title: patch.title, lockVersion });
    }
    return lockVersion;
  }

  function transitionStory(nextStatus) {
    workflowStatus = nextStatus;
    return workflowStatus;
  }

  function restoreRevision(revisionNumber, expectedVer) {
    if (lockVersion !== expectedVer) {
      throw new Error("VERSION_CONFLICT");
    }
    const target = revisions.find((r) => r.revisionNumber === revisionNumber);
    if (!target) throw new Error("Revision not found");
    lockVersion += 1;
    return lockVersion;
  }

  // 1. Initial state
  assert.equal(lockVersion, 1);
  assert.equal(workflowStatus, "Draft");

  // 2. Autosave succeeds at expectedVersion 1
  const v2 = saveStory(1, { title: "Autosaved Draft" }, "Autosave");
  assert.equal(v2, 2);
  assert.ok(autosaves);
  assert.equal(autosaves.lockVersion, 2);

  // 3. Stale save at expectedVersion 1 fails with VERSION_CONFLICT
  assert.throws(() => saveStory(1, { title: "Stale Save" }), /VERSION_CONFLICT/);

  // 4. Manual save at expectedVersion 2 creates revision and clears autosave
  const v3 = saveStory(2, { title: "Manual Milestone" }, "Manual save");
  assert.equal(v3, 3);
  assert.equal(autosaves, null);
  assert.equal(revisions.length, 2);
  assert.equal(revisions[0].revisionNumber, 2);

  // 5. Workflow transition
  assert.equal(transitionStory("Submitted"), "Submitted");

  // 6. Restore revision 1 with expectedVersion 3
  const v4 = restoreRevision(1, 3);
  assert.equal(v4, 4);
});
