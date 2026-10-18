import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadTs } from "./ts-module-loader.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../../..");

const aiServiceModule = loadTs("src/services/newsroom-ai.ts", {
  mocks: {
    "../platform/supabase": {
      getStagingSupabaseClient: () => ({
        from: () => ({}),
        rpc: () => Promise.resolve({ data: null, error: null })
      })
    }
  }
});

const {
  mapAiSuggestion,
  mapAiAssistSession,
  mapAiAssistOverview,
  mapCitationReference,
  mapCitationsDirectory,
  createNewsroomAiService
} = aiServiceModule;

const capabilitiesModule = loadTs("src/security/capabilities.ts");
const {
  hasAiDeskAccess,
  canRunAiAssist,
  hasCitationsDeskAccess,
  canManageCitations,
  emptyAuthorizationSnapshot
} = capabilitiesModule;

const previewDataModule = loadTs("src/preview/newsroomPreviewData.ts", {
  mocks: {
    "expo-constants": { default: { expoConfig: { extra: {} } } }
  }
});
const {
  OWNER_PREVIEW_NAV_ITEMS,
  buildPreviewAiAssistOverview,
  buildPreviewCitationsDirectory
} = previewDataModule;

test("HT-NR-CLOSE Wave E: repository migration count is at least 82", () => {
  const migrationsDir = path.join(REPO_ROOT, "supabase/migrations");
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql"));
  assert.ok(files.length >= 82, `Expected at least 82 migrations, found ${files.length}`);
});

test("HT-NR-CLOSE Wave E: Migration 82 defines AI assist and citations RPCs with strict safety", () => {
  const migPath = path.join(
    REPO_ROOT,
    "supabase/migrations/20261017090000_ht_nr_wave_e_ai_and_citations.sql"
  );
  assert.ok(fs.existsSync(migPath), "Migration 82 file must exist");
  const sql = fs.readFileSync(migPath, "utf8");

  // Table creation & RLS
  assert.ok(sql.includes("create table if not exists public.newsroom_ai_assist_sessions"), "Must create ai assist sessions table");
  assert.ok(sql.includes("alter table public.newsroom_ai_assist_sessions enable row level security;"), "Must enable RLS on newsroom_ai_assist_sessions");
  assert.ok(sql.includes("create policy ag06_citation_references_read"), "Must define citations read policy");
  assert.ok(sql.includes("create policy ag06_citation_references_write"), "Must define citations write policy");
  assert.ok(sql.includes("create policy ag06_ai_assist_sessions_read"), "Must define ai sessions read policy");

  // Functions defined
  assert.ok(sql.includes("newsroom_get_ai_assist_overview"), "Must define newsroom_get_ai_assist_overview");
  assert.ok(sql.includes("newsroom_run_ai_assist"), "Must define newsroom_run_ai_assist");
  assert.ok(sql.includes("newsroom_get_citations_directory"), "Must define newsroom_get_citations_directory");
  assert.ok(sql.includes("newsroom_record_citation"), "Must define newsroom_record_citation");
  assert.ok(sql.includes("newsroom_update_citation_status"), "Must define newsroom_update_citation_status");

  // Strict safety & audit logging
  assert.ok(sql.includes("ai_assist_requested"), "Must log ai assist to audit logs");
  assert.ok(sql.includes("citation_recorded"), "Must log citation create to audit logs");
  assert.ok(sql.includes("citation_status_updated"), "Must log citation update to audit logs");

  // Function grants & revokes
  assert.ok(sql.includes("revoke all on function public.newsroom_get_ai_assist_overview() from public, anon;"));
  assert.ok(sql.includes("grant execute on function public.newsroom_get_ai_assist_overview() to authenticated, service_role;"));
  assert.ok(sql.includes("revoke all on function public.newsroom_run_ai_assist(uuid, text, text, text) from public, anon;"));
  assert.ok(sql.includes("grant execute on function public.newsroom_run_ai_assist(uuid, text, text, text) to authenticated, service_role;"));
  assert.ok(sql.includes("revoke all on function public.newsroom_get_citations_directory(text, text, int, int) from public, anon;"));
  assert.ok(sql.includes("grant execute on function public.newsroom_get_citations_directory(text, text, int, int) to authenticated, service_role;"));
});

