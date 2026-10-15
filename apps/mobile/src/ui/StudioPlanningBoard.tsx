import { useState, useMemo, useEffect } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions
} from "react-native";
import { useRouter } from "expo-router";
import { services } from "../services";
import { useAsync } from "../hooks/useAsync";
import {
  hasServerCapability,
  type AuthorizationSnapshot
} from "../security/capabilities";
import type {
  NewsroomAssignment,
  NewsroomPlanningStaff,
  NewsroomStory,
  CreateAssignmentInput
} from "../domain/models";
import { colors, radius, spacing, breakpoints } from "../theme/tokens";

export const ASSIGNMENT_STATUS_SEQUENCE = [
  "Assigned",
  "Accepted",
  "Reporting",
  "Drafting",
  "Submitted",
  "Complete"
] as const;

export type AssignmentStatus = (typeof ASSIGNMENT_STATUS_SEQUENCE)[number];

export function hasPlanningAuthority(
  snapshot: AuthorizationSnapshot | null | undefined
): boolean {
  if (!snapshot) return false;
  if (snapshot.status !== "authorized" || snapshot.source !== "server") {
    return false;
  }
  return hasServerCapability(snapshot, "assignment.manage");
}

export function canCreateAssignment(
  snapshot: AuthorizationSnapshot | null | undefined
): boolean {
  if (!snapshot || snapshot.status !== "authorized" || snapshot.source !== "server") {
    return false;
  }
  return (
    hasServerCapability(snapshot, "assignment.create") ||
    hasServerCapability(snapshot, "assignment.manage")
  );
}

export function canProgressAssignment(
  snapshot: AuthorizationSnapshot | null | undefined,
  assignment: NewsroomAssignment
): boolean {
  if (!snapshot || snapshot.status !== "authorized" || snapshot.source !== "server") {
    return false;
  }
  if (assignment.status === "Complete") {
    return false;
  }
  const isManager = hasServerCapability(snapshot, "assignment.manage");
  const isReporter = Boolean(
    snapshot.staffProfileId && snapshot.staffProfileId === assignment.reporterStaffId
  );
  return isManager || isReporter;
}

export function getNextAssignmentStatus(currentStatus: string): string | null {
  switch (currentStatus) {
    case "Assigned":
      return "Accepted";
    case "Accepted":
      return "Reporting";
    case "Reporting":
      return "Drafting";
    case "Drafting":
      return "Submitted";
    case "Submitted":
      return "Complete";
    default:
      return null;
  }
}

export function getAssignmentDeadlineUrgency(
  deadlineAt: string | null | undefined,
  status?: string,
  now = Date.now()
): {
  isOverdue: boolean;
  isImminent: boolean;
  hasDeadline: boolean;
  label: string;
  diffMs: number | null;
} {
  if (status === "Complete") {
    return {
      isOverdue: false,
      isImminent: false,
      hasDeadline: Boolean(deadlineAt && deadlineAt.trim()),
      label: "Complete",
      diffMs: null
    };
  }

  if (!deadlineAt || !deadlineAt.trim()) {
    return {
      isOverdue: false,
      isImminent: false,
      hasDeadline: false,
      label: "No deadline",
      diffMs: null
    };
  }

  const deadlineMs = Date.parse(deadlineAt);
  if (Number.isNaN(deadlineMs)) {
    return {
      isOverdue: false,
      isImminent: false,
      hasDeadline: false,
      label: "Invalid date",
      diffMs: null
    };
  }

  const diffMs = deadlineMs - now;
  const isOverdue = diffMs < 0;
  const isImminent = !isOverdue && diffMs <= 24 * 60 * 60 * 1000;

  if (isOverdue) {
    const hoursAgo = Math.floor(Math.abs(diffMs) / (60 * 60 * 1000));
    const daysAgo = Math.floor(hoursAgo / 24);
    const label =
      daysAgo > 0
        ? `OVERDUE by ${daysAgo}d`
        : `OVERDUE by ${Math.max(1, hoursAgo)}h`;
    return { isOverdue: true, isImminent: false, hasDeadline: true, label, diffMs };
  }

  if (isImminent) {
    const hoursLeft = Math.ceil(diffMs / (60 * 60 * 1000));
    const label = `Due in ${Math.max(1, hoursLeft)}h`;
    return { isOverdue: false, isImminent: true, hasDeadline: true, label, diffMs };
  }

  const daysLeft = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
  const label =
    daysLeft <= 7
      ? `Due in ${daysLeft}d`
      : new Date(deadlineMs).toLocaleDateString();
  return { isOverdue: false, isImminent: false, hasDeadline: true, label, diffMs };
}

export type PlanningSortMode = "urgency" | "deadline" | "priority" | "status" | "recent";

export function compareAssignmentsUrgency(
  a: NewsroomAssignment,
  b: NewsroomAssignment,
  now = Date.now()
): number {
  const aComplete = a.status === "Complete";
  const bComplete = b.status === "Complete";
  if (aComplete !== bComplete) {
    return aComplete ? 1 : -1;
  }
  if (aComplete && bComplete) {
    return Date.parse(b.updatedAt || "") - Date.parse(a.updatedAt || "");
  }

  const aUrg = getAssignmentDeadlineUrgency(a.deadlineAt, a.status, now);
  const bUrg = getAssignmentDeadlineUrgency(b.deadlineAt, b.status, now);

  const aPrioUrgent = (a.priority || "").toLowerCase() === "urgent";
  const bPrioUrgent = (b.priority || "").toLowerCase() === "urgent";

  // 1. Overdue Urgent
  const aOverdueUrgent = aUrg.isOverdue && aPrioUrgent;
  const bOverdueUrgent = bUrg.isOverdue && bPrioUrgent;
  if (aOverdueUrgent !== bOverdueUrgent) return aOverdueUrgent ? -1 : 1;

  // 2. Overdue
  if (aUrg.isOverdue !== bUrg.isOverdue) return aUrg.isOverdue ? -1 : 1;
  if (aUrg.isOverdue && bUrg.isOverdue) {
    return (aUrg.diffMs ?? 0) - (bUrg.diffMs ?? 0);
  }

  // 3. Imminent (<24h)
  if (aUrg.isImminent !== bUrg.isImminent) return aUrg.isImminent ? -1 : 1;
  if (aUrg.isImminent && bUrg.isImminent) {
    return (aUrg.diffMs ?? 0) - (bUrg.diffMs ?? 0);
  }

  // 4. Priority
  const prioWeight = (p: string) => {
    const lower = (p || "").toLowerCase();
    if (lower === "urgent") return 3;
    if (lower === "high") return 2;
    return 1;
  };
  const pwA = prioWeight(a.priority);
  const pwB = prioWeight(b.priority);
  if (pwA !== pwB) return pwB - pwA;

  // 5. Deadline (has deadline before no deadline)
  if (aUrg.hasDeadline !== bUrg.hasDeadline) return aUrg.hasDeadline ? -1 : 1;
  if (aUrg.hasDeadline && bUrg.hasDeadline && aUrg.diffMs !== null && bUrg.diffMs !== null) {
    return aUrg.diffMs - bUrg.diffMs;
  }

  // 6. Updated at desc
  return Date.parse(b.updatedAt || "") - Date.parse(a.updatedAt || "");
}

