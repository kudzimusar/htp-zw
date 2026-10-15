import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadTs } from "./ts-module-loader.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

const reviewQueueModule = loadTs("src/ui/StudioReviewQueue.tsx", {
  mocks: {
    react: {
      useState: (init) => [typeof init === "function" ? init() : init, () => {}],
      useMemo: (fn) => fn(),
      useRef: (init) => ({ current: init }),
      useEffect: () => {}
    },
    "react-native": {
      Pressable: "Pressable",
      ScrollView: "ScrollView",
      StyleSheet: { create: (s) => s },
      Text: "Text",
      TextInput: "TextInput",
      View: "View",
      useWindowDimensions: () => ({ width: 1024, height: 768 })
    },
    "expo-router": {
      useRouter: () => ({ push: () => {}, setParams: () => {} })
    },
    "../services": {
      services: {
        newsroomStories: {
          listStories: async () => [],
          listAuthors: async () => []
        },
        authorization: {
          getSnapshot: async () => ({ status: "authorized", capabilities: [] })
        }
      }
    },
    "../hooks/useAsync": {
      useAsync: () => ({ data: [], loading: false, error: null })
    },
    "../security/capabilities": {
      hasServerCapability: (snapshot, cap) => {
        return (
          snapshot?.status === "authorized" &&
          snapshot?.source === "server" &&
          Array.isArray(snapshot?.capabilities) &&
          snapshot.capabilities.includes(cap)
        );
      }
    },
    "react/jsx-runtime": {
      jsx: () => null,
      jsxs: () => null
    },
    "./StudioStories": {
      resolveWorkflowStatus: (s) => {
        const ws = (s.workflowStatus ?? "").toLowerCase().trim();
        if (ws === "publish" || ws === "published") return "Published";
        if (s.workflowStatus && s.workflowStatus.trim()) return s.workflowStatus.trim();
        const lower = (s.status ?? "").toLowerCase().trim();
        if (lower === "publish" || lower === "published") return "Published";
        if (lower === "draft") return "Draft";
        if (lower) return lower.charAt(0).toUpperCase() + lower.slice(1);
        return "Draft";
      }
    }
  }
});

const {
  isReviewWorkflowStatus,
  REVIEW_WORKFLOW_STATES,
  REVIEW_QUEUE_CAPABILITIES,
  hasReviewQueueAuthority,
  getDeadlineUrgency,
  sortReviewQueue,
  filterReviewQueue,
  stageBadgeColor,
  StudioReviewQueue
} = reviewQueueModule;

test("HT-NR-02B: Review Queue includes canonical review states and excludes non-review states", () => {
  // Exact accepted review states
  assert.deepEqual([...REVIEW_WORKFLOW_STATES], [
    "Submitted",
    "Fact check",
    "Health / Science review",
    "Copy edit",
    "Editor review",
    "Ready"
  ]);

  // Valid review states return true
  assert.equal(isReviewWorkflowStatus("Submitted"), true);
  assert.equal(isReviewWorkflowStatus("Fact check"), true);
  assert.equal(isReviewWorkflowStatus("Health / Science review"), true);
  assert.equal(isReviewWorkflowStatus("Copy edit"), true);
  assert.equal(isReviewWorkflowStatus("Editor review"), true);
  assert.equal(isReviewWorkflowStatus("Ready"), true);

  // Non-review states return false
  assert.equal(isReviewWorkflowStatus("Draft"), false);
  assert.equal(isReviewWorkflowStatus("Published"), false);
  assert.equal(isReviewWorkflowStatus("Scheduled"), false);
  assert.equal(isReviewWorkflowStatus("Updated / Corrected"), false);
  assert.equal(isReviewWorkflowStatus("Archived"), false);
  assert.equal(isReviewWorkflowStatus("Pitch"), false);
  assert.equal(isReviewWorkflowStatus(null), false);
  assert.equal(isReviewWorkflowStatus(undefined), false);
});

