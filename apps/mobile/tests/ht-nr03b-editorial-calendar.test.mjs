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

function collectTexts(node, out = []) {
  if (node == null || typeof node === "boolean") return out;
  if (typeof node === "string" || typeof node === "number") {
    out.push(String(node));
    return out;
  }
  if (Array.isArray(node)) {
    for (const child of node) collectTexts(child, out);
    return out;
  }
  if (typeof node === "object" && node.props) {
    collectTexts(node.props.children, out);
  }
  return out;
}

function findPressables(node, out = []) {
  if (!node || typeof node !== "object") return out;
  if (Array.isArray(node)) {
    for (const child of node) findPressables(child, out);
    return out;
  }
  if (node.type === "Pressable") {
    out.push(node);
  }
  if (node.props && node.props.children) {
    findPressables(node.props.children, out);
  }
  return out;
}

const calendarModule = loadTs("src/ui/StudioEditorialCalendar.tsx", {
  mocks: {
    react: {
      useState: (init) => [typeof init === "function" ? init() : init, () => {}],
      useMemo: (fn) => fn(),
      useEffect: () => {}
    },
    "react-native": {
      Pressable: "Pressable",
      ScrollView: "ScrollView",
      StyleSheet: { create: (s) => s },
      Text: "Text",
      TextInput: "TextInput",
      View: "View",
      useWindowDimensions: () => ({ width: 1280, height: 800 })
    },
    "expo-router": {
      useRouter: () => ({ push: () => {} })
    },
    "../services": {
      services: {
        newsroomStories: {
          listStories: async () => []
        },
        newsroomCommunication: {
          listAssignments: async () => []
        },
        authorization: {
          getSnapshot: async () => ({
            status: "authorized",
            source: "server",
            capabilities: []
          })
        }
      }
    },
    "../hooks/useAsync": {
      useAsync: () => ({ data: null, loading: false, error: null })
    },
    "../security/capabilities": {
      hasServerCapability: (snapshot, cap) =>
        snapshot?.status === "authorized" &&
        snapshot?.source === "server" &&
        Array.isArray(snapshot?.capabilities) &&
        snapshot.capabilities.includes(cap)
    },
    "react/jsx-runtime": {
      jsx: (type, props) => ({ type, props }),
      jsxs: (type, props) => ({ type, props })
    }
  }
});

const {
  hasEditorialCalendarAuthority,
  hasPlanningHandoffAuthority,
  parseCanonicalTimestamp,
  isStoryTerminalState,
  isAssignmentTerminalState,
  classifyCalendarDateWindow,
  deriveEditorialCalendarItems,
  computeCalendarSummaryMetrics,
  filterEditorialCalendarItems,
  buildSevenDayPlanningStrip
} = calendarModule;

