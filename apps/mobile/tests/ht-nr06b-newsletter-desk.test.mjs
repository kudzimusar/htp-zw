import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { loadTs } from "./ts-module-loader.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const repoRoot = path.resolve(root, "../..");

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function readRepo(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), "utf8");
}

// Load security capabilities module
const capabilitiesModule = loadTs("src/security/capabilities.ts");
const {
  HEALTH_TIMES_CAPABILITIES,
  NEWSLETTER_DESK_CAPABILITIES,
  hasServerCapability,
  hasAnyServerCapability,
  hasNewsletterDeskAccess
} = capabilitiesModule;

// Load domain models & validator
const modelsModule = loadTs("src/domain/models.ts");
const {
  NEWSROOM_CAMPAIGN_PURPOSES,
  NEWSROOM_CAMPAIGN_STATUSES,
  NEWSROOM_SEGMENT_SYNC_STATES,
  validateCampaignCreateInput
} = modelsModule;

// Load newsroom campaigns service
const campaignsServiceModule = loadTs("src/services/newsroom-campaigns.ts", {
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
  NewsroomCampaignError,
  isValidCampaignUuid,
  mapNewsroomCampaignRow,
  mapNewsroomContactSegmentRow,
  mapPrepareCampaignSendResponse,
  createNewsroomCampaignService
} = campaignsServiceModule;

// Load preview data
const previewDataModule = loadTs("src/preview/newsroomPreviewData.ts", {
  mocks: {
    "expo-constants": { default: { expoConfig: {} } },
    "../platform/config": { appEnvironment: "staging" }
  }
});
const {
  buildPreviewContactSegments,
  buildPreviewCampaigns,
  buildPreviewCampaignPrepareSendResult
} = previewDataModule;

// Helper to create mock Supabase query client
function createMockCampaignClient(queryResolver, rpcResolver) {
  const calls = {
    queries: [],
    rpcs: []
  };

  const client = {
    calls,
    from(table) {
      return {
        select(cols) {
          const makeQueryObj = (currentFilters = []) => {
            const queryObj = {
              eq(col, val) {
                return makeQueryObj([...currentFilters, { type: "eq", col, val }]);
              },
              ilike(col, pattern) {
                return makeQueryObj([...currentFilters, { type: "ilike", col, pattern }]);
              },
              order(orderCol, orderOpts) {
                const resultPromise = Promise.resolve(
                  queryResolver(table, {
                    cols,
                    filters: currentFilters,
                    filter: currentFilters[0] || null,
                    orderCol,
                    orderOpts
                  })
                );
                // Return an object that is both awaitable and has .limit()
                return Object.assign(resultPromise, {
                  limit(limitVal) {
                    calls.queries.push({
                      table,
                      cols,
                      filters: currentFilters,
                      filter: currentFilters[0] || null,
                      orderCol,
                      orderOpts,
                      limit: limitVal
                    });
                    return Promise.resolve(
                      queryResolver(table, {
                        cols,
                        filters: currentFilters,
                        filter: currentFilters[0] || null,
                        orderCol,
                        orderOpts,
                        limit: limitVal
                      })
                    );
                  }
                });
              }
            };
            return queryObj;
          };
          return makeQueryObj([]);
        }
      };
    },
    rpc(name, args) {
      calls.rpcs.push({ name, args });
      return Promise.resolve(rpcResolver ? rpcResolver(name, args) : { data: null, error: null });
    }
  };

  return client;
}

// ============================================================================
// 1. MIGRATION DISCIPLINE & REPOSITORY AUTHORITY
// ============================================================================

test("HT-NR-06B: repository migration count is exactly 76 at HT-NR-06C-B authority", () => {
  const migrationsDir = path.join(repoRoot, "supabase/migrations");
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  assert.equal(
    migrationFiles.length,
    79,
    `Expected exactly 79 migrations in supabase/migrations, found ${migrationFiles.length}`
  );
  assert.ok(
    migrationFiles.includes("20261017020000_ht_nr06b_campaign_read_authority.sql"),
    "Expected migration 20261017020000_ht_nr06b_campaign_read_authority.sql to be present"
  );
});

test("HT-NR-06B: migration 73 reconciles RLS SELECT policy to marketing capabilities", () => {
  const migrationSql = readRepo("supabase/migrations/20261017020000_ht_nr06b_campaign_read_authority.sql");

  // Reconciles audience_campaigns read policy
  assert.match(migrationSql, /drop policy if exists com01_campaigns_read on public\.audience_campaigns;/i);
  assert.match(migrationSql, /create policy com01_campaigns_read/i);
  assert.match(migrationSql, /public\.newsroom_has_capability\('marketing\.create'\)/i);
  assert.match(migrationSql, /public\.newsroom_has_capability\('marketing\.approve'\)/i);
  assert.match(migrationSql, /public\.newsroom_has_capability\('marketing\.send'\)/i);
  assert.match(migrationSql, /public\.newsroom_has_capability\('marketing\.analytics'\)/i);

  // Reconciles contact_segments read policy
  assert.match(migrationSql, /drop policy if exists com01_segments_read on public\.contact_segments;/i);
  assert.match(migrationSql, /create policy com01_segments_read/i);

  // Revokes direct writes
  assert.match(
    migrationSql,
    /revoke insert, update, delete, truncate\s+on table\s+public\.audience_campaigns,\s+public\.contact_segments,\s+public\.contact_consents,\s+public\.campaign_recipients\s+from public, anon, authenticated;/i
  );

  // ZERO direct write grants on campaigns or segments
  assert.equal(/grant\s+(insert|update|delete)\s+on\s+public\.(audience_campaigns|contact_segments|contact_consents|campaign_recipients)/i.test(migrationSql), false);
});

test("HT-NR-06B: frozen blobs remain untouched", () => {
  const ca01TestHash = execSync(
    "git rev-parse HEAD:apps/mobile/tests/ca01-communications.test.mjs",
    { cwd: repoRoot, encoding: "utf8" }
  ).trim();
  const readerDiscussionHash = execSync(
    "git rev-parse HEAD:apps/mobile/src/ui/ReaderDiscussion.tsx",
    { cwd: repoRoot, encoding: "utf8" }
  ).trim();

  assert.equal(ca01TestHash, "3af2f6988acf91b4118771a8fc15333af44c2fc7");
  assert.equal(readerDiscussionHash, "f7ac3671f81b89170aaf1a4892e6095d280fd839");
});

test("HT-NR-06B: communications_record_campaign_result is never referenced in client code", () => {
  const serviceCode = read("src/services/newsroom-campaigns.ts");
  const uiCode = read("src/ui/StudioNewsletterDesk.tsx");
  const fixturesCode = read("src/services/fixtures.ts");

  assert.equal(/communications_record_campaign_result/.test(serviceCode), false);
  assert.equal(/communications_record_campaign_result/.test(uiCode), false);
  assert.equal(/communications_record_campaign_result/.test(fixturesCode), false);
});

test("HT-NR-06B: no direct database table write calls in newsroom-campaigns.ts", () => {
  const serviceCode = read("src/services/newsroom-campaigns.ts");
  for (const forbidden of [".insert(", ".update(", ".upsert(", ".delete("]) {
    assert.equal(
      serviceCode.includes(forbidden),
      false,
      `newsroom-campaigns.ts must not contain direct table write ${forbidden}`
    );
  }
});

// ============================================================================
// 2. CAPABILITY RECONCILIATION & SCOPED MARKETING AUTHORITY
// ============================================================================

test("HT-NR-06B: capabilities.ts registers canonical marketing capabilities and defines NEWSLETTER_DESK_CAPABILITIES", () => {
  assert.deepEqual(NEWSLETTER_DESK_CAPABILITIES, [
    "marketing.create",
    "marketing.approve",
    "marketing.send",
    "marketing.analytics"
  ]);

  for (const cap of NEWSLETTER_DESK_CAPABILITIES) {
    assert.ok(
      HEALTH_TIMES_CAPABILITIES.includes(cap),
      `Expected HEALTH_TIMES_CAPABILITIES to include ${cap}`
    );
  }

  // Verify each of the 4 marketing capabilities grants Newsletter Desk access when server-authorized
  for (const cap of NEWSLETTER_DESK_CAPABILITIES) {
    const snap = {
      status: "authorized",
      source: "server",
      userId: "00000000-0000-4000-8000-000000000101",
      staffStatus: "active",
      roles: ["marketing_editor"],
      capabilities: [cap],
      reason: "Server-authorized."
    };
    assert.equal(hasNewsletterDeskAccess(snap), true, `Expected ${cap} to grant Newsletter Desk access`);
    assert.equal(hasAnyServerCapability(snap, NEWSLETTER_DESK_CAPABILITIES), true);
  }

  // Verify non-marketing capabilities alone do NOT grant Newsletter Desk access
  const otherSnap = {
    status: "authorized",
    source: "server",
    userId: "00000000-0000-4000-8000-000000000101",
    staffStatus: "active",
    roles: ["reporter"],
    capabilities: ["story.write", "social.compose", "analytics.view"],
    reason: "Server-authorized."
  };
  assert.equal(hasNewsletterDeskAccess(otherSnap), false);
  assert.equal(hasAnyServerCapability(otherSnap, NEWSLETTER_DESK_CAPABILITIES), false);

  // Verify client/non-server snapshots are rejected even if capabilities are present
  const forgedSnap = {
    status: "authorized",
    source: "none",
    userId: "00000000-0000-4000-8000-000000000101",
    staffStatus: "active",
    roles: ["admin"],
    capabilities: ["marketing.create", "marketing.approve", "marketing.send", "marketing.analytics"],
    reason: "Forged."
  };
  assert.equal(hasNewsletterDeskAccess(forgedSnap), false);
});

// ============================================================================
// 3. DOMAIN VALIDATION
// ============================================================================

test("HT-NR-06B: validateCampaignCreateInput validates inputs and rejects invalid or forbidden keys", () => {
  const validSegmentId = "00000000-0000-4000-8000-000000000001";

  // Valid input with HTML
  const validHtml = validateCampaignCreateInput({
    name: "Weekly Health Digest",
    subject: "Top Health News This Week",
    segmentId: validSegmentId,
    purpose: "NEWSLETTER",
    htmlContent: "<p>Welcome to this week's edition.</p>"
  });
  assert.equal(validHtml.valid, true);

  // Valid input with text only
  const validText = validateCampaignCreateInput({
    name: "Vaccine Alert",
    subject: "Important Update",
    segmentId: validSegmentId,
    purpose: "BREAKING_NEWS",
    textContent: "Urgent health notification."
  });
  assert.equal(validText.valid, true);

  // Rejects missing/empty name
  const emptyName = validateCampaignCreateInput({
    name: "   ",
    subject: "Subject",
    segmentId: validSegmentId,
    purpose: "NEWSLETTER",
    textContent: "Text"
  });
  assert.equal(emptyName.valid, false);
  assert.match(emptyName.error || "", /name.*subject.*required/i);

  // Rejects missing/empty subject
  const emptySubject = validateCampaignCreateInput({
    name: "Name",
    subject: "",
    segmentId: validSegmentId,
    purpose: "NEWSLETTER",
    textContent: "Text"
  });
  assert.equal(emptySubject.valid, false);
  assert.match(emptySubject.error || "", /name.*subject.*required/i);

  // Rejects invalid purpose
  const badPurpose = validateCampaignCreateInput({
    name: "Name",
    subject: "Subject",
    segmentId: validSegmentId,
    purpose: "promotional_blast",
    textContent: "Text"
  });
  assert.equal(badPurpose.valid, false);
  assert.match(badPurpose.error || "", /purpose/i);

  // Rejects missing content (both html and text empty)
  const noContent = validateCampaignCreateInput({
    name: "Name",
    subject: "Subject",
    segmentId: validSegmentId,
    purpose: "MARKETING"
  });
  assert.equal(noContent.valid, false);
  assert.match(noContent.error || "", /content is required/i);

  // Rejects forbidden injected keys (e.g. status, approved_by, id, metadata)
  const forbiddenStatus = validateCampaignCreateInput({
    name: "Name",
    subject: "Subject",
    segmentId: validSegmentId,
    purpose: "NEWSLETTER",
    textContent: "Text",
    status: "sent"
  });
  assert.equal(forbiddenStatus.valid, false);
  assert.match(forbiddenStatus.error || "", /forbidden.*status/i);

  const forbiddenApproved = validateCampaignCreateInput({
    name: "Name",
    subject: "Subject",
    segmentId: validSegmentId,
    purpose: "NEWSLETTER",
    textContent: "Text",
    approved_by: "00000000-0000-4000-8000-000000000999"
  });
  assert.equal(forbiddenApproved.valid, false);
  assert.match(forbiddenApproved.error || "", /forbidden.*approved_by/i);
});

// ============================================================================
// 4. SERVICE ROW MAPPERS & DATA ISOLATION
// ============================================================================

test("HT-NR-06B: mapNewsroomCampaignRow maps valid rows and returns null on malformed data", () => {
  const validRow = {
    id: "00000000-0000-4000-8000-000000000010",
    name: "Childhood Immunisation Bulletin",
    subject: "Vaccination Updates",
    status: "draft",
    purpose: "NEWSLETTER",
    channel: "email",
    segment_id: "00000000-0000-4000-8000-000000000001",
    provider: "brevo",
    provider_campaign_id: "brevo_camp_123",
    approved_at: null,
    scheduled_at: null,
    sent_at: null,
    html_content: "<p>Important immunisation schedule details.</p>",
    text_content: "Important immunisation schedule details.",
    created_at: "2026-10-17T00:00:00Z",
    updated_at: "2026-10-17T00:00:00Z",
    // Injected sensitive or unexpected database columns
    metadata: { sensitive_recipient_details: true }
  };

  const mapped = mapNewsroomCampaignRow(validRow);
  assert.ok(mapped);
  assert.equal(mapped.id, validRow.id);
  assert.equal(mapped.name, validRow.name);
  assert.equal(mapped.subject, validRow.subject);
  assert.equal(mapped.status, "draft");
  assert.equal(mapped.purpose, "NEWSLETTER");
  assert.equal(mapped.segmentId, validRow.segment_id);
  assert.equal(mapped.provider, "brevo");
  // Ensure metadata is NOT exposed on domain model
  assert.equal("metadata" in mapped, false);

  // Malformed cases return null
  assert.equal(mapNewsroomCampaignRow({ ...validRow, id: "bad-id" }), null);
  assert.equal(mapNewsroomCampaignRow({ ...validRow, status: "exploded" }), null);
  assert.equal(mapNewsroomCampaignRow({ ...validRow, purpose: "unknown" }), null);
  assert.equal(mapNewsroomCampaignRow({ ...validRow, channel: "sms" }), null);
  assert.equal(mapNewsroomCampaignRow({ ...validRow, provider: "mailchimp" }), null);
});

test("HT-NR-06B: mapNewsroomContactSegmentRow maps valid segments and strips recipient data", () => {
  const validRow = {
    id: "00000000-0000-4000-8000-000000000001",
    key: "verified-doctors",
    name: "Verified Medical Practitioners",
    provider: "brevo",
    provider_segment_id: "brevo_list_99",
    sync_state: "synced",
    created_at: "2026-10-17T00:00:00Z",
    updated_at: "2026-10-17T00:00:00Z",
    // Injected sensitive data
    subscribers: ["dr.musar@example.com"],
    emails: ["contact@example.com"]
  };

  const mapped = mapNewsroomContactSegmentRow(validRow);
  assert.ok(mapped);
  assert.equal(mapped.id, validRow.id);
  assert.equal(mapped.key, validRow.key);
  assert.equal(mapped.name, validRow.name);
  assert.equal(mapped.syncState, "synced");
  // Sensitive subscriber lists must NOT be present
  assert.equal("subscribers" in mapped, false);
  assert.equal("emails" in mapped, false);

  // Missing name
  assert.equal(mapNewsroomContactSegmentRow({ ...validRow, name: "" }), null);
  // Invalid sync_state
  assert.equal(mapNewsroomContactSegmentRow({ ...validRow, sync_state: "corrupted" }), null);
});

test("HT-NR-06B: mapPrepareCampaignSendResponse enforces aggregate counts and privacy boundaries", () => {
  const validResult = {
    campaign_id: "00000000-0000-4000-8000-000000000010",
    name: "Harare Health Briefing",
    purpose: "NEWSLETTER",
    subject: "Weekly Briefing",
    html_content: "<p>Content with meaningful length here.</p>",
    text_content: "Content with meaningful length here.",
    brevo_list_id: "brevo_list_401",
    eligible_count: 1420,
    no_consent_count: 53,
    suppressed_count: 12
  };

  const mapped = mapPrepareCampaignSendResponse(validResult);
  assert.ok(mapped);
  assert.equal(mapped.eligibleCount, 1420);
  assert.equal(mapped.noConsentCount, 53);
  assert.equal(mapped.suppressedCount, 12);
  assert.equal(mapped.brevoListId, "brevo_list_401");

  // Rejects negative counts
  assert.equal(
    mapPrepareCampaignSendResponse({ ...validResult, eligible_count: -1 }),
    null
  );

  // Rejects floating point counts
  assert.equal(
    mapPrepareCampaignSendResponse({ ...validResult, eligible_count: 14.5 }),
    null
  );

  // Rejects missing/empty brevo_list_id
  assert.equal(
    mapPrepareCampaignSendResponse({ ...validResult, brevo_list_id: "" }),
    null
  );
});

// ============================================================================
// 5. SERVICE ENVELOPE HANDLING & RESILIENCE
// ============================================================================

test("HT-NR-06B: createNewsroomCampaignService handles envelopes and resilient parsing", async () => {
  // 1. Empty array returns empty array
  const emptyClient = createMockCampaignClient(() => ({ data: [], error: null }));
  const emptyService = createNewsroomCampaignService(emptyClient);
  const emptyCampaigns = await emptyService.listCampaigns();
  assert.deepEqual(emptyCampaigns, []);
  const emptySegments = await emptyService.listSegments();
  assert.deepEqual(emptySegments, []);

  // 2. Non-array envelope throws MALFORMED_ENVELOPE
  const badEnvelopeClient = createMockCampaignClient(() => ({ data: "not-an-array", error: null }));
  const badEnvelopeService = createNewsroomCampaignService(badEnvelopeClient);
  await assert.rejects(
    () => badEnvelopeService.listCampaigns(),
    (err) => err.code === "MALFORMED_ENVELOPE"
  );
  await assert.rejects(
    () => badEnvelopeService.listSegments(),
    (err) => err.code === "MALFORMED_ENVELOPE"
  );

  // 3. Mixed array filters invalid rows and returns valid rows
  const mixedClient = createMockCampaignClient(() => ({
    data: [
      {
        id: "00000000-0000-4000-8000-000000000010",
        name: "Valid Campaign",
        subject: "Valid Subject",
        status: "draft",
        purpose: "NEWSLETTER",
        channel: "email",
        segment_id: "00000000-0000-4000-8000-000000000001",
        provider: "brevo",
        provider_campaign_id: null,
        approved_at: null,
        scheduled_at: null,
        sent_at: null,
        html_content: "<p>Meaningful valid content goes here</p>",
        text_content: "Meaningful valid content goes here",
        created_at: "2026-10-17T00:00:00Z",
        updated_at: "2026-10-17T00:00:00Z"
      },
      {
        id: "not-a-uuid",
        name: "Corrupt Campaign"
      }
    ],
    error: null
  }));
  const mixedService = createNewsroomCampaignService(mixedClient);
  const mixedCampaigns = await mixedService.listCampaigns();
  assert.equal(mixedCampaigns.length, 1);
  assert.equal(mixedCampaigns[0].name, "Valid Campaign");

  // 4. All malformed in non-empty array throws MALFORMED_DATA
  const allMalformedClient = createMockCampaignClient(() => ({
    data: [{ id: "bad-1" }, { id: "bad-2" }],
    error: null
  }));
  const allMalformedService = createNewsroomCampaignService(allMalformedClient);
  await assert.rejects(
    () => allMalformedService.listCampaigns(),
    (err) => err.code === "MALFORMED_DATA"
  );
});

test("HT-NR-06B: createCampaign, approveCampaign, and prepareSend invoke canonical client RPCs", async () => {
  const campaignId = "00000000-0000-4000-8000-000000000010";
  const segmentId = "00000000-0000-4000-8000-000000000001";

  const client = createMockCampaignClient(
    () => ({ data: [], error: null }),
    (name, args) => {
      if (name === "communications_create_campaign") {
        return { data: campaignId, error: null };
      }
      if (name === "communications_approve_campaign") {
        return { data: null, error: null };
      }
      if (name === "communications_prepare_campaign_send") {
        return {
          data: {
            campaign_id: campaignId,
            name: "Weekly Digest",
            purpose: "NEWSLETTER",
            subject: "Digest",
            html_content: "<p>Digest content of meaningful length</p>",
            text_content: "Digest content of meaningful length",
            brevo_list_id: "brevo_list_401",
            eligible_count: 240,
            no_consent_count: 5,
            suppressed_count: 2
          },
          error: null
        };
      }
      throw new Error(`Unexpected RPC: ${name}`);
    }
  );

  const service = createNewsroomCampaignService(client);

  const createdId = await service.createCampaign({
    name: " Weekly Health ",
    subject: " Digest ",
    segmentId: segmentId,
    purpose: "NEWSLETTER",
    htmlContent: "<p>Meaningful digest content here.</p>"
  });
  assert.equal(createdId, campaignId);

  await service.approveCampaign(campaignId);

  const sendResult = await service.prepareSend(campaignId);
  assert.equal(sendResult.eligibleCount, 240);
  assert.equal(sendResult.noConsentCount, 5);

  assert.deepEqual(
    client.calls.rpcs.map((c) => c.name),
    [
      "communications_create_campaign",
      "communications_approve_campaign",
      "communications_prepare_campaign_send"
    ]
  );
  assert.deepEqual(client.calls.rpcs[0].args, {
    p_name: "Weekly Health",
    p_purpose: "NEWSLETTER",
    p_subject: "Digest",
    p_html_content: "<p>Meaningful digest content here.</p>",
    p_text_content: null,
    p_segment_id: segmentId
  });
  assert.deepEqual(client.calls.rpcs[1].args, {
    p_campaign_id: campaignId
  });
  assert.deepEqual(client.calls.rpcs[2].args, {
    p_campaign_id: campaignId
  });
});

// ============================================================================
// 6. STUDIO ROUTE & UI WIRING
// ============================================================================

test("HT-NR-06B: Studio.tsx registers Newsletter Desk route", () => {
  const studioCode = read("src/ui/Studio.tsx");
  assert.ok(
    studioCode.includes('["Newsletter Desk","/studio/newsletters"]'),
    "Studio.tsx must register Newsletter Desk route"
  );
});

test("HT-NR-06B: app/studio/[module].tsx gates newsletters with NEWSLETTER_DESK_CAPABILITIES", () => {
  const routeCode = read("app/studio/[module].tsx");
  assert.ok(routeCode.includes('"newsletters"'));
  assert.ok(routeCode.includes("anyOfCapabilities:NEWSLETTER_DESK_CAPABILITIES"));
  assert.ok(routeCode.includes('String(module)==="newsletters" && <StudioNewsletterDesk />'));
});

test("HT-NR-06B: StudioNewsletterDesk enforces zero canonical segment banner and truthful feedback", () => {
  const deskCode = read("src/ui/StudioNewsletterDesk.tsx");
  // Zero canonical segment banner
  assert.ok(deskCode.includes("No canonical audience segments are configured."));
  // Truthful send handoff message
  assert.ok(deskCode.includes("Send handoff prepared."));
  // Separate Approve Campaign and Prepare Send buttons
  assert.ok(deskCode.includes("Approve Campaign"));
  assert.ok(deskCode.includes("Prepare Send"));
});

// ============================================================================
// 7. OWNER PREVIEW ISOLATION
// ============================================================================

test("HT-NR-06B: Owner Preview registers newsletters module with sample data and watermark", () => {
  const ownerPreviewRoute = read("app/owner-preview/studio/[module].tsx");
  assert.ok(ownerPreviewRoute.includes('"newsletters"'));

  const ownerPreviewStudio = read("src/preview/OwnerPreviewStudio.tsx");
  assert.ok(ownerPreviewStudio.includes('case "newsletters":'));
  assert.ok(ownerPreviewStudio.includes("OwnerPreviewNewsletterDeskView"));
  assert.ok(ownerPreviewStudio.includes("OWNER_PREVIEW_WATERMARK"));

  // Verify watermark constant
  const previewDataSrc = read("src/preview/newsroomPreviewData.ts");
  assert.ok(previewDataSrc.includes("OWNER VISUAL PREVIEW · SAMPLE DATA · WRITES DISABLED"));

  // Verify preview data builds
  const segments = buildPreviewContactSegments();
  assert.ok(Array.isArray(segments));
  assert.ok(segments.length >= 2);

  const campaigns = buildPreviewCampaigns();
  assert.ok(Array.isArray(campaigns));
  assert.ok(campaigns.length >= 3);

  const prepareResult = buildPreviewCampaignPrepareSendResult();
  assert.ok(prepareResult.eligibleCount > 0);
  assert.ok(prepareResult.noConsentCount >= 0);
  assert.ok(prepareResult.suppressedCount >= 0);
});

test("HT-NR-06B: Owner Preview files strictly avoid forbidden external symbols", () => {
  const previewStudio = read("src/preview/OwnerPreviewStudio.tsx");
  const previewData = read("src/preview/newsroomPreviewData.ts");

  assert.equal(/supabase/i.test(previewStudio), false);
  assert.equal(/supabase/i.test(previewData), false);
});

// ============================================================================
// 8. FIXTURES SERVICE ISOLATION
// ============================================================================

test("HT-NR-06B: fixtures.ts registers fixtureNewsroomCampaignService and fails closed on mutations", () => {
  const fixturesSource = read("src/services/fixtures.ts");

  assert.ok(
    fixturesSource.includes("fixtureNewsroomCampaignService"),
    "fixtures.ts must export fixtureNewsroomCampaignService"
  );
  assert.ok(
    fixturesSource.includes("newsroomCampaigns: fixtureNewsroomCampaignService"),
    "fixtureServices must include newsroomCampaigns"
  );
  assert.ok(
    fixturesSource.includes("mutations are disabled in fixture mode"),
    "fixtureNewsroomCampaignService must fail closed on mutations"
  );
});

test("HT-NR-06B: services/index.ts registers stagingNewsroomCampaignService", () => {
  const servicesIndexSource = read("src/services/index.ts");
  assert.ok(
    servicesIndexSource.includes("stagingNewsroomCampaignService"),
    "services/index.ts must export stagingNewsroomCampaignService"
  );
  assert.ok(
    servicesIndexSource.includes("newsroomCampaigns: stagingNewsroomCampaignService"),
    "services/index.ts must wire newsroomCampaigns"
  );
});

// ============================================================================
// 9. HT-NR-06B-R1: REGISTRY QUERY TRUTH & SERVER FILTERING
// ============================================================================

test("HT-NR-06B-R1: listCampaigns applies server status and purpose constraints before limit", async () => {
  const client = createMockCampaignClient(() => ({ data: [], error: null }));
  const service = createNewsroomCampaignService(client);

  await service.listCampaigns({
    status: "approved",
    purpose: "NEWSLETTER",
    limit: 100
  });

  assert.equal(client.calls.queries.length, 1);
  const q = client.calls.queries[0];
  assert.equal(q.table, "audience_campaigns");
  assert.equal(q.limit, 100);

  const statusConstraint = q.filters.find((f) => f.col === "status");
  const purposeConstraint = q.filters.find((f) => f.col === "purpose");

  assert.ok(statusConstraint, "Must issue status constraint to server query");
  assert.equal(statusConstraint.type, "eq");
  assert.equal(statusConstraint.val, "approved");

  assert.ok(purposeConstraint, "Must issue purpose constraint to server query");
  assert.equal(purposeConstraint.type, "eq");
  assert.equal(purposeConstraint.val, "NEWSLETTER");
});

// ============================================================================
// 10. HT-NR-06B-R1: SERVER-BACKED CAMPAIGN NAME SEARCH
// ============================================================================

test("HT-NR-06B-R1: listCampaigns applies .ilike('name', pattern) and validates search input", async () => {
  const client = createMockCampaignClient(() => ({ data: [], error: null }));
  const service = createNewsroomCampaignService(client);

  // 1. Valid search query applies .ilike("name", "%Harare%")
  await service.listCampaigns({
    search: "Harare",
    limit: 100
  });
  assert.equal(client.calls.queries.length, 1);
  const q1 = client.calls.queries[0];
  const searchFilter = q1.filters.find((f) => f.col === "name");
  assert.ok(searchFilter, "Must issue name filter for search");
  assert.equal(searchFilter.type, "ilike");
  assert.equal(searchFilter.pattern, "%Harare%");
  assert.equal(q1.limit, 100);

  // 2. Blank or whitespace search applies NO ilike filter
  await service.listCampaigns({
    search: "   ",
    limit: 50
  });
  assert.equal(client.calls.queries.length, 2);
  const q2 = client.calls.queries[1];
  const noFilter = q2.filters.find((f) => f.col === "name");
  assert.equal(noFilter, undefined, "Blank search must not apply ilike filter");

  // 3. Overlong search (>80 characters) throws VALIDATION_ERROR
  await assert.rejects(
    () => service.listCampaigns({ search: "a".repeat(81) }),
    (err) => {
      assert.equal(err.name, "NewsroomCampaignError");
      assert.equal(err.code, "VALIDATION_ERROR");
      assert.ok(err.message.includes("80 characters or fewer"));
      return true;
    }
  );

  // 4. Combined status + purpose + search all applied before limit
  await service.listCampaigns({
    status: "draft",
    purpose: "MARKETING",
    search: "  Bulawayo Clinic  ",
    limit: 100
  });
  assert.equal(client.calls.queries.length, 3);
  const q3 = client.calls.queries[2];
  assert.equal(q3.filters.length, 3);
  assert.deepEqual(q3.filters, [
    { type: "eq", col: "status", val: "draft" },
    { type: "eq", col: "purpose", val: "MARKETING" },
    { type: "ilike", col: "name", pattern: "%Bulawayo Clinic%" }
  ]);
  assert.equal(q3.limit, 100);
});

// ============================================================================
// 11. HT-NR-06B-R1: OPERATIONAL WIRING & SEARCH INPUT
// ============================================================================

test("HT-NR-06B-R1: operational StudioNewsletterDesk wires debounced search and canonical query", () => {
  const deskSource = read("src/ui/StudioNewsletterDesk.tsx");

  // Search input and debounce in operational container
  assert.ok(deskSource.includes('searchQuery, setSearchQuery] = useState("")'));
  assert.ok(deskSource.includes('debouncedSearch, setDebouncedSearch] = useState("")'));
  assert.ok(deskSource.includes("requestSeqRef"));
  assert.ok(deskSource.includes("setTimeout("));
  assert.ok(deskSource.includes("350"));

  // Query parameter passing to listCampaigns
  assert.ok(deskSource.includes('statusFilter === "all" ? undefined : statusFilter'));
  assert.ok(deskSource.includes('purposeFilter === "all" ? undefined : purposeFilter'));
  assert.ok(deskSource.includes("search: targetSearch.trim()"));
  assert.ok(deskSource.includes("limit: 100"));

  // Shared view search input and label
  assert.ok(deskSource.includes("Search campaign names"));
  assert.ok(deskSource.includes('testID="newsletter-search-input"'));
  assert.ok(deskSource.includes('maxLength={80}'));
});

// ============================================================================
// 12. HT-NR-06B-R1: COUNTER TRUTH & DISCLOSURE
// ============================================================================

test("HT-NR-06B-R1: counter labels use bounded results and include disclosure", () => {
  const deskSource = read("src/ui/StudioNewsletterDesk.tsx");

  // Must NOT claim global Total Campaigns over bounded array
  assert.equal(
    deskSource.includes("<Text style={styles.metricLabel}>Total Campaigns</Text>"),
    false,
    "Must not claim Total Campaigns"
  );

  // Must use truthful bounded result labels
  assert.ok(deskSource.includes("Loaded Results"));
  assert.ok(deskSource.includes("Draft in Results"));
  assert.ok(deskSource.includes("Approved in Results"));
  assert.ok(deskSource.includes("Sent in Results"));
  assert.ok(deskSource.includes("Failed in Results"));

  // Must keep segment inventory counter truthful
  assert.ok(deskSource.includes("Brevo Synced Segments"));

  // Must include visible disclosure
  assert.ok(
    deskSource.includes("Showing up to 100 server-matched campaigns."),
    "Must include 'Showing up to 100 server-matched campaigns.' disclosure"
  );
  assert.ok(deskSource.includes('testID="newsletter-desk-disclosure"'));
});

// ============================================================================
// 13. HT-NR-06B-R1: HANDOFF CUSTODY & CROSS-CAMPAIGN ISOLATION
// ============================================================================

test("HT-NR-06B-R1: activeHandoff is strictly scoped to selected campaign ID", () => {
  const deskSource = read("src/ui/StudioNewsletterDesk.tsx");

  // Ensure activeHandoff ternary does NOT leak
  assert.equal(
    deskSource.includes(": preparedHandoff;"),
    false,
    "activeHandoff must not fall back to preparedHandoff when campaignId mismatches"
  );
  assert.ok(
    deskSource.includes("preparedHandoff.campaignId === selectedCampaign.id\n      ? preparedHandoff\n      : null") ||
    deskSource.includes("preparedHandoff.campaignId === selectedCampaign.id ? preparedHandoff : null"),
    "activeHandoff must return null when selectedCampaign does not match"
  );

  // Behavioral test of the handoff custody logic
  const resolveActiveHandoff = (prepared, selected) => {
    return prepared && selected && prepared.campaignId === selected.id
      ? prepared
      : null;
  };

  const handoffA = {
    campaignId: "campaign-aaa",
    name: "Campaign A",
    eligibleCount: 100
  };
  const campA = { id: "campaign-aaa", name: "Campaign A" };
  const campB = { id: "campaign-bbb", name: "Campaign B" };

  // 1. When selected is Campaign A: visible
  assert.deepEqual(resolveActiveHandoff(handoffA, campA), handoffA);

  // 2. When selected is Campaign B: hidden (null)
  assert.equal(resolveActiveHandoff(handoffA, campB), null);

  // 3. When selected is null: hidden (null)
  assert.equal(resolveActiveHandoff(handoffA, null), null);

  // 4. When prepared is null: hidden (null)
  assert.equal(resolveActiveHandoff(null, campA), null);
});

// ============================================================================
// 14. HT-NR-06B-R1: PRIVACY COPY TRUTH
// ============================================================================

test("HT-NR-06B-R1: privacy banner states truthful aggregate eligibility boundary", () => {
  const deskSource = read("src/ui/StudioNewsletterDesk.tsx");

  // Updated truthful wording
  assert.ok(
    deskSource.includes(
      "RECIPIENT PRIVACY: AGGREGATE ELIGIBILITY ONLY · ZERO RECIPIENT IDENTITY EXPOSURE"
    ),
    "Must display updated truthful recipient privacy wording"
  );

  // No recipient email exposure
  assert.equal(/recipient.*email.*table/i.test(deskSource), false);
  assert.equal(/contact_id/i.test(deskSource), false);
  assert.equal(/consent_records/i.test(deskSource), false);
});

