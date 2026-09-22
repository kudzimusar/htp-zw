import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const read=(path)=>readFileSync(join(root,path),"utf8");

test("CA-01 Native uses the canonical AG-06 capability vocabulary",()=>{
  const capabilities=read("src/security/capabilities.ts");
  assert.ok(capabilities.includes('"security.view_sessions"'));
  assert.ok(capabilities.includes('"security.revoke_session"'));
  assert.ok(capabilities.includes('"security.view_audit"'));
  assert.ok(capabilities.includes('"communication.desk.manage"'));
  assert.ok(capabilities.includes('"communication.breaking.manage"'));
  assert.ok(capabilities.includes('"communication.announce"'));
  assert.ok(capabilities.includes('"comment.moderate"'));
  assert.equal(capabilities.includes('"security.sessions.view"'),false);
  assert.equal(capabilities.includes('"security.sessions.revoke"'),false);
  assert.equal(capabilities.includes('"security.audit.view"'),false);
});

test("fixture and WordPress source-parity stories cannot become comment authority",()=>{
  const models=read("src/domain/models.ts");
  const fixture=read("src/fixtures/content.ts");
  const snapshot=read("src/source-parity/snapshot.ts");
  const parity=read("src/services/source-parity.ts");
  assert.ok(models.includes("canonicalStoryId: string | null"));
  assert.ok(fixture.match(/canonicalStoryId: null/g)?.length >= 3);
  assert.ok(snapshot.includes("canonicalStoryId:null"));
  assert.ok(parity.includes("canonicalStoryId:null"));
  assert.equal(parity.includes("canonicalStoryId:post."),false);
});

test("reader discussion adapter fails closed without a canonical story UUID and stays separate from staff discussion",()=>{
  const communications=read("src/services/communications.ts");
  const readerSection=communications.slice(
    communications.indexOf("stagingReaderDiscussionService"),
    communications.indexOf("function inboxItem")
  );
  assert.ok(readerSection.includes("canonicalStoryPattern"));
  assert.ok(communications.includes("Canonical HealthTimes story identity is required"));
  assert.ok(readerSection.includes('"reader_submit_story_comment"'));
  assert.ok(readerSection.includes('"reader_public_story_comments"'));
  assert.equal(readerSection.includes("story_internal_comments"),false);
});

test("Studio communication routes are gated by server authority or server capability",()=>{
  const shell=read("src/ui/Studio.tsx");
  const module=read("app/studio/[module].tsx");
  assert.ok(shell.includes("StudioAuthorityGate"));
  assert.ok(shell.includes('snapshot?.status==="authorized"'));
  assert.ok(shell.includes('snapshot.source==="server"'));
  assert.ok(module.includes('"inbox"'));
  assert.ok(module.includes('"desks"'));
  assert.ok(module.includes('"breaking"'));
  assert.ok(module.includes('"moderation"'));
  assert.ok(module.includes('capability:"comment.moderate"'));
  assert.equal(module.includes("user.role"),false);
});

test("Native staff authority comes only from the certified AG-06/CA-01 server projection",()=>{
  const security=read("src/services/security.ts");
  assert.ok(security.includes('"newsroom_register_session"'));
  assert.ok(security.includes('"newsroom_current_context"'));
  assert.ok(security.includes('"authenticated-no-staff-authority"'));
  assert.ok(security.includes('"server-policy-unavailable"'));
  assert.ok(security.includes('source:"server"'));
  assert.ok(security.includes("HEALTH_TIMES_CAPABILITIES"));
  assert.equal(security.includes("user.role"),false);
  assert.equal(/role\s*===|role\s*==/.test(security),false);
});

test("Reader article discussion is visibly unavailable on non-canonical stories",()=>{
  const article=read("app/article/[id].tsx");
  const panel=read("src/ui/ReaderDiscussion.tsx");
  assert.ok(article.includes("story.canonicalStoryId"));
  assert.ok(panel.includes("source-parity or fixture story"));
  assert.ok(panel.includes("services.readerDiscussion"));
  assert.equal(panel.includes("story_internal_comments"),false);
});


test("Native staff communication adapter mirrors CA-01 specialized server records instead of a universal messages API",()=>{
  const contracts=read("src/domain/contracts.ts");
  const communications=read("src/services/communications.ts");
  for(const method of [
    "listAssignments","listStoryDiscussion","addStoryComment","editStoryComment","setStoryCommentResolved",
    "listDesks","listThreads","createThread","listThreadMessages","postThreadMessage",
    "markThreadRead","listAnnouncements"
  ]) assert.ok(contracts.includes(method), "missing Newsroom communication method: "+method);
  assert.ok(communications.includes('"story_assignments"'));
  assert.ok(communications.includes('"story_internal_comments"'));
  assert.ok(communications.includes('"newsroom_threads"'));
  assert.ok(communications.includes('"newsroom_messages"'));
  assert.ok(communications.includes('"newsroom_announcements"'));
  assert.ok(communications.includes('"newsroom_add_internal_comment"'));
  assert.equal(communications.includes('"universal_messages"'),false);
});

test("Native moderation is a dedicated service and remains capability-gated",()=>{
  const contracts=read("src/domain/contracts.ts");
  const communications=read("src/services/communications.ts");
  const module=read("app/studio/[module].tsx");
  const panels=read("src/ui/StudioCommunications.tsx");
  assert.ok(contracts.includes("CommentModerationService"));
  assert.ok(contracts.includes("commentModeration: CommentModerationService"));
  for(const rpc of [
    "newsroom_list_comment_moderation_queue",
    "newsroom_moderate_story_comment",
    "newsroom_set_story_comment_policy",
    "newsroom_restrict_reader_comments",
    "newsroom_lift_reader_comment_restriction"
  ]) assert.ok(communications.includes('"'+rpc+'"'), "missing moderation RPC: "+rpc);
  assert.ok(module.includes('capability:"comment.moderate"'));
  assert.ok(panels.includes("services.commentModeration"));
});

test("Desks and Breaking Native panels are rendered only inside Studio server-authority gates",()=>{
  const module=read("app/studio/[module].tsx");
  const panels=read("src/ui/StudioCommunications.tsx");
  assert.ok(module.includes("<StudioAuthorityGate>"));
  assert.ok(module.includes("<StudioDesksPanel"));
  assert.ok(module.includes("<StudioDeskThreadsPanel"));
  assert.ok(module.includes("<StudioBreakingPanel"));
  assert.ok(module.includes("<StudioThreadPanel"));
  assert.ok(panels.includes("services.newsroomCommunication"));
  assert.equal(panels.includes("user.role"),false);
});


test("Native assignment discussion reuses story_assignments and typed assignment threads",()=>{
  const module=read("app/studio/[module].tsx");
  const panels=read("src/ui/StudioCommunications.tsx");
  assert.ok(module.includes('"assignments"'));
  assert.ok(module.includes("StudioAssignmentDiscussionPanel"));
  assert.ok(panels.includes("listAssignments"));
  assert.ok(panels.includes('threadType:"assignment"'));
  assert.ok(panels.includes("assignmentId"));
  assert.equal(panels.includes("createAssignment"),false);
});
