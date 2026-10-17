import { type ReactNode, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions
} from "react-native";
import { useRouter } from "expo-router";

import {
  deriveHomepageCurationState,
  deriveEditionHomepageCurationState,
  mergeHomepageDistribution,
  mergeHomepageEditionDistribution,
  parseHomepagePlacement,
  type CuratedHomepageSectionKey,
  type NewsroomAssignment,
  type NewsroomMediaAsset,
  type NewsroomMediaMetadataPatch,
  type NewsroomStory,
  type StoryMediaUsageType,
  type NewsroomVideo,
  type NewsroomVideoCreateInput,
  type NewsroomVideoPatch,
  type NewsroomLiveCoverage,
  type NewsroomLiveCoverageCreateInput,
  type NewsroomLiveCoveragePatch,
  type NewsroomLiveCoverageKind,
  type NewsroomLiveCoverageStatus
} from "../domain/models";

import { breakpoints, colors, radius, spacing } from "../theme/tokens";
import { resolveWorkflowStatus, StudioStoriesView } from "../ui/StudioStories";
import {
  isReviewWorkflowStatus,
  StudioReviewQueueView
} from "../ui/StudioReviewQueue";
import {
  ASSIGNMENT_STATUS_SEQUENCE,
  getNextAssignmentStatus,
  StudioPlanningBoardView
} from "../ui/StudioPlanningBoard";
import { StudioAssignmentsView } from "../ui/StudioCommunications";
import {
  computeCalendarSummaryMetrics,
  deriveEditorialCalendarItems,
  getCalendarEventKindLabel,
  StudioEditorialCalendarView
} from "../ui/StudioEditorialCalendar";
import { StudioHomepageView } from "../ui/StudioHomepage";
import { StudioMediaLibraryView } from "../ui/StudioMediaLibrary";
import { StudioVideoDeskView } from "../ui/StudioVideoDesk";
import { StudioLiveDeskView } from "../ui/StudioLiveDesk";
import {
  OWNER_PREVIEW_NAV_ITEMS,
  OWNER_PREVIEW_NOTICE_SUBTITLE,
  OWNER_PREVIEW_UNAVAILABLE_MESSAGE,
  OWNER_PREVIEW_WATERMARK,
  PREVIEW_PUBLIC_AUTHORS,
  PREVIEW_STAFF_DIRECTORY,
  buildPreviewAssignments,
  buildPreviewMediaAssets,
  buildPreviewStories,
  buildPreviewVideos,
  buildPreviewLiveCoverage,
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
          <Pressable
            style={styles.secondaryBtn}
            onPress={() => router.push("/owner-preview/studio/homepage")}
          >
            <Text style={styles.secondaryBtnText}>Homepage Curation</Text>
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
                  {item.eventKind === "scheduled_publication"
                    ? `Scheduled: ${item.timestamp.slice(0, 16).replace("T", " ")} UTC`
                    : `Deadline: ${item.timestamp.slice(0, 16).replace("T", " ")} UTC`}
                </Text>
              </View>

              <Pressable
                style={styles.secondaryBtn}
                onPress={() =>
                  router.push(
                    item.storyId
                      ? `/owner-preview/studio/create-edit?storyId=${item.storyId}`
                      : "/owner-preview/studio/assignments"
                  )
                }
              >
                <Text style={styles.secondaryBtnText}>
                  {item.storyId ? "View Story →" : "View Assignment →"}
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      </View>

      {/* Section 4: Planning & Assignment Summary */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardSectionKicker}>
            4. PLANNING SUMMARY · NEWS BUDGET ASSIGNMENTS BY STAGE
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
 * Thin preview adapter rendering shared `StudioStoriesView` with sample stories.
 */
export function OwnerPreviewStoriesView() {
  const router = useRouter();
  const [stories] = useState<NewsroomStory[]>(() => buildPreviewStories());

  return (
    <View style={styles.sectionStack} testID="owner-preview-stories-view">
      <View style={styles.previewNoticeBanner}>
        <Text style={styles.previewNoticeText}>
          Preview state only — not saved. Shared presentation view StudioStoriesView rendered with sample data.
        </Text>
      </View>
      <StudioStoriesView
        stories={stories}
        loading={false}
        error={null}
        canCreate={true}
        onRefresh={() => {}}
        onOpenReviewQueue={() =>
          router.push("/owner-preview/studio/review-queue" as never)
        }
        onOpenStory={(storyId) =>
          router.push({
            pathname: "/owner-preview/studio/create-edit",
            params: { storyId }
          } as never)
        }
        onCreateStory={() =>
          router.push("/owner-preview/studio/create-edit" as never)
        }
      />
    </View>
  );
}

/**
 * 3. REVIEW QUEUE (`/owner-preview/studio/review-queue`)
 * Thin preview adapter rendering shared `StudioReviewQueueView` with sample stories.
 */
export function OwnerPreviewReviewQueueView() {
  const router = useRouter();
  const [stories] = useState<NewsroomStory[]>(() => buildPreviewStories());

  return (
    <View style={styles.sectionStack} testID="owner-preview-review-queue-view">
      <View style={styles.previewNoticeBanner}>
        <Text style={styles.previewNoticeText}>
          Preview state only — not saved. Shared presentation view StudioReviewQueueView rendered with sample data.
        </Text>
      </View>
      <StudioReviewQueueView
        stories={stories}
        loading={false}
        error={null}
        authors={PREVIEW_PUBLIC_AUTHORS}
        onRefresh={() => {}}
        onOpenWorkspace={(storyId: string) =>
          router.push({
            pathname: "/owner-preview/studio/create-edit",
            params: { storyId }
          } as never)
        }
        onSwitchToStories={() =>
          router.push("/owner-preview/studio/stories" as never)
        }
      />
    </View>
  );
}

/**
 * 4. PLANNING / NEWS BUDGET (`/owner-preview/studio/planning`)
 * Thin preview adapter rendering shared `StudioPlanningBoardView` with sample assignments.
 */
export function OwnerPreviewPlanningView() {
  const router = useRouter();
  const [stories] = useState<NewsroomStory[]>(() => buildPreviewStories());
  const [assignments, setAssignments] = useState<NewsroomAssignment[]>(() =>
    buildPreviewAssignments()
  );
  const [notice, setNotice] = useState<string | null>(
    "Preview state only — not saved. Shared presentation view StudioPlanningBoardView rendered with sample data (writes disabled)."
  );

  return (
    <View style={styles.sectionStack} testID="owner-preview-planning-view">
      {notice ? (
        <View style={styles.previewNoticeBanner} testID="preview-planning-notice">
          <Text style={styles.previewNoticeText}>{notice}</Text>
        </View>
      ) : null}
      <StudioPlanningBoardView
        authorityMode="manager"
        canCreate={true}
        assignmentsData={assignments}
        assignmentsLoading={false}
        assignmentsError={null}
        staffData={PREVIEW_STAFF_DIRECTORY}
        staffLoading={false}
        staffError={null}
        storiesData={stories}
        canProgressAssignmentItem={() => true}
        onRefresh={() => {}}
        onCreateAssignment={async (payload) => {
          const created: NewsroomAssignment = {
            id: `preview-assignment-${Date.now()}`,
            storyId: payload.storyId ?? null,
            title: payload.title,
            reporterStaffId: payload.reporterStaffId,
            assignedEditorStaffId: payload.assignedEditorStaffId ?? null,
            desk: payload.desk ?? null,
            deadlineAt: payload.deadlineAt ?? null,
            priority: payload.priority ?? "Normal",
            notes: payload.notes ?? null,
            status: "Assigned",
            assignedBy: "00000000-0000-4000-8000-000000000201",
            updatedAt: new Date().toISOString()
          };
          setAssignments((prev) => [created, ...prev]);
          setNotice(`Preview state only: Simulated creating assignment "${created.title}".`);
        }}
        onProgressAssignment={async (assignment) => {
          const next = getNextAssignmentStatus(assignment.status);
          if (!next) return;
          setAssignments((prev) =>
            prev.map((a) =>
              a.id === assignment.id
                ? { ...a, status: next, updatedAt: new Date().toISOString() }
                : a
            )
          );
          setNotice(`Preview state only: Simulated progressing "${assignment.title}" to ${next}.`);
        }}
        onOpenStoryWorkspace={(storyId) =>
          router.push({
            pathname: "/owner-preview/studio/create-edit",
            params: { storyId }
          } as never)
        }
        onOpenDiscussion={(assignmentId) =>
          router.push({
            pathname: "/owner-preview/studio/assignments",
            params: { assignmentId }
          } as never)
        }
        onOpenMyAssignments={() =>
          router.push("/owner-preview/studio/assignments" as never)
        }
      />
    </View>
  );
}

/**
 * 5. MY ASSIGNMENTS (`/owner-preview/studio/assignments`)
 * Thin preview adapter rendering shared `StudioAssignmentsView` with sample assignments.
 */
export function OwnerPreviewAssignmentsView() {
  const router = useRouter();
  const [assignments, setAssignments] = useState<NewsroomAssignment[]>(() =>
    buildPreviewAssignments()
  );
  const [notice, setNotice] = useState<string>(
    "Preview state only — not saved. Shared presentation view StudioAssignmentsView rendered with sample data (writes disabled)."
  );

  return (
    <View style={styles.sectionStack} testID="owner-preview-assignments-view">
      <View style={styles.previewNoticeBanner} testID="preview-assignments-notice">
        <Text style={styles.previewNoticeText}>{notice}</Text>
      </View>
      <StudioAssignmentsView
        assignments={assignments}
        loading={false}
        error={null}
        canAdvanceAssignment={() => true}
        onAdvanceAssignment={async (item) => {
          const next = getNextAssignmentStatus(item.status);
          if (!next) return;
          setAssignments((prev) =>
            prev.map((a) =>
              a.id === item.id
                ? { ...a, status: next, updatedAt: new Date().toISOString() }
                : a
            )
          );
          setNotice(`Preview state only: Simulated advancing "${item.title}" to ${next}.`);
        }}
        onOpenDiscussion={(assignmentId) =>
          router.push({
            pathname: "/owner-preview/studio/assignments",
            params: { assignmentId }
          } as never)
        }
        onOpenStory={(storyId) =>
          router.push({
            pathname: "/owner-preview/studio/create-edit",
            params: { storyId }
          } as never)
        }
      />
    </View>
  );
}

/**
 * 6. EDITORIAL CALENDAR / AGENDA (`/owner-preview/studio/calendar`)
 * Thin preview adapter rendering shared `StudioEditorialCalendarView` with sample events.
 */
export function OwnerPreviewCalendarView() {
  const router = useRouter();
  const [stories] = useState<NewsroomStory[]>(() => buildPreviewStories());
  const [assignments] = useState<NewsroomAssignment[]>(() =>
    buildPreviewAssignments()
  );

  return (
    <View style={styles.sectionStack} testID="owner-preview-calendar-view">
      <View style={styles.previewNoticeBanner}>
        <Text style={styles.previewNoticeText}>
          Preview state only — not saved. Shared presentation view StudioEditorialCalendarView rendered with sample data.
        </Text>
      </View>
      <StudioEditorialCalendarView
        storiesData={stories}
        storiesError={null}
        assignmentsData={assignments}
        assignmentsError={null}
        isWorkloadLoading={false}
        canOpenPlanning={true}
        onRefresh={() => {}}
        onOpenStory={(storyId) =>
          router.push({
            pathname: "/owner-preview/studio/create-edit",
            params: { storyId }
          } as never)
        }
        onOpenAssignment={(assignmentId) =>
          router.push({
            pathname: "/owner-preview/studio/assignments",
            params: { assignmentId }
          } as never)
        }
        onOpenPlanning={() => router.push("/owner-preview/studio/planning" as never)}
        onOpenMyAssignments={() =>
          router.push("/owner-preview/studio/assignments" as never)
        }
        onOpenStories={() => router.push("/owner-preview/studio/stories" as never)}
      />
    </View>
  );
}

export function OwnerPreviewHomepageView() {
  const router = useRouter();
  const [stories, setStories] = useState<NewsroomStory[]>(() => buildPreviewStories());
  const [presentationScope, setPresentationScope] = useState<"global" | "edition">("global");
  const [selectedEditionSlug, setSelectedEditionSlug] = useState<string>("zimbabwe");
  const [notice, setNotice] = useState<string>(
    "Preview state only — not saved. Shared presentation view StudioHomepageView rendered with sample data (writes disabled)."
  );

  const curationState = useMemo(() => {
    if (presentationScope === "edition") {
      return deriveEditionHomepageCurationState(stories, selectedEditionSlug);
    }
    return deriveHomepageCurationState(stories);
  }, [stories, presentationScope, selectedEditionSlug]);

  const handleSetHero = (storyId: string) => {
    if (presentationScope === "edition") {
      setStories((prev) =>
        prev.map((s) => {
          if (s.id === storyId) {
            const nextDist = mergeHomepageEditionDistribution(
              s.distribution as Record<string, unknown> | null,
              selectedEditionSlug,
              { section: "hero", rank: 1, active: true }
            );
            return { ...s, distribution: nextDist, updatedAt: new Date().toISOString() };
          }
          const edDist = (s.distribution as { editions?: Record<string, { homepage?: unknown }> } | null)
            ?.editions?.[selectedEditionSlug]?.homepage;
          const currentP = parseHomepagePlacement(edDist);
          if (currentP?.section === "hero") {
            const nextDist = mergeHomepageEditionDistribution(
              s.distribution as Record<string, unknown> | null,
              selectedEditionSlug,
              null
            );
            return { ...s, distribution: nextDist, updatedAt: new Date().toISOString() };
          }
          return s;
        })
      );
      setNotice(`Preview state only: Simulated setting story as Hero override for ${selectedEditionSlug} edition.`);
      return;
    }

    setStories((prev) =>
      prev.map((s) => {
        if (s.id === storyId) {
          const nextDist = mergeHomepageDistribution(
            s.distribution as Record<string, unknown> | null,
            { section: "hero", rank: 1, active: true }
          );
          return { ...s, distribution: nextDist, updatedAt: new Date().toISOString() };
        }
        const currentP = parseHomepagePlacement(s.distribution?.homepage);
        if (currentP?.section === "hero") {
          const nextDist = mergeHomepageDistribution(
            s.distribution as Record<string, unknown> | null,
            null
          );
          return { ...s, distribution: nextDist, updatedAt: new Date().toISOString() };
        }
        return s;
      })
    );
    setNotice("Preview state only: Simulated setting story as active Hero.");
  };

  const handleRemoveHero = () => {
    if (presentationScope === "edition") {
      setStories((prev) =>
        prev.map((s) => {
          const edDist = (s.distribution as { editions?: Record<string, { homepage?: unknown }> } | null)
            ?.editions?.[selectedEditionSlug]?.homepage;
          const currentP = parseHomepagePlacement(edDist);
          if (currentP?.section === "hero") {
            const nextDist = mergeHomepageEditionDistribution(
              s.distribution as Record<string, unknown> | null,
              selectedEditionSlug,
              null
            );
            return { ...s, distribution: nextDist, updatedAt: new Date().toISOString() };
          }
          return s;
        })
      );
      setNotice(`Preview state only: Simulated removing Hero override for ${selectedEditionSlug} edition.`);
      return;
    }

    setStories((prev) =>
      prev.map((s) => {
        const currentP = parseHomepagePlacement(s.distribution?.homepage);
        if (currentP?.section === "hero") {
          const nextDist = mergeHomepageDistribution(
            s.distribution as Record<string, unknown> | null,
            null
          );
          return { ...s, distribution: nextDist, updatedAt: new Date().toISOString() };
        }
        return s;
      })
    );
    setNotice("Preview state only: Simulated removing active Hero.");
  };

  const handleAssignPlacement = (
    section: CuratedHomepageSectionKey,
    rank: number,
    storyId: string
  ) => {
    if (presentationScope === "edition") {
      setStories((prev) =>
        prev.map((s) => {
          if (s.id === storyId) {
            const nextDist = mergeHomepageEditionDistribution(
              s.distribution as Record<string, unknown> | null,
              selectedEditionSlug,
              { section, rank, active: true }
            );
            return { ...s, distribution: nextDist, updatedAt: new Date().toISOString() };
          }
          const edDist = (s.distribution as { editions?: Record<string, { homepage?: unknown }> } | null)
            ?.editions?.[selectedEditionSlug]?.homepage;
          const currentP = parseHomepagePlacement(edDist);
          if (currentP?.section === section && currentP?.rank === rank) {
            const nextDist = mergeHomepageEditionDistribution(
              s.distribution as Record<string, unknown> | null,
              selectedEditionSlug,
              null
            );
            return { ...s, distribution: nextDist, updatedAt: new Date().toISOString() };
          }
          return s;
        })
      );
      setNotice(`Preview state only: Simulated placing story in ${section} (rank ${rank}) for ${selectedEditionSlug} edition.`);
      return;
    }

    setStories((prev) =>
      prev.map((s) => {
        if (s.id === storyId) {
          const nextDist = mergeHomepageDistribution(
            s.distribution as Record<string, unknown> | null,
            { section, rank, active: true }
          );
          return { ...s, distribution: nextDist, updatedAt: new Date().toISOString() };
        }
        const currentP = parseHomepagePlacement(s.distribution?.homepage);
        if (currentP?.section === section && currentP?.rank === rank) {
          const nextDist = mergeHomepageDistribution(
            s.distribution as Record<string, unknown> | null,
            null
          );
          return { ...s, distribution: nextDist, updatedAt: new Date().toISOString() };
        }
        return s;
      })
    );
    setNotice(`Preview state only: Simulated placing story in ${section} (rank ${rank}).`);
  };

  const handleRemovePlacement = (storyId: string) => {
    if (presentationScope === "edition") {
      setStories((prev) =>
        prev.map((s) => {
          if (s.id === storyId) {
            const nextDist = mergeHomepageEditionDistribution(
              s.distribution as Record<string, unknown> | null,
              selectedEditionSlug,
              null
            );
            return { ...s, distribution: nextDist, updatedAt: new Date().toISOString() };
          }
          return s;
        })
      );
      setNotice(`Preview state only: Simulated removing story from ${selectedEditionSlug} edition placement.`);
      return;
    }

    setStories((prev) =>
      prev.map((s) => {
        if (s.id === storyId) {
          const nextDist = mergeHomepageDistribution(
            s.distribution as Record<string, unknown> | null,
            null
          );
          return { ...s, distribution: nextDist, updatedAt: new Date().toISOString() };
        }
        return s;
      })
    );
    setNotice("Preview state only: Simulated removing story from homepage placement.");
  };

  return (
    <View style={styles.sectionStack} testID="owner-preview-homepage-view">
      <View style={styles.previewNoticeBanner} testID="preview-homepage-notice">
        <Text style={styles.previewNoticeText}>{notice}</Text>
      </View>
      <StudioHomepageView
        stories={stories}
        curationState={curationState}
        loading={false}
        error={null}
        savingId={null}
        actionMessage={null}
        conflictError={null}
        onRefresh={() => {}}
        onSetHero={handleSetHero}
        onRemoveHero={handleRemoveHero}
        onAssignPlacement={handleAssignPlacement}
        onRemovePlacement={handleRemovePlacement}
        presentationScope={presentationScope}
        onScopeChange={setPresentationScope}
        selectedEditionSlug={selectedEditionSlug}
        onEditionSlugChange={setSelectedEditionSlug}
        deliveryConnected={true}
        onOpenStoryWorkspace={(storyId: string) =>
          router.push({
            pathname: "/owner-preview/studio/create-edit",
            params: { storyId }
          } as never)
        }
      />
    </View>
  );
}

function OwnerPreviewMediaLibraryView() {
  const router = useRouter();
  const [assets, setAssets] = useState<NewsroomMediaAsset[]>(() => buildPreviewMediaAssets());
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string>(
    "Preview state: Sample media inventory loaded. Local edits only."
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const stories = useMemo(() => buildPreviewStories(), []);

  const handleAttachToStory = async (
    assetId: string,
    storyId: string,
    usageType: StoryMediaUsageType,
    caption?: string,
    credit?: string
  ) => {
    setAssets((prev) =>
      prev.map((item) => {
        if (item.id === assetId) {
          const newUsage = [
            {
              storyId,
              usageType,
              sourceContext: {
                preview_placement_slot: usageType,
                caption: caption ?? item.caption,
                credit: credit ?? item.credit
              }
            },
            ...item.usage
          ];
          return {
            ...item,
            usage: newUsage
          };
        }
        return item;
      })
    );
    setNotice(`Preview state only: Simulated story attachment (${usageType}) saved in local preview memory.`);
  };

  const handleSaveMetadata = async (
    assetId: string,
    patch: NewsroomMediaMetadataPatch
  ) => {
    setSavingId(assetId);
    setSaveSuccess(false);

    setAssets((prev) =>
      prev.map((item) => {
        if (item.id === assetId) {
          return {
            ...item,
            altText: patch.altText !== undefined ? patch.altText : item.altText,
            caption: patch.caption !== undefined ? patch.caption : item.caption,
            credit: patch.credit !== undefined ? patch.credit : item.credit,
            sourceProvenance:
              patch.sourceProvenance !== undefined
                ? patch.sourceProvenance
                : (item as any).sourceProvenance,
            updatedAt: new Date().toISOString()
          };
        }
        return item;
      })
    );

    setSavingId(null);
    setSaveSuccess(true);
    setNotice("Preview state only: Simulated metadata update saved in local preview memory.");
  };

  return (
    <View style={styles.sectionStack} testID="owner-preview-media-view">
      <View style={styles.previewNoticeBanner} testID="preview-media-notice">
        <Text style={styles.previewNoticeText}>{notice}</Text>
      </View>
      <StudioMediaLibraryView
        assets={assets}
        loading={false}
        error={null}
        selectedAssetId={selectedAssetId}
        onSelectAsset={(asset) => setSelectedAssetId(asset ? asset.id : null)}
        onSaveMetadata={handleSaveMetadata}
        onAttachToStory={handleAttachToStory}
        storyOptions={stories.map((s) => ({
          id: s.id,
          title: s.title,
          workflowStatus: s.workflowStatus
        }))}
        savingId={savingId}
        saveError={null}
        saveSuccess={saveSuccess}
        isOwnerPreview={true}
        watermarkBanner="OWNER VISUAL PREVIEW · SAMPLE MEDIA ASSETS · WRITES DISABLED"
      />
    </View>
  );
}

function OwnerPreviewVideoDeskView() {
  const [videos, setVideos] = useState<NewsroomVideo[]>(() => buildPreviewVideos());
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string>(
    "Preview state: Sample video registry loaded. Local edits only."
  );
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "ready">("all");
  const stories = useMemo(() => buildPreviewStories(), []);

  const handleSaveVideo = async (
    videoId: string,
    expectedVersion: number,
    patch: NewsroomVideoPatch
  ): Promise<number> => {
    let newVersion = expectedVersion + 1;
    let found = false;
    setVideos((prev) =>
      prev.map((v) => {
        if (v.id === videoId) {
          found = true;
          if (v.lockVersion !== expectedVersion) {
            throw new Error(
              `Optimistic concurrency conflict: Expected version ${expectedVersion}, but video is at version ${v.lockVersion}. Please reload.`
            );
          }
          if (v.publishedAt) {
            throw new Error("Published video cannot be edited. Unpublish first.");
          }
          newVersion = v.lockVersion + 1;
          return {
            ...v,
            title: patch.title !== undefined ? patch.title : v.title,
            sourceUrl: patch.sourceUrl !== undefined ? patch.sourceUrl : v.sourceUrl,
            thumbnailUrl:
              patch.thumbnailUrl !== undefined ? patch.thumbnailUrl : v.thumbnailUrl,
            durationSeconds:
              patch.durationSeconds !== undefined
                ? patch.durationSeconds
                : v.durationSeconds,
            relatedStoryId:
              patch.relatedStoryId !== undefined
                ? patch.relatedStoryId
                : v.relatedStoryId,
            sourceProvenance:
              patch.sourceProvenance !== undefined
                ? patch.sourceProvenance
                : v.sourceProvenance,
            lockVersion: newVersion,
            updatedAt: new Date().toISOString()
          };
        }
        return v;
      })
    );
    if (!found) throw new Error("Video not found");
    setNotice("Preview state only: Simulated video metadata update saved in local preview memory.");
    return newVersion;
  };

  const handleToggleReady = async (
    videoId: string,
    expectedVersion: number,
    ready: boolean
  ): Promise<number> => {
    let targetVideo: NewsroomVideo | undefined;
    for (const v of videos) {
      if (v.id === videoId) {
        targetVideo = v;
        break;
      }
    }
    if (!targetVideo) throw new Error("Video not found");
    if (targetVideo.lockVersion !== expectedVersion) {
      throw new Error(
        `Optimistic concurrency conflict: Expected version ${expectedVersion}, but video is at version ${targetVideo.lockVersion}. Please reload.`
      );
    }
    if (!ready && targetVideo.publishedAt) {
      throw new Error("Published video cannot be transitioned to draft. Unpublish first.");
    }
    if (ready) {
      if (
        !targetVideo.title?.trim() ||
        !targetVideo.sourceUrl?.trim() ||
        !targetVideo.sourceProvenance?.trim()
      ) {
        throw new Error(
          "Cannot set video to Ready: Missing required metadata (title, HTTPS source URL, and provenance)."
        );
      }
    }
    const newVersion = targetVideo.lockVersion + 1;
    setVideos((prev) =>
      prev.map((v) => {
        if (v.id === videoId) {
          return {
            ...v,
            status: ready ? "ready" : "draft",
            lockVersion: newVersion,
            updatedAt: new Date().toISOString()
          };
        }
        return v;
      })
    );
    setNotice(`Preview state only: Simulated video marked as ${ready ? "ready" : "draft"}.`);
    return newVersion;
  };

  const handleCreateVideo = async (
    input: NewsroomVideoCreateInput
  ): Promise<string> => {
    const newId = `preview-video-${Date.now()}`;
    const newVideo: NewsroomVideo = {
      id: newId,
      title: input.title,
      sourceUrl: input.sourceUrl,
      thumbnailUrl: input.thumbnailUrl ?? null,
      durationSeconds: input.durationSeconds ?? null,
      relatedStoryId: input.relatedStoryId ?? null,
      sourceProvenance: input.sourceProvenance,
      status: "draft",
      publishedAt: null,
      watchFeatured: false,
      publishedByStaffId: null,
      lockVersion: 1,
      createdByStaffId: "preview-editor",
      updatedByStaffId: "preview-editor",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setVideos((prev) => [newVideo, ...prev]);
    setSelectedVideoId(newId);
    setNotice("Preview state only: Simulated video registered in local preview memory.");
    return newId;
  };

  const handlePublishVideo = async (
    videoId: string,
    expectedVersion: number,
    featured: boolean = false
  ): Promise<number> => {
    let targetVideo = videos.find((v) => v.id === videoId);
    if (!targetVideo) throw new Error("Video not found");
    if (targetVideo.lockVersion !== expectedVersion) {
      throw new Error("Optimistic concurrency conflict");
    }
    if (targetVideo.status !== "ready") {
      throw new Error("Video must be in ready status to publish");
    }
    const newVersion = targetVideo.lockVersion + 1;
    setVideos((prev) =>
      prev.map((v) => {
        if (v.id === videoId) {
          return {
            ...v,
            publishedAt: new Date().toISOString(),
            watchFeatured: Boolean(featured),
            publishedByStaffId: "preview-editor",
            lockVersion: newVersion,
            updatedAt: new Date().toISOString()
          };
        }
        if (featured && v.watchFeatured) {
          return { ...v, watchFeatured: false };
        }
        return v;
      })
    );
    setNotice(`Preview state only: Simulated video published ${featured ? "and featured on Watch" : "to Watch"}.`);
    return newVersion;
  };

  const handleUnpublishVideo = async (
    videoId: string,
    expectedVersion: number
  ): Promise<number> => {
    let targetVideo = videos.find((v) => v.id === videoId);
    if (!targetVideo) throw new Error("Video not found");
    if (targetVideo.lockVersion !== expectedVersion) {
      throw new Error("Optimistic concurrency conflict");
    }
    const newVersion = targetVideo.lockVersion + 1;
    setVideos((prev) =>
      prev.map((v) => {
        if (v.id === videoId) {
          return {
            ...v,
            publishedAt: null,
            watchFeatured: false,
            publishedByStaffId: null,
            lockVersion: newVersion,
            updatedAt: new Date().toISOString()
          };
        }
        return v;
      })
    );
    setNotice("Preview state only: Simulated video unpublished from Watch.");
    return newVersion;
  };

  const handleSetFeatured = async (
    videoId: string,
    expectedVersion: number,
    featured: boolean
  ): Promise<number> => {
    let targetVideo = videos.find((v) => v.id === videoId);
    if (!targetVideo) throw new Error("Video not found");
    if (targetVideo.lockVersion !== expectedVersion) {
      throw new Error("Optimistic concurrency conflict");
    }
    const newVersion = targetVideo.lockVersion + 1;
    setVideos((prev) =>
      prev.map((v) => {
        if (v.id === videoId) {
          return {
            ...v,
            watchFeatured: featured,
            lockVersion: newVersion,
            updatedAt: new Date().toISOString()
          };
        }
        if (featured && v.watchFeatured) {
          return { ...v, watchFeatured: false };
        }
        return v;
      })
    );
    setNotice(`Preview state only: Simulated video featured status updated to ${featured}.`);
    return newVersion;
  };

  return (
    <View style={styles.sectionStack} testID="owner-preview-video-desk-view">
      <View style={styles.previewNoticeBanner} testID="preview-video-desk-notice">
        <Text style={styles.previewNoticeText}>{notice}</Text>
      </View>
      <StudioVideoDeskView
        videos={videos}
        stories={stories.map((s) => ({
          id: s.id,
          title: s.title
        }))}
        loading={false}
        error={null}
        selectedVideoId={selectedVideoId}
        onSelectVideo={(video) => setSelectedVideoId(video ? video.id : null)}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        canPublish={true}
        onSaveVideo={handleSaveVideo}
        onToggleReady={handleToggleReady}
        onCreateVideo={handleCreateVideo}
        onPublishVideo={handlePublishVideo}
        onUnpublishVideo={handleUnpublishVideo}
        onSetFeatured={handleSetFeatured}
        isOwnerPreview={true}
      />
    </View>
  );
}

function OwnerPreviewLiveDeskView() {
  const [coverage, setCoverage] = useState<NewsroomLiveCoverage[]>(() =>
    buildPreviewLiveCoverage()
  );
  const [stories] = useState<NewsroomStory[]>(() => buildPreviewStories());
  const [mediaAssets] = useState<NewsroomMediaAsset[]>(() => buildPreviewMediaAssets());
  const [selectedCoverageId, setSelectedCoverageId] = useState<string | null>(
    () => buildPreviewLiveCoverage()[0]?.id ?? null
  );
  const [statusFilter, setStatusFilter] = useState<
    "all" | NewsroomLiveCoverageStatus
  >("all");
  const [kindFilter, setKindFilter] = useState<
    "all" | NewsroomLiveCoverageKind
  >("all");
  const [notice, setNotice] = useState<string>(
    "Owner Visual Preview: Live coverage registry, status transitions, and story linking run in simulated memory."
  );

  const handleSaveCoverage = async (
    id: string,
    expectedVersion: number,
    patch: NewsroomLiveCoveragePatch
  ): Promise<number> => {
    let target = coverage.find((c) => c.id === id);
    if (!target) throw new Error("Live coverage not found");
    if (target.lockVersion !== expectedVersion) {
      throw new Error("Optimistic concurrency conflict");
    }
    if (target.status === "ended") {
      throw new Error("Cannot modify ended live coverage");
    }
    const newVersion = target.lockVersion + 1;
    setCoverage((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          return {
            ...c,
            ...patch,
            lockVersion: newVersion,
            updatedAt: new Date().toISOString()
          };
        }
        return c;
      })
    );
    setNotice("Preview state only: Simulated live coverage metadata saved.");
    return newVersion;
  };

  const handleStartCoverage = async (
    id: string,
    expectedVersion: number
  ): Promise<number> => {
    let target = coverage.find((c) => c.id === id);
    if (!target) throw new Error("Live coverage not found");
    if (target.lockVersion !== expectedVersion) {
      throw new Error("Optimistic concurrency conflict");
    }
    if (target.status !== "upcoming") {
      throw new Error("Live coverage must be upcoming to start");
    }
    const newVersion = target.lockVersion + 1;
    setCoverage((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          return {
            ...c,
            status: "live",
            startedAt: new Date().toISOString(),
            lockVersion: newVersion,
            updatedAt: new Date().toISOString()
          };
        }
        return c;
      })
    );
    setNotice("Preview state only: Simulated live coverage started (now Live).");
    return newVersion;
  };

  const handleEndCoverage = async (
    id: string,
    expectedVersion: number
  ): Promise<number> => {
    let target = coverage.find((c) => c.id === id);
    if (!target) throw new Error("Live coverage not found");
    if (target.lockVersion !== expectedVersion) {
      throw new Error("Optimistic concurrency conflict");
    }
    if (target.status !== "live") {
      throw new Error("Live coverage must be live to end");
    }
    const newVersion = target.lockVersion + 1;
    setCoverage((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          return {
            ...c,
            status: "ended",
            endedAt: new Date().toISOString(),
            lockVersion: newVersion,
            updatedAt: new Date().toISOString()
          };
        }
        return c;
      })
    );
    setNotice("Preview state only: Simulated live coverage ended (concluded & locked).");
    return newVersion;
  };

  const handleCreateCoverage = async (
    input: NewsroomLiveCoverageCreateInput
  ): Promise<string> => {
    const newId = `preview-live-${Date.now()}`;
    const newCoverage: NewsroomLiveCoverage = {
      id: newId,
      title: input.title,
      kind: input.kind,
      status: "upcoming",
      scheduledAt: input.scheduledAt ?? null,
      startedAt: null,
      endedAt: null,
      relatedStoryId: input.relatedStoryId ?? null,
      mediaId: input.mediaId ?? null,
      sourceProvenance: input.sourceProvenance,
      lockVersion: 1,
      createdByStaffId: "preview-editor",
      updatedByStaffId: "preview-editor",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setCoverage((prev) => [newCoverage, ...prev]);
    setSelectedCoverageId(newId);
    setNotice("Preview state only: Simulated live coverage registered in local preview memory.");
    return newId;
  };

  return (
    <View style={styles.sectionStack} testID="owner-preview-live-desk-view">
      <View style={styles.previewNoticeBanner} testID="preview-live-desk-notice">
        <Text style={styles.previewNoticeText}>{notice}</Text>
      </View>
      <StudioLiveDeskView
        coverage={coverage}
        stories={stories.map((s) => ({
          id: s.id,
          title: s.title
        }))}
        mediaAssets={mediaAssets.map((m) => ({
          id: m.id,
          filename: m.filename,
          publicUrl: m.publicUrl
        }))}
        loading={false}
        error={null}
        selectedCoverageId={selectedCoverageId}
        onSelectCoverage={(id) => setSelectedCoverageId(id)}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        kindFilter={kindFilter}
        onKindFilterChange={setKindFilter}
        onSaveCoverage={handleSaveCoverage}
        onStartCoverage={handleStartCoverage}
        onEndCoverage={handleEndCoverage}
        onCreateCoverage={handleCreateCoverage}
        isOwnerPreview={true}
      />
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
    case "homepage":
      return (
        <OwnerPreviewShell
          activeKey="homepage"
          title="Homepage Presentation & Curation (Owner Visual Preview)"
          subtitle="Editorial curation control plane for the HealthTimes reader home, including Hero (max 1), Top Stories (ranks 1-6), and thematic sections."
        >
          <OwnerPreviewHomepageView />
        </OwnerPreviewShell>
      );
    case "media":
      return (
        <OwnerPreviewShell
          activeKey="media"
          title="Media Library (Owner Visual Preview)"
          subtitle="Visual inspection of migrated media assets, technical metadata, safe preview sandboxing, and story usage handoffs."
        >
          <OwnerPreviewMediaLibraryView />
        </OwnerPreviewShell>
      );
    case "video-desk":
      return (
        <OwnerPreviewShell
          activeKey="video-desk"
          title="Video Desk Registry (Owner Visual Preview)"
          subtitle="Editorial video custody, HTTPS source provenance, duration, related story linking, and publication-ready lifecycle."
        >
          <OwnerPreviewVideoDeskView />
        </OwnerPreviewShell>
      );
    case "live-desk":
      return (
        <OwnerPreviewShell
          activeKey="live-desk"
          title="Live Desk Registry & Operations (Owner Visual Preview)"
          subtitle="Editorial live coverage lifecycle (Upcoming → Live → Ended), live blog / scheduled kinds, related story linking, and public projection."
        >
          <OwnerPreviewLiveDeskView />
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
  previewNoticeBanner: {
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#F59E0B",
    borderRadius: radius.md,
    padding: 12
  },
  previewNoticeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#92400E"
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
    borderRadius: radius.sm,
    padding: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border
  },
  metricBoxAlert: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA"
  },
  metricValue: {
    fontSize: 28,
    fontWeight: "900",
    color: colors.ink
  },
  metricValueAlert: {
    fontSize: 28,
    fontWeight: "900",
    color: colors.live
  },
  metricLabel: {
    fontSize: 12,
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
    backgroundColor: colors.blue,
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
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.sm
  },
  secondaryBtnText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "600"
  },
  listStack: {
    gap: 8
  },
  rowCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.paperMuted,
    borderRadius: radius.sm,
    padding: 12,
    gap: 12,
    flexWrap: "wrap"
  },
  badgeRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    flexWrap: "wrap"
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800"
  },
  badgeInfo: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4
  },
  badgeTextInfo: {
    color: "#1D4ED8",
    fontSize: 10,
    fontWeight: "800"
  },
  badgeDanger: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA"
  },
  badgeTextDanger: {
    color: colors.live,
    fontSize: 10,
    fontWeight: "800"
  },
  badgeNeutral: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4
  },
  badgeTextNeutral: {
    color: "#475569",
    fontSize: 10,
    fontWeight: "700"
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink
  },
  rowMeta: {
    fontSize: 11,
    color: colors.inkMuted
  },
  stageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  stageChipCard: {
    minWidth: 110,
    flex: 1,
    backgroundColor: colors.paperMuted,
    borderRadius: radius.sm,
    padding: 10,
    alignItems: "center",
    gap: 2,
    borderWidth: 1,
    borderColor: colors.border
  },
  stageChipCount: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.ink
  },
  stageChipLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.inkMuted,
    textAlign: "center"
  }
});