test("HT-NR-02B: Deadline and overdue urgency computation is deterministic and handles edges", () => {
  const baseTime = Date.parse("2026-10-15T12:00:00Z");

  // Overdue by 3 hours
  const pastTime = new Date(baseTime - 3 * 60 * 60 * 1000).toISOString();
  const resPast = getDeadlineUrgency(pastTime, baseTime);
  assert.equal(resPast.isOverdue, true);
  assert.equal(resPast.isImminent, false);
  assert.equal(resPast.hasDeadline, true);
  assert.ok(resPast.label.includes("OVERDUE by 3h"));

  // Overdue by 2 days
  const pastDays = new Date(baseTime - 50 * 60 * 60 * 1000).toISOString();
  const resPastDays = getDeadlineUrgency(pastDays, baseTime);
  assert.equal(resPastDays.isOverdue, true);
  assert.ok(resPastDays.label.includes("OVERDUE by 2d"));

  // Imminent (due in 5 hours)
  const soonTime = new Date(baseTime + 5 * 60 * 60 * 1000).toISOString();
  const resSoon = getDeadlineUrgency(soonTime, baseTime);
  assert.equal(resSoon.isOverdue, false);
  assert.equal(resSoon.isImminent, true);
  assert.equal(resSoon.hasDeadline, true);
  assert.ok(resSoon.label.includes("Due in 5h"));

  // Future deadline (3 days out)
  const futureTime = new Date(baseTime + 72 * 60 * 60 * 1000).toISOString();
  const resFuture = getDeadlineUrgency(futureTime, baseTime);
  assert.equal(resFuture.isOverdue, false);
  assert.equal(resFuture.isImminent, false);
  assert.equal(resFuture.hasDeadline, true);
  assert.ok(resFuture.label.includes("Due"));

  // No deadline
  const resNone = getDeadlineUrgency(null, baseTime);
  assert.equal(resNone.isOverdue, false);
  assert.equal(resNone.hasDeadline, false);
  assert.equal(resNone.label, "No deadline");

  // Invalid date
  const resInvalid = getDeadlineUrgency("invalid-date-string", baseTime);
  assert.equal(resInvalid.isOverdue, false);
  assert.equal(resInvalid.hasDeadline, false);
  assert.equal(resInvalid.label, "Invalid date");
});

test("HT-NR-02B: Prioritization sorting orders by overdue, imminent deadline, and review urgency", () => {
  const baseTime = Date.parse("2026-10-15T12:00:00Z");

  const storyOverdue = {
    id: "s1",
    title: "Overdue Cholera Outbreak",
    workflowStatus: "Submitted",
    deadlineAt: new Date(baseTime - 4 * 3600 * 1000).toISOString(),
    updatedAt: "2026-10-15T08:00:00Z"
  };

  const storyImminent = {
    id: "s2",
    title: "Maternal Health Clinic Report",
    workflowStatus: "Fact check",
    deadlineAt: new Date(baseTime + 2 * 3600 * 1000).toISOString(),
    updatedAt: "2026-10-15T10:00:00Z"
  };

  const storyFuture = {
    id: "s3",
    title: "New Vaccine Trial Results",
    workflowStatus: "Copy edit",
    deadlineAt: new Date(baseTime + 48 * 3600 * 1000).toISOString(),
    updatedAt: "2026-10-15T09:00:00Z"
  };

  const storyEditorReviewNoDeadline = {
    id: "s4",
    title: "Hospital Budget Audit",
    workflowStatus: "Editor review",
    deadlineAt: null,
    updatedAt: "2026-10-15T07:00:00Z"
  };

  const storySubmittedNoDeadline = {
    id: "s5",
    title: "Community Water Safety",
    workflowStatus: "Submitted",
    deadlineAt: null,
    updatedAt: "2026-10-15T11:00:00Z"
  };

  const unsorted = [storySubmittedNoDeadline, storyFuture, storyEditorReviewNoDeadline, storyOverdue, storyImminent];
  const sorted = sortReviewQueue(unsorted, "priority", baseTime);

  // 1st: Overdue story
  assert.equal(sorted[0].id, "s1");
  // 2nd: Imminent deadline (<24h)
  assert.equal(sorted[1].id, "s2");
  // 3rd: Future deadline
  assert.equal(sorted[2].id, "s3");
  // 4th: Editor review (high stage urgency) before Submitted
  assert.equal(sorted[3].id, "s4");
  // 5th: Submitted without deadline
  assert.equal(sorted[4].id, "s5");
});

