import { useState, useMemo } from "react";
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
import { hasServerCapability } from "../security/capabilities";
import type { NewsroomPublicAuthor, NewsroomStory } from "../domain/models";
import { colors, radius, spacing, breakpoints } from "../theme/tokens";
import { resolveWorkflowStatus } from "./StudioStories";

export const REVIEW_WORKFLOW_STATES = [
  "Submitted",
  "Fact check",
  "Health / Science review",
  "Copy edit",
  "Editor review",
  "Ready"
] as const;

export type ReviewWorkflowState = (typeof REVIEW_WORKFLOW_STATES)[number];

export type SortMode = "priority" | "deadline" | "recent" | "stage";

export function isReviewWorkflowStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  return (REVIEW_WORKFLOW_STATES as readonly string[]).includes(status.trim());
}

const STAGE_URGENCY_RANK: Record<string, number> = {
  "Editor review": 6,
  Ready: 5,
  "Health / Science review": 4,
  "Fact check": 3,
  "Copy edit": 2,
  Submitted: 1
};

export function getDeadlineUrgency(
  deadlineAt: string | null | undefined,
  now = Date.now()
): {
  isOverdue: boolean;
  isImminent: boolean;
  hasDeadline: boolean;
  label: string;
  diffMs: number | null;
} {
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

  const dateObj = new Date(deadlineMs);
  const formatted = dateObj.toLocaleDateString("en-GB", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
  return {
    isOverdue: false,
    isImminent: false,
    hasDeadline: true,
    label: `Due ${formatted}`,
    diffMs
  };
}

export function sortReviewQueue(
  stories: NewsroomStory[],
  mode: SortMode = "priority",
  now = Date.now()
): NewsroomStory[] {
  const list = [...stories];

  switch (mode) {
    case "priority":
      return list.sort((a, b) => {
        const uA = getDeadlineUrgency(a.deadlineAt, now);
        const uB = getDeadlineUrgency(b.deadlineAt, now);

        // 1. Overdue stories first (earliest overdue deadline first)
        if (uA.isOverdue && !uB.isOverdue) return -1;
        if (!uA.isOverdue && uB.isOverdue) return 1;
        if (uA.isOverdue && uB.isOverdue) {
          return (uA.diffMs ?? 0) - (uB.diffMs ?? 0);
        }

        // 2. Imminent deadlines (<24h)
        if (uA.isImminent && !uB.isImminent) return -1;
        if (!uA.isImminent && uB.isImminent) return 1;
        if (uA.isImminent && uB.isImminent) {
          return (uA.diffMs ?? 0) - (uB.diffMs ?? 0);
        }

        // 3. Other stories with upcoming deadlines
        if (uA.hasDeadline && !uB.hasDeadline) return -1;
        if (!uA.hasDeadline && uB.hasDeadline) return 1;
        if (uA.hasDeadline && uB.hasDeadline) {
          return (uA.diffMs ?? 0) - (uB.diffMs ?? 0);
        }

        // 4. Review-state urgency (higher stage rank first)
        const statusA = resolveWorkflowStatus(a);
        const statusB = resolveWorkflowStatus(b);
        const rankA = STAGE_URGENCY_RANK[statusA] ?? 0;
        const rankB = STAGE_URGENCY_RANK[statusB] ?? 0;
        if (rankA !== rankB) return rankB - rankA;

        // 5. Most recently updated
        const timeA = Date.parse(a.updatedAt || a.createdAt || "0") || 0;
        const timeB = Date.parse(b.updatedAt || b.createdAt || "0") || 0;
        return timeB - timeA;
      });

    case "deadline":
      return list.sort((a, b) => {
        const uA = getDeadlineUrgency(a.deadlineAt, now);
        const uB = getDeadlineUrgency(b.deadlineAt, now);
        if (uA.hasDeadline && !uB.hasDeadline) return -1;
        if (!uA.hasDeadline && uB.hasDeadline) return 1;
        if (uA.hasDeadline && uB.hasDeadline) {
          return (uA.diffMs ?? 0) - (uB.diffMs ?? 0);
        }
        const timeA = Date.parse(a.updatedAt || "0") || 0;
        const timeB = Date.parse(b.updatedAt || "0") || 0;
        return timeB - timeA;
      });

    case "stage":
      return list.sort((a, b) => {
        const statusA = resolveWorkflowStatus(a);
        const statusB = resolveWorkflowStatus(b);
        const rankA = STAGE_URGENCY_RANK[statusA] ?? 0;
        const rankB = STAGE_URGENCY_RANK[statusB] ?? 0;
        if (rankA !== rankB) return rankB - rankA;
        const timeA = Date.parse(a.updatedAt || "0") || 0;
        const timeB = Date.parse(b.updatedAt || "0") || 0;
        return timeB - timeA;
      });

    case "recent":
    default:
      return list.sort((a, b) => {
        const timeA = Date.parse(a.updatedAt || a.createdAt || "0") || 0;
        const timeB = Date.parse(b.updatedAt || b.createdAt || "0") || 0;
        return timeB - timeA;
      });
  }
}

export function filterReviewQueue(
  stories: NewsroomStory[],
  options: {
    statusFilter?: string;
    deskFilter?: string;
    authorFilter?: string;
    policyFilter?: string;
    overdueOnly?: boolean;
    searchQuery?: string;
    authorsMap?: Record<string, string>;
    now?: number;
  }
): NewsroomStory[] {
  const {
    statusFilter = "All",
    deskFilter = "All",
    authorFilter = "All",
    policyFilter = "All",
    overdueOnly = false,
    searchQuery = "",
    authorsMap = {},
    now = Date.now()
  } = options;

  const query = searchQuery.toLowerCase().trim();

  return stories.filter((story) => {
    const status = resolveWorkflowStatus(story);

    // Only review workflow states belong in the review queue
    if (!isReviewWorkflowStatus(status)) {
      return false;
    }

    if (statusFilter !== "All" && status !== statusFilter) {
      return false;
    }

    if (deskFilter !== "All" && (story.desk ?? "") !== deskFilter) {
      return false;
    }

    if (authorFilter !== "All" && story.authorId !== authorFilter) {
      return false;
    }

    if (policyFilter !== "All" && story.accessPolicy !== policyFilter) {
      return false;
    }

    if (overdueOnly) {
      const urgency = getDeadlineUrgency(story.deadlineAt, now);
      if (!urgency.isOverdue) return false;
    }

    if (query) {
      const authorName = story.authorId ? authorsMap[story.authorId] ?? "" : "";
      const match =
        story.title.toLowerCase().includes(query) ||
        (story.standfirst ?? "").toLowerCase().includes(query) ||
        (story.desk ?? "").toLowerCase().includes(query) ||
        (story.topic ?? "").toLowerCase().includes(query) ||
        authorName.toLowerCase().includes(query);
      if (!match) return false;
    }

    return true;
  });
}

export function stageBadgeColor(status: string) {
  switch (status) {
    case "Ready":
      return { bg: "#EAF7ED", text: colors.success, border: "#A7E0B7" };
    case "Editor review":
      return { bg: "#EEF2FF", text: "#3730A3", border: "#C7D2FE" };
    case "Health / Science review":
      return { bg: "#E6F7F7", text: colors.teal, border: "#A5E5E5" };
    case "Fact check":
      return { bg: "#FAF5FF", text: "#6B21A8", border: "#E9D5FF" };
    case "Copy edit":
      return { bg: "#FFF7ED", text: "#C2410C", border: "#FFEDD5" };
    case "Submitted":
    default:
      return { bg: "#FFFBEB", text: colors.warning, border: "#FDE68A" };
  }
}

export function StudioReviewQueue() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= breakpoints.tablet && width < breakpoints.desktop;
  const isDesktop = width >= breakpoints.desktop;

  const [refreshKey, setRefreshKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [deskFilter, setDeskFilter] = useState<string>("All");
  const [authorFilter, setAuthorFilter] = useState<string>("All");
  const [policyFilter, setPolicyFilter] = useState<string>("All");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("priority");

  const storiesAsync = useAsync(
    () => services.newsroomStories.listStories(200),
    [refreshKey]
  );

  const authorsAsync = useAsync(
    () => services.newsroomStories.listAuthors(),
    []
  );

  const authAsync = useAsync(
    () => services.authorization.getSnapshot(),
    []
  );

  const authors = authorsAsync.data ?? [];
  const authorsMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const author of authors) {
      map[author.id] = author.displayName;
    }
    return map;
  }, [authors]);

  const rawStories = storiesAsync.data ?? [];

  // Canonical stories in review states
  const reviewStories = useMemo(() => {
    return rawStories.filter((s) => isReviewWorkflowStatus(resolveWorkflowStatus(s)));
  }, [rawStories]);

  // Dynamic desks available across queue
  const availableDesks = useMemo(() => {
    const set = new Set<string>();
    for (const story of reviewStories) {
      if (story.desk && story.desk.trim()) {
        set.add(story.desk.trim());
      }
    }
    return ["All", ...Array.from(set).sort()];
  }, [reviewStories]);

  // Dynamic authors available across queue
  const availableAuthors = useMemo(() => {
    const set = new Set<string>();
    for (const story of reviewStories) {
      if (story.authorId && story.authorId.trim()) {
        set.add(story.authorId.trim());
      }
    }
    const list = Array.from(set).map((id) => ({
      id,
      name: authorsMap[id] ?? `Reporter ${id.slice(0, 8)}`
    }));
    return [{ id: "All", name: "All Reporters" }, ...list.sort((a, b) => a.name.localeCompare(b.name))];
  }, [reviewStories, authorsMap]);

  // Summary counts
  const summaryCounts = useMemo(() => {
    const now = Date.now();
    let total = 0;
    let overdue = 0;
    let submitted = 0;
    let factCheck = 0;
    let healthReview = 0;
    let copyEdit = 0;
    let editorReview = 0;
    let ready = 0;

    for (const s of reviewStories) {
      total += 1;
      const status = resolveWorkflowStatus(s);
      if (status === "Submitted") submitted += 1;
      else if (status === "Fact check") factCheck += 1;
      else if (status === "Health / Science review") healthReview += 1;
      else if (status === "Copy edit") copyEdit += 1;
      else if (status === "Editor review") editorReview += 1;
      else if (status === "Ready") ready += 1;

      const urgency = getDeadlineUrgency(s.deadlineAt, now);
      if (urgency.isOverdue) overdue += 1;
    }

    return { total, overdue, submitted, factCheck, healthReview, copyEdit, editorReview, ready };
  }, [reviewStories]);

  // Filtered stories
  const filteredStories = useMemo(() => {
    return filterReviewQueue(reviewStories, {
      statusFilter,
      deskFilter,
      authorFilter,
      policyFilter,
      overdueOnly,
      searchQuery,
      authorsMap
    });
  }, [reviewStories, statusFilter, deskFilter, authorFilter, policyFilter, overdueOnly, searchQuery, authorsMap]);

  // Sorted stories
  const sortedStories = useMemo(() => {
    return sortReviewQueue(filteredStories, sortMode);
  }, [filteredStories, sortMode]);

  const resetFilters = () => {
    setStatusFilter("All");
    setDeskFilter("All");
    setAuthorFilter("All");
    setPolicyFilter("All");
    setOverdueOnly(false);
    setSearchQuery("");
  };

  const handleOpenWorkspace = (storyId: string) => {
    router.push({
      pathname: "/studio/[module]",
      params: { module: "create-edit", storyId }
    });
  };

  const handleSwitchToStories = () => {
    router.push({
      pathname: "/studio/[module]",
      params: { module: "stories" }
    });
  };

  return (
    <View style={styles.container}>
      {/* Top Navigation & Operational Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View>
            <View style={styles.headerTagRow}>
              <View style={styles.livePulseDot} />
              <Text style={styles.headerSub}>HealthTimes Newsroom OS</Text>
            </View>
            <Text style={styles.title}>Editorial Review Queue</Text>
          </View>

          <View style={styles.headerActions}>
            <Pressable
              style={styles.switchViewBtn}
              onPress={handleSwitchToStories}
            >
              <Text style={styles.switchViewBtnText}>All Stories ({rawStories.length})</Text>
            </Pressable>
            <Pressable
              style={styles.refreshBtn}
              onPress={() => setRefreshKey((k) => k + 1)}
            >
              <Text style={styles.refreshBtnText}>↻ Refresh</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.description}>
          Daily operational triage desk for editor signoffs, fact checking, health/science verification and deadline management.
        </Text>
      </View>

      {/* Triage Metrics Summary Bar */}
      <View style={styles.metricsBar}>
        <Pressable
          style={[styles.metricCard, statusFilter === "All" && !overdueOnly && styles.metricCardActive]}
          onPress={() => {
            setStatusFilter("All");
            setOverdueOnly(false);
          }}
        >
          <Text style={styles.metricNumber}>{summaryCounts.total}</Text>
          <Text style={styles.metricLabel}>Total in Queue</Text>
        </Pressable>

        <Pressable
          style={[styles.metricCard, styles.metricCardOverdue, overdueOnly && styles.metricCardOverdueActive]}
          onPress={() => setOverdueOnly((prev) => !prev)}
        >
          <View style={styles.metricOverdueHeader}>
            <Text style={[styles.metricNumber, styles.metricOverdueNumber]}>{summaryCounts.overdue}</Text>
            {summaryCounts.overdue > 0 && <View style={styles.overdueAlertPill}><Text style={styles.overdueAlertPillText}>ACTION</Text></View>}
          </View>
          <Text style={[styles.metricLabel, styles.metricOverdueLabel]}>Overdue Attention</Text>
        </Pressable>

        <Pressable
          style={[styles.metricCard, statusFilter === "Editor review" && styles.metricCardActive]}
          onPress={() => setStatusFilter((cur) => (cur === "Editor review" ? "All" : "Editor review"))}
        >
          <Text style={styles.metricNumber}>{summaryCounts.editorReview}</Text>
          <Text style={styles.metricLabel}>Editor Review</Text>
        </Pressable>

        <Pressable
          style={[styles.metricCard, statusFilter === "Fact check" && styles.metricCardActive]}
          onPress={() => setStatusFilter((cur) => (cur === "Fact check" ? "All" : "Fact check"))}
        >
          <Text style={styles.metricNumber}>{summaryCounts.factCheck}</Text>
          <Text style={styles.metricLabel}>Fact Check</Text>
        </Pressable>

        <Pressable
          style={[styles.metricCard, statusFilter === "Health / Science review" && styles.metricCardActive]}
          onPress={() => setStatusFilter((cur) => (cur === "Health / Science review" ? "All" : "Health / Science review"))}
        >
          <Text style={styles.metricNumber}>{summaryCounts.healthReview}</Text>
          <Text style={styles.metricLabel}>Health / Science</Text>
        </Pressable>

        <Pressable
          style={[styles.metricCard, statusFilter === "Ready" && styles.metricCardActive]}
          onPress={() => setStatusFilter((cur) => (cur === "Ready" ? "All" : "Ready"))}
        >
          <Text style={[styles.metricNumber, { color: colors.success }]}>{summaryCounts.ready}</Text>
          <Text style={styles.metricLabel}>Ready to Publish</Text>
        </Pressable>
      </View>

      {/* Filter and Prioritization Toolbar */}
      <View style={styles.toolbarCard}>
        {/* Search Input and Sort Selector */}
        <View style={styles.searchSortRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search headline, standfirst, desk, topic or reporter…"
            placeholderTextColor={colors.inkMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          <View style={styles.sortContainer}>
            <Text style={styles.filterSectionLabel}>Sort Priority:</Text>
            <View style={styles.sortChipsRow}>
              {(
                [
                  { id: "priority", label: "Priority (Default)" },
                  { id: "deadline", label: "Deadline" },
                  { id: "stage", label: "Review Stage" },
                  { id: "recent", label: "Recent" }
                ] as const
              ).map((s) => (
                <Pressable
                  key={s.id}
                  style={[styles.sortChip, sortMode === s.id && styles.sortChipActive]}
                  onPress={() => setSortMode(s.id)}
                >
                  <Text style={[styles.sortChipText, sortMode === s.id && styles.sortChipTextActive]}>
                    {s.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* Workflow Stage Filter Chips */}
        <View style={styles.filterRow}>
          <Text style={styles.filterSectionLabel}>Stage:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsRow}>
            {["All", ...REVIEW_WORKFLOW_STATES].map((st) => {
              const active = statusFilter === st;
              return (
                <Pressable
                  key={st}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setStatusFilter(st)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {st === "All" ? "All Review Stages" : st}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Desk and Policy Filters */}
        <View style={styles.secondaryFilterRow}>
          {availableDesks.length > 2 && (
            <View style={styles.deskFilterGroup}>
              <Text style={styles.filterSectionLabel}>Desk:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsRow}>
                {availableDesks.map((d) => (
                  <Pressable
                    key={d}
                    style={[styles.chip, deskFilter === d && styles.chipActive]}
                    onPress={() => setDeskFilter(d)}
                  >
                    <Text style={[styles.chipText, deskFilter === d && styles.chipTextActive]}>{d}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {availableAuthors.length > 2 && (
            <View style={styles.deskFilterGroup}>
              <Text style={styles.filterSectionLabel}>Reporter:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsRow}>
                {availableAuthors.map((a) => (
                  <Pressable
                    key={a.id}
                    style={[styles.chip, authorFilter === a.id && styles.chipActive]}
                    onPress={() => setAuthorFilter(a.id)}
                  >
                    <Text style={[styles.chipText, authorFilter === a.id && styles.chipTextActive]}>{a.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.toggleRow}>
            <Pressable
              style={[styles.overdueToggle, overdueOnly && styles.overdueToggleActive]}
              onPress={() => setOverdueOnly((cur) => !cur)}
            >
              <Text style={[styles.overdueToggleText, overdueOnly && styles.overdueToggleTextActive]}>
                {overdueOnly ? "● Showing Overdue Only" : "Show Overdue Only"}
              </Text>
            </Pressable>

            <View style={styles.policyRow}>
              {(["All", "public", "premium"] as const).map((p) => (
                <Pressable
                  key={p}
                  style={[styles.policyChip, policyFilter === p && styles.policyChipActive]}
                  onPress={() => setPolicyFilter(p)}
                >
                  <Text style={[styles.policyChipText, policyFilter === p && styles.policyChipTextActive]}>
                    {p === "All" ? "All Policies" : p === "premium" ? "Premium" : "Public"}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* Content States */}
      {storiesAsync.loading && (
        <View style={styles.stateContainer}>
          <Text style={styles.loadingText}>Loading Newsroom Review Queue from server…</Text>
        </View>
      )}

      {storiesAsync.error && (
        <View style={styles.stateContainer}>
          <Text style={styles.errorTitle}>Failed to Load Review Queue</Text>
          <Text style={styles.errorText}>{storiesAsync.error.message}</Text>
          <Pressable style={styles.retryBtn} onPress={() => setRefreshKey((k) => k + 1)}>
            <Text style={styles.retryBtnText}>Retry Connection</Text>
          </Pressable>
        </View>
      )}

      {!storiesAsync.loading && !storiesAsync.error && reviewStories.length === 0 && (
        <View style={styles.stateContainer}>
          <Text style={styles.emptyTitle}>Review Queue Clear</Text>
          <Text style={styles.emptyText}>
            There are no stories currently pending editorial review. New submissions from reporters will appear here automatically.
          </Text>
          <Pressable style={styles.actionLinkBtn} onPress={handleSwitchToStories}>
            <Text style={styles.actionLinkBtnText}>View All Newsroom Stories →</Text>
          </Pressable>
        </View>
      )}

      {!storiesAsync.loading && !storiesAsync.error && reviewStories.length > 0 && sortedStories.length === 0 && (
        <View style={styles.stateContainer}>
          <Text style={styles.emptyTitle}>No Stories Match Active Filters</Text>
          <Text style={styles.emptyText}>
            No review items match the current combination of search and filter settings.
          </Text>
          <Pressable style={styles.retryBtn} onPress={resetFilters}>
            <Text style={styles.retryBtnText}>Reset All Filters</Text>
          </Pressable>
        </View>
      )}

      {/* Queue Stories List */}
      {!storiesAsync.loading && !storiesAsync.error && sortedStories.length > 0 && (
        <View style={styles.queueList}>
          <View style={styles.queueCountHeader}>
            <Text style={styles.queueCountText}>
              Showing <Text style={styles.strongText}>{sortedStories.length}</Text> of{" "}
              <Text style={styles.strongText}>{reviewStories.length}</Text> review items
            </Text>
          </View>

          {sortedStories.map((story) => {
            const status = resolveWorkflowStatus(story);
            const badge = stageBadgeColor(status);
            const urgency = getDeadlineUrgency(story.deadlineAt);
            const authorName = story.authorId ? authorsMap[story.authorId] : null;

            return (
              <Pressable
                key={story.id}
                style={[
                  styles.storyCard,
                  urgency.isOverdue && styles.storyCardOverdue,
                  isDesktop && styles.storyCardDesktop
                ]}
                onPress={() => handleOpenWorkspace(story.id)}
              >
                {/* Status & Deadline Strip */}
                <View style={styles.cardHeaderStrip}>
                  <View style={styles.badgeCluster}>
                    <View style={[styles.stageBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                      <Text style={[styles.stageBadgeText, { color: badge.text }]}>{status}</Text>
                    </View>

                    {urgency.isOverdue && (
                      <View style={styles.overdueBadge}>
                        <Text style={styles.overdueBadgeText}>{urgency.label}</Text>
                      </View>
                    )}

                    {!urgency.isOverdue && urgency.isImminent && (
                      <View style={styles.imminentBadge}>
                        <Text style={styles.imminentBadgeText}>{urgency.label}</Text>
                      </View>
                    )}

                    {!urgency.isOverdue && !urgency.isImminent && urgency.hasDeadline && (
                      <View style={styles.deadlineBadge}>
                        <Text style={styles.deadlineBadgeText}>{urgency.label}</Text>
                      </View>
                    )}

                    {story.accessPolicy === "premium" && (
                      <View style={styles.premiumBadge}>
                        <Text style={styles.premiumBadgeText}>PREMIUM</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.timestampRow}>
                    <Text style={styles.metaTimestamp}>
                      v{story.lockVersion} · {story.updatedAt ? new Date(story.updatedAt).toLocaleDateString() : "Just now"}
                    </Text>
                  </View>
                </View>

                {/* Headline & Standfirst */}
                <Text style={styles.cardTitle}>{story.title || "Untitled story"}</Text>
                {story.standfirst ? (
                  <Text style={styles.cardStandfirst} numberOfLines={2}>
                    {story.standfirst}
                  </Text>
                ) : null}

                {/* Metadata & Editorial Triage Context */}
                <View style={styles.cardFooter}>
                  <View style={styles.metadataCluster}>
                    {story.desk ? (
                      <View style={styles.metaTag}>
                        <Text style={styles.metaTagLabel}>Desk:</Text>
                        <Text style={styles.metaTagValue}>{story.desk}</Text>
                      </View>
                    ) : null}

                    {story.topic ? (
                      <View style={styles.metaTag}>
                        <Text style={styles.metaTagLabel}>Topic:</Text>
                        <Text style={styles.metaTagValue}>{story.topic}</Text>
                      </View>
                    ) : null}

                    {authorName ? (
                      <View style={styles.metaTag}>
                        <Text style={styles.metaTagLabel}>Reporter:</Text>
                        <Text style={styles.metaTagValue}>{authorName}</Text>
                      </View>
                    ) : null}

                    {story.scheduledAt ? (
                      <View style={styles.scheduledPill}>
                        <Text style={styles.scheduledPillText}>
                          Scheduled for {new Date(story.scheduledAt).toLocaleDateString()}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Open Workspace Action */}
                  <View style={styles.actionContainer}>
                    <Pressable
                      style={styles.openWorkspaceBtn}
                      onPress={() => handleOpenWorkspace(story.id)}
                    >
                      <Text style={styles.openWorkspaceBtnText}>Open Workspace →</Text>
                    </Pressable>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    maxWidth: 1200,
    width: "100%",
    alignSelf: "center",
    gap: spacing.lg
  },
  header: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
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
    gap: spacing.xs,
    marginBottom: 4
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.live
  },
  headerSub: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.inkMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: colors.ink
  },
  description: {
    fontSize: 14,
    color: colors.inkMuted,
    lineHeight: 20
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  switchViewBtn: {
    backgroundColor: colors.paperMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 38,
    justifyContent: "center"
  },
  switchViewBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink
  },
  refreshBtn: {
    backgroundColor: colors.blue,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 38,
    justifyContent: "center"
  },
  refreshBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF"
  },
  metricsBar: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  metricCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 4
  },
  metricCardActive: {
    borderColor: colors.blue,
    backgroundColor: "#F0F7FF"
  },
  metricCardOverdue: {
    backgroundColor: "#FFF5F5",
    borderColor: "#FEB2B2"
  },
  metricCardOverdueActive: {
    borderColor: colors.live,
    borderWidth: 2
  },
  metricOverdueHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  metricNumber: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.ink
  },
  metricOverdueNumber: {
    color: colors.live
  },
  overdueAlertPill: {
    backgroundColor: colors.live,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  overdueAlertPillText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#FFFFFF"
  },
  metricLabel: {
    fontSize: 12,
    color: colors.inkMuted,
    fontWeight: "600"
  },
  metricOverdueLabel: {
    color: "#9B1C1C",
    fontWeight: "700"
  },
  toolbarCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md
  },
  searchSortRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.md
  },
  searchInput: {
    flex: 1,
    minWidth: 260,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.ink,
    backgroundColor: colors.paperMuted,
    minHeight: 42
  },
  sortContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flexWrap: "wrap"
  },
  sortChipsRow: {
    flexDirection: "row",
    gap: 4
  },
  sortChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.paperMuted,
    borderWidth: 1,
    borderColor: colors.border
  },
  sortChipActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink
  },
  sortChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.inkMuted
  },
  sortChipTextActive: {
    color: "#FFFFFF"
  },
  filterSectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.inkMuted,
    textTransform: "uppercase",
    marginRight: 4
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  secondaryFilterRow: {
    flexDirection: "column",
    gap: spacing.sm
  },
  deskFilterGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  filterChipsRow: {
    flexDirection: "row",
    gap: 6
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.paperMuted,
    borderWidth: 1,
    borderColor: colors.border
  },
  chipActive: {
    backgroundColor: colors.blue,
    borderColor: colors.blue
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.inkMuted
  },
  chipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700"
  },
  toggleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  overdueToggle: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.paperMuted,
    borderWidth: 1,
    borderColor: colors.border
  },
  overdueToggleActive: {
    backgroundColor: "#FDE8E8",
    borderColor: colors.live
  },
  overdueToggleText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.inkMuted
  },
  overdueToggleTextActive: {
    color: colors.live
  },
  policyRow: {
    flexDirection: "row",
    gap: 6
  },
  policyChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.paperMuted,
    borderWidth: 1,
    borderColor: colors.border
  },
  policyChipActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink
  },
  policyChipText: {
    fontSize: 12,
    color: colors.inkMuted,
    fontWeight: "600"
  },
  policyChipTextActive: {
    color: "#FFFFFF"
  },
  stateContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xxl,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm
  },
  loadingText: {
    fontSize: 15,
    color: colors.inkMuted
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.live
  },
  errorText: {
    fontSize: 13,
    color: colors.inkMuted,
    textAlign: "center"
  },
  retryBtn: {
    backgroundColor: colors.blue,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm
  },
  retryBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.ink
  },
  emptyText: {
    fontSize: 14,
    color: colors.inkMuted,
    textAlign: "center",
    maxWidth: 480,
    lineHeight: 20
  },
  actionLinkBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.xs
  },
  actionLinkBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.blue
  },
  queueList: {
    gap: spacing.md
  },
  queueCountHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.xs
  },
  queueCountText: {
    fontSize: 13,
    color: colors.inkMuted
  },
  strongText: {
    fontWeight: "800",
    color: colors.ink
  },
  storyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm
  },
  storyCardDesktop: {
    padding: spacing.xl
  },
  storyCardOverdue: {
    borderColor: "#FEB2B2",
    borderLeftWidth: 4,
    borderLeftColor: colors.live
  },
  cardHeaderStrip: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  badgeCluster: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6
  },
  stageBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    borderWidth: 1
  },
  stageBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.3
  },
  overdueBadge: {
    backgroundColor: "#C62828",
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm
  },
  overdueBadgeText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.4
  },
  imminentBadge: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FCD34D",
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm
  },
  imminentBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#92400E"
  },
  deadlineBadge: {
    backgroundColor: colors.paperMuted,
    borderColor: colors.border,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm
  },
  deadlineBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.inkMuted
  },
  premiumBadge: {
    backgroundColor: "#8A6421",
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.sm
  },
  premiumBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#FFFFFF"
  },
  timestampRow: {
    alignItems: "flex-end"
  },
  metaTimestamp: {
    fontSize: 11,
    color: colors.inkMuted
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.ink,
    lineHeight: 24
  },
  cardStandfirst: {
    fontSize: 14,
    color: colors.inkMuted,
    lineHeight: 20
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    flexWrap: "wrap",
    gap: spacing.md,
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.paperMuted
  },
  metadataCluster: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.md
  },
  metaTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  metaTagLabel: {
    fontSize: 12,
    color: colors.inkMuted,
    fontWeight: "600"
  },
  metaTagValue: {
    fontSize: 12,
    color: colors.ink,
    fontWeight: "700"
  },
  scheduledPill: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2
  },
  scheduledPillText: {
    fontSize: 11,
    color: colors.blue,
    fontWeight: "700"
  },
  actionContainer: {
    marginLeft: "auto"
  },
  openWorkspaceBtn: {
    backgroundColor: colors.ink,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 36,
    justifyContent: "center",
    alignItems: "center"
  },
  openWorkspaceBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700"
  }
});
