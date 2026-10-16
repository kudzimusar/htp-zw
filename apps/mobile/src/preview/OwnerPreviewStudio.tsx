import { type ReactNode, useMemo, useState } from "react";
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

import type {
  AssignmentStatus,
  NewsroomAssignment,
  NewsroomStory
} from "../domain/models";

type AssignmentPriority = "Urgent" | "High" | "Normal";
import { breakpoints, colors, radius, spacing } from "../theme/tokens";
import { resolveWorkflowStatus } from "../ui/StudioStories";
import {
  REVIEW_WORKFLOW_STATES,
  filterReviewQueue,
  getDeadlineUrgency,
  isReviewWorkflowStatus,
  sortReviewQueue,
  type SortMode
} from "../ui/StudioReviewQueue";
import {
  ASSIGNMENT_STATUS_SEQUENCE,
  compareAssignmentsUrgency,
  getAssignmentDeadlineUrgency,
  getAssignmentProgressActionLabel,
  getNextAssignmentStatus
} from "../ui/StudioPlanningBoard";
import {
  buildSevenDayPlanningStrip,
  computeCalendarSummaryMetrics,
  deriveEditorialCalendarItems,
  filterEditorialCalendarItems,
  getCalendarEventKindLabel,
  type CalendarHorizonFilter,
  type CalendarViewMode
} from "../ui/StudioEditorialCalendar";
import {
  OWNER_PREVIEW_NAV_ITEMS,
  OWNER_PREVIEW_NOTICE_SUBTITLE,
  OWNER_PREVIEW_UNAVAILABLE_MESSAGE,
  OWNER_PREVIEW_WATERMARK,
  PREVIEW_PUBLIC_AUTHORS,
  PREVIEW_STAFF_DIRECTORY,
  buildPreviewAssignments,
  buildPreviewStories,
  isOwnerPreviewEnabled,
  type OwnerPreviewModuleKey
} from "./newsroomPreviewData";
import { OwnerPreviewStoryWorkspace } from "./OwnerPreviewStoryWorkspace";