test("HT-NR-02B: Multi-dimensional filtering isolates stage, desk, author, overdue, and search", () => {
  const baseTime = Date.parse("2026-10-15T12:00:00Z");

  const stories = [
    {
      id: "1",
      title: "Malaria Treatment Access in Masvingo",
      standfirst: "Stockouts of artemisinin combination therapy reported.",
      workflowStatus: "Fact check",
      desk: "Infectious Disease",
      topic: "Malaria",
      authorId: "auth-1",
      accessPolicy: "public",
      deadlineAt: new Date(baseTime - 3600 * 1000).toISOString() // Overdue
    },
    {
      id: "2",
      title: "Private Hospital Fee Caps Analysis",
      standfirst: "Ministry introduces new tariff guidelines.",
      workflowStatus: "Editor review",
      desk: "Health Policy",
      topic: "Economics",
      authorId: "auth-2",
      accessPolicy: "premium",
      deadlineAt: new Date(baseTime + 3600 * 1000).toISOString() // Not overdue
    },
    {
      id: "3",
      title: "Draft Research Notes on Diabetes",
      workflowStatus: "Draft", // Should be filtered out of review queue
      desk: "Non-Communicable",
      authorId: "auth-1",
      accessPolicy: "public"
    },
    {
      id: "4",
      title: "Harare Water Quality Audit",
      workflowStatus: "Copy edit",
      desk: "Sanitation",
      topic: "Water",
      authorId: "auth-1",
      accessPolicy: "public",
      deadlineAt: null
    }
  ];

  const authorsMap = {
    "auth-1": "Dr. Kudzi Musarurwa",
    "auth-2": "Tariro Chipo"
  };

  // Base filter excludes Draft
  const allReview = filterReviewQueue(stories, { authorsMap, now: baseTime });
  assert.equal(allReview.length, 3);
  assert.equal(allReview.some((s) => s.id === "3"), false);

  // Filter by stage: Fact check
  const factCheckOnly = filterReviewQueue(stories, { statusFilter: "Fact check", authorsMap, now: baseTime });
  assert.equal(factCheckOnly.length, 1);
  assert.equal(factCheckOnly[0].id, "1");

  // Filter by desk: Health Policy
  const policyDesk = filterReviewQueue(stories, { deskFilter: "Health Policy", authorsMap, now: baseTime });
  assert.equal(policyDesk.length, 1);
  assert.equal(policyDesk[0].id, "2");

  // Filter by author: auth-1
  const author1Stories = filterReviewQueue(stories, { authorFilter: "auth-1", authorsMap, now: baseTime });
  assert.equal(author1Stories.length, 2);

  // Filter by policy: premium
  const premiumStories = filterReviewQueue(stories, { policyFilter: "premium", authorsMap, now: baseTime });
  assert.equal(premiumStories.length, 1);
  assert.equal(premiumStories[0].id, "2");

  // Filter by overdue only
  const overdueStories = filterReviewQueue(stories, { overdueOnly: true, authorsMap, now: baseTime });
  assert.equal(overdueStories.length, 1);
  assert.equal(overdueStories[0].id, "1");

  // Search by text query
  const searchResults = filterReviewQueue(stories, { searchQuery: "artemisinin", authorsMap, now: baseTime });
  assert.equal(searchResults.length, 1);
  assert.equal(searchResults[0].id, "1");

  // Search by author name
  const authorSearch = filterReviewQueue(stories, { searchQuery: "Tariro", authorsMap, now: baseTime });
  assert.equal(authorSearch.length, 1);
  assert.equal(authorSearch[0].id, "2");
});

test("HT-NR-02B: Review Queue UI derives from canonical server stories without fake data", () => {
  const component = read("src/ui/StudioReviewQueue.tsx");

  // Uses real newsroomStories service
  assert.ok(component.includes("services.newsroomStories.listStories(200)"));
  assert.ok(component.includes("services.newsroomStories.listAuthors()"));
  assert.ok(component.includes("services.authorization.getSnapshot()"));

  // Derives queue directly from storiesState data
  assert.ok(component.includes("const rawStories = storiesState.data ?? [];"));
  assert.ok(component.includes("rawStories.filter((s) => isReviewWorkflowStatus(resolveWorkflowStatus(s)))"));

  // Zero fake story fixtures or hardcoded queue items
  assert.equal(component.includes("fixtureStories"), false);
  assert.equal(component.includes("fakeQueue"), false);
  assert.equal(component.includes("dummyStories"), false);
});

test("HT-NR-02B: Navigation seamlessly hands off to canonical Story Workspace", () => {
  const component = read("src/ui/StudioReviewQueue.tsx");
  const router = read("app/studio/[module].tsx");

  // Clicking an item opens the canonical Story Workspace with storyId
  assert.ok(component.includes('pathname: "/studio/[module]"'));
  assert.ok(component.includes('params: { module: "create-edit", storyId'));
  assert.ok(component.includes("handleOpenWorkspace"));

  // Router registers review-queue in generateStaticParams and owners
  assert.ok(router.includes('"review-queue"'));
  assert.ok(router.includes('title:"Review Queue"'));
  assert.ok(router.includes('owner:"HT-NR-02B"'));
  assert.ok(router.includes("<StudioReviewQueue />"));

  // Route entry is guarded by StudioAuthorityGate (capability: null)
  assert.ok(router.includes('"review-queue":{title:"Review Queue",owner:"HT-NR-02B",capability:null'));
});

