import { useEffect, useMemo, useState } from "react";
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
  NewsroomCalendarEventKind,
  NewsroomCalendarHorizonBucket,
  NewsroomCalendarItem,
  NewsroomCalendarUrgency,
  NewsroomStory
} from "../domain/models";
import { breakpoints, colors, radius, spacing } from "../theme/tokens";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type CalendarHorizonFilter = "All" | "Today" | "Next 7 Days" | "Next 30 Days";
export type CalendarViewMode = "agenda" | "week";

export type CalendarSummaryMetrics = {
  todayCount: number;
  next7DaysCount: number;
  overdueDeadlinesCount: number;
  scheduledPublicationsCount: number;
  assignmentDeadlinesCount: number;
};

export type SevenDayPlanningSlot = {
  dateKey: string;
  label: string;
  subLabel: string;
  dayStartMs: number;
  dayEndMs: number;
  isToday: boolean;
  isTomorrow: boolean;
  items: NewsroomCalendarItem[];
};

/**
 * Editorial Calendar is available to any server-authorized Newsroom staff session.
 * Server RPC (`newsroom_list_stories`) and RLS (`story_assignments`) scope returned rows.
 */
export function hasEditorialCalendarAuthority(
  snapshot: AuthorizationSnapshot | null | undefined
): boolean {
  if (!snapshot || snapshot.status !== "authorized" || snapshot.source !== "server") {
    return false;
  }
  return true;
}

/**
 * Planning handoff is exposed only when the staff session possesses planning capabilities.
 */
export function hasPlanningHandoffAuthority(
  snapshot: AuthorizationSnapshot | null | undefined
): boolean {
  if (!hasEditorialCalendarAuthority(snapshot)) {
    return false;
  }
  return (
    hasServerCapability(snapshot!, "assignment.manage") ||
    hasServerCapability(snapshot!, "assignment.create")
  );
}

/**
 * Validates and normalizes an ISO date/time string.
 * Rejects null, empty, or unparseable strings so Invalid Date or fake midnight events never occur.
 */
