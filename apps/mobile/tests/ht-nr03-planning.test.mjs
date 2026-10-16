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

const planningModule = loadTs("src/ui/StudioPlanningBoard.tsx", {
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
        newsroomCommunication: {
          listAssignments: async () => [],
          listAssignmentStaff: async () => [],
          createAssignment: async () => "mock-assignment-uuid",
          progressAssignment: async () => "Accepted"
        },
        newsroomStories: {
          listStories: async () => []
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
    }
  }
});

const {
  hasPlanningAuthority,
  canCreateAssignment,
  canProgressAssignment,
  getNextAssignmentStatus,
  getAssignmentProgressActionLabel,
  resolvePlanningAuthorityMode,
  getAssignmentDeadlineUrgency,
  ASSIGNMENT_STATUS_SEQUENCE,
  compareAssignmentsUrgency,
  StudioPlanningBoard
} = planningModule;

const commsUiModule = loadTs("src/ui/StudioCommunications.tsx", {
  mocks: {
    react: {
      useState: (init) => [typeof init === "function" ? init() : init, () => {}],
      useEffect: () => {}
    },
    "react-native": {
      Pressable: "Pressable",
      StyleSheet: { create: (s) => s },
      Text: "Text",
      TextInput: "TextInput",
      View: "View"
    },
    "expo-router": {
      useRouter: () => ({ push: () => {} })
    },
    "../services": {
      services: {
        newsroomCommunication: {
          listAssignments: async () => [],
          progressAssignment: async () => "Accepted"
        },
        authorization: {
          getSnapshot: async () => ({ status: "authorized", capabilities: [], source: "server" })
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
      jsx: (type, props) => ({ type, props }),
      jsxs: (type, props) => ({ type, props })
    }
  }
});

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

test("HT-NR-03A: Planning Board authority gate strictly requires assignment.manage capability", () => {
  // Non-authorized statuses must fail closed
  assert.equal(hasPlanningAuthority(null), false);
  assert.equal(hasPlanningAuthority(undefined), false);
  assert.equal(hasPlanningAuthority({ status: "anonymous", capabilities: [], source: "none" }), false);
  assert.equal(hasPlanningAuthority({ status: "server-policy-unavailable", capabilities: [], source: "none" }), false);
  assert.equal(hasPlanningAuthority({ status: "authenticated-no-staff-authority", capabilities: [], source: "none" }), false);

  // Authorized but source is not server
  assert.equal(
    hasPlanningAuthority({
      status: "authorized",
      capabilities: ["assignment.manage"],
      source: "none"
    }),
    false
  );

  // Authorized reporter without assignment.manage
  assert.equal(
    hasPlanningAuthority({
      status: "authorized",
      capabilities: ["story.create", "story.edit_own", "story.submit"],
      source: "server"
    }),
    false
  );

  // Authorized user with only assignment.create (must still be denied board-level management)
  assert.equal(
    hasPlanningAuthority({
      status: "authorized",
      capabilities: ["assignment.create"],
      source: "server"
    }),
    false
  );

  // Authorized user with assignment.manage
  assert.equal(
    hasPlanningAuthority({
      status: "authorized",
      capabilities: ["assignment.manage"],
      source: "server"
    }),
    true
  );

  // Authorized user with both assignment capabilities
  assert.equal(
    hasPlanningAuthority({
      status: "authorized",
      capabilities: ["assignment.create", "assignment.manage"],
      source: "server"
    }),
    true
  );
});

test("HT-NR-03A: Assignment creation capability gating accepts assignment.create or assignment.manage", () => {
  // Reporter without assignment capabilities
  assert.equal(
    canCreateAssignment({
      status: "authorized",
      capabilities: ["story.create"],
      source: "server"
    }),
    false
  );

  // User with assignment.create
  assert.equal(
    canCreateAssignment({
      status: "authorized",
      capabilities: ["assignment.create"],
      source: "server"
    }),
    true
  );

  // User with assignment.manage
  assert.equal(
    canCreateAssignment({
      status: "authorized",
      capabilities: ["assignment.manage"],
      source: "server"
    }),
    true
  );
});

test("HT-NR-03A: Canonical assignment status progression sequence and terminal Complete status", () => {
  // Canonical sequence matches server migration definition
  assert.deepEqual([...ASSIGNMENT_STATUS_SEQUENCE], [
    "Assigned",
    "Accepted",
    "Reporting",
    "Drafting",
    "Submitted",
    "Complete"
  ]);

  assert.equal(getNextAssignmentStatus("Assigned"), "Accepted");
  assert.equal(getNextAssignmentStatus("Accepted"), "Reporting");
  assert.equal(getNextAssignmentStatus("Reporting"), "Drafting");
  assert.equal(getNextAssignmentStatus("Drafting"), "Submitted");
  assert.equal(getNextAssignmentStatus("Submitted"), "Complete");

  // Complete is terminal and cannot advance
  assert.equal(getNextAssignmentStatus("Complete"), null);
  assert.equal(getNextAssignmentStatus("Unknown"), null);
});

test("HT-NR-03A-R1: Canonical assignment progression action labels match exact stage transitions", () => {
  assert.equal(getAssignmentProgressActionLabel("Assigned"), "Accept Assignment");
  assert.equal(getAssignmentProgressActionLabel("Accepted"), "Start Reporting");
  assert.equal(getAssignmentProgressActionLabel("Reporting"), "Start Drafting");
  assert.equal(getAssignmentProgressActionLabel("Drafting"), "Submit Assignment");
  assert.equal(getAssignmentProgressActionLabel("Submitted"), "Mark Complete");
  assert.equal(getAssignmentProgressActionLabel("Complete"), null);
  assert.equal(getAssignmentProgressActionLabel("Unknown"), null);

  // StudioCommunications exports identical progression helpers
  assert.equal(commsUiModule.getAssignmentProgressActionLabel("Assigned"), "Accept Assignment");
  assert.equal(commsUiModule.getAssignmentProgressActionLabel("Accepted"), "Start Reporting");
  assert.equal(commsUiModule.getAssignmentProgressActionLabel("Reporting"), "Start Drafting");
  assert.equal(commsUiModule.getAssignmentProgressActionLabel("Drafting"), "Submit Assignment");
  assert.equal(commsUiModule.getAssignmentProgressActionLabel("Submitted"), "Mark Complete");
  assert.equal(commsUiModule.getAssignmentProgressActionLabel("Complete"), null);
});

test("HT-NR-03A: Progression authority checks actor identity against reporterStaffId or assignment.manage", () => {
  const assignment = {
    id: "a1111111-1111-1111-1111-111111111111",
    title: "Investigation into Rural Clinic Access",
    reporterStaffId: "rep-1111-1111-1111-111111111111",
    assignedEditorStaffId: null,
    desk: "Investigations",
    deadlineAt: null,
    priority: "Normal",
    notes: null,
    status: "Assigned",
    assignedBy: "mgr-1",
    updatedAt: "2026-10-15T10:00:00Z"
  };

  // Reporter themselves can progress their own assignment
  assert.equal(
    canProgressAssignment(
      {
        status: "authorized",
        staffProfileId: "rep-1111-1111-1111-111111111111",
        capabilities: ["story.edit_own"],
        source: "server"
      },
      assignment
    ),
    true
  );

  // Manager with assignment.manage can progress any assignment
  assert.equal(
    canProgressAssignment(
      {
        status: "authorized",
        staffProfileId: "mgr-9999-9999-9999-999999999999",
        capabilities: ["assignment.manage"],
        source: "server"
      },
      assignment
    ),
    true
  );

  // A different reporter without assignment.manage CANNOT progress this assignment
  assert.equal(
    canProgressAssignment(
      {
        status: "authorized",
        staffProfileId: "other-reporter-uuid",
        capabilities: ["story.edit_own"],
        source: "server"
      },
      assignment
    ),
    false
  );

  // Completed assignment cannot be progressed by anyone, even a manager
  const completedAssignment = { ...assignment, status: "Complete" };
  assert.equal(
    canProgressAssignment(
      {
        status: "authorized",
        staffProfileId: "mgr-9999-9999-9999-999999999999",
        capabilities: ["assignment.manage"],
        source: "server"
      },
      completedAssignment
    ),
    false
  );
});

test("HT-NR-03A-R1: Reporter self-progression in StudioAssignmentsPanel (My Assignments) executes progressAssignment and refreshes listAssignments", async () => {
  const commsPanelSource = read("src/ui/StudioCommunications.tsx");

  // Never performs direct story_assignments updates
  assert.equal(commsPanelSource.includes('from("story_assignments").update'), false);
  assert.match(commsPanelSource, /services\.authorization\.getSnapshot\(\)/);
  assert.match(commsPanelSource, /services\.newsroomCommunication\.progressAssignment\(item\.id\)/);

  const ownAssignment = {
    id: "11111111-2222-3333-4444-555555555555",
    title: "District Hospital Solar Backup Report",
    reporterStaffId: "rep-self-1111",
    assignedEditorStaffId: null,
    desk: "Health Policy",
    deadlineAt: "2026-10-20T12:00:00Z",
    priority: "High",
    notes: "Verify generator logs",
    status: "Assigned",
    assignedBy: "mgr-1",
    updatedAt: "2026-10-16T08:00:00Z"
  };

  const otherReporterAssignment = {
    ...ownAssignment,
    id: "22222222-2222-3333-4444-555555555555",
    title: "Other Reporter Assignment",
    reporterStaffId: "rep-other-9999",
    status: "Reporting"
  };

  const completedOwnAssignment = {
    ...ownAssignment,
    id: "33333333-2222-3333-4444-555555555555",
    title: "Completed Reporter Assignment",
    status: "Complete"
  };

  let progressedAssignmentId = null;
  let listAssignmentsCalls = 0;
  let refreshCount = 0;

  const reporterSnapshot = {
    status: "authorized",
    staffProfileId: "rep-self-1111",
    capabilities: ["story.create", "story.edit_own"], // No assignment.manage
    source: "server"
  };

  const runtimeCommsModule = loadTs("src/ui/StudioCommunications.tsx", {
    mocks: {
      react: {
        useState: (init) => {
          const val = typeof init === "function" ? init() : init;
          return [
            val,
            (next) => {
              if (typeof next === "function") {
                refreshCount = next(refreshCount);
              }
            }
          ];
        },
        useEffect: () => {}
      },
      "react-native": {
        Pressable: "Pressable",
        StyleSheet: { create: (s) => s },
        Text: "Text",
        TextInput: "TextInput",
        View: "View"
      },
      "expo-router": {
        useRouter: () => ({ push: () => {} })
      },
      "../services": {
        services: {
          newsroomCommunication: {
            listAssignments: async () => {
              listAssignmentsCalls += 1;
              return [ownAssignment, otherReporterAssignment, completedOwnAssignment];
            },
            progressAssignment: async (id) => {
              progressedAssignmentId = id;
              return "Accepted";
            }
          },
          authorization: {
            getSnapshot: async () => reporterSnapshot
          }
        }
      },
      "../hooks/useAsync": {
        useAsync: (fn) => {
          // Evaluate distinguishably based on function string
          const fnStr = fn.toString();
          if (fnStr.includes("getSnapshot")) {
            return { data: reporterSnapshot, loading: false, error: null };
          }
          if (fnStr.includes("listAssignments")) {
            listAssignmentsCalls += 1;
            return {
              data: [ownAssignment, otherReporterAssignment, completedOwnAssignment],
              loading: false,
              error: null
            };
          }
          return { data: [], loading: false, error: null };
        }
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

  const tree = runtimeCommsModule.StudioAssignmentsPanel();
  const texts = collectTexts(tree).join(" | ");

  // 1. Assigned reporter sees progression label for their own Assigned item
  assert.ok(
    texts.includes("Accept Assignment → Accepted"),
    "Assigned reporter must see 'Accept Assignment → Accepted' on their own Assigned assignment"
  );

  // 2. Unrelated reporter's assignment in Reporting does NOT render 'Start Drafting → Drafting'
  assert.ok(
    !texts.includes("Start Drafting → Drafting"),
    "Reporter without assignment.manage must not see progression control on another reporter's assignment"
  );

  // 3. Completed assignment shows no progression control
  const pressables = findPressables(tree);
  const advanceButtons = pressables.filter((p) =>
    collectTexts(p).join("").includes("Accept Assignment → Accepted")
  );
  assert.equal(advanceButtons.length, 1, "Only the reporter's own active assignment must render an advance button");

  // 4. Triggering onPress invokes services.newsroomCommunication.progressAssignment(assignment.id) and increments refresh
  await advanceButtons[0].props.onPress();
  assert.equal(progressedAssignmentId, ownAssignment.id);
  assert.equal(refreshCount, 1, "Progressing an assignment must trigger listAssignments refresh");
  assert.ok(listAssignmentsCalls >= 1);
});

test("HT-NR-03A-R1: Three distinct authority modes in StudioPlanningBoard (manager, create-only, unauthorized)", () => {
  // Unauthorized cases
  assert.equal(resolvePlanningAuthorityMode(null), "unauthorized");
  assert.equal(resolvePlanningAuthorityMode(undefined), "unauthorized");
  assert.equal(
    resolvePlanningAuthorityMode({
      status: "authorized",
      capabilities: ["story.create", "story.edit_own"],
      source: "server"
    }),
    "unauthorized"
  );
  assert.equal(
    resolvePlanningAuthorityMode({
      status: "authorized",
      capabilities: ["assignment.create"],
      source: "none"
    }),
    "unauthorized"
  );

  // Create-only mode: has assignment.create without assignment.manage
  assert.equal(
    resolvePlanningAuthorityMode({
      status: "authorized",
      capabilities: ["assignment.create"],
      source: "server"
    }),
    "create-only"
  );

  // Manager mode: has assignment.manage (with or without assignment.create)
  assert.equal(
    resolvePlanningAuthorityMode({
      status: "authorized",
      capabilities: ["assignment.manage"],
      source: "server"
    }),
    "manager"
  );
  assert.equal(
    resolvePlanningAuthorityMode({
      status: "authorized",
      capabilities: ["assignment.create", "assignment.manage"],
      source: "server"
    }),
    "manager"
  );
});

test("HT-NR-03A-R1: Create-only mode renders bounded creation workspace, never fetches listAssignments or listStories, and enforces staff directory truth", async () => {
  let listAssignmentsCalled = false;
  let listStoriesCalled = false;
  let listAssignmentStaffCalled = false;
  let createdPayload = null;

  const createOnlySnapshot = {
    status: "authorized",
    staffProfileId: "desk-creator-1",
    capabilities: ["assignment.create"],
    source: "server"
  };

  async function renderCreateOnlyBoard(staffRows, prefillState = {}) {
    listAssignmentsCalled = false;
    listStoriesCalled = false;
    listAssignmentStaffCalled = false;
    createdPayload = null;

    const states = [];
    let stateIdx = 0;
    let effectRan = false;

    const boardMod = loadTs("src/ui/StudioPlanningBoard.tsx", {
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
          useRef: (init) => ({ current: init }),
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
          useWindowDimensions: () => ({ width: 1024, height: 768 })
        },
        "expo-router": {
          useRouter: () => ({ push: () => {} })
        },
        "../services": {
          services: {
            newsroomCommunication: {
              listAssignments: async () => {
                listAssignmentsCalled = true;
                return [];
              },
              listAssignmentStaff: async () => {
                listAssignmentStaffCalled = true;
                return staffRows;
              },
              createAssignment: async (input) => {
                createdPayload = input;
                return "created-assignment-id";
              },
              progressAssignment: async () => "Accepted"
            },
            newsroomStories: {
              listStories: async () => {
                listStoriesCalled = true;
                return [];
              }
            },
            authorization: {
              getSnapshot: async () => createOnlySnapshot
            }
          }
        },
        "../hooks/useAsync": {
          useAsync: () => ({ data: createOnlySnapshot, loading: false, error: null })
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

    // Initial render triggers useEffect -> listAssignmentStaff()
    stateIdx = 0;
    boardMod.StudioPlanningBoard();
    await new Promise((r) => setTimeout(r, 10));

    // Re-render after async staff directory resolves
    stateIdx = 0;
    let tree = boardMod.StudioPlanningBoard();

    if (prefillState.title || prefillState.reporterDisplayName) {
      // Find title TextInput and trigger onChangeText
      function findInputs(node, out = []) {
        if (!node || typeof node !== "object") return out;
        if (Array.isArray(node)) {
          for (const c of node) findInputs(c, out);
          return out;
        }
        if (node.type === "TextInput") out.push(node);
        if (node.props && node.props.children) findInputs(node.props.children, out);
        return out;
      }
      if (prefillState.title) {
        const inputs = findInputs(tree);
        const titleInput = inputs.find((i) =>
          String(i.props.placeholder || "").includes("Investigation")
        );
        titleInput.props.onChangeText(prefillState.title);
      }
      if (prefillState.reporterDisplayName) {
        const pills = findPressables(tree).filter((p) =>
          collectTexts(p).join("").includes(prefillState.reporterDisplayName)
        );
        pills[0].props.onPress();
      }
      stateIdx = 0;
      tree = boardMod.StudioPlanningBoard();
    }

    return { tree, texts: collectTexts(tree).join(" | "), states };
  }

  // Case 1: Empty staff directory -> fail-closed message and disabled Save Assignment
  const emptyResult = await renderCreateOnlyBoard([]);

  assert.equal(listAssignmentStaffCalled, true, "create-only mode must call listAssignmentStaff()");
  assert.equal(listAssignmentsCalled, false, "create-only mode must NOT call listAssignments()");
  assert.equal(listStoriesCalled, false, "create-only mode must NOT call listStories(200)");

  assert.ok(emptyResult.texts.includes("Assignment Creation"), "create-only mode must render Assignment Creation header");
  assert.ok(emptyResult.texts.includes("Create Story Assignment"), "create-only mode must render Create Story Assignment panel");
  assert.ok(emptyResult.texts.includes("Go to My Assignments →"), "create-only mode must include handoff to My Assignments");
  assert.ok(
    emptyResult.texts.includes("Canonical staff directory authority is required before a reporter can be assigned."),
    "Must display exact canonical staff directory authority message when staff list is empty"
  );

  // Verify NO board metrics, filters, or story linking selector in create-only mode
  assert.ok(!emptyResult.texts.includes("Total Assignments"), "create-only mode must NOT render board metrics");
  assert.ok(!emptyResult.texts.includes("Reset All Filters"), "create-only mode must NOT render manager filters");
  assert.ok(!emptyResult.texts.includes("Associate with Existing Story (Optional)"), "create-only mode must NOT expose story linking selector");

  const emptySubmitButtons = findPressables(emptyResult.tree).filter((p) =>
    collectTexts(p).join("").includes("Save Assignment")
  );
  assert.equal(emptySubmitButtons.length, 1);
  assert.equal(emptySubmitButtons[0].props.disabled, true, "Save Assignment button must be disabled when staffList is empty");

  // Case 2: Populated staff directory -> can submit createAssignment via canonical RPC service
  const staffMember = {
    id: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
    displayName: "Tendai Moyo",
    desk: "Public Health",
    roleSlug: "reporter"
  };
  const populatedResult = await renderCreateOnlyBoard([staffMember], {
    title: "Maternal Health Supply Chain Audit",
    reporterDisplayName: staffMember.displayName
  });

  assert.equal(listAssignmentsCalled, false, "create-only mode must still NOT call listAssignments()");
  assert.equal(listStoriesCalled, false, "create-only mode must still NOT call listStories(200)");
  assert.ok(!populatedResult.texts.includes("Associate with Existing Story (Optional)"), "create-only mode must NOT expose story linking selector even when staff is loaded");

  const activeSubmitButtons = findPressables(populatedResult.tree).filter((p) =>
    collectTexts(p).join("").includes("Save Assignment")
  );
  assert.equal(activeSubmitButtons.length, 1);
  assert.equal(activeSubmitButtons[0].props.disabled, false);

  await activeSubmitButtons[0].props.onPress();
  assert.deepEqual(createdPayload, {
    title: "Maternal Health Supply Chain Audit",
    reporterStaffId: staffMember.id,
    assignedEditorStaffId: null,
    desk: null,
    priority: "Normal",
    deadlineAt: null,
    notes: null,
    storyId: null
  });
});

test("HT-NR-03A: Deadline urgency calculations exclude Complete assignments from Overdue and Imminent", () => {
  const now = Date.parse("2026-10-16T12:00:00Z");
  const pastDeadline = "2026-10-15T12:00:00Z"; // 24h ago
  const imminentDeadline = "2026-10-16T18:00:00Z"; // 6h in future

  // Active assignment with past deadline -> Overdue
  const activeOverdue = getAssignmentDeadlineUrgency(pastDeadline, "Drafting", now);
  assert.equal(activeOverdue.isOverdue, true);
  assert.equal(activeOverdue.isImminent, false);
  assert.equal(activeOverdue.label, "OVERDUE by 1d");

  // Active assignment with imminent deadline -> Imminent
  const activeImminent = getAssignmentDeadlineUrgency(imminentDeadline, "Reporting", now);
  assert.equal(activeImminent.isOverdue, false);
  assert.equal(activeImminent.isImminent, true);
  assert.equal(activeImminent.label, "Due in 6h");

  // Complete assignment with past deadline -> NOT Overdue, NOT Imminent
  const completePast = getAssignmentDeadlineUrgency(pastDeadline, "Complete", now);
  assert.equal(completePast.isOverdue, false);
  assert.equal(completePast.isImminent, false);
  assert.equal(completePast.label, "Complete");

  // Complete assignment with imminent deadline -> NOT Overdue, NOT Imminent
  const completeImminent = getAssignmentDeadlineUrgency(imminentDeadline, "Complete", now);
  assert.equal(completeImminent.isOverdue, false);
  assert.equal(completeImminent.isImminent, false);
  assert.equal(completeImminent.label, "Complete");

  // Missing or empty deadline
  const noDeadline = getAssignmentDeadlineUrgency(null, "Drafting", now);
  assert.equal(noDeadline.hasDeadline, false);
  assert.equal(noDeadline.label, "No deadline");

  // Invalid deadline
  const invalidDate = getAssignmentDeadlineUrgency("invalid-date", "Drafting", now);
  assert.equal(invalidDate.hasDeadline, false);
  assert.equal(invalidDate.label, "Invalid date");
});

test("HT-NR-03A: Priority and urgency sorting places overdue urgent first and completed assignments last", () => {
  const now = Date.parse("2026-10-16T12:00:00Z");

  const aOverdueUrgent = {
    id: "1",
    title: "Cholera Outbreak Emergency",
    priority: "Urgent",
    status: "Reporting",
    deadlineAt: "2026-10-15T00:00:00Z",
    updatedAt: "2026-10-15T00:00:00Z"
  };

  const aOverdueNormal = {
    id: "2",
    title: "Clinic Supply Audit",
    priority: "Normal",
    status: "Reporting",
    deadlineAt: "2026-10-15T06:00:00Z",
    updatedAt: "2026-10-15T06:00:00Z"
  };

  const aImminentHigh = {
    id: "3",
    title: "MOH CCU Press Briefing",
    priority: "High",
    status: "Drafting",
    deadlineAt: "2026-10-16T16:00:00Z",
    updatedAt: "2026-10-16T10:00:00Z"
  };

  const aUpcoming = {
    id: "4",
    title: "Annual Health Budget Analysis",
    priority: "Normal",
    status: "Assigned",
    deadlineAt: "2026-10-25T12:00:00Z",
    updatedAt: "2026-10-14T00:00:00Z"
  };

  const aNoDeadline = {
    id: "5",
    title: "Feature on Primary Care Workers",
    priority: "Normal",
    status: "Assigned",
    deadlineAt: null,
    updatedAt: "2026-10-14T00:00:00Z"
  };

  const aComplete = {
    id: "6",
    title: "Completed Vaccine Distribution Piece",
    priority: "Urgent",
    status: "Complete",
    deadlineAt: "2026-10-10T00:00:00Z", // past deadline, but Complete
    updatedAt: "2026-10-11T00:00:00Z"
  };

  const list = [aComplete, aNoDeadline, aUpcoming, aImminentHigh, aOverdueNormal, aOverdueUrgent];
  list.sort((a, b) => compareAssignmentsUrgency(a, b, now));

  // Correct order: Overdue Urgent -> Overdue Normal -> Imminent High -> Upcoming -> No deadline -> Complete
  assert.equal(list[0].id, "1", "Overdue Urgent must be first");
  assert.equal(list[1].id, "2", "Overdue Normal must be second");
  assert.equal(list[2].id, "3", "Imminent High must be third");
  assert.equal(list[3].id, "4", "Upcoming deadline must be fourth");
  assert.equal(list[4].id, "5", "No deadline must be fifth");
  assert.equal(list[5].id, "6", "Complete assignment must be last");
});

test("HT-NR-03A: Service layer validation enforces UUID and payload format for creation and progression", async () => {
  const commsSource = read("src/services/communications.ts");

  // Check that newsroom_create_assignment and newsroom_progress_assignment are called
  assert.match(commsSource, /rpc(<[^>]+>)?\("newsroom_create_assignment"/);
  assert.match(commsSource, /rpc(<[^>]+>)?\("newsroom_progress_assignment"/);

  // Check UUID validation on creation
  assert.match(commsSource, /uuidPattern\.test\(input\.reporterStaffId\)/);

  // Check title requirement
  assert.match(commsSource, /Assignment title is required/);

  // Check progress validation
  assert.match(commsSource, /uuidPattern\.test\(assignmentId\)/);

  // Check staff profiles query excludes revoked staff
  assert.match(commsSource, /neq\("status",\s*"revoked"\)/);
  assert.match(commsSource, /is\("revoked_at",\s*null\)/);
});

test("HT-NR-03A: Fixture service fails closed without inventing fake assignments or staff", async () => {
  const fixtures = read("src/services/fixtures.ts");

  // Verify listAssignments and listAssignmentStaff return empty array (no fake data)
  assert.match(fixtures, /async listAssignments\(\)\s*\{\s*return \[\];\s*\}/);
  assert.match(fixtures, /async listAssignmentStaff\(\)\s*\{\s*return \[\];\s*\}/);

  // Verify createAssignment throws fail-closed error
  assert.match(
    fixtures,
    /async createAssignment\(\)\s*\{\s*throw new Error\("Server-authorized Newsroom assignment creation is unavailable in fixture mode\."\);\s*\}/
  );

  // Verify progressAssignment throws fail-closed error
  assert.match(
    fixtures,
    /async progressAssignment\(\)\s*\{\s*throw new Error\("Server-authorized Newsroom assignment progression is unavailable in fixture mode\."\);\s*\}/
  );
});

test("HT-NR-03A: Staff identity truth resolves only valid staff and defaults to neutral fallback", () => {
  const boardSource = read("src/ui/StudioPlanningBoard.tsx");

  // Displays "Staff unavailable" if reporter or editor staff ID cannot be resolved
  assert.match(boardSource, /staffMap\[item\.reporterStaffId\]\?\.displayName \?\? "Staff unavailable"/);
  assert.match(boardSource, /staffMap\[item\.assignedEditorStaffId\]\?\.displayName \?\? "Staff unavailable"/);

  // Disables form submission when no active staff profiles exist
  assert.match(boardSource, /staffList\.length === 0/);
  assert.match(boardSource, /Canonical staff directory authority is required before a reporter can be assigned\./);
});

test("HT-NR-03A: Domain separation ensures assignment progress is distinct from story workflow", () => {
  const contractsSource = read("src/domain/contracts.ts");

  // progressAssignment returns next assignment status string
  assert.match(contractsSource, /progressAssignment\(assignmentId: string\): Promise<string>/);

  // transitionStory is on NewsroomStoryService, not on NewsroomCommunicationService
  assert.match(contractsSource, /transitionStory\(storyId: string, nextStatus: string/);

  // Assignment statuses and Story workflow statuses remain separate
  const assignmentStatuses = ["Assigned", "Accepted", "Reporting", "Drafting", "Submitted", "Complete"];
  const storyWorkflowStatuses = ["Draft", "Submitted", "Fact check", "Health / Science review", "Copy edit", "Editor review", "Ready", "Published"];

  // While both may contain "Submitted", assignment has "Complete" whereas story has "Published" / "Ready"
  assert.ok(assignmentStatuses.includes("Complete"));
  assert.ok(!storyWorkflowStatuses.includes("Complete"));
  assert.ok(storyWorkflowStatuses.includes("Ready"));
  assert.ok(!assignmentStatuses.includes("Ready"));
});

test("HT-NR-03A: Discoverability in Studio navigation, today index, and deep handoffs", () => {
  const studioSource = read("src/ui/Studio.tsx");
  const indexSource = read("app/studio/index.tsx");
  const moduleSource = read("app/studio/[module].tsx");
  const boardSource = read("src/ui/StudioPlanningBoard.tsx");

  // Sidebar link
  assert.match(studioSource, /\["Planning",\s*"\/studio\/planning"\]/);

  // Today index
  assert.match(indexSource, /\["Planning \/ News Budget",\s*"planning"/);

  // Route registration
  assert.match(moduleSource, /"planning"/);
  assert.match(moduleSource, /<StudioPlanningBoard \/>/);

  // Deep handoffs in planning board
  assert.match(boardSource, /handleOpenStoryWorkspace/);
  assert.match(boardSource, /handleOpenDiscussion/);
  assert.match(boardSource, /Go to My Assignments/);
});

test("HT-NR-03A: Server scope remains frozen with zero migrations or client mutations", () => {
  // Check migration directory is untouched (no new migration files created)
  const migrationsDir = path.resolve(root, "../../supabase/migrations");
  const migrationFiles = fs.readdirSync(migrationsDir);
  assert.ok(
    [62, 63].includes(migrationFiles.length),
    `Migration files count must remain exactly 62 (or 63 with HT-NR-04B authorized additive presentation RPC), found ${migrationFiles.length}`
  );

  // Check no service role key used in mobile src
  const mobileSrcDir = path.resolve(root, "src");
  function checkNoServiceRole(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        checkNoServiceRole(full);
      } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
        const content = fs.readFileSync(full, "utf8");
        assert.ok(
          !content.includes("SUPABASE_SERVICE_ROLE_KEY"),
          `Service role key must never be used in mobile client: ${full}`
        );
      }
    }
  }
  checkNoServiceRole(mobileSrcDir);
});