test("HT-NR-03B: Calendar route is registered in Studio navigation, Today dashboard, and dynamic module router", () => {
  const studioSource = read("src/ui/Studio.tsx");
  const indexSource = read("app/studio/index.tsx");
  const moduleSource = read("app/studio/[module].tsx");

  assert.match(studioSource, /\["Calendar",\s*"\/studio\/calendar"\]/);
  assert.match(indexSource, /\["Editorial Calendar",\s*"calendar"/);
  assert.match(moduleSource, /"calendar"/);
  assert.match(moduleSource, /<StudioEditorialCalendar \/>/);
});

test("HT-NR-03B: Calendar session authority accepts server-authorized staff and fails closed on anonymous, reader, or unavailable states", () => {
  assert.equal(hasEditorialCalendarAuthority(null), false);
  assert.equal(hasEditorialCalendarAuthority(undefined), false);
  assert.equal(
    hasEditorialCalendarAuthority({ status: "anonymous", source: "none", capabilities: [] }),
    false
  );
  assert.equal(
    hasEditorialCalendarAuthority({
      status: "authenticated-no-staff-authority",
      source: "none",
      capabilities: []
    }),
    false
  );
  assert.equal(
    hasEditorialCalendarAuthority({
      status: "server-policy-unavailable",
      source: "none",
      capabilities: []
    }),
    false
  );
  assert.equal(
    hasEditorialCalendarAuthority({
      status: "authorized",
      source: "none",
      capabilities: ["story.edit_own"]
    }),
    false
  );

  // Reporter with server-authorized staff session can access Calendar without assignment.manage
  const reporterSnapshot = {
    status: "authorized",
    source: "server",
    staffProfileId: "rep-111",
    capabilities: ["story.create", "story.edit_own"]
  };
  assert.equal(hasEditorialCalendarAuthority(reporterSnapshot), true);
  assert.equal(hasPlanningHandoffAuthority(reporterSnapshot), false);

  // Planning handoff requires assignment.manage or assignment.create
  assert.equal(
    hasPlanningHandoffAuthority({
      status: "authorized",
      source: "server",
      capabilities: ["assignment.create"]
    }),
    true
  );
  assert.equal(
    hasPlanningHandoffAuthority({
      status: "authorized",
      source: "server",
      capabilities: ["assignment.manage"]
    }),
    true
  );
});

test("HT-NR-03B: Zero workload retrieval before server staff authorization is verified", () => {
  let storiesFetched = false;
  let assignmentsFetched = false;

  function renderWithAuth(snapshot, loading = false) {
    storiesFetched = false;
    assignmentsFetched = false;

    const mod = loadTs("src/ui/StudioEditorialCalendar.tsx", {
      mocks: {
        react: {
          useState: (init) => [typeof init === "function" ? init() : init, () => {}],
          useMemo: (fn) => fn(),
          useEffect: (fn) => {
            fn();
          }
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
          useRouter: () => ({ push: () => {} })
        },
        "../services": {
          services: {
            newsroomStories: {
              listStories: async () => {
                storiesFetched = true;
                return [];
              }
            },
            newsroomCommunication: {
              listAssignments: async () => {
                assignmentsFetched = true;
                return [];
              }
            },
            authorization: {
              getSnapshot: async () => snapshot
            }
          }
        },
        "../hooks/useAsync": {
          useAsync: () => ({ data: snapshot, loading, error: null })
        },
        "../security/capabilities": {
          hasServerCapability: (snap, cap) =>
            snap?.status === "authorized" &&
            snap?.source === "server" &&
            Array.isArray(snap?.capabilities) &&
            snap.capabilities.includes(cap)
        },
        "react/jsx-runtime": {
          jsx: (type, props) => ({ type, props }),
          jsxs: (type, props) => ({ type, props })
        }
      }
    });

    const tree = mod.StudioEditorialCalendar();
    return collectTexts(tree).join(" | ");
  }

  // Anonymous
  const anonTexts = renderWithAuth({ status: "anonymous", source: "none", capabilities: [] });
  assert.equal(storiesFetched, false);
  assert.equal(assignmentsFetched, false);
  assert.ok(anonTexts.includes("Authentication Required"));

  // Authenticated non-staff reader
  const readerTexts = renderWithAuth({
    status: "authenticated-no-staff-authority",
    source: "none",
    capabilities: []
  });
  assert.equal(storiesFetched, false);
  assert.equal(assignmentsFetched, false);
  assert.ok(readerTexts.includes("Newsroom Staff Authority Required"));

  // Policy unavailable
  const policyTexts = renderWithAuth({
    status: "server-policy-unavailable",
    source: "none",
    capabilities: []
  });
  assert.equal(storiesFetched, false);
  assert.equal(assignmentsFetched, false);
  assert.ok(policyTexts.includes("Server Policy Unavailable"));
});

test("HT-NR-03B: Story and assignment projections derive stable IDs, omit publishedAt-only history, and ignore invalid dates", () => {
  const nowMs = new Date(2026, 9, 16, 12, 0, 0).getTime(); // Oct 16, 2026 12:00 local

  assert.equal(parseCanonicalTimestamp(null), null);
  assert.equal(parseCanonicalTimestamp(""), null);
  assert.equal(parseCanonicalTimestamp("   "), null);
  assert.equal(parseCanonicalTimestamp("not-a-valid-timestamp"), null);

  const stories = [
    // 1. Historical published story with ONLY publishedAt -> MUST BE EXCLUDED (zero agenda noise)
    {
      id: "11111111-1111-4111-8111-111111111111",
      title: "Historical Migrated Story from 2024",
      status: "published",
      workflowStatus: "Published",
      accessPolicy: "public",
      desk: "Public Health",
      publishedAt: "2024-05-10T10:00:00Z",
      deadlineAt: null,
      scheduledAt: null
    },
    // 2. Story with status="scheduled" but NO scheduledAt -> MUST NOT infer scheduled publication from status alone
    {
      id: "22222222-2222-4222-8222-222222222222",
      title: "Unscheduled Status Only Story",
      status: "scheduled",
      workflowStatus: "Ready",
      accessPolicy: "public",
      desk: "Policy",
      publishedAt: null,
      deadlineAt: "invalid-date-value",
      scheduledAt: null
    },
    // 3. Story with both valid deadlineAt and valid scheduledAt -> produces 2 distinct derived items
    {
      id: "33333333-3333-4333-8333-333333333333",
      title: "National Vaccine Cold-Chain Investigation",
      status: "draft",
      workflowStatus: "Editor review",
      accessPolicy: "premium",
      desk: "Investigations",
      publishedAt: null,
      deadlineAt: new Date(2026, 9, 16, 16, 0, 0).toISOString(), // Today 16:00
      scheduledAt: new Date(2026, 9, 17, 9, 0, 0).toISOString() // Tomorrow 09:00
    },
    // 4. Published story with old deadlineAt -> terminal, NOT overdue
    {
      id: "44444444-4444-4444-8444-444444444444",
      title: "Published Story With Past Deadline",
      status: "published",
      workflowStatus: "Published",
      accessPolicy: "public",
      desk: "Clinical",
      publishedAt: new Date(2026, 9, 14, 12, 0, 0).toISOString(),
      deadlineAt: new Date(2026, 9, 14, 9, 0, 0).toISOString(),
      scheduledAt: null
    },
    // 5. Story with past scheduledAt -> past_scheduled, NOT overdue
    {
      id: "55555555-5555-4555-8555-555555555555",
      title: "Past Scheduled Publication Window",
      status: "scheduled",
      workflowStatus: "Ready",
      accessPolicy: "public",
      desk: "Policy",
      publishedAt: null,
      deadlineAt: null,
      scheduledAt: new Date(2026, 9, 14, 15, 0, 0).toISOString()
    }
  ];

  const assignments = [
    // 1. Active assignment with past deadline -> Overdue
    {
      id: "aaaaaaaa-1111-4111-8111-111111111111",
      storyId: "33333333-3333-4333-8333-333333333333",
      title: "Field Reporting at Harare Central Hospital",
      reporterStaffId: "rep-1",
      assignedEditorStaffId: null,
      desk: "Investigations",
      deadlineAt: new Date(2026, 9, 15, 18, 0, 0).toISOString(), // Yesterday
      priority: "Urgent",
      notes: null,
      status: "Reporting",
      assignedBy: "mgr-1",
      updatedAt: new Date(2026, 9, 15, 10, 0, 0).toISOString()
    },
    // 2. Complete assignment with past deadline -> Completed, NOT Overdue
    {
      id: "bbbbbbbb-2222-4222-8222-222222222222",
      storyId: null,
      title: "Completed Oncology Supply Check",
      reporterStaffId: "rep-2",
      assignedEditorStaffId: null,
      desk: "Clinical",
      deadlineAt: new Date(2026, 9, 13, 12, 0, 0).toISOString(),
      priority: "High",
      notes: null,
      status: "Complete",
      assignedBy: "mgr-1",
      updatedAt: new Date(2026, 9, 14, 10, 0, 0).toISOString()
    },
    // 3. Assignment with invalid deadline -> ignored safely
    {
      id: "cccccccc-3333-4333-8333-333333333333",
      storyId: null,
      title: "Assignment With Bad Date",
      reporterStaffId: "rep-2",
      assignedEditorStaffId: null,
      desk: "Clinical",
      deadlineAt: "bad-date",
      priority: "Normal",
      notes: null,
      status: "Assigned",
      assignedBy: "mgr-1",
      updatedAt: new Date(2026, 9, 14, 10, 0, 0).toISOString()
    }
  ];

  const items = deriveEditorialCalendarItems(stories, assignments, nowMs);

  // Historical published story (#1), status-only scheduled story (#2), and bad-date assignment (#3) are excluded
  const ids = items.map((i) => i.id);
  assert.ok(!ids.some((id) => id.includes("11111111-1111-4111-8111-111111111111")));
  assert.ok(!ids.some((id) => id.includes("22222222-2222-4222-8222-222222222222")));
  assert.ok(!ids.some((id) => id.includes("cccccccc-3333-4333-8333-333333333333")));

  // Verify derived IDs
  assert.ok(ids.includes("story-deadline:33333333-3333-4333-8333-333333333333"));
  assert.ok(ids.includes("story-scheduled:33333333-3333-4333-8333-333333333333"));
  assert.ok(ids.includes("story-deadline:44444444-4444-4444-8444-444444444444"));
  assert.ok(ids.includes("story-scheduled:55555555-5555-4555-8555-555555555555"));
  assert.ok(ids.includes("assignment-deadline:aaaaaaaa-1111-4111-8111-111111111111"));
  assert.ok(ids.includes("assignment-deadline:bbbbbbbb-2222-4222-8222-222222222222"));

  // Active past assignment is overdue and sorted first
  assert.equal(items[0].id, "assignment-deadline:aaaaaaaa-1111-4111-8111-111111111111");
  assert.equal(items[0].isOverdue, true);
  assert.equal(items[0].urgency, "overdue");
  assert.equal(items[0].storyId, "33333333-3333-4333-8333-333333333333");

  // Complete assignment is NOT overdue
  const completeAssignmentItem = items.find(
    (i) => i.id === "assignment-deadline:bbbbbbbb-2222-4222-8222-222222222222"
  );
  assert.equal(completeAssignmentItem.isOverdue, false);
  assert.equal(completeAssignmentItem.urgency, "completed");

  // Published story deadline is NOT overdue
  const publishedDeadlineItem = items.find(
    (i) => i.id === "story-deadline:44444444-4444-4444-8444-444444444444"
  );
  assert.equal(publishedDeadlineItem.isOverdue, false);
  assert.equal(publishedDeadlineItem.urgency, "completed");

  // Past scheduled publication is NOT overdue
  const pastScheduledItem = items.find(
    (i) => i.id === "story-scheduled:55555555-5555-4555-8555-555555555555"
  );
  assert.equal(pastScheduledItem.isOverdue, false);
  assert.equal(pastScheduledItem.urgency, "past_scheduled");

  // Summary metrics
  const summary = computeCalendarSummaryMetrics(items, nowMs);
  assert.equal(summary.todayCount, 1); // Today 16:00 story deadline
  assert.equal(summary.next7DaysCount, 2); // Today 16:00 + Tomorrow 09:00
  assert.equal(summary.overdueDeadlinesCount, 1); // Only active past assignment
  assert.equal(summary.scheduledPublicationsCount, 2);
  assert.equal(summary.assignmentDeadlinesCount, 2);

  // 7-day planning strip
  const weekStrip = buildSevenDayPlanningStrip(items, nowMs);
  assert.equal(weekStrip.length, 7);
  assert.equal(weekStrip[0].isToday, true);
  assert.equal(weekStrip[0].items.length, 1);
  assert.equal(weekStrip[1].isTomorrow, true);
  assert.equal(weekStrip[1].items.length, 1);

  // Filtering
  const investigationsOnly = filterEditorialCalendarItems(
    items,
    { desk: "Investigations" },
    nowMs
  );
  assert.equal(investigationsOnly.length, 3);

  const scheduledOnly = filterEditorialCalendarItems(
    items,
    { eventKind: "scheduled_publication" },
    nowMs
  );
  assert.equal(scheduledOnly.length, 2);
});

test("HT-NR-03B-R1: Canonical migrated status='publish' normalization prevents false overdue deadlines and summary inflation", () => {
  // 1. Raw migrated published state (5786 live rows: status="publish", workflowStatus=null)
  assert.equal(
    isStoryTerminalState({ status: "publish", workflowStatus: null }),
    true
  );

  // 2. Normalized workflow state (3 live rows: status="publish", workflowStatus="Published")
  assert.equal(
    isStoryTerminalState({ status: "publish", workflowStatus: "Published" }),
    true
  );

  // 3. Published alias
  assert.equal(
    isStoryTerminalState({ status: "published", workflowStatus: null }),
    true
  );

  // 4. Archived states
  assert.equal(
    isStoryTerminalState({ status: "archived", workflowStatus: null }),
    true
  );
  assert.equal(
    isStoryTerminalState({ status: "draft", workflowStatus: "Archived" }),
    true
  );

  // 5. Non-terminal active editorial states
  assert.equal(
    isStoryTerminalState({ status: "draft", workflowStatus: "Submitted" }),
    false
  );
  assert.equal(
    isStoryTerminalState({ status: "draft", workflowStatus: null }),
    false
  );
  assert.equal(
    isStoryTerminalState({ status: "scheduled", workflowStatus: "Ready" }),
    false
  );

  // 6. Overdue & Summary protection for status="publish", workflowStatus=null with past deadlineAt and scheduledAt
  const nowMs = new Date(2026, 9, 16, 12, 0, 0).getTime();
  const migratedPublishedWithDates = [
    {
      id: "66666666-6666-4666-8666-666666666666",
      title: "Migrated Published Story With Historical Deadline",
      status: "publish",
      workflowStatus: null,
      accessPolicy: "public",
      desk: "Public Health",
      publishedAt: new Date(2026, 9, 10, 12, 0, 0).toISOString(),
      deadlineAt: new Date(2026, 9, 9, 17, 0, 0).toISOString(),
      scheduledAt: new Date(2026, 9, 10, 11, 0, 0).toISOString()
    }
  ];

  const derived = deriveEditorialCalendarItems(migratedPublishedWithDates, [], nowMs);
  assert.equal(derived.length, 2);

  const deadlineProjection = derived.find((i) => i.eventKind === "story_deadline");
  assert.ok(deadlineProjection);
  assert.equal(deadlineProjection.isTerminal, true);
  assert.equal(deadlineProjection.isOverdue, false);
  assert.equal(deadlineProjection.urgency, "completed");
  assert.equal(deadlineProjection.horizonBucket, "past");

  const scheduledProjection = derived.find((i) => i.eventKind === "scheduled_publication");
  assert.ok(scheduledProjection);
  assert.equal(scheduledProjection.isTerminal, true);
  assert.equal(scheduledProjection.isOverdue, false);
  assert.equal(scheduledProjection.urgency, "past_scheduled");

  const summary = computeCalendarSummaryMetrics(derived, nowMs);
  assert.equal(
    summary.overdueDeadlinesCount,
    0,
    "Past deadline on a status='publish' story must never increment overdueDeadlinesCount"
  );
});

test("HT-NR-03B: Empty state, partial/full source error states, and deep handoffs behave truthfully", async () => {
  const pushedRoutes = [];
  const managerSnapshot = {
    status: "authorized",
    source: "server",
    staffProfileId: "mgr-1",
    capabilities: ["assignment.manage", "story.edit_all"]
  };

  async function renderCalendarScenario({
    storiesResult,
    assignmentsResult,
    snapshot = managerSnapshot
  }) {
    const states = [];
    let stateIdx = 0;
    let effectRan = false;

    const mod = loadTs("src/ui/StudioEditorialCalendar.tsx", {
      mocks: {
        react: {
          useState: (init) => {
            const idx = stateIdx++;
            if (!(idx in states)) {
              states[idx] = typeof init === "function" ? init() : init;
            }
            const setState = (val) => {
              states[idx] = typeof val === "function" ? val(states[idx]) : val;
            };
            return [states[idx], setState];
          },
          useMemo: (fn) => fn(),
          useEffect: (fn) => {
            if (!effectRan) {
              effectRan = true;
              fn();
            }
          }
        },
        "react-native": {
          Pressable: "Pressable",
          ScrollView: "ScrollView",
          StyleSheet: { create: (s) => s },
          Text: "Text",
          TextInput: "TextInput",
          View: "View",
          useWindowDimensions: () => ({ width: 1200, height: 800 })
        },
        "expo-router": {
          useRouter: () => ({
            push: (route) => {
              pushedRoutes.push(route);
            }
          })
        },
        "../services": {
          services: {
            newsroomStories: {
              listStories: async () => {
                if (storiesResult instanceof Error) throw storiesResult;
                return storiesResult;
              }
            },
            newsroomCommunication: {
              listAssignments: async () => {
                if (assignmentsResult instanceof Error) throw assignmentsResult;
                return assignmentsResult;
              }
            },
            authorization: {
              getSnapshot: async () => snapshot
            }
          }
        },
        "../hooks/useAsync": {
          useAsync: () => ({ data: snapshot, loading: false, error: null })
        },
        "../security/capabilities": {
          hasServerCapability: (snap, cap) =>
            snap?.status === "authorized" &&
            snap?.source === "server" &&
            Array.isArray(snap?.capabilities) &&
            snap.capabilities.includes(cap)
        },
        "react/jsx-runtime": {
          jsx: (type, props) => ({ type, props }),
          jsxs: (type, props) => ({ type, props })
        }
      }
    });

    // First render (loading state before promises settle)
    stateIdx = 0;
    const initialTree = mod.StudioEditorialCalendar();
    const initialTexts = collectTexts(initialTree).join(" | ");

    await new Promise((r) => setTimeout(r, 15));

    // Second render after promises settle
    stateIdx = 0;
    const settledTree = mod.StudioEditorialCalendar();
    const settledTexts = collectTexts(settledTree).join(" | ");

    return { initialTexts, settledTree, settledTexts };
  }

  // 1. Loading state & Empty state when both sources return []
  const emptyScenario = await renderCalendarScenario({
    storiesResult: [],
    assignmentsResult: []
  });
  assert.ok(
    emptyScenario.initialTexts.includes("Loading server-authorized editorial agenda…"),
    "Must show loading state before server requests settle"
  );
  assert.ok(
    emptyScenario.settledTexts.includes(
      "No scheduled publications or editorial deadlines are currently available in your server-authorized Newsroom scope."
    ),
    "Must show canonical empty state message when both sources succeed with 0 dated items"
  );

  // 2. Partial source failure (story source fails, assignment source succeeds)
  const partialScenario = await renderCalendarScenario({
    storiesResult: new Error("Story RPC timeout"),
    assignmentsResult: []
  });
  assert.ok(
    partialScenario.settledTexts.includes(
      "Partial Editorial Agenda — Incomplete Source Authority"
    ),
    "Must visibly warn when one canonical source fails"
  );
  assert.ok(
    partialScenario.settledTexts.includes("Story RPC timeout"),
    "Must surface the failing source error message"
  );
  assert.ok(
    !partialScenario.settledTexts.includes(
      "No scheduled publications or editorial deadlines are currently available in your server-authorized Newsroom scope."
    ),
    "Must NOT claim a normal empty state when a canonical source failed"
  );

  // 3. Both sources fail
  const bothFailedScenario = await renderCalendarScenario({
    storiesResult: new Error("Stories unavailable"),
    assignmentsResult: new Error("Assignments unavailable")
  });
  assert.ok(
    bothFailedScenario.settledTexts.includes("Editorial Agenda Sources Unavailable"),
    "Must show full error state when both sources fail"
  );

  // 4. Deep handoffs to Story Workspace, Assignments, and Planning
  pushedRoutes.length = 0;
  const storyUuid = "33333333-3333-4333-8333-333333333333";
  const assignmentUuid = "aaaaaaaa-1111-4111-8111-111111111111";
  const handoffScenario = await renderCalendarScenario({
    storiesResult: [
      {
        id: storyUuid,
        title: "Handoff Test Story",
        status: "draft",
        workflowStatus: "Draft",
        accessPolicy: "public",
        desk: "Policy",
        publishedAt: null,
        deadlineAt: "2026-10-20T12:00:00Z",
        scheduledAt: null
      }
    ],
    assignmentsResult: [
      {
        id: assignmentUuid,
        storyId: storyUuid,
        title: "Handoff Test Assignment",
        reporterStaffId: "rep-1",
        assignedEditorStaffId: null,
        desk: "Policy",
        deadlineAt: "2026-10-19T12:00:00Z",
        priority: "High",
        notes: null,
        status: "Assigned",
        assignedBy: "mgr-1",
        updatedAt: "2026-10-16T08:00:00Z"
      }
    ]
  });

  const pressables = findPressables(handoffScenario.settledTree);
  const openStoryBtn = pressables.find((p) => collectTexts(p).join("") === "Open Story");
  const openAssignmentBtn = pressables.find(
    (p) => collectTexts(p).join("") === "Open Assignment"
  );
  const openPlanningBtn = pressables.find(
    (p) => collectTexts(p).join("") === "Open Planning"
  );

  assert.ok(openStoryBtn, "Must render Open Story handoff button");
  assert.ok(openAssignmentBtn, "Must render Open Assignment handoff button");
  assert.ok(openPlanningBtn, "Must render Open Planning handoff button for planning-authorized staff");

  openStoryBtn.props.onPress();
  openAssignmentBtn.props.onPress();
  openPlanningBtn.props.onPress();

  assert.deepEqual(pushedRoutes, [
    { pathname: "/studio/[module]", params: { module: "create-edit", storyId: storyUuid } },
    {
      pathname: "/studio/[module]",
      params: { module: "assignments", assignmentId: assignmentUuid }
    },
    { pathname: "/studio/[module]", params: { module: "planning" } }
  ]);
});

test("HT-NR-03B: Read-only boundary, no localStorage, no fake fixtures, and frozen server/planning scope", () => {
  const calendarSource = read("src/ui/StudioEditorialCalendar.tsx");

  // Consumes accepted services only
  assert.match(calendarSource, /services\.newsroomStories\s*\.\s*listStories/);
  assert.match(calendarSource, /services\.newsroomCommunication\s*\.\s*listAssignments/);

  // No direct Supabase table queries or mutations
  assert.equal(calendarSource.includes('.from("stories")'), false);
  assert.equal(calendarSource.includes('.from("story_assignments")'), false);
  assert.equal(calendarSource.includes("saveStory"), false);
  assert.equal(calendarSource.includes("transitionStory"), false);
  assert.equal(calendarSource.includes("createAssignment"), false);
  assert.equal(calendarSource.includes("progressAssignment"), false);
  assert.equal(calendarSource.includes("localStorage"), false);
  assert.equal(calendarSource.includes("audience_campaigns"), false);

  // 62 pre-Presentation baseline migrations + HT-NR-04B public presentation RPC
  // + HT-NR-04B-R1 public presentation safety replacement
  // + HT-NR-05B-R1 story-media integrity RPC/helper
  // + HT-NR-05C video desk foundation + HT-NR-05C-A-R1 video url safety + HT-NR-05C-A-R2 video url port safety + HT-NR-05C-B public watch delivery + HT-NR-05D-A live desk foundation = 70 exact migrations.
  const migrationsDir = path.resolve(root, "../../supabase/migrations");
  const migrationFiles = fs.readdirSync(migrationsDir);
  assert.equal(
    migrationFiles.length,
    72,
    `Migration files count must be exactly 72 at HT-NR-05D-B-R1 authority, found ${migrationFiles.length}`
  );
});