export function parseCanonicalTimestamp(
  raw: string | null | undefined
): { iso: string; ms: number } | null {
  if (!raw || typeof raw !== "string") {
    return null;
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  const ms = Date.parse(trimmed);
  if (Number.isNaN(ms) || !Number.isFinite(ms)) {
    return null;
  }
  return {
    iso: new Date(ms).toISOString(),
    ms
  };
}

/**
 * Conservative terminal-state check for story deadlines:
 * Published or archived stories are not active overdue editorial deadlines.
 */
export function isStoryTerminalState(
  story: Pick<NewsroomStory, "status" | "workflowStatus">
): boolean {
  const statusLower = (story.status || "").trim().toLowerCase();
  const wfLower = (story.workflowStatus || "").trim().toLowerCase();
  return (
    statusLower === "published" ||
    statusLower === "archived" ||
    wfLower === "published" ||
    wfLower === "archived"
  );
}

/**
 * Terminal-state check for assignment deadlines:
 * Complete assignments must never be labeled overdue.
 */
export function isAssignmentTerminalState(
  assignment: Pick<NewsroomAssignment, "status">
): boolean {
  return (assignment.status || "").trim() === "Complete";
}

export function getLocalDayBounds(nowMs: number = Date.now()) {
  const nowDate = new Date(nowMs);
  const year = nowDate.getFullYear();
  const month = nowDate.getMonth();
  const date = nowDate.getDate();

  const startOfTodayMs = new Date(year, month, date, 0, 0, 0, 0).getTime();
  const startOfTomorrowMs = new Date(year, month, date + 1, 0, 0, 0, 0).getTime();
  const startOfDayPlus2Ms = new Date(year, month, date + 2, 0, 0, 0, 0).getTime();
  const startOfDayPlus7Ms = new Date(year, month, date + 7, 0, 0, 0, 0).getTime();
  const startOfDayPlus30Ms = new Date(year, month, date + 30, 0, 0, 0, 0).getTime();

  return {
    startOfTodayMs,
    startOfTomorrowMs,
    startOfDayPlus2Ms,
    startOfDayPlus7Ms,
    startOfDayPlus30Ms
  };
}

/**
 * Classifies a timestamp into deterministic urgency and agenda horizon buckets.
 * - Deadlines (`isDeadline: true`) before `nowMs` are `overdue` ONLY when `!isTerminal`.
 * - Scheduled publications (`isDeadline: false`) are NEVER labeled `overdue` even if in the past.
 */
export function classifyCalendarDateWindow(
  timestampMs: number,
  options: { isDeadline: boolean; isTerminal: boolean; nowMs?: number }
): {
  urgency: NewsroomCalendarUrgency;
  horizonBucket: NewsroomCalendarHorizonBucket;
  isOverdue: boolean;
} {
  const nowMs = options.nowMs ?? Date.now();
  const {
    startOfTodayMs,
    startOfTomorrowMs,
    startOfDayPlus2Ms,
    startOfDayPlus7Ms
  } = getLocalDayBounds(nowMs);

  if (options.isDeadline) {
    if (options.isTerminal) {
      let horizonBucket: NewsroomCalendarHorizonBucket = "past";
      if (timestampMs >= startOfTodayMs && timestampMs < startOfTomorrowMs) {
        horizonBucket = "today";
      } else if (timestampMs >= startOfTomorrowMs && timestampMs < startOfDayPlus2Ms) {
        horizonBucket = "tomorrow";
      } else if (timestampMs >= startOfDayPlus2Ms && timestampMs < startOfDayPlus7Ms) {
        horizonBucket = "next_7_days";
      } else if (timestampMs >= startOfDayPlus7Ms) {
        horizonBucket = "later";
      }
      return {
        urgency: "completed",
        horizonBucket,
        isOverdue: false
      };
    }

    if (timestampMs < nowMs) {
      return {
        urgency: "overdue",
        horizonBucket: "overdue",
        isOverdue: true
      };
    }

    if (timestampMs < startOfTomorrowMs) {
      return {
        urgency: "today",
        horizonBucket: "today",
        isOverdue: false
      };
    }

    if (timestampMs < startOfDayPlus2Ms) {
      return {
        urgency: "tomorrow",
        horizonBucket: "tomorrow",
        isOverdue: false
      };
    }

    if (timestampMs < startOfDayPlus7Ms) {
      return {
        urgency: "upcoming",
        horizonBucket: "next_7_days",
        isOverdue: false
      };
    }

    return {
      urgency: "upcoming",
      horizonBucket: "later",
      isOverdue: false
    };
  }

  // Scheduled publication: never overdue
  if (timestampMs < nowMs) {
    const isSameDayToday = timestampMs >= startOfTodayMs && timestampMs < startOfTomorrowMs;
    return {
      urgency: isSameDayToday ? "today" : "past_scheduled",
      horizonBucket: isSameDayToday ? "today" : "past",
      isOverdue: false
    };
  }

  if (timestampMs < startOfTomorrowMs) {
    return {
      urgency: "today",
      horizonBucket: "today",
      isOverdue: false
    };
  }

  if (timestampMs < startOfDayPlus2Ms) {
    return {
      urgency: "tomorrow",
      horizonBucket: "tomorrow",
      isOverdue: false
    };
  }

  if (timestampMs < startOfDayPlus7Ms) {
    return {
      urgency: "upcoming",
      horizonBucket: "next_7_days",
      isOverdue: false
    };
  }

  return {
    urgency: "upcoming",
    horizonBucket: "later",
    isOverdue: false
  };
}

export function getCalendarEventKindLabel(kind: NewsroomCalendarEventKind): string {
  switch (kind) {
    case "story_deadline":
      return "Story deadline";
    case "scheduled_publication":
      return "Scheduled publication";
    case "assignment_deadline":
      return "Assignment deadline";
  }
}

/**
 * Builds canonical read-only `NewsroomCalendarItem` projections from server-scoped stories
 * and assignments.
 * - `story.deadlineAt` -> `story-deadline:<storyUUID>`
 * - `story.scheduledAt` -> `story-scheduled:<storyUUID>`
 * - `assignment.deadlineAt` -> `assignment-deadline:<assignmentUUID>`
 * - `story.publishedAt` alone NEVER creates calendar items (no archival noise).
 */
export function deriveEditorialCalendarItems(
  stories: NewsroomStory[] | null | undefined,
  assignments: NewsroomAssignment[] | null | undefined,
  nowMs: number = Date.now()
): NewsroomCalendarItem[] {
  const items: NewsroomCalendarItem[] = [];

  for (const story of stories ?? []) {
    if (!story || typeof story.id !== "string" || !story.id.trim()) {
      continue;
    }
    const storyId = story.id.trim();
    const storyTitle = (story.title || "").trim() || "Untitled Story";
    const storyDesk = story.desk && story.desk.trim() ? story.desk.trim() : null;
    const storyWorkflow =
      (story.workflowStatus && story.workflowStatus.trim()) ||
      (story.status && story.status.trim()) ||
      "Draft";
    const storyTerminal = isStoryTerminalState(story);

    // 1. Story deadline item (only when story.deadlineAt exists and is parseable)
    const parsedDeadline = parseCanonicalTimestamp(story.deadlineAt);
    if (parsedDeadline) {
      const classification = classifyCalendarDateWindow(parsedDeadline.ms, {
        isDeadline: true,
        isTerminal: storyTerminal,
        nowMs
      });

      items.push({
        id: `story-deadline:${storyId}`,
        sourceType: "story",
        sourceId: storyId,
        title: storyTitle,
        timestamp: parsedDeadline.iso,
        timestampMs: parsedDeadline.ms,
        eventKind: "story_deadline",
        desk: storyDesk,
        workflowOrStatus: storyWorkflow,
        accessPolicy: story.accessPolicy || "public",
        priority: null,
        urgency: classification.urgency,
        horizonBucket: classification.horizonBucket,
        isOverdue: classification.isOverdue,
        isTerminal: storyTerminal,
        storyId,
        assignmentId: null
      });
    }

    // 2. Scheduled publication item (only when story.scheduledAt exists and is parseable;
    // never inferred from status alone)
    const parsedScheduled = parseCanonicalTimestamp(story.scheduledAt);
    if (parsedScheduled) {
      const classification = classifyCalendarDateWindow(parsedScheduled.ms, {
        isDeadline: false,
        isTerminal: storyTerminal,
        nowMs
      });

      items.push({
        id: `story-scheduled:${storyId}`,
        sourceType: "story",
        sourceId: storyId,
        title: storyTitle,
        timestamp: parsedScheduled.iso,
        timestampMs: parsedScheduled.ms,
        eventKind: "scheduled_publication",
        desk: storyDesk,
        workflowOrStatus: storyWorkflow,
        accessPolicy: story.accessPolicy || "public",
        priority: null,
        urgency: classification.urgency,
        horizonBucket: classification.horizonBucket,
        isOverdue: false,
        isTerminal: storyTerminal,
        storyId,
        assignmentId: null
      });
    }
  }

  for (const assignment of assignments ?? []) {
    if (!assignment || typeof assignment.id !== "string" || !assignment.id.trim()) {
      continue;
    }
    const assignmentId = assignment.id.trim();
    const parsedDeadline = parseCanonicalTimestamp(assignment.deadlineAt);
    if (!parsedDeadline) {
      continue;
    }

    const assignmentTitle = (assignment.title || "").trim() || "Untitled Assignment";
    const assignmentDesk =
      assignment.desk && assignment.desk.trim() ? assignment.desk.trim() : null;
    const assignmentStatus = (assignment.status || "").trim() || "Assigned";
    const assignmentPriority = (assignment.priority || "").trim() || "Normal";
    const assignmentTerminal = isAssignmentTerminalState(assignment);
    const linkedStoryId =
      assignment.storyId && UUID_PATTERN.test(assignment.storyId.trim())
        ? assignment.storyId.trim()
        : null;

    const classification = classifyCalendarDateWindow(parsedDeadline.ms, {
      isDeadline: true,
      isTerminal: assignmentTerminal,
      nowMs
    });

    items.push({
      id: `assignment-deadline:${assignmentId}`,
      sourceType: "assignment",
      sourceId: assignmentId,
      title: assignmentTitle,
      timestamp: parsedDeadline.iso,
      timestampMs: parsedDeadline.ms,
      eventKind: "assignment_deadline",
      desk: assignmentDesk,
      workflowOrStatus: assignmentStatus,
      accessPolicy: null,
      priority: assignmentPriority,
      urgency: classification.urgency,
      horizonBucket: classification.horizonBucket,
      isOverdue: classification.isOverdue,
      isTerminal: assignmentTerminal,
      storyId: linkedStoryId,
      assignmentId
    });
  }

  // Deterministic chronological ordering:
  // Overdue items first (earliest deadline first), then chronological by timestampMs, then stable ID
  items.sort((a, b) => {
    if (a.isOverdue !== b.isOverdue) {
      return a.isOverdue ? -1 : 1;
    }
    if (a.timestampMs !== b.timestampMs) {
      return a.timestampMs - b.timestampMs;
    }
    return a.id.localeCompare(b.id);
  });

  return items;
}

/**
 * Computes derived summary counts from canonical calendar items.
 */
export function computeCalendarSummaryMetrics(
  items: NewsroomCalendarItem[],
  nowMs: number = Date.now()
): CalendarSummaryMetrics {
  const { startOfTodayMs, startOfTomorrowMs, startOfDayPlus7Ms } = getLocalDayBounds(nowMs);

  let todayCount = 0;
  let next7DaysCount = 0;
  let overdueDeadlinesCount = 0;
  let scheduledPublicationsCount = 0;
  let assignmentDeadlinesCount = 0;

  for (const item of items) {
    if (item.timestampMs >= startOfTodayMs && item.timestampMs < startOfTomorrowMs) {
      todayCount += 1;
    }
    if (item.timestampMs >= startOfTodayMs && item.timestampMs < startOfDayPlus7Ms) {
      next7DaysCount += 1;
    }
    if (item.isOverdue) {
      overdueDeadlinesCount += 1;
    }
    if (item.eventKind === "scheduled_publication") {
      scheduledPublicationsCount += 1;
    }
    if (item.eventKind === "assignment_deadline") {
      assignmentDeadlinesCount += 1;
    }
  }

  return {
    todayCount,
    next7DaysCount,
    overdueDeadlinesCount,
    scheduledPublicationsCount,
    assignmentDeadlinesCount
  };
}

/**
 * Filters derived calendar items by event type, desk, workflow/status, date horizon, and text search.
 */
export function filterEditorialCalendarItems(
  items: NewsroomCalendarItem[],
  filters: {
    eventKind?: string;
    desk?: string;
    workflowOrStatus?: string;
    horizon?: CalendarHorizonFilter;
    searchQuery?: string;
  },
  nowMs: number = Date.now()
): NewsroomCalendarItem[] {
  const {
    startOfTodayMs,
    startOfTomorrowMs,
    startOfDayPlus7Ms,
    startOfDayPlus30Ms
  } = getLocalDayBounds(nowMs);

  const eventKind = filters.eventKind || "All";
  const desk = filters.desk || "All";
  const workflowOrStatus = filters.workflowOrStatus || "All";
  const horizon: CalendarHorizonFilter = filters.horizon || "All";
  const search = (filters.searchQuery || "").trim().toLowerCase();

  return items.filter((item) => {
    if (eventKind !== "All" && item.eventKind !== eventKind) {
      return false;
    }

    if (desk !== "All" && (item.desk || "") !== desk) {
      return false;
    }

    if (workflowOrStatus === "Active") {
      if (item.isTerminal) return false;
    } else if (workflowOrStatus !== "All" && item.workflowOrStatus !== workflowOrStatus) {
      return false;
    }

    if (horizon === "Today") {
      const isTodaySlot =
        item.timestampMs >= startOfTodayMs && item.timestampMs < startOfTomorrowMs;
      if (!isTodaySlot && !item.isOverdue) {
        return false;
      }
    } else if (horizon === "Next 7 Days") {
      const inNext7Days =
        item.timestampMs >= startOfTodayMs && item.timestampMs < startOfDayPlus7Ms;
      if (!inNext7Days && !item.isOverdue) {
        return false;
      }
    } else if (horizon === "Next 30 Days") {
      const inNext30Days =
        item.timestampMs >= startOfTodayMs && item.timestampMs < startOfDayPlus30Ms;
      if (!inNext30Days && !item.isOverdue) {
        return false;
      }
    }

    if (search) {
      const kindLabel = getCalendarEventKindLabel(item.eventKind).toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(search);
      const matchDesk = (item.desk || "").toLowerCase().includes(search);
      const matchKind = kindLabel.includes(search) || item.eventKind.toLowerCase().includes(search);
      const matchStatus = item.workflowOrStatus.toLowerCase().includes(search);
      if (!matchTitle && !matchDesk && !matchKind && !matchStatus) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Builds a deterministic 7-day planning strip starting at Today's local calendar day.
 */
export function buildSevenDayPlanningStrip(
  items: NewsroomCalendarItem[],
  nowMs: number = Date.now()
): SevenDayPlanningSlot[] {
  const nowDate = new Date(nowMs);
  const year = nowDate.getFullYear();
  const month = nowDate.getMonth();
  const date = nowDate.getDate();

  const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec"
  ];

  const slots: SevenDayPlanningSlot[] = [];

  for (let offset = 0; offset < 7; offset += 1) {
    const dayStart = new Date(year, month, date + offset, 0, 0, 0, 0);
    const dayEnd = new Date(year, month, date + offset + 1, 0, 0, 0, 0);
    const dayStartMs = dayStart.getTime();
    const dayEndMs = dayEnd.getTime();

    const yyyy = dayStart.getFullYear();
    const mm = String(dayStart.getMonth() + 1).padStart(2, "0");
    const dd = String(dayStart.getDate()).padStart(2, "0");
    const dateKey = `${yyyy}-${mm}-${dd}`;

    const weekday = weekdayNames[dayStart.getDay()] ?? "Day";
    const formattedDate = `${monthNames[dayStart.getMonth()] ?? ""} ${dayStart.getDate()}`.trim();
    const label =
      offset === 0 ? `Today (${weekday})` : offset === 1 ? `Tomorrow (${weekday})` : weekday;

    const dayItems = items
      .filter((item) => item.timestampMs >= dayStartMs && item.timestampMs < dayEndMs)
      .sort((a, b) => a.timestampMs - b.timestampMs || a.id.localeCompare(b.id));

    slots.push({
      dateKey,
      label,
      subLabel: formattedDate,
      dayStartMs,
      dayEndMs,
      isToday: offset === 0,
      isTomorrow: offset === 1,
      items: dayItems
    });
  }

  return slots;
}

function formatCalendarTimestamp(timestampMs: number): string {
  const d = new Date(timestampMs);
  if (Number.isNaN(d.getTime())) return "";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${months[d.getMonth()] ?? ""} ${d.getDate()}, ${d.getFullYear()} · ${hours}:${mins}`;
}

function getKindBadgeStyle(kind: NewsroomCalendarEventKind) {
  switch (kind) {
    case "story_deadline":
      return { bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE" };
    case "scheduled_publication":
      return { bg: "#ECFDF5", text: "#047857", border: "#A7F3D0" };
    case "assignment_deadline":
      return { bg: "#FEF3C7", text: "#B45309", border: "#FDE68A" };
  }
}

function getUrgencyBadgeInfo(item: NewsroomCalendarItem) {
  if (item.isOverdue) {
    return { label: "OVERDUE DEADLINE", bg: "#FEF2F2", text: "#B91C1C", border: "#FECACA" };
  }
  if (item.urgency === "completed") {
    return { label: "COMPLETED", bg: "#F1F5F9", text: "#475569", border: "#CBD5E1" };
  }
  if (item.urgency === "past_scheduled") {
    return { label: "PAST SCHEDULED TIME", bg: "#F8FAFC", text: "#475569", border: "#CBD5E1" };
  }
  if (item.urgency === "today") {
    return { label: "TODAY", bg: "#FFFBEB", text: "#B45309", border: "#FDE68A" };
  }
  if (item.urgency === "tomorrow") {
    return { label: "TOMORROW", bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE" };
  }
  return { label: "UPCOMING", bg: "#F8FAFC", text: "#334155", border: "#E2E8F0" };
}

export function StudioEditorialCalendar() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= breakpoints.tablet;

  const [refreshKey, setRefreshKey] = useState(0);
  const [viewMode, setViewMode] = useState<CalendarViewMode>("agenda");
  const [eventKindFilter, setEventKindFilter] = useState<string>("All");
  const [deskFilter, setDeskFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [horizonFilter, setHorizonFilter] = useState<CalendarHorizonFilter>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // 1. Server authorization check
  const authAsync = useAsync(() => services.authorization.getSnapshot(), [refreshKey]);
  const authSnapshot = authAsync.data;
  const isAuthorized = hasEditorialCalendarAuthority(authSnapshot);
  const canOpenPlanning = hasPlanningHandoffAuthority(authSnapshot);

  // 2. Conditional canonical source states (zero workload fetch before staff authorization)
  const [storiesState, setStoriesState] = useState<{
    data: NewsroomStory[] | null;
    loading: boolean;
    error: Error | null;
  }>({
    data: null,
    loading: false,
    error: null
  });

  const [assignmentsState, setAssignmentsState] = useState<{
    data: NewsroomAssignment[] | null;
    loading: boolean;
    error: Error | null;
  }>({
    data: null,
    loading: false,
    error: null
  });

  useEffect(() => {
    if (!isAuthorized) {
      setStoriesState({ data: null, loading: false, error: null });
      setAssignmentsState({ data: null, loading: false, error: null });
      return;
    }

    let active = true;
    setStoriesState((prev) => ({ ...prev, loading: true, error: null }));
    setAssignmentsState((prev) => ({ ...prev, loading: true, error: null }));

    services.newsroomStories
      .listStories(200)
      .then((stories) => {
        if (active) {
          setStoriesState({ data: stories, loading: false, error: null });
        }
      })
      .catch((err) => {
        if (active) {
          setStoriesState({
            data: null,
            loading: false,
            error: err instanceof Error ? err : new Error(String(err))
          });
        }
      });

    services.newsroomCommunication
      .listAssignments()
      .then((assignments) => {
        if (active) {
          setAssignmentsState({ data: assignments, loading: false, error: null });
        }
      })
      .catch((err) => {
        if (active) {
          setAssignmentsState({
            data: null,
            loading: false,
            error: err instanceof Error ? err : new Error(String(err))
          });
        }
      });

    return () => {
      active = false;
    };
  }, [isAuthorized, refreshKey]);

  const nowMs = Date.now();

  const allItems = useMemo(
    () => deriveEditorialCalendarItems(storiesState.data, assignmentsState.data, nowMs),
    [storiesState.data, assignmentsState.data, nowMs]
  );

  const summaryMetrics = useMemo(
    () => computeCalendarSummaryMetrics(allItems, nowMs),
    [allItems, nowMs]
  );

  const availableDesks = useMemo(() => {
    const set = new Set<string>();
    for (const item of allItems) {
      if (item.desk) set.add(item.desk);
    }
    return ["All", ...Array.from(set).sort()];
  }, [allItems]);

  const availableStatuses = useMemo(() => {
    const set = new Set<string>();
    for (const item of allItems) {
      if (item.workflowOrStatus) set.add(item.workflowOrStatus);
    }
    return ["All", "Active", ...Array.from(set).sort()];
  }, [allItems]);

  const filteredItems = useMemo(
    () =>
      filterEditorialCalendarItems(
        allItems,
        {
          eventKind: eventKindFilter,
          desk: deskFilter,
          workflowOrStatus: statusFilter,
          horizon: horizonFilter,
          searchQuery
        },
        nowMs
      ),
    [allItems, eventKindFilter, deskFilter, statusFilter, horizonFilter, searchQuery, nowMs]
  );

  const weekStrip = useMemo(
    () => buildSevenDayPlanningStrip(filteredItems, nowMs),
    [filteredItems, nowMs]
  );

  const overdueFilteredItems = useMemo(
    () => filteredItems.filter((item) => item.isOverdue),
    [filteredItems]
  );

  const agendaGroups = useMemo(() => {
    const groups: Array<{
      key: NewsroomCalendarHorizonBucket;
      title: string;
      subtitle: string;
      items: NewsroomCalendarItem[];
    }> = [
      {
        key: "overdue",
        title: "Overdue",
        subtitle: "Active story and assignment deadlines past due",
        items: filteredItems.filter((i) => i.horizonBucket === "overdue")
      },
      {
        key: "today",
        title: "Today",
        subtitle: "Scheduled publications and deadlines for today",
        items: filteredItems.filter((i) => i.horizonBucket === "today")
      },
      {
        key: "tomorrow",
        title: "Tomorrow",
        subtitle: "Next calendar day editorial schedule",
        items: filteredItems.filter((i) => i.horizonBucket === "tomorrow")
      },
      {
        key: "next_7_days",
        title: "Next 7 Days",
        subtitle: "Upcoming deadlines and scheduled publications within 7 days",
        items: filteredItems.filter((i) => i.horizonBucket === "next_7_days")
      },
      {
        key: "later",
        title: "Later",
        subtitle: "Future editorial dates beyond the 7-day window",
        items: filteredItems.filter((i) => i.horizonBucket === "later")
      },
      {
        key: "past",
        title: "Completed & Past Scheduled",
        subtitle: "Completed deadlines and past scheduled timestamps",
        items: filteredItems.filter((i) => i.horizonBucket === "past")
      }
    ];
    return groups.filter((group) => group.items.length > 0);
  }, [filteredItems]);

  // Handoff navigation handlers
  const handleOpenStory = (storyId: string) => {
    if (!storyId || !UUID_PATTERN.test(storyId)) return;
    router.push({
      pathname: "/studio/[module]",
      params: { module: "create-edit", storyId }
    } as never);
  };

  const handleOpenAssignment = (assignmentId: string) => {
    if (!assignmentId || !UUID_PATTERN.test(assignmentId)) return;
    router.push({
      pathname: "/studio/[module]",
      params: { module: "assignments", assignmentId }
    } as never);
  };

  const handleOpenMyAssignments = () => {
    router.push({
      pathname: "/studio/[module]",
      params: { module: "assignments" }
    } as never);
  };

  const handleOpenPlanning = () => {
    if (!canOpenPlanning) return;
    router.push({
      pathname: "/studio/[module]",
      params: { module: "planning" }
    } as never);
  };

  const handleOpenStories = () => {
    router.push({
      pathname: "/studio/[module]",
      params: { module: "stories" }
    } as never);
  };

  // Fail-closed authorization views
  if (authAsync.loading) {
    return (
      <View style={styles.container}>
        <View style={styles.stateContainer}>
          <Text style={styles.loadingText}>Verifying Newsroom staff authority with server…</Text>
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
            Unable to verify Newsroom staff authorization from the server. Editorial Calendar access is fail-closed.
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
            You must be signed in with a server-authorized Newsroom staff session to access the Editorial Calendar.
          </Text>
        </View>
      </View>
    );
  }

  if (authSnapshot?.status === "authenticated-no-staff-authority" || !isAuthorized) {
    return (
      <View style={styles.container}>
        <View style={styles.stateContainer}>
          <Text style={styles.unauthorizedTitle}>Newsroom Staff Authority Required</Text>
          <Text style={styles.unauthorizedText}>
            Your session does not hold server-verified Newsroom staff authority. Editorial Calendar workload is restricted to authorized Newsroom staff.
          </Text>
        </View>
      </View>
    );
  }

  const isWorkloadLoading =
    storiesState.loading ||
    assignmentsState.loading ||
    (storiesState.data === null && !storiesState.error) ||
    (assignmentsState.data === null && !assignmentsState.error);

  const bothSourcesFailed = Boolean(storiesState.error && assignmentsState.error);
  const hasPartialSourceError = Boolean(
    !bothSourcesFailed && (storiesState.error || assignmentsState.error)
  );

  const renderCalendarCard = (item: NewsroomCalendarItem) => {
    const kindStyle = getKindBadgeStyle(item.eventKind);
    const urgencyInfo = getUrgencyBadgeInfo(item);

    return (
      <View key={item.id} style={styles.card}>
        <View style={styles.cardTopRow}>
          <View style={styles.badgeGroup}>
            <View
              style={[
                styles.badge,
                { backgroundColor: kindStyle.bg, borderColor: kindStyle.border }
              ]}
            >
              <Text style={[styles.badgeText, { color: kindStyle.text }]}>
                {getCalendarEventKindLabel(item.eventKind)}
              </Text>
            </View>

            <View style={[styles.badge, styles.statusBadge]}>
              <Text style={styles.statusBadgeText}>{item.workflowOrStatus}</Text>
            </View>

            {item.desk && (
              <View style={[styles.badge, styles.deskBadge]}>
                <Text style={styles.deskBadgeText}>{item.desk}</Text>
              </View>
            )}

            {item.eventKind === "scheduled_publication" && item.accessPolicy && (
              <View style={[styles.badge, styles.policyBadge]}>
                <Text style={styles.policyBadgeText}>
                  {String(item.accessPolicy).toUpperCase()}
                </Text>
              </View>
            )}

            {item.eventKind === "assignment_deadline" && item.priority && (
              <View style={[styles.badge, styles.priorityBadge]}>
                <Text style={styles.priorityBadgeText}>Priority: {item.priority}</Text>
              </View>
            )}
          </View>

          <View
            style={[
              styles.urgencyBadge,
              { backgroundColor: urgencyInfo.bg, borderColor: urgencyInfo.border }
            ]}
          >
            <Text style={[styles.urgencyBadgeText, { color: urgencyInfo.text }]}>
              {urgencyInfo.label}
            </Text>
          </View>
        </View>

        <Text style={styles.cardTitle}>{item.title}</Text>

        <Text style={styles.cardTimestamp}>
          {item.eventKind === "scheduled_publication"
            ? `Scheduled publication: ${formatCalendarTimestamp(item.timestampMs)}`
            : `Deadline: ${formatCalendarTimestamp(item.timestampMs)}`}
        </Text>

        <View style={styles.cardActionsRow}>
          {item.eventKind === "assignment_deadline" && item.assignmentId && (
            <Pressable
              style={styles.primaryActionBtn}
              onPress={() => handleOpenAssignment(item.assignmentId!)}
            >
              <Text style={styles.primaryActionBtnText}>Open Assignment</Text>
            </Pressable>
          )}

          {item.storyId && (
            <Pressable
              style={
                item.eventKind === "assignment_deadline"
                  ? styles.secondaryActionBtn
                  : styles.primaryActionBtn
              }
              onPress={() => handleOpenStory(item.storyId!)}
            >
              <Text
                style={
                  item.eventKind === "assignment_deadline"
                    ? styles.secondaryActionBtnText
                    : styles.primaryActionBtnText
                }
              >
                Open Story
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.headerTagRow}>
              <View style={styles.livePulseDot} />
              <Text style={styles.headerSub}>HealthTimes Newsroom OS</Text>
            </View>
            <Text style={styles.title}>Editorial Calendar / Agenda</Text>
          </View>

          <View style={styles.headerActions}>
            <Pressable
              style={styles.refreshBtn}
              onPress={() => setRefreshKey((k) => k + 1)}
            >
              <Text style={styles.refreshBtnText}>↻ Refresh Agenda</Text>
            </Pressable>

            {canOpenPlanning && (
              <Pressable style={styles.secondaryActionBtn} onPress={handleOpenPlanning}>
                <Text style={styles.secondaryActionBtnText}>Open Planning</Text>
              </Pressable>
            )}

            <Pressable style={styles.secondaryActionBtn} onPress={handleOpenMyAssignments}>
              <Text style={styles.secondaryActionBtnText}>Open My Assignments</Text>
            </Pressable>

            <Pressable style={styles.secondaryActionBtn} onPress={handleOpenStories}>
              <Text style={styles.secondaryActionBtnText}>Open Stories</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.description}>
          Read-only editorial agenda derived from canonical story deadlines, scheduled publications, and server-scoped assignment deadlines.
        </Text>
      </View>

      {/* Loading State — never flashes 0 events before requests finish */}
      {isWorkloadLoading ? (
        <View style={styles.stateContainer}>
          <Text style={styles.loadingText}>Loading server-authorized editorial agenda…</Text>
        </View>
      ) : bothSourcesFailed ? (
        /* Both canonical sources failed */
        <View style={styles.stateContainer}>
          <Text style={styles.errorTitle}>Editorial Agenda Sources Unavailable</Text>
          <Text style={styles.errorText}>
            Both canonical editorial calendar sources failed to load. The calendar is not shown as empty when server sources fail.
          </Text>
          {storiesState.error && (
            <Text style={styles.sourceErrorDetail}>
              Story source error: {storiesState.error.message}
            </Text>
          )}
          {assignmentsState.error && (
            <Text style={styles.sourceErrorDetail}>
              Assignment source error: {assignmentsState.error.message}
            </Text>
          )}
          <Pressable style={styles.retryBtn} onPress={() => setRefreshKey((k) => k + 1)}>
            <Text style={styles.retryBtnText}>Retry Agenda Sources</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {/* Partial Source Failure Warning Banner */}
          {hasPartialSourceError && (
            <View style={styles.partialErrorBanner}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.partialErrorTitle}>
                  Partial Editorial Agenda — Incomplete Source Authority
                </Text>
                {storiesState.error && (
                  <Text style={styles.partialErrorText}>
                    Story source failed ({storiesState.error.message}). Story deadlines and scheduled publications are currently unavailable.
                  </Text>
                )}
                {assignmentsState.error && (
                  <Text style={styles.partialErrorText}>
                    Assignment source failed ({assignmentsState.error.message}). Assignment deadlines are currently unavailable.
                  </Text>
                )}
              </View>
              <Pressable style={styles.retryBtn} onPress={() => setRefreshKey((k) => k + 1)}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </Pressable>
            </View>
          )}

          {/* Summary Metrics Strip — displayed only after workload authority has settled */}
          <View style={styles.metricsStrip}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Today</Text>
              <Text style={styles.metricValue}>{summaryMetrics.todayCount}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Next 7 Days</Text>
              <Text style={styles.metricValue}>{summaryMetrics.next7DaysCount}</Text>
            </View>
            <View style={[styles.metricCard, summaryMetrics.overdueDeadlinesCount > 0 && styles.metricCardAlert]}>
              <Text style={styles.metricLabel}>Overdue editorial deadlines</Text>
              <Text
                style={[
                  styles.metricValue,
                  summaryMetrics.overdueDeadlinesCount > 0 && styles.metricValueAlert
                ]}
              >
                {summaryMetrics.overdueDeadlinesCount}
              </Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Scheduled publications</Text>
              <Text style={styles.metricValue}>{summaryMetrics.scheduledPublicationsCount}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Assignment deadlines</Text>
              <Text style={styles.metricValue}>{summaryMetrics.assignmentDeadlinesCount}</Text>
            </View>
          </View>

          {/* View Switcher & Bounded Filters */}
          <View style={styles.controlsPanel}>
            {/* View Mode Toggle: Agenda (Default) vs Calendar / Week */}
            <View style={styles.controlRow}>
              <Text style={styles.controlLabel}>View Mode</Text>
              <View style={styles.pillRow}>
                {(
                  [
                    ["agenda", "Agenda"],
                    ["week", "Calendar / Week"]
                  ] as const
                ).map(([mode, label]) => {
                  const active = viewMode === mode;
                  return (
                    <Pressable
                      key={mode}
                      style={[styles.filterPill, active && styles.filterPillActive]}
                      onPress={() => setViewMode(mode)}
                    >
                      <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Date Horizon Filter */}
            <View style={styles.controlRow}>
              <Text style={styles.controlLabel}>Date Horizon</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
                {(
                  [
                    ["All", "All loaded events"],
                    ["Today", "Today"],
                    ["Next 7 Days", "Next 7 Days"],
                    ["Next 30 Days", "Next 30 Days"]
                  ] as const
                ).map(([horizonKey, label]) => {
                  const active = horizonFilter === horizonKey;
                  return (
                    <Pressable
                      key={horizonKey}
                      style={[styles.filterPill, active && styles.filterPillActive]}
                      onPress={() => setHorizonFilter(horizonKey)}
                    >
                      <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Event Type Filter */}
            <View style={styles.controlRow}>
              <Text style={styles.controlLabel}>Event Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
                {(
                  [
                    ["All", "All Event Types"],
                    ["story_deadline", "Story deadline"],
                    ["scheduled_publication", "Scheduled publication"],
                    ["assignment_deadline", "Assignment deadline"]
                  ] as const
                ).map(([kindKey, label]) => {
                  const active = eventKindFilter === kindKey;
                  return (
                    <Pressable
                      key={kindKey}
                      style={[styles.filterPill, active && styles.filterPillActive]}
                      onPress={() => setEventKindFilter(kindKey)}
                    >
                      <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Desk & Status Filters */}
            {availableDesks.length > 1 && (
              <View style={styles.controlRow}>
                <Text style={styles.controlLabel}>Desk</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
                  {availableDesks.map((desk) => {
                    const active = deskFilter === desk;
                    return (
                      <Pressable
                        key={desk}
                        style={[styles.filterPill, active && styles.filterPillActive]}
                        onPress={() => setDeskFilter(desk)}
                      >
                        <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>
                          {desk === "All" ? "All Desks" : desk}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {availableStatuses.length > 2 && (
              <View style={styles.controlRow}>
                <Text style={styles.controlLabel}>Workflow / Status</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
                  {availableStatuses.map((st) => {
                    const active = statusFilter === st;
                    return (
                      <Pressable
                        key={st}
                        style={[styles.filterPill, active && styles.filterPillActive]}
                        onPress={() => setStatusFilter(st)}
                      >
                        <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>
                          {st === "All" ? "All Statuses" : st === "Active" ? "Active Only" : st}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Search Input */}
            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search agenda by title, desk, event type, or workflow/status…"
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {(eventKindFilter !== "All" ||
                deskFilter !== "All" ||
                statusFilter !== "All" ||
                horizonFilter !== "All" ||
                searchQuery.trim() !== "") && (
                <Pressable
                  style={styles.resetFiltersBtn}
                  onPress={() => {
                    setEventKindFilter("All");
                    setDeskFilter("All");
                    setStatusFilter("All");
                    setHorizonFilter("All");
                    setSearchQuery("");
                  }}
                >
                  <Text style={styles.resetFiltersBtnText}>Reset Filters</Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* Main Content: Empty vs Filtered Empty vs Agenda / Week */}
          {allItems.length === 0 ? (
            hasPartialSourceError ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>
                  Incomplete Editorial Agenda — Canonical Source Error
                </Text>
                <Text style={styles.emptySub}>
                  No dated events were found in the available source, and one canonical source failed to load. Retry above to restore complete agenda visibility.
                </Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>
                  No scheduled publications or editorial deadlines are currently available in your server-authorized Newsroom scope.
                </Text>
                <Text style={styles.emptySub}>
                  Historical published stories without active planning dates are excluded to prevent archival noise. Generic events (interviews, editorial conferences, health dates, and cross-domain distribution campaigns) are not fabricated client-side.
                </Text>
                <View style={styles.emptyActionsRow}>
                  {canOpenPlanning && (
                    <Pressable style={styles.primaryActionBtn} onPress={handleOpenPlanning}>
                      <Text style={styles.primaryActionBtnText}>Open Planning</Text>
                    </Pressable>
                  )}
                  <Pressable style={styles.secondaryActionBtn} onPress={handleOpenMyAssignments}>
                    <Text style={styles.secondaryActionBtnText}>Open My Assignments</Text>
                  </Pressable>
                  <Pressable style={styles.secondaryActionBtn} onPress={handleOpenStories}>
                    <Text style={styles.secondaryActionBtnText}>Open Stories</Text>
                  </Pressable>
                </View>
              </View>
            )
          ) : filteredItems.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>
                No editorial agenda events match the current filters.
              </Text>
              <Text style={styles.emptySub}>
                Adjust your event type, desk, workflow status, date horizon, or search query.
              </Text>
              <Pressable
                style={[styles.secondaryActionBtn, { marginTop: spacing.sm }]}
                onPress={() => {
                  setEventKindFilter("All");
                  setDeskFilter("All");
                  setStatusFilter("All");
                  setHorizonFilter("All");
                  setSearchQuery("");
                }}
              >
                <Text style={styles.secondaryActionBtnText}>Reset Filters</Text>
              </Pressable>
            </View>
          ) : viewMode === "agenda" ? (
            <View style={styles.agendaContainer}>
              {agendaGroups.map((group) => (
                <View key={group.key} style={styles.agendaGroup}>
                  <View style={styles.agendaGroupHeader}>
                    <View>
                      <Text
                        style={[
                          styles.agendaGroupTitle,
                          group.key === "overdue" && styles.agendaGroupTitleOverdue
                        ]}
                      >
                        {group.title} ({group.items.length})
                      </Text>
                      <Text style={styles.agendaGroupSub}>{group.subtitle}</Text>
                    </View>
                  </View>
                  <View style={styles.agendaGroupList}>
                    {group.items.map((item) => renderCalendarCard(item))}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            /* Calendar / Week View — Compact 7-day planning strip */
            <View style={styles.weekContainer}>
              {overdueFilteredItems.length > 0 && (
                <View style={styles.overdueWeekSection}>
                  <Text style={styles.overdueWeekTitle}>
                    Overdue Editorial Deadlines ({overdueFilteredItems.length})
                  </Text>
                  <View style={styles.agendaGroupList}>
                    {overdueFilteredItems.map((item) => renderCalendarCard(item))}
                  </View>
                </View>
              )}

              <View style={[styles.weekGrid, !isDesktop && styles.weekGridMobile]}>
                {weekStrip.map((slot) => (
                  <View
                    key={slot.dateKey}
                    style={[
                      styles.weekDayColumn,
                      slot.isToday && styles.weekDayColumnToday,
                      !isDesktop && styles.weekDayColumnMobile
                    ]}
                  >
                    <View style={styles.weekDayHeader}>
                      <View>
                        <Text
                          style={[
                            styles.weekDayLabel,
                            slot.isToday && styles.weekDayLabelToday
                          ]}
                        >
                          {slot.label}
                        </Text>
                        <Text style={styles.weekDaySubLabel}>{slot.subLabel}</Text>
                      </View>
                      <View style={styles.weekCountBadge}>
                        <Text style={styles.weekCountText}>{slot.items.length}</Text>
                      </View>
                    </View>

                    {slot.items.length === 0 ? (
                      <Text style={styles.weekEmptyText}>No scheduled items</Text>
                    ) : (
                      <View style={styles.weekDayItems}>
                        {slot.items.map((item) => renderCalendarCard(item))}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.lg,
    gap: spacing.lg
  },
  header: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.xl,
    gap: spacing.sm
  },
  headerTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: spacing.md
  },
  headerTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.blue
  },
  headerSub: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
    color: colors.blue,
    textTransform: "uppercase"
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: colors.ink,
    letterSpacing: -0.4
  },
  description: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.inkMuted,
    maxWidth: 780
  },
  headerActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    alignItems: "center"
  },
  refreshBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#F8FAFC"
  },
  refreshBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.ink
  },
  primaryActionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.sm,
    backgroundColor: colors.navy
  },
  primaryActionBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF"
  },
  secondaryActionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#FFFFFF"
  },
  secondaryActionBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.ink
  },
  stateContainer: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.xl,
    gap: spacing.sm,
    alignItems: "flex-start"
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.inkMuted
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.live
  },
  errorText: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.inkMuted
  },
  sourceErrorDetail: {
    fontSize: 12,
    fontWeight: "700",
    color: "#B91C1C"
  },
  unauthorizedTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.ink
  },
  unauthorizedText: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.inkMuted,
    maxWidth: 720
  },
  retryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.sm,
    backgroundColor: colors.navy
  },
  retryBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF"
  },
  partialErrorBanner: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#F59E0B",
    borderRadius: radius.md,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: spacing.md
  },
  partialErrorTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#92400E"
  },
  partialErrorText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#B45309"
  },
  metricsStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  metricCard: {
    minWidth: 155,
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: 4
  },
  metricCardAlert: {
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2"
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.inkMuted,
    textTransform: "uppercase"
  },
  metricValue: {
    fontSize: 26,
    fontWeight: "900",
    color: colors.ink
  },
  metricValueAlert: {
    color: "#B91C1C"
  },
  controlsPanel: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md
  },
  controlRow: {
    gap: 6
  },
  controlLabel: {
    fontSize: 11,
    fontWeight: "900",
    color: colors.inkMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#F8FAFC"
  },
  filterPillActive: {
    borderColor: colors.blue,
    backgroundColor: "#EFF6FF"
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.inkMuted
  },
  filterPillTextActive: {
    color: colors.blue,
    fontWeight: "900"
  },
  searchRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    alignItems: "center"
  },
  searchInput: {
    flex: 1,
    minWidth: 220,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.ink,
    backgroundColor: "#F8FAFC"
  },
  resetFiltersBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#FFFFFF"
  },
  resetFiltersBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.ink
  },
  emptyContainer: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.xl,
    gap: spacing.sm
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.ink,
    lineHeight: 22
  },
  emptySub: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.inkMuted,
    maxWidth: 760
  },
  emptyActionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.xs
  },
  agendaContainer: {
    gap: spacing.lg
  },
  agendaGroup: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md
  },
  agendaGroupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm
  },
  agendaGroupTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.ink
  },
  agendaGroupTitleOverdue: {
    color: "#B91C1C"
  },
  agendaGroupSub: {
    fontSize: 12,
    color: colors.inkMuted,
    marginTop: 2
  },
  agendaGroupList: {
    gap: spacing.sm
  },
  card: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    gap: spacing.xs
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  badgeGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center"
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.4
  },
  statusBadge: {
    backgroundColor: "#FFFFFF",
    borderColor: colors.border
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.ink
  },
  deskBadge: {
    backgroundColor: "#F1F5F9",
    borderColor: "#CBD5E1"
  },
  deskBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#334155"
  },
  policyBadge: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FDE68A"
  },
  policyBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#92400E"
  },
  priorityBadge: {
    backgroundColor: "#F1F5F9",
    borderColor: "#CBD5E1"
  },
  priorityBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#334155"
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1
  },
  urgencyBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: colors.ink,
    marginTop: 2
  },
  cardTimestamp: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.inkMuted
  },
  cardActionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.xs
  },
  weekContainer: {
    gap: spacing.lg
  },
  overdueWeekSection: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.sm
  },
  overdueWeekTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#B91C1C"
  },
  weekGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  weekGridMobile: {
    flexDirection: "column"
  },
  weekDayColumn: {
    minWidth: 240,
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm
  },
  weekDayColumnToday: {
    borderColor: colors.blue,
    borderWidth: 2
  },
  weekDayColumnMobile: {
    width: "100%",
    minWidth: 0
  },
  weekDayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 6
  },
  weekDayLabel: {
    fontSize: 13,
    fontWeight: "900",
    color: colors.ink
  },
  weekDayLabelToday: {
    color: colors.blue
  },
  weekDaySubLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.inkMuted
  },
  weekCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: "#F1F5F9"
  },
  weekCountText: {
    fontSize: 11,
    fontWeight: "900",
    color: colors.ink
  },
  weekEmptyText: {
    fontSize: 12,
    color: colors.inkMuted,
    fontStyle: "italic"
  },
  weekDayItems: {
    gap: spacing.xs
  }
});