export function OwnerPreviewShell({
  activeKey,
  title,
  subtitle,
  children
}: {
  activeKey: OwnerPreviewModuleKey;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= breakpoints.desktop;
  const enabled = isOwnerPreviewEnabled();

  if (!enabled) {
    return (
      <View
        style={styles.unavailableScreen}
        testID="owner-preview-unavailable-screen"
      >
        <View style={styles.unavailableCard}>
          <Text style={styles.unavailableKicker}>ACCESS RESTRICTED</Text>
          <Text style={styles.unavailableTitle}>
            {OWNER_PREVIEW_UNAVAILABLE_MESSAGE}
          </Text>
          <Text style={styles.unavailableBody}>
            This route requires explicit non-production preview authorization (
            EXPO_PUBLIC_HEALTHTIMES_OWNER_PREVIEW=1 in a non-production build).
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.pageRoot} testID={`owner-preview-shell-${activeKey}`}>
      {/* Persistent Watermark Banner (Sections 3 & 26) */}
      <View style={styles.watermarkBanner} testID="owner-preview-watermark-banner">
        <View style={styles.watermarkTopRow}>
          <Text style={styles.watermarkPrimaryText}>
            {OWNER_PREVIEW_WATERMARK}
          </Text>
          <View style={styles.watermarkPillsRow}>
            <View style={styles.watermarkPill}>
              <Text style={styles.watermarkPillText}>OWNER VISUAL PREVIEW</Text>
            </View>
            <View style={styles.watermarkPill}>
              <Text style={styles.watermarkPillText}>
                SAMPLE PRESENTATION DATA
              </Text>
            </View>
            <View style={styles.watermarkPill}>
              <Text style={styles.watermarkPillText}>WRITES DISABLED</Text>
            </View>
          </View>
        </View>
        <Text style={styles.watermarkSubtitle}>
          {OWNER_PREVIEW_NOTICE_SUBTITLE}
        </Text>
      </View>

      {/* Top Brand Masthead */}
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.brandKicker}>
            HEALTHTIMES NEWSROOM OS · NON-PRODUCTION OWNER VISUAL PREVIEW
          </Text>
          <Text style={styles.brandTitle}>HealthTimes Studio</Text>
        </View>
        <View style={styles.headerRightRow}>
          <Pressable
            style={styles.headerActionBtn}
            onPress={() => router.push("/owner-preview/studio/create-edit")}
          >
            <Text style={styles.headerActionBtnText}>+ Open Story Workspace</Text>
          </Pressable>
        </View>
      </View>

      {/* Mobile / Tablet Horizontal Nav Bar */}
      {!isDesktop ? (
        <View style={styles.mobileNavWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.mobileNavRow}
          >
            {OWNER_PREVIEW_NAV_ITEMS.map((item) => {
              const active = item.key === activeKey;
              return (
                <Pressable
                  key={item.key}
                  style={[
                    styles.mobileNavPill,
                    active && styles.mobileNavPillActive
                  ]}
                  onPress={() => router.push(item.path as never)}
                  testID={`owner-preview-nav-mobile-${item.key}`}
                >
                  <Text
                    style={[
                      styles.mobileNavPillText,
                      active && styles.mobileNavPillTextActive
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {/* Main Content Layout */}
      <View style={styles.bodyLayout}>
        {isDesktop ? (
          <View style={styles.sidebar} testID="owner-preview-sidebar">
            <Text style={styles.sidebarSectionTitle}>NEWSROOM OPERATIONS</Text>
            {OWNER_PREVIEW_NAV_ITEMS.map((item) => {
              const active = item.key === activeKey;
              return (
                <Pressable
                  key={item.key}
                  style={[
                    styles.sidebarNavItem,
                    active && styles.sidebarNavItemActive
                  ]}
                  onPress={() => router.push(item.path as never)}
                  testID={`owner-preview-nav-${item.key}`}
                >
                  <Text
                    style={[
                      styles.sidebarNavText,
                      active && styles.sidebarNavTextActive
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}

            <View style={styles.sidebarSafetyCard}>
              <Text style={styles.sidebarSafetyTitle}>
                PREVIEW ISOLATION GUARD
              </Text>
              <Text style={styles.sidebarSafetyBody}>
                All stories, staff, assignments, and schedules shown here are
                non-persistent sample records. Production and Staging databases
                are untouched.
              </Text>
            </View>
          </View>
        ) : null}

        <ScrollView
          style={styles.mainScroll}
          contentContainerStyle={styles.mainContainer}
        >
          <View style={styles.moduleHeaderCard}>
            <Text style={styles.moduleKicker}>
              OWNER VISUAL PREVIEW · SAMPLE PRESENTATION DATA · WRITES DISABLED
            </Text>
            <Text style={styles.moduleTitle}>{title}</Text>
            <Text style={styles.moduleSubtitle}>{subtitle}</Text>
          </View>

          {children}
        </ScrollView>
      </View>
    </View>
  );
}

/**
 * 1. TODAY DASHBOARD (`/owner-preview/studio`)
 * Genuine operational Newsroom Today view with zero programme archaeology (Sections 11, 12, 13).
 */
export function OwnerPreviewTodayDashboard() {
  const router = useRouter();
  const stories = useMemo(() => buildPreviewStories(), []);
  const assignments = useMemo(() => buildPreviewAssignments(), []);
  const calendarItems = useMemo(
    () => deriveEditorialCalendarItems(stories, assignments),
    [stories, assignments]
  );
  const calendarMetrics = useMemo(
    () => computeCalendarSummaryMetrics(calendarItems),
    [calendarItems]
  );

  const reviewStories = useMemo(
    () =>
      stories.filter((s) => isReviewWorkflowStatus(resolveWorkflowStatus(s))),
    [stories]
  );

  const urgentAssignments = useMemo(
    () =>
      assignments.filter(
        (a) => a.status !== "Complete" && a.priority === "Urgent"
      ),
    [assignments]
  );

  const workflowStageCounts = useMemo(() => {
    const stages = [
      "Draft",
      "Submitted",
      "Fact check",
      "Health / Science review",
      "Copy edit",
      "Editor review",
      "Ready",
      "Scheduled",
      "Published"
    ] as const;
    return stages.map((stage) => ({
      stage,
      count: stories.filter((s) => resolveWorkflowStatus(s) === stage).length
    }));
  }, [stories]);

  const assignmentStageCounts = useMemo(() => {
    return ASSIGNMENT_STATUS_SEQUENCE.map((status) => ({
      status,
      count: assignments.filter((a) => a.status === status).length
    }));
  }, [assignments]);

  const todayAndOverdueItems = useMemo(
    () =>
      calendarItems
        .filter(
          (item) =>
            item.isOverdue ||
            item.horizonBucket === "today" ||
            item.horizonBucket === "tomorrow"
        )
        .slice(0, 6),
    [calendarItems]
  );

  return (
    <View style={styles.sectionStack} testID="owner-preview-today-dashboard">
      {/* Section 1: Attention Strip */}
      <View style={styles.card}>
        <Text style={styles.cardSectionKicker}>
          1. ATTENTION · IMMEDIATE DESK PRIORITIES
        </Text>
        <View style={styles.metricsGrid}>
          <Pressable
            style={[styles.metricBox, styles.metricBoxAlert]}
            onPress={() => router.push("/owner-preview/studio/calendar")}
          >
            <Text style={styles.metricValueAlert}>
              {calendarMetrics.overdueDeadlinesCount}
            </Text>
            <Text style={styles.metricLabel}>Overdue Deadlines</Text>
            <Text style={styles.metricHint}>Stories & assignments past due</Text>
          </Pressable>

          <Pressable
            style={styles.metricBox}
            onPress={() => router.push("/owner-preview/studio/review-queue")}
          >
            <Text style={styles.metricValue}>{reviewStories.length}</Text>
            <Text style={styles.metricLabel}>Stories in Review Queue</Text>
            <Text style={styles.metricHint}>
              Submitted, Fact check, Clinical, Copy & Editor gates
            </Text>
          </Pressable>

          <Pressable
            style={styles.metricBox}
            onPress={() => router.push("/owner-preview/studio/planning")}
          >
            <Text style={styles.metricValue}>{urgentAssignments.length}</Text>
            <Text style={styles.metricLabel}>Urgent Assignments</Text>
            <Text style={styles.metricHint}>Active high-priority desk briefs</Text>
          </Pressable>

          <Pressable
            style={styles.metricBox}
            onPress={() => router.push("/owner-preview/studio/calendar")}
          >
            <Text style={styles.metricValue}>
              {calendarMetrics.scheduledPublicationsCount}
            </Text>
            <Text style={styles.metricLabel}>Scheduled Publications</Text>
            <Text style={styles.metricHint}>Locked for upcoming release</Text>
          </Pressable>
        </View>
      </View>

      {/* Section 2: Quick Actions */}
      <View style={styles.card}>
        <Text style={styles.cardSectionKicker}>
          2. QUICK ACTIONS · DAILY NEWSROOM OPERATIONS
        </Text>
        <View style={styles.quickActionRow}>
          <Pressable
            style={styles.primaryBtn}
            onPress={() => router.push("/owner-preview/studio/create-edit")}
          >
            <Text style={styles.primaryBtnText}>Open Story Workspace</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryBtn}
            onPress={() => router.push("/owner-preview/studio/review-queue")}
          >
            <Text style={styles.secondaryBtnText}>Triage Review Queue</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryBtn}
            onPress={() => router.push("/owner-preview/studio/planning")}
          >
            <Text style={styles.secondaryBtnText}>Open News Budget & Planning</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryBtn}
            onPress={() => router.push("/owner-preview/studio/assignments")}
          >
            <Text style={styles.secondaryBtnText}>My Assignments</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryBtn}
            onPress={() => router.push("/owner-preview/studio/calendar")}
          >
            <Text style={styles.secondaryBtnText}>Editorial Calendar</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryBtn}
            onPress={() => router.push("/owner-preview/studio/stories")}
          >
            <Text style={styles.secondaryBtnText}>All Stories Index</Text>
          </Pressable>
        </View>
      </View>

      {/* Section 3: Today's Schedule & Deadlines */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardSectionKicker}>
            3. TODAY’S SCHEDULE · DEADLINES & SCHEDULED PUBLICATIONS
          </Text>
          <Pressable
            onPress={() => router.push("/owner-preview/studio/calendar")}
          >
            <Text style={styles.linkText}>Open Full Calendar →</Text>
          </Pressable>
        </View>
        <View style={styles.listStack}>
          {todayAndOverdueItems.map((item) => (
            <View key={item.id} style={styles.rowCard}>
              <View style={{ flex: 1, gap: 4 }}>
                <View style={styles.badgeRow}>
                  <View
                    style={[
                      styles.badge,
                      item.isOverdue ? styles.badgeDanger : styles.badgeInfo
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        item.isOverdue
                          ? styles.badgeTextDanger
                          : styles.badgeTextInfo
                      ]}
                    >
                      {item.isOverdue
                        ? "OVERDUE"
                        : item.horizonBucket.toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.badgeNeutral}>
                    <Text style={styles.badgeTextNeutral}>
                      {getCalendarEventKindLabel(item.eventKind)}
                    </Text>
                  </View>
                  {item.desk ? (
                    <View style={styles.badgeNeutral}>
                      <Text style={styles.badgeTextNeutral}>{item.desk}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowMeta}>
                  Stage/Status: {item.workflowOrStatus} ·{" "}
                  {item.timestamp.slice(0, 16).replace("T", " ")} UTC
                </Text>
              </View>
              <Pressable
                style={styles.secondaryBtn}
                onPress={() =>
                  router.push(
                    (item.storyId
                      ? `/owner-preview/studio/create-edit?storyId=${item.storyId}`
                      : "/owner-preview/studio/planning") as never
                  )
                }
              >
                <Text style={styles.secondaryBtnText}>
                  {item.storyId ? "Inspect Story" : "View Assignment"}
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      </View>

      {/* Section 4: Editorial Workflow Pipeline */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardSectionKicker}>
            4. EDITORIAL WORKFLOW PIPELINE · STORY COUNTS BY CANONICAL STAGE
          </Text>
          <Pressable
            onPress={() => router.push("/owner-preview/studio/stories")}
          >
            <Text style={styles.linkText}>Open Stories Index →</Text>
          </Pressable>
        </View>
        <View style={styles.stageGrid}>
          {workflowStageCounts.map((item) => (
            <Pressable
              key={item.stage}
              style={styles.stageChipCard}
              onPress={() => router.push("/owner-preview/studio/stories")}
            >
              <Text style={styles.stageChipCount}>{item.count}</Text>
              <Text style={styles.stageChipLabel}>{item.stage}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Section 5: Planning & Assignment Summary */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardSectionKicker}>
            5. PLANNING SUMMARY · NEWS BUDGET ASSIGNMENTS BY STAGE
          </Text>
          <Pressable
            onPress={() => router.push("/owner-preview/studio/planning")}
          >
            <Text style={styles.linkText}>Open Planning Board →</Text>
          </Pressable>
        </View>
        <View style={styles.stageGrid}>
          {assignmentStageCounts.map((item) => (
            <Pressable
              key={item.status}
              style={styles.stageChipCard}
              onPress={() => router.push("/owner-preview/studio/planning")}
            >
              <Text style={styles.stageChipCount}>{item.count}</Text>
              <Text style={styles.stageChipLabel}>{item.status}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

/**
 * 2. STORIES INDEX (`/owner-preview/studio/stories`)
 * Demonstrates all 9 canonical workflow states, Public & Premium access policies,
 * multiple desks, search/filter controls, and direct handoff into Story Workspace (Section 15).
 */
export function OwnerPreviewStoriesView() {
  const router = useRouter();
  const stories = useMemo(() => buildPreviewStories(), []);
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [policyFilter, setPolicyFilter] = useState<string>("All");
  const [deskFilter, setDeskFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const statuses = [
    "All",
    "Draft",
    "Submitted",
    "Fact check",
    "Health / Science review",
    "Copy edit",
    "Editor review",
    "Ready",
    "Scheduled",
    "Published"
  ] as const;

  const desks = useMemo(() => {
    const s = new Set<string>();
    for (const st of stories) {
      if (st.desk) s.add(st.desk);
    }
    return ["All", ...Array.from(s).sort()];
  }, [stories]);

  const filteredStories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return stories.filter((story) => {
      const wf = resolveWorkflowStatus(story);
      if (statusFilter !== "All" && wf !== statusFilter) return false;
      if (policyFilter !== "All" && story.accessPolicy !== policyFilter)
        return false;
      if (deskFilter !== "All" && (story.desk ?? "") !== deskFilter)
        return false;
      if (q) {
        const hay =
          `${story.title} ${story.slug} ${story.desk ?? ""} ${story.topic ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [stories, statusFilter, policyFilter, deskFilter, searchQuery]);

  return (
    <View style={styles.sectionStack} testID="owner-preview-stories-view">
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardSectionKicker}>
            FILTER & SEARCH SAMPLE STORIES ({filteredStories.length} OF{" "}
            {stories.length})
          </Text>
          <Pressable
            style={styles.primaryBtn}
            onPress={() => router.push("/owner-preview/studio/create-edit")}
          >
            <Text style={styles.primaryBtnText}>+ Create New Story (Preview)</Text>
          </Pressable>
        </View>

        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search headline, slug, desk, or topic..."
          testID="preview-stories-search-input"
        />

        <Text style={styles.filterGroupLabel}>Workflow Stage:</Text>
        <View style={styles.filterPillsRow}>
          {statuses.map((st) => (
            <Pressable
              key={st}
              style={[
                styles.filterPill,
                statusFilter === st && styles.filterPillActive
              ]}
              onPress={() => setStatusFilter(st)}
            >
              <Text
                style={[
                  styles.filterPillText,
                  statusFilter === st && styles.filterPillTextActive
                ]}
              >
                {st}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.twoColFilterRow}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={styles.filterGroupLabel}>Access Policy:</Text>
            <View style={styles.filterPillsRow}>
              {(["All", "public", "premium"] as const).map((pol) => (
                <Pressable
                  key={pol}
                  style={[
                    styles.filterPill,
                    policyFilter === pol && styles.filterPillActive
                  ]}
                  onPress={() => setPolicyFilter(pol)}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      policyFilter === pol && styles.filterPillTextActive
                    ]}
                  >
                    {pol.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={{ flex: 1, gap: 6 }}>
            <Text style={styles.filterGroupLabel}>Newsroom Desk:</Text>
            <View style={styles.filterPillsRow}>
              {desks.map((d) => (
                <Pressable
                  key={d}
                  style={[
                    styles.filterPill,
                    deskFilter === d && styles.filterPillActive
                  ]}
                  onPress={() => setDeskFilter(d)}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      deskFilter === d && styles.filterPillTextActive
                    ]}
                  >
                    {d}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </View>

      <View style={styles.listStack}>
        {filteredStories.map((story) => {
          const wf = resolveWorkflowStatus(story);
          const urgency = getDeadlineUrgency(story.deadlineAt);
          return (
            <View key={story.id} style={styles.card}>
              <View style={styles.rowCard}>
                <View style={{ flex: 1, gap: 6 }}>
                  <View style={styles.badgeRow}>
                    <View style={styles.badgeInfo}>
                      <Text style={styles.badgeTextInfo}>{wf}</Text>
                    </View>
                    <View
                      style={[
                        styles.badge,
                        story.accessPolicy === "premium"
                          ? styles.badgeWarning
                          : styles.badgeNeutral
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          story.accessPolicy === "premium"
                            ? styles.badgeTextWarning
                            : styles.badgeTextNeutral
                        ]}
                      >
                        {story.accessPolicy.toUpperCase()}
                      </Text>
                    </View>
                    {story.desk ? (
                      <View style={styles.badgeNeutral}>
                        <Text style={styles.badgeTextNeutral}>{story.desk}</Text>
                      </View>
                    ) : null}
                    {urgency.hasDeadline ? (
                      <View
                        style={[
                          styles.badge,
                          urgency.isOverdue && wf !== "Published"
                            ? styles.badgeDanger
                            : styles.badgeNeutral
                        ]}
                      >
                        <Text
                          style={[
                            styles.badgeText,
                            urgency.isOverdue && wf !== "Published"
                              ? styles.badgeTextDanger
                              : styles.badgeTextNeutral
                          ]}
                        >
                          {wf === "Published" ? "Published" : urgency.label}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={styles.rowTitle}>{story.title}</Text>
                  <Text style={styles.rowSub} numberOfLines={2}>
                    {story.standfirst}
                  </Text>
                  <Text style={styles.rowMeta}>
                    Slug: {story.slug} · Lock v{story.lockVersion} · Topic:{" "}
                    {story.topic ?? "General"}
                  </Text>
                </View>

                <Pressable
                  style={styles.primaryBtn}
                  onPress={() =>
                    router.push(
                      `/owner-preview/studio/create-edit?storyId=${story.id}` as never
                    )
                  }
                  testID={`preview-open-story-${story.id}`}
                >
                  <Text style={styles.primaryBtnText}>
                    Open in Story Workspace →
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/**
 * 3. REVIEW QUEUE (`/owner-preview/studio/review-queue`)
 * Demonstrates all editorial review stages, overdue & imminent badges, filters,
 * priority/deadline/stage sorting, and handoff into Story Workspace (Section 17).
 */
export function OwnerPreviewReviewQueueView() {
  const router = useRouter();
  const stories = useMemo(() => buildPreviewStories(), []);
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [deskFilter, setDeskFilter] = useState<string>("All");
  const [policyFilter, setPolicyFilter] = useState<string>("All");
  const [overdueOnly, setOverdueOnly] = useState<boolean>(false);
  const [sortMode, setSortMode] = useState<SortMode>("priority");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const authorsMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const a of PREVIEW_PUBLIC_AUTHORS) {
      map[a.id] = a.displayName;
    }
    return map;
  }, []);

  const filteredAndSorted = useMemo(() => {
    const filtered = filterReviewQueue(stories, {
      statusFilter,
      deskFilter,
      policyFilter,
      overdueOnly,
      searchQuery,
      authorsMap
    });
    return sortReviewQueue(filtered, sortMode);
  }, [
    stories,
    statusFilter,
    deskFilter,
    policyFilter,
    overdueOnly,
    searchQuery,
    authorsMap,
    sortMode
  ]);

  const desks = useMemo(() => {
    const s = new Set<string>();
    for (const st of stories) {
      if (st.desk) s.add(st.desk);
    }
    return ["All", ...Array.from(s).sort()];
  }, [stories]);

  return (
    <View style={styles.sectionStack} testID="owner-preview-review-queue-view">
      <View style={styles.card}>
        <Text style={styles.cardSectionKicker}>
          EDITORIAL TRIAGE & REVIEW GATE FILTERS ({filteredAndSorted.length}{" "}
          STORIES IN QUEUE)
        </Text>

        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search review queue by headline, desk, or byline..."
        />

        <Text style={styles.filterGroupLabel}>Review Gate Stage:</Text>
        <View style={styles.filterPillsRow}>
          {["All", ...REVIEW_WORKFLOW_STATES].map((st) => (
            <Pressable
              key={st}
              style={[
                styles.filterPill,
                statusFilter === st && styles.filterPillActive
              ]}
              onPress={() => setStatusFilter(st)}
            >
              <Text
                style={[
                  styles.filterPillText,
                  statusFilter === st && styles.filterPillTextActive
                ]}
              >
                {st}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.twoColFilterRow}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={styles.filterGroupLabel}>Desk:</Text>
            <View style={styles.filterPillsRow}>
              {desks.map((d) => (
                <Pressable
                  key={d}
                  style={[
                    styles.filterPill,
                    deskFilter === d && styles.filterPillActive
                  ]}
                  onPress={() => setDeskFilter(d)}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      deskFilter === d && styles.filterPillTextActive
                    ]}
                  >
                    {d}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={{ flex: 1, gap: 6 }}>
            <Text style={styles.filterGroupLabel}>Queue Ordering & Urgency:</Text>
            <View style={styles.filterPillsRow}>
              {(["priority", "deadline", "stage", "recent"] as const).map(
                (m) => (
                  <Pressable
                    key={m}
                    style={[
                      styles.filterPill,
                      sortMode === m && styles.filterPillActive
                    ]}
                    onPress={() => setSortMode(m)}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        sortMode === m && styles.filterPillTextActive
                      ]}
                    >
                      Sort: {m.toUpperCase()}
                    </Text>
                  </Pressable>
                )
              )}
              <Pressable
                style={[
                  styles.filterPill,
                  overdueOnly && styles.filterPillActive
                ]}
                onPress={() => setOverdueOnly(!overdueOnly)}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    overdueOnly && styles.filterPillTextActive
                  ]}
                >
                  Overdue Only
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.listStack}>
        {filteredAndSorted.map((story) => {
          const wf = resolveWorkflowStatus(story);
          const urgency = getDeadlineUrgency(story.deadlineAt);
          const byline =
            (story.authorId && authorsMap[story.authorId]) ||
            "Unassigned public byline";

          return (
            <View key={story.id} style={styles.card}>
              <View style={styles.rowCard}>
                <View style={{ flex: 1, gap: 6 }}>
                  <View style={styles.badgeRow}>
                    <View style={styles.badgeInfo}>
                      <Text style={styles.badgeTextInfo}>{wf}</Text>
                    </View>
                    <View
                      style={[
                        styles.badge,
                        urgency.isOverdue
                          ? styles.badgeDanger
                          : urgency.isImminent
                          ? styles.badgeWarning
                          : styles.badgeNeutral
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          urgency.isOverdue
                            ? styles.badgeTextDanger
                            : urgency.isImminent
                            ? styles.badgeTextWarning
                            : styles.badgeTextNeutral
                        ]}
                      >
                        {urgency.label}
                      </Text>
                    </View>
                    {story.desk ? (
                      <View style={styles.badgeNeutral}>
                        <Text style={styles.badgeTextNeutral}>{story.desk}</Text>
                      </View>
                    ) : null}
                    <View style={styles.badgeNeutral}>
                      <Text style={styles.badgeTextNeutral}>
                        {story.accessPolicy.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.rowTitle}>{story.title}</Text>
                  <Text style={styles.rowSub}>{story.standfirst}</Text>
                  <Text style={styles.rowMeta}>
                    Byline: {byline} · Internal Note:{" "}
                    {story.internalNotes ?? "None"}
                  </Text>
                </View>

                <Pressable
                  style={styles.primaryBtn}
                  onPress={() =>
                    router.push(
                      `/owner-preview/studio/create-edit?storyId=${story.id}` as never
                    )
                  }
                >
                  <Text style={styles.primaryBtnText}>
                    Open in Story Workspace →
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/**
 * 4. PLANNING / NEWS BUDGET (`/owner-preview/studio/planning`)
 * Demonstrates summary metrics, filters, create-assignment form with sample staff,
 * linked/unlinked assignments, and local-only progression (Section 18).
 */
export function OwnerPreviewPlanningView() {
  const router = useRouter();
  const stories = useMemo(() => buildPreviewStories(), []);
  const [assignments, setAssignments] = useState<NewsroomAssignment[]>(() =>
    buildPreviewAssignments()
  );
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [priorityFilter, setPriorityFilter] = useState<string>("All");
  const [deskFilter, setDeskFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [previewNotice, setPreviewNotice] = useState<string | null>(
    "Preview state only — not saved. Assignment creation and status progression update local preview state only (writes disabled)."
  );

  // Create form local state
  const [newTitle, setNewTitle] = useState(
    "PREVIEW — Verify district oxygen concentrator maintenance logs"
  );
  const [newDesk, setNewDesk] = useState("Clinical & Maternal");
  const [newPriority, setNewPriority] = useState<AssignmentPriority>("High");
  const [newReporterId, setNewReporterId] = useState(
    PREVIEW_STAFF_DIRECTORY[0]?.id ?? "00000000-0000-4000-8000-000000000101"
  );
  const [newDeadline, setNewDeadline] = useState("2026-10-18T14:00:00.000Z");
  const [newNotes, setNewNotes] = useState(
    "PREVIEW BRIEF: Confirm biomedical engineering sign-off across 4 district hospitals."
  );

  const staffMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const st of PREVIEW_STAFF_DIRECTORY) {
      m[st.id] = st.displayName;
    }
    return m;
  }, []);

  const storyMap = useMemo(() => {
    const m: Record<string, NewsroomStory> = {};
    for (const s of stories) {
      m[s.id] = s;
    }
    return m;
  }, [stories]);

  const filteredAssignments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...assignments]
      .filter((a) => {
        if (statusFilter !== "All" && a.status !== statusFilter) return false;
        if (priorityFilter !== "All" && a.priority !== priorityFilter)
          return false;
        if (deskFilter !== "All" && (a.desk ?? "") !== deskFilter) return false;
        if (q) {
          const hay = `${a.title} ${a.desk ?? ""} ${a.notes ?? ""}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => compareAssignmentsUrgency(a, b));
  }, [assignments, statusFilter, priorityFilter, deskFilter, searchQuery]);

  function simulateProgressAssignment(assignment: NewsroomAssignment) {
    const next = getNextAssignmentStatus(assignment.status);
    if (!next) return;
    setAssignments((prev) =>
      prev.map((a) =>
        a.id === assignment.id
          ? { ...a, status: next, updatedAt: new Date().toISOString() }
          : a
      )
    );
    setPreviewNotice(
      `Preview state only — not saved: Simulated progressing "${assignment.title}" from ${assignment.status} to ${next} (writes disabled).`
    );
  }

  function simulateCreateAssignment() {
    if (!newTitle.trim()) return;
    const created: NewsroomAssignment = {
      id: `preview-assignment-${Date.now()}`,
      storyId: null,
      title: newTitle.trim(),
      reporterStaffId: newReporterId,
      assignedEditorStaffId: "00000000-0000-4000-8000-000000000201",
      desk: newDesk,
      deadlineAt: newDeadline,
      priority: newPriority,
      notes: newNotes,
      status: "Assigned",
      assignedBy: "00000000-0000-4000-8000-000000000201",
      updatedAt: new Date().toISOString()
    };
    setAssignments((prev) => [created, ...prev]);
    setShowCreateForm(false);
    setPreviewNotice(
      `Preview state only — not saved: Simulated creating assignment "${created.title}" (writes disabled).`
    );
  }

  return (
    <View style={styles.sectionStack} testID="owner-preview-planning-view">
      {previewNotice ? (
        <View style={styles.previewNoticeBanner} testID="preview-planning-notice">
          <Text style={styles.previewNoticeText}>{previewNotice}</Text>
        </View>
      ) : null}

      {/* Summary Metrics */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardSectionKicker}>
            NEWS BUDGET & ASSIGNMENT PLANNING METRICS
          </Text>
          <Pressable
            style={styles.primaryBtn}
            onPress={() => setShowCreateForm(!showCreateForm)}
            testID="preview-planning-toggle-create-btn"
          >
            <Text style={styles.primaryBtnText}>
              {showCreateForm ? "Close Form" : "+ New Assignment (Preview)"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.metricsGrid}>
          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>{assignments.length}</Text>
            <Text style={styles.metricLabel}>Total Assignments</Text>
          </View>
          <View style={[styles.metricBox, styles.metricBoxAlert]}>
            <Text style={styles.metricValueAlert}>
              {
                assignments.filter(
                  (a) =>
                    getAssignmentDeadlineUrgency(a.deadlineAt, a.status)
                      .isOverdue
                ).length
              }
            </Text>
            <Text style={styles.metricLabel}>Overdue Briefs</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>
              {
                assignments.filter(
                  (a) => a.status !== "Complete" && a.priority === "Urgent"
                ).length
              }
            </Text>
            <Text style={styles.metricLabel}>Urgent Priority</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>
              {assignments.filter((a) => a.storyId !== null).length}
            </Text>
            <Text style={styles.metricLabel}>Linked to Stories</Text>
          </View>
        </View>
      </View>

      {/* Create Assignment Preview Form */}
      {showCreateForm ? (
        <View style={styles.card} testID="preview-planning-create-form">
          <Text style={styles.cardSectionKicker}>
            CREATE NEW EDITORIAL ASSIGNMENT (SAMPLE STAFF · PREVIEW ONLY)
          </Text>
          <TextInput
            style={styles.searchInput}
            value={newTitle}
            onChangeText={setNewTitle}
            placeholder="Assignment title..."
          />
          <View style={styles.twoColFilterRow}>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={styles.filterGroupLabel}>Priority:</Text>
              <View style={styles.filterPillsRow}>
                {(["Urgent", "High", "Normal"] as const).map((p) => (
                  <Pressable
                    key={p}
                    style={[
                      styles.filterPill,
                      newPriority === p && styles.filterPillActive
                    ]}
                    onPress={() => setNewPriority(p)}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        newPriority === p && styles.filterPillTextActive
                      ]}
                    >
                      {p}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={styles.filterGroupLabel}>Assign Sample Reporter:</Text>
              <View style={styles.filterPillsRow}>
                {PREVIEW_STAFF_DIRECTORY.slice(0, 3).map((st) => (
                  <Pressable
                    key={st.id}
                    style={[
                      styles.filterPill,
                      newReporterId === st.id && styles.filterPillActive
                    ]}
                    onPress={() => setNewReporterId(st.id)}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        newReporterId === st.id && styles.filterPillTextActive
                      ]}
                    >
                      {st.displayName}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
          <TextInput
            style={styles.searchInput}
            value={newNotes}
            onChangeText={setNewNotes}
            placeholder="Reporting brief & instructions..."
          />
          <Pressable
            style={[styles.primaryBtn, { alignSelf: "flex-start" }]}
            onPress={simulateCreateAssignment}
            testID="preview-planning-submit-create-btn"
          >
            <Text style={styles.primaryBtnText}>
              Create Assignment in Preview State (Not Saved)
            </Text>
          </Pressable>
        </View>
      ) : null}

      {/* Filters */}
      <View style={styles.card}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search assignments by title, desk, or notes..."
        />
        <Text style={styles.filterGroupLabel}>Assignment Status:</Text>
        <View style={styles.filterPillsRow}>
          {["All", ...ASSIGNMENT_STATUS_SEQUENCE].map((st) => (
            <Pressable
              key={st}
              style={[
                styles.filterPill,
                statusFilter === st && styles.filterPillActive
              ]}
              onPress={() => setStatusFilter(st)}
            >
              <Text
                style={[
                  styles.filterPillText,
                  statusFilter === st && styles.filterPillTextActive
                ]}
              >
                {st}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.twoColFilterRow}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={styles.filterGroupLabel}>Priority:</Text>
            <View style={styles.filterPillsRow}>
              {["All", "Urgent", "High", "Normal"].map((p) => (
                <Pressable
                  key={p}
                  style={[
                    styles.filterPill,
                    priorityFilter === p && styles.filterPillActive
                  ]}
                  onPress={() => setPriorityFilter(p)}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      priorityFilter === p && styles.filterPillTextActive
                    ]}
                  >
                    {p}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={styles.filterGroupLabel}>Desk:</Text>
            <View style={styles.filterPillsRow}>
              {[
                "All",
                "Investigations",
                "Public Health",
                "Health Policy",
                "Clinical & Maternal",
                "Infectious Diseases"
              ].map((d) => (
                <Pressable
                  key={d}
                  style={[
                    styles.filterPill,
                    deskFilter === d && styles.filterPillActive
                  ]}
                  onPress={() => setDeskFilter(d)}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      deskFilter === d && styles.filterPillTextActive
                    ]}
                  >
                    {d}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* Assignment Cards */}
      <View style={styles.listStack}>
        {filteredAssignments.map((assignment) => {
          const urgency = getAssignmentDeadlineUrgency(
            assignment.deadlineAt,
            assignment.status
          );
          const nextActionLabel = getAssignmentProgressActionLabel(
            assignment.status
          );
          const linkedStory = assignment.storyId
            ? storyMap[assignment.storyId]
            : null;
          const reporterName =
            (assignment.reporterStaffId &&
              staffMap[assignment.reporterStaffId]) ||
            "Unassigned Reporter";

          return (
            <View key={assignment.id} style={styles.card}>
              <View style={styles.rowCard}>
                <View style={{ flex: 1, gap: 6 }}>
                  <View style={styles.badgeRow}>
                    <View style={styles.badgeInfo}>
                      <Text style={styles.badgeTextInfo}>
                        {assignment.status}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.badge,
                        assignment.priority === "Urgent"
                          ? styles.badgeDanger
                          : assignment.priority === "High"
                          ? styles.badgeWarning
                          : styles.badgeNeutral
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          assignment.priority === "Urgent"
                            ? styles.badgeTextDanger
                            : assignment.priority === "High"
                            ? styles.badgeTextWarning
                            : styles.badgeTextNeutral
                        ]}
                      >
                        {assignment.priority.toUpperCase()}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.badge,
                        urgency.isOverdue
                          ? styles.badgeDanger
                          : styles.badgeNeutral
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          urgency.isOverdue
                            ? styles.badgeTextDanger
                            : styles.badgeTextNeutral
                        ]}
                      >
                        {urgency.label}
                      </Text>
                    </View>
                    {assignment.desk ? (
                      <View style={styles.badgeNeutral}>
                        <Text style={styles.badgeTextNeutral}>
                          {assignment.desk}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={styles.rowTitle}>{assignment.title}</Text>
                  <Text style={styles.rowSub}>{assignment.notes}</Text>
                  <Text style={styles.rowMeta}>
                    Reporter: {reporterName} ·{" "}
                    {linkedStory
                      ? `Linked Story: "${linkedStory.title}"`
                      : "Unlinked Assignment Brief"}
                  </Text>
                </View>

                <View style={styles.actionStack}>
                  {nextActionLabel ? (
                    <Pressable
                      style={styles.primaryBtn}
                      onPress={() => simulateProgressAssignment(assignment)}
                      testID={`preview-progress-assignment-${assignment.id}`}
                    >
                      <Text style={styles.primaryBtnText}>
                        {nextActionLabel} (Preview)
                      </Text>
                    </Pressable>
                  ) : null}
                  {linkedStory ? (
                    <Pressable
                      style={styles.secondaryBtn}
                      onPress={() =>
                        router.push(
                          `/owner-preview/studio/create-edit?storyId=${linkedStory.id}` as never
                        )
                      }
                    >
                      <Text style={styles.secondaryBtnText}>
                        Open Linked Story →
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/**
 * 5. MY ASSIGNMENTS (`/owner-preview/studio/assignments`)
 * Reporter-facing operational view across all 6 stages (`Assigned` -> `Complete`)
 * with local-only self-progression and linked story handoff (Section 19).
 */
export function OwnerPreviewAssignmentsView() {
  const router = useRouter();
  const stories = useMemo(() => buildPreviewStories(), []);
  const [assignments, setAssignments] = useState<NewsroomAssignment[]>(() =>
    buildPreviewAssignments()
  );
  const [previewNotice, setPreviewNotice] = useState<string>(
    "Preview state only — not saved. Reporter self-progression actions update local preview state only (writes disabled)."
  );

  const storyMap = useMemo(() => {
    const m: Record<string, NewsroomStory> = {};
    for (const s of stories) {
      m[s.id] = s;
    }
    return m;
  }, [stories]);

  function handleReporterSelfProgress(assignment: NewsroomAssignment) {
    const next = getNextAssignmentStatus(assignment.status);
    if (!next) return;
    setAssignments((prev) =>
      prev.map((a) =>
        a.id === assignment.id
          ? { ...a, status: next, updatedAt: new Date().toISOString() }
          : a
      )
    );
    setPreviewNotice(
      `Preview state only — not saved: Simulated reporter self-progression "${assignment.title}" -> ${next} (writes disabled).`
    );
  }

  return (
    <View style={styles.sectionStack} testID="owner-preview-assignments-view">
      <View
        style={styles.previewNoticeBanner}
        testID="preview-assignments-notice"
      >
        <Text style={styles.previewNoticeText}>{previewNotice}</Text>
      </View>

      {/* Reporter Stage Pipeline Summary */}
      <View style={styles.card}>
        <Text style={styles.cardSectionKicker}>
          REPORTER SELF-PROGRESSION PIPELINE (ASSIGNED → COMPLETE)
        </Text>
        <View style={styles.stageGrid}>
          {ASSIGNMENT_STATUS_SEQUENCE.map((status) => (
            <View key={status} style={styles.stageChipCard}>
              <Text style={styles.stageChipCount}>
                {assignments.filter((a) => a.status === status).length}
              </Text>
              <Text style={styles.stageChipLabel}>{status}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.listStack}>
        {assignments.map((assignment) => {
          const urgency = getAssignmentDeadlineUrgency(
            assignment.deadlineAt,
            assignment.status
          );
          const actionLabel = getAssignmentProgressActionLabel(
            assignment.status
          );
          const linkedStory = assignment.storyId
            ? storyMap[assignment.storyId]
            : null;

          return (
            <View key={assignment.id} style={styles.card}>
              <View style={styles.rowCard}>
                <View style={{ flex: 1, gap: 6 }}>
                  <View style={styles.badgeRow}>
                    <View style={styles.badgeInfo}>
                      <Text style={styles.badgeTextInfo}>
                        {assignment.status}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.badge,
                        urgency.isOverdue
                          ? styles.badgeDanger
                          : styles.badgeNeutral
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          urgency.isOverdue
                            ? styles.badgeTextDanger
                            : styles.badgeTextNeutral
                        ]}
                      >
                        {urgency.label}
                      </Text>
                    </View>
                    <View style={styles.badgeNeutral}>
                      <Text style={styles.badgeTextNeutral}>
                        Priority: {assignment.priority}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.rowTitle}>{assignment.title}</Text>
                  <Text style={styles.rowSub}>{assignment.notes}</Text>
                  <Text style={styles.rowMeta}>
                    Desk: {assignment.desk ?? "General"} ·{" "}
                    {linkedStory
                      ? `Linked Story: "${linkedStory.title}"`
                      : "Unlinked Assignment"}
                  </Text>
                </View>

                <View style={styles.actionStack}>
                  {actionLabel ? (
                    <Pressable
                      style={styles.primaryBtn}
                      onPress={() => handleReporterSelfProgress(assignment)}
                      testID={`preview-self-progress-${assignment.id}`}
                    >
                      <Text style={styles.primaryBtnText}>
                        {actionLabel} (Preview Only)
                      </Text>
                    </Pressable>
                  ) : (
                    <View style={styles.badgeNeutral}>
                      <Text style={styles.badgeTextNeutral}>
                        Terminal Complete
                      </Text>
                    </View>
                  )}

                  {linkedStory ? (
                    <Pressable
                      style={styles.secondaryBtn}
                      onPress={() =>
                        router.push(
                          `/owner-preview/studio/create-edit?storyId=${linkedStory.id}` as never
                        )
                      }
                    >
                      <Text style={styles.secondaryBtnText}>
                        Open Linked Story →
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/**
 * 6. EDITORIAL CALENDAR / AGENDA (`/owner-preview/studio/calendar`)
 * Demonstrates Agenda & Week views, summary metrics, story/assignment/scheduled event kinds,
 * filters, and handoffs into Story Workspace, Planning, and Review Queue (Section 20).
 */
export function OwnerPreviewCalendarView() {
  const router = useRouter();
  const stories = useMemo(() => buildPreviewStories(), []);
  const assignments = useMemo(() => buildPreviewAssignments(), []);
  const [viewMode, setViewMode] = useState<CalendarViewMode>("agenda");
  const [eventKindFilter, setEventKindFilter] = useState<string>("All");
  const [deskFilter, setDeskFilter] = useState<string>("All");
  const [horizonFilter, setHorizonFilter] =
    useState<CalendarHorizonFilter>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const allItems = useMemo(
    () => deriveEditorialCalendarItems(stories, assignments),
    [stories, assignments]
  );

  const summary = useMemo(
    () => computeCalendarSummaryMetrics(allItems),
    [allItems]
  );

  const filteredItems = useMemo(
    () =>
      filterEditorialCalendarItems(allItems, {
        eventKind: eventKindFilter,
        desk: deskFilter,
        horizon: horizonFilter,
        searchQuery
      }),
    [allItems, eventKindFilter, deskFilter, horizonFilter, searchQuery]
  );

  const sevenDaySlots = useMemo(
    () => buildSevenDayPlanningStrip(filteredItems),
    [filteredItems]
  );

  return (
    <View style={styles.sectionStack} testID="owner-preview-calendar-view">
      {/* Summary Strip */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardSectionKicker}>
            EDITORIAL CALENDAR & AGENDA METRICS
          </Text>
          <View style={styles.filterPillsRow}>
            <Pressable
              style={[
                styles.filterPill,
                viewMode === "agenda" && styles.filterPillActive
              ]}
              onPress={() => setViewMode("agenda")}
              testID="preview-calendar-mode-agenda"
            >
              <Text
                style={[
                  styles.filterPillText,
                  viewMode === "agenda" && styles.filterPillTextActive
                ]}
              >
                Agenda View
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.filterPill,
                viewMode === "week" && styles.filterPillActive
              ]}
              onPress={() => setViewMode("week")}
              testID="preview-calendar-mode-week"
            >
              <Text
                style={[
                  styles.filterPillText,
                  viewMode === "week" && styles.filterPillTextActive
                ]}
              >
                Calendar / 7-Day Week View
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.metricsGrid}>
          <View style={[styles.metricBox, styles.metricBoxAlert]}>
            <Text style={styles.metricValueAlert}>
              {summary.overdueDeadlinesCount}
            </Text>
            <Text style={styles.metricLabel}>Overdue Deadlines</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>{summary.todayCount}</Text>
            <Text style={styles.metricLabel}>Due Today</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>{summary.next7DaysCount}</Text>
            <Text style={styles.metricLabel}>Due Next 7 Days</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>
              {summary.scheduledPublicationsCount}
            </Text>
            <Text style={styles.metricLabel}>Scheduled Publications</Text>
          </View>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.card}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search calendar events by title, desk, or status..."
        />
        <View style={styles.twoColFilterRow}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={styles.filterGroupLabel}>Event Kind:</Text>
            <View style={styles.filterPillsRow}>
              {[
                { key: "All", label: "All Events" },
                { key: "story_deadline", label: "Story Deadlines" },
                {
                  key: "scheduled_publication",
                  label: "Scheduled Publications"
                },
                { key: "assignment_deadline", label: "Assignment Deadlines" }
              ].map((ek) => (
                <Pressable
                  key={ek.key}
                  style={[
                    styles.filterPill,
                    eventKindFilter === ek.key && styles.filterPillActive
                  ]}
                  onPress={() => setEventKindFilter(ek.key)}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      eventKindFilter === ek.key && styles.filterPillTextActive
                    ]}
                  >
                    {ek.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={{ flex: 1, gap: 6 }}>
            <Text style={styles.filterGroupLabel}>Date Horizon:</Text>
            <View style={styles.filterPillsRow}>
              {(["All", "Today", "Next 7 Days", "Next 30 Days"] as const).map(
                (h) => (
                  <Pressable
                    key={h}
                    style={[
                      styles.filterPill,
                      horizonFilter === h && styles.filterPillActive
                    ]}
                    onPress={() => setHorizonFilter(h)}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        horizonFilter === h && styles.filterPillTextActive
                      ]}
                    >
                      {h}
                    </Text>
                  </Pressable>
                )
              )}
            </View>
          </View>
        </View>
      </View>

      {/* Week View vs Agenda View */}
      {viewMode === "week" ? (
        <View style={styles.card} testID="preview-calendar-week-strip">
          <Text style={styles.cardSectionKicker}>
            7-DAY ROLLING EDITORIAL CALENDAR STRIP
          </Text>
          <View style={styles.weekGrid}>
            {sevenDaySlots.map((slot) => (
              <View key={slot.dateKey} style={styles.dayColumn}>
                <Text style={styles.dayColumnTitle}>
                  {slot.label} · {slot.subLabel}
                </Text>
                {slot.items.length === 0 ? (
                  <Text style={styles.dayEmptyText}>No scheduled items</Text>
                ) : (
                  slot.items.map((item) => (
                    <Pressable
                      key={item.id}
                      style={styles.dayItemCard}
                      onPress={() =>
                        router.push(
                          (item.storyId
                            ? `/owner-preview/studio/create-edit?storyId=${item.storyId}`
                            : "/owner-preview/studio/planning") as never
                        )
                      }
                    >
                      <Text style={styles.dayItemKind}>
                        {getCalendarEventKindLabel(item.eventKind).toUpperCase()}
                      </Text>
                      <Text style={styles.dayItemTitle} numberOfLines={2}>
                        {item.title}
                      </Text>
                    </Pressable>
                  ))
                )}
              </View>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.listStack} testID="preview-calendar-agenda-list">
          {filteredItems.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.rowCard}>
                <View style={{ flex: 1, gap: 6 }}>
                  <View style={styles.badgeRow}>
                    <View
                      style={[
                        styles.badge,
                        item.isOverdue
                          ? styles.badgeDanger
                          : item.eventKind === "scheduled_publication"
                          ? styles.badgeInfo
                          : styles.badgeNeutral
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          item.isOverdue
                            ? styles.badgeTextDanger
                            : item.eventKind === "scheduled_publication"
                            ? styles.badgeTextInfo
                            : styles.badgeTextNeutral
                        ]}
                      >
                        {item.isOverdue
                          ? "OVERDUE DEADLINE"
                          : item.horizonBucket.toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.badgeNeutral}>
                      <Text style={styles.badgeTextNeutral}>
                        {getCalendarEventKindLabel(item.eventKind)}
                      </Text>
                    </View>
                    {item.desk ? (
                      <View style={styles.badgeNeutral}>
                        <Text style={styles.badgeTextNeutral}>{item.desk}</Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={styles.rowTitle}>{item.title}</Text>
                  <Text style={styles.rowMeta}>
                    Timestamp: {item.timestamp.slice(0, 16).replace("T", " ")}{" "}
                    UTC · Stage/Status: {item.workflowOrStatus}
                  </Text>
                </View>

                <View style={styles.actionStack}>
                  {item.storyId ? (
                    <Pressable
                      style={styles.primaryBtn}
                      onPress={() =>
                        router.push(
                          `/owner-preview/studio/create-edit?storyId=${item.storyId}` as never
                        )
                      }
                    >
                      <Text style={styles.primaryBtnText}>
                        Open in Story Workspace →
                      </Text>
                    </Pressable>
                  ) : null}
                  {item.assignmentId ? (
                    <Pressable
                      style={styles.secondaryBtn}
                      onPress={() =>
                        router.push("/owner-preview/studio/planning")
                      }
                    >
                      <Text style={styles.secondaryBtnText}>
                        Open Planning Board →
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export function OwnerPreviewModuleScreen({
  moduleSlug,
  storyId
}: {
  moduleSlug: string;
  storyId?: string | undefined;
}) {
  switch (moduleSlug) {
    case "stories":
      return (
        <OwnerPreviewShell
          activeKey="stories"
          title="Stories Index (Owner Visual Preview)"
          subtitle="All canonical workflow states, Public & Premium access policies, and newsroom desks populated with non-persistent sample stories."
        >
          <OwnerPreviewStoriesView />
        </OwnerPreviewShell>
      );
    case "create-edit":
      return (
        <OwnerPreviewShell
          activeKey="create-edit"
          title="Story Workspace (Owner Visual Preview)"
          subtitle="Full 6-tab editorial workspace (Writing, Reporting, Editorial, Publication, History, Discussion) with interactive save-state and review dialog simulators."
        >
          <OwnerPreviewStoryWorkspace initialStoryId={storyId} />
        </OwnerPreviewShell>
      );
    case "review-queue":
      return (
        <OwnerPreviewShell
          activeKey="review-queue"
          title="Review Queue & Editorial Triage (Owner Visual Preview)"
          subtitle="Daily editorial triage across Submitted, Fact check, Health / Science review, Copy edit, Editor review, and Ready gates."
        >
          <OwnerPreviewReviewQueueView />
        </OwnerPreviewShell>
      );
    case "planning":
      return (
        <OwnerPreviewShell
          activeKey="planning"
          title="Planning & News Budget (Owner Visual Preview)"
          subtitle="Editorial assignment commissioning, desk workload tracking, and local-only progression simulation."
        >
          <OwnerPreviewPlanningView />
        </OwnerPreviewShell>
      );
    case "assignments":
      return (
        <OwnerPreviewShell
          activeKey="assignments"
          title="My Assignments (Owner Visual Preview)"
          subtitle="Reporter-facing operational view across all six assignment stages (Assigned → Complete) with local self-progression."
        >
          <OwnerPreviewAssignmentsView />
        </OwnerPreviewShell>
      );
    case "calendar":
      return (
        <OwnerPreviewShell
          activeKey="calendar"
          title="Editorial Calendar & Agenda (Owner Visual Preview)"
          subtitle="Unified chronological Agenda and 7-Day Week view derived from story deadlines, scheduled publications, and assignment deadlines."
        >
          <OwnerPreviewCalendarView />
        </OwnerPreviewShell>
      );
    default:
      return (
        <OwnerPreviewShell
          activeKey="today"
          title="Newsroom Today (Owner Visual Preview)"
          subtitle="Daily editorial operations overview."
        >
          <OwnerPreviewTodayDashboard />
        </OwnerPreviewShell>
      );
  }
}

const styles = StyleSheet.create({
  pageRoot: {
    flex: 1,
    backgroundColor: colors.paperMuted
  },
  unavailableScreen: {
    flex: 1,
    backgroundColor: colors.paperMuted,
    justifyContent: "center",
    alignItems: "center",
    padding: 24
  },
  unavailableCard: {
    maxWidth: 520,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 24,
    gap: 8
  },
  unavailableKicker: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: colors.live
  },
  unavailableTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.ink
  },
  unavailableBody: {
    fontSize: 13,
    color: colors.inkMuted
  },
  watermarkBanner: {
    backgroundColor: "#7C2D12",
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: "#F59E0B",
    gap: 4
  },
  watermarkTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8
  },
  watermarkPrimaryText: {
    color: "#FEF3C7",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.9
  },
  watermarkPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6
  },
  watermarkPill: {
    backgroundColor: "#9A3412",
    borderWidth: 1,
    borderColor: "#FBBF24",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4
  },
  watermarkPillText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6
  },
  watermarkSubtitle: {
    color: "#FDE68A",
    fontSize: 11,
    fontWeight: "600"
  },
  topHeader: {
    backgroundColor: colors.navy,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12
  },
  brandKicker: {
    color: "#93C5FD",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8
  },
  brandTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800"
  },
  headerRightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  headerActionBtn: {
    backgroundColor: colors.live,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.sm
  },
  headerActionBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700"
  },
  mobileNavWrapper: {
    backgroundColor: colors.paper,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 8,
    paddingHorizontal: spacing.md
  },
  mobileNavRow: {
    gap: 8
  },
  mobileNavPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.sm,
    backgroundColor: colors.paperMuted,
    borderWidth: 1,
    borderColor: colors.border
  },
  mobileNavPillActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy
  },
  mobileNavPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.ink
  },
  mobileNavPillTextActive: {
    color: "#FFFFFF"
  },
  bodyLayout: {
    flex: 1,
    flexDirection: "row"
  },
  sidebar: {
    width: 240,
    backgroundColor: colors.paper,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    padding: spacing.md,
    gap: 6
  },
  sidebarSectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: colors.inkMuted,
    marginBottom: 6
  },
  sidebarNavItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.sm
  },
  sidebarNavItemActive: {
    backgroundColor: colors.navy
  },
  sidebarNavText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink
  },
  sidebarNavTextActive: {
    color: "#FFFFFF"
  },
  sidebarSafetyCard: {
    marginTop: 18,
    padding: 12,
    borderRadius: radius.sm,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#F59E0B",
    gap: 4
  },
  sidebarSafetyTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#92400E"
  },
  sidebarSafetyBody: {
    fontSize: 11,
    color: "#78350F"
  },
  mainScroll: {
    flex: 1
  },
  mainContainer: {
    padding: spacing.lg,
    gap: 16,
    maxWidth: 1180
  },
  moduleHeaderCard: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 16,
    gap: 4
  },
  moduleKicker: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: colors.live
  },
  moduleTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.ink
  },
  moduleSubtitle: {
    fontSize: 13,
    color: colors.inkMuted
  },
  sectionStack: {
    gap: 14
  },
  card: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 16,
    gap: 12
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8
  },
  cardSectionKicker: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: colors.navy
  },
  linkText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.blue
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12
  },
  metricBox: {
    flex: 1,
    minWidth: 180,
    backgroundColor: colors.paperMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 14,
    gap: 2
  },
  metricBoxAlert: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FCA5A5"
  },
  metricValue: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.navy
  },
  metricValueAlert: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.live
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink
  },
  metricHint: {
    fontSize: 11,
    color: colors.inkMuted
  },
  quickActionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  primaryBtn: {
    backgroundColor: colors.live,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.sm
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700"
  },
  secondaryBtn: {
    backgroundColor: colors.paperMuted,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.sm
  },
  secondaryBtnText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "700"
  },
  listStack: {
    gap: 10
  },
  rowCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12
  },
  actionStack: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4
  },
  badgeDanger: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4
  },
  badgeWarning: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4
  },
  badgeInfo: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4
  },
  badgeNeutral: {
    backgroundColor: colors.paperMuted,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800"
  },
  badgeTextDanger: {
    fontSize: 10,
    fontWeight: "800",
    color: "#991B1B"
  },
  badgeTextWarning: {
    fontSize: 10,
    fontWeight: "800",
    color: "#92400E"
  },
  badgeTextInfo: {
    fontSize: 10,
    fontWeight: "800",
    color: "#1E40AF"
  },
  badgeTextNeutral: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.inkMuted
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.ink
  },
  rowSub: {
    fontSize: 13,
    color: colors.inkMuted
  },
  rowMeta: {
    fontSize: 12,
    color: colors.inkMuted
  },
  stageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  stageChipCard: {
    minWidth: 110,
    backgroundColor: colors.paperMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2
  },
  stageChipCount: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.navy
  },
  stageChipLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.inkMuted
  },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: colors.ink,
    backgroundColor: colors.paperMuted
  },
  filterGroupLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.inkMuted
  },
  filterPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.paperMuted
  },
  filterPillActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.ink
  },
  filterPillTextActive: {
    color: "#FFFFFF"
  },
  twoColFilterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12
  },
  previewNoticeBanner: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#93C5FD",
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  previewNoticeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1E3A8A"
  },
  weekGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  dayColumn: {
    flex: 1,
    minWidth: 145,
    backgroundColor: colors.paperMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 10,
    gap: 8
  },
  dayColumnTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.navy
  },
  dayEmptyText: {
    fontSize: 11,
    color: colors.inkMuted,
    fontStyle: "italic"
  },
  dayItemCard: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: 8,
    gap: 2
  },
  dayItemKind: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.live
  },
  dayItemTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.ink
  }
});