test("HT-NR-CLOSE Wave E: Edge Function newsroom-ai-assist exists and has safety protections", () => {
  const edgePath = path.join(
    REPO_ROOT,
    "supabase/functions/newsroom-ai-assist/index.ts"
  );
  assert.ok(fs.existsSync(edgePath), "Edge function newsroom-ai-assist must exist");
  const edgeCode = fs.readFileSync(edgePath, "utf8");

  assert.ok(edgeCode.includes("headline_alternatives"), "Supports headline_alternatives");
  assert.ok(edgeCode.includes("seo_alternatives"), "Supports seo_alternatives");
  assert.ok(edgeCode.includes("editorial_guidance"), "Supports editorial_guidance");
  assert.ok(edgeCode.includes("ZERO publishing authority"), "Explicit zero publishing authority");
});

test("HT-NR-CLOSE Wave E: mapAiSuggestion maps raw suggestion accurately", () => {
  const raw = {
    type: "headline",
    text: "Breakthrough Malaria Vaccine Rollout Reaches Over 50,000 Children in Manicaland",
    rationale: "High clarity, incorporates health policy context and geographic relevance."
  };
  const mapped = mapAiSuggestion(raw);
  assert.equal(mapped.type, "headline");
  assert.equal(mapped.text, raw.text);
  assert.equal(mapped.rationale, raw.rationale);
});

test("HT-NR-CLOSE Wave E: mapAiAssistSession maps session and respects immutability and safety flags", () => {
  const raw = {
    id: "sess-1",
    story_id: "story-100",
    story_title: "Manicaland Vaccine Report",
    task_type: "headline_alternatives",
    input_prompt: "Suggest headlines for malaria report",
    input_context: "Context text",
    suggestions: [
      { type: "headline", text: "Malaria Campaign Expands", rationale: "Concise" }
    ],
    provider: "gemini",
    provider_status: "provider_configured",
    status: "completed",
    created_by: "staff-1",
    created_at: "2026-10-18T00:00:00Z"
  };
  const mapped = mapAiAssistSession(raw);
  assert.equal(mapped.id, "sess-1");
  assert.equal(mapped.storyId, "story-100");
  assert.equal(mapped.taskType, "headline_alternatives");
  assert.equal(mapped.provider, "gemini");
  assert.equal(mapped.providerStatus, "provider_configured");
  assert.equal(mapped.status, "completed");
  assert.equal(mapped.suggestions.length, 1);
  assert.equal(mapped.suggestions[0].text, "Malaria Campaign Expands");
  assert.equal(mapped.safetyFlags.canPublish, false);
  assert.equal(mapped.safetyFlags.humanReviewRequired, true);
});

test("HT-NR-CLOSE Wave E: mapCitationReference correctly maps verification status and type", () => {
  const raw = {
    id: "cite-1",
    story_id: "story-200",
    story_slug: "zimbabwe-cholera-response-2026",
    story_title: "Zimbabwe Cholera Response 2026",
    reference_type: "academic",
    source_name: "The Lancet Global Health",
    source_url: "https://doi.org/10.1016/S2214-109X(26)00123-4",
    title: "Community oral cholera vaccination effectiveness in rural Zimbabwe",
    country: "ZW",
    status: "verified",
    created_at: "2026-10-15T09:30:00Z"
  };
  const mapped = mapCitationReference(raw);
  assert.equal(mapped.id, "cite-1");
  assert.equal(mapped.storyId, "story-200");
  assert.equal(mapped.storySlug, "zimbabwe-cholera-response-2026");
  assert.equal(mapped.referenceType, "academic");
  assert.equal(mapped.sourceName, "The Lancet Global Health");
  assert.equal(mapped.status, "verified");
  assert.equal(mapped.country, "ZW");
});

test("HT-NR-CLOSE Wave E: capability checks enforce strict editorial boundaries", () => {
  const reporterAuth = {
    ...emptyAuthorizationSnapshot("authorized", "test"),
    status: "authorized",
    source: "server",
    capabilities: ["story.create", "story.edit_own", "story.submit"]
  };
  const editorAuth = {
    ...emptyAuthorizationSnapshot("authorized", "test"),
    status: "authorized",
    source: "server",
    capabilities: ["story.edit_all", "story.publish", "analytics.view"]
  };
  const guestAuth = emptyAuthorizationSnapshot("anonymous", "guest");

  // AI Desk Access
  assert.equal(hasAiDeskAccess(reporterAuth), true);
  assert.equal(hasAiDeskAccess(editorAuth), true);
  assert.equal(hasAiDeskAccess(guestAuth), false);

  assert.equal(canRunAiAssist(reporterAuth), true);
  assert.equal(canRunAiAssist(editorAuth), true);
  assert.equal(canRunAiAssist(guestAuth), false);

  // Citations Desk Access & Management
  assert.equal(hasCitationsDeskAccess(reporterAuth), true);
  assert.equal(hasCitationsDeskAccess(editorAuth), true);
  assert.equal(hasCitationsDeskAccess(guestAuth), false);

  assert.equal(canManageCitations(reporterAuth), false); // Reporters cannot approve/reject citations, only edit_all, publish, or analytics.view
  assert.equal(canManageCitations(editorAuth), true);
  assert.equal(canManageCitations(guestAuth), false);
});