test("HT-NR-02B: Review Queue surfaces empty, loading, and error states truthfully", () => {
  const component = read("src/ui/StudioReviewQueue.tsx");

  // Empty queue
  assert.ok(component.includes("Review Queue Clear"));
  assert.ok(component.includes("There are no stories currently pending editorial review."));

  // Filtered empty
  assert.ok(component.includes("No Stories Match Active Filters"));
  assert.ok(component.includes("Reset All Filters"));

  // Loading state
  assert.ok(component.includes("Loading Newsroom Review Queue from server…"));

  // Error state with retry
  assert.ok(component.includes("Failed to Load Review Queue"));
  assert.ok(component.includes("Retry Connection"));
});

test("HT-NR-02B: Studio Today index and Studio Stories provide direct Review Queue discoverability", () => {
  const today = read("app/studio/index.tsx");
  const stories = read("src/ui/StudioStories.tsx");
  const studio = read("src/ui/Studio.tsx");

  // Studio Today action registered
  assert.ok(today.includes('["Review Queue","review-queue"'));

  // Studio Stories has direct link button
  assert.ok(stories.includes('router.push("/studio/review-queue"'));
  assert.ok(stories.includes("Review Queue →"));

  // Studio sidebar has Review Queue module
  assert.ok(studio.includes('["Review Queue","/studio/review-queue"]'));
});

test("HT-NR-02B: Stage badge color mapping distinguishes all review stages", () => {
  for (const st of REVIEW_WORKFLOW_STATES) {
    const badge = stageBadgeColor(st);
    assert.ok(badge.bg);
    assert.ok(badge.text);
    assert.ok(badge.border);
  }
});

test("HT-NR-02B-R1: Authorization snapshot strictly gates Review Queue access by review capability catalogue", () => {
  // Accepted review capabilities catalogue
  assert.deepEqual([...REVIEW_QUEUE_CAPABILITIES], [
    "story.fact_check",
    "story.health_review",
    "story.copy_edit",
    "story.edit_all",
    "story.publish"
  ]);

  const baseAuthorized = {
    status: "authorized",
    staffProfileId: "staff-1",
    source: "server",
    reason: "Certified staff session."
  };

  // 1. authorized snapshot with story.fact_check admits Review Queue
  assert.equal(
    hasReviewQueueAuthority({ ...baseAuthorized, capabilities: ["story.fact_check"] }),
    true
  );

  // 2. authorized snapshot with story.health_review admits
  assert.equal(
    hasReviewQueueAuthority({ ...baseAuthorized, capabilities: ["story.health_review"] }),
    true
  );

  // 3. authorized snapshot with story.copy_edit admits
  assert.equal(
    hasReviewQueueAuthority({ ...baseAuthorized, capabilities: ["story.copy_edit"] }),
    true
  );

  // 4. authorized snapshot with story.edit_all admits
  assert.equal(
    hasReviewQueueAuthority({ ...baseAuthorized, capabilities: ["story.edit_all"] }),
    true
  );

  // 5. authorized snapshot with story.publish admits
  assert.equal(
    hasReviewQueueAuthority({ ...baseAuthorized, capabilities: ["story.publish"] }),
    true
  );

  // 6. Reporter-style snapshot with only story.edit_own / story.submit denies
  assert.equal(
    hasReviewQueueAuthority({
      ...baseAuthorized,
      capabilities: ["story.create", "story.edit_own", "story.submit"]
    }),
    false
  );

  // 7. empty capability set denies
  assert.equal(
    hasReviewQueueAuthority({ ...baseAuthorized, capabilities: [] }),
    false
  );

  // 8. authenticated-no-staff-authority denies
  assert.equal(
    hasReviewQueueAuthority({
      status: "authenticated-no-staff-authority",
      staffProfileId: null,
      capabilities: [],
      source: "none",
      reason: "Reader account."
    }),
    false
  );

  // 9. server-policy-unavailable denies
  assert.equal(
    hasReviewQueueAuthority({
      status: "server-policy-unavailable",
      staffProfileId: null,
      capabilities: ["story.publish"],
      source: "none",
      reason: "Network failure."
    }),
    false
  );

  // 10. anonymous denies
  assert.equal(
    hasReviewQueueAuthority({
      status: "anonymous",
      staffProfileId: null,
      capabilities: [],
      source: "none",
      reason: "No session."
    }),
    false
  );
  assert.equal(hasReviewQueueAuthority(null), false);
  assert.equal(hasReviewQueueAuthority(undefined), false);

  // 11. navigation alone does not grant review authority
  // Review Queue itself inspects server-issued capabilities; navigation or URL access
  // without a review capability snapshot is fail-closed.
  const component = read("src/ui/StudioReviewQueue.tsx");
  assert.ok(component.includes("const isAuthorized = hasReviewQueueAuthority(authSnapshot);"));
  assert.ok(component.includes("if (!isAuthorized)"));
  assert.ok(component.includes("Review Queue Authority Required"));
});