function getStatusBadgeStyle(status: string) {
  switch (status) {
    case "Complete":
      return { bg: "#ECFDF5", text: colors.success, border: "#A7F3D0" };
    case "Submitted":
      return { bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE" };
    case "Drafting":
      return { bg: "#F5F3FF", text: "#6D28D9", border: "#DDD6FE" };
    case "Reporting":
      return { bg: "#FEF3C7", text: "#B45309", border: "#FDE68A" };
    case "Accepted":
      return { bg: "#E0F2FE", text: "#0369A1", border: "#BAE6FD" };
    case "Assigned":
    default:
      return { bg: "#F1F5F9", text: "#475569", border: "#CBD5E1" };
  }
}

function getPriorityBadgeStyle(priority: string) {
  const p = (priority || "").toLowerCase();
  if (p === "urgent") {
    return { bg: "#FEF2F2", text: colors.live, border: "#FECACA" };
  }
  if (p === "high") {
    return { bg: "#FFF7ED", text: "#C2410C", border: "#FFEDD5" };
  }
  return { bg: "#F8FAFC", text: "#64748B", border: "#E2E8F0" };
}

export function StudioPlanningBoard() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= breakpoints.tablet && width < breakpoints.desktop;
  const isDesktop = width >= breakpoints.desktop;

  const [refreshKey, setRefreshKey] = useState(0);

  // Filters & Sorting
  const [statusFilter, setStatusFilter] = useState<string>("Active");
  const [priorityFilter, setPriorityFilter] = useState<string>("All");
  const [deskFilter, setDeskFilter] = useState<string>("All");
  const [reporterFilter, setReporterFilter] = useState<string>("All");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [storyLinkFilter, setStoryLinkFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<PlanningSortMode>("urgency");

  // Create Form State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newReporterStaffId, setNewReporterStaffId] = useState("");
  const [newAssignedEditorStaffId, setNewAssignedEditorStaffId] = useState("");
  const [newDesk, setNewDesk] = useState("");
  const [newPriority, setNewPriority] = useState("Normal");
  const [newDeadlineAt, setNewDeadlineAt] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newStoryId, setNewStoryId] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Progression Action State
  const [progressingId, setProgressingId] = useState<string | null>(null);
  const [progressError, setProgressError] = useState<string | null>(null);

  // Server authorization snapshot
  const authAsync = useAsync(
    () => services.authorization.getSnapshot(),
    [refreshKey]
  );
  const authSnapshot = authAsync.data;
  const isAuthorized = hasPlanningAuthority(authSnapshot);
  const canCreate = canCreateAssignment(authSnapshot);

  // Conditional workload retrieval: only fetch when planning authority is proven
  const [assignmentsState, setAssignmentsState] = useState<{
    data: NewsroomAssignment[] | null;
    loading: boolean;
    error: Error | null;
  }>({
    data: null,
    loading: false,
    error: null
  });

  const [staffState, setStaffState] = useState<{
    data: NewsroomPlanningStaff[] | null;
    loading: boolean;
    error: Error | null;
  }>({
    data: null,
    loading: false,
    error: null
  });

  const [storiesState, setStoriesState] = useState<{
    data: NewsroomStory[] | null;
    loading: boolean;
    error: Error | null;
  }>({
    data: null,
    loading: false,
    error: null
  });

  useEffect(() => {
    if (!isAuthorized) {
      setAssignmentsState({ data: null, loading: false, error: null });
      setStaffState({ data: null, loading: false, error: null });
      setStoriesState({ data: null, loading: false, error: null });
      return;
    }

    let active = true;
    setAssignmentsState((prev) => ({ ...prev, loading: true, error: null }));
    setStaffState((prev) => ({ ...prev, loading: true, error: null }));
    setStoriesState((prev) => ({ ...prev, loading: true, error: null }));

    services.newsroomCommunication
      .listAssignments()
      .then((assignments) => {
        if (active) setAssignmentsState({ data: assignments, loading: false, error: null });
      })
      .catch((err) => {
        if (active)
          setAssignmentsState({
            data: null,
            loading: false,
            error: err instanceof Error ? err : new Error(String(err))
          });
      });

    services.newsroomCommunication
      .listAssignmentStaff()
      .then((staff) => {
        if (active) setStaffState({ data: staff, loading: false, error: null });
      })
      .catch((err) => {
        if (active)
          setStaffState({
            data: null,
            loading: false,
            error: err instanceof Error ? err : new Error(String(err))
          });
      });

    services.newsroomStories
      .listStories(200)
      .then((stories) => {
        if (active) setStoriesState({ data: stories, loading: false, error: null });
      })
      .catch((err) => {
        if (active)
          setStoriesState({
            data: null,
            loading: false,
            error: err instanceof Error ? err : new Error(String(err))
          });
      });

    return () => {
      active = false;
    };
  }, [isAuthorized, refreshKey]);

  const rawAssignments = assignmentsState.data ?? [];
  const staffList = staffState.data ?? [];
  const storiesList = storiesState.data ?? [];

  // Staff lookup map: id -> NewsroomPlanningStaff
  const staffMap = useMemo(() => {
    const map: Record<string, NewsroomPlanningStaff> = {};
    for (const member of staffList) {
      if (member.id) {
        map[member.id] = member;
      }
    }
    return map;
  }, [staffList]);

  // Stories lookup map: id -> NewsroomStory
  const storiesMap = useMemo(() => {
    const map: Record<string, NewsroomStory> = {};
    for (const story of storiesList) {
      if (story.id) {
        map[story.id] = story;
      }
    }
    return map;
  }, [storiesList]);

  // Summary counts
  const summaryCounts = useMemo(() => {
    const now = Date.now();
    let totalActive = 0;
    let overdue = 0;
    let imminent = 0;
    let highOrUrgent = 0;
    let complete = 0;

    for (const item of rawAssignments) {
      if (item.status === "Complete") {
        complete++;
        continue;
      }
      totalActive++;
      const urg = getAssignmentDeadlineUrgency(item.deadlineAt, item.status, now);
      if (urg.isOverdue) overdue++;
      if (urg.isImminent) imminent++;
      const p = (item.priority || "").toLowerCase();
      if (p === "urgent" || p === "high") highOrUrgent++;
    }

    return { totalActive, overdue, imminent, highOrUrgent, complete };
  }, [rawAssignments]);

  // Dynamic desks available across assignments
  const availableDesks = useMemo(() => {
    const set = new Set<string>();
    for (const item of rawAssignments) {
      if (item.desk && item.desk.trim()) {
        set.add(item.desk.trim());
      }
    }
    return ["All", ...Array.from(set).sort()];
  }, [rawAssignments]);

  // Dynamic reporters available across assignments (only named staff or "All")
  const availableReporters = useMemo(() => {
    const set = new Set<string>();
    for (const item of rawAssignments) {
      if (item.reporterStaffId) {
        set.add(item.reporterStaffId);
      }
    }
    const list = Array.from(set).map((id) => ({
      id,
      name: staffMap[id]?.displayName ?? "Staff unavailable"
    }));
    return [{ id: "All", name: "All Reporters" }, ...list.sort((a, b) => a.name.localeCompare(b.name))];
  }, [rawAssignments, staffMap]);

  // Filtered and Sorted assignments
  const displayedAssignments = useMemo(() => {
    const now = Date.now();
    return rawAssignments
      .filter((item) => {
        // Status filter
        if (statusFilter === "Active" && item.status === "Complete") {
          return false;
        }
        if (statusFilter !== "All" && statusFilter !== "Active" && item.status !== statusFilter) {
          return false;
        }

        // Priority filter
        if (priorityFilter !== "All" && (item.priority || "").toLowerCase() !== priorityFilter.toLowerCase()) {
          return false;
        }

        // Desk filter
        if (deskFilter !== "All" && (item.desk || "").trim() !== deskFilter) {
          return false;
        }

        // Reporter filter
        if (reporterFilter !== "All" && item.reporterStaffId !== reporterFilter) {
          return false;
        }

        // Overdue only toggle
        if (overdueOnly) {
          const urg = getAssignmentDeadlineUrgency(item.deadlineAt, item.status, now);
          if (!urg.isOverdue) return false;
        }

        // Story link filter
        if (storyLinkFilter === "Linked" && !item.storyId) return false;
        if (storyLinkFilter === "Unlinked" && item.storyId) return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchTitle = (item.title || "").toLowerCase().includes(q);
          const matchNotes = (item.notes || "").toLowerCase().includes(q);
          const matchDesk = (item.desk || "").toLowerCase().includes(q);
          const reporterName = staffMap[item.reporterStaffId]?.displayName || "";
          const matchReporter = reporterName.toLowerCase().includes(q);
          if (!matchTitle && !matchNotes && !matchDesk && !matchReporter) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortMode === "urgency") {
          return compareAssignmentsUrgency(a, b, now);
        }
        if (sortMode === "deadline") {
          const aComplete = a.status === "Complete";
          const bComplete = b.status === "Complete";
          if (aComplete !== bComplete) return aComplete ? 1 : -1;
          const aTime = a.deadlineAt ? Date.parse(a.deadlineAt) : Infinity;
          const bTime = b.deadlineAt ? Date.parse(b.deadlineAt) : Infinity;
          if (aTime !== bTime) return aTime - bTime;
          return Date.parse(b.updatedAt || "") - Date.parse(a.updatedAt || "");
        }
        if (sortMode === "priority") {
          const aComplete = a.status === "Complete";
          const bComplete = b.status === "Complete";
          if (aComplete !== bComplete) return aComplete ? 1 : -1;
          const prioWeight = (p: string) => {
            const lower = (p || "").toLowerCase();
            if (lower === "urgent") return 3;
            if (lower === "high") return 2;
            return 1;
          };
          const pwA = prioWeight(a.priority);
          const pwB = prioWeight(b.priority);
          if (pwA !== pwB) return pwB - pwA;
          return Date.parse(b.updatedAt || "") - Date.parse(a.updatedAt || "");
        }
        if (sortMode === "status") {
          const statusOrder: Record<string, number> = {
            Assigned: 1,
            Accepted: 2,
            Reporting: 3,
            Drafting: 4,
            Submitted: 5,
            Complete: 6
          };
          const oA = statusOrder[a.status] ?? 99;
          const oB = statusOrder[b.status] ?? 99;
          if (oA !== oB) return oA - oB;
          return Date.parse(b.updatedAt || "") - Date.parse(a.updatedAt || "");
        }
        if (sortMode === "recent") {
          return Date.parse(b.updatedAt || "") - Date.parse(a.updatedAt || "");
        }
        return 0;
      });
  }, [
    rawAssignments,
    statusFilter,
    priorityFilter,
    deskFilter,
    reporterFilter,
    overdueOnly,
    storyLinkFilter,
    searchQuery,
    sortMode,
    staffMap
  ]);

  // Handlers
  const handleCreateAssignment = async () => {
    if (!newTitle.trim()) {
      setFormError("Title is required.");
      return;
    }
    if (!newReporterStaffId.trim()) {
      setFormError("A valid reporter staff member must be selected.");
      return;
    }

    try {
      setFormSubmitting(true);
      setFormError(null);
      setFormSuccess(null);

      const payload: CreateAssignmentInput = {
        title: newTitle.trim(),
        reporterStaffId: newReporterStaffId.trim(),
        assignedEditorStaffId: newAssignedEditorStaffId.trim() || null,
        desk: newDesk.trim() || null,
        priority: newPriority,
        deadlineAt: newDeadlineAt.trim() || null,
        notes: newNotes.trim() || null,
        storyId: newStoryId.trim() || null
      };

      await services.newsroomCommunication.createAssignment(payload);

      setFormSuccess("Assignment created successfully.");
      setNewTitle("");
      setNewReporterStaffId("");
      setNewAssignedEditorStaffId("");
      setNewDesk("");
      setNewPriority("Normal");
      setNewDeadlineAt("");
      setNewNotes("");
      setNewStoryId("");
      setIsCreateOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      setFormError(err?.message || "Failed to create assignment.");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleProgressAssignment = async (assignment: NewsroomAssignment) => {
    try {
      setProgressingId(assignment.id);
      setProgressError(null);
      await services.newsroomCommunication.progressAssignment(assignment.id);
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      setProgressError(err?.message || "Failed to progress assignment status.");
    } finally {
      setProgressingId(null);
    }
  };

  const handleOpenStoryWorkspace = (storyId: string) => {
    router.push({
      pathname: "/studio/[module]",
      params: { module: "create-edit", storyId }
    });
  };

  const handleOpenDiscussion = (assignmentId: string) => {
    router.push({
      pathname: "/studio/[module]",
      params: { module: "assignments", assignmentId }
    });
  };

  // Fail-closed authorization views
  if (authAsync.loading) {
    return (
      <View style={styles.container}>
        <View style={styles.stateContainer}>
          <Text style={styles.loadingText}>Verifying assignment planning authority with server…</Text>
        </View>
      </View>
    );
  }

  if (authAsync.error || authSnapshot?.status === "server-policy-unavailable") {
    return (
      <View style={styles.container}>
        <View style={styles.stateContainer}>
          <Text style={styles.errorTitle}>Server Policy Unavailable</Text>
          <Text style={styles.errorText}>
            Unable to verify staff authorization policy from server. Planning board access is fail-closed.
          </Text>
          <Pressable style={styles.retryBtn} onPress={() => setRefreshKey((k) => k + 1)}>
            <Text style={styles.retryBtnText}>Retry Authorization Check</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (authSnapshot?.status === "anonymous") {
    return (
      <View style={styles.container}>
        <View style={styles.stateContainer}>
          <Text style={styles.unauthorizedTitle}>Authentication Required</Text>
          <Text style={styles.unauthorizedText}>
            You must be signed in with an authorized Newsroom staff session to access the News Budget / Planning Board.
          </Text>
        </View>
      </View>
    );
  }

  if (authSnapshot?.status === "authenticated-no-staff-authority") {
    return (
      <View style={styles.container}>
        <View style={styles.stateContainer}>
          <Text style={styles.unauthorizedTitle}>Staff Authority Required</Text>
          <Text style={styles.unauthorizedText}>
            Your account is authenticated as a reader and lacks Newsroom staff authorization.
          </Text>
        </View>
      </View>
    );
  }

  if (!isAuthorized) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <View>
              <View style={styles.headerTagRow}>
                <View style={styles.livePulseDot} />
                <Text style={styles.headerSub}>HealthTimes Newsroom OS</Text>
              </View>
              <Text style={styles.title}>Planning / News Budget</Text>
            </View>
          </View>
          <Text style={styles.description}>
            Operational editorial planning, news budget and assignment management backed by canonical story assignments.
          </Text>
        </View>

        <View style={styles.stateContainer}>
          <Text style={styles.unauthorizedTitle}>Planning Authority Required</Text>
          <Text style={styles.unauthorizedText}>
            Newsroom Planning / News Budget requires assignment management authority (assignment.manage capability). Your account does not hold this capability. Individual reporters can view their personal assigned tasks in My Assignments.
          </Text>
          <Pressable
            style={styles.actionLinkBtn}
            onPress={() => router.push({ pathname: "/studio/[module]", params: { module: "assignments" } })}
          >
            <Text style={styles.actionLinkBtnText}>Go to My Assignments →</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View>
            <View style={styles.headerTagRow}>
              <View style={styles.livePulseDot} />
              <Text style={styles.headerSub}>HealthTimes Newsroom OS</Text>
            </View>
            <Text style={styles.title}>Planning / News Budget</Text>
          </View>

          <View style={styles.headerActions}>
            <Pressable
              style={styles.refreshBtn}
              onPress={() => setRefreshKey((k) => k + 1)}
            >
              <Text style={styles.refreshBtnText}>↻ Refresh</Text>
            </Pressable>

            {canCreate && (
              <Pressable
                style={[styles.primaryActionBtn, isCreateOpen && styles.primaryActionBtnActive]}
                onPress={() => setIsCreateOpen(!isCreateOpen)}
              >
                <Text style={styles.primaryActionBtnText}>
                  {isCreateOpen ? "✕ Close Form" : "+ New Assignment"}
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        <Text style={styles.description}>
          Authoritative news budget, reporter assignments, deadline triage and progress tracking.
        </Text>
      </View>

      {/* Metric Cards / Triage Strip */}
      <View style={styles.metricsStrip}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>ACTIVE ASSIGNMENTS</Text>
          <Text style={styles.metricValue}>{summaryCounts.totalActive}</Text>
          <Text style={styles.metricSub}>In reporting or drafting</Text>
        </View>

        <View style={[styles.metricCard, summaryCounts.overdue > 0 && styles.metricCardAlert]}>
          <Text style={[styles.metricLabel, summaryCounts.overdue > 0 && styles.metricLabelAlert]}>
            OVERDUE
          </Text>
          <Text style={[styles.metricValue, summaryCounts.overdue > 0 && styles.metricValueAlert]}>
            {summaryCounts.overdue}
          </Text>
          <Text style={styles.metricSub}>Past assignment deadline</Text>
        </View>

        <View style={[styles.metricCard, summaryCounts.imminent > 0 && styles.metricCardWarning]}>
          <Text style={[styles.metricLabel, summaryCounts.imminent > 0 && styles.metricLabelWarning]}>
            DUE IN 24H
          </Text>
          <Text style={[styles.metricValue, summaryCounts.imminent > 0 && styles.metricValueWarning]}>
            {summaryCounts.imminent}
          </Text>
          <Text style={styles.metricSub}>Imminent editorial deadlines</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>HIGH / URGENT</Text>
          <Text style={styles.metricValue}>{summaryCounts.highOrUrgent}</Text>
          <Text style={styles.metricSub}>Top priority reporting</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>COMPLETE</Text>
          <Text style={styles.metricValue}>{summaryCounts.complete}</Text>
          <Text style={styles.metricSub}>Terminal assignment state</Text>
        </View>
      </View>

      {/* Progression Error Banner */}
      {progressError && (
        <View style={styles.bannerError}>
          <Text style={styles.bannerErrorText}>Error progressing assignment: {progressError}</Text>
          <Pressable onPress={() => setProgressError(null)}>
            <Text style={styles.bannerDismissText}>✕</Text>
          </Pressable>
        </View>
      )}

      {/* Creation Success Banner */}
      {formSuccess && (
        <View style={styles.bannerSuccess}>
          <Text style={styles.bannerSuccessText}>{formSuccess}</Text>
          <Pressable onPress={() => setFormSuccess(null)}>
            <Text style={styles.bannerDismissText}>✕</Text>
          </Pressable>
        </View>
      )}

      {/* Collapsible Create Assignment Form */}
      {isCreateOpen && (
        <View style={styles.createPanel}>
          <Text style={styles.createPanelTitle}>Create Story Assignment</Text>
          <Text style={styles.createPanelSub}>
            Assignments record authoritative reporting briefs and associate reporters with editorial desks.
          </Text>

          {formError && (
            <View style={styles.formErrorBox}>
              <Text style={styles.formErrorText}>{formError}</Text>
            </View>
          )}

          {staffList.length === 0 ? (
            <View style={styles.staffEmptyNotice}>
              <Text style={styles.staffEmptyNoticeTitle}>No Active Staff Profiles</Text>
              <Text style={styles.staffEmptyNoticeText}>
                No active staff profiles are currently returned by the server. In accordance with HealthTimes server policy, assignments require a valid server reporter UUID and cannot be assigned to fictional identities.
              </Text>
            </View>
          ) : (
            <View style={styles.formGrid}>
              {/* Title */}
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Assignment Title *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. Investigation into Cholera Outbreak Response"
                  placeholderTextColor="#94A3B8"
                  value={newTitle}
                  onChangeText={setNewTitle}
                  editable={!formSubmitting}
                />
              </View>

              {/* Reporter Staff Selector */}
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Assigned Reporter * (Active Staff)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerScroll}>
                  {staffList.map((staff) => {
                    const isSelected = newReporterStaffId === staff.id;
                    return (
                      <Pressable
                        key={staff.id}
                        style={[styles.staffSelectPill, isSelected && styles.staffSelectPillActive]}
                        onPress={() => setNewReporterStaffId(staff.id)}
                        disabled={formSubmitting}
                      >
                        <Text style={[styles.staffSelectPillText, isSelected && styles.staffSelectPillTextActive]}>
                          {staff.displayName} {staff.desk ? `(${staff.desk})` : ""}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
                {!newReporterStaffId && (
                  <Text style={styles.fieldHint}>Select an active reporter profile above.</Text>
                )}
              </View>

              {/* Assigned Editor Staff Selector */}
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Assigned Editor (Optional)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerScroll}>
                  <Pressable
                    style={[styles.staffSelectPill, !newAssignedEditorStaffId && styles.staffSelectPillActive]}
                    onPress={() => setNewAssignedEditorStaffId("")}
                    disabled={formSubmitting}
                  >
                    <Text style={[styles.staffSelectPillText, !newAssignedEditorStaffId && styles.staffSelectPillTextActive]}>
                      None
                    </Text>
                  </Pressable>
                  {staffList.map((staff) => {
                    const isSelected = newAssignedEditorStaffId === staff.id;
                    return (
                      <Pressable
                        key={staff.id}
                        style={[styles.staffSelectPill, isSelected && styles.staffSelectPillActive]}
                        onPress={() => setNewAssignedEditorStaffId(staff.id)}
                        disabled={formSubmitting}
                      >
                        <Text style={[styles.staffSelectPillText, isSelected && styles.staffSelectPillTextActive]}>
                          {staff.displayName}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              <View style={styles.formRow}>
                {/* Desk */}
                <View style={[styles.formField, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Desk</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. Investigations, Public Health"
                    placeholderTextColor="#94A3B8"
                    value={newDesk}
                    onChangeText={setNewDesk}
                    editable={!formSubmitting}
                  />
                </View>

                {/* Priority */}
                <View style={[styles.formField, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Priority</Text>
                  <View style={styles.segmentedRow}>
                    {["Normal", "High", "Urgent"].map((prio) => {
                      const isSel = newPriority === prio;
                      return (
                        <Pressable
                          key={prio}
                          style={[styles.segmentBtn, isSel && styles.segmentBtnActive]}
                          onPress={() => setNewPriority(prio)}
                          disabled={formSubmitting}
                        >
                          <Text style={[styles.segmentBtnText, isSel && styles.segmentBtnTextActive]}>
                            {prio}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>

              {/* Deadline */}
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Deadline (ISO Timestamp, optional)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. 2026-10-20T18:00:00Z"
                  placeholderTextColor="#94A3B8"
                  value={newDeadlineAt}
                  onChangeText={setNewDeadlineAt}
                  editable={!formSubmitting}
                />
              </View>

              {/* Linked Story */}
              {storiesList.length > 0 && (
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Associate with Existing Story (Optional)</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerScroll}>
                    <Pressable
                      style={[styles.staffSelectPill, !newStoryId && styles.staffSelectPillActive]}
                      onPress={() => setNewStoryId("")}
                      disabled={formSubmitting}
                    >
                      <Text style={[styles.staffSelectPillText, !newStoryId && styles.staffSelectPillTextActive]}>
                        None (Unlinked)
                      </Text>
                    </Pressable>
                    {storiesList.map((story) => {
                      const isSelected = newStoryId === story.id;
                      return (
                        <Pressable
                          key={story.id}
                          style={[styles.staffSelectPill, isSelected && styles.staffSelectPillActive]}
                          onPress={() => setNewStoryId(story.id)}
                          disabled={formSubmitting}
                        >
                          <Text style={[styles.staffSelectPillText, isSelected && styles.staffSelectPillTextActive]}>
                            {story.title}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Notes */}
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Assignment Notes & Briefing (Optional)</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextArea]}
                  placeholder="Editorial angle, target sources, reporting instructions…"
                  placeholderTextColor="#94A3B8"
                  value={newNotes}
                  onChangeText={setNewNotes}
                  multiline
                  numberOfLines={3}
                  editable={!formSubmitting}
                />
              </View>

              {/* Form Action Buttons */}
              <View style={styles.formActionsRow}>
                <Pressable
                  style={styles.cancelBtn}
                  onPress={() => setIsCreateOpen(false)}
                  disabled={formSubmitting}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>

                <Pressable
                  style={[styles.submitBtn, (!newTitle.trim() || !newReporterStaffId.trim() || formSubmitting) && styles.submitBtnDisabled]}
                  onPress={handleCreateAssignment}
                  disabled={!newTitle.trim() || !newReporterStaffId.trim() || formSubmitting}
                >
                  <Text style={styles.submitBtnText}>
                    {formSubmitting ? "Creating…" : "Save Assignment"}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Filter Bar */}
      <View style={styles.filterSection}>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search assignments by title, notes, desk or reporter…"
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.trim().length > 0 && (
            <Pressable style={styles.searchClearBtn} onPress={() => setSearchQuery("")}>
              <Text style={styles.searchClearBtnText}>✕</Text>
            </Pressable>
          )}
        </View>

        {/* Filter Pills: Status */}
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Status:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsScroll}>
            {["Active", "All", ...ASSIGNMENT_STATUS_SEQUENCE].map((st) => {
              const isSelected = statusFilter === st;
              return (
                <Pressable
                  key={st}
                  style={[styles.filterPill, isSelected && styles.filterPillActive]}
                  onPress={() => setStatusFilter(st)}
                >
                  <Text style={[styles.filterPillText, isSelected && styles.filterPillTextActive]}>
                    {st}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Filter Pills: Priority, Overdue, Story Link */}
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Priority:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsScroll}>
            {["All", "Urgent", "High", "Normal"].map((prio) => {
              const isSelected = priorityFilter === prio;
              return (
                <Pressable
                  key={prio}
                  style={[styles.filterPill, isSelected && styles.filterPillActive]}
                  onPress={() => setPriorityFilter(prio)}
                >
                  <Text style={[styles.filterPillText, isSelected && styles.filterPillTextActive]}>
                    {prio}
                  </Text>
                </Pressable>
              );
            })}

            <Pressable
              style={[styles.filterPill, overdueOnly && styles.filterPillAlertActive]}
              onPress={() => setOverdueOnly(!overdueOnly)}
            >
              <Text style={[styles.filterPillText, overdueOnly && styles.filterPillTextAlertActive]}>
                {overdueOnly ? "✓ Overdue Only" : "Overdue Only"}
              </Text>
            </Pressable>

            {["All", "Linked", "Unlinked"].map((linkOpt) => {
              const isSelected = storyLinkFilter === linkOpt;
              return (
                <Pressable
                  key={linkOpt}
                  style={[styles.filterPill, isSelected && styles.filterPillActive]}
                  onPress={() => setStoryLinkFilter(linkOpt)}
                >
                  <Text style={[styles.filterPillText, isSelected && styles.filterPillTextActive]}>
                    {linkOpt === "All" ? "Any Story Link" : linkOpt === "Linked" ? "Linked to Story" : "Unlinked"}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Filter Pills: Desk */}
        {availableDesks.length > 2 && (
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Desk:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsScroll}>
              {availableDesks.map((d) => {
                const isSelected = deskFilter === d;
                return (
                  <Pressable
                    key={d}
                    style={[styles.filterPill, isSelected && styles.filterPillActive]}
                    onPress={() => setDeskFilter(d)}
                  >
                    <Text style={[styles.filterPillText, isSelected && styles.filterPillTextActive]}>
                      {d}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Filter Pills: Reporter */}
        {availableReporters.length > 2 && (
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Reporter:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsScroll}>
              {availableReporters.map((rep) => {
                const isSelected = reporterFilter === rep.id;
                return (
                  <Pressable
                    key={rep.id}
                    style={[styles.filterPill, isSelected && styles.filterPillActive]}
                    onPress={() => setReporterFilter(rep.id)}
                  >
                    <Text style={[styles.filterPillText, isSelected && styles.filterPillTextActive]}>
                      {rep.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Sort Controls */}
        <View style={styles.sortRow}>
          <Text style={styles.sortLabel}>Order by:</Text>
          {(
            [
              ["urgency", "Urgency & Priority"],
              ["deadline", "Deadline"],
              ["priority", "Priority"],
              ["status", "Workflow Status"],
              ["recent", "Recently Updated"]
            ] as const
          ).map(([mode, label]) => {
            const isSelected = sortMode === mode;
            return (
              <Pressable
                key={mode}
                style={[styles.sortBtn, isSelected && styles.sortBtnActive]}
                onPress={() => setSortMode(mode)}
              >
                <Text style={[styles.sortBtnText, isSelected && styles.sortBtnTextActive]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Assignment List */}
      <View style={styles.listContainer}>
        {assignmentsState.loading ? (
          <View style={styles.stateContainer}>
            <Text style={styles.loadingText}>Loading News Budget assignments from server…</Text>
          </View>
        ) : assignmentsState.error ? (
          <View style={styles.stateContainer}>
            <Text style={styles.errorTitle}>Error Loading Assignments</Text>
            <Text style={styles.errorText}>{assignmentsState.error.message}</Text>
            <Pressable style={styles.retryBtn} onPress={() => setRefreshKey((k) => k + 1)}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </Pressable>
          </View>
        ) : rawAssignments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No assignments on the News Budget.</Text>
            <Text style={styles.emptySub}>
              There are currently 0 story assignments recorded in the database.
            </Text>
            {canCreate && (
              <Pressable
                style={[styles.primaryActionBtn, { marginTop: spacing.md }]}
                onPress={() => setIsCreateOpen(true)}
              >
                <Text style={styles.primaryActionBtnText}>+ Create First Assignment</Text>
              </Pressable>
            )}
          </View>
        ) : displayedAssignments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No assignments match current filters.</Text>
            <Text style={styles.emptySub}>
              Try adjusting your status, priority, desk, or search query.
            </Text>
            <Pressable
              style={[styles.secondaryActionBtn, { marginTop: spacing.md }]}
              onPress={() => {
                setStatusFilter("Active");
                setPriorityFilter("All");
                setDeskFilter("All");
                setReporterFilter("All");
                setOverdueOnly(false);
                setStoryLinkFilter("All");
                setSearchQuery("");
              }}
            >
              <Text style={styles.secondaryActionBtnText}>Reset All Filters</Text>
            </Pressable>
          </View>
        ) : (
          displayedAssignments.map((item) => {
            const statusStyle = getStatusBadgeStyle(item.status);
            const prioStyle = getPriorityBadgeStyle(item.priority);
            const urgency = getAssignmentDeadlineUrgency(item.deadlineAt, item.status);
            const reporterName = staffMap[item.reporterStaffId]?.displayName ?? "Staff unavailable";
            const editorName = item.assignedEditorStaffId
              ? staffMap[item.assignedEditorStaffId]?.displayName ?? "Staff unavailable"
              : null;
            const linkedStory = item.storyId ? storiesMap[item.storyId] : null;
            const canProgress = canProgressAssignment(authSnapshot, item);
            const nextStatus = getNextAssignmentStatus(item.status);
            const isProgressing = progressingId === item.id;

            return (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardTopRow}>
                  <View style={styles.badgeGroup}>
                    {/* Status Badge */}
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }
                      ]}
                    >
                      <Text style={[styles.badgeText, { color: statusStyle.text }]}>
                        {item.status}
                      </Text>
                    </View>

                    {/* Priority Badge */}
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: prioStyle.bg, borderColor: prioStyle.border }
                      ]}
                    >
                      <Text style={[styles.badgeText, { color: prioStyle.text }]}>
                        {item.priority}
                      </Text>
                    </View>

                    {/* Desk Badge */}
                    {item.desk && (
                      <View style={[styles.badge, styles.deskBadge]}>
                        <Text style={styles.deskBadgeText}>{item.desk}</Text>
                      </View>
                    )}
                  </View>

                  {/* Deadline Urgency Badge */}
                  <View
                    style={[
                      styles.urgencyBadge,
                      urgency.isOverdue && styles.urgencyBadgeOverdue,
                      urgency.isImminent && styles.urgencyBadgeImminent
                    ]}
                  >
                    <Text
                      style={[
                        styles.urgencyBadgeText,
                        urgency.isOverdue && styles.urgencyBadgeTextOverdue,
                        urgency.isImminent && styles.urgencyBadgeTextImminent
                      ]}
                    >
                      {urgency.label}
                    </Text>
                  </View>
                </View>

                {/* Assignment Title */}
                <Text style={styles.cardTitle}>{item.title}</Text>

                {/* Assignment Notes */}
                {item.notes && <Text style={styles.cardNotes}>{item.notes}</Text>}

                {/* Meta Information: Reporter, Editor, Linked Story */}
                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>REPORTER</Text>
                    <Text style={styles.metaValue}>{reporterName}</Text>
                  </View>

                  {editorName && (
                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>EDITOR</Text>
                      <Text style={styles.metaValue}>{editorName}</Text>
                    </View>
                  )}

                  {item.storyId && (
                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>LINKED STORY</Text>
                      <Text style={styles.metaValue} numberOfLines={1}>
                        {linkedStory ? linkedStory.title : item.storyId.slice(0, 8) + "…"}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Card Actions */}
                <View style={styles.cardActionsRow}>
                  {/* Progression Button */}
                  {canProgress && nextStatus && (
                    <Pressable
                      style={[styles.progressBtn, isProgressing && styles.progressBtnDisabled]}
                      onPress={() => handleProgressAssignment(item)}
                      disabled={isProgressing}
                    >
                      <Text style={styles.progressBtnText}>
                        {isProgressing ? "Advancing…" : `Advance to ${nextStatus} →`}
                      </Text>
                    </Pressable>
                  )}

                  {/* Deep Handoff: Open Story Workspace */}
                  {item.storyId && (
                    <Pressable
                      style={styles.storyLinkBtn}
                      onPress={() => handleOpenStoryWorkspace(item.storyId!)}
                    >
                      <Text style={styles.storyLinkBtnText}>Open Story Workspace →</Text>
                    </Pressable>
                  )}

                  {/* Deep Handoff: Open Discussion */}
                  <Pressable
                    style={styles.discussionBtn}
                    onPress={() => handleOpenDiscussion(item.id)}
                  >
                    <Text style={styles.discussionBtnText}>Open Discussion →</Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    gap: spacing.lg
  },
  header: {
    gap: spacing.xs
  },
  headerTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  headerTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.blue
  },
  headerSub: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.blue,
    letterSpacing: 0.8,
    textTransform: "uppercase"
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.ink
  },
  description: {
    fontSize: 13,
    color: colors.inkMuted,
    lineHeight: 18
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  refreshBtn: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  refreshBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155"
  },
  primaryActionBtn: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    backgroundColor: colors.blue,
    borderWidth: 1,
    borderColor: colors.blue
  },
  primaryActionBtnActive: {
    backgroundColor: "#334155",
    borderColor: "#334155"
  },
  primaryActionBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF"
  },
  secondaryActionBtn: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignSelf: "flex-start"
  },
  secondaryActionBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569"
  },

  /* Metrics Strip */
  metricsStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  metricCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  metricCardAlert: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA"
  },
  metricCardWarning: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A"
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 0.5,
    marginBottom: 4
  },
  metricLabelAlert: {
    color: colors.live
  },
  metricLabelWarning: {
    color: "#B45309"
  },
  metricValue: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.ink
  },
  metricValueAlert: {
    color: colors.live
  },
  metricValueWarning: {
    color: "#B45309"
  },
  metricSub: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2
  },

  /* Banners */
  bannerError: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm
  },
  bannerErrorText: {
    fontSize: 12,
    color: colors.live,
    fontWeight: "600",
    flex: 1
  },
  bannerSuccess: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm
  },
  bannerSuccessText: {
    fontSize: 12,
    color: colors.success,
    fontWeight: "600",
    flex: 1
  },
  bannerDismissText: {
    fontSize: 14,
    color: "#64748B",
    paddingHorizontal: 6
  },

  /* Create Panel */
  createPanel: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    gap: spacing.md
  },
  createPanelTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.ink
  },
  createPanelSub: {
    fontSize: 12,
    color: colors.inkMuted,
    lineHeight: 16
  },
  formGrid: {
    gap: spacing.md
  },
  formRow: {
    flexDirection: "row",
    gap: spacing.md
  },
  formField: {
    gap: 4
  },
  formLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155"
  },
  formInput: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.ink,
    backgroundColor: "#F8FAFC"
  },
  formTextArea: {
    minHeight: 70,
    textAlignVertical: "top"
  },
  fieldHint: {
    fontSize: 11,
    color: "#94A3B8"
  },
  pickerScroll: {
    flexDirection: "row",
    gap: 6,
    paddingVertical: 4
  },
  staffSelectPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.md,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginRight: 6
  },
  staffSelectPillActive: {
    backgroundColor: colors.blue,
    borderColor: colors.blue
  },
  staffSelectPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569"
  },
  staffSelectPillTextActive: {
    color: "#FFFFFF"
  },
  segmentedRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: radius.md,
    overflow: "hidden"
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    backgroundColor: "#F8FAFC"
  },
  segmentBtnActive: {
    backgroundColor: colors.blue
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569"
  },
  segmentBtnTextActive: {
    color: "#FFFFFF",
    fontWeight: "700"
  },
  formActionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.xs
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#CBD5E1"
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B"
  },
  submitBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: colors.blue
  },
  submitBtnDisabled: {
    opacity: 0.5
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF"
  },
  formErrorBox: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: radius.md,
    padding: spacing.sm
  },
  formErrorText: {
    fontSize: 12,
    color: colors.live,
    fontWeight: "600"
  },
  staffEmptyNotice: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4
  },
  staffEmptyNoticeTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#B45309"
  },
  staffEmptyNoticeText: {
    fontSize: 12,
    color: "#78350F",
    lineHeight: 16
  },

  /* Filter Section */
  filterSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: spacing.sm
  },
  searchRow: {
    position: "relative"
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.ink,
    backgroundColor: "#F8FAFC"
  },
  searchClearBtn: {
    position: "absolute",
    right: 10,
    top: 9,
    padding: 2
  },
  searchClearBtnText: {
    fontSize: 12,
    color: "#94A3B8"
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    width: 60
  },
  pillsScroll: {
    flexDirection: "row",
    gap: 6
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.md,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginRight: 6
  },
  filterPillActive: {
    backgroundColor: "#334155",
    borderColor: "#334155"
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569"
  },
  filterPillTextActive: {
    color: "#FFFFFF"
  },
  filterPillAlertActive: {
    backgroundColor: colors.live,
    borderColor: colors.live
  },
  filterPillTextAlertActive: {
    color: "#FFFFFF"
  },
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9"
  },
  sortLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    width: 60
  },
  sortBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  sortBtnActive: {
    backgroundColor: "#E2E8F0",
    borderColor: "#CBD5E1"
  },
  sortBtnText: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "500"
  },
  sortBtnTextActive: {
    color: "#0F172A",
    fontWeight: "700"
  },

  /* Assignment Cards */
  listContainer: {
    gap: spacing.md
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: spacing.sm
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  badgeGroup: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    borderWidth: 1
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700"
  },
  deskBadge: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0"
  },
  deskBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B"
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  urgencyBadgeOverdue: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA"
  },
  urgencyBadgeImminent: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A"
  },
  urgencyBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B"
  },
  urgencyBadgeTextOverdue: {
    color: colors.live
  },
  urgencyBadgeTextImminent: {
    color: "#B45309"
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.ink,
    lineHeight: 22
  },
  cardNotes: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 18,
    backgroundColor: "#F8FAFC",
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#F1F5F9"
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    paddingTop: 4
  },
  metaItem: {
    gap: 2
  },
  metaLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 0.5
  },
  metaValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155"
  },
  cardActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9"
  },
  progressBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.md,
    backgroundColor: "#0F172A"
  },
  progressBtnDisabled: {
    opacity: 0.5
  },
  progressBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF"
  },
  storyLinkBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.md,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE"
  },
  storyLinkBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1D4ED8"
  },
  discussionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.md,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  discussionBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569"
  },

  /* State Containers */
  stateContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: spacing.sm
  },
  loadingText: {
    fontSize: 13,
    color: colors.inkMuted
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.live
  },
  errorText: {
    fontSize: 13,
    color: colors.inkMuted,
    textAlign: "center"
  },
  unauthorizedTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.ink
  },
  unauthorizedText: {
    fontSize: 13,
    color: colors.inkMuted,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 500
  },
  actionLinkBtn: {
    marginTop: spacing.xs,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: colors.blue
  },
  actionLinkBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF"
  },
  retryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.md,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  retryBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155"
  },
  emptyContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: spacing.xs
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.ink
  },
  emptySub: {
    fontSize: 13,
    color: colors.inkMuted,
    textAlign: "center"
  }
});