test("HT-NR-CLOSE Wave E: preview integration registers at least 23 modules including ai-desk", () => {
  assert.ok(OWNER_PREVIEW_NAV_ITEMS.length >= 23);
  const aiItem = OWNER_PREVIEW_NAV_ITEMS.find((item) => item.key === "ai-desk");
  assert.ok(aiItem, "ai-desk must be present in preview navigation");
  assert.equal(aiItem.label, "AI Desk & Citations");

  const overview = buildPreviewAiAssistOverview();
  assert.ok(overview.supportedTasks.length >= 5);
  assert.equal(overview.safetyPolicy.canPublish, false);
  assert.equal(overview.safetyPolicy.humanReviewRequired, true);
  assert.ok(overview.recentSessions.length > 0);

  const citations = buildPreviewCitationsDirectory();
  assert.ok(citations.citations.length >= 3);
  assert.equal(citations.metrics.totalCitations, 24);
  assert.equal(citations.metrics.verifiedCount, 16);
});

test("HT-NR-CLOSE Wave E: createNewsroomAiService handles mock calls without error", async () => {
  const mockClient = {
    rpc: async (fn, args) => {
      if (fn === "newsroom_get_ai_assist_overview") {
        return {
          data: {
            provider_status: "provider_configured",
            provider_model: "gemini-1.5-pro",
            safety_policy: {
              principle: "Strict editorial safety"
            },
            supported_tasks: [
              { id: "headline_alternatives", name: "Headline Alternatives", description: "Generate headlines" }
            ],
            metrics: {
              total_sessions: 12,
              task_counts: { headline_alternatives: 8 }
            },
            recent_sessions: []
          },
          error: null
        };
      }
      if (fn === "newsroom_run_ai_assist") {
        return {
          data: {
            id: "s-1",
            story_id: args.p_story_id,
            task_type: args.p_task_type,
            provider: "gemini-1.5-pro",
            suggestions: [{ type: "headline", text: "Headline Test", rationale: "Clear" }],
            status: "completed"
          },
          error: null
        };
      }
      if (fn === "newsroom_get_citations_directory") {
        return {
          data: {
            metrics: {
              total_citations: 5,
              verified_count: 4,
              unverified_count: 1,
              flagged_count: 0,
              rejected_count: 0,
              academic_count: 2
            },
            citations: []
          },
          error: null
        };
      }
      if (fn === "newsroom_record_citation") {
        return {
          data: {
            citation_id: "c-new",
            status: "unverified"
          },
          error: null
        };
      }
      if (fn === "newsroom_update_citation_status") {
        return {
          data: {
            citation_id: args.p_citation_id,
            status: args.p_status
          },
          error: null
        };
      }
      return { data: null, error: null };
    }
  };

  const service = createNewsroomAiService(mockClient);
  const overview = await service.getOverview();
  assert.equal(overview.providerStatus, "provider_configured");
  assert.equal(overview.safetyPolicy.canPublish, false);

  const runResult = await service.runAssist({
    storyId: "st-1",
    taskType: "headline_alternatives",
    inputPrompt: "Test"
  });
  assert.equal(runResult.taskType, "headline_alternatives");
  assert.equal(runResult.suggestions.length, 1);

  const citations = await service.getCitationsDirectory();
  assert.equal(citations.metrics.totalCitations, 5);

  const newCite = await service.recordCitation({
    storyId: "st-1",
    referenceType: "academic",
    sourceName: "Lancet",
    title: "Study Title"
  });
  assert.equal(newCite.citationId, "c-new");
  assert.equal(newCite.status, "unverified");

  const updatedCite = await service.updateCitationStatus("c-new", "verified");
  assert.equal(updatedCite.status, "verified");
  assert.equal(updatedCite.citationId, "c-new");
});
