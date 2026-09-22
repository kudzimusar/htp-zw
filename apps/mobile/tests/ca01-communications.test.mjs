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

test("reader discussion adapter fails closed without a canonical story UUID",()=>{
  const communications=read("src/services/communications.ts");
  assert.ok(communications.includes("canonicalStoryPattern"));
  assert.ok(communications.includes("Canonical HealthTimes story identity is required"));
  assert.ok(communications.includes('"reader_submit_story_comment"'));
  assert.ok(communications.includes('"reader_public_story_comments"'));
  assert.equal(communications.includes("story_internal_comments"),false);
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

test("current NM staging authorization remains fail closed until server projection is integrated",()=>{
  const security=read("src/services/security.ts");
  assert.ok(security.includes('"server-policy-unavailable"'));
  assert.ok(security.includes("Authenticated client state cannot create Studio authority."));
  assert.equal(security.includes("user.role"),false);
});

test("Reader article discussion is visibly unavailable on non-canonical stories",()=>{
  const article=read("app/article/[id].tsx");
  const panel=read("src/ui/ReaderDiscussion.tsx");
  assert.ok(article.includes("story.canonicalStoryId"));
  assert.ok(panel.includes("source-parity or fixture story"));
  assert.ok(panel.includes("services.readerDiscussion"));
  assert.equal(panel.includes("story_internal_comments"),false);
});