test("HT-NR-02B-R1: Workload retrieval is conditional on review authority and unauthorized states fail closed", () => {
  const component = read("src/ui/StudioReviewQueue.tsx");

  // Conditional data fetching: listStories and listAuthors are called ONLY when isAuthorized is true
  assert.ok(component.includes("if (!isAuthorized)"));
  assert.ok(component.includes("setStoriesState({ data: null, loading: false, error: null });"));
  assert.ok(component.includes("setAuthorsState({ data: null, loading: false, error: null });"));

  // Canonical listStories and listAuthors are executed only inside the authorized effect
  const effectBlock = component.slice(
    component.indexOf("useEffect(() => {"),
    component.indexOf("}, [isAuthorized, refreshKey]);")
  );
  assert.ok(effectBlock.includes("if (!isAuthorized)"));
  assert.ok(effectBlock.includes("services.newsroomStories.listStories(200)"));
  assert.ok(effectBlock.includes("services.newsroomStories.listAuthors()"));

  // Unauthorized state renders professional non-error message without operational metrics or cards
  assert.ok(component.includes("Review Queue Authority Required"));
  assert.ok(component.includes("Your current Newsroom session does not have editorial review authority."));
  assert.ok(component.includes("Return to Stories Workspace →"));

  // Fail-closed authorization screens do not expose operational triage counters or story cards
  const unauthJsxStart = component.indexOf("Review Queue Authority Required");
  const unauthJsxEnd = component.indexOf("</View>\n    );", unauthJsxStart);
  const unauthJsx = component.slice(unauthJsxStart, unauthJsxEnd);
  assert.equal(unauthJsx.includes("metricsBar"), false);
  assert.equal(unauthJsx.includes("summaryCounts"), false);
  assert.equal(unauthJsx.includes("storyCard"), false);
  assert.equal(unauthJsx.includes("queueList"), false);
  assert.equal(unauthJsx.includes("searchInput"), false);
});

test("HT-NR-02B-R1: Author identity truth enforces canonical listAuthors and forbids invented Reporter names", () => {
  const component = read("src/ui/StudioReviewQueue.tsx");

  // Zero invented reporter identities: "Reporter ${id...}" is strictly forbidden
  assert.equal(component.includes("Reporter ${"), false);
  assert.equal(component.includes("Reporter ${id"), false);

  // Unresolved authors render neutral truthful "Author unavailable"
  assert.ok(component.includes('authorsMap[story.authorId] ?? "Author unavailable"'));

  // availableAuthors includes canonical named authors only (filtering out unresolved IDs)
  assert.ok(component.includes("if (authorsMap[story.authorId.trim()])"));
  assert.ok(component.includes("name: authorsMap[id]!"));

  // Filter testing: verify unresolved author ID is not fabricated
  const baseTime = Date.parse("2026-10-15T12:00:00Z");
  const authorsMap = {
    "auth-resolved-1": "Dr. Kudzi Musarurwa"
  };

  const storiesWithMixedAuthors = [
    {
      id: "s-resolved",
      title: "Clean Water Infrastructure Report",
      workflowStatus: "Submitted",
      authorId: "auth-resolved-1",
      deadlineAt: null
    },
    {
      id: "s-unresolved",
      title: "Regional Clinic Supply Chain",
      workflowStatus: "Fact check",
      authorId: "auth-unresolved-uuid-9999",
      deadlineAt: null
    }
  ];

  // Unresolved story remains in the queue
  const queue = filterReviewQueue(storiesWithMixedAuthors, { authorsMap, now: baseTime });
  assert.equal(queue.length, 2);

  // Searching by an invented name like "Reporter auth-unres" returns 0 results
  const fakeSearch = filterReviewQueue(storiesWithMixedAuthors, {
    searchQuery: "Reporter auth-unres",
    authorsMap,
    now: baseTime
  });
  assert.equal(fakeSearch.length, 0);

  // Searching by canonical author name matches only the resolved story
  const resolvedSearch = filterReviewQueue(storiesWithMixedAuthors, {
    searchQuery: "Kudzi",
    authorsMap,
    now: baseTime
  });
  assert.equal(resolvedSearch.length, 1);
  assert.equal(resolvedSearch[0].id, "s-resolved");
});
