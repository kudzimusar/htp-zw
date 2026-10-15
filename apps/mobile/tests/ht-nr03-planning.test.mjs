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
  getAssignmentDeadlineUrgency,
  ASSIGNMENT_STATUS_SEQUENCE,
  compareAssignmentsUrgency,
  StudioPlanningBoard
} = planningModule;

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
  assert.match(boardSource, /No Active Staff Profiles/);
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
  assert.equal(
    migrationFiles.length,
    62,
    `Migration files count must remain exactly 62, found ${migrationFiles.length}`
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
